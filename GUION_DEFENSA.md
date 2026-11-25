# VetYa — Guion de defensa oral (≈5½ minutos)

> Antes de empezar: confirma que la URL pública ya sirve el código nuevo.
> Si `/js/qr.js` en Render aún no trae `margen = 4`, haz Manual Deploy en Render.

---

## 0:00 — Apertura (45 s)

**Decir:**

"Buenos días. Mi proyecto se llama **VetYa**, una línea de ayuda para dueños de mascotas en México.

El problema que ataca es muy concreto: cuando un animal se pone mal, la persona no sabe si es una urgencia real o un malestar pasajero. Pierde tiempo buscando información, y muchas veces termina improvisando remedios que pueden empeorar el cuadro.

VetYa responde tres preguntas en menos de un minuto: **¿es urgente?, ¿qué hago mientras tanto? y ¿a dónde acudo?** Con una regla clarísima: orienta, pero **no diagnostica ni sustituye una consulta veterinaria**."

**[MUESTRA: portada / pantalla de inicio de la app]**

---

## 0:45 — Demo en vivo (1 min)

**Decir:**

"Les muestro el flujo real. Elijo un síntoma —por ejemplo 'vómito con sangre'—, respondo las preguntas de seguimiento y el sistema devuelve un nivel: rojo, amarillo o verde, con motivos y pasos concretos.

Si además escribo en texto libre 'se comió chocolate', el detector de tóxicos entra como bandera roja dura y añade: 'contacta ya a una veterinaria'.

Después puedo abrir el mapa, ver la veterinaria más cercana con distancia real por carretera, y si quiero guardo la ficha de mi mascota. Esa ficha genera un **QR de emergencia** que puedo descargar o compartir: si alguien me encuentra con mi perro, escanea y ve alergias, condiciones y teléfono del veterinario."

**[MUESTRA: síntoma → resultado → mapa → ficha → QR]**

---

## 1:45 — Arquitectura (1 min 15 s)

**Decir:**

"La arquitectura tiene cuatro piezas.

El **frontend** es HTML5 semántico, CSS con Grid y Flexbox, y JavaScript ES6+ en módulos. Es una PWA: un service worker guarda la app y los protocolos en caché, así que funciona incluso sin internet —algo clave en una emergencia.

El **motor de triaje**, `triage.js`, es determinista: decide el nivel con reglas fijas a partir de síntomas, respuestas, tóxicos y datos de la mascota.

El **backend** es Node con Express. Expone dos endpoints: `/api/config` y `/api/chat`. La clave de Groq nunca llega al navegador: se usa solo del lado del servidor.

Y la **base de datos** es Supabase —PostgreSQL con Auth y Row Level Security—, donde cada usuario solo ve sus mascotas y su historial. El mapa usa Leaflet con OpenStreetMap, sin APIs de pago."

**[MUESTRA: diagrama simple o árbol de carpetas del repo]**

---

## 3:00 — La decisión más importante (1 min)

**Decir:**

"Quiero enfatizar la decisión de diseño más importante: **la inteligencia artificial no decide la urgencia**.

El modelo recibe el resultado ya calculado por el motor y solo lo explica en español claro. En el prompt tiene prohibido diagnosticar, recomendar medicamentos o dosis, inducir el vómito y contradecir el nivel rojo. Si falla Groq, el chat no se cae: cambia a un redactor local de plantillas.

¿Por qué? Porque un modelo puede alucinar. En salud, decir 'puede esperar' cuando es rojo no es aceptable. Por eso la lógica crítica es código deterministico y la IA es solo capa de lenguaje."

**[MUESTRA: `server/index.js` líneas del system prompt, o el archivo `triage.js`]**

---

## 4:00 — Calidad y pruebas (45 s)

**Decir:**

"El código está organizado en módulos, con comentarios, separación de responsabilidades y control de versiones en GitHub.

Tengo **24 pruebas automatizadas** con `node:test`. Cubren exactamente los puntos críticos: que 'debajo' no dispare 'ajo', que el aguacate sea amarillo y no rojo, que una condición crónica escale el nivel, que el QR sea compacto y que no aparezcan veterinarias duplicadas.

También corregí el rate limiter para no perder memoria, añadí `trust proxy` para Render y ajusté el QR con zona silenciosa de cuatro módulos para que lo lean los teléfonos."

**[MUESTRA: ejecutar `npm test` en vivo — 24/24]**

---

## 4:45 — Cierre (45 s)

**Decir:**

"Para terminar: VetYa es una herramienta de orientación, no un consultorio. Su valor está en tres cosas: decide con reglas auditables, explica con lenguaje claro y nunca sustituye al veterinario.

Quedo abierto a preguntas."

---

## Preguntas frecuentes (respuestas cortas)

**¿Por qué no usaste React?**  
"La rúbrica permite backend **y/o** React. Elegí Node/Express + Supabase y profundicé ahí: RLS, auth, API, deploy y seguridad. Si migrara a React, sería con componentes, hooks y Router, pero duplicar el frontend me costaría funcionalidad."

**¿Cómo evitas que un usuario vea datos de otro?**  
"Con Row Level Security: las policies exigen `auth.uid() = owner_id` en mascotas e historial. La anon key es pública por diseño; la seguridad vive en la base de datos."

**¿Qué pasa si no hay internet o falla la IA?**  
"El service worker guarda la app sin conexión. Si Groq falla, el chat usa el redactor local. El nivel de urgencia siempre lo da el motor determinista."

**¿Por qué no hay recordatorios automáticos?**  
"Porque Render duerme en plan gratuito; un cron interno no sería confiable. Queda como trabajo futuro con exportación `.ics` al calendario del usuario."

**¿Qué le falta hoy?**  
"La sincronización de los campos de contacto del veterinario con Supabase y un breakpoint explícito para tablet. Son mejoras conocidas y documentadas; no afectan el flujo principal."

---

## Versiones

- **Completa:** 5½ min, con demo en vivo.
- **Si te dan 2 min:** apertura (30 s) → decisión de la IA no decide (40 s) → `npm test` (20 s) → cierre (20 s).
