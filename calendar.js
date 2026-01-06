// Google Calendar Configuration
const CALENDAR_ID = 'harmonicfusiondance@gmail.com';
// Optional: Set API_KEY to use Google Calendar API v3 (expands recurring events automatically)
// Leave empty to use iCal feed (requires manual RRULE expansion)
const API_KEY = ''; // Set your Google Calendar API key here if you want to use API v3

// State
let allEvents = [];
let filteredEvents = [];

// DOM Elements
const monthSelector = document.getElementById('month-selector');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const loadingState = document.getElementById('loading-state');
const eventsContainer = document.getElementById('events-container');
const eventModal = document.getElementById('event-modal');
const modalClose = document.getElementById('modal-close');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeDateInputs();
    loadEvents();
    setupEventListeners();
});

// Initialize date inputs with current month
function initializeDateInputs() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Set month selector to current month
    monthSelector.value = `${year}-${month}`;
    
    // Set default start date to today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDateInput.value = formatDateLocal(today);
    
    // Set default end date to 30 days from today
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 30);
    endDateInput.value = formatDateLocal(futureDate);
}

// Format date for date input
function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Setup event listeners
function setupEventListeners() {
    modalClose.addEventListener('click', () => eventModal.close());
    
    // Close modal on backdrop click
    eventModal.addEventListener('click', (e) => {
        if (e.target === eventModal) {
            eventModal.close();
        }
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && eventModal.open) {
            eventModal.close();
        }
    });
    
    // Auto-apply filter when date inputs change
    startDateInput.addEventListener('change', applyFilter);
    startDateInput.addEventListener('blur', applyFilter);
    endDateInput.addEventListener('change', applyFilter);
    endDateInput.addEventListener('blur', applyFilter);
    
    // Update start/end date when month changes
    monthSelector.addEventListener('change', updateDateRangeFromMonth);
}

// Update date range when month selector changes
function updateDateRangeFromMonth() {
    const monthValue = monthSelector.value;
    if (!monthValue) return;
    
    const [year, month] = monthValue.split('-').map(Number);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    
    startDateInput.value = formatDateLocal(startOfMonth);
    endDateInput.value = formatDateLocal(endOfMonth);
    applyFilter();
}

// Load events from Google Calendar
async function loadEvents() {
    try {
        console.log('Fetching calendar events...');
        loadingState.classList.add('active');
        eventsContainer.innerHTML = '';
        
        // Use Google Calendar API v3 if API key is provided (expands recurring events automatically)
        if (API_KEY) {
            return await loadEventsFromAPI();
        }
        
        // Otherwise use iCal feed (requires manual RRULE expansion)
        await loadEventsFromICal();
    } catch (error) {
        console.error('Error loading events:', error);
        eventsContainer.innerHTML = `
            <div class="empty-state">
                <p>Unable to load events. Please try again later.</p>
                <p style="margin-top: 0.5rem; font-size: 0.875rem; opacity: 0.7;">Make sure the calendar is set to public.</p>
                <button class="btn-refresh" id="retry-load-events" style="margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: var(--text-primary); color: var(--bg-dark); border: none; border-radius: 8px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.opacity='0.9'; this.style.transform='translateY(-1px)'" onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)'">
                    Refresh
                </button>
            </div>
        `;
        
        // Add click listener to refresh button
        const refreshBtn = document.getElementById('retry-load-events');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadEvents();
            });
        }
        loadingState.classList.remove('active');
    }
}

