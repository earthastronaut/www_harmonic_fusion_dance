# Harmonic Blues Fusion - Landing Page

A beautiful, responsive landing page for the Harmonic Blues Fusion dance community, designed to be hosted on GitHub Pages.

## Features

- **Modern, Responsive Design**: Works beautifully on desktop, tablet, and mobile devices
- **Email Subscription**: Integrated email subscription form using eoMail5
- **Contact Form**: Easy-to-use contact form that opens your email client
- **Smooth Scrolling**: Smooth navigation between page sections
- **Clean Code**: Well-organized HTML, CSS, and JavaScript

## Structure

```
.
├── index.html      # Main HTML file
├── styles.css      # All styling
├── script.js       # JavaScript functionality
└── README.md       # This file
```

## Setup for GitHub Pages

1. **Create a GitHub Repository**
   - Create a new repository on GitHub
   - Name it (e.g., `harmonic-blues-fusion` or your GitHub username + `.github.io`)

2. **Push Files to Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**
   - Go to your repository settings
   - Navigate to "Pages" in the left sidebar
   - Under "Source", select "Deploy from a branch"
   - Choose "main" branch and "/ (root)" folder
   - Click "Save"

4. **Access Your Site**
   - Your site will be available at: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`
   - If you named your repo `USERNAME.github.io`, it will be at: `https://USERNAME.github.io/`

## Customization

### Colors
Edit the CSS variables in `styles.css` to match your brand:
```css
:root {
    --primary-color: #6b46c1;
    --secondary-color: #ec4899;
    /* ... */
}
```

### Content
- Update text content in `index.html`
- Modify sections as needed
- Add or remove feature cards

### Email Subscription
The email subscription form is embedded using the provided script. The form ID is already configured in the HTML.

### Contact Email
The contact form is set to send emails to `harmonicfusiondance@gmail.com`. To change this, update the email address in `script.js`:
```javascript
const mailtoLink = `mailto:YOUR_EMAIL@example.com?subject=${subject}&body=${body}`;
```

## Browser Support

This site works on all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## License

This project is open source and available for use.

## Contact

For questions about the Harmonic Blues Fusion community, email: harmonicfusiondance@gmail.com

