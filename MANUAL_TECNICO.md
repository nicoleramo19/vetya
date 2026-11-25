# VetYa — Manual técnico completo

> Documento de referencia para desarrollo, despliegue y defensa del proyecto.
> Última actualización: 25 de noviembre de 2026.
> Commit final de esta sesión: `5039f78d338b3d59f6566b73d356b74bec49ce4a`.

---

## 0. Ficha rápida

| Campo | Valor |
|---|---|
| Nombre | VetYa · Línea de ayuda para dueños de mascotas |
| Versión | `0.1.0` |
| Tipo | Proyecto FullStack (frontend + backend + base de datos) |
| Propósito | Orientar en urgencias de mascotas: **¿es urgente?, ¿qué hago?, ¿a dónde acudo?** |
| Límite ético | **No diagnostica, no receta y no sustituye una consulta veterinaria.** |
| Repositorio | `https://github.com/nicoleramo19/vetya` |
| Rama | `main` |
| Backend / app completa | `https://vetya-umie.onrender.com` |
| App estática (siempre al día) | `https://nicoleramo19.github.io/vetya/public/index.html` |
| Generador de QR público | `https://nicoleramo19.github.io/vetya/public/qr.html` |
| Ficha pública del QR | `https://nicoleramo19.github.io/vetya/public/ficha.html#<datos>` |
| Proyecto Supabase | `sawrpldfxdpekkkwnryo` · `https://sawrpldfxdpekkkwnryo.supabase.co` |
| Node requerido | `>=18` (probado con Node 26) |
| Pruebas | `24/24` con `node:test` |

### Cosas que **NO** hay que decir que existen

- No hay React, hooks ni React Router. La rúbrica permite la rama **backend y/o React**; este proyecto eligió backend.
- No hay cartilla de vacunas.
- No hay exportación `.ics` ni recordatorios automáticos.
- No hay UI de reseñas de veterinarias (la tabla y las funciones de Supabase sí existen, pero no están conectadas a la interfaz).
- El service worker está pensado para servirse desde la raíz (Render); en GitHub Pages puede no activarse.

---

## 1. Alcance funcional

VetYa resuelve tres preguntas en menos de un minuto:

1. **¿Es una urgencia real?** → motor determinista con tres niveles: verde, amarillo y rojo.
2. **¿Qué hago mientras tanto?** → pasos concretos y seguros, sin dosis ni diagnósticos.
3. **¿A dónde acudo?** → mapa con veterinarias cercanas usando OpenStreetMap.

Funciones adicionales:

- Ficha de mascotas con historial local y sincronización opcional con Supabase.
- QR de emergencia que abre una ficha pública con botones de llamada.
- Chat de orientación con IA (Groq) que **explica**, nunca decide.
- Directorio de veterinarias: OpenStreetMap + alta manual + datos de la comunidad.
- Accesibilidad: alto contraste, tamaño de fuente, lectura en voz alta y dictado.
- PWA: caché offline de la app y los protocolos en el servidor raíz.

### Niveles de urgencia

| Nivel | Código | Etiqueta | Significado |
|---|---|---|---|
| `rojo` | `CRÍTICO` | `CORRE AHORA` | Atención veterinaria inmediata |
| `amarillo` | `PRECAUCIÓN` | `ATIENDE HOY` | Consulta hoy mismo; si empeora, acude ya |
| `verde` | `LEVE` | `PUEDE ESPERAR` | Vigilar y agenda cita si no mejora |

### Volumen de la base de conocimiento

- **23 síntomas** con preguntas de seguimiento, motivos y pasos.
- **16 tóxicos** por especie con alias de detección.
- **9 banderas rojas** en el checklist «¿Corro o espero?».

---

## 2. Arquitectura general

```text
                         NAVEGADOR
   ┌───────────────────────────────────────────────────────────┐
   │ index.html  (8 vistas + SVG sprite + accesibilidad)       │
   │ styles.css  (Grid/Flexbox, contraste, 1 breakpoint)       │
   │                                                           │
   │ app.js  ── controlador: estado, eventos, localStorage     │
   │   ├── triage.js + data/protocols.js  → MOTOR DETERMINISTA │
   │   ├── pets.js + qr.js                → ficha + QR         │
   │   ├── ficha.html                     → destino del QR     │
   │   ├── map.js  → Leaflet / Overpass / Nominatim / OSRM     │
   │   ├── chat.js → redactor local + /api/chat               │
   │   └── supabase.js → Auth + Postgres + RLS                │
   │ sw.js → caché offline (network-first)                     │
   └───────────────────────────────────────────────────────────┘
                 │                          │
        GET /api/config              POST /api/chat
                 │                          │
            ┌────▼──────────────────────────▼────┐
            │ Express (server/index.js)          │
            │  · trust proxy                     │
            │  · rate limiter 20/min/IP          │
            │  · Groq solo como capa de lenguaje │
            └────────────────┬───────────────────┘
                             │
                    Supabase (Postgres + Auth + RLS)
```

