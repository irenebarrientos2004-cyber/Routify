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

// Muestra las rutas en la página de Rutas
function mostrarRutas() {
  const contenedor = document.getElementById("listado-rutas");
  if (!contenedor) return; // No estamos en la página de Rutas

  const rutas = obtenerRutas();

  if (rutas.length === 0) {
    contenedor.innerHTML = "<p>No se han podido cargar las rutas.</p>";
    return;
  }

  // Número de rutas cargadas
  const resumen = document.createElement("p");
  resumen.textContent = rutas.length + " rutas cargadas";
  contenedor.innerHTML = "";
  contenedor.appendChild(resumen);

  // Lista sencilla de rutas (el diseño en tarjetas es la historia SCRUM-27)
  const lista = document.createElement("ul");
  rutas.forEach(function (ruta) {
    const elemento = document.createElement("li");
    elemento.textContent =
      ruta.nombre + " · " +
      ruta.provincia_texto + " · " +
      ruta.dificultad + " · " +
      formatearDuracion(ruta.duracion_horas) + " · " +
      ruta.distancia_km + " km";
    lista.appendChild(elemento);
  });
  contenedor.appendChild(lista);
}

document.addEventListener("DOMContentLoaded", function () {
  mostrarRutas();
  console.log("Routify cargado: " + obtenerRutas().length + " rutas");
});