// Parse iCal format
function parseICal(icalData) {
    const events = [];
    const lines = icalData.split(/\r?\n/);
    
    let currentEvent = null;
    let inEvent = false;
    let currentProperty = '';
    let currentValue = '';
    
    console.log('Total lines in iCal:', lines.length);
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        // Skip empty lines
        if (!line) continue;
        
        // Handle line continuation (starts with space or tab - but we trimmed, so check original)
        const originalLine = lines[i];
        if (originalLine.startsWith(' ') || originalLine.startsWith('\t')) {
            if (currentProperty && currentEvent) {
                currentValue += ' ' + line;
            }
            continue;
        }
        
        // Save previous property value
        if (currentProperty && currentEvent) {
            const trimmedValue = currentValue.trim();
            if (currentProperty === 'start' || currentProperty === 'end') {
                // Already a Date object
                currentEvent[currentProperty] = trimmedValue;
            } else {
                currentEvent[currentProperty] = trimmedValue;
            }
            currentProperty = '';
            currentValue = '';
        }
        
        // Check for event start
        if (line === 'BEGIN:VEVENT') {
            inEvent = true;
            currentEvent = {
                summary: '',
                description: '',
                location: '',
                start: null,
                end: null,
                rrule: null
            };
            continue;
        }
        
        // Check for event end
        if (line === 'END:VEVENT') {
            if (currentEvent) {
                // Save any remaining property
                if (currentProperty && currentValue) {
                    const trimmedValue = currentValue.trim();
                    if (currentProperty === 'start' || currentProperty === 'end') {
                        currentEvent[currentProperty] = trimmedValue;
                    } else {
                        currentEvent[currentProperty] = trimmedValue;
                    }
                }
                
                // Only add event if it has a start date
                if (currentEvent.start) {
                    // If no end date, set it to start date + 1 hour
                    if (!currentEvent.end) {
                        currentEvent.end = new Date(currentEvent.start.getTime() + 60 * 60 * 1000);
                    }
                    if (currentEvent.rrule) {
                        console.log('Found recurring event:', currentEvent.summary || 'Untitled', 'RRULE:', currentEvent.rrule);
                    }
                    events.push(currentEvent);
                    console.log('Added event:', currentEvent.summary || 'Untitled', 'Start:', currentEvent.start);
                } else {
                    console.log('Skipped event - no start date:', currentEvent);
                }
            }
            inEvent = false;
            currentEvent = null;
            currentProperty = '';
            currentValue = '';
            continue;
        }
        
        if (!inEvent) continue;
        
        // Parse property
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;
        
        const property = line.substring(0, colonIndex).toUpperCase();
        const value = line.substring(colonIndex + 1);
        
        // Handle property parameters (e.g., DTSTART;TZID=America/Los_Angeles:20240101T180000)
        const semicolonIndex = property.indexOf(';');
        const propertyName = semicolonIndex !== -1 ? property.substring(0, semicolonIndex) : property;
        
        switch (propertyName) {
            case 'SUMMARY':
                currentProperty = 'summary';
                currentValue = value;
                break;
            case 'DESCRIPTION':
                currentProperty = 'description';
                currentValue = value;
                break;
            case 'LOCATION':
                currentProperty = 'location';
                // Decode iCal escape sequences when parsing
                currentValue = decodeICalText(value);
                break;
            case 'DTSTART':
                currentProperty = 'start';
                const startDate = parseICalDate(value);
                if (startDate) {
                    currentEvent.start = startDate;
                    currentProperty = ''; // Clear since we set it directly
                } else {
                    console.log('Failed to parse DTSTART:', value);
                }
                break;
            case 'DTEND':
                currentProperty = 'end';
                const endDate = parseICalDate(value);
                if (endDate) {
                    currentEvent.end = endDate;
                    currentProperty = ''; // Clear since we set it directly
                } else {
                    console.log('Failed to parse DTEND:', value);
                }
                break;
            case 'RRULE':
                currentProperty = 'rrule';
                currentValue = value;
                break;
        }
    }
    
    // Save last property if exists
    if (currentProperty && currentEvent && currentProperty !== 'start' && currentProperty !== 'end') {
        currentEvent[currentProperty] = currentValue.trim();
    }
    
    return events;
}

