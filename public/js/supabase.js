/**
 * Cuentas con Supabase (opcional).
 * Si no hay claves configuradas, la app sigue funcionando en modo local.
 * La librería se carga local (/vendor/supabase.js), sin depender de internet.
 */

let cliente = null;
let disponible = false;
let inicializado = false;
let config = null;
let alCambiarSesion = null;
let motivo = ''; // por qué no conectó, para poder avisarlo en pantalla

/** Motivo por el que la nube no está disponible ('ok' si todo bien). */
export function motivoConexion() {
  return motivo;
}

export async function iniciar(callbackSesion) {
  alCambiarSesion = callbackSesion;
  if (inicializado) return disponible;
  inicializado = true;

  try {
    config = await fetch('/api/config').then((r) => r.json());
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      motivo = 'faltan_llaves';
      return false;
    }

    if (!window.supabase?.createClient) {
      motivo = 'libreria';
      return false;
    }
    cliente = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    disponible = true;
    motivo = 'ok';

    cliente.auth.onAuthStateChange((_evento, sesion) => {
      alCambiarSesion?.(sesion);
    });
    const { data } = await cliente.auth.getSession();
    alCambiarSesion?.(data.session);
    return true;
  } catch (err) {
    console.warn('Supabase no disponible, seguimos en modo local.', err);
    disponible = false;
    motivo = 'error';
    return false;
  }
}

export function estaDisponible() {
  return disponible;
}

export function usuarioActual() {
  return cliente?.auth?.getUser ? cliente.auth.getUser() : null;
}

export async function registrarse(email, password) {
  const { data, error } = await cliente.auth.signUp({
    email,
    password,
    // Para que el enlace de confirmación regrese a ESTA dirección
    // (por defecto Supabase regresa a localhost:3000, que no es nuestra app).
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
  return data;
}

export async function entrar(email, password) {
  const { data, error } = await cliente.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function salir() {
  if (cliente) await cliente.auth.signOut();
}

/** Convierte una ficha local al formato de la tabla `pets`. */
function mascotaAFila(mascota, ownerId) {
  return {
    id: mascota.id,
    owner_id: ownerId,
    nombre: mascota.nombre,
    especie: mascota.especie,
    raza: mascota.raza || null,
    nacimiento: mascota.nacimiento || null,
    peso_kg: mascota.pesoKg ? Number(mascota.pesoKg) : null,
    sexo: mascota.sexo || null,
    condiciones: mascota.condiciones || null,
    medicamentos: mascota.medicamentos || null,
    alergias: mascota.alergias || null,
    notas: mascota.notas || null,
    actualizado_en: new Date().toISOString(),
  };
}

/** Convierte una fila de la tabla `pets` a la ficha local. */
export function filaAMascota(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    especie: fila.especie,
    raza: fila.raza || '',
    nacimiento: fila.nacimiento || '',
    pesoKg: fila.peso_kg ?? '',
    sexo: fila.sexo || '',
    condiciones: fila.condiciones || '',
    medicamentos: fila.medicamentos || '',
    alergias: fila.alergias || '',
    notas: fila.notas || '',
  };
}

/** Sube una ficha de mascota a la nube. */
export async function guardarMascota(mascota) {
  if (!disponible) return null;
  const { data: sesion } = await cliente.auth.getUser();
  if (!sesion?.user) return null;
  const fila = mascotaAFila(mascota, sesion.user.id);
  const { error } = await cliente.from('pets').upsert(fila);
  if (error) throw error;
  return fila;
}

export async function traerMascotas() {
  if (!disponible) return [];
  const { data, error } = await cliente.from('pets').select('*').order('creado_en');
  if (error) throw error;
  return (data || []).map(filaAMascota);
}

export async function registrarTriaje(petId, triaje) {
  if (!disponible || !petId) return;
  const { data: sesion } = await cliente.auth.getUser();
  if (!sesion?.user) return;
  await cliente.from('triage_logs').insert({
    pet_id: petId,
    owner_id: sesion.user.id,
    nivel: triaje.nivel,
    motivos: triaje.motivos,
    pasos: triaje.pasos,
    detalle: triaje.texto || null,
  });
}

/** Directorio comunitario de veterinarias (lo que reemplaza al foro). */
export async function guardarVet(vet) {
  if (!disponible) return null;
  const { data: sesion } = await cliente.auth.getUser();
  if (!sesion?.user) return null;
  const { data, error } = await cliente
    .from('vets')
    .insert({
      nombre: vet.nombre,
      telefono: vet.telefono || null,
      direccion: vet.direccion || null,
      lat: vet.lat,
      lng: vet.lng,
      abierto_24h: Boolean(vet.abierto24h),
      servicios: vet.servicios || null,
      creado_por: sesion.user.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function traerVets() {
  if (!disponible) return [];
  const { data, error } = await cliente.from('vets').select('*');
  if (error) throw error;
  return (data || []).map((v) => ({
    id: v.id,
    nombre: v.nombre,
    telefono: v.telefono || '',
    direccion: v.direccion || '',
    lat: v.lat,
    lng: v.lng,
    abierto24h: v.abierto_24h,
    verificado: v.verificado,
    origen: 'Comunidad',
  }));
}

export async function traerResenas(vetId) {
  if (!disponible) return [];
  const { data, error } = await cliente
    .from('vet_reviews')
    .select('*')
    .eq('vet_id', vetId);
  if (error) throw error;
  return data || [];
}

export async function enviarResena(vetId, estrellas, comentario, urgenciaAtendida) {
  const { data: sesion } = await cliente.auth.getUser();
  if (!sesion?.user) throw new Error('necesitas_cuenta');
  const { error } = await cliente.from('vet_reviews').upsert({
    vet_id: vetId,
    user_id: sesion.user.id,
    estrellas,
    comentario: comentario || null,
    urgencia_atendida: Boolean(urgenciaAtendida),
  });
  if (error) throw error;
}
