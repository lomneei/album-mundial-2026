#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Convierte raw.txt (checklist del album) en data.js para la PWA."""
import json, re

# Nombre en espanol + bandera por codigo de equipo
TEAM_ES = {
    "MEX": ("Mexico", "Mexico", "MX"), "RSA": ("South Africa", "Sudafrica", "ZA"),
    "KOR": ("South Korea", "Corea del Sur", "KR"), "CZE": ("Czechia", "Chequia", "CZ"),
    "CAN": ("Canada", "Canada", "CA"), "BIH": ("Bosnia and Herzegovina", "Bosnia y Herzegovina", "BA"),
    "QAT": ("Qatar", "Catar", "QA"), "SUI": ("Switzerland", "Suiza", "CH"),
    "BRA": ("Brazil", "Brasil", "BR"), "MAR": ("Morocco", "Marruecos", "MA"),
    "HAI": ("Haiti", "Haiti", "HT"), "SCO": ("Scotland", "Escocia", "GB-SCT"),
    "USA": ("USA", "Estados Unidos", "US"), "PAR": ("Paraguay", "Paraguay", "PY"),
    "AUS": ("Australia", "Australia", "AU"), "TUR": ("Turkiye", "Turquia", "TR"),
    "GER": ("Germany", "Alemania", "DE"), "CUW": ("Curacao", "Curazao", "CW"),
    "CIV": ("Ivory Coast", "Costa de Marfil", "CI"), "ECU": ("Ecuador", "Ecuador", "EC"),
    "NED": ("Netherlands", "Paises Bajos", "NL"), "JPN": ("Japan", "Japon", "JP"),
    "SWE": ("Sweden", "Suecia", "SE"), "TUN": ("Tunisia", "Tunez", "TN"),
    "BEL": ("Belgium", "Belgica", "BE"), "EGY": ("Egypt", "Egipto", "EG"),
    "IRN": ("Iran", "Iran", "IR"), "NZL": ("New Zealand", "Nueva Zelanda", "NZ"),
    "ESP": ("Spain", "Espana", "ES"), "CPV": ("Cape Verde", "Cabo Verde", "CV"),
    "KSA": ("Saudi Arabia", "Arabia Saudita", "SA"), "URU": ("Uruguay", "Uruguay", "UY"),
    "FRA": ("France", "Francia", "FR"), "SEN": ("Senegal", "Senegal", "SN"),
    "IRQ": ("Iraq", "Irak", "IQ"), "NOR": ("Norway", "Noruega", "NO"),
    "ARG": ("Argentina", "Argentina", "AR"), "ALG": ("Algeria", "Argelia", "DZ"),
    "AUT": ("Austria", "Austria", "AT"), "JOR": ("Jordan", "Jordania", "JO"),
    "POR": ("Portugal", "Portugal", "PT"), "COD": ("Congo DR", "RD del Congo", "CD"),
    "UZB": ("Uzbekistan", "Uzbekistan", "UZ"), "COL": ("Colombia", "Colombia", "CO"),
    "ENG": ("England", "Inglaterra", "GB-ENG"), "CRO": ("Croatia", "Croacia", "HR"),
    "GHA": ("Ghana", "Ghana", "GH"), "PAN": ("Panama", "Panama", "PA"),
}

# Banderas como emoji a partir del codigo ISO (regional indicators); casos especiales aparte.
SPECIAL_FLAG = {"GB-SCT": "\U0001F3F4\U000E0067\U000E0062\U000E0073\U000E0063\U000E0074\U000E007F",
                "GB-ENG": "\U0001F3F4\U000E0067\U000E0062\U000E0065\U000E006E\U000E0067\U000E007F"}
def flag_for(iso):
    if iso in SPECIAL_FLAG: return SPECIAL_FLAG[iso]
    return "".join(chr(0x1F1E6 + ord(c) - ord('A')) for c in iso)

stickers = []
with open("raw.txt", encoding="utf-8") as f:
    lines = [l.rstrip("\n") for l in f if l.strip()]

for i, line in enumerate(lines, start=1):
    foil = line.endswith("FOIL")
    body = line[:-5].rstrip() if foil else line
    code, rest = body.split(" ", 1)
    m = re.match(r"^([A-Z]{2,3})(\d+)$", code)
    is_special = (code == "00") or code.startswith("FWC")
    if is_special:
        num = 0 if code == "00" else int(code[3:])
        section = "Apertura" if num <= 8 else "Historia Mundialista"
        group_code = "OPEN" if num <= 8 else "HIST"
        flag = "\U0001F3DF\uFE0F" if num <= 8 else "\U0001F3C6"
        # nombre = todo el texto descriptivo
        name = rest.strip()
        stickers.append({"code": code, "idx": i, "name": name, "type": "special",
                         "foil": foil, "team": section, "teamES": section,
                         "groupCode": group_code, "flag": flag})
    else:
        team_code = m.group(1)
        num = int(m.group(2))
        left, team_en = rest.split(" - ", 1)
        left = left.strip(); team_en = team_en.strip()
        en, es, iso = TEAM_ES.get(team_code, (team_en, team_en, "UN"))
        if num == 1:
            stype = "badge"; name = "Escudo"
        elif left.lower() == "team photo":
            stype = "team_photo"; name = "Foto del equipo"
        else:
            stype = "player"; name = left
        stickers.append({"code": code, "idx": i, "name": name, "type": stype,
                         "foil": foil, "team": en, "teamES": es,
                         "groupCode": team_code, "flag": flag_for(iso)})

# Lista de grupos en orden de aparicion (para el filtro)
seen = []
for s in stickers:
    key = s["groupCode"]
    if key not in [g["code"] for g in seen]:
        seen.append({"code": key, "label": s["teamES"], "flag": s["flag"]})

data = {"total": len(stickers), "stickers": stickers, "groups": seen}

js = "// Datos del album Panini FIFA World Cup 2026 (980 laminas).\n"
js += "// Generado automaticamente. Editable: corrige nombres/codigos si tu edicion difiere.\n"
js += "window.WC26_DATA = " + json.dumps(data, ensure_ascii=False, indent=0) + ";\n"
with open("data.js", "w", encoding="utf-8") as f:
    f.write(js)

# Reporte
from collections import Counter
c = Counter(s["type"] for s in stickers)
print("Total:", len(stickers))
print("Por tipo:", dict(c))
print("Equipos/secciones:", len(seen))
assert len(stickers) == 980, "Se esperaban 980 laminas"
print("OK")
