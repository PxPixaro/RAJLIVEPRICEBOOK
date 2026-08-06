#!/usr/bin/env python3
"""Build compact browser data from assets/data/price-book.xlsx using only stdlib."""
from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "data" / "price-book.xlsx"
TARGET = ROOT / "js" / "data.js"
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def key_of(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().upper())


def unique_headers(raw: list[Any]) -> list[str]:
    seen: dict[str, int] = {}
    result: list[str] = []
    for index, value in enumerate(raw):
        base = key_of(value) or f"COLUMN {index + 1}"
        seen[base] = seen.get(base, 0) + 1
        result.append(base if seen[base] == 1 else f"{base} {seen[base]}")
    return result


def column_index(cell_ref: str) -> int:
    match = re.match(r"([A-Z]+)", cell_ref)
    if not match:
        return 0
    value = 0
    for char in match.group(1):
        value = value * 26 + ord(char) - 64
    return value - 1


def number_value(text: str) -> int | float | str:
    if not text:
        return ""
    try:
        number = float(text)
    except ValueError:
        return text
    return int(number) if number.is_integer() else number


def is_empty(value: Any) -> bool:
    text = str(value if value is not None else "").strip()
    return text in {"", "0", "0.0", "0.00"}


def load_rows(path: Path) -> tuple[list[str], list[list[Any]]]:
    with zipfile.ZipFile(path) as archive:
        shared: list[str] = []
        with archive.open("xl/sharedStrings.xml") as handle:
            for _, element in ET.iterparse(handle, events=("end",)):
                if element.tag == NS + "si":
                    shared.append("".join(node.text or "" for node in element.iter(NS + "t")))
                    element.clear()

        raw_header: list[Any] | None = None
        records: list[list[Any]] = []
        with archive.open("xl/worksheets/sheet1.xml") as handle:
            for _, element in ET.iterparse(handle, events=("end",)):
                if element.tag != NS + "row":
                    continue
                values: dict[int, Any] = {}
                for cell in element.findall(NS + "c"):
                    index = column_index(cell.attrib.get("r", "A1"))
                    cell_type = cell.attrib.get("t", "")
                    value_node = cell.find(NS + "v")
                    if cell_type == "s" and value_node is not None and value_node.text is not None:
                        value: Any = shared[int(value_node.text)]
                    elif cell_type == "inlineStr":
                        value = "".join(node.text or "" for node in cell.iter(NS + "t"))
                    elif cell_type == "b" and value_node is not None:
                        value = value_node.text == "1"
                    elif value_node is not None and value_node.text is not None:
                        value = value_node.text if cell_type in {"str", "e"} else number_value(value_node.text)
                    else:
                        value = ""
                    values[index] = value

                if raw_header is None:
                    width = max(values, default=-1) + 1
                    raw_header = [values.get(index, "") for index in range(width)]
                else:
                    width = len(raw_header)
                    row = [values.get(index, "") for index in range(width)]
                    if any(not is_empty(value) for value in row):
                        records.append(row)
                element.clear()

    if raw_header is None:
        raise RuntimeError("Excel sheet is empty")
    return unique_headers(raw_header), records


def compact(headers: list[str], rows: list[list[Any]]) -> tuple[list[list[Any]], list[list[int]]]:
    dictionaries: list[list[Any]] = []
    lookups: list[dict[tuple[str, Any], int]] = []
    for _ in headers:
        dictionaries.append([""])
        lookups.append({("str", ""): 0})

    compact_rows: list[list[int]] = []
    for row in rows:
        encoded: list[int] = []
        for index, value in enumerate(row):
            normalized = "" if value is None else value
            typed_key = (type(normalized).__name__, normalized)
            lookup = lookups[index]
            if typed_key not in lookup:
                lookup[typed_key] = len(dictionaries[index])
                dictionaries[index].append(normalized)
            encoded.append(lookup[typed_key])
        compact_rows.append(encoded)
    return dictionaries, compact_rows


def main() -> int:
    headers, rows = load_rows(SOURCE)
    dictionaries, compact_rows = compact(headers, rows)
    payload = (
        "/* V30 compact dictionary data generated from assets/data/price-book.xlsx. */\n"
        f"window.PRICEBOOK_DATA_FORMAT={json.dumps('DICT_V1')};"
        f"window.PRICEBOOK_COLUMNS={json.dumps(headers, ensure_ascii=False, separators=(',', ':'))};"
        f"window.PRICEBOOK_DICTIONARIES={json.dumps(dictionaries, ensure_ascii=False, separators=(',', ':'))};"
        f"window.PRICEBOOK_ROWS={json.dumps(compact_rows, ensure_ascii=False, separators=(',', ':'))};\n"
    )
    TARGET.write_text(payload, encoding="utf-8")
    print(f"Generated {TARGET}: {len(rows):,} rows, {len(headers)} columns")
    return 0


if __name__ == "__main__":
    sys.exit(main())
