// Lógica de Routify
//
// SCRUM-33 · Conectar la web con la base de datos
// La web lee las rutas del archivo data/rutas.js (variable RUTAS),
// generado por scripts/limpiar_rutas.py en SCRUM-15, y las muestra.
//
// Pendiente para otras historias:
// - Diseño del listado en tarjetas (SCRUM-27)
// - Filtros por provincia, dificultad y duración
// - Ficha de una ruta y mapa
// - Favoritos con Local Storage

// Convierte horas con decimales en texto, por ejemplo 3.08 -> "3 h 5 min"
function formatearDuracion(horas) {
  const totalMinutos = Math.round(horas * 60);
  const h = Math.floor(totalMinutos / 60);
  const min = totalMinutos % 60;
  if (h === 0) return min + " min";
  if (min === 0) return h + " h";
  return h + " h " + min + " min";
}

// Devuelve las rutas, o una lista vacía si el archivo de datos no ha cargado
function obtenerRutas() {
  if (typeof RUTAS === "undefined" || !Array.isArray(RUTAS)) {
    console.error("No se han podido cargar las rutas: revisa data/rutas.js");
    return [];
  }
  return RUTAS;
}

// Muestra las rutas en la página de Rutas, en forma de tarjetas (SCRUM-27)
function mostrarRutas() {
  const contenedor = document.getElementById("listado-rutas");
  if (!contenedor) return; // No estamos en la página de Rutas

  const rutas = obtenerRutas();

  if (rutas.length === 0) {
    contenedor.innerHTML = "<p>No se han podido cargar las rutas.</p>";
    return;
  }

  contenedor.innerHTML = "";

  // Número de rutas cargadas
  const resumen = document.createElement("p");
  resumen.textContent = rutas.length + " rutas cargadas";
  contenedor.appendChild(resumen);

  // Una tarjeta por ruta: nombre, provincia, dificultad y duración (SCRUM-27)
  const lista = document.createElement("div");
  lista.className = "lista-tarjetas";

  rutas.forEach(function (ruta) {
    const tarjeta = document.createElement("a");
    tarjeta.className = "tarjeta-ruta dificultad-" + ruta.dificultad.toLowerCase();
    tarjeta.href = "ficha.html?id=" + ruta.id; // Escenario 2: abre la ficha de la ruta

    tarjeta.innerHTML =
      "<h3>" + ruta.nombre + "</h3>" +
      "<p class='tarjeta-provincia'>" + ruta.provincia_texto + "</p>" +
      "<p class='tarjeta-datos'>" +
        "<span class='etiqueta-dificultad'>" + ruta.dificultad + "</span>" +
        " · " + formatearDuracion(ruta.duracion_horas) +
        " · " + ruta.distancia_km + " km" +
      "</p>";

    lista.appendChild(tarjeta);
  });

  contenedor.appendChild(lista);
}

// Rellena las cifras de la portada (página de inicio) con los datos reales
function mostrarCifrasPortada() {
  const cifraRutas = document.getElementById("cifra-rutas");
  if (!cifraRutas) return; // No estamos en la portada

  const rutas = obtenerRutas();
  if (rutas.length === 0) return; // Se quedan los valores escritos en el HTML

  const provincias = new Set();
  let kilometros = 0;
  rutas.forEach(function (ruta) {
    (ruta.provincias || []).forEach(function (p) { provincias.add(p); });
    kilometros += ruta.distancia_km || 0;
  });

  cifraRutas.textContent = rutas.length;
  document.getElementById("cifra-provincias").textContent = provincias.size;
  document.getElementById("cifra-km").textContent =
    Math.round(kilometros).toLocaleString("es-ES");
}

document.addEventListener("DOMContentLoaded", function () {
  mostrarRutas();
  mostrarCifrasPortada();
  console.log("Routify cargado: " + obtenerRutas().length + " rutas");
});