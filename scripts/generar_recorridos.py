"""
SCRUM-44 · Recorrido completo de la ruta en el mapa

Genera data/recorridos.js con el trazado de cada vía verde, para que el mapa
de la ficha (js/mapa.js) dibuje por dónde va la ruta.

Fuente: "Vías Verdes" del Centro de Descargas del CNIG (IGN), formato GeoPackage.
https://centrodedescargas.cnig.es/CentroDescargas/vias-verdes
Licencia CC BY 4.0: hay que citar "CNIG-IGN / Fundación de los Ferrocarriles Españoles".

Uso (desde la carpeta del proyecto):
    1. Descargar ViasVerdes.gpkg y guardarlo en data/original/
       (no se sube a GitHub porque ocupa unos 22 MB).
    2. python scripts/generar_recorridos.py

Qué hace:
    - Lee las rutas de data/rutas.js (las 136 que muestra la web).
    - Lee los trazados del GeoPackage (solo usa Python, sin instalar nada).
    - Une cada ruta con su trazado: mismo nombre y cerca del inicio y del fin.
    - Junta los tramos sueltos y quita puntos sobrantes (precisión unos 20 m)
      para que el archivo pese poco y la ficha cargue rápido.
    - Escribe data/recorridos.js con la variable RECORRIDOS.
"""

import json
import math
import re
import sqlite3
import struct
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
GPKG = RAIZ / "data" / "original" / "ViasVerdes.gpkg"
RUTAS_JS = RAIZ / "data" / "rutas.js"
SALIDA = RAIZ / "data" / "recorridos.js"

TOLERANCIA = 0.0002   # grados (unos 20 m): cuánto se simplifica la línea
DISTANCIA_MAX_KM = 3  # si inicio o fin quedan más lejos, se avisa para revisarlo


# ---------- Leer la geometría del GeoPackage (formato WKB) ----------

def quitar_cabecera_gpkg(blob):
    """El GeoPackage añade una cabecera antes de la geometría estándar (WKB)."""
    flags = blob[3]
    envoltura = (flags >> 1) & 7
    bytes_envoltura = {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}[envoltura]
    return blob[8 + bytes_envoltura:]


def leer_wkb(wkb, pos=0):
    """Devuelve una lista de líneas; cada línea es una lista de (lon, lat)."""
    orden = "<" if wkb[pos] == 1 else ">"
    tipo = struct.unpack(orden + "I", wkb[pos + 1:pos + 5])[0]
    pos += 5
    dimensiones = 2
    if tipo >= 3000:
        dimensiones, tipo = 4, tipo - 3000
    elif tipo >= 1000:
        dimensiones, tipo = 3, tipo % 1000

    if tipo == 2:  # LineString
        n = struct.unpack(orden + "I", wkb[pos:pos + 4])[0]
        pos += 4
        puntos = []
        for _ in range(n):
            valores = struct.unpack(orden + "d" * dimensiones, wkb[pos:pos + 8 * dimensiones])
            pos += 8 * dimensiones
            puntos.append((valores[0], valores[1]))
        return [puntos], pos

    if tipo in (5, 9, 11):  # MultiLineString, CompoundCurve, MultiCurve
        n = struct.unpack(orden + "I", wkb[pos:pos + 4])[0]
        pos += 4
        lineas = []
        for _ in range(n):
            partes, pos = leer_wkb(wkb, pos)
            lineas += partes
        if tipo == 9:
            lineas = [[p for linea in lineas for p in linea]]
        return lineas, pos

    raise ValueError("Tipo de geometría no soportado: %d" % tipo)


# ---------- Preparar las líneas ----------

def clave(p):
    return (round(p[0], 6), round(p[1], 6))


def unir_tramos(lineas):
    """Junta los tramos que se tocan para que la ruta sea una línea continua."""
    tramos = [list(l) for l in lineas if len(l) >= 2]
    por_inicio, por_fin = {}, {}
    for i, t in enumerate(tramos):
        por_inicio.setdefault(clave(t[0]), []).append(i)
        por_fin.setdefault(clave(t[-1]), []).append(i)

    usado = [False] * len(tramos)
    orden = [i for i, t in enumerate(tramos) if clave(t[0]) not in por_fin] + list(range(len(tramos)))
    resultado = []
    for i in orden:
        if usado[i]:
            continue
        usado[i] = True
        linea = tramos[i][:]
        while True:
            siguiente = [j for j in por_inicio.get(clave(linea[-1]), []) if not usado[j]]
            if siguiente:
                usado[siguiente[0]] = True
                linea += tramos[siguiente[0]][1:]
                continue
            siguiente = [j for j in por_fin.get(clave(linea[-1]), []) if not usado[j]]
            if siguiente:
                usado[siguiente[0]] = True
                linea += tramos[siguiente[0]][::-1][1:]
                continue
            break
        resultado.append(linea)
    return resultado


