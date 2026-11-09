// Lógica de Routify
//
// SCRUM-33 · Conectar la web con la base de datos
// La web lee las rutas del archivo data/rutas.js (variable RUTAS),
// generado por scripts/limpiar_rutas.py en SCRUM-15, y las muestra.
//
// Pendiente para otras historias:
// - Diseño del listado en tarjetas (SCRUM-27)
// - Mapa de la ruta (SCRUM-17)

// ===== SCRUM-30 · Guardar rutas en favoritos (Local Storage, sin cuenta) =====
//
// Se guarda en localStorage, con la clave "routify_favoritos", un array JSON
// con los id de las rutas favoritas, por ejemplo [3, 15, 42].
// Estas funciones también las usará la página "Mis favoritas".

const CLAVE_FAVORITOS = "routify_favoritos";

// Devuelve la lista de id favoritos (números, sin duplicados).
// Si no hay nada guardado, los datos están mal o el navegador bloquea
// el almacenamiento, devuelve una lista vacía en vez de romper la web.
function obtenerFavoritos() {
  let guardado = null;
  try {
    guardado = JSON.parse(localStorage.getItem(CLAVE_FAVORITOS));
  } catch (e) {
    return [];
  }
  if (!Array.isArray(guardado)) return [];

  const ids = [];
  guardado.forEach(function (valor) {
    if (valor === null || valor === "") return; // Number(null) daría 0
    const id = Number(valor);
    if (Number.isInteger(id) && ids.indexOf(id) === -1) ids.push(id);
  });
  return ids;
}

// Guarda la lista de favoritos. Devuelve true si se ha podido guardar.
function guardarFavoritos(ids) {
  try {
    localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify(ids));
    return true;
  } catch (e) {
    console.warn("No se han podido guardar los favoritos en este navegador");
    return false;
  }
}

// ¿Está la ruta guardada en favoritos?
function esFavorita(id) {
  return obtenerFavoritos().indexOf(Number(id)) !== -1;
}

// Guarda la ruta si no estaba (Escenario 1) o la quita si ya estaba (Escenario 2).
// Devuelve el estado final: true si queda como favorita, false si no.
function alternarFavorito(id) {
  const numero = Number(id);
  const favoritos = obtenerFavoritos();
  const posicion = favoritos.indexOf(numero);

  if (posicion === -1) {
    favoritos.push(numero);
  } else {
    favoritos.splice(posicion, 1);
  }

  guardarFavoritos(favoritos);
  return esFavorita(numero); // Si no se pudo guardar, el estado sigue como estaba
}

// Pone el corazón lleno o vacío según el estado de la ruta
function pintarBotonFavorito(boton, favorita) {
  boton.setAttribute("aria-pressed", favorita ? "true" : "false");
  boton.title = favorita ? "Quitar de favoritos" : "Guardar en favoritos";
  boton.querySelector(".corazon").textContent = favorita ? "♥" : "♡";
  boton.classList.toggle("es-favorita", favorita);
}

// Crea el botón de corazón de una ruta (se usa en tarjetas y en la ficha)
function crearBotonFavorito(ruta) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "boton-favorito";
  boton.setAttribute("aria-label", "Guardar en favoritos: " + ruta.nombre);

  const corazon = document.createElement("span");
  corazon.className = "corazon";
  corazon.setAttribute("aria-hidden", "true");
  boton.appendChild(corazon);

  pintarBotonFavorito(boton, esFavorita(ruta.id));

  boton.addEventListener("click", function () {
    pintarBotonFavorito(boton, alternarFavorito(ruta.id));
  });

  return boton;
}

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
    // Contenedor de la tarjeta: el enlace a la ficha y, a su lado, el corazón (SCRUM-30).
    // El botón no puede ir dentro del <a>, porque al pulsarlo se abriría la ficha.
    const contenedorTarjeta = document.createElement("div");
    contenedorTarjeta.className = "tarjeta";

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

    contenedorTarjeta.appendChild(tarjeta);
    contenedorTarjeta.appendChild(crearBotonFavorito(ruta));
    lista.appendChild(contenedorTarjeta);
  });

  contenedor.appendChild(lista);
}

// ===== SCRUM-28 · Filtros de búsqueda por provincia, dificultad y duración =====

const IDS_FILTROS = ["filtro-provincia", "filtro-dificultad", "filtro-duracion"];
const CLAVE_FILTROS = "routify-filtros";

// Guarda los filtros elegidos para recuperarlos al volver de una ficha (SCRUM-29)
function guardarFiltros() {
  const valores = {};
  IDS_FILTROS.forEach(function (id) { valores[id] = document.getElementById(id).value; });
  try { sessionStorage.setItem(CLAVE_FILTROS, JSON.stringify(valores)); } catch (e) { /* sin almacenamiento */ }
}

