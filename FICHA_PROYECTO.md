# VetYa — Ficha del proyecto

> Texto listo para copiar en la misma estructura de la captura.

## OBJETIVO

VetYa es una línea de ayuda para dueños de mascotas que orienta en urgencias, **sin sustituir una consulta veterinaria**. Responde tres preguntas en menos de un minuto: **¿es una urgencia real?** (triaje determinista verde/amarillo/rojo), **¿qué hago mientras tanto?** (pasos concretos y seguros, sin dosis ni diagnósticos) y **¿a dónde acudo?** (veterinarias cercanas en un mapa). Incluye ficha de mascotas con historial, QR de emergencia que abre una ficha pública con botones de llamada, chat de orientación con IA subordinada al protocolo y accesibilidad (alto contraste, tamaño de fuente, lectura en voz alta y dictado).

## TECNOLOGÍAS IMPLEMENTADAS

Node.js 18+ · Express 4 · dotenv · JavaScript ES Modules

HTML5 semántico · CSS3 (Grid/Flexbox) · SVG propio · PWA (Service Worker + manifest)

Leaflet · OpenStreetMap · Overpass API · Nominatim · OSRM

Supabase (PostgreSQL + Auth + Row Level Security)

Groq API (`openai/gpt-oss-120b`) · Canvas + qrcode-generator

localStorage · node:test · Render · GitHub Pages

> No se implementaron React, TypeScript, Vite, PHP, MariaDB ni JWT. La rúbrica permite la rama backend y/o React; VetYa eligió backend.

## COSTO PROMEDIO (DESARROLLO Y PUBLICACIÓN)

**$0.00 MXN en servicios.** Render, GitHub Pages, Supabase, Groq y OpenStreetMap se usan en sus capas gratuitas; no hay licencias ni hosting pagado. El costo real fue el tiempo de desarrollo del equipo.

## IA DE APOYO

OpenCode (agente Big Pickle) para desarrollo, documentación y pruebas · Groq (`openai/gpt-oss-120b`) como capa de lenguaje dentro de la app.

**La IA no decide la urgencia:** el nivel verde/amarillo/rojo lo calcula el motor determinista `triage.js`; el modelo solo lo explica en español claro.

## SITIO WEB

App completa (backend): https://vetya-umie.onrender.com  
Versión estática siempre al día: https://nicoleramo19.github.io/vetya/public/index.html  
Generador de QR: https://nicoleramo19.github.io/vetya/public/qr.html  
Repositorio: https://github.com/nicoleramo19/vetya

> Si Render sigue sirviendo la versión anterior: Render → servicio `vetya` → **Manual Deploy → Deploy latest commit**.

## MANUAL TÉCNICO (PDF)

- Descargar / ver manual: https://github.com/nicoleramo19/vetya/blob/main/MANUAL_TECNICO.md
- Guion de defensa oral: https://github.com/nicoleramo19/vetya/blob/main/GUION_DEFENSA.md
