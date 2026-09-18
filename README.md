# HTML Parser

Analizador de código fuente HTML que se ejecuta 100% en el navegador (client-side). Pega o sube un archivo `.html` y obtén un desglose completo: metadatos SEO, enlaces, imágenes, tablas, formularios, scripts, conteo de etiquetas, texto plano y otros hallazgos (JSON-LD, comentarios ocultos, emails, colores).

No hay backend. No hay paso de compilación (bundling): los módulos JS se cargan nativamente en el navegador vía `<script type="module">`. Es instalable como PWA y funciona offline tras la primera visita.

## Estructura del repo

```
.
├── index.html              # estructura de la página
├── style.css               # todos los estilos (tema "blueprint")
├── manifest.json           # manifiesto PWA
├── service-worker.js       # cache offline del app shell
├── src/
│   ├── extractors.js       # lógica pura de extracción de datos (testeable)
│   ├── render.js            # convierte los datos de cada extractor en HTML
│   ├── diff.js                # compara los datos de dos análisis (modo A/B)
│   ├── diffRender.js          # convierte los diffs en HTML (añadido/eliminado/cambiado)
│   ├── app.js                  # orquestación: wiring de la UI, modos, eventos, exportación
│   └── example.js              # HTML de ejemplo (versión A y B) usado por "Cargar ejemplo"
├── test/
│   ├── extractors.test.js   # tests de los extractores con Vitest + jsdom
│   └── diff.test.js          # tests del motor de comparación
├── .github/workflows/test.yml  # CI: corre los tests en cada push/PR
├── package.json
└── vitest.config.js
```

**Por qué está separado así**: cada extractor (`extractMeta`, `extractLinks`...) es una función pura — recibe un documento DOM y devuelve datos planos, sin tocar el DOM de la página ni generar HTML. Eso es lo que permite testearlos de forma aislada. El renderizado (`render.js`) es una capa aparte que solo convierte esos datos en HTML. Añadir un módulo nuevo (por ejemplo, un analizador de accesibilidad) es: una función en `extractors.js`, un renderer en `render.js`, y una línea en `EXTRACTOR_REGISTRY`.

## Desarrollo local

```bash
npm install
npm run dev      # sirve el proyecto en http://localhost:3000
```

También puedes abrir `index.html` directamente, pero al usar módulos ES (`type="module"`) algunos navegadores requieren servirlo por HTTP en vez de `file://`.

## Tests

```bash
npm test          # corre los tests una vez
npm run test:watch  # modo watch mientras desarrollas
```

Los tests cubren los extractores principales (meta, enlaces, imágenes, encabezados, formularios, tablas, conteo de etiquetas, otros hallazgos) con casos concretos: detección de H1 duplicado, saltos de jerarquía de encabezados, imágenes sin `alt`, parseo de JSON-LD, etc. Al añadir un extractor nuevo, añade sus tests en `test/extractors.test.js` siguiendo el mismo patrón.

La GitHub Action en `.github/workflows/test.yml` corre esta misma suite en cada push y pull request, así que un cambio que rompa un extractor no llega a producción sin que lo veas antes.

## Despliegue en Cloudflare Pages

No hay build step real (los módulos se sirven tal cual como ES modules nativos del navegador).

### ⚠️ Importante sobre la estructura del repo

El zip que descargaste contiene una carpeta `hp2/` por comodidad al empaquetarlo. **Sube el CONTENIDO de esa carpeta a la raíz de tu repositorio de GitHub**, no la carpeta `hp2` en sí — si no, `index.html` quedará en `hp2/index.html` en vez de en la raíz, y Cloudflare no lo encontrará donde espera.

```bash
# Desde dentro de la carpeta descomprimida hp2/
git init
git add .
git commit -m "HTML Parser v1"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/html-parser.git
git push -u origin main
```

### Sobre el tipo de proyecto: Workers (static assets) vs. Pages clásico

Si tu proyecto en Cloudflare fue creado como **Worker con assets estáticos** (el modelo con el que Cloudflare está sustituyendo Pages) en vez de como un proyecto **Pages** clásico, necesita configuración explícita — si no, intenta ejecutar `wrangler deploy` tratando **todo el repo** como si fueran los assets a servir, lo que incluye `node_modules` (y con él, el binario de `workerd` que instala Wrangler, de más de 100 MB) y falla por tamaño.

