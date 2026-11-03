# Webstarted Talent Network: prototipo rediseñado

Prototipo navegable de **Home** + **Registro a la Talent Network**, rehecho con las skills de diseño **Impeccable** (Paul Bakaus), **Emil Kowalski**, **taste-skill** (Leonxlnx) y **UI/UX Pro Max** (nextlevelbuilder). Dirección elegida: **Línea de proceso (metro)**. El proceso de selección es una línea de metro y el candidato viaja por ella.

## Cómo verlo

Abre `prototipo/index.html` con doble clic. No hace falta instalar nada ni levantar un servidor.

> Para probar la **grabación con cámara** del paso 3, algunos navegadores piden servir la página por http. Desde la carpeta `prototipo/`:
> `python3 -m http.server 8000` → abre http://localhost:8000

## Qué hay en cada carpeta

| Carpeta / archivo | Qué es |
|---|---|
| `prototipo/index.html` | **Home**: el letrero de andén "Próxima parada: una startup de EE. UU." (hero), la línea de 5 estaciones, el formulario para empezar el registro, el boleto "qué falta", el **carrusel de logos de clientes**, el mapa de las 4 líneas, los perfiles verificados y el transbordo a Academy |
| `prototipo/registro.html` | **Registro** en 3 pasos (datos básicos → experiencia → video en inglés) con el ramal vertical y el tren "Estás aquí". También `registro.html#login` (iniciar sesión) |
| `prototipo/styles.css` | Estilos compartidos. **El bloque `:root` del principio tiene la paleta (PROVISIONAL)**: es lo único que cambia cuando llegue la paleta de webstartedacademy.com |
| `prototipo/home.css`, `home.js` | Estilos e interacciones de la Home |
| `prototipo/registro.css`, `registro.js` | Estilos y lógica del registro: validación, cámara, subida de video, borrador guardado |
| `prototipo/fonts/` + `fonts.css` | Tipografías alojadas en el proyecto: Archivo (interfaz) y Montserrat Light (solo la palabra "webstarted" del logo) |
| `prototipo/logos/` | Carpeta para los logos reales del carrusel (instrucciones en `logos/LEEME.txt`) |
| `prototipo/sprite.html` | Fuente única de los íconos y del logo en SVG. Si lo editas, corre `python3 inject_sprite.py` para copiarlo dentro de las páginas |
| `capturas/` | Capturas del prototipo en escritorio y móvil, y de cada paso del registro |
| `referencia-original/` | Las dos capturas del prototipo anterior, como referencia |
| `PRODUCT.md` | Ficha de producto (usuarios, propuesta, proceso, datos confirmados y lo que no se puede inventar). Impeccable la lee en cada comando |
| `docs/direccion-de-diseno.md` | El contrato de dirección: tesis, mundo visual, primer pantallazo e interacción insignia |
| `.impeccable/` (oculta) | Archivos de trabajo de Impeccable (brief de la superficie, tirada de dirección, capturas de revisión). No borrar si vas a seguir usando la skill |
| `skills/` | Copia de las skills instaladas, para usarlas en tu Claude Code local (ver abajo) |

## Instalar las skills en tu máquina

Copia las carpetas de `skills/` a `~/.claude/skills/` (en Windows, `%USERPROFILE%\.claude\skills\`):

```bash
mkdir -p ~/.claude/skills && cp -r skills/* ~/.claude/skills/
```

Después abre Claude Code en esta carpeta y usa, por ejemplo, `/impeccable critique prototipo/index.html`, `/emil-design-eng`, `/taste-skill` o `/ui-ux-pro-max`.
Fuentes: https://github.com/pbakaus/impeccable · https://github.com/emilkowalski/skills · https://github.com/Leonxlnx/taste-skill · https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (licencias en `skills/LICENSE-*`).

El inspector de taste-skill necesita Node 22+ y Chrome/Chromium: `node ~/.claude/skills/taste-skill/scripts/inspect.mjs prototipo/index.html` (las mediciones antes/después del hero están en `.taste-skill/`).

## Pendiente

- **Paleta real**: tomarla de https://www.webstartedacademy.com/ (el entorno en la nube no tenía acceso) y reemplazar el bloque `:root` de `styles.css`.
- **Logo oficial**: el isotipo está redibujado en SVG desde la captura. Reemplazarlo por el archivo oficial en `sprite.html`.
- **Logos de clientes**: el carrusel tiene 8 espacios reservados. Pon los archivos en `prototipo/logos/` y reemplaza cada `<li class="logo-tile is-placeholder">` por `<li class="logo-tile"><img src="logos/archivo.svg" alt="Empresa"></li>` en `index.html`.
- **Perfiles de ejemplo**: Camila, Mateo y Lucía son nombres inventados (marcados como ejemplo).
- **Términos y Privacidad**: los enlaces todavía no van a ninguna página.
- **Cierre de Impeccable**: revisión final + `DESIGN.md`, una vez aplicada la paleta real.
