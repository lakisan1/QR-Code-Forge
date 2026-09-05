#!/bin/bash
# Flatpak launcher for QR Code Forge.
# zypak (from the Electron BaseApp) provides the Chromium sandbox without SUID.
export ELECTRON_FORCE_IS_PACKAGED=1
exec zypak-wrapper.sh /app/qrcodeforge/bin/electron /app/qrcodeforge
