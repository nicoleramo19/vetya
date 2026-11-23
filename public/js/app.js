/**
 * VetYa · Controlador principal.
 * Une el motor de triaje, la ficha de la mascota, el mapa y el chat.
 */

import {
  SINTOMAS,
  NIVEL_INFO,
  BANDERAS_ROJAS,
  CONTACTOS_EMERGENCIA,
  TOXICOS,
} from './data/protocols.js';
import { evaluar, evaluarChecklist } from './triage.js';
import * as Mascotas from './pets.js';
import * as Chat from './chat.js';
import * as Mapa from './map.js';
import * as QR from './qr.js';
import * as Nube from './supabase.js';

const $ = (sel) => document.querySelector(sel);

const LLAVE_HISTORIAL = 'vetya.historial';
const LLAVE_PREFS = 'vetya.prefs';

const estado = {
  sintomas: [],
  respuestas: {},
  resultado: null,
  voz: false,
  config: { chatEnabled: false },
  sesion: null,
  mascota: null,
  mapaListo: false,
  origenMapa: null,
  historialChat: [],
};

/* ============================================================
   Utilidades
   ============================================================ */
function el(tag, props = {}, hijos = []) {
  const nodo = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'clase') nodo.className = v;
    else if (k === 'texto') nodo.textContent = v;
    else if (k === 'html') nodo.innerHTML = v;
    else if (k.startsWith('on')) nodo.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) nodo.setAttribute(k, v);
  });
  (Array.isArray(hijos) ? hijos : [hijos]).forEach((h) => h && nodo.appendChild(h));
  return nodo;
}

const NS_SVG = 'http://www.w3.org/2000/svg';

/** Crea un icono SVG del sprite de index.html. */
function icono(nombre) {
  const svg = document.createElementNS(NS_SVG, 'svg');
  svg.setAttribute('class', 'ico');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(NS_SVG, 'use');
  use.setAttribute('href', `#ico-${nombre}`);
  svg.appendChild(use);
  return svg;
}

function nodoTexto(valor) {
  return document.createTextNode(valor);
}

let temporizadorAviso = null;
function aviso(texto) {
  const caja = $('#aviso-flotante');
  caja.textContent = texto;
  caja.classList.add('visible');
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => caja.classList.remove('visible'), 3200);
}

function hablar(texto) {
  if (!estado.voz) return;
  if (!('speechSynthesis' in window)) return aviso('Tu navegador no puede leer en voz alta.');
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = 'es-MX';
  u.rate = 0.95;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

function dictar(destino) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return aviso('El dictado no está disponible aquí. Prueba en Chrome.');
  const r = new SR();
  r.lang = 'es-MX';
  r.interimResults = false;
  r.onresult = (e) => {
    destino.value = `${destino.value} ${e.results[0][0].transcript}`.trim();
    aviso('Listo, ya se escribió lo que dijiste.');
  };
  r.onerror = () => aviso('No pude escuchar. Intenta otra vez.');
  r.start();
  aviso('Escuchando…');
}

/* ============================================================
   Preferencias de accesibilidad
   ============================================================ */
function cargarPrefs() {
  let prefs = { fuente: 18, contraste: false, voz: false };
  try {
    prefs = { ...prefs, ...JSON.parse(localStorage.getItem(LLAVE_PREFS) || '{}') };
  } catch { /* sin preferencias guardadas */ }
  aplicarFuente(prefs.fuente);
  document.body.classList.toggle('contraste', prefs.contraste);
  estado.voz = prefs.voz;
  $('#btn-voz').setAttribute('aria-pressed', String(prefs.voz));
  return prefs;
}

function guardarPrefs() {
  localStorage.setItem(
    LLAVE_PREFS,
    JSON.stringify({
      fuente: Number(getComputedStyle(document.documentElement).getPropertyValue('--fuente').replace('px', '')) || 18,
      contraste: document.body.classList.contains('contraste'),
      voz: estado.voz,
    })
  );
}

function aplicarFuente(px) {
  const valor = Math.min(28, Math.max(14, px));
  document.documentElement.style.setProperty('--fuente', `${valor}px`);
}

/* ============================================================
   Navegación
   ============================================================ */
