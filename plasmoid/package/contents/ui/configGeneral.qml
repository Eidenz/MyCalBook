import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import org.kde.kirigami as Kirigami

Kirigami.FormLayout {
    id: root

    // These properties are wired up to the kcfg entries by Plasma's
    // configuration system. The naming convention is `cfg_<entryName>`.
    property alias cfg_serverUrl: serverUrlField.text
    property alias cfg_apiKey: apiKeyField.text
    property alias cfg_maxEvents: maxEventsField.value
    property alias cfg_refreshIntervalMinutes: refreshField.value
    property alias cfg_showAllDayEvents: allDayCheck.checked

    TextField {
        id: serverUrlField
        Kirigami.FormData.label: i18n("Server URL:")
        placeholderText: "https://cal.example.com"
        Layout.fillWidth: true
        Layout.preferredWidth: Kirigami.Units.gridUnit * 20
    }

    TextField {
        id: apiKeyField
        Kirigami.FormData.label: i18n("API key:")
        placeholderText: "mcb_…"
        echoMode: TextInput.Password
        Layout.fillWidth: true
        Layout.preferredWidth: Kirigami.Units.gridUnit * 20
    }

    Label {
        text: i18n("Generate a key in MyCalBook → Settings → API Keys.")
        font: Kirigami.Theme.smallFont
        opacity: 0.7
        Layout.fillWidth: true
        wrapMode: Text.WordWrap
    }

    Item {
        Kirigami.FormData.isSection: true
    }

    SpinBox {
        id: maxEventsField
        Kirigami.FormData.label: i18n("Max events to show:")
        from: 1
        to: 100
    }

    SpinBox {
        id: refreshField
        Kirigami.FormData.label: i18n("Refresh interval (minutes):")
        from: 1
        to: 1440
    }

    CheckBox {
        id: allDayCheck
        Kirigami.FormData.label: i18n("All-day events:")
        text: i18n("Show all-day events")
    }
}
