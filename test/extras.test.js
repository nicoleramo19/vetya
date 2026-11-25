/** Pruebas de los arreglos de QR y del directorio de veterinarias. */
import test from 'node:test';
import assert from 'node:assert/strict';

import { textoDeEmergencia, textoParaQR } from '../public/js/pets.js';
import { deduplicarVets } from '../public/js/map.js';

const mascota = {
  nombre: 'Paprika',
  especie: 'gato',
  raza: 'Siamés',
  condiciones: 'insuficiencia renal',
  alergias: 'pollo',
  medicamentos: 'enalapril 2.5 mg',
  veterinario: 'Vet Central',
  telefonoVet: '5512345678',
  contactoDueno: 'Nicole 5512345678',
};

test('textoParaQR: versión compacta pero con lo esencial', () => {
  const qr = textoParaQR(mascota);
  assert.ok(qr.includes('VETYA'));
  assert.ok(qr.includes('Paprika'));
  assert.ok(qr.includes('gato'));
  assert.ok(qr.includes('ALERG: pollo'));
  assert.ok(qr.includes('COND: insuficiencia renal'));
  assert.ok(qr.includes('VET: 5512345678'));
  assert.ok(qr.includes('DUEÑO: Nicole 5512345678'));
  assert.ok(qr.length <= 180);
});

test('textoParaQR: omite campos vacíos y prefiere el teléfono del veterinario', () => {
  const qr = textoParaQR({ nombre: 'Coco', especie: 'perro', veterinario: 'Vet Central' });
  assert.ok(qr.includes('VET: Vet Central'));
  assert.ok(!qr.includes('ALERG'));
  assert.ok(!qr.includes('COND'));
  assert.ok(!qr.includes('DUEÑO'));
});

test('textoParaQR: recorta textos muy largos para que el QR siga siendo escaneable', () => {
  const qr = textoParaQR({
    nombre: 'Nombre extremadamente largo que no cabe en una tarjeta',
    especie: 'perro',
    alergias: 'una lista interminable de alimentos y medicamentos prohibidos',
  });
  assert.ok(qr.length <= 180);
  assert.ok(qr.split('\n').every((linea) => linea.length <= 60));
});

test('textoDeEmergencia: la ficha completa sigue intacta para las personas', () => {
  const texto = textoDeEmergencia(mascota);
  assert.ok(texto.includes('Raza: Siamés'));
  assert.ok(texto.includes('Medicamentos: enalapril 2.5 mg'));
  assert.ok(texto.includes('Tel. veterinario: 5512345678'));
});

test('deduplicarVets: quita el mismo vet repetido aunque cambie acentos o mayúsculas', () => {
  const lista = [
    { nombre: 'Veterinaria San José', lat: 19.35, lng: -99.63 },
    { nombre: 'VETERINARIA SAN JOSE', lat: 19.35001, lng: -99.63002 },
    { nombre: 'Otra Vet', lat: 19.36, lng: -99.64 },
  ];
  assert.equal(deduplicarVets(lista).length, 2);
});

test('deduplicarVets: conserva vet distintos y descarta coordenadas inválidas', () => {
  const lista = [
    { nombre: 'Vet A', lat: 19.35, lng: -99.63 },
    { nombre: 'Vet A', lat: 19.45, lng: -99.73 },
    { nombre: 'Sin ubicación', lat: 'abc', lng: -99.63 },
    { nombre: 'Sin longitud' },
  ];
  const resultado = deduplicarVets(lista);
  assert.equal(resultado.length, 2);
  assert.deepEqual(resultado.map((v) => v.nombre), ['Vet A', 'Vet A']);
});