function mostrar(nombre) {
  document.querySelectorAll('.vista').forEach((v) => v.classList.toggle('activa', v.id === `vista-${nombre}`));
  document.querySelectorAll('.menu button').forEach((b) => b.classList.toggle('activo', b.dataset.vista === nombre));
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (nombre === 'vets') prepararMapa();
  if (nombre === 'chat') actualizarFuenteChat();
}

/* ============================================================
   Pantalla de urgencia
   ============================================================ */
function pintarSintomas() {
  const cont = $('#sintomas-por-nivel');
  cont.innerHTML = '';
  ['rojo', 'amarillo', 'verde'].forEach((nivel) => {
    const items = SINTOMAS.filter((s) => s.nivel === nivel);
    if (!items.length) return;
    const info = NIVEL_INFO[nivel];

    const grupo = el('section', { clase: `grupo-sintomas grupo--${nivel}` });
    grupo.appendChild(
      el('h2', { clase: 'grupo__titulo' }, [
        el('span', { clase: 'punto', 'aria-hidden': 'true' }),
        nodoTexto(info.seccion),
        el('span', { clase: 'grupo__codigo', texto: info.codigo }),
      ])
    );
    grupo.appendChild(el('p', { clase: 'sub', texto: info.resumen }));

    const grid = el('div', { clase: 'grid-sintomas' });
    items.forEach((s) => {
      const elegido = estado.sintomas.includes(s.id);
      grid.appendChild(
        el('button', {
          clase: `sintoma${elegido ? ' elegido' : ''}`,
          type: 'button',
          'data-nivel': s.nivel,
          'aria-pressed': String(elegido),
          onclick: () => alternarSintoma(s.id),
        }, [
          el('span', { clase: 'sintoma__label', texto: s.label }),
          el('span', { clase: 'sintoma__breve', texto: s.breve || '' }),
        ])
      );
    });
    grupo.appendChild(grid);
    cont.appendChild(grupo);
  });
}

function alternarSintoma(id) {
  const pos = estado.sintomas.indexOf(id);
  if (pos >= 0) estado.sintomas.splice(pos, 1);
  else estado.sintomas.push(id);
  pintarSintomas();
  pintarSintomaDetalle();
  mostrar('sintoma');
}

function pintarSintomaDetalle() {
  const etiquetas = $('#lista-seleccionados');
  etiquetas.innerHTML = '';
  if (!estado.sintomas.length) {
    etiquetas.appendChild(el('p', { clase: 'sub', texto: 'No has elegido ningún síntoma todavía. Puedes describirlo abajo.' }));
  }
  estado.sintomas.forEach((id) => {
    const s = SINTOMAS.find((x) => x.id === id);
    if (!s) return;
    etiquetas.appendChild(
      el('button', {
        clase: 'etiqueta',
        type: 'button',
        title: 'Quitar',
        texto: `${s.label}  ×`,
        onclick: () => {
          estado.sintomas = estado.sintomas.filter((x) => x !== id);
          pintarSintomas();
          pintarSintomaDetalle();
        },
      })
    );
  });

  const contenedor = $('#preguntas-seguimiento');
  contenedor.innerHTML = '';
  estado.sintomas.forEach((id) => {
    const s = SINTOMAS.find((x) => x.id === id);
    (s?.preguntas || []).forEach((p) => {
      const caja = el('div', { clase: 'pregunta' });
      caja.appendChild(el('span', { clase: 'pregunta__titulo', texto: p.label }));
      const opciones = el('div', { clase: 'pregunta__opciones' });

      const lista = p.tipo === 'toxicos'
        ? TOXICOS_PARA_ESPECIE().map((t) => ({ id: t.id, label: t.nombre }))
        : (p.opciones || []).map((o) => ({ id: o.id, label: o.label }));

      lista.forEach((o) => {
        opciones.appendChild(
          el('button', {
            clase: `opcion${estado.respuestas[p.id] === o.id ? ' elegido' : ''}`,
            type: 'button',
            onclick: () => {
              estado.respuestas[p.id] = estado.respuestas[p.id] === o.id ? undefined : o.id;
              pintarSintomaDetalle();
            },
          }, [o.label])
        );
      });
      caja.appendChild(opciones);
      if (p.notaSinRespuesta) caja.appendChild(el('p', { clase: 'sub', texto: p.notaSinRespuesta }));
      contenedor.appendChild(caja);
    });
  });
}