El repo ya incluye lo necesario para este caso:
- **`wrangler.jsonc`** — declara qué carpeta servir (`.`) como assets estáticos, sin script de Worker (`main`) porque no hace falta: es un sitio puramente estático.
- **`.assetsignore`** — excluye `node_modules`, `.git`, tests y ficheros de desarrollo de lo que se sube como assets.

Si prefieres el modelo Pages clásico en vez de Workers con assets, la alternativa es borrar el proyecto actual en el dashboard de Cloudflare y crearlo de nuevo eligiendo explícitamente **Workers & Pages → Create → Pages** (no "Workers") → Connect to Git, siguiendo la configuración de la sección de abajo.

### Opción A — Conectar el repo desde el dashboard (recomendada)

1. Entra en el dashboard de Cloudflare → **Workers & Pages → Create → Pages → Connect to Git**.
2. Selecciona el repositorio `html-parser` (o el nombre que le hayas puesto).
3. Configuración de build:

   | Campo | Valor |
   |---|---|
   | Framework preset | `None` |
   | Build command | *(vacío)* |
   | Build output directory | `/` |
   | Root directory | `/` *(a menos que hayas subido el repo con la carpeta `hp2/` dentro, en cuyo caso pon `/hp2`)* |

4. No hace falta ninguna variable de entorno — no hay backend.
5. **Save and Deploy**. Cada push a `main` vuelve a desplegar automáticamente; los PRs generan un preview con su propia URL.

### Opción B — Deploy desde la CLI con Wrangler

```bash
npm install -g wrangler
wrangler login
wrangler deploy
```

Con `wrangler.jsonc` ya configurado como Worker de solo-assets, `wrangler deploy` (no `wrangler pages deploy`) es ahora el comando correcto — sube el contenido de `.` como assets estáticos, excluyendo lo listado en `.assetsignore`.

### Cabeceras (`_headers`)

El repo incluye un fichero `_headers` que Cloudflare Pages detecta automáticamente. Es importante especialmente para `service-worker.js`: fuerza `Cache-Control: no-cache` para que los usuarios reciban siempre la versión más reciente del service worker y no se queden atascados en una versión antigua de la app cacheada offline.

### Dominio propio

Una vez desplegado, en **Custom domains** dentro del proyecto de Pages puedes añadir tu propio dominio o subdominio (ej. `herramientas.tudominio.com`) — Cloudflare gestiona el certificado TLS automáticamente. Necesitas que el dominio esté gestionado por Cloudflare (o al menos delegar el DNS a Cloudflare para ese subdominio).

### Verificación tras el deploy

- Abre la URL que te da Cloudflare (`https://html-parser-xxx.pages.dev`) y confirma que "Cargar ejemplo" funciona en ambos modos (análisis simple y comparación).
- Comprueba que la PWA es instalable: en Chrome/Edge debería aparecer un icono de instalación en la barra de direcciones (esto solo funciona sobre HTTPS, que Cloudflare Pages ya proporciona).
- Revisa la consola del navegador: no debería haber errores de carga de módulos ni del service worker.

## PWA (instalable, funciona offline)

El `manifest.json` y el `service-worker.js` cachean el "app shell" (HTML, CSS, JS) la primera vez que se visita el sitio servido por HTTPS (Cloudflare Pages ya sirve todo por HTTPS). Tras esa primera visita, la herramienta sigue funcionando sin conexión y puede instalarse desde el navegador como una app.

**Nota**: el service worker no funciona sobre `file://` ni en vistas previas que no sirvan el sitio como un origen HTTPS real — es esperable que no se active en la vista previa embebida de un editor, pero sí una vez desplegado.

## Roadmap (próximos pasos posibles)

- ~~Módulo de accesibilidad~~ ✅ implementado (`a11y`).
- ~~Modo comparación~~ ✅ implementado: pega dos versiones (A/B) y ve qué cambió en cada módulo (`src/diff.js` + `src/diffRender.js`).
- Extensión de navegador que capture el HTML de la pestaña activa automáticamente.
- Modo lote: analizar varios `.html` o un `.zip` de un sitio entero de golpe.
- Informe exportable único (PDF/HTML) combinando todos los módulos.

## Privacidad

Todo el análisis ocurre en el navegador del usuario mediante `DOMParser`. El HTML pegado o subido nunca se envía a ningún servidor.

## Licencia

MIT
