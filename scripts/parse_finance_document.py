#!/usr/bin/env python3
"""Private document extraction helper. It reads a local file and returns JSON only."""
import json
import subprocess
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

WORD_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
DRAWING_NS = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
SHEET_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

def xml_text(xml_bytes, namespace):
    root = ET.fromstring(xml_bytes)
    return " ".join(node.text.strip() for node in root.iter(f"{namespace}t") if node.text and node.text.strip())

def read_docx(path):
    with zipfile.ZipFile(path) as archive:
        return xml_text(archive.read("word/document.xml"), WORD_NS), 1

def read_pptx(path):
    sections = []
    with zipfile.ZipFile(path) as archive:
        names = sorted(name for name in archive.namelist() if name.startswith("ppt/slides/slide") and name.endswith(".xml"))
        for index, name in enumerate(names, start=1):
            text = xml_text(archive.read(name), DRAWING_NS)
            if text:
                sections.append(f"[슬라이드 {index}] {text}")
    return "\n".join(sections), len(sections)

def column_name(cell_ref):
    return "".join(char for char in cell_ref if char.isalpha())

def read_xlsx(path):
    sections = []
    with zipfile.ZipFile(path) as archive:
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            shared = ["".join(node.text or "" for node in item.iter(f"{SHEET_NS}t")) for item in root.iter(f"{SHEET_NS}si")]
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        sheets = list(workbook.iter(f"{SHEET_NS}sheet"))
        sheet_files = sorted(name for name in archive.namelist() if name.startswith("xl/worksheets/sheet") and name.endswith(".xml"))
        for index, sheet_file in enumerate(sheet_files):
            sheet_name = sheets[index].attrib.get("name", f"Sheet{index + 1}") if index < len(sheets) else f"Sheet{index + 1}"
            root = ET.fromstring(archive.read(sheet_file))
            rows = []
            for row in root.iter(f"{SHEET_NS}row"):
                values = []
                for cell in row.iter(f"{SHEET_NS}c"):
                    value = cell.find(f"{SHEET_NS}v")
                    if value is None or value.text is None:
                        continue
                    content = shared[int(value.text)] if cell.attrib.get("t") == "s" and int(value.text) < len(shared) else value.text
                    values.append(f"{column_name(cell.attrib.get('r', ''))}: {content}")
                if values:
                    rows.append(" | ".join(values))
            if rows:
                sections.append(f"[시트: {sheet_name}]\n" + "\n".join(rows))
    return "\n\n".join(sections), len(sections)

def read_pdf(path):
    completed = subprocess.run(["pdftotext", str(path), "-"], check=True, capture_output=True, text=True)
    text = completed.stdout.strip()
    return text, max(1, text.count("\f") + 1)

def main():
    path = Path(sys.argv[1])
    extension = path.suffix.lower()
    if extension == ".pdf":
        text, sections = read_pdf(path)
        parser = "pdftotext"
    elif extension == ".docx":
        text, sections = read_docx(path)
        parser = "python-zipxml-docx"
    elif extension == ".xlsx":
        text, sections = read_xlsx(path)
        parser = "python-zipxml-xlsx"
    elif extension == ".pptx":
        text, sections = read_pptx(path)
        parser = "python-zipxml-pptx"
    else:
        raise ValueError("unsupported format")
    print(json.dumps({"text": text, "sections": sections, "parser": parser}, ensure_ascii=False))

if __name__ == "__main__":
    main()
