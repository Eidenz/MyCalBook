import QtQuick
import QtQuick.Layouts
import org.kde.kirigami as Kirigami
import org.kde.plasma.plasmoid
import org.kde.plasma.components as PlasmaComponents
import "mycalbook.js" as MyCalBook

// Panel-friendly icon + today's event count badge.
//
// CompactView lives in its own file so the `id: root` from main.qml is not
// directly visible. Plasma 6 exposes the parent PlasmoidItem through the
// `Plasmoid` singleton, and any custom properties declared on it (events,
// loading, isConfigured…) are accessible via `Plasmoid.<name>`.
MouseArea {
    id: compact
    hoverEnabled: true

    readonly property int todayCount: MyCalBook.countToday(Plasmoid.events)

    // Click toggles the popup the way every other plasmoid does.
    onClicked: Plasmoid.expanded = !Plasmoid.expanded

    // The compact representation should adapt to whatever the panel
    // gives us. Use Layout properties so flow correctly.
    Layout.minimumWidth: Kirigami.Units.iconSizes.small
    Layout.minimumHeight: Kirigami.Units.iconSizes.small
    Layout.preferredWidth: Kirigami.Units.iconSizes.medium
    Layout.preferredHeight: Kirigami.Units.iconSizes.medium

    Kirigami.Icon {
        id: icon
        anchors.fill: parent
        source: "view-calendar-upcoming"
        active: compact.containsMouse
    }

    // Small badge with the count of today's events. Hidden when zero or
    // when the widget is misconfigured.
    Rectangle {
        visible: compact.todayCount > 0 && Plasmoid.isConfigured
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
