// Shareable single-event page at /calendar/{eventId}
(function () {
    const CALENDAR_ID = SITE_CONFIG.calendarId;
    const API_KEY = SITE_CONFIG.googleCalendarApiKey || '';

    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const eventContent = document.getElementById('event-content');
    const copyLinkBtn = document.getElementById('copy-link');

    function getEventId() {
        const path = window.location.pathname.replace(/\/+$/, '') || '/';
        const match = path.match(/^\/calendar\/([^/]+)$/);
        if (match) {
            const segment = decodeURIComponent(match[1]);
            if (segment && segment !== 'event.html' && !segment.includes('.')) {
                return segment;
            }
        }
        return new URLSearchParams(window.location.search).get('id');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function decodeICalText(text) {
        if (!text) return text;
        return text
            .replace(/\\,/g, ',')
            .replace(/\\;/g, ';')
            .replace(/\\\\/g, '\\')
            .replace(/\\[nN]/g, '\n');
    }

    function createMapsUrl(location) {
        if (!location || location === 'Location TBD') return null;
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    }

    function formatEventDate(date) {
        if (!date) return '';
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: 'America/Los_Angeles'
        });
    }

    function formatEventTime(start, end) {
        if (!start) return '';
        const timeOptions = {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Los_Angeles'
        };
        const startTime = start.toLocaleTimeString('en-US', timeOptions);
        if (end) {
            return `${startTime} - ${end.toLocaleTimeString('en-US', timeOptions)}`;
        }
        return startTime;
    }

    function showError(message) {
        loadingState.classList.remove('active');
        eventContent.hidden = true;
        errorState.hidden = false;
        errorMessage.textContent = message;
    }

    function renderEvent(event) {
        document.getElementById('event-title').textContent = event.summary || 'Untitled Event';
        document.title = `${event.summary || 'Event'} | Harmonic Fusion`;

        const descMeta = document.querySelector('meta[name="description"]');
        if (descMeta) {
            const plain = (event.description || '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            descMeta.setAttribute(
                'content',
                plain.slice(0, 160) || `${event.summary || 'Event'} — Harmonic Fusion`
            );
        }

        document.getElementById('event-time').textContent =
            formatEventTime(event.start, event.end) +
            (event.start ? ` (${formatEventDate(event.start)})` : '');

        const locationStr = decodeICalText(event.location) || 'Location TBD';
        const locationEl = document.getElementById('event-location');
        const mapsUrl = createMapsUrl(locationStr);
        if (mapsUrl) {
            locationEl.innerHTML = `<a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="location-link">${escapeHtml(locationStr)}</a>`;
        } else {
            locationEl.textContent = locationStr;
        }

        const description = event.description || 'No description available.';
        document.getElementById('event-description').innerHTML = renderEventDescription(description);

        loadingState.classList.remove('active');
        errorState.hidden = true;
        eventContent.hidden = false;
    }

    function mapApiItem(item) {
        return {
            id: item.id,
            summary: item.summary || '',
            description: item.description || '',
            location: item.location || '',
            start: item.start.dateTime
                ? new Date(item.start.dateTime)
                : new Date(item.start.date + 'T12:00:00'),
            end: item.end?.dateTime
                ? new Date(item.end.dateTime)
                : (item.end?.date ? new Date(item.end.date + 'T12:00:00') : null)
        };
    }

    async function loadFromApi(eventId) {
        const encodedCalendarId = encodeURIComponent(CALENDAR_ID);
        const encodedEventId = encodeURIComponent(eventId);
        const url =
            `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events/${encodedEventId}` +
            `?key=${API_KEY}`;

        const res = await fetch(url);
        if (res.ok) {
            return mapApiItem(await res.json());
        }

        // Recurring master / iCal UID fallback: list by iCalUID
        const listUrl =
            `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events` +
            `?key=${API_KEY}` +
            `&iCalUID=${encodedEventId}` +
            `&singleEvents=true` +
            `&maxResults=1` +
            `&orderBy=startTime`;

        const listRes = await fetch(listUrl);
        if (!listRes.ok) {
            throw new Error(`API ${res.status}`);
        }
        const data = await listRes.json();
        if (data.items && data.items.length) {
            return mapApiItem(data.items[0]);
        }

        // Also try with @google.com suffix (common iCal UID form)
        if (!eventId.includes('@')) {
            const icalUid = `${eventId}@google.com`;
            const icalUrl =
                `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events` +
                `?key=${API_KEY}` +
                `&iCalUID=${encodeURIComponent(icalUid)}` +
                `&singleEvents=true` +
                `&maxResults=1` +
                `&orderBy=startTime`;
            const icalRes = await fetch(icalUrl);
            if (icalRes.ok) {
                const icalData = await icalRes.json();
                if (icalData.items && icalData.items.length) {
                    return mapApiItem(icalData.items[0]);
                }
            }
        }

        throw new Error('Event not found');
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
        if (m[7]) {
            return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
        }
        return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    }

    function googleStyleInstanceId(uid, start) {
        const base = (uid || '').replace(/@google\.com$/i, '');
        if (!base || !start) return base || null;
        const pad = (n) => String(n).padStart(2, '0');
        const stamp =
            start.getUTCFullYear() +
            pad(start.getUTCMonth() + 1) +
            pad(start.getUTCDate()) +
            'T' +
            pad(start.getUTCHours()) +
            pad(start.getUTCMinutes()) +
            pad(start.getUTCSeconds()) +
            'Z';
        return `${base}_${stamp}`;
    }

    function parseIcalEvents(icalText) {
        const text = unfoldIcal(icalText);
        const blocks = text.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
        const events = [];

        for (const block of blocks) {
            const get = (key) => {
                const re = new RegExp(`^${key}(?:;[^:]*)?:(.*)$`, 'mi');
                const match = block.match(re);
                return match ? match[1].trim() : '';
            };

            const uid = get('UID');
            const start = parseIcalDate(get('DTSTART'));
            if (!start) continue;

            const baseId = uid.replace(/@google\.com$/i, '');
            events.push({
                id: baseId,
                instanceId: googleStyleInstanceId(uid, start),
                summary: get('SUMMARY').replace(/\\,/g, ',').replace(/\\n/gi, ' '),
                description: get('DESCRIPTION').replace(/\\,/g, ',').replace(/\\n/gi, '\n'),
                location: get('LOCATION').replace(/\\,/g, ','),
                start,
                end: parseIcalDate(get('DTEND'))
            });
        }

        return events;
    }

    async function loadFromIcal(eventId) {
        const calendarUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(CALENDAR_ID)}/public/basic.ics`;
        const proxies = [
            { url: `https://api.allorigins.win/raw?url=${encodeURIComponent(calendarUrl)}` },
            { url: `https://corsproxy.io/?${encodeURIComponent(calendarUrl)}` }
        ];

        let text = null;
        try {
            const direct = await fetch(calendarUrl);
            if (direct.ok) {
                const t = await direct.text();
                if (t.includes('BEGIN:VCALENDAR')) text = t;
            }
        } catch (_) { /* try proxies */ }

        if (!text) {
            for (const proxy of proxies) {
                try {
                    const res = await fetch(proxy.url);
                    if (!res.ok) continue;
                    const t = await res.text();
                    if (t && t.includes('BEGIN:VCALENDAR')) {
                        text = t;
                        break;
                    }
                } catch (_) { /* next */ }
            }
        }

        if (!text) throw new Error('iCal fetch failed');

        const events = parseIcalEvents(text);
        const normalized = eventId.replace(/@google\.com$/i, '');
        const match =
            events.find((e) => e.instanceId === eventId || e.instanceId === normalized) ||
            events.find((e) => e.id === eventId || e.id === normalized);

        if (!match) throw new Error('Event not found');
        return match;
    }

    async function loadEvent() {
        const eventId = getEventId();
        if (!eventId) {
            showError('No event specified.');
            return;
        }

        try {
            let event;
            if (API_KEY) {
                try {
                    event = await loadFromApi(eventId);
                } catch (apiErr) {
                    console.warn('Event API failed, trying iCal fallback', apiErr);
                    event = await loadFromIcal(eventId);
                }
            } else {
                event = await loadFromIcal(eventId);
            }
            renderEvent(event);
        } catch (err) {
            console.error(err);
            showError('This event could not be found or is no longer available.');
        }
    }

    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', async () => {
            const url = window.location.href.split('?')[0];
            try {
                await navigator.clipboard.writeText(url);
                const original = copyLinkBtn.textContent;
                copyLinkBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyLinkBtn.textContent = original;
                }, 2000);
            } catch (_) {
                copyLinkBtn.textContent = 'Copy failed';
                setTimeout(() => {
                    copyLinkBtn.textContent = 'Copy Link';
                }, 2000);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadEvent);
    } else {
        loadEvent();
    }
})();