def simplificar(puntos, tolerancia):
    """Algoritmo de Douglas-Peucker: quita puntos que casi no cambian la forma."""
    if len(puntos) < 3:
        return puntos
    mantener = [False] * len(puntos)
    mantener[0] = mantener[-1] = True
    pendientes = [(0, len(puntos) - 1)]
    while pendientes:
        a, b = pendientes.pop()
        ax, ay = puntos[a]
        bx, by = puntos[b]
        dx, dy = bx - ax, by - ay
        largo = dx * dx + dy * dy
        indice, maxima = -1, 0.0
        for i in range(a + 1, b):
            px, py = puntos[i]
            if largo == 0:
                d = (px - ax) ** 2 + (py - ay) ** 2
            else:
                t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / largo))
                d = (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2
            if d > maxima:
                indice, maxima = i, d
        if maxima > tolerancia * tolerancia:
            mantener[indice] = True
            pendientes += [(a, indice), (indice, b)]
    return [p for p, m in zip(puntos, mantener) if m]


# ---------- Unir cada ruta con su trazado ----------

def normalizar(nombre):
    texto = unicodedata.normalize("NFKD", nombre.lower())
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    texto = re.sub(r"camino natural|via verde|\bvv\b|[^a-z0-9 ]", " ", texto)
    return " ".join(texto.split())


def distancia_km(lat, lon, puntos):
    """Distancia aproximada (km) desde un punto al punto más cercano de la línea."""
    coseno = math.cos(math.radians(lat))
    return min(math.hypot((p[0] - lon) * 111 * coseno, (p[1] - lat) * 111) for p in puntos)


def leer_rutas():
    texto = RUTAS_JS.read_text(encoding="utf-8")
    return json.loads(texto[texto.index("["):texto.rindex("]") + 1])


def leer_trazados():
    conexion = sqlite3.connect(str(GPKG))
    trazados = []
    for geom, nombre in conexion.execute("SELECT geom, nombre FROM ViasVerdes"):
        lineas, _ = leer_wkb(quitar_cabecera_gpkg(geom))
        lineas = [simplificar(l, TOLERANCIA) for l in unir_tramos(lineas)]
        puntos = [p for l in lineas for p in l]
        trazados.append({"nombre": nombre, "normalizado": normalizar(nombre),
                         "lineas": lineas, "puntos": puntos})
    conexion.close()
    return trazados


def buscar_trazado(ruta, trazados):
    """Prioriza el mismo nombre y, entre los candidatos, el más cercano a inicio y fin."""
    lat_i, lon_i = ruta["latitud_inicio"], ruta["longitud_inicio"]
    lat_f, lon_f = ruta["latitud_fin"], ruta["longitud_fin"]
    mejor = None
    for t in trazados:
        d_inicio = distancia_km(lat_i, lon_i, t["puntos"])
        d_fin = distancia_km(lat_f, lon_f, t["puntos"])
        puntuacion = (0 if t["normalizado"] == normalizar(ruta["nombre"]) else 1, d_inicio + d_fin)
        if mejor is None or puntuacion < mejor[0]:
            mejor = (puntuacion, t, d_inicio, d_fin)
    return mejor[1], mejor[2], mejor[3]


def main():
    if not GPKG.exists():
        raise SystemExit("Falta %s: descárgalo del Centro de Descargas del CNIG." % GPKG)

    rutas = leer_rutas()
    trazados = leer_trazados()
    recorridos = {}
    for ruta in rutas:
        trazado, d_inicio, d_fin = buscar_trazado(ruta, trazados)
        if d_inicio > DISTANCIA_MAX_KM or d_fin > DISTANCIA_MAX_KM:
            print("Revisar ruta %d (%s): inicio a %.1f km y fin a %.1f km del trazado"
                  % (ruta["id"], ruta["nombre"], d_inicio, d_fin))
        # Leaflet usa [latitud, longitud]; 5 decimales = precisión de 1 m
        recorridos[ruta["id"]] = [[[round(lat, 5), round(lon, 5)] for lon, lat in linea]
                                  for linea in trazado["lineas"] if len(linea) >= 2]

    cabecera = (
        "// SCRUM-44 · Trazado de cada vía verde para el mapa de la ficha.\n"
        "// Generado con scripts/generar_recorridos.py: NO editar a mano.\n"
        "// Fuente: CNIG-IGN / Fundación de los Ferrocarriles Españoles (CC BY 4.0).\n"
        "// Formato: { idRuta: [ [ [lat, lon], [lat, lon], ... ], ...otros tramos ] }\n"
    )
    datos = json.dumps(recorridos, separators=(",", ":"))
    SALIDA.write_text(cabecera + "const RECORRIDOS = " + datos + ";\n", encoding="utf-8")
    total = sum(len(l) for r in recorridos.values() for l in r)
    print("Generado %s: %d rutas con recorrido, %d puntos" % (SALIDA.name, len(recorridos), total))


if __name__ == "__main__":
    main()
