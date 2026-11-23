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
