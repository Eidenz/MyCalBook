// Fetch helpers for the MyCalBook API.
//
// The server exposes events month-by-month at:
//   GET /api/events/manual?month=YYYY-MM
// authenticated with either an `x-api-key` header (persistent key) or the
// legacy `x-auth-token` JWT. We use the persistent key.
//
// To produce a forward-looking list of upcoming events we always fetch the
// current month and the next month, then filter and sort client-side. Two
// small requests per refresh tick is well within reason.

.pragma library

function pad2(n) {
    return n < 10 ? "0" + n : "" + n;
}

function monthKey(date) {
    return date.getFullYear() + "-" + pad2(date.getMonth() + 1);
}

function buildUrl(serverUrl, month) {
    var base = (serverUrl || "").replace(/\/+$/, "");
    return base + "/api/events/manual?month=" + month;
}

// Fetch a single month. Returns a Promise-like via callback(err, events).
function fetchMonth(serverUrl, apiKey, month, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", buildUrl(serverUrl, month), true);
    xhr.setRequestHeader("x-api-key", apiKey);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.onreadystatechange = function() {
        if (xhr.readyState !== XMLHttpRequest.DONE) return;
        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                var parsed = JSON.parse(xhr.responseText);
                callback(null, Array.isArray(parsed) ? parsed : []);
            } catch (e) {
                callback("Failed to parse server response: " + e.message, []);
            }
        } else if (xhr.status === 0) {
            callback("Could not reach server. Check the URL.", []);
        } else if (xhr.status === 401) {
            callback("API key rejected (401). Generate a new key in MyCalBook settings.", []);
        } else {
            callback("Server returned HTTP " + xhr.status, []);
        }
    };
    try {
        xhr.send();
    } catch (e) {
        callback("Request failed: " + e.message, []);
    }
}

// Fetch the current month and the next month, then merge, dedupe, filter
// to upcoming, and sort. Calls callback(err, eventsArray).
function fetchUpcoming(serverUrl, apiKey, maxEvents, includeAllDay, callback) {
    if (!serverUrl || !apiKey) {
        callback("Server URL and API key are required.", []);
        return;
    }

    var now = new Date();
    var nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    var months = [monthKey(now), monthKey(nextMonthDate)];

    var pending = months.length;
    var collected = [];
    var firstError = null;

    months.forEach(function(m) {
        fetchMonth(serverUrl, apiKey, m, function(err, events) {
            if (err && !firstError) firstError = err;
            if (events && events.length) {
                collected = collected.concat(events);
            }
            pending -= 1;
            if (pending === 0) {
                if (firstError && collected.length === 0) {
                    callback(firstError, []);
                    return;
                }
                callback(null, processEvents(collected, now, maxEvents, includeAllDay));
            }
        });
    });
}

// Filter, dedupe, sort, and slice the merged event list.
function processEvents(events, now, maxEvents, includeAllDay) {
    var seen = {};
    var result = [];

    for (var i = 0; i < events.length; i++) {
        var ev = events[i];
        if (!ev || !ev.start_time) continue;
        if (!includeAllDay && ev.is_all_day) continue;

        // Dedupe by id (recurring expansion can produce overlapping ids
        // when a month boundary is crossed).
        var key = String(ev.id);
        if (seen[key]) continue;

        var start = new Date(ev.start_time);
        var end = ev.end_time ? new Date(ev.end_time) : null;

        // Skip events that have already finished. For events with no end
        // time, fall back to comparing the start time.
        var compareTime = end ? end : start;
        if (compareTime.getTime() < now.getTime()) continue;

        seen[key] = true;
        result.push({
            id: ev.id,
            title: ev.title || "(untitled)",
            description: ev.description || "",
            start: start,
            end: end,
            isAllDay: !!ev.is_all_day,
            type: ev.type || "personal"
        });
    }

    result.sort(function(a, b) {
        return a.start.getTime() - b.start.getTime();
    });

    return result.slice(0, maxEvents);
}

// Group events by day for sectioned rendering.
// Returns [{ dayKey, label, events: [...] }, ...]
function groupByDay(events) {
    var groups = [];
    var lastKey = null;
    var current = null;

    for (var i = 0; i < events.length; i++) {
        var ev = events[i];
        var d = ev.start;
        var key = d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
        if (key !== lastKey) {
            current = { dayKey: key, label: dayLabel(d), date: d, events: [] };
            groups.push(current);
            lastKey = key;
        }
        current.events.push(ev);
    }
    return groups;
}

function dayLabel(date) {
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";

    var weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    if (diffDays > 1 && diffDays < 7) {
        return weekdays[date.getDay()];
    }
    return weekdays[date.getDay()] + ", " + months[date.getMonth()] + " " + date.getDate();
}

function formatTime(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? "PM" : "AM";
    var displayHours = hours % 12;
    if (displayHours === 0) displayHours = 12;
    return displayHours + ":" + pad2(minutes) + " " + ampm;
}

function formatTimeRange(ev) {
    if (ev.isAllDay) return "All day";
    if (!ev.end) return formatTime(ev.start);
    return formatTime(ev.start) + " – " + formatTime(ev.end);
}

// Count events whose start date is today (used by the compact view).
function countToday(events) {
    var now = new Date();
    var todayKey = now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate());
    var n = 0;
    for (var i = 0; i < events.length; i++) {
        var d = events[i].start;
        var key = d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
        if (key === todayKey) n += 1;
    }
    return n;
}
