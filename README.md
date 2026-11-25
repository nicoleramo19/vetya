# VetYa · Línea de ayuda para dueños de mascotas

> Orienta en urgencias, **no sustituye una consulta veterinaria**.

Sitio web desplegado en: https://vetya-umie.onrender.com  
App estática siempre al día: https://nicoleramo19.github.io/vetya/public/index.html  
Repositorio: `nicoleramo19/vetya`

Documentación completa:
- [Manual técnico](MANUAL_TECNICO.md)
- [Guion de defensa oral](GUION_DEFENSA.md)

---

## 1. ¿Qué hace?

Ante una emergencia de mascota, VetYa responde tres preguntas:

1. **¿Es una urgencia real?** → motor de triaje determinista (verde / amarillo / rojo).
2. **¿Qué hago mientras tanto?** → pasos concretos y seguros, sin dosis ni diagnósticos.
3. **¿A dónde acudo?** → directorio de veterinarias en mapa, con geolocalización.

Además: perfil de mascotas con historial, QR de ficha de emergencia, chat con IA, directorio de veterinarias con mapa y reseñas, y controles de accesibilidad (alto contraste y lectura en voz alta).

---

## 2. Arquitectura

```
  Navegador (PWA: funciona sin conexión)
  ├── HTML5 semántico + CSS Grid/Flexbox + JS ES6+ (módulos)
  ├── public/js/triage.js .......... MOTOR DETERMINISTA (decide el nivel)
  ├── public/js/data/protocols.js .. base de conocimiento (síntomas, tóxicos, pasos)
  ├── public/js/map.js ............. Leaflet + OpenStreetMap / Nominatim
  ├── public/js/supabase.js ........ Auth + Postgres + RLS
  └── public/sw.js ................. caché offline ("vetya-v10")
             │
             ├── /api/config ──► Express ──► config pública (sin secretos)
             └── /api/chat ────► Express ──► Groq (IA SOLO explica, NO clasifica)
```

### Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML5 semántico, CSS3 (Grid/Flexbox), JS ES6+ módulos, PWA |
| Backend | Node.js + Express (API REST: `/api/config`, `/api/chat`) |
| Datos | Supabase (PostgreSQL + Auth + Row Level Security) |
| IA | Groq (modelo configurable, temperatura 0.3) |
| Mapas | Leaflet + OpenStreetMap / Nominatim |
| Deploy | Render |
| Pruebas | `node:test` (sin dependencias nuevas) |

---

## 3. Decisiones técnicas (para la defensa)

| Decisión | Razón |
|---|---|
| **La IA no decide la urgencia** | Un modelo puede alucinar. El nivel lo calcula `triage.js` con reglas fijas; la IA solo lo explica con palabras claras. Es una barrera de seguridad médica. |
| **Límites de palabra en tóxicos** | Evita falsos positivos: `debajo` no debe detectar `ajo`, `ronronea` no debe detectar `ron`. Los términos ambiguos (`vino`, `pila`, `pasa`) solo cuentan si hay verbo de ingestión. |
| **Condiciones crónicas escalan el nivel** | Verde + condición → amarillo; amarillo + condición → rojo. Un animal con diabetes no puede esperar igual. |
| **Supabase con RLS** | Cada usuario solo ve **sus** mascotas y sus triajes. La anon key es pública; la seguridad real está en las policies, no en ocultar la llave. |
| **Modo degradado** | Si falta `GROQ_API_KEY` o `SUPABASE_URL`, la app sigue funcionando: el chat usa un redactor local de plantillas y los datos se guardan en `localStorage`. En una emergencia no puede depender de servicios externos. |
| **Escape HTML en popups del mapa** | Los nombres de veterinarias los puede cargar la comunidad. Sin `escaparHtml` habría XSS. |
| **Service Worker offline** | En una urgencia puede no haber señal. La app abre igual y muestra los protocolos guardados. |
| **Rate limiter en memoria** | Protege la capa gratuita de Groq (20 peticiones/minuto por IP). |

---

## 4. Cómo ejecutarlo

```bash
npm install
cp .env.example .env      # completar SUPABASE_URL, SUPABASE_ANON_KEY, GROQ_API_KEY
npm start                 # http://localhost:3000 (o el PORT de tu .env)
npm test                  # 24 pruebas (triaje, QR y directorio)
```

