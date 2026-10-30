"""
SCRUM-15 - Tratamiento de la base de datos de Routify.

Lee data/original/vias_verdes_tabla_coordenada.xlsx (hoja "vias_verdes_tabla")
con openpyxl y genera:
  - data/rutas.json  (UTF-8, para la web)
  - data/rutas.csv   (UTF-8 con BOM, para abrir con Excel)
  - data/rutas.js    (mismo contenido que rutas.json como `const RUTAS = [...]`)

Al final imprime un informe de validación. No modifica el Excel original.
Uso: python scripts/limpiar_rutas.py
"""

import csv
import datetime
import json
import re
import sys
from collections import Counter
from pathlib import Path

import openpyxl

# --- Rutas de ficheros -------------------------------------------------------
RAIZ = Path(__file__).resolve().parent.parent
EXCEL = RAIZ / "data" / "original" / "vias_verdes_tabla_coordenada.xlsx"
HOJA = "vias_verdes_tabla"
SALIDA_JSON = RAIZ / "data" / "rutas.json"
SALIDA_CSV = RAIZ / "data" / "rutas.csv"
SALIDA_JS = RAIZ / "data" / "rutas.js"

FUENTE = "Vías Verdes (FFE / IGN)"

# Cabeceras que esperamos encontrar en la fila 1 (buscamos por nombre, no por letra)
CABECERAS = {
    "nombre": "Nombre",
    "provincia": "Provincia",
    "comunidad": "Comunidad",
    "longitud": "Longitud (km)",
    "duracion": "Duración estimada (h:mm)",
    "dificultad": "Dificultad",
    "recorrido": "Recorrido",
    "firme": "Firme",
    "estado": "Estado",
    "entrada": "Coord. entrada",
    "salida": "Coord. salida",
}

# Dificultades válidas y su traducción
DIFICULTADES = {"Fácil": "Fácil", "Moderada": "Media", "Media": "Media", "Difícil": "Difícil"}

# Dos números con signo y decimales separados por coma; \s también cubre U+00A0
PATRON_COORD = re.compile(r"\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*")
PATRON_URL = re.compile(r"https?://\S+")

# Origen de las fechas de Excel (para celdas que openpyxl devuelve como datetime)
EPOCA_EXCEL = datetime.datetime(1899, 12, 30)


# --- Funciones de conversión (una por tipo de dato) --------------------------

def limpiar_texto(valor):
    """Devuelve el texto con strip, o '' si la celda está vacía."""
    if valor is None:
        return ""
    return str(valor).strip()


def separar_lista(valor):
    """'Jaén / Córdoba' -> ['Jaén', 'Córdoba']."""
    texto = limpiar_texto(valor)
    if not texto:
        return []
    return [parte.strip() for parte in texto.split(" / ") if parte.strip()]


def convertir_distancia(valor):
    """Texto ('15.52') o número -> float con 2 decimales. None si no se puede."""
    if isinstance(valor, (int, float)) and not isinstance(valor, bool):
        return round(float(valor), 2)
    try:
        return round(float(limpiar_texto(valor)), 2)
    except ValueError:
        return None


def convertir_duracion(valor):
    """Valor crudo de Excel -> horas (float, 2 decimales). None si no se puede.

    openpyxl puede devolver:
      - datetime.time       (duraciones < 24 h)
      - datetime.timedelta  (formato [h]:mm:ss, puede pasar de 24 h)
      - datetime.datetime   (fracción de día >= 1 leída como fecha)
      - int / float         (fracción de día sin formato de hora)
    """
    if isinstance(valor, datetime.datetime):  # va antes que time: datetime no hereda de time, pero sí de date
        horas = (valor - EPOCA_EXCEL).total_seconds() / 3600
    elif isinstance(valor, datetime.time):
        horas = valor.hour + valor.minute / 60 + valor.second / 3600
    elif isinstance(valor, datetime.timedelta):
        horas = valor.total_seconds() / 3600
    elif isinstance(valor, (int, float)) and not isinstance(valor, bool):
        horas = valor * 24
    else:
        return None
    return round(horas, 2)


