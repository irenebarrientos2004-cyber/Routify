# Routify

Web para encontrar rutas de senderismo (vías verdes) en España: filtrar por provincia, dificultad y duración, ver la ficha de cada ruta con cómo llegar y guardar favoritas sin registrarse.

Proyecto de la asignatura Gestión de proyectos con metodologías ágiles (CUNEF).

## Funcionalidades

| Funcionalidad | Historia | Estado |
|---|---|---|
| Portada con cifras | SCRUM-24 | Hecho |
| Listado de rutas en tarjetas | SCRUM-27 | Hecho |
| Filtros por provincia, dificultad y duración | SCRUM-28 | Hecho |
| Ficha de ruta y "Cómo llegar" | SCRUM-29 | Hecho |
| Guardar rutas en favoritos | SCRUM-30 | Hecho |
| Página "Mis favoritas" | SCRUM-31 | En desarrollo |
| Mapa con OpenStreetMap | SCRUM-17 y SCRUM-22 | En desarrollo |
| Diseño responsive | SCRUM-32 | En desarrollo |
| Publicación en GitHub Pages | SCRUM-19 | En desarrollo |

## Tecnología

- HTML, CSS y JavaScript, sin frameworks
- Local Storage del navegador para los favoritos
- OpenStreetMap (con Leaflet) para los mapas
- Python (openpyxl) para limpiar los datos
- Publicación en GitHub Pages

## Datos

Las 136 rutas proceden de los datos oficiales de **Vías Verdes de España** (Instituto Geográfico Nacional). El Excel original está en `data/original/` sin modificar.

El script `scripts/limpiar_rutas.py` limpia ese Excel y genera `data/rutas.js`, `data/rutas.json` y `data/rutas.csv`. Para volver a generarlos:

```
python scripts/limpiar_rutas.py
```

Los archivos de `data/` no se editan a mano. La web usa `rutas.js` (y no `rutas.json`) para poder abrirse directamente desde el ordenador, sin servidor.

## Estructura del proyecto

```
routify/
├── index.html              Página de inicio
├── rutas.html              Listado de rutas y filtros
├── ficha.html              Ficha de una ruta
├── favoritos.html          Mis rutas favoritas
├── css/
│   └── styles.css          Estilos de toda la web
├── js/
│   └── app.js              Lógica de la web
├── data/
│   ├── rutas.js            Rutas que usa la web (generado)
│   ├── rutas.json          Copia en JSON (generado)
│   ├── rutas.csv           Copia en CSV (generado)
│   └── original/           Excel original de Vías Verdes (IGN)
└── scripts/
    └── limpiar_rutas.py    Script de limpieza de datos
```

## Cómo abrir la web en tu ordenador

1. Descarga el repositorio (botón verde **Code** → **Download ZIP**) o clónalo.
2. **Descomprime** el ZIP (clic derecho → Extraer todo). Si lo abres desde dentro del ZIP, la web sale sin estilos.
3. Abre `index.html` con el navegador (Chrome, Edge o Firefox).

## Cómo trabajamos en GitHub

- Una rama por historia de usuario, con su código de Jira (por ejemplo `SCRUM-29-ficha`), no una por persona.
- Antes de crear la rama, actualizar `main`.
- Pull requests pequeñas, revisadas y aprobadas por un compañero antes de unirlas a `main`.
- Antes de hacer el merge, pulsar **Update branch** y volver a probar la rama.
- La rama `main` tiene siempre el código que funciona.

## Equipo

Sara Cava · Alejandro Lazarov · Miguel Antuña · Carlos Ávila · Lucía Fort · Irene Barrientos