**Regla de oro:** la IA nunca calcula el nivel de urgencia. `triage.js` lo calcula con reglas fijas; el modelo recibe ese resultado y solo lo explica en español claro.

---

## 3. Estructura de archivos

```text
vetya/
├── package.json                  dependencias y scripts
├── package-lock.json
├── .env.example                  plantilla de variables de entorno
├── .gitignore                    ignora node_modules, .env, .DS_Store, logs
├── README.md                     resumen del proyecto
├── GUION_DEFENSA.md              guion de defensa oral (5½ min)
├── MANUAL_TECNICO.md             este documento
├── server/
│   └── index.js                  API Express + archivos estáticos
├── public/
│   ├── index.html                aplicación principal
│   ├── ficha.html                destino público del QR
│   ├── qr.html                   generador público de QR
│   ├── manifest.webmanifest      PWA
│   ├── sw.js                     service worker
│   ├── assets/icon.svg           icono
│   ├── css/styles.css            estilos
│   ├── js/
│   │   ├── app.js                controlador principal
│   │   ├── triage.js             motor determinista
│   │   ├── pets.js               fichas + payload del QR
│   │   ├── qr.js                 dibujo del QR en canvas
│   │   ├── chat.js               capa de lenguaje / fallback local
│   │   ├── map.js                mapa y geografía
│   │   ├── supabase.js           auth + sincronización
│   │   └── data/protocols.js     base de conocimiento
│   └── vendor/                   librerías locales (sin CDN)
│       ├── leaflet.js / leaflet.css
│       ├── qrcode-generator.js
│       └── supabase.js
├── supabase/
│   ├── schema.sql                tablas + RLS
│   └── migration_contacto.sql    columnas de contacto
└── test/
    ├── triage.test.js            18 pruebas del motor
    └── extras.test.js             6 pruebas de QR y mapa
```

---

## 4. Instalación y ejecución

### 4.1 Requisitos

- Node.js 18 o superior.
- npm.
- Opcional: cuenta de Groq y de Supabase para activar IA y nube.

### 4.2 Pasos

```bash
cd vetya
npm install
cp .env.example .env     # editar con tus claves (o dejar vacío para modo local)
npm start                # sirve en http://localhost:3000 (o el PORT de .env)
npm test                 # 24 pruebas
```

Para desarrollo con recarga automática:

```bash
npm run dev
```

> En la máquina de trabajo el archivo `.env` define `PORT=4331`, por eso el servidor local responde en `http://localhost:4331`. El valor por defecto del código es `3000`.

### 4.3 Scripts (`package.json`)

| Script | Comando | Uso |
|---|---|---|
| `start` | `node server/index.js` | Producción / local |
| `dev` | `node --watch server/index.js` | Desarrollo |
| `test` | `node --test` | Pruebas sin dependencias nuevas |

### 4.4 Dependencias

Solo dos dependencias de producción:

- `express ^4.19.2`
- `dotenv ^16.4.5`

Las pruebas usan `node:test`, incluido en Node. Las librerías de frontend (Leaflet, qrcode-generator y Supabase JS) están **vendorizadas** en `public/vendor/`, así que no se depende de CDNs.

---

## 5. Variables de entorno

Archivo: `.env` (ignorado por Git). Plantilla: `.env.example`.

| Variable | Obligatoria | Efecto si está vacía |
|---|---|---|
| `PORT` | No | Usa `3000` |
| `GROQ_API_KEY` | No | `/api/chat` responde `503 sin_ia`; el chat usa el redactor local |
| `GROQ_MODEL` | No | Usa `openai/gpt-oss-120b` |
| `SUPABASE_URL` | No | Modo local: datos en `localStorage`, sin cuentas |
| `SUPABASE_ANON_KEY` | No | Igual que arriba |