def convertir_dificultad(valor):
    """'Moderada' -> 'Media'. Devuelve (dificultad, es_conocida)."""
    texto = limpiar_texto(valor)
    if texto in DIFICULTADES:
        return DIFICULTADES[texto], True
    return texto, False  # no se cambia: se avisa


def convertir_coordenadas(valor):
    """'lat, lon' -> (lat, lon) como floats, o (None, None) si no se puede."""
    if valor is None:
        return None, None
    coincidencia = PATRON_COORD.fullmatch(str(valor))
    if not coincidencia:
        return None, None
    return float(coincidencia.group(1)), float(coincidencia.group(2))


def texto_comentario(celda):
    """Texto del comentario de una celda sin el nombre del autor ('' si no hay)."""
    if celda.comment is None:
        return ""
    texto = celda.comment.text or ""
    # Comentarios encadenados de Excel moderno: el texto real va tras "Comment:"
    if texto.startswith("[Threaded comment]") and "Comment:" in texto:
        texto = texto.split("Comment:", 1)[1]
    # Comentarios clásicos: a veces empiezan por "Autor:"
    autor = celda.comment.author or ""
    if autor and texto.startswith(autor + ":"):
        texto = texto[len(autor) + 1:]
    return texto.strip()


def es_fuente(comentario):
    """True si el comentario es una cita de fuente ('Source: ...')."""
    return comentario.startswith("Source:")


def extraer_url(comentario):
    """Primera URL que aparezca en el comentario, o None."""
    coincidencia = PATRON_URL.search(comentario)
    return coincidencia.group(0).rstrip(".,;)") if coincidencia else None


# --- Lectura del Excel --------------------------------------------------------

def localizar_columnas(hoja):
    """Devuelve {clave: índice de columna} a partir de la fila de cabecera."""
    cabecera = [limpiar_texto(c.value) for c in hoja[1]]
    columnas = {}
    for clave, nombre in CABECERAS.items():
        if nombre not in cabecera:
            sys.exit(f"ERROR: no se encuentra la columna '{nombre}' en la cabecera.")
        columnas[clave] = cabecera.index(nombre)
    return columnas


def construir_ruta(id_ruta, fila, col, informe):
    """Convierte una fila del Excel en un diccionario con los campos de la web."""
    celda = lambda clave: fila[col[clave]]
    num_fila = celda("nombre").row
    avisos = []

    # Textos y listas
    nombre = limpiar_texto(celda("nombre").value)
    provincia_texto = limpiar_texto(celda("provincia").value)
    estado = celda("estado").value
    firme = limpiar_texto(celda("firme").value) or "No consta"

    # Números
    distancia = convertir_distancia(celda("longitud").value)
    if distancia is None:
        avisos.append("Distancia no interpretable")
    duracion = convertir_duracion(celda("duracion").value)
    if duracion is None:
        avisos.append("Duración no interpretable")

    # Dificultad
    dificultad, conocida = convertir_dificultad(celda("dificultad").value)
    if not conocida:
        avisos.append(f"Dificultad desconocida: '{dificultad}'")
        informe["dificultades_raras"].append((num_fila, dificultad))

    # Avisos de estado
    comentario_estado = texto_comentario(celda("estado"))
    if comentario_estado:
        avisos.append(comentario_estado)
    if estado == "Cerrada temporalmente":
        avisos.append("Cerrada temporalmente")
    if estado == "Acondicionada" and "sin acondicionar" in firme.lower():
        avisos.append("Estado y firme incoherentes: revisar")

    # Comentarios de coordenadas: fuentes (URL) o avisos (fiabilidad)
    coordenadas_fiables = True
    urls = {}
    for clave in ("entrada", "salida"):
        comentario = texto_comentario(celda(clave))
        if not comentario:
            continue
        if es_fuente(comentario):
            urls[clave] = extraer_url(comentario)
        else:
            coordenadas_fiables = False
            avisos.append(comentario)
    fuente_url = urls.get("entrada") or urls.get("salida")
    if "entrada" in urls and "salida" in urls and urls["entrada"] != urls["salida"]:
        informe["urls_distintas"].append((num_fila, urls["entrada"], urls["salida"]))

    # Coordenadas
    lat_ini, lon_ini = convertir_coordenadas(celda("entrada").value)
    if lat_ini is None:
        avisos.append("Coordenadas de entrada no interpretables")
    lat_fin, lon_fin = convertir_coordenadas(celda("salida").value)
    if lat_fin is None:
        avisos.append("Coordenadas de salida no interpretables")
    elif (lat_ini, lon_ini) == (lat_fin, lon_fin):
        lat_fin, lon_fin = None, None
        avisos.append("Sin punto final distinto del inicio")

    return {
        "id": id_ruta,
        "nombre": nombre,
        "provincias": separar_lista(provincia_texto),
        "provincia_texto": provincia_texto,
        "comunidades": separar_lista(celda("comunidad").value),
        "distancia_km": distancia,
        "duracion_horas": duracion,
        "dificultad": dificultad,
        "latitud_inicio": lat_ini,
        "longitud_inicio": lon_ini,
        "latitud_fin": lat_fin,
        "longitud_fin": lon_fin,
        "descripcion": limpiar_texto(celda("recorrido").value),
        "firme": firme,
        "estado": estado,
        "avisos": avisos,
        "coordenadas_fiables": coordenadas_fiables,
        "fuente_url": fuente_url,
        "fuente": FUENTE,
    }


