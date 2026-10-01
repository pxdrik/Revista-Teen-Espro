"""
Baixa o Google Docs de pauta da Revista Teen e grava um retrato legível em
.doc-snapshot/: texto.txt com os parágrafos em ordem e uma marca [IMG images/x]
no ponto exato de cada imagem, mais a pasta images/ com os arquivos.

É a entrada da rotina semanal (docs/rotina-semanal.md). O documento precisa estar
com o link público de leitura; nenhuma credencial é usada.

Uso:  python3 scripts/doc-snapshot.py
"""
import io
import re
import shutil
import sys
import urllib.request
import zipfile
from html.parser import HTMLParser
from pathlib import Path

DOC_ID = "11SbjxcK3P4mZzPWTos-_PmdKjQi0pcr1oP4Q2bkdmD8"
URL = f"https://docs.google.com/document/d/{DOC_ID}/export?format=zip"
OUT = Path(__file__).resolve().parent.parent / ".doc-snapshot"


class Flatten(HTMLParser):
    """Vira o HTML exportado em linhas: um parágrafo ou título por linha, imagens como marca."""

    BLOCK = {"p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "tr"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.lines, self.buf, self.prefix, self.skip = [], [], "", 0

    def flush(self):
        text = re.sub(r"\s+", " ", "".join(self.buf)).strip()
        if text:
            self.lines.append(self.prefix + text)
        self.buf, self.prefix = [], ""

    def handle_starttag(self, tag, attrs):
        if tag in ("style", "script", "head"):
            self.skip += 1
        elif tag in self.BLOCK:
            self.flush()
            if tag in ("h1", "h2", "h3"):
                self.prefix = "#" * int(tag[1]) + " "
        elif tag == "img":
            self.flush()
            src = dict(attrs).get("src", "")
            self.lines.append(f"[IMG {src}]")
        elif tag == "br":
            self.buf.append(" ")

    def handle_endtag(self, tag):
        if tag in ("style", "script", "head"):
            self.skip -= 1
        elif tag in self.BLOCK:
            self.flush()

    def handle_data(self, data):
        if not self.skip:
            self.buf.append(data)


def main():
    with urllib.request.urlopen(URL, timeout=120) as res:
        if "zip" not in res.headers.get("content-type", ""):
            sys.exit("O Docs não veio como zip. O link público de leitura está ativo?")
        data = res.read()

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        z.extractall(OUT)
        page = next(n for n in z.namelist() if n.endswith(".html"))

    parser = Flatten()
    parser.feed((OUT / page).read_text(encoding="utf-8"))
    parser.flush()
    (OUT / "texto.txt").write_text("\n".join(parser.lines) + "\n", encoding="utf-8")

    images = sum(1 for l in parser.lines if l.startswith("[IMG "))
    print(f"{len(parser.lines)} linhas, {images} imagens -> {OUT / 'texto.txt'}")


if __name__ == "__main__":
    main()
