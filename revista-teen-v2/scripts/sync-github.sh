#!/usr/bin/env bash
# Envia o projeto para github.com/pxdrik/Revista-Teen-Espro, na pasta revista-teen-v2/.
#
# O repositorio guarda duas versoes lado a lado (revista-teen/ e revista-teen-v2/),
# por isso o projeto local nao e a raiz do repo. Este script clona o remoto num
# diretorio temporario, copia o projeto para dentro da subpasta correta, commita
# e envia. Nada fora de revista-teen-v2/ e tocado.
#
# Se alguem commitar direto no GitHub (outra maquina, edicao pelo site do GitHub),
# o envio local apagaria essa mudanca. Por isso o script guarda em .git/sync-remote-head o commit remoto do
# ultimo envio ou pull, e se recusa a enviar se a pasta mudou no GitHub depois
# disso. Nesse caso: bash scripts/pull-github.sh, commit, e envie de novo.
#
# Uso:  bash scripts/sync-github.sh "mensagem do commit"
set -euo pipefail

REPO="${SYNC_REPO:-https://github.com/pxdrik/Revista-Teen-Espro.git}"
SUBDIR="revista-teen-v2"
PROJ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
MSG="${1:-Atualiza Revista Teen V2}"
MARK="$PROJ/.git/sync-remote-head"

echo "==> validando antes de enviar"
cd "$PROJ"
npm run build --silent
node scripts/audit.mjs

echo "==> clonando remoto"
git clone -q "$REPO" "$TMP"

if [ -f "$MARK" ]; then
  NOVOS="$(git -C "$TMP" log --format='  %h %ad %s' --date=short "$(cat "$MARK")"..HEAD -- "$SUBDIR")"
  if [ -n "$NOVOS" ]; then
    echo "!! o GitHub tem mudancas em $SUBDIR/ que nao estao aqui:"
    echo "$NOVOS"
    echo "!! rode: bash scripts/pull-github.sh, commite, e envie de novo."
    rm -rf "$TMP"
    exit 1
  fi
else
  echo "(primeiro envio com protecao: sem registro do ultimo envio, seguindo)"
fi

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
  git rev-parse HEAD > "$MARK"
  rm -rf "$TMP"
  exit 0
fi
git commit -q -m "$MSG"
git push origin main
git rev-parse HEAD > "$MARK"

echo "==> enviado"
git log -1 --format="%h  %s"
rm -rf "$TMP"
