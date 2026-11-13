// ===== SCRUM-17 · Integrar OpenStreetMap =====
//
// Mapa de la ficha de ruta con Leaflet (cargado desde unpkg en ficha.html)
// y teselas de OpenStreetMap.
// Este archivo se carga ANTES de app.js, que llama a crearMapa() desde mostrarFicha().

const TESELAS_OSM = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATRIBUCION_OSM =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const ZOOM_UN_PUNTO = 13; // Zoom cuando solo hay coordenadas de inicio
const ZOOM_MAXIMO = 15;   // Para que no se acerque demasiado si inicio y fin están juntos

// Convierte una coordenada en número. Devuelve null si falta (null, "", undefined) o no es válida.
function leerCoordenada(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

// Devuelve [latitud, longitud] o null si falta alguna de las dos
function leerPunto(latitud, longitud) {
  const lat = leerCoordenada(latitud);
  const lon = leerCoordenada(longitud);
  if (lat === null || lon === null) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return [lat, lon];
}

// Escribe un mensaje en lugar del mapa (Escenario 2 y errores de carga)
function mostrarMensajeMapa(contenedor, mensaje, detalle) {
  contenedor.className = "mapa-no-disponible";
  contenedor.innerHTML = "";

  const texto = document.createElement("p");
  texto.className = "mapa-mensaje";
  texto.textContent = mensaje;
  contenedor.appendChild(texto);

  if (detalle) {
    const nota = document.createElement("p");
    nota.className = "mapa-detalle";
    nota.textContent = detalle;
    contenedor.appendChild(nota);
  }
}

// Crea el mapa de una ruta dentro del elemento con id contenedorId.
// - Centra el mapa en el punto de inicio y le pone un marcador.
// - Si también hay punto de fin, ajusta el zoom para que se vean los dos.
// Devuelve el objeto mapa de Leaflet (para añadirle más cosas, p. ej. SCRUM-22)
// o null si no se ha podido mostrar el mapa.
function crearMapa(contenedorId, ruta) {
  const contenedor = document.getElementById(contenedorId);
  if (!contenedor || !ruta) return null;

  // Escenario 2: ruta sin ubicación
  const inicio = leerPunto(ruta.latitud_inicio, ruta.longitud_inicio);
  if (!inicio) {
    mostrarMensajeMapa(contenedor, "Ubicación no disponible");
    return null;
  }

  // Coordenadas marcadas como dudosas al limpiar los datos (SCRUM-15):
  // no se pinta un punto que puede estar mal
  if (ruta.coordenadas_fiables === false) {
    mostrarMensajeMapa(contenedor, "Ubicación no disponible",
      "Las coordenadas de esta ruta no son fiables, así que no la situamos en el mapa.");
    return null;
  }

  // Sin internet o sin Leaflet: la ficha sigue funcionando, solo falta el mapa
  if (typeof L === "undefined") {
    mostrarMensajeMapa(contenedor, "No se ha podido cargar el mapa",
      "Comprueba tu conexión a internet y vuelve a cargar la página.");
    return null;
  }

  try {
    contenedor.className = "mapa-ruta";
    contenedor.innerHTML = "";

    const mapa = L.map(contenedor, { scrollWheelZoom: false }); // la rueda sigue moviendo la página
    L.tileLayer(TESELAS_OSM, { maxZoom: 19, attribution: ATRIBUCION_OSM }).addTo(mapa);

    L.marker(inicio, { title: ruta.nombre }).addTo(mapa).bindPopup(ruta.nombre);

    // Si hay punto de fin, se encuadran inicio y fin
    const fin = leerPunto(ruta.latitud_fin, ruta.longitud_fin);
    if (fin) {
      mapa.fitBounds([inicio, fin], { padding: [40, 40], maxZoom: ZOOM_MAXIMO });
    } else {
      mapa.setView(inicio, ZOOM_UN_PUNTO);
    }

    return mapa;
  } catch (error) {
    console.error("Error al crear el mapa:", error);
    mostrarMensajeMapa(contenedor, "No se ha podido cargar el mapa");
    return null;
  }
}
