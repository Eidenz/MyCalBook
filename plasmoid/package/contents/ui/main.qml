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

    // On the desktop (Planar form factor) we show the full events list
    // directly. In a panel — vertical or horizontal — we collapse to the
    // compact icon and let the user click it to open the popup.
    preferredRepresentation: Plasmoid.formFactor === PlasmaCore.Types.Planar
        ? fullRepresentation
        : compactRepresentation
    // The widget icon comes from KPlugin.Icon in metadata.json — setting
    // it here as `icon: …` or `Plasmoid.icon: …` is rejected as a
    // non-existent property on PlasmoidItem in this Plasma 6 build.

    // `status` is on the underlying Plasma::Applet (writable but not via
    // declarative `Plasmoid.status: …` syntax), so we set it imperatively
    // whenever the event list changes. Wrapped in a try so a future API
    // tweak can't crash the whole widget.
    function syncStatus() {
        try {
            Plasmoid.status = (events.length > 0)
                ? PlasmaCore.Types.ActiveStatus
                : PlasmaCore.Types.PassiveStatus
        } catch (e) {
            // Non-fatal — the widget still works without status hinting.
        }
    }
    onEventsChanged: syncStatus()

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
    Component.onCompleted: {
        syncStatus()
        refresh()
    }
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

    // The bindings inside these representation assignments are evaluated
    // in main.qml's scope (NOT inside CompactView.qml / FullView.qml), so
    // referencing `root` here works even though it wouldn't from inside
    // the child files themselves.
    compactRepresentation: CompactView {
        events: root.events
        isConfigured: root.isConfigured
        onToggleExpanded: root.expanded = !root.expanded
    }

    fullRepresentation: FullView {
        events: root.events
        loading: root.loading
        fetchError: root.fetchError
        lastUpdated: root.lastUpdated
        isConfigured: root.isConfigured
        serverUrl: root.serverUrl
        onRefreshRequested: root.refresh()
        onConfigureRequested: Plasmoid.internalAction("configure").trigger()
    }
}
