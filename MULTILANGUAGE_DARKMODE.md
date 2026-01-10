# Multi-Language & Dark Mode Implementation

## Overview
This document describes the implementation of multi-language support (Indonesian & English) and dark mode functionality for the WA Server dashboard application.

## Features Implemented

### 1. Multi-Language Support (i18n)
- **Supported Languages:**
  - 🇮🇩 Bahasa Indonesia (id)
  - 🇬🇧 English (en)

- **Default Language:** 
  - Set via `.env` file: `VITE_DEFAULT_LANGUAGE=id`
  - Falls back to Indonesian if not specified
  - Persists user's language choice in localStorage

- **Translation Files:**
  - `/client/src/locales/en.js` - English translations
  - `/client/src/locales/id.js` - Indonesian translations
  - `/client/src/locales/index.js` - Export all translations

### 2. Dark Mode Support
- **Features:**
  - Auto-detects system preference on first load
  - Toggle between light/dark themes
  - Persists theme choice in localStorage
  - Smooth transitions between themes

- **Implementation:**
  - Uses Tailwind's dark mode class strategy
  - ThemeContext provides global theme state
  - Theme toggle available in:
    - Desktop sidebar footer
    - Mobile profile dropdown
    - Chat page header

### 3. User Interface Updates

#### Dashboard Layout (`DashboardLayout.jsx`)
- **Desktop Sidebar:**
  - Theme toggle button (Sun/Moon icon)
  - Language switcher dropdown with flags
  - All navigation items translated

- **Mobile Header:**
  - Profile dropdown includes:
    - Theme toggle
    - Language selection buttons
    - Settings and logout options
  - All text translated

#### CS Dashboard (`CSDashboard.jsx`)
- Fully translated including:
  - Page title and subtitle
  - Stat cards
  - Priority queue section
  - Agent activity section
  - AI efficiency metrics

## File Structure

```
client/
├── src/
│   ├── locales/
│   │   ├── en.js          # English translations
│   │   ├── id.js          # Indonesian translations
│   │   └── index.js       # Export all translations
│   ├── context/
│   │   ├── LanguageContext.jsx  # Language management
│   │   ├── ThemeContext.jsx     # Theme management
│   │   └── AuthContext.jsx      # (existing)
│   ├── components/
│   │   └── layout/
│   │       └── DashboardLayout.jsx  # Updated with theme & language
│   ├── pages/
│   │   ├── CSDashboard.jsx      # Translated
│   │   └── ...                  # (Ready for translation)
│   └── App.jsx                  # Wrapped with providers
└── .env                         # Default language setting
```

## Translation Usage

### In Components
```jsx
import { useLanguage } from '../context/LanguageContext';

function MyComponent() {
  const { t, language, changeLanguage } = useLanguage();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.welcome')}</p>
    </div>
  );
}
```

### Theme Usage
```jsx
import { useTheme } from '../context/ThemeContext';

function MyComponent() {
  const { theme, toggleTheme, isDark } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      {isDark ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
}
```

## Configuration

### Client .env
```bash
# Set default language (id or en)
VITE_DEFAULT_LANGUAGE=id
```

### Adding New Translations
1. Add keys to both `/client/src/locales/en.js` and `/client/src/locales/id.js`
2. Use nested objects for organization
3. Access with dot notation: `t('section.key')`

Example:
```js
// en.js
export const en = {
  mySection: {
    title: "My Title",
    description: "My Description"
  }
};

// id.js
export const id = {
  mySection: {
    title: "Judul Saya",
    description: "Deskripsi Saya"
  }
};

// Usage in component
{t('mySection.title')}
```

## Browser Support
- Dark mode: All modern browsers with `prefers-color-scheme` support
- Language switching: All browsers with localStorage support

## Next Steps (Optional)
- Add translations to remaining pages:
  - Dashboard.jsx
  - Devices.jsx
  - Agents.jsx
  - AISettings.jsx
  - Gallery.jsx
  - Chats.jsx
  - Login.jsx

## Testing
1. **Language Switch:**
   - Click language dropdown in sidebar
   - Select different language
   - Verify all text updates
   - Refresh page - language persists

2. **Dark Mode:**
   - Click theme toggle (Sun/Moon icon)
   - Verify colors switch
   - Refresh page - theme persists

3. **Default Language:**
   - Clear localStorage
   - Set `VITE_DEFAULT_LANGUAGE=en` in `.env`
   - Restart dev server
   - Verify English is default

## Notes
- Language changes are instant (no page reload required)
- Theme switches use CSS transitions for smooth effect
- Both settings persist across browser sessions
- System preferences are respected on first load