def leer_rutas():
    """Lee la hoja y devuelve (rutas, nº de filas leídas, {id: fila Excel}, informe)."""
    libro = openpyxl.load_workbook(EXCEL)  # sin read_only: hace falta para leer comentarios
    hoja = libro[HOJA]
    col = localizar_columnas(hoja)
    informe = {"dificultades_raras": [], "urls_distintas": []}
    rutas, filas_excel, leidas = [], {}, 0

    for fila in hoja.iter_rows(min_row=2):
        if all(c.value is None for c in fila[:12]):
            continue  # fila totalmente vacía
        leidas += 1
        ruta = construir_ruta(len(rutas) + 1, fila, col, informe)
        rutas.append(ruta)
        filas_excel[ruta["id"]] = fila[0].row
    return rutas, leidas, filas_excel, informe


# --- Escritura -----------------------------------------------------------------

def escribir_json(rutas):
    with open(SALIDA_JSON, "w", encoding="utf-8") as f:
        json.dump(rutas, f, ensure_ascii=False, indent=2)


def escribir_js(rutas):
    """Mismo contenido que rutas.json, como variable global para cargar con <script>."""
    with open(SALIDA_JS, "w", encoding="utf-8") as f:
        f.write("// Generado por scripts/limpiar_rutas.py. No editar a mano.\n")
        f.write("const RUTAS = ")
        json.dump(rutas, f, ensure_ascii=False, indent=2)
        f.write(";\n")


def escribir_csv(rutas):
    campos = list(rutas[0].keys())
    with open(SALIDA_CSV, "w", encoding="utf-8-sig", newline="") as f:
        escritor = csv.DictWriter(f, fieldnames=campos)
        escritor.writeheader()
        for ruta in rutas:
            fila = {k: (" | ".join(v) if isinstance(v, list) else v) for k, v in ruta.items()}
            escritor.writerow(fila)


# --- Informe de validación -----------------------------------------------------

def titulo(texto):
    print(f"\n{'=' * 70}\n{texto}\n{'=' * 70}")


def mostrar_registro(ruta, filas_excel):
    print(f"\n--- id {ruta['id']} (fila Excel {filas_excel[ruta['id']]}) ---")
    print(json.dumps(ruta, ensure_ascii=False, indent=2))


def filas_sospechosas(rutas, filas_excel):
    """Lista de (id, fila Excel, nombre, motivo). No corrige nada."""
    sospechosas = []
    nombres = Counter(r["nombre"] for r in rutas)
    for r in rutas:
        motivos = []
        for tipo in ("inicio", "fin"):
            lat, lon = r[f"latitud_{tipo}"], r[f"longitud_{tipo}"]
            if lat is None or lon is None:
                if not (tipo == "fin" and "Sin punto final distinto del inicio" in r["avisos"]):
                    motivos.append(f"coordenadas de {tipo} ausentes")
            elif not (27 <= lat <= 44.5) or not (-19 <= lon <= 5):
                motivos.append(f"coordenadas de {tipo} fuera de rango ({lat}, {lon})")
        if nombres[r["nombre"]] > 1:
            motivos.append("nombre duplicado")
        if r["distancia_km"] is not None and r["distancia_km"] <= 0:
            motivos.append(f"distancia_km <= 0 ({r['distancia_km']})")
        if r["distancia_km"] is not None and r["duracion_horas"] is not None:
            esperada = r["distancia_km"] / 5
            if abs(r["duracion_horas"] - esperada) > 0.25:
                motivos.append(f"duración {r['duracion_horas']} h vs distancia/5 = {esperada:.2f} h")
        for motivo in motivos:
            sospechosas.append((r["id"], filas_excel[r["id"]], r["nombre"], motivo))
    return sospechosas