// Recupera los filtros guardados, si los hay
function recuperarFiltros() {
  let valores = null;
  try { valores = JSON.parse(sessionStorage.getItem(CLAVE_FILTROS)); } catch (e) { valores = null; }
  if (!valores) return false;
  IDS_FILTROS.forEach(function (id) {
    if (valores[id] !== undefined) document.getElementById(id).value = valores[id];
  });
  return true;
}

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
      guardarFiltros();
      mostrarRutas(filtrarRutas());
    });
  });

  document.getElementById("borrar-filtros").addEventListener("click", function () {
    IDS_FILTROS.forEach(function (id) { document.getElementById(id).value = ""; });
    guardarFiltros();
    mostrarRutas(obtenerRutas());
  });

  // Si volvemos de una ficha, se mantienen los filtros que había (SCRUM-29)
  recuperarFiltros();
  mostrarRutas(filtrarRutas());
}

// ===== SCRUM-29 · Ficha de detalle de ruta =====

// Busca una ruta por su id (el id llega en la dirección: ficha.html?id=5)
function obtenerRutaPorId(id) {
  return obtenerRutas().find(function (ruta) { return String(ruta.id) === String(id); });
}

// Pinta la ficha con los datos de la ruta (Escenario 1)
function mostrarFicha() {
  const contenedor = document.getElementById("detalle-ruta");
  if (!contenedor) return; // No estamos en la página de ficha

  const id = new URLSearchParams(window.location.search).get("id");
  const ruta = obtenerRutaPorId(id);

  if (!ruta) {
    contenedor.innerHTML =
      "<h1>Ruta no encontrada</h1>" +
      "<p>No hemos encontrado esta ruta. Vuelve al listado y elige otra.</p>";
    return;
  }

  document.title = "Routify · " + ruta.nombre;

  // Avisos de la ruta (tramos cerrados, coordenadas dudosas…)
  let avisos = "";
  if (ruta.avisos && ruta.avisos.length > 0) {
    avisos = "<div class='ficha-aviso'><strong>Aviso:</strong> " + ruta.avisos.join(" ") + "</div>";
  }

  // Cómo llegar: enlace al punto de inicio en Google Maps
  const comoLlegar = "https://www.google.com/maps/dir/?api=1&destination=" +
    ruta.latitud_inicio + "," + ruta.longitud_inicio;

  contenedor.innerHTML =
    "<p class='ficha-provincia'>" + ruta.provincia_texto + " · " + (ruta.comunidades || []).join(", ") + "</p>" +
    "<h1>" + ruta.nombre + "</h1>" +
    avisos +
    "<div class='ficha-datos dificultad-" + ruta.dificultad.toLowerCase() + "'>" +
      "<div class='ficha-dato'><span>Distancia</span><strong>" + ruta.distancia_km + " km</strong></div>" +
      "<div class='ficha-dato'><span>Duración</span><strong>" + formatearDuracion(ruta.duracion_horas) + "</strong></div>" +
      "<div class='ficha-dato'><span>Dificultad</span><strong class='etiqueta-dificultad'>" + ruta.dificultad + "</strong></div>" +
    "</div>" +
    "<h2>Descripción</h2>" +
    "<p>Recorrido: " + ruta.descripcion + ".</p>" +
    "<p>Firme: " + ruta.firme + " · Estado: " + ruta.estado + "</p>" +
    "<h2>Cómo llegar</h2>" +
    "<p>El punto de inicio está en las coordenadas " + ruta.latitud_inicio + ", " + ruta.longitud_inicio + ".</p>" +
    "<a class='boton' href='" + comoLlegar + "' target='_blank' rel='noopener'>Cómo llegar (Google Maps)</a>";

  // SCRUM-30: corazón de favoritos junto al título de la ficha
  const titulo = contenedor.querySelector("h1");
  const cabeceraFicha = document.createElement("div");
  cabeceraFicha.className = "ficha-titulo";
  titulo.parentNode.insertBefore(cabeceraFicha, titulo);
  cabeceraFicha.appendChild(titulo);
  cabeceraFicha.appendChild(crearBotonFavorito(ruta));
}

// Escenario 2: el botón "Volver" regresa al listado con los filtros que había
function prepararBotonVolver() {
  const volver = document.getElementById("volver");
  if (!volver) return;
  volver.addEventListener("click", function (evento) {
    // Si venimos del listado, volvemos atrás; los filtros se recuperan al cargar rutas.html
    if (document.referrer.indexOf("rutas.html") !== -1) {
      evento.preventDefault();
      window.history.back();
    }
  });
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
  mostrarFicha();
  prepararBotonVolver();
  mostrarCifrasPortada();
  console.log("Routify cargado: " + obtenerRutas().length + " rutas");
});
