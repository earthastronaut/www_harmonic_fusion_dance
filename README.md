# Harmonic Blues Fusion - Landing Page

Static landing page for the Harmonic Blues Fusion dance community, ready to host on GitHub Pages.

## Setup

1. Create a new GitHub repository
2. Push these files to the repository
3. Go to Settings → Pages → Deploy from branch → Select `main` branch
4. Your site will be live at `https://YOUR_USERNAME.github.io/REPO_NAME/`

## Files

- `index.html` - Main page
- `styles.css` - Styling
- `script.js` - Contact form functionality
- `calendar.js` - Calendar events loading and display

## Google Calendar API Setup

The calendar can use either the Google Calendar API v3 (recommended) or fall back to the iCal feed. Using the API provides better performance and automatically expands recurring events.

### Getting a Google Calendar API Key

1. **Go to Google Cloud Console**
   - Visit [https://console.cloud.google.com/](https://console.cloud.google.com/)
   - Sign in with your Google account

2. **Create a New Project** (or select an existing one)
   - Click the project dropdown at the top
   - Click "New Project"
   - Enter a project name (e.g., "Harmonic Fusion Calendar")
   - Click "Create"

3. **Enable Google Calendar API**
   - In the left sidebar, go to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click on it and press "Enable"

4. **Create API Key**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the generated API key

5. **Restrict the API Key** (Recommended for security)
   - Click on the newly created API key to edit it
   - Under "Application restrictions", select "HTTP referrers (web sites)"
   - Add your website URL (e.g., `https://harmonicfusiondance.github.io/*`)
   - Under "API restrictions", select "Restrict key"
   - Check only "Google Calendar API"
   - Click "Create"

6. **Configure the API Key in calendar.js**
   - Open `calendar.js`
   - Find the line: `const API_KEY = '';`
   - Replace the empty string with your API key:
     ```javascript
     const API_KEY = 'YOUR_API_KEY_HERE';
     ```

### Is it Safe to Use a Public API Key?

**Yes, it's safe** for public calendars because:
- The API key is restricted to only the Google Calendar API
- The calendar must be set to "Public" for the API to access it
- The key can only read public calendar data (no write access)
- You can further restrict it to only work from your specific website domain

### Benefits of Using the API

- **Automatic recurring event expansion** - No manual RRULE parsing needed
- **Better performance** - Direct API calls are faster than iCal feed parsing
- **More reliable** - No dependency on CORS proxies
- **Better error handling** - Clearer error messages if something goes wrong

### Fallback to iCal Feed

If no API key is provided (or if the API call fails), the calendar will automatically fall back to using the public iCal feed. This requires the calendar to be set to "Public" in Google Calendar settings.

### Troubleshooting 403 Forbidden Errors

If you see a `403 (Forbidden)` error when using the API, check the following:

1. **Calendar Must Be Public**
   - Go to [Google Calendar](https://calendar.google.com/)
   - Click the three dots next to your calendar → "Settings and sharing"
   - Under "Access permissions", check "Make available to public"
   - Select "See all event details" (not just "See only free/busy")

2. **Enable Billing in Google Cloud Console**
   - Even though the free tier is sufficient, Google requires billing to be enabled
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to "Billing" in the left menu
   - Link a billing account (you won't be charged for basic API usage within free quotas)

3. **Verify API Key Restrictions**
   - Go to "APIs & Services" → "Credentials"
   - Click on your API key
   - Under "API restrictions", ensure "Google Calendar API" is checked
   - Under "Application restrictions", if using HTTP referrers, ensure your domain is correct
   - **Note**: If you're testing locally, you may need to temporarily remove HTTP referrer restrictions or add `http://localhost:*` and `http://127.0.0.1:*`

4. **Check Calendar ID Format**
   - The calendar ID in `calendar.js` should match your Google Calendar email
   - For Gmail calendars, use the full email: `yourcalendar@gmail.com`
   - For other calendar types, you may need the full calendar ID from Calendar settings

5. **Verify API is Enabled**
   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Ensure it shows "Enabled" (not "Enable")

If issues persist, the calendar will automatically fall back to the iCal feed method.

## Customization

Edit `index.html` for content changes and `styles.css` for colors and styling.