Sin `GROQ_API_KEY` la app funciona en **modo plantillas**; sin `SUPABASE_URL` funciona en **modo local**.

---

## 5. Pruebas automatizadas

`npm test` ejecuta 24 casos con `node:test`:

- normalización de acentos;
- falsos positivos de tóxicos (`debajo` → `ajo`, `me pasa algo` → `pasa`, términos ambiguos sin ingestión);
- detección por especie (lirio solo en gatos) y especie desconocida;
- aguacate = amarillo, chocolate = rojo;
- síntomas rojos, vómito aislado vs. repetido;
- escalado por condición crónica (verde→amarillo y amarillo→rojo) y por cachorro;
- criterio conservador sin información;
- aviso obligatorio de "NO sustituye consulta";
- checklist de banderas rojas;
- payload compacto del QR, recorte de campos largos y ficha completa intacta;
- deduplicación de veterinarias por nombre + coordenadas.

---

## 6. Guion de defensa oral (5 preguntas)

**1. ¿Cuál es el problema que resuelves y por qué tu solución es segura?**  
"Muchas personas no saben distinguir una urgencia real de un malestar pasajero y pierden tiempo. VetYa da una orientación inmediata. Es segura porque el nivel de riesgo no lo decide la IA: lo calcula un motor con reglas fijas, y siempre termina invitando a acudir con un veterinario."

**2. ¿Por qué la IA no clasifica la urgencia?**  
"Porque un modelo puede alucinar y decir 'puede esperar' ante un caso rojo. Le paso el resultado ya calculado y le pido solo que lo explique. Ni siquiera puede recomendar medicamentos ni inducir el vómito: está prohibido en su prompt."

**3. ¿Cómo evitas que un usuario vea datos de otro?**  
"Supabase con Row Level Security. Las policies exigen `auth.uid() = owner_id` en mascotas e historial. La anon key es pública por diseño; la seguridad está en la base de datos, no en el frontend."

**4. ¿Qué pasa si no hay internet o falla la IA?**  
"El Service Worker guarda la app y los protocolos en caché (`vetya-v10`), así que se puede usar sin conexión. Si Groq falla, el backend responde error y el chat cambia solo al redactor local de plantillas: el resultado del triaje no depende de la IA. También hay un límite de 20 peticiones por minuto para cuidar la capa gratuita."

**5. ¿Cómo demuestras que tu código funciona?**  
"Con 24 pruebas automatizadas (`npm test`) que cubren los parches críticos de la auditoría: falsos positivos de tóxicos, nivel del aguacate, escalado por condiciones crónicas, el QR compacto y la deduplicación de veterinarias. También verifiqué la app en escritorio y móvil y dejé la consola sin errores."

---

## 7. Estado honesto para la hoja de cotejo

- **SÍ:** HTML5 semántico, accesibilidad, CSS Grid/Flexbox, responsive, JS ES6+, DOM/eventos, Async/Fetch, APIs externas (Groq, OSM), SEO y metadatos, Node/Express, GET/POST, base de datos, deploy, seguridad básica, testing.
- **PARCIAL:** CRUD en la nube (sincronización de campos de contacto del veterinario pendiente), API REST propia (el foco está en Supabase + un endpoint de chat), Git/GitHub (el repo remoto está actualizado; esta carpeta de trabajo no tiene `.git` local).
- **NO:** React / hooks / React Router / estilos en React. El proyecto eligió la rama de backend que la propia rúbrica permite ("backend ... **y/o** React"). No se marcó SÍ sin evidencia.

**Ya corregido en esta sesión:** zona silenciosa del QR (4 módulos), payload compacto, píxeles sin reescalado, `trust proxy` para Render, fuga de memoria del rate limiter y duplicados de veterinarias.

**Pendiente conocido:** sincronizar `veterinario`/`telefono_vet`/`contacto_dueno` con Supabase. El SQL está en `supabase/migration_contacto.sql`; hay que pegarlo en el SQL Editor de Supabase antes de activar el mapeo en `supabase.js` (si no, la tabla aún no tiene esas columnas).
