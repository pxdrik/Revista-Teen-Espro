#!/usr/bin/env bash
# Traz para esta pasta o que mudou em revista-teen-v2/ no GitHub (em geral, os posts
# que a rotina semanal agendou). Copia por cima dos arquivos locais e mostra o que
# mudou, ja preparado (git add); o commit local fica com voce. Arquivo apagado no GitHub nao e apagado aqui.
#
# Uso:  bash scripts/pull-github.sh
set -euo pipefail

REPO="${SYNC_REPO:-https://github.com/pxdrik/Revista-Teen-Espro.git}"
SUBDIR="revista-teen-v2"
PROJ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
MARK="$PROJ/.git/sync-remote-head"

if [ -n "$(git -C "$PROJ" status --porcelain)" ]; then
  echo "!! ha mudancas locais sem commit. Commite ou descarte antes de puxar."
  exit 1
fi

git clone -q "$REPO" "$TMP"
[ -f "$MARK" ] && git -C "$TMP" log --format='  %h %ad %s' --date=short "$(cat "$MARK")"..HEAD -- "$SUBDIR"

tar -cf - -C "$TMP/$SUBDIR" \
  --exclude=./node_modules --exclude=./dist --exclude=./.astro . \
  | tar -xf - -C "$PROJ"
git -C "$TMP" rev-parse HEAD > "$MARK"
rm -rf "$TMP"

# o add normaliza CRLF/LF: sobra so mudanca de conteudo de verdade
git -C "$PROJ" add -A
echo "==> mudancas trazidas do GitHub (prontas para commit):"
git -C "$PROJ" status --short
