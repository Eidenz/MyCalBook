import QtQuick
import QtQuick.Layouts
import org.kde.kirigami as Kirigami
import org.kde.plasma.components as PlasmaComponents
import "mycalbook.js" as MyCalBook

// Panel-friendly icon + today's event count badge.
//
// State is passed in as explicit properties from main.qml. The Plasmoid
// reference doesn't expose user-defined QML properties from a separate
// file (it resolves to the C++ Plasma::Applet), so wiring it through
// here is the only reliable approach.
MouseArea {
    id: compact
    hoverEnabled: true

    // --- Properties bound from main.qml -----------------------------------
    property var events: []
    property bool isConfigured: false

    // --- Signal raised back to main.qml -----------------------------------
    signal toggleExpanded()

    readonly property int todayCount: MyCalBook.countToday(compact.events)

    // Click toggles the popup the way every other plasmoid does.
    onClicked: compact.toggleExpanded()

    // The compact representation should adapt to whatever the panel
    // gives us. Use Layout properties so flow correctly.
    Layout.minimumWidth: Kirigami.Units.iconSizes.small
    Layout.minimumHeight: Kirigami.Units.iconSizes.small
    Layout.preferredWidth: Kirigami.Units.iconSizes.medium
    Layout.preferredHeight: Kirigami.Units.iconSizes.medium

    // Calendar icon drawn directly in QML. This sidesteps both XDG icon
    // theme lookups (which were returning the missing-icon placeholder)
    // and Kirigami.Icon's mask rendering (which was filling our bundled
    // SVG's bounding box as a solid rounded square). It also follows the
    // active Plasma theme colour automatically.
    Item {
        id: icon
        anchors.fill: parent
        anchors.margins: Math.max(2, Math.round(parent.width * 0.12))

        readonly property color iconColor: compact.containsMouse
            ? Kirigami.Theme.highlightColor
            : Kirigami.Theme.textColor
        readonly property real strokeWidth: Math.max(1.5, Math.round(width * 0.08))

        // Two binder rings poking out the top of the calendar.
        Rectangle {
            x: icon.width * 0.25 - width / 2
            y: -icon.strokeWidth
            width: icon.strokeWidth
            height: icon.strokeWidth * 3
            radius: width / 2
            color: icon.iconColor
        }
        Rectangle {
            x: icon.width * 0.75 - width / 2
            y: -icon.strokeWidth
            width: icon.strokeWidth
            height: icon.strokeWidth * 3
            radius: width / 2
            color: icon.iconColor
        }

        // Calendar body — outlined rounded rectangle.
        Rectangle {
            anchors.fill: parent
            color: "transparent"
            radius: Math.round(parent.width * 0.12)
            border.color: icon.iconColor
            border.width: icon.strokeWidth
        }

        // Header divider (the line under the month name on a real calendar).
        Rectangle {
            x: 0
            y: Math.round(parent.height * 0.3)
            width: parent.width
            height: icon.strokeWidth
            color: icon.iconColor
        }

        // Two day "cells" inside the body to make it read as a calendar.
        Rectangle {
            x: Math.round(parent.width * 0.22)
            y: Math.round(parent.height * 0.55)
            width: Math.round(parent.width * 0.18)
            height: width
            radius: 1
            color: icon.iconColor
        }
        Rectangle {
            x: Math.round(parent.width * 0.6)
            y: Math.round(parent.height * 0.55)
            width: Math.round(parent.width * 0.18)
            height: width
            radius: 1
            color: icon.iconColor
            opacity: 0.5
        }
    }

    // Small badge with the count of today's events. Hidden when zero or
    // when the widget is misconfigured.
    Rectangle {
        visible: compact.todayCount > 0 && compact.isConfigured
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        width: Math.max(badgeText.implicitWidth + Kirigami.Units.smallSpacing,
                        Kirigami.Units.iconSizes.small * 0.75)
        height: width
        radius: width / 2
        color: Kirigami.Theme.highlightColor
        border.color: Kirigami.Theme.backgroundColor
        border.width: 1

        PlasmaComponents.Label {
            id: badgeText
            anchors.centerIn: parent
            text: compact.todayCount > 99 ? "99+" : compact.todayCount
            color: Kirigami.Theme.highlightedTextColor
            font.pixelSize: Math.round(parent.height * 0.6)
            font.bold: true
        }
    }
}