/** Tóxicos filtrados por la especie de la mascota activa. */
function TOXICOS_PARA_ESPECIE() {
  const especie = estado.mascota?.especie;
  return TOXICOS.filter((t) => !especie || t.especies.includes(especie));
}

function evaluarYMostrar() {
  const texto = $('#texto-libre').value;
  const resultado = evaluar({
    sintomas: estado.sintomas,
    respuestas: estado.respuestas,
    mascota: estado.mascota || {},
    texto,
  });
  resultado.texto = texto;
  estado.resultado = resultado;
  guardarEnHistorial(resultado);
  if (estado.sesion && estado.mascota?.id) {
    Nube.registrarTriaje(estado.mascota.id, resultado).catch(() => {});
  }
  pintarResultado(resultado);
  mostrar('resultado');
}

function pintarResultado(r) {
  const caja = $('#resultado-caja');
  caja.innerHTML = '';

  caja.appendChild(
    el('div', { clase: 'resultado__caja', 'data-nivel': r.nivel }, [
      el('span', { clase: 'resultado__codigo', texto: r.codigo || '' }),
      el('p', { clase: 'resultado__titulo', texto: r.etiqueta }),
      el('p', { clase: 'resultado__resumen', texto: r.resumen }),
    ])
  );

  if (r.motivos?.length) {
    const t = el('div', { clase: 'tarjeta' }, [el('h4', { texto: 'Por qué' })]);
    const ul = el('ul');
    r.motivos.forEach((m) => ul.appendChild(el('li', { texto: m })));
    t.appendChild(ul);
    caja.appendChild(t);
  }

  if (r.pasos?.length) {
    const t = el('div', { clase: 'tarjeta' }, [el('h4', { texto: 'Qué hacer ahora' })]);
    const ol = el('ol');
    r.pasos.forEach((p) => ol.appendChild(el('li', { texto: p })));
    t.appendChild(ol);
    caja.appendChild(t);
  }

  const acciones = el('div', { clase: 'fila-acciones' });
  acciones.appendChild(el('button', {
    clase: 'boton boton--primario', type: 'button',
    onclick: () => mostrar('vets'),
  }, [icono('mapa'), nodoTexto('Ver veterinarias cerca')]));
  acciones.appendChild(el('button', {
    clase: 'boton', type: 'button',
    onclick: () => {
      const antes = estado.voz;
      estado.voz = true;
      hablar(`${r.etiqueta}. ${r.resumen} ${(r.pasos || []).join(' ')}`);
      estado.voz = antes;
    },
  }, [icono('voz'), nodoTexto('Leer en voz alta')]));
  acciones.appendChild(el('button', {
    clase: 'boton', type: 'button',
    onclick: () => {
      mostrar('chat');
      if (!estado.historialChat.length) enviarChat('¿Qué hago en este caso?', true);
    },
  }, [icono('chat'), nodoTexto('Preguntar en el chat')]));
  caja.appendChild(acciones);

  caja.appendChild(
    el('div', { clase: 'aviso-legal' }, [
      icono('aviso'),
      el('p', { html: '<strong>Recuerda:</strong> esta orientación <strong>no es un diagnóstico</strong> ni sustituye una consulta veterinaria. Si hay duda, acude a un profesional.' }),
    ])
  );

  hablar(`${r.etiqueta}. ${(r.pasos || [])[0] || ''}`);
}

/* ============================================================
   Checklist ¿corro o espero?
   ============================================================ */
function pintarChecklist() {
  const cont = $('#lista-bandera');
  cont.innerHTML = '';
  if (!estado.check) estado.check = {};
  BANDERAS_ROJAS.forEach((b) => {
    const botones = el('div', { clase: 'bandera__botones' });
    ['si', 'no'].forEach((op) => {
      botones.appendChild(
        el('button', {
          clase: `${op}${estado.check[b.id] === (op === 'si') ? ' elegido' : ''}`,
          type: 'button',
          texto: op === 'si' ? 'Sí' : 'No',
          onclick: () => {
            estado.check[b.id] = op === 'si';
            pintarChecklist();
          },
        })
      );
    });
    cont.appendChild(el('div', { clase: 'bandera' }, [el('span', { texto: b.texto }), botones]));
  });
}