// Parse iCal date format
function parseICalDate(dateString) {
    if (!dateString) return null;
    
    // Google Calendar iCal format examples:
    // "20240101T180000Z" (UTC with Z)
    // "20240101T180000" (local time)
    // "20240101" (date only)
    
    // Remove any whitespace
    dateString = dateString.trim();
    
    // Check if it's a date-only format (YYYYMMDD)
    if (dateString.length === 8 && /^\d{8}$/.test(dateString)) {
        const year = parseInt(dateString.substring(0, 4));
        const month = parseInt(dateString.substring(4, 6)) - 1; // Month is 0-indexed
        const day = parseInt(dateString.substring(6, 8));
        return new Date(year, month, day, 0, 0, 0);
    }
    
    // Check if it's a date-time format (YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ)
    if (dateString.length >= 15 && dateString.includes('T')) {
        const datePart = dateString.substring(0, 8);
        const timePart = dateString.substring(9);
        
        const year = parseInt(datePart.substring(0, 4));
        const month = parseInt(datePart.substring(4, 6)) - 1;
        const day = parseInt(datePart.substring(6, 8));
        
        // Parse time part (HHMMSS or HHMMSSZ)
        const timeStr = timePart.replace('Z', '');
        let hours = 0;
        let minutes = 0;
        let seconds = 0;
        
        if (timeStr.length >= 6) {
            hours = parseInt(timeStr.substring(0, 2)) || 0;
            minutes = parseInt(timeStr.substring(2, 4)) || 0;
            seconds = parseInt(timeStr.substring(4, 6)) || 0;
        } else if (timeStr.length >= 4) {
            hours = parseInt(timeStr.substring(0, 2)) || 0;
            minutes = parseInt(timeStr.substring(2, 4)) || 0;
        }
        
        // If it ends with Z, it's UTC, otherwise treat as local
        const isUTC = dateString.endsWith('Z');
        if (isUTC) {
            return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
        } else {
            return new Date(year, month, day, hours, minutes, seconds);
        }
    }
    
    console.log('Could not parse date string:', dateString);
    return null;
}

// Expand recurring events based on RRULE
function expandRecurringEvents(events) {
    const expandedEvents = [];
    const now = new Date();
    // Expand up to 1 year in the future to cover the date range selector
    const maxDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    
    for (const event of events) {
        // If event has RRULE, expand it (don't include the original template event)
        if (event.rrule && event.start) {
            const instances = expandRRULE(event, maxDate);
            expandedEvents.push(...instances);
            console.log(`Expanded recurring event "${event.summary || 'Untitled'}" into ${instances.length} instances`);
        } else {
            // Non-recurring event, add it as-is
            expandedEvents.push(event);
        }
    }
    
    return expandedEvents;
}

