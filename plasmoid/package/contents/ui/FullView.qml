import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import org.kde.kirigami as Kirigami
import org.kde.plasma.components as PlasmaComponents
import "mycalbook.js" as MyCalBook

// Popup / desktop view: header with title + refresh button, then the
// grouped list of upcoming events. Empty / loading / error states each
// get their own slot.
//
// All shared state is passed in as explicit properties. The Plasmoid
// reference does not expose user-defined QML properties on PlasmoidItem
// from inside a separate file, so wiring it through here is the only
// reliable way for the parent's data to reach this view.
Item {
    id: fullView

    // --- Properties bound from main.qml -----------------------------------
    property var events: []
    property bool loading: false
    property string fetchError: ""
    property var lastUpdated: null
    property bool isConfigured: false
    property string serverUrl: ""

    // --- Signals raised back to main.qml ----------------------------------
    signal refreshRequested()
    signal configureRequested()

    Layout.minimumWidth: Kirigami.Units.gridUnit * 18
    Layout.minimumHeight: Kirigami.Units.gridUnit * 16
    Layout.preferredWidth: Kirigami.Units.gridUnit * 22
    Layout.preferredHeight: Kirigami.Units.gridUnit * 26

    // The grouped representation is recomputed whenever events change.
    readonly property var groups: MyCalBook.groupByDay(fullView.events)
    readonly property bool hasEvents: fullView.events.length > 0
    readonly property bool showError: fullView.fetchError.length > 0 && !hasEvents

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: Kirigami.Units.smallSpacing
        spacing: Kirigami.Units.smallSpacing

        // --- Header --------------------------------------------------------
        RowLayout {
            Layout.fillWidth: true
            spacing: Kirigami.Units.smallSpacing

            Kirigami.Heading {
                text: i18n("Upcoming")
                level: 2
                Layout.fillWidth: true
                elide: Text.ElideRight
            }

            PlasmaComponents.ToolButton {
                icon.name: "view-refresh"
                text: i18n("Refresh")
                display: QQC2.AbstractButton.IconOnly
                enabled: !fullView.loading && fullView.isConfigured
                onClicked: fullView.refreshRequested()
                QQC2.ToolTip.text: i18n("Refresh now")
                QQC2.ToolTip.visible: hovered
                QQC2.ToolTip.delay: Kirigami.Units.toolTipDelay
            }

            PlasmaComponents.ToolButton {
                icon.name: "configure"
                text: i18n("Configure…")
                display: QQC2.AbstractButton.IconOnly
                onClicked: fullView.configureRequested()
                QQC2.ToolTip.text: i18n("Configure widget")
                QQC2.ToolTip.visible: hovered
                QQC2.ToolTip.delay: Kirigami.Units.toolTipDelay
            }
        }

        Kirigami.Separator {
            Layout.fillWidth: true
        }

        // --- Body ----------------------------------------------------------
        Item {
            Layout.fillWidth: true
            Layout.fillHeight: true

            // Empty / unconfigured / error states use the standard Kirigami
            // placeholder so they look like every other Plasma widget.
            Kirigami.PlaceholderMessage {
                anchors.centerIn: parent
                width: parent.width - Kirigami.Units.gridUnit * 2
                visible: !fullView.isConfigured
                icon.name: "configure"
                text: i18n("Not configured")
                explanation: i18n("Set the MyCalBook server URL and an API key in the widget settings.")

                helpfulAction: QQC2.Action {
                    icon.name: "configure"
                    text: i18n("Open Settings")
                    onTriggered: fullView.configureRequested()
                }
            }

            Kirigami.PlaceholderMessage {
                anchors.centerIn: parent
                width: parent.width - Kirigami.Units.gridUnit * 2
                visible: fullView.showError && fullView.isConfigured
                icon.name: "dialog-error"
                text: i18n("Couldn't load events")
                explanation: fullView.fetchError

                helpfulAction: QQC2.Action {
                    icon.name: "view-refresh"
                    text: i18n("Try Again")
                    onTriggered: fullView.refreshRequested()
                }
            }

            Kirigami.PlaceholderMessage {
                anchors.centerIn: parent
                width: parent.width - Kirigami.Units.gridUnit * 2
                visible: fullView.isConfigured && !fullView.hasEvents && !fullView.loading && !fullView.showError
                icon.source: Qt.resolvedUrl("../icons/calendar.svg")
                text: i18n("No upcoming events")
            }

            PlasmaComponents.BusyIndicator {
                anchors.centerIn: parent
                visible: fullView.loading && !fullView.hasEvents && !fullView.showError && fullView.isConfigured
                running: visible
            }

            // Scrollable grouped list, only shown when we actually have data.
            QQC2.ScrollView {
                anchors.fill: parent
                visible: fullView.hasEvents
                clip: true
                contentWidth: availableWidth

                ListView {
                    id: dayList
                    spacing: Kirigami.Units.smallSpacing
                    model: fullView.groups

                    delegate: ColumnLayout {
                        width: dayList.width
                        spacing: Kirigami.Units.smallSpacing

                        // Day header (Today / Tomorrow / Weekday, Mon DD)
                        RowLayout {
                            Layout.fillWidth: true
                            Layout.topMargin: Kirigami.Units.smallSpacing
                            spacing: Kirigami.Units.smallSpacing

                            Kirigami.Heading {
                                text: modelData.label
                                level: 4
                                Layout.fillWidth: true
                                elide: Text.ElideRight
                            }

                            PlasmaComponents.Label {
                                text: i18np("%1 event", "%1 events", modelData.events.length)
                                opacity: 0.6
                                font: Kirigami.Theme.smallFont
                            }
                        }

                        // The events for this day.
                        Repeater {
                            model: modelData.events

                            delegate: Rectangle {
                                Layout.fillWidth: true
                                radius: Kirigami.Units.smallSpacing
                                color: hoverHandler.hovered
                                    ? Qt.alpha(Kirigami.Theme.highlightColor, 0.15)
                                    : Qt.alpha(Kirigami.Theme.textColor, 0.05)
                                border.color: Qt.alpha(Kirigami.Theme.textColor, 0.08)
                                border.width: 1
                                implicitHeight: eventLayout.implicitHeight + Kirigami.Units.smallSpacing * 2

                                HoverHandler {
                                    id: hoverHandler
                                    cursorShape: Qt.PointingHandCursor
                                }

                                // Open the configured MyCalBook instance in
                                // the default browser when an event is clicked.
                                TapHandler {
                                    enabled: fullView.serverUrl.length > 0
                                    onTapped: Qt.openUrlExternally(fullView.serverUrl)
                                }

                                RowLayout {
                                    id: eventLayout
                                    anchors.fill: parent
                                    anchors.margins: Kirigami.Units.smallSpacing
                                    spacing: Kirigami.Units.smallSpacing

                                    // Coloured stripe to differentiate types.
                                    Rectangle {
                                        Layout.preferredWidth: Kirigami.Units.smallSpacing * 0.75
                                        Layout.fillHeight: true
                                        radius: width / 2
                                        color: {
                                            if (modelData.type === "booked") return "#10b981"
                                            if (modelData.type === "blocked") return "#ef4444"
                                            return Kirigami.Theme.highlightColor
                                        }
                                    }

                                    ColumnLayout {
                                        Layout.fillWidth: true
                                        spacing: 0

                                        PlasmaComponents.Label {
                                            text: modelData.title
                                            font.bold: true
                                            elide: Text.ElideRight
                                            Layout.fillWidth: true
                                            maximumLineCount: 1
                                        }

                                        PlasmaComponents.Label {
                                            text: MyCalBook.formatTimeRange(modelData)
                                            opacity: 0.7
                                            font: Kirigami.Theme.smallFont
                                            Layout.fillWidth: true
                                            elide: Text.ElideRight
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Footer with last-updated timestamp.
        PlasmaComponents.Label {
            visible: fullView.hasEvents && fullView.lastUpdated !== null
            text: fullView.lastUpdated !== null
                ? i18n("Updated %1", Qt.formatTime(fullView.lastUpdated, Qt.DefaultLocaleShortDate))
                : ""
            opacity: 0.5
            font: Kirigami.Theme.smallFont
            Layout.alignment: Qt.AlignRight
        }
    }
}
