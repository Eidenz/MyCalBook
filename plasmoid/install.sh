#!/usr/bin/env bash
#
# Install (or reinstall) the MyCalBook Plasma 6 widget into the current
# user's local Plasma package directory using kpackagetool6.
#
# Usage:
#   ./install.sh           # install or upgrade
#   ./install.sh remove    # uninstall
#
# After installing, you may need to restart plasmashell:
#   kquitapp6 plasmashell && kstart plasmashell
#

set -euo pipefail

PLUGIN_ID="org.eidenz.mycalbook"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="${SCRIPT_DIR}/package"

if ! command -v kpackagetool6 >/dev/null 2>&1; then
    echo "ERROR: kpackagetool6 not found. Install it via your distro's KDE packages." >&2
    exit 1
fi

# Plasma aggressively caches compiled QML (.qmlc) files. After upgrading
# a package the old cache can stick around and plasmashell will load the
# stale version, often producing confusing error messages that point at
# line numbers from the previous build. We blow away the relevant caches
# on every install/upgrade so changes always take effect.
clear_qml_cache() {
    rm -rf "${HOME}/.cache/plasmashell" \
           "${HOME}/.cache/plasma-svgelements"* \
           "${HOME}/.cache/QML" \
           "${HOME}/.cache/qmlcache" 2>/dev/null || true
}

case "${1:-install}" in
    install|upgrade)
        # Always remove first then install. -u sometimes silently no-ops
        # when the package version matches; this guarantees a clean copy.
        if kpackagetool6 -t Plasma/Applet -l 2>/dev/null | grep -qF "${PLUGIN_ID}"; then
            echo "Removing previous ${PLUGIN_ID}..."
            kpackagetool6 -t Plasma/Applet -r "${PLUGIN_ID}" >/dev/null 2>&1 || true
        fi
        echo "Installing ${PLUGIN_ID}..."
        kpackagetool6 -t Plasma/Applet -i "${PACKAGE_DIR}"
        echo "Clearing Plasma QML caches..."
        clear_qml_cache
        echo
        echo "Done."
        if [[ "${2:-}" == "--reload" ]] || [[ "${1}" == "upgrade" ]]; then
            echo "Restarting plasmashell..."
            kquitapp6 plasmashell 2>/dev/null || true
            sleep 1
            kstart plasmashell >/dev/null 2>&1 &
            disown || true
        else
            echo "Add the widget via 'Add Widgets…'."
            echo "If you upgraded an already-placed widget, restart plasmashell so the new code is loaded:"
            echo "  kquitapp6 plasmashell && kstart plasmashell"
            echo "Or re-run this script as: ./install.sh install --reload"
        fi
        ;;
    remove|uninstall)
        echo "Removing ${PLUGIN_ID}..."
        kpackagetool6 -t Plasma/Applet -r "${PLUGIN_ID}"
        clear_qml_cache
        ;;
    *)
        echo "Usage: $0 [install|remove] [--reload]" >&2
        exit 1
        ;;
esac