// Parse and expand RRULE
function expandRRULE(event, maxDate) {
    if (!event.rrule || !event.start) return [];
    
    const instances = [];
    const rrule = parseRRULE(event.rrule);
    
    if (!rrule) {
        console.log('Could not parse RRULE:', event.rrule);
        return [];
    }
    
    // Convert start date to UTC for RRULE calculations
    // RRULEs are typically defined in UTC, so we need to work in UTC space
    const startUTC = new Date(event.start);
    const utcYear = startUTC.getUTCFullYear();
    const utcMonth = startUTC.getUTCMonth();
    const utcDay = startUTC.getUTCDate();
    const utcHours = startUTC.getUTCHours();
    const utcMinutes = startUTC.getUTCMinutes();
    const utcSeconds = startUTC.getUTCSeconds();
    
    // Create UTC date for calculations
    let currentDateUTC = new Date(Date.UTC(utcYear, utcMonth, utcDay, utcHours, utcMinutes, utcSeconds));
    const duration = event.end ? (event.end.getTime() - event.start.getTime()) : (60 * 60 * 1000); // Default 1 hour
    let count = 0;
    const maxInstances = 500; // Safety limit
    
    console.log(`Expanding RRULE: ${event.rrule}`);
    console.log(`Start date UTC: ${currentDateUTC.toISOString()}`);
    console.log(`Start date Pacific: ${currentDateUTC.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`);
    
    // For weekly events with BYDAY, check if the start date matches the BYDAY in UTC
    // If not, find the first matching occurrence
    if (rrule.freq === 'WEEKLY' && rrule.byday && rrule.byday.length > 0) {
        const dayMap = { 'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6 };
        const targetDays = rrule.byday.map(d => {
            const match = d.match(/^(-?\d+)?([A-Z]+)$/i);
            if (match) {
                return dayMap[match[2].toUpperCase()];
            }
            return dayMap[d.toUpperCase()];
        }).filter(d => d !== null && d !== undefined);
        
        // Check day of week in UTC
        const currentDayUTC = currentDateUTC.getUTCDay();
        console.log(`Target days (UTC): ${targetDays}, Current day (UTC): ${currentDayUTC}`);
        
        // If current date doesn't match any target day, find the first matching day
        if (targetDays.length > 0 && !targetDays.includes(currentDayUTC)) {
            // Preserve the original UTC time
            const originalUTCHours = currentDateUTC.getUTCHours();
            const originalUTCMinutes = currentDateUTC.getUTCMinutes();
            const originalUTCSeconds = currentDateUTC.getUTCSeconds();
            
            console.log(`Start date doesn't match target days in UTC, finding next match...`);
            
            // Find the next matching day within the next 7 days (in UTC)
            for (let i = 1; i <= 7; i++) {
                const checkDateUTC = new Date(currentDateUTC);
                checkDateUTC.setUTCDate(checkDateUTC.getUTCDate() + i);
                if (targetDays.includes(checkDateUTC.getUTCDay())) {
                    // Set the time to match the original event time (in UTC)
                    checkDateUTC.setUTCHours(originalUTCHours, originalUTCMinutes, originalUTCSeconds);
                    currentDateUTC = checkDateUTC;
                    console.log(`Adjusted to first matching day (UTC): ${currentDateUTC.toISOString()}`);
                    console.log(`Adjusted to first matching day (Pacific): ${currentDateUTC.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`);
                    break;
                }
            }
        }
    }
    
    // Convert maxDate to UTC for comparison
    const maxDateUTC = new Date(maxDate.getTime());
    
    while (currentDateUTC <= maxDateUTC && count < maxInstances) {
        // Create instance dates - convert from UTC to local Date objects
        // The Date object will automatically handle timezone conversion when displayed
        const instanceStart = new Date(currentDateUTC.getTime());
        const instanceEnd = new Date(instanceStart.getTime() + duration);
        
        const instance = {
            summary: event.summary,
            description: event.description,
            location: event.location,
            start: instanceStart,
            end: instanceEnd,
            rrule: null // Mark as instance, not recurring
        };
        
        if (count < 3) {
            console.log(`Instance ${count + 1} UTC: ${currentDateUTC.toISOString()}`);
            console.log(`Instance ${count + 1} Pacific: ${instanceStart.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`);
        }
        
        instances.push(instance);
        count++;
        
        // Calculate next occurrence based on FREQ (all in UTC)
        if (rrule.freq === 'WEEKLY') {
            // Handle BYDAY if specified (e.g., BYDAY=TH for Thursdays)
            if (rrule.byday && rrule.byday.length > 0) {
                const dayMap = { 'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6 };
                const targetDays = rrule.byday.map(d => {
                    // Handle numeric prefixes like "1TH" (first Thursday) or "-1TH" (last Thursday)
                    const match = d.match(/^(-?\d+)?([A-Z]+)$/i);
                    if (match) {
                        return dayMap[match[2].toUpperCase()];
                    }
                    return dayMap[d.toUpperCase()];
                }).filter(d => d !== null && d !== undefined);
                
                if (targetDays.length > 0) {
                    // Find the next matching day after currentDateUTC (in UTC)
                    let daysToAdd = 1;
                    let found = false;
                    // Look up to 14 days ahead (2 weeks)
                    for (let i = 1; i <= 14; i++) {
                        const checkDateUTC = new Date(currentDateUTC);
                        checkDateUTC.setUTCDate(checkDateUTC.getUTCDate() + i);
                        if (targetDays.includes(checkDateUTC.getUTCDay())) {
                            daysToAdd = i;
                            found = true;
                            break;
                        }
                    }
                    if (found) {
                        currentDateUTC = new Date(currentDateUTC);
                        currentDateUTC.setUTCDate(currentDateUTC.getUTCDate() + daysToAdd);
                    } else {
                        // If no match found, advance by interval weeks
                        currentDateUTC = new Date(currentDateUTC);
                        currentDateUTC.setUTCDate(currentDateUTC.getUTCDate() + (rrule.interval || 1) * 7);
                    }
                } else {
                    // No BYDAY, just advance by interval weeks
                    currentDateUTC = new Date(currentDateUTC);
                    currentDateUTC.setUTCDate(currentDateUTC.getUTCDate() + (rrule.interval || 1) * 7);
                }
            } else {
                // No BYDAY, just advance by interval weeks
                currentDateUTC = new Date(currentDateUTC);
                currentDateUTC.setUTCDate(currentDateUTC.getUTCDate() + (rrule.interval || 1) * 7);
            }
        } else if (rrule.freq === 'DAILY') {
            currentDateUTC = new Date(currentDateUTC);
            currentDateUTC.setUTCDate(currentDateUTC.getUTCDate() + (rrule.interval || 1));
        } else if (rrule.freq === 'MONTHLY') {
            currentDateUTC = new Date(currentDateUTC);
            currentDateUTC.setUTCMonth(currentDateUTC.getUTCMonth() + (rrule.interval || 1));
        } else if (rrule.freq === 'YEARLY') {
            currentDateUTC = new Date(currentDateUTC);
            currentDateUTC.setUTCFullYear(currentDateUTC.getUTCFullYear() + (rrule.interval || 1));
        } else {
            // Unknown frequency, stop
            break;
        }
        
        // Check COUNT limit
        if (rrule.count && count >= rrule.count) {
            break;
        }
        
        // Check UNTIL limit (compare in UTC)
        if (rrule.until) {
            const untilUTC = new Date(rrule.until);
            if (currentDateUTC > untilUTC) {
                break;
            }
        }
    }
    
    return instances;
}

// Parse RRULE string (e.g., "FREQ=WEEKLY;BYDAY=TH;INTERVAL=1")
function parseRRULE(rruleString) {
    if (!rruleString) return null;
    
    const rrule = {};
    const parts = rruleString.split(';');
    
    for (const part of parts) {
        const [key, value] = part.split('=');
        if (!key || !value) continue;
        
        const upperKey = key.toUpperCase();
        
        if (upperKey === 'FREQ') {
            rrule.freq = value.toUpperCase();
        } else if (upperKey === 'INTERVAL') {
            rrule.interval = parseInt(value) || 1;
        } else if (upperKey === 'COUNT') {
            rrule.count = parseInt(value);
        } else if (upperKey === 'UNTIL') {
            rrule.until = parseICalDate(value);
        } else if (upperKey === 'BYDAY') {
            // Handle multiple days (e.g., "MO,WE,FR" or single "TH")
            rrule.byday = value.split(',');
        }
    }
    
    return rrule.freq ? rrule : null;
}

// Load events using Google Calendar API v3 (expands recurring events automatically)
async function loadEventsFromAPI() {
    try {
        // Get date range for filtering
        const startDate = startDateInput.value ? new Date(startDateInput.value) : new Date();
        const endDate = endDateInput.value ? new Date(endDateInput.value) : new Date();
        endDate.setHours(23, 59, 59, 999);
        
        // Format dates as RFC3339
        const timeMin = startDate.toISOString();
        const timeMax = endDate.toISOString();
        
        // Encode calendar ID for URL
        const encodedCalendarId = encodeURIComponent(CALENDAR_ID);
        
        // Build API URL with singleEvents=true to expand recurring events
        const apiUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events?key=${API_KEY}&singleEvents=true&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=2500&orderBy=startTime`;
        
        console.log('Fetching from Google Calendar API v3...');
        console.log('API URL:', apiUrl.replace(API_KEY, 'API_KEY_HIDDEN'));
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('API response received,', data.items?.length || 0, 'events');
        
        if (data.items && data.items.length > 0) {
            // Convert API events to our event format
            const events = data.items.map(item => {
                const start = item.start.dateTime ? new Date(item.start.dateTime) : new Date(item.start.date);
                const end = item.end.dateTime ? new Date(item.end.dateTime) : new Date(item.end.date);
                
                return {
                    summary: item.summary || '',
                    description: item.description || '',
                    location: item.location || '',
                    start: start,
                    end: end,
                    rrule: null // Already expanded by API
                };
            });
            
            // Sort all events by date
            allEvents = events
                .filter(event => event.start) // Only keep events with valid start dates
                .sort((a, b) => a.start.getTime() - b.start.getTime());
            console.log('Processed', allEvents.length, 'events from API');
            applyFilter();
        } else {
            allEvents = [];
            console.log('No events found in API response');
            applyFilter();
        }
    } catch (error) {
        console.error('Error loading events from API:', error);
        eventsContainer.innerHTML = `
            <div class="empty-state">
                <p>Unable to load events from Google Calendar API.</p>
                <p style="margin-top: 0.5rem; font-size: 0.875rem; opacity: 0.7;">Error: ${error.message}</p>
                <p style="margin-top: 0.5rem; font-size: 0.875rem; opacity: 0.7;">Falling back to iCal feed...</p>
            </div>
        `;
        // Fallback to iCal feed
        loadingState.classList.remove('active');
        // Remove API_KEY temporarily to use iCal feed
        const originalApiKey = API_KEY;
        // This will trigger iCal feed loading
        setTimeout(() => {
            // Re-enable API key and retry, or just use iCal
            loadEventsFromICal();
        }, 1000);
    } finally {
        loadingState.classList.remove('active');
    }
}

// Load events from iCal feed (fallback method)
async function loadEventsFromICal() {
    try {
        loadingState.classList.add('active');
        eventsContainer.innerHTML = '';
        
        // Try direct fetch first, then fallback to CORS proxy
        const calendarUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(CALENDAR_ID)}/public/basic.ics`;
        console.log('Calendar URL (iCal):', calendarUrl);
        
        let icalData = null;
        
        try {
            // Try direct fetch
            console.log('Attempting direct fetch...');
            const directResponse = await fetch(calendarUrl);
            if (directResponse.ok) {
                icalData = await directResponse.text();
                console.log('Direct fetch successful, received', icalData.length, 'characters');
            } else {
                throw new Error('Direct fetch failed');
            }
        } catch (directError) {
            // Fallback to CORS proxies (try multiple services)
            console.log('Direct fetch failed, trying CORS proxies...');
            
            const proxyServices = [
                {
                    name: 'allorigins.win',
                    url: `https://api.allorigins.win/get?url=${encodeURIComponent(calendarUrl)}`,
                    parse: (data) => data.contents
                },
                {
                    name: 'corsproxy.io',
                    url: `https://corsproxy.io/?${encodeURIComponent(calendarUrl)}`,
                    parse: (data) => typeof data === 'string' ? data : null
                },
                {
                    name: 'cors-anywhere (herokuapp)',
                    url: `https://cors-anywhere.herokuapp.com/${calendarUrl}`,
                    parse: (data) => typeof data === 'string' ? data : null
                }
            ];
            
            let proxySuccess = false;
            for (const proxy of proxyServices) {
                try {
                    console.log(`Trying proxy: ${proxy.name}...`);
                    const proxyResponse = await fetch(proxy.url, {
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    });
                    
                    if (proxyResponse.ok) {
                        let proxyData;
                        // Try to parse as JSON first (for allorigins format)
                        try {
                            proxyData = await proxyResponse.json();
                        } catch {
                            // If not JSON, treat as text
                            proxyData = await proxyResponse.text();
                        }
                        
                        icalData = proxy.parse(proxyData);
                        
                        if (icalData) {
                            console.log(`Proxy ${proxy.name} successful, received`, icalData.length, 'characters');
                            
                            // Check if it's a data URI (base64 encoded)
                            if (icalData.startsWith('data:')) {
                                console.log('Detected data URI, decoding base64...');
                                const base64Match = icalData.match(/base64,(.+)$/);
                                if (base64Match && base64Match[1]) {
                                    try {
                                        icalData = atob(base64Match[1]);
                                        console.log('Decoded base64, now', icalData.length, 'characters');
                                    } catch (e) {
                                        console.error('Failed to decode base64:', e);
                                        continue; // Try next proxy
                                    }
                                }
                            }
                            
                            proxySuccess = true;
                            break;
                        }
                    }
                } catch (proxyError) {
                    console.log(`Proxy ${proxy.name} failed:`, proxyError.message);
                    continue; // Try next proxy
                }
            }
            
            if (!proxySuccess) {
                throw new Error('All CORS proxy attempts failed. The calendar may need to be set to public, or there may be network issues.');
            }
        }
        
        if (icalData) {
            console.log('Parsing iCal data...');
            console.log('First 500 characters of iCal data:', icalData.substring(0, 500));
            const events = parseICal(icalData);
            console.log('Parsed', events.length, 'events');
            if (events.length > 0) {
                console.log('Sample event:', events[0]);
            }
            
            // Expand recurring events
            const expandedEvents = expandRecurringEvents(events);
            console.log('Expanded to', expandedEvents.length, 'events (including recurring instances)');
            
            // Sort all events by date
            allEvents = expandedEvents
                .filter(event => event.start) // Only keep events with valid start dates
                .sort((a, b) => a.start.getTime() - b.start.getTime());
            console.log('Filtered to', allEvents.length, 'events with valid dates');
            applyFilter();
        } else {
            throw new Error('No calendar data received');
        }
    } catch (error) {
        console.error('Error loading events from iCal:', error);
        eventsContainer.innerHTML = `
            <div class="empty-state">
                <p>Unable to load events from Google Calendar.</p>
                <p style="margin-top: 0.5rem; font-size: 0.875rem; opacity: 0.7;">${error.message}</p>
                <p style="margin-top: 1rem; font-size: 0.875rem; opacity: 0.7;">
                    <strong>Troubleshooting:</strong><br>
                    1. Ensure your Google Calendar is set to "Public"<br>
                    2. In Calendar Settings → Access permissions → Make available to public<br>
                    3. Check that the calendar ID is correct: ${CALENDAR_ID}
                </p>
                <button class="btn-refresh" id="retry-load-events" style="margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: var(--text-primary); color: var(--bg-dark); border: none; border-radius: 8px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease;" onmouseover="this.style.opacity='0.9'; this.style.transform='translateY(-1px)'" onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)'">
                    Refresh
                </button>
            </div>
        `;
        
        // Add click listener to refresh button
        const refreshBtn = document.getElementById('retry-load-events');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadEvents();
            });
        }
    } finally {
        loadingState.classList.remove('active');
    }
}

