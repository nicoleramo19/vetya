/**
 * QR de emergencia.
 * Se genera en el propio navegador con la librería LOCAL (/vendor/qrcode-generator.js),
 * así que funciona sin conexión y sin depender de ningún CDN.
 * Si la librería no está disponible, se devuelve false y la app ofrece
 * compartir el texto de la ficha.
 */

const RUTA_LIB = '/vendor/qrcode-generator.js';
let cargando = null;

function cargarLibreria() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  if (cargando) return cargando;
  cargando = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = RUTA_LIB;
    s.onload = () => (window.qrcode ? resolve(window.qrcode) : reject(new Error('sin_qr')));
    s.onerror = () => reject(new Error('sin_qr'));
    document.head.appendChild(s);
  });
  return cargando;
}

/** Pinta el QR en un <canvas>. Devuelve true si lo logró. */
export async function pintarQR(canvas, texto, { tamano = 240, margen = 2 } = {}) {
  try {
    const qrcode = await cargarLibreria();
    // typeNumber 0 = la librería elige el tamaño mínimo que quepa en el texto.
    // 'M' = corrección de errores media (buen equilibrio, admite el logo del centro).
    const qr = qrcode(0, 'M');
    qr.addData(texto);
    qr.make();

    const modulos = qr.getModuleCount();
    const escala = Math.max(1, Math.round(tamano / (modulos + margen * 2)));
    const lado = (modulos + margen * 2) * escala;

    canvas.width = lado;
    canvas.height = lado;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, lado, lado);
    ctx.fillStyle = '#0b2545';
    for (let fila = 0; fila < modulos; fila += 1) {
      for (let col = 0; col < modulos; col += 1) {
        if (qr.isDark(fila, col)) {
          ctx.fillRect((col + margen) * escala, (fila + margen) * escala, escala, escala);
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}

/** Descarga el canvas como imagen PNG. */
export function descargarCanvas(canvas, nombre = 'vetya-emergencia.png') {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = nombre;
  a.click();
}

/** Comparte el texto (Web Share API) o lo copia al portapapeles. */
export async function compartirTexto(texto, titulo = 'Ficha de emergencia') {
  if (navigator.share) {
    try {
      await navigator.share({ title: titulo, text: texto });
      return 'compartido';
    } catch {
      /* el usuario canceló */
    }
  }
  try {
    await navigator.clipboard.writeText(texto);
    return 'copiado';
  } catch {
    return 'error';
  }
}
