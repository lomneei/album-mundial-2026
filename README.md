# Álbum 26 — Mundial 2026

App web instalable (PWA) para controlar tu álbum de láminas **Panini FIFA World Cup 2026** (980 láminas) desde el teléfono. Marca lo que tienes, lo que te falta y tus repetidas; escanea láminas por foto (OCR en el navegador) o ingresa los códigos a mano. Todo gratis, sin servidor ni base de datos: el progreso se guarda en tu dispositivo.

## Qué hace

- **Grilla de las 980 láminas** agrupadas por selección, en el orden del álbum (apertura + 48 equipos + historia mundialista).
- **Tres estados por lámina:** me falta · la tengo · repetida (con contador de copias).
- **Marcar con un toque.** Toca una lámina para alternar "la tengo"; usa los botones **+ / −** para sumar o restar repetidas.
- **Escaneo por foto (OCR).** Toma una foto de las láminas; detecta los códigos impresos (ARG17, BRA13, FWC9…), te muestra una lista para **revisar y confirmar**, y recién ahí marca. También hay un cuadro para **pegar códigos a mano** (más confiable).
- **Filtros y búsqueda:** por estado, por selección, y búsqueda por código o jugador.
- **Respaldo:** exporta/importa tu progreso como `.json` (útil para pasar de un teléfono a otro).
- **Offline:** después de la primera carga funciona sin conexión. El OCR necesita internet **solo la primera vez** (descarga el modelo de Tesseract, ~unos MB, y queda cacheado).

## Estructura

```
index.html        · estructura
styles.css        · estilos
app.js            · lógica (estado, filtros, OCR, export/import)
data.js           · las 980 láminas (editable)
manifest.json     · datos de la PWA
sw.js             · service worker (offline + instalable)
icon-*.png        · íconos
tools/            · cómo se generó data.js (no es parte de la app)
```

---

## Desplegar (elige una opción)

### Opción 1 — Vercel (la más rápida)

Sin build: es un sitio estático.

1. Entra a [vercel.com](https://vercel.com) e inicia sesión con GitHub.
2. Sube esta carpeta a un repo de GitHub (ver Opción 2, pasos 1–3) **o** usa el CLI:
   ```bash
   npm i -g vercel
   cd album26
   vercel        # responde a las preguntas; deja todo por defecto
   vercel --prod # publica la versión final
   ```
3. Vercel te da una URL `https://album26-xxxx.vercel.app`. Ábrela en el teléfono.

> No necesitas configurar framework ni comando de build: marca **"Other / No framework"** y carpeta de salida la raíz.

### Opción 2 — GitHub Pages (gratis, con tu cuenta)

1. Crea un repositorio nuevo en GitHub (ej. `album26`).
2. Sube los archivos:
   ```bash
   cd album26
   git init
   git add .
   git commit -m "Álbum 26"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/album26.git
   git push -u origin main
   ```
3. En el repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`. Guarda.
4. En 1–2 min queda en `https://TU_USUARIO.github.io/album26/`.

> Si usas GitHub Pages en un subdirectorio y algo no carga, es por rutas: este proyecto usa rutas **relativas** (`start_url: "."`), así que debería funcionar tal cual.

---

## Instalar en el teléfono (PWA)

**Android (Chrome):** abre la URL → menú **⋮** → **Agregar a la pantalla principal** (o aparece un aviso de "Instalar app").

**iPhone (Safari):** abre la URL → botón **Compartir** (cuadrado con flecha) → **Agregar a inicio**.

Queda con su ícono como una app normal y funciona offline.

---

## Editar las láminas (si tu edición difiere)

Los datos salen de un checklist público y pueden tener alguna diferencia con la edición chilena/Conmebol. Todo es editable:

- Abre **`data.js`**: es una lista de objetos `{code, name, type, foil, team, teamES, ...}`. Corrige el `name` o el `code` que necesites.
- Si quieres regenerarlo desde cero, en `tools/` está `raw.txt` (el listado en texto) y `build_data.py` (el parser):
  ```bash
  cd tools
  python3 build_data.py   # reescribe ../data.js  (mueve el archivo si hace falta)
  ```

**Tip para el OCR:** funciona mejor con fotos **planas, nítidas y bien iluminadas**, una lámina o pocas a la vez. Sobre el brillo de las foil el OCR puede fallar; para esos casos usa el cuadro de **pegar códigos a mano**.

---

## Privacidad

No hay cuentas ni servidores. Tu progreso vive en el `localStorage` de tu navegador/dispositivo. Si borras los datos del sitio o desinstalas, se pierde (por eso existe **Exportar**).