// Apply date filter
function applyFilter() {
    const startDate = startDateInput.value ? new Date(startDateInput.value) : null;
    const endDate = endDateInput.value ? new Date(endDateInput.value) : null;
    
    // Set end date to end of day (23:59:59)
    if (endDate) {
        endDate.setHours(23, 59, 59, 999);
    }
    
    console.log('Applying filter - Start:', startDate, 'End:', endDate);
    filteredEvents = allEvents.filter(event => {
        if (startDate && event.start < startDate) return false;
        if (endDate && event.start > endDate) return false;
        return true;
    });
    
    console.log('Filtered to', filteredEvents.length, 'events');
    renderEvents();
}

// Render events
function renderEvents() {
    if (filteredEvents.length === 0) {
        eventsContainer.innerHTML = `
            <div class="empty-state">
                <p>No events found for the selected date range.</p>
            </div>
        `;
        return;
    }
    
    eventsContainer.innerHTML = filteredEvents.map(event => createEventCard(event)).join('');
    
    // Add click listeners to event cards
    eventsContainer.querySelectorAll('.event-card').forEach((card, index) => {
        card.addEventListener('click', () => showEventModal(filteredEvents[index]));
    });
}

// Create Google Maps URL from location
function createMapsUrl(location) {
    if (!location || location === 'Location TBD') return null;
    const encodedLocation = encodeURIComponent(location);
    return `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
}

// Create event card HTML
function createEventCard(event) {
    const dateStr = formatEventDate(event.start);
    const timeStr = formatEventTime(event.start, event.end);
    const locationStr = decodeICalText(event.location) || 'Location TBD';
    const mapsUrl = createMapsUrl(locationStr);
    
    const locationHtml = mapsUrl 
        ? `<a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="location-link">${escapeHtml(locationStr)}</a>`
        : escapeHtml(locationStr);
    
    return `
        <div class="event-card">
            <div class="event-header">
                <h3 class="event-title">${escapeHtml(event.summary || 'Untitled Event')}</h3>
                <span class="event-date">${dateStr}</span>
            </div>
            <div class="event-time">${timeStr}</div>
            <div class="event-location">${locationHtml}</div>
        </div>
    `;
}

// Format event date
function formatEventDate(date) {
    if (!date) return '';
    
    // Format in Pacific timezone to avoid date offset issues
    // Create a new date object to ensure we're working with the correct timezone
    const pacificDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    
    const options = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        timeZone: 'America/Los_Angeles'
    };
    return date.toLocaleDateString('en-US', options);
}

// Format event time
function formatEventTime(start, end) {
    if (!start) return '';
    
    // Format in Pacific timezone to avoid time offset issues
    const timeOptions = { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Los_Angeles'
    };
    
    const startTime = start.toLocaleTimeString('en-US', timeOptions);
    
    if (end) {
        const endTime = end.toLocaleTimeString('en-US', timeOptions);
        return `${startTime} - ${endTime}`;
    }
    
    return startTime;
}

// Show event modal
function showEventModal(event) {
    document.getElementById('modal-title').textContent = event.summary || 'Untitled Event';
    document.getElementById('modal-time').textContent = formatEventTime(event.start, event.end) + 
        (event.start ? ` (${formatEventDate(event.start)})` : '');
    
    const locationStr = decodeICalText(event.location) || 'Location TBD';
    const locationEl = document.getElementById('modal-location');
    const mapsUrl = createMapsUrl(locationStr);
    
    if (mapsUrl) {
        locationEl.innerHTML = `<a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="location-link">${escapeHtml(locationStr)}</a>`;
    } else {
        locationEl.textContent = locationStr;
    }
    
    const description = event.description || 'No description available.';
    const descriptionEl = document.getElementById('modal-description');
    // Render HTML content (description comes from Google Calendar, a trusted source)
    descriptionEl.innerHTML = description;
    
    eventModal.showModal();
}

// Decode iCal escape sequences
function decodeICalText(text) {
    if (!text) return text;
    
    // iCal escape sequences:
    // \, -> comma
    // \; -> semicolon
    // \\ -> backslash
    // \n or \N -> newline
    return text
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\\\/g, '\\')
        .replace(/\\[nN]/g, '\n');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