function evaluarCheck() {
  const r = evaluarChecklist(estado.check || {});
  const caja = $('#check-resultado');
  caja.hidden = false;
  caja.innerHTML = '';
  caja.appendChild(
    el('div', { clase: 'resultado__caja', 'data-nivel': r.nivel }, [
      el('span', { clase: 'resultado__codigo', texto: r.codigo || '' }),
      el('p', { clase: 'resultado__titulo', texto: r.etiqueta }),
      el('p', { clase: 'resultado__resumen', texto: r.resumen }),
    ])
  );
  const t = el('div', { clase: 'tarjeta' }, [el('h4', { texto: 'Qué hacer' })]);
  const ol = el('ol');
  r.pasos.forEach((p) => ol.appendChild(el('li', { texto: p })));
  t.appendChild(ol);
  caja.appendChild(t);
  hablar(`${r.etiqueta}. ${r.resumen}`);
}

/* ============================================================
   Mapa de veterinarias
   ============================================================ */
function prepararMapa() {
  if (estado.mapaListo) {
    setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    return;
  }
  try {
    Mapa.crearMapa('mapa', {});
    estado.mapaListo = true;
  } catch (err) {
    console.warn('No se pudo iniciar el mapa', err);
  }
}

/** Explica con precisión por qué falló la ubicación. */
function mensajeUbicacion(err) {
  if (!window.isSecureContext) {
    return 'Tu navegador solo permite la ubicación en páginas seguras (https). Estás en una dirección no segura: usa "Ver Estado de México" mientras tanto.';
  }
  if (err?.code === 1) {
    return 'El permiso de ubicación está bloqueado. Revisa el candado de la barra del navegador y permite "Ubicación". Si estás en Mac, activa también tu navegador en Ajustes del Sistema > Privacidad y seguridad > Localización. Luego intenta otra vez.';
  }
  if (err?.code === 2) {
    return 'No pude detectar tu ubicación. Revisa que el GPS o los servicios de ubicación estén encendidos, o usa "Ver Estado de México".';
  }
  if (err?.code === 3) {
    return 'La ubicación tardó demasiado. Intenta otra vez o usa "Ver Estado de México".';
  }
  return 'No pude obtener tu ubicación. Usa "Ver Estado de México".';
}

async function buscarCercaDe(lat, lng) {
  estado.origenMapa = { lat, lng };
  Mapa.ubicarUsuario(lat, lng);
  $('#vets-estado').textContent = 'Buscando veterinarias cercanas…';

  const [osm, comunidad] = await Promise.all([
    Mapa.buscarEnOpenStreetMap(lat, lng, 10000),
    Nube.traerVets().catch(() => []),
  ]);
  const guardadas = leerVetsLocales();
  const todas = [...osm, ...comunidad, ...guardadas];

  if (!todas.length) {
    $('#vets-estado').textContent = 'No encontramos veterinarias registradas en esta zona. Puedes agregar una tú mismo abajo.';
    $('#lista-vets').innerHTML = '';
    return;
  }
  const ordenadas = Mapa.dibujarVets(todas, { lat, lng });
  $('#vets-estado').textContent = `Encontramos ${ordenadas.length} veterinarias. La más cercana está a ${Mapa.formatearDistancia(ordenadas[0].distancia)}.`;
  pintarListaVets(ordenadas, { lat, lng });
}

