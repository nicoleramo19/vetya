/**
 * Pruebas del motor determinista de triaje de VetYa.
 * Se ejecutan con: npm test  (usa node:test, sin dependencias nuevas)
 *
 * Estas pruebas protegen los parches críticos de la auditoría:
 * falsos positivos con tóxicos, nivel del aguacate y escalado por condiciones.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizar,
  detectarToxicos,
  evaluar,
  evaluarChecklist,
} from '../public/js/triage.js';

test('normalizar: quita acentos y pasa a minúsculas', () => {
  assert.equal(normalizar('ÁGUA $\u00d3 $\u00c9'), 'agua $o $e');
  assert.equal(normalizar('Aguacate'), 'aguacate');
});

test('detectarToxicos: "debajo" no dispara "ajo" (límite de palabra)', () => {
  assert.deepEqual(detectarToxicos('El perro está debajo de la mesa', 'perro'), []);
});

test('detectarToxicos: detecta "ajo" como palabra completa', () => {
  const toxicos = detectarToxicos('Se le cayó un diente de ajo', 'perro');
  assert.equal(toxicos.length, 1);
  assert.equal(toxicos[0].id, 'cebolla'); // grupo "cebolla, ajo y parientes"
});

test('detectarToxicos: "me pasa algo" no es falso positivo de uvas/pasa', () => {
  assert.deepEqual(detectarToxicos('Me pasa algo desde ayer', 'perro'), []);
});

test('detectarToxicos: término ambiguo "vino" sí cuenta si hay ingestión', () => {
  assert.deepEqual(detectarToxicos('Ayer vimos una película', 'perro'), []);
  const toxicos = detectarToxicos('El perro bebió vino', 'perro');
  assert.ok(toxicos.length >= 1);
  assert.ok(toxicos.some((t) => t.id === 'alcohol'));
});

test('detectarToxicos: respeta la especie (lirio solo para gatos)', () => {
  assert.deepEqual(detectarToxicos('Se comió un lirio', 'perro'), []);
  const toxicos = detectarToxicos('Se comió un lirio', 'gato');
  assert.ok(toxicos.some((t) => t.id === 'lirio'));
});

test('detectarToxicos: especie desconocida muestra todos los tóxicos', () => {
  const toxicos = detectarToxicos('Se comió uvas', 'conejo');
  assert.ok(toxicos.length >= 1);
});

test('evaluar: aguacate es AMARILLO, no rojo forzado', () => {
  const resultado = evaluar({ texto: 'Se comió aguacate', mascota: { especie: 'perro' } });
  assert.equal(resultado.nivel, 'amarillo');
  assert.ok(resultado.toxicos.includes('Aguacate (hueso y hojas)'));
});

test('evaluar: chocolate es ROJO y añade paso de emergencia', () => {
  const resultado = evaluar({ texto: 'Comió chocolate', mascota: { especie: 'perro' } });
  assert.equal(resultado.nivel, 'rojo');
  assert.ok(resultado.pasos.some((p) => p.includes('Contacta YA')));
});

test('evaluar: síntoma rojo manda', () => {
  const resultado = evaluar({ sintomas: ['no_respira'], mascota: { especie: 'perro' } });
  assert.equal(resultado.nivel, 'rojo');
  assert.equal(resultado.codigo, 'CRÍTICO');
});

test('evaluar: vómito aislado es AMARILLO', () => {
  const resultado = evaluar({
    sintomas: ['vomito'],
    respuestas: { frecuencia: 'una', animo: 'activo' },
    mascota: { especie: 'perro' },
  });
  assert.equal(resultado.nivel, 'amarillo');
});

test('evaluar: vómito repetido escala a ROJO por la pregunta de seguimiento', () => {
  const resultado = evaluar({
    sintomas: ['vomito'],
    respuestas: { frecuencia: 'varias', animo: 'activo' },
    mascota: { especie: 'perro' },
  });
  assert.equal(resultado.nivel, 'rojo');
});

test('evaluar: condición crónica escala de VERDE a AMARILLO', () => {
  const resultado = evaluar({
    sintomas: ['comezon'],
    mascota: { especie: 'perro', condiciones: 'alergias' },
  });
  assert.equal(resultado.nivel, 'amarillo');
  assert.ok(resultado.motivos.some((m) => m.includes('condición previa')));
});

test('evaluar: condición crónica escala de AMARILLO a ROJO', () => {
  const resultado = evaluar({
    sintomas: ['vomito'],
    respuestas: { frecuencia: 'una', animo: 'activo' },
    mascota: { especie: 'perro', condiciones: 'diabetes' },
  });
  assert.equal(resultado.nivel, 'rojo');
});

test('evaluar: cachorro con síntoma leve escala a AMARILLO', () => {
  const haceSeisMeses = new Date(Date.now() - 182 * 24 * 60 * 60 * 1000).toISOString();
  const resultado = evaluar({
    sintomas: ['comezon'],
    mascota: { especie: 'perro', nacimiento: haceSeisMeses },
  });
  assert.equal(resultado.nivel, 'amarillo');
  assert.ok(resultado.motivos.some((m) => m.includes('cachorro')));
});

test('evaluar: sin información aplica criterio conservador', () => {
  const resultado = evaluar({ mascota: { especie: 'perro' } });
  assert.equal(resultado.nivel, 'amarillo');
  assert.ok(resultado.motivos.some((m) => m.includes('No hay suficiente información')));
});

test('evaluar: siempre incluye el aviso de NO sustituir consulta', () => {
  const resultado = evaluar({ sintomas: ['herida'], mascota: { especie: 'perro' } });
  assert.ok(resultado.pasos.some((p) => p.includes('NO sustituye una consulta')));
});

test('evaluarChecklist: cualquier bandera roja es ROJO; sin banderas es VERDE', () => {
  assert.equal(evaluarChecklist({}).nivel, 'verde');
  assert.equal(evaluarChecklist({ respira: true }).nivel, 'rojo');
  assert.equal(evaluarChecklist({ veneno: true }).nivel, 'rojo');
});
