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

case "${1:-install}" in
    install|upgrade)
        if kpackagetool6 -t Plasma/Applet -l 2>/dev/null | grep -q "^${PLUGIN_ID}$"; then
            echo "Upgrading existing ${PLUGIN_ID}..."
            kpackagetool6 -t Plasma/Applet -u "${PACKAGE_DIR}"
        else
            echo "Installing ${PLUGIN_ID}..."
            kpackagetool6 -t Plasma/Applet -i "${PACKAGE_DIR}"
        fi
        echo
        echo "Done. Add the widget to your panel/desktop via 'Add Widgets...'"
        echo "If it doesn't appear, restart plasmashell:"
        echo "  kquitapp6 plasmashell && kstart plasmashell"
        ;;
    remove|uninstall)
        echo "Removing ${PLUGIN_ID}..."
        kpackagetool6 -t Plasma/Applet -r "${PLUGIN_ID}"
        ;;
    *)
        echo "Usage: $0 [install|remove]" >&2
        exit 1
        ;;
esac
