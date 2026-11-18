# Routify

Web para encontrar rutas de senderismo (vías verdes) en España: filtrar por provincia, dificultad y duración, ver la ficha de cada ruta con su recorrido en el mapa y cómo llegar, y guardar favoritas sin registrarse.

Proyecto de la asignatura Gestión de proyectos con metodologías ágiles (CUNEF).

## Web publicada

https://irenebarrientos2004-cyber.github.io/Routify/

Funciona en ordenador y en móvil, sin instalar nada. Se actualiza sola cada vez que se une un cambio a `main`.

## Funcionalidades

| Funcionalidad | Historia | Estado |
|---|---|---|
| Portada con cifras | SCRUM-24 | Hecho |
| Listado de rutas en tarjetas | SCRUM-27 | Hecho |
| Filtros por provincia, dificultad y duración | SCRUM-28 | Hecho |
| Ficha de ruta y "Cómo llegar" | SCRUM-29 | Hecho |
| Guardar rutas en favoritos | SCRUM-30 | Hecho |
| Página "Mis favoritas" | SCRUM-31 | Hecho |
| Mapa con OpenStreetMap | SCRUM-17 | Hecho |
| Inicio y fin de la ruta en el mapa | SCRUM-22 | Hecho |
| Recorrido completo de la ruta en el mapa | SCRUM-44 | Hecho |
| Publicación en GitHub Pages | SCRUM-19 | Hecho |
| Diseño responsive (móvil y escritorio) | SCRUM-32 | Hecho |
| Pruebas en navegadores y móviles | SCRUM-23 | Hecho |
| Registro y corrección de errores | SCRUM-26 | Hecho |
| Manual de uso (Confluence) | SCRUM-20 | Hecho|

## Tecnología

- HTML, CSS y JavaScript, sin frameworks
- Local Storage del navegador para los favoritos
- OpenStreetMap con Leaflet 1.9.4 para los mapas
- Python para preparar los datos (openpyxl para el Excel; el script de recorridos solo usa librerías incluidas en Python)
- Publicación en GitHub Pages

## Datos

Las 136 rutas proceden de los datos oficiales de **Vías Verdes de España** (CNIG-IGN y Fundación de los Ferrocarriles Españoles), con licencia **CC BY 4.0**.

- **Rutas:** el Excel original está en `data/original/` sin modificar. El script `scripts/limpiar_rutas.py` lo limpia y genera `data/rutas.js`, `data/rutas.json` y `data/rutas.csv`.
- **Recorridos:** el trazado de cada vía se descarga del [Centro de Descargas del CNIG](https://centrodedescargas.cnig.es/CentroDescargas/vias-verdes) (archivo `ViasVerdes.gpkg`, unos 22 MB, que no se sube al repositorio). El script `scripts/generar_recorridos.py` lo une con cada ruta, lo aligera y genera `data/recorridos.js`.

Para volver a generarlos:

```
python scripts/limpiar_rutas.py
python scripts/generar_recorridos.py
```

Los archivos de `data/` no se editan a mano. La web usa archivos `.js` (y no `.json`) para poder abrirse directamente desde el ordenador, sin servidor.

## Estructura del proyecto

```
routify/
├── index.html                  Página de inicio
├── rutas.html                  Listado de rutas y filtros
├── ficha.html                  Ficha de una ruta
├── favoritos.html              Mis rutas favoritas
├── css/
│   └── styles.css              Estilos de toda la web
├── js/
│   ├── app.js                  Lógica de la web
│   └── mapa.js                 Mapa de la ficha: inicio, fin y recorrido (Leaflet)
├── data/
│   ├── rutas.js                Rutas que usa la web (generado)
│   ├── rutas.json              Copia en JSON (generado)
│   ├── rutas.csv               Copia en CSV (generado)
│   ├── recorridos.js           Recorrido de cada ruta para el mapa (generado)
│   └── original/               Excel original de Vías Verdes (IGN)
└── scripts/
    ├── limpiar_rutas.py        Limpia el Excel y genera rutas.js
    └── generar_recorridos.py   Genera recorridos.js con los trazados del CNIG
```

## Cómo abrir la web

**Recomendado:** entra en el enlace de la web publicada (arriba).

**En tu ordenador:**
1. Descarga el repositorio (botón verde **Code** → **Download ZIP**) o clónalo.
2. **Descomprime** el ZIP (clic derecho → Extraer todo). Si lo abres desde dentro del ZIP, la web sale sin estilos.
3. Abre `index.html` con el navegador.

> Al abrir los archivos desde el ordenador funciona todo **excepto el mapa**: los servidores de OpenStreetMap solo lo permiten desde una web publicada. Para ver el mapa, usa el enlace.

## Cómo trabajamos en GitHub

- Una rama por historia de usuario, con su código de Jira (por ejemplo `SCRUM-29-ficha`), no una por persona.
- Antes de crear la rama, actualizar `main`.
- Pull requests pequeñas, revisadas y aprobadas por un compañero antes de unirlas a `main`.
- Antes de hacer el merge, pulsar **Update branch** y volver a probar la rama.
- La rama `main` tiene siempre el código que funciona.

## Créditos

- Mapas: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors
- Rutas y recorridos: CNIG-IGN / Fundación de los Ferrocarriles Españoles (CC BY 4.0)

## Equipo

Sara Cava · Alejandro Lazarov · Miguel Antuña · Carlos Ávila · Lucía Fort · Irene Barrientos