La anon key de Supabase es pública por diseño; la seguridad real está en las policies de RLS. La clave de Groq **nunca** se envía al navegador.

---

## 6. Backend — `server/index.js`

### 6.1 Configuración general

- `dotenv.config()` carga `.env`.
- `app.set('trust proxy', 1)` para que Render no rompa el rate limiter (el balanceador cambia la IP).
- `express.json({ limit: '256kb' })`.
- `express.static(public/)` sirve todo el frontend.

### 6.2 `GET /api/config`

Devuelve configuración pública al navegador.

```json
{
  "supabaseUrl": "https://...supabase.co",
  "supabaseAnonKey": "eyJ...",
  "chatEnabled": true
}
```

- `Cache-Control: no-store` para que un cambio de claves se vea de inmediato.
- `chatEnabled` es `Boolean(process.env.GROQ_API_KEY)`.
- Si faltan las llaves de Supabase, los campos llegan vacíos y la app sigue en modo local.

### 6.3 `POST /api/chat`

Cuerpo:

```json
{
  "mensajes": [{ "role": "user", "content": "Mi perro vomitó dos veces" }],
  "contexto": {
    "mascota": { "nombre": "Paprika", "especie": "gato", "alergias": "pollo" },
    "triaje": { "nivel": "amarillo", "motivos": ["..."], "pasos": ["..."] }
  }
}
```

Respuesta correcta:

```json
{ "respuesta": "Texto en español claro, máximo 120 palabras." }
```

Errores:

| Código | Respuesta | Causa |
|---|---|---|
| `503` | `{ "error": "sin_ia" }` | No hay `GROQ_API_KEY` |
| `429` | `{ "error": "demasiadas_peticiones" }` | Más de 20 peticiones/minuto por IP |
| `502` | `{ "error": "ia_no_disponible" }` | Groq falló o devolvió error |

Llamada a Groq:

- Endpoint: `https://api.groq.com/openai/v1/chat/completions`.
- Modelo: `process.env.GROQ_MODEL || 'openai/gpt-oss-120b'`.
- `temperature: 0.3`, `max_tokens: 400`.
- Se envían como máximo los últimos 10 mensajes.

Reglas del prompt del sistema:

1. No diagnostica.
2. No recomienda medicamentos, dosis ni inducir el vómito.
3. No cambia la urgencia: si el protocolo dio rojo, jamás decir que puede esperar.
4. Siempre invita a acudir al veterinario.
5. Si falta información, hace 1 o 2 preguntas cortas.
6. Usa la ficha (edad, peso, condiciones, medicamentos, alergias) cuando sea relevante.

### 6.4 Rate limiter en memoria

- Ventana: 60 000 ms.
- Límite: 20 peticiones por IP.
- `Map<ip, timestamps[]>`.
- Cada 200 peticiones se barren las entradas vencidas para evitar fuga de memoria (bug corregido).

### 6.5 `fichaMascota()`

Convierte la ficha local en texto para el prompt. Incluye nombre, especie, raza, edad (calculada desde `nacimiento` o campo `edad`), peso, sexo, esterilizado, condiciones, medicamentos, alergias, notas y veterinario con teléfono.

---

## 7. Frontend

### 7.1 `index.html`

Vistas (clase `.vista`, navegación por `data-vista`):

| Vista | id | Función |
|---|---|---|
| Urgencia | `vista-inicio` | Selector de 23 síntomas agrupados por nivel |
| Detalle | `vista-sintoma` | Preguntas de seguimiento + texto libre + dictado |
| Checklist | `vista-check` | 9 banderas rojas |
| Resultado | `vista-resultado` | Nivel, motivos, pasos y aviso legal |
| Veterinarias | `vista-vets` | Mapa, lista, ubicación y alta manual |
| Mi mascota | `vista-mascota` | Ficha, QR, historial y botones de descarga/compartir |
| Chat | `vista-chat` | Conversación con IA o redactor local |
| Mi cuenta | `vista-cuenta` | Registro / ingreso / salida de Supabase |

Accesibilidad incluida:

- Enlace «Saltar al contenido».
- HTML semántico (`header`, `nav`, `main`, `section`, `footer`).
- `aria-live`, `aria-pressed`, `role="status"`.
- Sprite SVG propio (sin emojis).
- Alto contraste, fuente de 14 a 28 px, lectura en voz alta (`es-MX`) y dictado (Chrome).

### 7.2 `app.js` — controlador

Estado en memoria:

```js
{
  sintomas, respuestas, resultado, voz, config,
  sesion, mascota, mapaListo, origenMapa, historialChat
}
```

Claves de `localStorage`:

| Clave | Contenido |
|---|---|
| `vetya.mascotas` | Arreglo de fichas |
| `vetya.mascotaActiva` | id de la mascota activa |
| `vetya.historial` | Últimas 60 evaluaciones |
| `vetya.prefs` | Fuente, contraste y voz |
| `vetya.vets` | Veterinarias agregadas a mano |

Responsabilidades principales:

- `pintarSintomas()` / `pintarSintomaDetalle()` / `alternarSintoma()`.
- `evaluarYMostrar()` → llama a `evaluar()` y guarda en historial.
- `pintarChecklist()` / `evaluarCheck()` → llama a `evaluarChecklist()`.
- `prepararMapa()` / `buscarCercaDe()` / `pintarListaVets()`.
- `cargarMascotaActiva()` / `pintarQR()` / `pintarHistorial()`.
- `enviarChat()` → `Chat.responder()`.
- `actualizarCuenta()` / `sincronizarDesdeNube()` → Supabase.
- Registro del service worker con `new URL('../sw.js', import.meta.url)`.

### 7.3 `protocols.js` — base de conocimiento

Exporta:

- `NIVELES` (`verde:0, amarillo:1, rojo:2`).
- `NIVEL_INFO` (código, etiqueta, resumen, color, sección).
- `BANDERAS_ROJAS` (9).
- `TOXICOS` (16, con `especies`, `nivel`, `nota` y `alias`).
- `SINTOMAS` (23, con `nivel`, `motivos`, `pasos`, `preguntas` opcionales y filtro por especie).
- `CONTACTOS_EMERGENCIA`.

### 7.4 `triage.js` — motor determinista

Funciones exportadas:

- `normalizar(texto)` → minúsculas sin acentos.
- `detectarToxicos(texto, especie)`.
- `edadEnAnios(nacimiento)`.
- `evaluar({ sintomas, respuestas, mascota, texto })`.
- `evaluarChecklist(respuestas)`.

Algoritmo de `evaluar()`:

1. Síntomas seleccionados; cada respuesta de seguimiento con `delta > 0` sube el nivel (`verde→amarillo→rojo`).
2. Tóxicos detectados en texto libre o seleccionados: son bandera roja dura; los rojos añaden un paso de emergencia al inicio.
3. Modificadores de ficha:
   - cachorro (<1 año) o adulto mayor (≥8 años) con nivel verde → amarillo;
   - condición crónica → sube un nivel (salvo que ya sea rojo);
   - medicamentos → añade aviso de interacciones.
4. Sin información suficiente → amarillo por criterio conservador.
5. Pasos únicos, máximo 5, más el recordatorio universal de no sustituir la consulta.

Detección de tóxicos:

- Límites de palabra `(^|[^a-z0-9])palabras?([^a-z0-9]|$)` para evitar `debajo → ajo` o `ronronea → ron`.
- Alias ambiguos (`pasa`, `vino`, `pila`, `moneda`, `ron`) solo cuentan si hay verbo de ingestión.
- Filtro por especie: `lirio` solo para gatos; especie desconocida consulta todas las listas.

### 7.5 `pets.js` — fichas y QR

Funciones: `listar`, `guardar`, `eliminar`, `fusionar`, `activar`, `obtenerActivaId`, `obtenerActiva`, `textoDeEmergencia`, `textoParaQR`.

`textoDeEmergencia()` produce el texto legible completo (nombre, raza, peso, condiciones, alergias, medicamentos, veterinario, teléfono del veterinario, contacto del dueño). Se usa para **compartir/copiar**.

`textoParaQR()` produce la URL del QR:

```text
https://nicoleramo19.github.io/vetya/public/ficha.html#<base64url>
```

Proceso interno:

1. Construye objeto con claves cortas: `n` (nombre), `e` (especie), `r` (raza), `c` (condiciones), `a` (alergias), `m` (medicamentos), `v` (veterinario), `tv` (teléfono vet), `cd` (contacto dueño).
2. Recorta textos a 60 caracteres (`tv` a 30, `cd` a 40) y elimina claves vacías.
3. `JSON.stringify` → `TextEncoder` → `btoa` → base64url (`+`→`-`, `/`→`_`, sin `=`).
4. Los datos van en el fragmento `#`, por lo que **no se envían al servidor**.

