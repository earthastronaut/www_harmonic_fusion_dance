// Next upcoming events for the home page (Google Calendar API)
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

    async function loadUpcoming() {
        if (loadingEl) loadingEl.hidden = false;

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

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Calendar request failed (${res.status})`);
            const data = await res.json();
            const items = data.items || [];

            if (items.length === 0) {
                listEl.innerHTML = '<li class="upcoming-empty">No upcoming events right now.</li>';
                return;
            }

            listEl.innerHTML = items.map((item) => {
                const start = item.start.dateTime
                    ? new Date(item.start.dateTime)
                    : new Date(item.start.date + 'T12:00:00');
                const end = item.end?.dateTime
                    ? new Date(item.end.dateTime)
                    : (item.end?.date ? new Date(item.end.date + 'T12:00:00') : null);
                const title = escapeHtml(item.summary || 'Untitled event');
                const location = item.location ? escapeHtml(item.location) : '';
                return `
                    <li class="upcoming-item">
                        <div class="upcoming-title">${title}</div>
                        <div class="upcoming-meta">${formatDate(start)} · ${formatTime(start, end)}</div>
                        ${location ? `<div class="upcoming-location">${location}</div>` : ''}
                    </li>
                `;
            }).join('');
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
