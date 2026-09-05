#!/usr/bin/env bash
#
# Build and (optionally) install the QR Code Forge Flatpak.
#
#   scripts/build-flatpak.sh            build + install locally
#   scripts/build-flatpak.sh --bundle   also produce a single-file .flatpak bundle
#   scripts/build-flatpak.sh --no-install
#
# The manifest builds from a clean staged tree (git archive or rsync excludes),
# so stray node_modules / build outputs never leak into the sandbox build.
set -euo pipefail
cd "$(dirname "$0")/.."

APP_ID=io.github.lakisan1.qrcodeforge
VERSION=$(node -p "require('./package.json').version")
STAGING=.flatpak-src
BUILD_DIR=build-flatpak
REPO_DIR="$BUILD_DIR/repo"

DO_INSTALL=1
DO_BUNDLE=0
for arg in "$@"; do
  case "$arg" in
    --bundle) DO_BUNDLE=1 ;;
    --no-install) DO_INSTALL=0 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

echo "==> staging clean source tree"
rm -rf "$STAGING"
mkdir -p "$STAGING"
if git rev-parse --git-dir >/dev/null 2>&1; then
  git archive HEAD | tar -x -C "$STAGING"
else
  rsync -a \
    --exclude node_modules --exclude dist --exclude dist-electron \
    --exclude release --exclude "$STAGING" --exclude "$BUILD_DIR" \
    --exclude .git --exclude dist-flatpak \
    ./ "$STAGING"/
fi

echo "==> ensuring runtimes (flathub: freedesktop 24.08 + electron baseapp + node22 sdk)"
flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak install --user -y --noninteractive flathub \
  org.freedesktop.Platform//24.08 \
  org.freedesktop.Sdk//24.08 \
  org.electronjs.Electron2.BaseApp//24.08 \
  org.freedesktop.Sdk.Extension.node22//24.08

echo "==> flatpak-builder"
# --share=network: npm ci must reach the registry inside the build sandbox
flatpak-builder --user --share=network --force-clean \
  $([ "$DO_INSTALL" = 1 ] && echo --install) \
  --repo="$REPO_DIR" "$BUILD_DIR/build" \
  "$STAGING/flatpak/$APP_ID.yml"

if [ "$DO_BUNDLE" = 1 ]; then
  echo "==> building single-file bundle"
  mkdir -p release/flatpak
  flatpak build-bundle "$REPO_DIR" \
    "release/flatpak/QR-Code-Forge-$VERSION.flatpak" \
    "$APP_ID" stable \
    --runtime-repo=https://dl.flathub.org/repo/flathub.flatpakrepo
  echo "==> release/flatpak/QR-Code-Forge-$VERSION.flatpak"
fi

echo "==> done"
[ "$DO_INSTALL" = 1 ] && echo "run it:  flatpak run $APP_ID"