> ¿Por qué una URL y no texto plano? Los lectores de cámara de iOS/Android interpretan los números como teléfono y muestran «Llamar», o convierten el texto en una búsqueda de Google. Con una URL se abre la ficha completa en el navegador y los teléfonos quedan como botones dentro de la página.

### 7.6 `qr.js` — dibujo del QR

- Carga `../vendor/qrcode-generator.js` relativo al módulo (`import.meta.url`).Funciona en Render (`/js/qr.js → /vendor/...`) y en Pages (`/vetya/public/js/qr.js → /vetya/public/vendor/...`).
- `qrcode(0, 'M')`: la librería elige el tamaño mínimo; corrección media.
- Zona silenciosa de **4 módulos** (exigida por el estándar).
- `tamano = 360` por defecto; escala mínima de 4 px por módulo.
- Canvas con tamaño intrínseco e inline style iguales: el CSS no reescala los módulos.
- Fondo blanco y módulos `#0b2545`.
- `descargarCanvas()` genera PNG; `compartirTexto()` usa Web Share API o portapapeles.

### 7.7 `ficha.html` — destino público

- Página autónoma, sin dependencias externas.
- Decodifica el fragmento `#` con `atob` + `TextDecoder`.
- Escapa todo HTML antes de insertarlo (protección XSS).
- Muestra todos los campos existentes y hasta dos botones:
  - `tel:<telefonoVet>` → «Llamar al veterinario».
  - `tel:<contactoDueno>` → «Llamar al dueño».
- Aviso final: orienta, no sustituye consulta.

### 7.8 `qr.html` — generador público

Formulario independiente con los mismos campos de la ficha. Al enviar:

1. `textoParaQR()` genera la URL.
2. `pintarQR()` dibuja el canvas (345–360 px según contenido).
3. Muestra la URL, enlace «Abrir ficha generada» y botón «Descargar PNG».

No necesita backend. Es la forma más rápida de generar un QR si Render no está desplegado.

### 7.9 `map.js` — geografía

- Leaflet + tiles de OpenStreetMap.
- Geolocalización del navegador (requiere HTTPS o localhost), con reintento sin alta precisión.
- Geocodificación: Nominatim (acepta también `lat, lng` escritos directamente).
- Búsqueda: Overpass con dos endpoints y fallback (`overpass-api.de`, `overpass.kumi.systems`).
- Distancia: fórmula de Haversine.
- Ruta: OSRM; si falla, estimación en línea recta a 40 km/h.
- `deduplicarVets()`: clave = nombre normalizado (sin acentos ni signos) + lat/lng a 4 decimales (~11 m).
- `escaparHtml()` en popups para evitar XSS con nombres aportados por la comunidad.
- Veterinarias locales en `localStorage` y, si hay sesión, `upsert` a Supabase.

### 7.10 `chat.js`

- `obtenerConfig()` consulta `/api/config`, salvo en `*.github.io`, donde devuelve `{ chatEnabled:false }` para evitar 404 en consola.
- `redactarLocal()` convierte el resultado del triaje en texto con motivos y pasos.
- `responder()` usa IA si `chatEnabled`; si falla, vuelve al redactor local. Nunca rompe la experiencia.

### 7.11 `supabase.js`

- `iniciar()` lee `/api/config`; si no hay claves o estamos en GitHub Pages, queda en modo local.
- Auth: `signUp` con `emailRedirectTo: window.location.origin`, `signInWithPassword`, `signOut`, `onAuthStateChange`.
- `guardarMascota()` → `upsert` en `pets`.
- `traerMascotas()` → `select *` ordenado por `creado_en`.
- `registrarTriaje()` → `insert` en `triage_logs`.
- `guardarVet()` / `traerVets()` → tabla `vets`.
- `enviarResena()` / `traerResenas()` → tabla `vet_reviews` (funciones listas; **sin UI conectada**).

**Pendiente conocido:** `mascotaAFila()` y `filaAMascota()` aún no mapean `veterinario`, `telefono_vet` ni `contacto_dueno`. El SQL para crear esas columnas existe en `supabase/migration_contacto.sql`, pero hay que ejecutarlo y después añadir el mapeo. Si se activa el mapeo sin ejecutar la migración, la sincronización falla.

### 7.12 `sw.js` — service worker

