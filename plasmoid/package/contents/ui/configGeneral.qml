import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Dialogs as QtDialogs
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
    property alias cfg_backgroundOpacity: bgOpacitySlider.value
    property alias cfg_useCustomTextColor: useCustomColorCheck.checked
    property alias cfg_customTextColor: customColorField.text

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

    Item {
        Kirigami.FormData.isSection: true
    }

    RowLayout {
        Kirigami.FormData.label: i18n("Background opacity:")
        Layout.fillWidth: true
        spacing: Kirigami.Units.smallSpacing

        Slider {
            id: bgOpacitySlider
            from: 0
            to: 100
            stepSize: 5
            snapMode: Slider.SnapAlways
            Layout.preferredWidth: Kirigami.Units.gridUnit * 14
            Layout.fillWidth: true
        }

        Label {
            text: bgOpacitySlider.value + " %"
            Layout.preferredWidth: Kirigami.Units.gridUnit * 3
            horizontalAlignment: Text.AlignRight
        }
    }

    Label {
        text: i18n("Affects only the background — events and titles always stay fully visible. 0% gives a fully transparent widget; 100% gives a solid card.")
        font: Kirigami.Theme.smallFont
        opacity: 0.7
        Layout.fillWidth: true
        wrapMode: Text.WordWrap
    }

    Item {
        Kirigami.FormData.isSection: true
    }

    CheckBox {
        id: useCustomColorCheck
        Kirigami.FormData.label: i18n("Text colour:")
        text: i18n("Override Plasma colour scheme")
    }

    RowLayout {
        Kirigami.FormData.label: i18n("Custom colour:")
        Layout.fillWidth: true
        spacing: Kirigami.Units.smallSpacing
        enabled: useCustomColorCheck.checked

        // Live preview swatch — updates as you type a new hex value or
        // pick from the dialog. The border keeps it visible against
        // backgrounds that match the chosen colour.
        Rectangle {
            width: Kirigami.Units.gridUnit * 2
            height: Kirigami.Units.gridUnit * 1.5
            radius: 3
            color: customColorField.acceptableInput ? customColorField.text : "transparent"
            border.color: Kirigami.Theme.textColor
            border.width: 1
        }

        TextField {
            id: customColorField
            placeholderText: "#ffffff"
            // Validate as a 3-, 6- or 8-digit hex colour with leading #.
            validator: RegularExpressionValidator {
                regularExpression: /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
            }
            Layout.preferredWidth: Kirigami.Units.gridUnit * 8
        }

        Button {
            text: i18n("Pick…")
            icon.name: "color-picker"
            onClicked: colorDialog.open()
        }
    }

    Label {
        text: i18n("Useful when your wallpaper colour clashes with the active Plasma text colour.")
        font: Kirigami.Theme.smallFont
        opacity: 0.7
        Layout.fillWidth: true
        wrapMode: Text.WordWrap
    }

    QtDialogs.ColorDialog {
        id: colorDialog
        title: i18n("Choose text colour")
        selectedColor: customColorField.acceptableInput ? customColorField.text : "#ffffff"
        onAccepted: customColorField.text = selectedColor
    }
}
