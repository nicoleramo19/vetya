import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

/**
 * Configuración pública que el navegador necesita.
 * La anon key de Supabase es pública por diseño (va protegida por RLS).
 * La clave de Groq NUNCA se expone: solo se usa aquí en el servidor.
 */
app.get('/api/config', (_req, res) => {
  // Nunca guardar en caché: si cambian las llaves, el navegador debe enterarse.
  res.set('Cache-Control', 'no-store');
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    chatEnabled: Boolean(process.env.GROQ_API_KEY),
  });
});

// --- Límite de uso sencillo en memoria (protege la capa gratuita de Groq) ---
const hits = new Map();
function limitado(ip) {
  const ahora = Date.now();
  const ventana = 60_000;
  const max = 20;
  const registro = (hits.get(ip) || []).filter((t) => ahora - t < ventana);
  registro.push(ahora);
  hits.set(ip, registro);
  return registro.length > max;
}

/** Edad legible a partir de la fecha de nacimiento (p. ej. "3 año(s)"). */
function edadTexto(nacimiento) {
  if (!nacimiento) return '';
  const n = new Date(nacimiento);
  if (Number.isNaN(n.getTime())) return '';
  const hoy = new Date();
  let anios = hoy.getFullYear() - n.getFullYear();
  const m = hoy.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) anios--;
  if (anios < 0) return '';
  if (anios === 0) {
    const meses = Math.max(0, Math.round((hoy - n) / (1000 * 60 * 60 * 24 * 30.44)));
    return `${meses} mes(es)`;
  }
  return `${anios} año(s)`;
}

/**
 * Arma la ficha de la mascota en texto para dársela a la IA.
 * Aquí es donde la IA "ve" los datos del perfil de la mascota.
 */
function fichaMascota(m) {
  if (!m || (!m.nombre && !m.especie)) {
    return 'No hay ficha registrada todavía. Si el caso lo pide, invita amablemente a crear el perfil de la mascota para orientar mejor.';
  }
  const p = [];
  p.push(`Nombre: ${m.nombre || 'sin nombre'}`);
  p.push(`Especie: ${m.especie || 'no indicada'}`);
  if (m.raza) p.push(`Raza: ${m.raza}`);
  const edad = m.edad || edadTexto(m.nacimiento);
  if (edad) p.push(`Edad: ${edad}`);
  if (m.pesoKg) p.push(`Peso: ${m.pesoKg} kg`);
  if (m.sexo) p.push(`Sexo: ${m.sexo}`);
  if (m.esterilizado === true || m.esterilizado === false) p.push(`Esterilizado: ${m.esterilizado ? 'sí' : 'no'}`);
  if (m.condiciones) p.push(`Condiciones médicas: ${m.condiciones}`);
  if (m.medicamentos) p.push(`Medicamentos actuales: ${m.medicamentos}`);
  if (m.alergias) p.push(`Alergias: ${m.alergias}`);
  if (m.notas) p.push(`Notas: ${m.notas}`);
  if (m.veterinario) p.push(`Veterinario de confianza: ${m.veterinario}${m.telefonoVet ? ` (tel. ${m.telefonoVet})` : ''}`);
  return p.join('; ');
}

/**
 * Capa de lenguaje (IA).
 * REGLA DE ORO: el modelo NO clasifica urgencia. Recibe un resultado ya
 * calculado por el motor determinista y solo lo explica en palabras claras.
 */
app.post('/api/chat', async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({ error: 'sin_ia' });
  }
  if (limitado(req.ip)) {
    return res.status(429).json({ error: 'demasiadas_peticiones' });
  }

  const { mensajes = [], contexto = {} } = req.body || {};
  const mascota = contexto.mascota || {};
  const triaje = contexto.triaje || null;

  const system = [
    'Eres el asistente de VetYa, una línea de ayuda para dueños de mascotas en México.',
    'Hablas en español claro, cálido, breve (máximo 120 palabras). Nada de jerga médica.',
    '',
    'FICHA DE LA MASCOTA (SÍ tienes acceso a estos datos; úsalos para personalizar):',
    fichaMascota(mascota),
    '',
    'REGLAS ABSOLUTAS:',
    '1. NO diagnosticas. Nunca digas "tu mascota tiene X enfermedad".',
    '2. NO recomiendas medicamentos ni dosis, ni inducir vómito por tu cuenta.',
    '3. NO cambias la urgencia: si se te da un resultado del protocolo, ese manda.',
    '   Si el nivel es ROJO, jamás digas que puede esperar.',
    '4. Siempre terminas invitando a acudir con un veterinario.',
    '5. Si falta información clave, haces 1 o 2 preguntas cortas.',
    '6. Apóyate en la ficha (edad, peso, condiciones, medicamentos, alergias) y menciónala',
    '   cuando sea relevante. Si hay alergias o medicamentos, tómalos en cuenta.',
    triaje
      ? `RESULTADO DEL PROTOCOLO (no lo contradigas): nivel=${triaje.nivel}; motivos=${(triaje.motivos || []).join(' / ')}; pasos=${(triaje.pasos || []).join(' | ')}`
      : 'Aún no hay resultado del protocolo: puedes hacer preguntas para entender el caso.',
  ].join('\n');

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        temperature: 0.3,
        max_tokens: 400,
        messages: [{ role: 'system', content: system }, ...mensajes.slice(-10)],
      }),
    });

    if (!r.ok) {
      const detalle = await r.text();
      console.error('[Groq]', r.status, detalle);
      return res.status(502).json({ error: 'ia_no_disponible' });
    }

    const data = await r.json();
    const texto = data?.choices?.[0]?.message?.content?.trim() || '';
    res.json({ respuesta: texto });
  } catch (err) {
    console.error('[Groq]', err);
    res.status(502).json({ error: 'ia_no_disponible' });
  }
});

app.listen(PORT, () => {
  const ia = process.env.GROQ_API_KEY ? 'activada' : 'desactivada (modo plantillas)';
  const db = process.env.SUPABASE_URL ? 'activado' : 'desactivado (modo local)';
  console.log(`\n  VetYa escuchando en http://localhost:${PORT}`);
  console.log(`  IA de lenguaje: ${ia}`);
  console.log(`  Supabase: ${db}\n`);
});
