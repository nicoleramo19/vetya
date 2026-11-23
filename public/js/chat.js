/**
 * Capa de lenguaje del chat.
 * Si el servidor tiene clave de Groq, se usa el modelo SOLO para redactar.
 * Si no, se responde con el redactor local (plantillas). Nunca falla.
 */

import { NIVEL_INFO } from './data/protocols.js';

let cacheConfig = null;

export async function obtenerConfig() {
  if (!cacheConfig) {
    cacheConfig = await fetch('/api/config')
      .then((r) => r.json())
      .catch(() => ({ chatEnabled: false }));
  }
  return cacheConfig;
}

/** Redactor local: convierte el resultado del protocolo en un mensaje claro. */
export function redactarLocal(triaje, mascota) {
  const nombre = mascota?.nombre || 'tu mascota';
  if (!triaje) {
    return `Cuéntame qué le pasa a ${nombre}: ¿qué viste, desde cuándo y cómo se está comportando? Con eso te oriento. Recuerda que esto no sustituye una consulta veterinaria.`;
  }
  const info = NIVEL_INFO[triaje.nivel];
  const motivos = (triaje.motivos || []).slice(0, 3).map((m) => `• ${m}`).join('\n');
  const pasos = (triaje.pasos || []).slice(0, 3).map((p, i) => `${i + 1}. ${p}`).join('\n');
  return (
    `Según lo que me contaste, esto es ${info.etiqueta} (${info.codigo}): ${info.resumen}\n\n` +
    (motivos ? `Por qué:\n${motivos}\n\n` : '') +
    (pasos ? `Qué hacer ahora:\n${pasos}\n\n` : '') +
    'Si algo empeora, no esperes: acude al veterinario de inmediato. Esto no sustituye una consulta médica real.'
  );
}

/**
 * Pide al servidor una respuesta redactada.
 * @returns {Promise<{texto:string, fuente:'ia'|'local'}>}
 */
export async function responder({ historial = [], mascota = null, triaje = null }) {
  const cfg = await obtenerConfig();

  if (!cfg.chatEnabled) {
    return { texto: redactarLocal(triaje, mascota), fuente: 'local' };
  }

  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensajes: historial,
        contexto: { mascota, triaje },
      }),
    });
    if (!r.ok) throw new Error('sin respuesta');
    const data = await r.json();
    if (!data.respuesta) throw new Error('vacío');
    return { texto: data.respuesta, fuente: 'ia' };
  } catch {
    return { texto: redactarLocal(triaje, mascota), fuente: 'local' };
  }
}