function pintarListaVets(vets, origen) {
  const cont = $('#lista-vets');
  cont.innerHTML = '';
  vets.slice(0, 12).forEach((v) => {
    const ap = Mapa.estadoApertura(v);
    const acc = el('div', { clase: 'vet__acciones' });
    if (v.telefono) {
      acc.appendChild(el('a', { href: Mapa.enlaceLlamada(v.telefono) }, [
        icono('telefono'), nodoTexto(v.telefono),
      ]));
    }
    acc.appendChild(el('a', {
      clase: 'ir', href: Mapa.enlaceNavegacion(v.lat, v.lng), target: '_blank', rel: 'noopener',
    }, [icono('ruta'), nodoTexto('Ir ahora')]));
    acc.appendChild(el('button', {
      clase: 'boton', type: 'button',
      onclick: async (e) => {
        const ruta = await Mapa.calcularRuta(origen, v);
        const min = Math.round(ruta.duracionSeg / 60);
        e.currentTarget.textContent = `≈ ${min} min · ${Mapa.formatearDistancia(ruta.distancia)}${ruta.estimado ? ' (aprox.)' : ''}`;
      },
    }, [icono('reloj'), nodoTexto('¿Cuánto tardo?')]));

    cont.appendChild(
      el('div', { clase: `vet${ap.abierto ? ' abierto' : ''}` }, [
        el('div', { clase: 'vet__nombre', texto: v.nombre }),
        el('div', { clase: 'vet__meta' }, [
          el('span', { clase: `badge${ap.abierto ? ' ok' : ''}`, texto: ap.texto }),
          document.createTextNode(` · ${Mapa.formatearDistancia(v.distancia)}${v.direccion ? ` · ${v.direccion}` : ''}${v.origen ? ` · ${v.origen}` : ''}`),
        ]),
        acc,
      ])
    );
  });
}

const LLAVE_VETS = 'vetya.vets';
function leerVetsLocales() {
  try { return JSON.parse(localStorage.getItem(LLAVE_VETS) || '[]'); } catch { return []; }
}

/* ============================================================
   Ficha de la mascota
   ============================================================ */
function pintarMascotas() {
  const lista = Mascotas.listar();
  const cont = $('#lista-mascotas');
  cont.innerHTML = '';
  if (!lista.length) {
    cont.appendChild(el('p', { clase: 'sub', texto: 'Todavía no tienes ninguna ficha. Llénala abajo.' }));
  }
  lista.forEach((m) => {
    cont.appendChild(
      el('button', {
        clase: `mascota-chip${estado.mascota?.id === m.id ? ' activa' : ''}`,
        type: 'button',
        onclick: () => {
          Mascotas.activar(m.id);
          cargarMascotaActiva();
          aviso(`Ahora trabajas con la ficha de ${m.nombre}.`);
        },
      }, [
        icono('corazon'),
        nodoTexto(`${m.nombre} · ${etiquetaEspecie(m.especie)}`),
      ])
    );
  });
}

function etiquetaEspecie(especie) {
  return { perro: 'Perro', gato: 'Gato' }[especie] || 'Otro';
}

function cargarMascotaActiva() {
  estado.mascota = Mascotas.obtenerActiva();
  const form = $('#form-mascota');
  form.reset();
  const m = estado.mascota;
  $('#chip-mascota-texto').textContent = m ? `${m.nombre} · ${etiquetaEspecie(m.especie)}` : 'Sin mascota';
  if (m) {
    Object.entries(m).forEach(([k, v]) => {
      if (form.elements[k]) form.elements[k].value = v ?? '';
    });
  }
  pintarMascotas();
  pintarQR();
  pintarHistorial();
  pintarSintomaDetalle();
}

async function pintarQR() {
  const canvas = $('#qr-canvas');
  const texto = $('#texto-emergencia');
  const m = estado.mascota;
  if (!m) {
    texto.textContent = 'Guarda una ficha para generar su tarjeta de emergencia.';
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  const contenido = Mascotas.textoDeEmergencia(m);
  texto.textContent = contenido;
  const ok = await QR.pintarQR(canvas, contenido);
  if (!ok) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    texto.textContent = `${contenido}\n\n(No pude dibujar el código QR en este navegador. Puedes compartir este texto.)`;
  }
}

function leerHistorial() {
  try { return JSON.parse(localStorage.getItem(LLAVE_HISTORIAL) || '[]'); } catch { return []; }
}

function guardarEnHistorial(r) {
  const registro = {
    id: crypto.randomUUID(),
    petId: estado.mascota?.id || null,
    nivel: r.nivel,
    motivos: r.motivos,
    pasos: r.pasos,
    fecha: r.generadoEn || new Date().toISOString(),
  };
  const todos = leerHistorial();
  todos.unshift(registro);
  localStorage.setItem(LLAVE_HISTORIAL, JSON.stringify(todos.slice(0, 60)));
  pintarHistorial();
}

