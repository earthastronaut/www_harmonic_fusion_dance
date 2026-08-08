// Next upcoming events for the home page
(function () {
    const CALENDAR_ID = 'harmonicfusiondance@gmail.com';
    const API_KEY = 'AIzaSyDG6sIfQdFEPpGuGRupWNXkwRM5fGarY1w';
    const LIMIT = 3;

    const listEl = document.getElementById('upcoming-events-list');
    const loadingEl = document.getElementById('upcoming-events-loading');
    if (!listEl) return;

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(date) {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            timeZone: 'America/Los_Angeles'
        });
    }

    function formatTime(start, end) {
        const opts = {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Los_Angeles'
        };
        const startStr = start.toLocaleTimeString('en-US', opts);
        if (!end) return startStr;
        return `${startStr} – ${end.toLocaleTimeString('en-US', opts)}`;
    }

    function renderEvents(items) {
        if (!items.length) {
            listEl.innerHTML = '<li class="upcoming-empty">No upcoming events right now.</li>';
            return;
        }

        listEl.innerHTML = items.map((item) => {
            const title = escapeHtml(item.summary || 'Untitled event');
            const location = item.location ? escapeHtml(item.location) : '';
            return `
                <li class="upcoming-item">
                    <div class="upcoming-title">${title}</div>
                    <div class="upcoming-meta">${formatDate(item.start)} · ${formatTime(item.start, item.end)}</div>
                    ${location ? `<div class="upcoming-location">${location}</div>` : ''}
                </li>
            `;
        }).join('');
    }

    async function loadFromApi() {
        const now = new Date();
        const later = new Date(now);
        later.setDate(later.getDate() + 90);

        const encodedId = encodeURIComponent(CALENDAR_ID);
        const url =
            `https://www.googleapis.com/calendar/v3/calendars/${encodedId}/events` +
            `?key=${API_KEY}` +
            `&singleEvents=true` +
            `&orderBy=startTime` +
            `&maxResults=${LIMIT}` +
            `&timeMin=${encodeURIComponent(now.toISOString())}` +
            `&timeMax=${encodeURIComponent(later.toISOString())}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();
        return (data.items || []).map((item) => ({
            summary: item.summary || '',
            location: item.location || '',
            start: item.start.dateTime
                ? new Date(item.start.dateTime)
                : new Date(item.start.date + 'T12:00:00'),
            end: item.end?.dateTime
                ? new Date(item.end.dateTime)
                : (item.end?.date ? new Date(item.end.date + 'T12:00:00') : null)
        }));
    }

    function unfoldIcal(text) {
        return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
    }

    function parseIcalDate(value) {
        if (!value) return null;
        if (value.length === 8) {
            const y = +value.slice(0, 4);
            const m = +value.slice(4, 6) - 1;
            const d = +value.slice(6, 8);
            return new Date(y, m, d, 12, 0, 0);
        }
        const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
        if (!m) return new Date(value);
        const date = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
        return date;
    }

    function parseIcalEvents(icalText) {
        const text = unfoldIcal(icalText);
        const blocks = text.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
        const now = new Date();
        const events = [];

        for (const block of blocks) {
            const get = (key) => {
                const re = new RegExp(`^${key}(?:;[^:]*)?:(.*)$`, 'mi');
                const match = block.match(re);
                return match ? match[1].trim() : '';
            };

            const start = parseIcalDate(get('DTSTART'));
            if (!start || start < now) continue;

            // Skip unexpanded recurring masters without a concrete instance time window
            if (/^RRULE:/mi.test(block) && !/^RECURRENCE-ID:/mi.test(block)) {
                // Still include if DTSTART is in the future (first occurrence)
                // but prefer expanded instances when present
            }

            events.push({
                summary: get('SUMMARY').replace(/\\,/g, ',').replace(/\\n/gi, ' '),
                location: get('LOCATION').replace(/\\,/g, ','),
                start,
                end: parseIcalDate(get('DTEND'))
            });
        }

        events.sort((a, b) => a.start - b.start);
        return events.slice(0, LIMIT);
    }

    async function loadFromIcal() {
        const calendarUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(CALENDAR_ID)}/public/basic.ics`;
        const proxies = [
            {
                url: `https://api.allorigins.win/raw?url=${encodeURIComponent(calendarUrl)}`,
                parse: async (res) => res.text()
            },
            {
                url: `https://corsproxy.io/?${encodeURIComponent(calendarUrl)}`,
                parse: async (res) => res.text()
            }
        ];

        try {
            const direct = await fetch(calendarUrl);
            if (direct.ok) {
                const text = await direct.text();
                if (text.includes('BEGIN:VCALENDAR')) return parseIcalEvents(text);
            }
        } catch (_) { /* try proxies */ }

        for (const proxy of proxies) {
            try {
                const res = await fetch(proxy.url);
                if (!res.ok) continue;
                const text = await proxy.parse(res);
                if (text && text.includes('BEGIN:VCALENDAR')) return parseIcalEvents(text);
            } catch (_) { /* next */ }
        }

        throw new Error('iCal fetch failed');
    }

    async function loadUpcoming() {
        if (loadingEl) loadingEl.hidden = false;

        try {
            let items;
            try {
                items = await loadFromApi();
            } catch (apiErr) {
                console.warn('Calendar API failed, trying iCal fallback', apiErr);
                items = await loadFromIcal();
            }
            renderEvents(items);
        } catch (err) {
            console.error(err);
            listEl.innerHTML =
                '<li class="upcoming-empty">Unable to load events. <a href="/calendar/">View calendar</a></li>';
        } finally {
            if (loadingEl) loadingEl.hidden = true;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadUpcoming);
    } else {
        loadUpcoming();
    }
})();
