/**
 * Fichas de mascotas.
 * Funciona siempre en el navegador (localStorage).
 * Si Supabase está configurado, el usuario puede iniciar sesión y se sincroniza.
 */

const LLAVE = 'vetya.mascotas';
const LLAVE_ACTIVA = 'vetya.mascotaActiva';

export function listar() {
  try {
    return JSON.parse(localStorage.getItem(LLAVE) || '[]');
  } catch {
    return [];
  }
}

function guardarTodas(mascotas) {
  localStorage.setItem(LLAVE, JSON.stringify(mascotas));
}

export function guardar(mascota) {
  const mascotas = listar();
  const id = mascota.id || crypto.randomUUID();
  const nueva = { ...mascota, id, actualizadoEn: new Date().toISOString() };
  const idx = mascotas.findIndex((m) => m.id === id);
  if (idx >= 0) mascotas[idx] = nueva;
  else mascotas.push(nueva);
  guardarTodas(mascotas);
  activar(id);
  return nueva;
}

export function eliminar(id) {
  guardarTodas(listar().filter((m) => m.id !== id));
  if (obtenerActivaId() === id) localStorage.removeItem(LLAVE_ACTIVA);
}

/**
 * Fusiona fichas que llegan de la nube con las locales (por id).
 * No cambia la mascota activa; sirve para "bajar" lo que ya está guardado.
 */
export function fusionar(fichas) {
  const mascotas = listar();
  fichas.forEach((f) => {
    const idx = mascotas.findIndex((m) => m.id === f.id);
    if (idx >= 0) mascotas[idx] = { ...mascotas[idx], ...f, actualizadoEn: new Date().toISOString() };
    else mascotas.push({ ...f, actualizadoEn: new Date().toISOString() });
  });
  guardarTodas(mascotas);
}

export function activar(id) {
  localStorage.setItem(LLAVE_ACTIVA, id);
}

export function obtenerActivaId() {
  return localStorage.getItem(LLAVE_ACTIVA) || null;
}

export function obtenerActiva() {
  const id = obtenerActivaId();
  if (!id) return listar()[0] || null;
  return listar().find((m) => m.id === id) || listar()[0] || null;
}

/** Datos mínimos para el QR de emergencia (sin información sensible de más). */
export function textoDeEmergencia(mascota) {
  if (!mascota) return '';
  const lineas = [
    `MASCOTA: ${mascota.nombre || '—'} (${mascota.especie || '—'})`,
    mascota.raza ? `Raza: ${mascota.raza}` : null,
    mascota.pesoKg ? `Peso: ${mascota.pesoKg} kg` : null,
    mascota.condiciones ? `Condiciones: ${mascota.condiciones}` : null,
    mascota.alergias ? `Alergias: ${mascota.alergias}` : null,
    mascota.medicamentos ? `Medicamentos: ${mascota.medicamentos}` : null,
    mascota.veterinario ? `Veterinario: ${mascota.veterinario}` : null,
    mascota.telefonoVet ? `Tel. veterinario: ${mascota.telefonoVet}` : null,
    mascota.contactoDueno ? `Contacto del dueño: ${mascota.contactoDueno}` : null,
  ].filter(Boolean);
  return lineas.join('\n');
}

/**
 * URL de la ficha pública. El QR apunta aquí en vez de a texto plano:
 * así el escáner del celular abre la ficha completa en el navegador (no muestra
 * solo "Llamar" ni lanza una búsqueda de Google) y los teléfonos quedan como
 * botones `tel:` dentro de la página.
 */
const URL_FICHA = 'https://nicoleramo19.github.io/vetya/public/ficha.html';

function codificarDatos(datos) {
  const bytes = new TextEncoder().encode(JSON.stringify(datos));
  let binario = '';
  bytes.forEach((b) => { binario += String.fromCharCode(b); });
  return btoa(binario)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Devuelve la URL corta que debe contener el QR, con todos los datos de la ficha
 * (incluidos los teléfonos) codificados en el fragmento #, para que no se envíen
 * a ningún servidor ni queden en logs.
 */
export function textoParaQR(mascota) {
  if (!mascota) return '';
  const corto = (valor, max = 60) => {
    if (valor === undefined || valor === null || valor === '') return '';
    return String(valor).replace(/\s+/g, ' ').trim().slice(0, max);
  };

  const datos = {
    n: corto(mascota.nombre),
    e: corto(mascota.especie, 20),
    r: corto(mascota.raza),
    c: corto(mascota.condiciones),
    a: corto(mascota.alergias),
    m: corto(mascota.medicamentos),
    v: corto(mascota.veterinario),
    tv: corto(mascota.telefonoVet, 30),
    cd: corto(mascota.contactoDueno, 40),
  };

  // Quita las claves vacías para que la URL sea lo más corta posible.
  Object.keys(datos).forEach((clave) => {
    if (!datos[clave]) delete datos[clave];
  });

  return `${URL_FICHA}#${codificarDatos(datos)}`;
}