function pintarHistorial() {
  const cont = $('#historial');
  if (!cont) return;
  cont.innerHTML = '';
  const registros = leerHistorial().filter((r) => !estado.mascota || !r.petId || r.petId === estado.mascota.id);
  if (!registros.length) {
    cont.appendChild(el('p', { clase: 'sub', texto: 'Aquí verás las evaluaciones que hagas.' }));
    return;
  }
  registros.slice(0, 8).forEach((r) => {
    const info = NIVEL_INFO[r.nivel];
    cont.appendChild(
      el('div', { clase: 'historial__item', 'data-nivel': r.nivel }, [
        el('strong', { texto: `${info.codigo} · ${info.etiqueta}` }),
        el('div', { clase: 'sub', texto: new Date(r.fecha).toLocaleString('es-MX') }),
        el('div', { texto: (r.motivos || [])[0] || '' }),
      ])
    );
  });
}

/* ============================================================
   Chat
   ============================================================ */
function actualizarFuenteChat() {
  $('#chat-fuente').textContent = estado.config.chatEnabled
    ? 'Con IA conectada: la IA solo te explica, no decide la urgencia.'
    : 'Modo local: las respuestas se arman con el protocolo. Conecta la IA cuando tengas la clave.';
}

function agregarMensaje(texto, quien) {
  const caja = $('#chat-mensajes');
  caja.appendChild(el('div', { clase: `mensaje mensaje--${quien}`, texto }));
  caja.scrollTop = caja.scrollHeight;
}

async function enviarChat(texto, silencioso = false) {
  if (!texto?.trim()) return;
  agregarMensaje(texto, 'yo');
  estado.historialChat.push({ role: 'user', content: texto });
  if (!silencioso) $('#chat-input').value = '';

  agregarMensaje('…', 'bot');
  const caja = $('#chat-mensajes');
  const ultimo = caja.lastChild;

  const { texto: respuesta, fuente } = await Chat.responder({
    historial: estado.historialChat.slice(-8),
    mascota: estado.mascota,
    triaje: estado.resultado,
  });
  ultimo.textContent = respuesta;
  estado.historialChat.push({ role: 'assistant', content: respuesta });
  if (fuente === 'local' && estado.config.chatEnabled) aviso('La IA no respondió: usé el protocolo local.');
  hablar(respuesta);
}

/* ============================================================
   Cuenta
   ============================================================ */
const MOTIVO_MODO_LOCAL = {
  faltan_llaves: 'La nube no está configurada: faltan las claves en el archivo .env.',
  libreria: 'No se cargó la librería de la nube (/vendor/supabase.js). Recarga la página con Cmd + Shift + R.',
  error: 'No pude conectar con la nube. Revisa tu conexión a internet y recarga la página.',
};

function actualizarCuenta() {
  const disponible = Nube.estaDisponible();
  const avisoNube = $('#modo-local');
  avisoNube.hidden = disponible;
  if (!disponible) {
    const razon = MOTIVO_MODO_LOCAL[Nube.motivoConexion()] || MOTIVO_MODO_LOCAL.error;
    avisoNube.textContent = `${razon} Mientras tanto, tus fichas se guardan en este dispositivo.`;
  }
  $('#form-auth').hidden = !disponible;
  const botonSalir = $('#btn-salir');
  botonSalir.hidden = !estado.sesion;
  $('#auth-estado').textContent = estado.sesion
    ? `Sesión iniciada como ${estado.sesion.user.email}. Tus fichas se sincronizan.`
    : disponible
      ? 'Crea tu cuenta para tener tus fichas en todos tus dispositivos.'
      : '';
}

/**
 * Une las fichas de la nube con las de este dispositivo, en los dos sentidos:
 *  - baja las que ya están guardadas en la cuenta (para verlas en este equipo);
 *  - sube las que solo existen aquí (hechas antes de crear la cuenta).
 * Sin esto, al iniciar sesión no aparecían las mascotas y las fichas previas
 * se quedaban atoradas en el dispositivo.
 */
async function sincronizarDesdeNube() {
  if (!estado.sesion) return;
  try {
    const nube = await Nube.traerMascotas();
    const idsNube = new Set(nube.map((f) => f.id));
    if (nube.length) Mascotas.fusionar(nube);

    const soloLocal = Mascotas.listar().filter((m) => !idsNube.has(m.id));
    for (const m of soloLocal) {
      // Si la ficha es de otra cuenta, la nube la rechaza y simplemente se ignora.
      try { await Nube.guardarMascota(m); } catch { /* sin permiso: se omite */ }
    }

    cargarMascotaActiva();
    const total = Mascotas.listar().length;
    if (total) aviso(`Sincronizado: ${total} ficha(s) en tu cuenta.`);
  } catch (err) {
    console.warn('No pude sincronizar con la nube', err);
  }
}

