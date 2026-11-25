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
 * Versión COMPACTA para el código QR: menos datos = menos módulos = escanea mejor.
 *
 * Importante: NO incluye dígitos. Los lectores de cámara de iOS/Android detectan
 * secuencias numéricas como teléfono y muestran "Llamar" en vez del texto de la
 * ficha. Al quitar los números, el escaneo muestra la ficha completa.
 * Los teléfonos siguen visibles en la ficha impresa y al compartir.
 */
export function textoParaQR(mascota) {
  if (!mascota) return '';
  const corto = (valor, max = 28) => {
    if (valor === undefined || valor === null || valor === '') return '';
    return String(valor)
      .replace(/\d+/g, '') // evita que el escáner lo interprete como teléfono
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);
  };

  const lineas = [
    ['FICHA VETYA', corto(mascota.nombre, 18), corto(mascota.especie, 10)]
      .filter(Boolean)
      .join(' | '),
  ];
  if (mascota.alergias) lineas.push(`ALERG: ${corto(mascota.alergias)}`);
  if (mascota.condiciones) lineas.push(`COND: ${corto(mascota.condiciones)}`);
  const vet = corto(mascota.telefonoVet, 20) || corto(mascota.veterinario, 20);
  if (vet) lineas.push(`VET: ${vet}`);
  const dueno = corto(mascota.contactoDueno, 20);
  if (dueno) lineas.push(`DUEÑO: ${dueno}`);
  return lineas.join('\n').slice(0, 180);
}
