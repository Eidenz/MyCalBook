import QtQuick
import org.kde.plasma.plasmoid
import org.kde.plasma.core as PlasmaCore
import "mycalbook.js" as MyCalBook

PlasmoidItem {
    id: root

    // --- Shared state populated by the fetch helper -----------------------
    property var events: []
    property string fetchError: ""
    property bool loading: false
    property var lastUpdated: null

    // Re-used by both representations.
    readonly property string serverUrl: Plasmoid.configuration.serverUrl
    readonly property string apiKey: Plasmoid.configuration.apiKey
    readonly property int maxEvents: Plasmoid.configuration.maxEvents
    readonly property int refreshIntervalMinutes: Plasmoid.configuration.refreshIntervalMinutes
    readonly property bool showAllDayEvents: Plasmoid.configuration.showAllDayEvents
    readonly property bool isConfigured: serverUrl.length > 0 && apiKey.length > 0

    // Plasma 6 sizing hints — these let the panel give us a sensible default.
    preferredRepresentation: compactRepresentation
    icon: "view-calendar-upcoming"

    status: events.length > 0
        ? PlasmaCore.Types.ActiveStatus
        : PlasmaCore.Types.PassiveStatus

    toolTipMainText: i18n("MyCalBook")
    toolTipSubText: {
        if (!isConfigured) return i18n("Not configured. Open settings.")
        if (loading && events.length === 0) return i18n("Loading…")
        if (fetchError) return fetchError
        var todayCount = MyCalBook.countToday(events)
        if (events.length === 0) return i18n("No upcoming events")
        return i18n("%1 today · %2 upcoming", todayCount, events.length)
    }

    function refresh() {
        if (!isConfigured) {
            fetchError = i18n("Configure server URL and API key in widget settings.")
            events = []
            return
        }
        loading = true
        fetchError = ""
        MyCalBook.fetchUpcoming(serverUrl, apiKey, maxEvents, showAllDayEvents,
            function(err, result) {
                loading = false
                if (err) {
                    fetchError = err
                    return
                }
                events = result
                lastUpdated = new Date()
            })
    }

    // Refresh on first show and whenever any relevant config changes.
    Component.onCompleted: refresh()
    onServerUrlChanged: refresh()
    onApiKeyChanged: refresh()
    onMaxEventsChanged: refresh()
    onShowAllDayEventsChanged: refresh()

    Timer {
        id: refreshTimer
        interval: Math.max(60, root.refreshIntervalMinutes * 60) * 1000
        repeat: true
        running: root.isConfigured
        onTriggered: root.refresh()
    }

    compactRepresentation: CompactView {}
    fullRepresentation: FullView {}
}