/* ============================================================
   Arranque
   ============================================================ */
async function iniciar() {
  // Evita bajar de la nube dos veces al mismo usuario (getSession + onAuthStateChange).
  let usuarioSincronizado = null;
  cargarPrefs();
  pintarSintomas();
  pintarSintomaDetalle();
  pintarChecklist();
  cargarMascotaActiva();
  pintarPanelEmergencia();

  estado.config = await Chat.obtenerConfig();
  actualizarFuenteChat();

  await Nube.iniciar((sesion) => {
    estado.sesion = sesion;
    actualizarCuenta();
    const idUsuario = sesion?.user?.id || null;
    if (idUsuario && idUsuario !== usuarioSincronizado) {
      usuarioSincronizado = idUsuario;
      sincronizarDesdeNube();
    } else if (!idUsuario) {
      usuarioSincronizado = null;
    }
  });
  actualizarCuenta();
  pintarSintomaDetalle();

  // Eventos
  document.querySelectorAll('.menu button, [data-vista]').forEach((b) => {
    b.addEventListener('click', () => mostrar(b.dataset.vista));
  });
  $('#chip-mascota').addEventListener('click', () => mostrar('mascota'));
  $('#btn-fuente-menos').addEventListener('click', () => {
    const actual = parseFloat(getComputedStyle(document.documentElement).fontSize);
    aplicarFuente(actual - 1);
    guardarPrefs();
  });
  $('#btn-fuente-mas').addEventListener('click', () => {
    const actual = parseFloat(getComputedStyle(document.documentElement).fontSize);
    aplicarFuente(actual + 1);
    guardarPrefs();
  });
  $('#btn-contraste').addEventListener('click', () => {
    document.body.classList.toggle('contraste');
    guardarPrefs();
  });
  $('#btn-voz').addEventListener('click', (e) => {
    estado.voz = !estado.voz;
    e.currentTarget.setAttribute('aria-pressed', String(estado.voz));
    guardarPrefs();
    aviso(estado.voz ? 'Lectura en voz alta activada.' : 'Lectura en voz alta desactivada.');
  });

  $('#btn-check').addEventListener('click', () => mostrar('check'));
  $('#btn-evaluar').addEventListener('click', evaluarYMostrar);
  $('#btn-dictado').addEventListener('click', () => dictar($('#texto-libre')));
  $('#btn-evaluar-check').addEventListener('click', evaluarCheck);

  $('#btn-ubicacion').addEventListener('click', async (e) => {
    const boton = e.currentTarget;
    boton.disabled = true;
    $('#vets-estado').textContent = 'Pidiendo tu ubicación al navegador…';
    try {
      const { lat, lng } = await Mapa.obtenerUbicacion();
      await buscarCercaDe(lat, lng);
    } catch (err) {
      const mensaje = mensajeUbicacion(err);
      $('#vets-estado').textContent = mensaje;
      aviso(mensaje);
    } finally {
      boton.disabled = false;
    }
  });
  $('#btn-ubicacion-centro').addEventListener('click', async () => {
    await buscarCercaDe(19.3569, -99.6301);
  });

  $('#form-vet').addEventListener('submit', (e) => {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(e.target));
    const vet = {
      id: `local-${crypto.randomUUID()}`,
      nombre: datos.nombre,
      telefono: datos.telefono,
      direccion: datos.direccion,
      lat: Number(datos.lat),
      lng: Number(datos.lng),
      abierto24h: Boolean(datos.abierto24h),
      origen: 'Agregada por ti',
    };
    const locales = leerVetsLocales();
    locales.push(vet);
    localStorage.setItem(LLAVE_VETS, JSON.stringify(locales));
    if (estado.sesion) Nube.guardarVet(vet).catch(() => {});
    e.target.reset();
    aviso('Veterinaria guardada. Ya aparece en el mapa.');
    if (estado.origenMapa) buscarCercaDe(estado.origenMapa.lat, estado.origenMapa.lng);
  });

  $('#form-mascota').addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(e.target));
    const guardada = Mascotas.guardar(datos);
    estado.mascota = guardada;
    if (estado.sesion) {
      Nube.guardarMascota(guardada)
        .then(() => aviso('Ficha guardada y sincronizada.'))
        .catch(() => aviso('Guardada en este dispositivo; la nube falló.'));
    } else {
      aviso('Ficha guardada en este dispositivo.');
    }
    cargarMascotaActiva();
  });

  $('#btn-eliminar-mascota').addEventListener('click', () => {
    if (!estado.mascota) return aviso('No hay ficha que eliminar.');
    if (!confirm(`¿Eliminar la ficha de ${estado.mascota.nombre}?`)) return;
    Mascotas.eliminar(estado.mascota.id);
    cargarMascotaActiva();
    aviso('Ficha eliminada.');
  });

  $('#btn-descargar-qr').addEventListener('click', () => {
    if (!estado.mascota) return aviso('Primero guarda una ficha.');
    QR.descargarCanvas($('#qr-canvas'), `vetya-${estado.mascota.nombre}.png`);
  });
  $('#btn-compartir-qr').addEventListener('click', async () => {
    if (!estado.mascota) return aviso('Primero guarda una ficha.');
    const res = await QR.compartirTexto(Mascotas.textoDeEmergencia(estado.mascota), `Ficha de ${estado.mascota.nombre}`);
    aviso(res === 'copiado' ? 'Ficha copiada al portapapeles.' : res === 'compartido' ? 'Listo.' : 'No se pudo compartir.');
  });

  $('#chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    enviarChat($('#chat-input').value);
  });
  $('#btn-chat-voz').addEventListener('click', () => dictar($('#chat-input')));

  $('#form-auth').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { email, password } = Object.fromEntries(new FormData(e.target));
    try {
      await Nube.entrar(email, password);
      aviso('Bienvenido de nuevo.');
    } catch (err) {
      aviso(`No pude entrar: ${err.message}`);
    }
  });
  $('#form-auth').querySelector('[data-accion="registrar"]').addEventListener('click', async () => {
    const form = $('#form-auth');
    const { email, password } = Object.fromEntries(new FormData(form));
    if (!email || !password) return aviso('Escribe correo y contraseña.');
    try {
      const { session } = await Nube.registrarse(email, password);
      aviso(
        session
          ? 'Cuenta creada. Tus fichas ya se guardan en la nube.'
          : 'Cuenta creada. Te llegó un correo: ábrelo y confirma tu cuenta para entrar.'
      );
    } catch (err) {
      aviso(`No pude crear la cuenta: ${err.message}`);
    }
  });
  $('#btn-salir').addEventListener('click', async () => {
    await Nube.salir();
    aviso('Sesión cerrada.');
  });

  // Service worker para uso sin conexión
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