- Caché: `vetya-v10`.
- Estrategia **network-first**: pide a la red y guarda copia; si no hay red, sirve desde caché.
- `/api/*` nunca se cachea.
- Archivos precargados: `/`, `/index.html`, `/ficha.html`, `/qr.html`, CSS, manifiesto, icono, vendors y todos los módulos JS.
- Las rutas son absolutas, por lo que está pensado para servirse desde la raíz (Render). En GitHub Pages puede no activarse; la app sigue funcionando en línea.

---

## 8. Base de datos Supabase

Archivo: `supabase/schema.sql` (ejecutable varias veces).

### 8.1 Tablas

| Tabla | Columnas principales | FK |
|---|---|---|
| `pets` | `id`, `owner_id`, `nombre`, `especie`, `raza`, `nacimiento`, `peso_kg`, `sexo`, `esterilizado`, `condiciones`, `medicamentos`, `alergias`, `notas`, `veterinario`, `telefono_vet`, `contacto_dueno`, `creado_en`, `actualizado_en` | `auth.users(id)` |
| `triage_logs` | `id`, `pet_id`, `owner_id`, `nivel`, `motivos[]`, `pasos[]`, `detalle`, `creado_en` | `pets(id)`, `auth.users(id)` |
| `vets` | `id`, `nombre`, `telefono`, `direccion`, `lat`, `lng`, `abierto_24h`, `verificado`, `servicios`, `creado_por`, `creado_en` | `auth.users(id)` |
| `vet_reviews` | `id`, `vet_id`, `user_id`, `estrellas` (1–5), `urgencia_atendida`, `comentario`, `creado_en`, `unique(vet_id,user_id)` | `vets(id)`, `auth.users(id)` |

### 8.2 Row Level Security

| Tabla | Política |
|---|---|
| `pets` | `auth.uid() = owner_id` para todo |
| `triage_logs` | `auth.uid() = owner_id` para todo |
| `vets` | lectura pública; inserción solo con sesión; edición solo de `creado_por` |
| `vet_reviews` | lectura pública; escritura solo con `auth.uid() = user_id` |

Índices: `pets_owner_idx`, `triage_pet_idx`, `triage_owner_idx`, `resenas_vet_idx`.

### 8.3 Migración de contacto

`supabase/migration_contacto.sql` añade `veterinario`, `telefono_vet` y `contacto_dueno` a `pets` con `IF NOT EXISTS`. El esquema base ya los incluye; la migración es para bases creadas antes de ese cambio.

### 8.4 Paso para activar la sincronización de contacto

1. Pegar `supabase/migration_contacto.sql` en Supabase → SQL Editor → Run.
2. Añadir los tres campos en `mascotaAFila()` y `filaAMascota()` de `public/js/supabase.js`.
3. Ejecutar `npm test` y probar guardar/traer una ficha con sesión.
4. Subir el cambio y desplegar.

---

## 9. Flujo completo del QR (end-to-end)

```text
Usuario guarda ficha en "Mi mascota"
        │
        ▼
app.js → Mascotas.guardar() → localStorage (+ Supabase si hay sesión)
        │
        ▼
cargarMascotaActiva() → pintarQR()
        │
        ▼
Mascotas.textoParaQR(m)
   JSON {n,e,r,c,a,m,v,tv,cd} → TextEncoder → btoa → base64url
        │
        ▼
https://nicoleramo19.github.io/vetya/public/ficha.html#<base64url>
        │
        ▼
QR.pintarQR(canvas, url)  → librería local, margen 4, 360 px
        │
        ▼
Descargar PNG / compartir
        │
        ▼
Otra persona escanea con su celular
        │
        ▼
Se abre ficha.html → decodifica # → muestra ficha + botones tel:
```

**Privacidad:** los datos viajan en el fragmento `#`, que el navegador no envía en la petición HTTP. Cualquier persona con el QR puede leerlos; esa es la intención de una tarjeta de emergencia.

**Correcciones aplicadas al QR durante la sesión:**

- Zona silenciosa de 2 → 4 módulos.
- Payload de texto plano → URL de ficha (evita «Llamar» y búsqueda de Google).
- Tamaño 320 → 360 px y estilo inline igual al canvas (evita reescalado borroso).
- Ruta de librería relativa al módulo (funciona en Render y Pages).
- Campos recortados para mantener el QR escaneable.

---

## 10. Modo offline (PWA)

