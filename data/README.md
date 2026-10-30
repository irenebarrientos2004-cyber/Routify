# Carpeta de datos

Los ficheros de rutas se generan con `python scripts/limpiar_rutas.py` a partir de `original/vias_verdes_tabla_coordenada.xlsx` (el Excel original no se modifica). No los edites a mano: vuelve a ejecutar el script.

| Fichero | Formato | Uso |
|---|---|---|
| `rutas.json` | JSON UTF-8, lista de 136 rutas | Datos limpios de referencia |
| `rutas.csv` | CSV UTF-8 con BOM; las listas van unidas con ` \| ` | Para revisar los datos en Excel |
| `rutas.js` | El mismo contenido que `rutas.json`, como `const RUTAS = [...];` | Lo carga la web |

La web carga `rutas.js` con una etiqueta `<script>` antes de `js/app.js`, de modo que `app.js` puede usar la variable global `RUTAS`:

```html
<script src="data/rutas.js"></script>
<script src="js/app.js"></script>
```