function pintarPanelEmergencia() {
  const cont = $('#panel-emergencia');
  cont.innerHTML = '';
  CONTACTOS_EMERGENCIA.forEach((c) => {
    cont.appendChild(
      el('div', { clase: 'contacto' }, [
        el('div', {}, [
          el('strong', { texto: c.nombre }),
          el('div', { clase: 'sub', texto: c.nota }),
        ]),
        el('a', { href: `tel:${c.telefono.replace(/[^\d+]/g, '')}`, texto: c.telefono }),
      ])
    );
  });
  const noHacer = [
    'No le des medicamentos de humanos: muchos son venenosos, sobre todo para gatos.',
    'No induzcas el vómito sin que lo indique un veterinario.',
    'No le des leche, aceite ni remedios caseros.',
    'No esperes a "ver si mejora" cuando hay señales de alarma.',
    'No sujetes a una mascota que está convulsionando: retira objetos y cronometra.',
    'No uses hielo directamente sobre el cuerpo en un golpe de calor.',
  ];
  const t = el('div', { clase: 'tarjeta' }, [el('h4', { texto: 'Qué NO hacer' })]);
  const ul = el('ul');
  noHacer.forEach((x) => ul.appendChild(el('li', { texto: x })));
  t.appendChild(ul);
  cont.appendChild(t);
}

iniciar();