- `manifest.webmanifest`: nombre, colores, `display: standalone`, icono SVG, `start_url: ./`.
- `sw.js`: network-first con fallback a caché; si ni eso, sirve `/index.html`.
-Sin conexión se pueden usar: triaje, checklist, fichas locales, historial, QR y protocolos.
- Sin conexión **no** se pueden usar: chat con IA, sincronización con Supabase ni mapas (dependen de red).

---

## 11. Pruebas automatizadas

Comando: `npm test`. Resultado actual: **24/24**.

### `test/triage.test.js` (18)

1. `normalizar` quita acentos y baja a minúsculas.
2. `debajo` no dispara `ajo`.
3. `ajo` como palabra completa sí se detecta.
4. `me pasa algo` no dispara `pasa` (uvas).
5. `vino` requiere verbo de ingestión.
6. `lirio` solo para gatos.
7. Especie desconocida consulta todos los tóxicos.
8. Aguacate es amarillo, no rojo.
9. Chocolate es rojo y añade paso de emergencia.
10. Síntoma rojo manda.
11. Vómito aislado es amarillo.
12. Vómito repetido escala a rojo.
13. Condición crónica: verde → amarillo.
14. Condición crónica: amarillo → rojo.
15. Cachorro con síntoma leve escala a amarillo.
16. Sin información aplica criterio conservador.
17. Siempre incluye el aviso de no sustituir consulta.
18. Checklist: cualquier bandera roja da rojo; sin banderas da verde.

### `test/extras.test.js` (6)

1. `textoParaQR` abre la ficha completa, incluidos teléfonos.
2. Omite campos vacíos.
3. Recorta textos largos y mantiene la URL bajo 600 caracteres.
4. `textoDeEmergencia` conserva la ficha legible completa.
5. `deduplicarVets` quita repetidos aunque cambien acentos/mayúsculas.
6. `deduplicarVets` conserva vet distintos y descarta coordenadas inválidas.

---

## 12. Despliegue

### 12.1 Render (app completa con backend)

- Servicio: `vetya`.
- URL: `https://vetya-umie.onrender.com`.
- Repo: `nicoleramo19/vetya`, rama `main`.
- Build command: `npm install`.
- Start command: `npm start`.
- Variables a configurar en el dashboard: `PORT`, `GROQ_API_KEY`, `GROQ_MODEL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.

Verificación rápida:

```bash
curl -s https://vetya-umie.onrender.com/api/config
curl -s https://vetya-umie.onrender.com/js/qr.js | grep 'margen = 4'
curl -s https://vetya-umie.onrender.com/sw.js | grep 'vetya-v10'
```

Si el segundo o tercer comando no devuelve nada, Render sigue sirviendo código antiguo:

> Render → servicio `vetya` → **Manual Deploy** → **Deploy latest commit**.
> Revisar también Settings → Build & Deploy → Auto Deploy = On y branch = `main`.

### 12.2 GitHub Pages (frontend estático siempre actualizado)

- Activado con: `POST /repos/nicoleramo19/vetya/pages`, source `main` → `/`.
- URL base: `https://nicoleramo19.github.io/vetya/`.
- Como los archivos están en `public/`, las rutas reales incluyen `/public/`:
  - App: `https://nicoleramo19.github.io/vetya/public/index.html`
  - QR: `https://nicoleramo19.github.io/vetya/public/qr.html`
  - Ficha: `https://nicoleramo19.github.io/vetya/public/ficha.html#...`
- Cada push a `main` regenera el sitio en ~1–2 min.
- No hay backend: `/api/config` y `/api/chat` no existen; el código ya detecta `*.github.io` y usa modo local.

### 12.3 Comparación

| Característica | Render | GitHub Pages |
|---|---|---|
| CPU / API Express | Sí | No |
| Chat con Groq | Sí | No (redactor local) |
| Supabase | Sí | No (modo local) |
| Siempre al día con `main` | Solo si Auto Deploy funciona | Sí |
| QR y ficha pública | Sí tras deploy | Sí ya |

### 12.4 Estado al cierre de esta sesión

- GitHub: commit `5039f78d33` en `main`.
- GitHub Pages: sirve la versión final verificada (app, ficha y generador).
- Render: en la última comprobación seguía sirviendo el commit anterior; necesita **Manual Deploy** para igualar a GitHub.

---

