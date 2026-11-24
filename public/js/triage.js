/**
 * Motor de triaje determinista de VetYa.
 * Entrada: síntomas seleccionados + respuestas + datos de la mascota.
 * Salida: nivel de urgencia, motivos y pasos concretos.
 *
 * Ninguna respuesta de este módulo proviene de un modelo de lenguaje.
 */

import {
  NIVELES,
  NIVEL_INFO,
  SINTOMAS,
  TOXICOS,
  BANDERAS_ROJAS,
} from './data/protocols.js';

/** Quita acentos y baja a minúsculas para comparar texto libre. */
export function normalizar(texto = '') {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Especies que tienen lista propia de tóxicos; cualquier otra se trata como "desconocida". */
const ESPECIES_CONOCIDAS = ['perro', 'gato'];

const RE_ESPECIALES = /[.*+?^${}()|[\]\\]/g;

/**
 * Alias que en español son palabras de uso común y provocan falsos positivos
 * ("me pasa algo", "se vino a dormir", "una pila de hojas"). Para estos solo
 * se cuenta el caso si el texto habla de que el animal se lo comió/bebió/etc.
 */
const ALIAS_AMBIGUOS = new Set(['pasa', 'pasas', 'vino', 'pila', 'pilas', 'moneda', 'monedas', 'ron']);

const RE_INGESTION =
  /(comio|comieron|comiendo|ingirio|ingirieron|ingiriendo|trago|tragaron|tragando|mordio|mordieron|lamio|lamieron|bebio|bebieron|bebiendo|tomo|tomaron|mastico|masticando|se comio|se trago|se bebio)/;

/**
 * ¿El texto (ya normalizado) menciona esta palabra o frase completa?
 * Usa límites de palabra en vez de subcadena para evitar falsos positivos
 * como "bajo" -> ajo, "ronronea" -> ron o "pasa" -> uvas.
 * Se permite una "s" final para reconocer plurales (cebollas, chocolates).
 */
function mencionaPalabra(texto, palabra) {
  const p = normalizar(palabra).trim();
  if (!p) return false;
  const esc = p.replace(RE_ESPECIALES, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${esc}s?([^a-z0-9]|$)`).test(texto);
}

/** Busca tóxicos mencionados en el texto libre del dueño. */
export function detectarToxicos(texto = '', especie) {
  const t = normalizar(texto);
  if (!t.trim()) return [];
  const filtrarPorEspecie = ESPECIES_CONOCIDAS.includes(especie);
  const hayIngestion = RE_INGESTION.test(t);
  return TOXICOS.filter((tox) => {
    if (filtrarPorEspecie && !tox.especies.includes(especie)) return false;
    return tox.alias.some((a) => {
      const p = normalizar(a).trim();
      if (ALIAS_AMBIGUOS.has(p) && !hayIngestion) return false;
      return mencionaPalabra(t, a);
    });
  });
}

function subirNivel(nivel) {
  if (nivel === 'verde') return 'amarillo';
  if (nivel === 'amarillo') return 'rojo';
  return 'rojo';
}

function peorNivel(niveles) {
  return niveles.reduce(
    (peor, n) => (NIVELES[n] > NIVELES[peor] ? n : peor),
    'verde'
  );
}

/** Calcula la edad en años a partir de una fecha ISO. */
export function edadEnAnios(nacimiento) {
  if (!nacimiento) return null;
  const n = new Date(nacimiento);
  if (Number.isNaN(n.getTime())) return null;
  const dif = Date.now() - n.getTime();
  return dif / (1000 * 60 * 60 * 24 * 365.25);
}

/**
 * Evalúa el caso.
 * @param {Object} entrada
 * @param {string[]} entrada.sintomas   ids de SINTOMAS
 * @param {Object}   entrada.respuestas mapa { preguntaId: opcionId }
 * @param {Object}   entrada.mascota    ficha de la mascota
 * @param {string}   entrada.texto      descripción libre del dueño
 */
export function evaluar({ sintomas = [], respuestas = {}, mascota = {}, texto = '' } = {}) {
  const motivos = [];
  const pasos = [];
  const niveles = [];

  const items = SINTOMAS.filter((s) => sintomas.includes(s.id));
  const especie = mascota?.especie;

  // 1) Síntomas seleccionados + sus preguntas de seguimiento
  items.forEach((item) => {
    if (item.especies && especie && !item.especies.includes(especie)) return;
    let nivel = item.nivel;
    niveles.push(nivel);
    if (item.motivos) motivos.push(...item.motivos);
    if (item.pasos) pasos.push(...item.pasos);

    (item.preguntas || []).forEach((p) => {
      const elegida = (p.opciones || []).find((o) => o.id === respuestas[p.id]);
      if (elegida?.delta > 0) {
        for (let i = 0; i < elegida.delta; i += 1) nivel = subirNivel(nivel);
        niveles.push(nivel);
        if (elegida.motivo) motivos.push(elegida.motivo);
      }
    });
  });

  // 2) Escaneo de tóxicos en el texto libre (bandera roja dura)
  const toxicos = detectarToxicos(texto, especie);
  const sustanciaElegida = TOXICOS.find((t) => t.id === respuestas.sustancia);
  if (sustanciaElegida && !toxicos.some((t) => t.id === sustanciaElegida.id)) {
    toxicos.push(sustanciaElegida);
  }
  toxicos.forEach((tox) => {
    const nivelTox = tox.nivel || 'rojo';
    niveles.push(nivelTox);
    motivos.push(`${tox.nombre}: ${tox.nota}`);
    if (nivelTox === 'rojo') {
      pasos.unshift(
        `Contacta YA a una veterinaria con urgencias: la exposición a ${tox.nombre} puede empeorar en horas.`
      );
    }
  });

  // 3) Modificadores según la ficha de la mascota
  let nivel = peorNivel(niveles.length ? niveles : ['verde']);
  const edad = edadEnAnios(mascota?.nacimiento);

  if (edad !== null && edad < 1 && nivel === 'verde') {
    nivel = 'amarillo';
    motivos.push('Es cachorro: los animales pequeños se descompensan más rápido, conviene vigilarlo de cerca.');
  }
  if (edad !== null && edad >= 8 && nivel === 'verde') {
    nivel = 'amarillo';
    motivos.push('Es adulto mayor: conviene no dejar pasar los síntomas.');
  }
  if ((mascota?.condiciones || '').trim() && nivel !== 'rojo') {
    nivel = subirNivel(nivel);
    motivos.push(`Tiene una condición previa registrada ("${mascota.condiciones}"): el riesgo aumenta.`);
  }
  if (mascota?.medicamentos?.trim()) {
    motivos.push(`Toma medicamentos ("${mascota.medicamentos}"): avísale al veterinario para evitar interacciones.`);
  }

  // 4) Sin información suficiente -> criterio conservador
  if (!items.length && !toxicos.length && !normalizar(texto).trim()) {
    nivel = 'amarillo';
    motivos.push('No hay suficiente información: por precaución, conviene valorarlo hoy.');
    pasos.push('Elige el síntoma que más se parezca o descríbelo en el chat.');
    pasos.push('Revisa si respira normal, si está consciente y cómo tiene las encías.');
  }

  // 5) Pasos únicos, máximo 5, con recordatorio universal
  const pasosUnicos = [...new Set(pasos)].slice(0, 5);
  pasosUnicos.push('Llama o acude a una veterinaria y muestra esta orientación. Esto NO sustituye una consulta médica real.');

  const info = NIVEL_INFO[nivel];
  return {
    nivel,
    codigo: info.codigo,
    etiqueta: info.etiqueta,
    resumen: info.resumen,
    color: info.color,
    motivos: [...new Set(motivos)],
    pasos: pasosUnicos,
    toxicos: toxicos.map((t) => t.nombre),
    generadoEn: new Date().toISOString(),
  };
}

/** Checklist rápido "¿corro o espero?". Si hay cualquier SÍ, es ROJO. */
export function evaluarChecklist(respuestas = {}) {
  const positivas = BANDERAS_ROJAS.filter((b) => respuestas[b.id] === true);
  if (positivas.length) {
    return {
      nivel: 'rojo',
      codigo: NIVEL_INFO.rojo.codigo,
      etiqueta: NIVEL_INFO.rojo.etiqueta,
      resumen: NIVEL_INFO.rojo.resumen,
      color: NIVEL_INFO.rojo.color,
      motivos: positivas.map((b) => `Respondiste sí a: ${b.texto.replace(/^¿|\?$/g, '')}.`),
      pasos: [
        'No esperes: estas señales indican urgencia.',
        'Llama a la veterinaria más cercana mientras te preparas para salir.',
        'Llévalo YA. Esto NO sustituye una consulta médica real.',
      ],
      toxicos: [],
      generadoEn: new Date().toISOString(),
    };
  }
  return {
    nivel: 'verde',
    codigo: NIVEL_INFO.verde.codigo,
    etiqueta: NIVEL_INFO.verde.etiqueta,
    resumen: NIVEL_INFO.verde.resumen,
    color: NIVEL_INFO.verde.color,
    motivos: ['No marcaste ninguna señal de alarma inmediata.'],
    pasos: [
      'Vigílalo durante las próximas 24 horas.',
      'Si aparece cualquiera de las otras señales, vuelve a evaluar.',
      'Ante cualquier duda, consulta al veterinario. Esto NO sustituye una consulta médica real.',
    ],
    toxicos: [],
    generadoEn: new Date().toISOString(),
  };
}