def imprimir_informe(rutas, leidas, filas_excel, informe):
    titulo("1. Filas leídas y escritas")
    print(f"Filas leídas del Excel: {leidas}")
    print(f"Registros escritos:     {len(rutas)}")
    print("OK: coinciden" if leidas == len(rutas) == 136 else "ATENCIÓN: no son 136 o no coinciden")

    titulo("2. Valores distintos de dificultad y estado")
    print("Dificultad:", dict(Counter(r["dificultad"] for r in rutas)))
    print("Estado:    ", dict(Counter(r["estado"] for r in rutas)))
    for fila, valor in informe["dificultades_raras"]:
        print(f"  AVISO: dificultad desconocida '{valor}' en la fila {fila} (no se ha cambiado)")

    titulo("3. Provincias y comunidades distintas (separadas)")
    provincias = sorted({p for r in rutas for p in r["provincias"]})
    comunidades = sorted({c for r in rutas for c in r["comunidades"]})
    print(f"Provincias distintas:  {len(provincias)}")
    print(f"Comunidades distintas: {len(comunidades)} -> {', '.join(comunidades)}")

    titulo("4. Rutas con avisos")
    con_avisos = [r for r in rutas if r["avisos"]]
    for r in con_avisos:
        print(f"- id {r['id']} (fila {filas_excel[r['id']]}) {r['nombre']}")
        for aviso in r["avisos"]:
            print(f"    · {aviso}")
    print(f"Total: {len(con_avisos)} rutas con avisos")
    if informe["urls_distintas"]:
        for fila, url_k, url_l in informe["urls_distintas"]:
            print(f"AVISO fila {fila}: la URL de Coord. salida es distinta de la de entrada:\n  K: {url_k}\n  L: {url_l}")
    else:
        print("URLs de fuente: cuando hay comentario en K y L, coinciden.")

    titulo("5. Filas sospechosas (no se han corregido)")
    sospechosas = filas_sospechosas(rutas, filas_excel)
    for id_ruta, fila, nombre, motivo in sospechosas:
        print(f"- id {id_ruta} (fila {fila}) {nombre}: {motivo}")
    print(f"Total: {len(sospechosas)} incidencias")

    titulo("6. Registros para comparar con el Excel (filas 3, 20, 50, 124 y rutas con avisos)")
    fila_a_id = {fila: i for i, fila in filas_excel.items()}
    ids = sorted({fila_a_id[f] for f in (3, 20, 50, 124)} | {r["id"] for r in con_avisos})
    for id_ruta in ids:
        mostrar_registro(rutas[id_ruta - 1], filas_excel)
    print("\nComprobación de duraciones > 24 h:")
    for fila, esperado in ((20, 25.5), (124, 25.0)):
        valor = rutas[fila_a_id[fila] - 1]["duracion_horas"]
        print(f"  fila {fila}: {valor} h (esperado {esperado}) -> {'OK' if valor == esperado else 'ERROR'}")

    titulo("7. Primer registro del JSON")
    mostrar_registro(rutas[0], filas_excel)


def main():
    sys.stdout.reconfigure(encoding="utf-8")  # la consola de Windows no es UTF-8 por defecto
    rutas, leidas, filas_excel, informe = leer_rutas()
    escribir_json(rutas)
    escribir_csv(rutas)
    escribir_js(rutas)
    print(f"Generados: {SALIDA_JSON.relative_to(RAIZ)}, {SALIDA_CSV.relative_to(RAIZ)} y {SALIDA_JS.relative_to(RAIZ)}")
    imprimir_informe(rutas, leidas, filas_excel, informe)


if __name__ == "__main__":
    main()