## 13. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| El QR abre el marcador en vez de la ficha | QR viejo con teléfono en texto plano | Generar uno nuevo desde `qr.html` o desplegar el código final |
| El QR manda a Google | Texto plano interpretado como búsqueda | Usar el QR con URL de `ficha.html` |
| El QR no se lee | Poco margen o módulos pequeños | Usar versión actual (margen 4, 360 px) y descargar PNG |
| Render sigue viejo | Auto Deploy desactivado / webhook caído | Manual Deploy en Render |
| Consola muestra `/api/config 404` en Pages | Intento de llamar al backend inexistente | Ya corregido para `*.github.io`; recargar sin caché |
| El mapa no carga | Sin internet o Overpass caído | Hay segundo endpoint; revisar conexión |
| La ubicación no funciona | Falta HTTPS o permiso | Usar HTTPS/localhost y aceptar permiso |
| El chat no usa IA | Falta `GROQ_API_KEY` o se excedió el límite | Revisar `.env`; el chat sigue en modo plantillas |
| Las fichas no sincronizan | Sin sesión o faltan columnas | Iniciar sesión y ejecutar `migration_contacto.sql` |
| Cambios que no se ven | Service worker con caché anterior | Recarga forzada; el caché se llama `vetya-v10` |

---

## 14. Seguridad

- Clave de Groq solo en servidor; nunca en el navegador.
- Anon key de Supabase pública, protegida por RLS.
- Escape HTML en popups del mapa y en `ficha.html`.
- `express.json` limitado a 256 kb.
- Rate limiter de 20 peticiones/minuto por IP.
- `trust proxy` para IP correcta detrás de Render.
- Datos del QR en fragmento `#`, no en el servidor.
- `.env` ignorado por Git.

> Durante esta sesión se usó un token clásico de GitHub con permiso `public_repo` para subir los commits por API (no había `git`/Xcode CLT disponible). La copia local del token fue eliminada. **Recomendación: revocarlo en `https://github.com/settings/tokens` si ya no se usará.**

---

## 15. Historial de cambios relevantes de esta sesión

| Commit | Cambio |
|---|---|
| `adf3254b3f` | QR con margen 4, 24 tests, README, `trust proxy`, limpieza del rate limiter, dedupe de vets |
| `7493b515cb` | QR sin números que dispararan «Llamar» |
| `2cc21396f6` | Página `ficha.html` y QR como URL con datos codificados |
| `637794cac4` | Ajuste de la URL pública de la ficha |
| `1f325a0348` | Generador público `qr.html` y ruta de librería relativa |
| `3863defa2d` | Rutas relativas en `index.html` para GitHub Pages + service worker relativo |
| `5039f78d33` | Evita llamadas al API en GitHub Pages |

---

## 16. Estado honesto frente a la rúbrica

| Criterio | Estado |
|---|---|
| Funcionalidad | Implementada y probada; pendiente la sincronización de campos de contacto |
| Integración de temas | Rama backend completa; ítems de React marcados como NO |
| Aportaciones ingeniosas | Motor determinista, IA subordinada, PWA, QR, mapas, accesibilidad |
| Diseño UI/UX | Estética clínica, accesibilidad fuerte; un solo breakpoint (560 px) |
| Calidad del código | Modular, comentado, 24 tests, commits reales en GitHub |
| Defensa oral | Guion en `GUION_DEFENSA.md`; depende de ensayo |

---

## 17. Comandos de referencia rápida

```bash
# Local
npm install
cp .env.example .env
npm start
npm test

# Verificación pública
curl -s https://vetya-umie.onrender.com/api/config
curl -s https://nicoleramo19.github.io/vetya/public/js/pets.js | grep 'public/ficha.html'

# URLs clave
open https://nicoleramo19.github.io/vetya/public/index.html
open https://nicoleramo19.github.io/vetya/public/qr.html
open https://vetya-umie.onrender.com
```

---

## 18. Glosario

| Término | Significado |
|---|---|
| Triaje | Clasificación de urgencia en verde/amarillo/rojo |
| Bandera roja | Señal que por sí sola implica urgencia inmediata |
| Tóxico | Sustancia peligrosa para una especie específica |
| RLS | Row Level Security: seguridad por fila en PostgreSQL |
| PWA | Progressive Web App: funciona sin conexión |
| Overpass | API de OpenStreetMap para buscar puntos de interés |
| Nominatim | Geocodificador de OpenStreetMap |
| OSRM | Motor de rutas gratuito |
| Base64url | Base64 apta para URL (`+`→`-`, `/`→`_`, sin `=`) |
| Fragmento `#` | Parte de la URL que el navegador no envía al servidor |
