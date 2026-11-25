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

function decodificarQR(url) {
  const parte = url.split('#')[1];
  assert.ok(parte, 'el QR debe ser una URL con datos en #');
  let base64 = parte.replace(/-/g, '+').replace(/_/g, '/');
  base64 += '='.repeat((4 - (base64.length % 4)) % 4);
  return JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
}

test('textoParaQR: abre la ficha completa, incluidos los teléfonos', () => {
  const qr = textoParaQR(mascota);
  assert.ok(qr.startsWith('https://nicoleramo19.github.io/vetya/ficha.html#'));
  const datos = decodificarQR(qr);
  assert.equal(datos.n, 'Paprika');
  assert.equal(datos.e, 'gato');
  assert.equal(datos.a, 'pollo');
  assert.equal(datos.c, 'insuficiencia renal');
  assert.equal(datos.v, 'Vet Central');
  assert.equal(datos.tv, '5512345678');
  assert.equal(datos.cd, 'Nicole 5512345678');
  assert.ok(qr.length <= 600);
});

test('textoParaQR: omite los campos vacíos', () => {
  const qr = textoParaQR({ nombre: 'Coco', especie: 'perro', veterinario: 'Vet Central' });
  const datos = decodificarQR(qr);
  assert.equal(datos.n, 'Coco');
  assert.equal(datos.v, 'Vet Central');
  assert.equal(datos.a, undefined);
  assert.equal(datos.c, undefined);
  assert.equal(datos.tv, undefined);
  assert.equal(datos.cd, undefined);
});

test('textoParaQR: recorta textos largos para que el QR siga siendo escaneable', () => {
  const qr = textoParaQR({
    nombre: 'Nombre extremadamente largo que no cabe en una tarjeta',
    especie: 'perro',
    alergias: 'una lista interminable de alimentos y medicamentos prohibidos',
  });
  const datos = decodificarQR(qr);
  assert.ok(datos.n.length <= 60);
  assert.ok(datos.a.length <= 60);
  assert.ok(qr.length <= 600);
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
