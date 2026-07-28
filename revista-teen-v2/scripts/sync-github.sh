#!/usr/bin/env bash
# Envia o projeto para github.com/pxdrik/Revista-Teen-Espro, na pasta revista-teen-v2/.
#
# O repositorio guarda duas versoes lado a lado (revista-teen/ e revista-teen-v2/),
# por isso o projeto local nao e a raiz do repo. Este script clona o remoto num
# diretorio temporario, copia o projeto para dentro da subpasta correta, commita
# e envia. Nada do que ja existe no repositorio e apagado.
#
# Uso:  bash scripts/sync-github.sh "mensagem do commit"
set -euo pipefail

REPO="https://github.com/pxdrik/Revista-Teen-Espro.git"
SUBDIR="revista-teen-v2"
PROJ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
MSG="${1:-Atualiza Revista Teen V2}"

echo "==> validando antes de enviar"
cd "$PROJ"
npm run build --silent
node scripts/audit.mjs

echo "==> clonando remoto"
git clone -q "$REPO" "$TMP"

echo "==> copiando projeto para $SUBDIR/"
rm -rf "${TMP:?}/$SUBDIR"
mkdir -p "$TMP/$SUBDIR"
tar -cf - -C "$PROJ" \
  --exclude=./node_modules --exclude=./dist --exclude=./.astro --exclude=./.git . \
  | tar -xf - -C "$TMP/$SUBDIR"

echo "==> commitando"
cd "$TMP"
git add -A
if git diff --cached --quiet; then
  echo "nada mudou, nada a enviar."
  rm -rf "$TMP"
  exit 0
fi
git commit -q -m "$MSG"
git push origin main

echo "==> enviado"
git log -1 --format="%h  %s"
rm -rf "$TMP"
