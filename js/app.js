// Lógica de Routify
//
// SCRUM-33 · Conectar la web con la base de datos
// La web lee las rutas del archivo data/rutas.js (variable RUTAS),
// generado por scripts/limpiar_rutas.py en SCRUM-15, y las muestra.
//
// Pendiente para otras historias:
// - Diseño del listado en tarjetas (SCRUM-27)
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

// Muestra las rutas en la página de Rutas, en forma de tarjetas (SCRUM-27).
// Recibe la lista de rutas que hay que pintar: todas o solo las filtradas (SCRUM-28).
function mostrarRutas(rutas) {
  const contenedor = document.getElementById("listado-rutas");
  if (!contenedor) return; // No estamos en la página de Rutas

  const total = obtenerRutas().length;
  if (total === 0) {
    contenedor.innerHTML = "<p>No se han podido cargar las rutas.</p>";
    return;
  }

  contenedor.innerHTML = "";

  // Número de rutas que se muestran
  const resumen = document.createElement("p");
  resumen.textContent = rutas.length === total
    ? total + " rutas cargadas"
    : rutas.length + " de " + total + " rutas cumplen los filtros";
  contenedor.appendChild(resumen);

  // SCRUM-28 · Escenario 2: ninguna ruta cumple los filtros
  if (rutas.length === 0) {
    const aviso = document.createElement("p");
    aviso.className = "sin-resultados";
    aviso.textContent = "No hay rutas con estos filtros";
    contenedor.appendChild(aviso);
    return;
  }

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

// ===== SCRUM-28 · Filtros de búsqueda por provincia, dificultad y duración =====

const IDS_FILTROS = ["filtro-provincia", "filtro-dificultad", "filtro-duracion"];

// Rellena el desplegable de provincias con las provincias que tienen rutas
function prepararFiltroProvincias() {
  const select = document.getElementById("filtro-provincia");
  const provincias = new Set();
  obtenerRutas().forEach(function (ruta) {
    (ruta.provincias || []).forEach(function (p) { provincias.add(p); });
  });

  Array.from(provincias)
    .sort(function (a, b) { return a.localeCompare(b, "es"); })
    .forEach(function (provincia) {
      const opcion = document.createElement("option");
      opcion.value = provincia;
      opcion.textContent = provincia;
      select.appendChild(opcion);
    });
}

// Comprueba si la duración de una ruta (en horas) está dentro del rango elegido.
// El rango llega como "0-2", "2-4" o "4-" (más de 4 h).
function cumpleDuracion(horas, rango) {
  if (!rango) return true;
  const partes = rango.split("-");
  const minimo = parseFloat(partes[0]);
  const maximo = partes[1] === "" ? Infinity : parseFloat(partes[1]);
  return horas >= minimo && horas < maximo;
}

// Devuelve solo las rutas que cumplen los tres filtros a la vez (Escenario 1)
function filtrarRutas() {
  const provincia = document.getElementById("filtro-provincia").value;
  const dificultad = document.getElementById("filtro-dificultad").value;
  const duracion = document.getElementById("filtro-duracion").value;

  return obtenerRutas().filter(function (ruta) {
    const cumpleProvincia = !provincia || (ruta.provincias || []).indexOf(provincia) !== -1;
    const cumpleDificultad = !dificultad || ruta.dificultad === dificultad;
    return cumpleProvincia && cumpleDificultad && cumpleDuracion(ruta.duracion_horas, duracion);
  });
}

// Conecta los desplegables y el botón "Borrar filtros"
function iniciarFiltros() {
  if (!document.getElementById("filtro-provincia")) {
    mostrarRutas(obtenerRutas()); // Página sin filtros
    return;
  }

  prepararFiltroProvincias();

  IDS_FILTROS.forEach(function (id) {
    document.getElementById(id).addEventListener("change", function () {
      mostrarRutas(filtrarRutas());
    });
  });

  document.getElementById("borrar-filtros").addEventListener("click", function () {
    IDS_FILTROS.forEach(function (id) { document.getElementById(id).value = ""; });
    mostrarRutas(obtenerRutas());
  });

  mostrarRutas(obtenerRutas());
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
  iniciarFiltros();
  mostrarCifrasPortada();
  console.log("Routify cargado: " + obtenerRutas().length + " rutas");
});
