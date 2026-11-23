/**
 * Mapa y directorio de veterinarias.
 * - Datos abiertos: OpenStreetMap vía Overpass (gratis, sin clave).
 * - Ruta: OSRM (gratis). Navegación final: enlace a Google Maps (sin costo de API).
 * - Los datos de OSM suelen estar incompletos: se permite agregar veterinarias a mano.
 */

const CENTRO_ESTADO_MEXICO = { lat: 19.3569, lng: -99.6301 };
const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

let mapa = null;
let capaMarcadores = null;
let marcadorUsuario = null;

export function distanciaMetros(a, b) {
  const R = 6371000;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatearDistancia(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export function enlaceNavegacion(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export function enlaceLlamada(telefono) {
  return `tel:${String(telefono).replace(/[^\d+]/g, '')}`;
}

/** ¿Está abierto ahora? Solo podemos afirmarlo si el dato dice 24/7. */
export function estadoApertura(vet) {
  if (vet.abierto24h) return { abierto: true, texto: 'Abierto 24 h' };
  if (vet.horario) return { abierto: null, texto: `Horario: ${vet.horario}` };
  return { abierto: null, texto: 'Horario por confirmar' };
}

export function crearMapa(contenedor, { lat, lng } = {}) {
  const centro = lat && lng ? { lat, lng } : CENTRO_ESTADO_MEXICO;
  mapa = L.map(contenedor, { zoomControl: true }).setView([centro.lat, centro.lng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  }).addTo(mapa);
  capaMarcadores = L.layerGroup().addTo(mapa);
  return mapa;
}

export function ubicarUsuario(lat, lng, mover = true) {
  if (!mapa) return;
  if (marcadorUsuario) marcadorUsuario.remove();
  marcadorUsuario = L.circleMarker([lat, lng], {
    radius: 9,
    color: '#1565c0',
    fillColor: '#42a5f5',
    fillOpacity: 0.9,
    weight: 3,
  })
    .addTo(mapa)
    .bindPopup('Estás aquí');
  if (mover) mapa.setView([lat, lng], 14);
}

/**
 * Geolocalización del navegador (gratis, sin API).
 * Requiere un "contexto seguro": https o localhost. En http la mayoría de
 * los navegadores bloquea la ubicación sin siquiera preguntar.
 * Si la alta precisión tarda demasiado, se reintenta en modo rápido.
 */
export function obtenerUbicacion() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('sin_geolocalizacion'));

    const aceptar = (p) => resolve({
      lat: p.coords.latitude,
      lng: p.coords.longitude,
      precision: Math.round(p.coords.accuracy || 0),
    });

    navigator.geolocation.getCurrentPosition(
      aceptar,
      (e) => {
        // TIMEOUT (3): reintenta sin alta precisión, suele resolver rápido.
        if (e && e.code === 3) {
          navigator.geolocation.getCurrentPosition(
            aceptar,
            (e2) => reject(e2),
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
          );
          return;
        }
        reject(e);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  });
}

/**
 * Convierte una dirección escrita en coordenadas (Nominatim / OpenStreetMap).
 * Así el usuario no tiene que saber latitud ni longitud.
 * @returns {Promise<{lat:number,lng:number,direccion:string}>}
 */
export async function ubicarDireccion(direccion) {
  const texto = (direccion || '').trim();
  if (!texto) throw new Error('Escribe la dirección de la veterinaria.');

  // Si pegan coordenadas directamente ("19.35, -99.63"), se aceptan tal cual.
  const coord = texto.match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  if (coord) {
    const lat = Number(coord[1]);
    const lng = Number(coord[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng, direccion: texto };
  }

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=es&q=${encodeURIComponent(texto)}`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error('No pude buscar la dirección en este momento. Inténtalo otra vez.');
  const lista = await r.json();
  if (!lista.length) {
    throw new Error(`No encontré "${texto}". Agrega la colonia o la ciudad y vuelve a intentar.`);
  }
  return { lat: Number(lista[0].lat), lng: Number(lista[0].lon), direccion: lista[0].display_name || texto };
}

/**
 * Busca veterinarias reales en OpenStreetMap alrededor de un punto.
 * @returns {Promise<Array>}
 */
export async function buscarEnOpenStreetMap(lat, lng, radio = 8000) {
  const consulta = `[out:json][timeout:25];
(
  node["amenity"="veterinary"](around:${radio},${lat},${lng});
  way["amenity"="veterinary"](around:${radio},${lat},${lng});
  node["healthcare"="veterinary"](around:${radio},${lat},${lng});
  way["healthcare"="veterinary"](around:${radio},${lat},${lng});
);
out center tags;`;

  for (const endpoint of OVERPASS) {
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(consulta)}`,
      });
      if (!r.ok) continue;
      const data = await r.json();
      return (data.elements || [])
        .map((el) => {
          const p = el.center || el;
          const t = el.tags || {};
          if (!t.name || !p.lat || !p.lon) return null;
          const horario = t.opening_hours || '';
          return {
            id: `osm-${el.type}-${el.id}`,
            nombre: t.name,
            direccion: [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ') || t['addr:city'] || '',
            telefono: t.phone || t['contact:phone'] || '',
            lat: p.lat,
            lng: p.lon,
            abierto24h: /24\/7/.test(horario),
            horario,
            origen: 'OpenStreetMap',
            verificado: false,
          };
        })
        .filter(Boolean);
    } catch {
      // prueba el siguiente servidor
    }
  }
  return [];
}

/** Dibuja la lista de veterinarias y devuelve la más cercana. */
export function dibujarVets(vets, origen) {
  if (!mapa) return null;
  capaMarcadores.clearLayers();
  const ordenadas = [...vets]
    .map((v) => ({ ...v, distancia: distanciaMetros(origen, v) }))
    .sort((a, b) => a.distancia - b.distancia);

  ordenadas.forEach((v) => {
    const color = v.abierto24h ? '#2e7d32' : '#1565c0';
    L.circleMarker([v.lat, v.lng], {
      radius: 8,
      color,
      fillColor: color,
      fillOpacity: 0.85,
      weight: 2,
    })
      .addTo(capaMarcadores)
      .bindPopup(
        `<strong>${v.nombre}</strong><br>${v.direccion || ''}` +
          (v.telefono ? `<br><a href="${enlaceLlamada(v.telefono)}">Llamar</a>` : '') +
          `<br><a target="_blank" rel="noopener" href="${enlaceNavegacion(v.lat, v.lng)}">Ir ahora</a>`
      );
  });

  const limites = L.latLngBounds([[origen.lat, origen.lng], ...ordenadas.map((v) => [v.lat, v.lng])]);
  if (limites.isValid()) mapa.fitBounds(limites.pad(0.2));
  return ordenadas;
}

/** Tiempo y distancia reales por carretera (OSRM). Si falla, se estima en línea recta. */
export async function calcularRuta(origen, destino) {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${origen.lng},${origen.lat};${destino.lng},${destino.lat}?overview=false`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('osrm');
    const data = await r.json();
    const ruta = data?.routes?.[0];
    if (!ruta) throw new Error('sin_ruta');
    return { distancia: ruta.distance, duracionSeg: ruta.duration, estimado: false };
  } catch {
    const d = distanciaMetros(origen, destino);
    return { distancia: d, duracionSeg: (d / 1000 / 40) * 3600, estimado: true };
  }
}
