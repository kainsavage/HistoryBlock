---
alwaysApply: true
---

# HistoryBlock Firefox Extension - Cursor Rules

## Project Overview
HistoryBlock is a Firefox browser extension that maintains a blacklist of undesirable web addresses to prevent them from being tracked in browser history, recently closed tabs, and recently closed windows. The extension provides privacy by automatically removing blocked domains from browser history and session data.

## Architecture & Directory Structure

### Core Files
- `manifest.json` - Firefox extension manifest (Manifest V2)
- `historyblock.js` - Main background script containing the HistoryBlock class
- `build.sh` - Simple build script for packaging the extension

### Options Page (`options/`)
- `index.html` - Options page UI
- `options.css` - Styling for options page
- `options.js` - Options page logic and UI management

### Libraries (`libraries/`)
- `Matcher.js` - Base class for URL matching strategies
- `DomainMatcher.js` - Extracts domain names (e.g., google.com from www.google.com)
- `SubdomainMatcher.js` - Matches subdomains (e.g., www.google.com)
- `URLMatcher.js` - Matches full URLs (most specific)
- `SHA1.js` - SHA1 hashing implementation using Web Crypto API
- `NoHash.js` - Pass-through hasher for unencrypted storage
- `psl.js` - Public Suffix List library for domain parsing

### Localization (`_locales/`)
- `en/messages.json` - English translations for UI strings

### Assets (`icons/`)
- Various PNG icons in different sizes (16x16 to 512x512)

## Key Features & Functionality

### Blacklist Management
- **Encryption Options**: SHA1 (default) or None (plain text)
- **Matching Strategies**: Domain, Subdomain, or URL matching
- **Storage**: Uses `browser.storage.sync` for cross-device synchronization
- **Import/Export**: Legacy support for migrating v1.x blacklists

### Browser Integration
- **History Blocking**: Removes URLs from browser history on visit
- **Session Blocking**: Removes tabs/windows from recently closed lists
- **Context Menu**: Right-click "Block"/"Unblock" options on any page
- **Options Page**: Full management interface accessible via `about:addons`

### Event Handling
- `browser.history.onVisited` - Blocks history entries
- `browser.tabs.onRemoved` - Removes from recently closed tabs
- `browser.windows.onRemoved` - Removes from recently closed windows
- `browser.contextMenus.onClicked` - Handles context menu actions

## Technical Implementation

### Class Structure
- **HistoryBlock**: Main class managing all extension functionality
- **Options**: Handles options page UI and user interactions
- **Matcher Classes**: Strategy pattern for different URL matching approaches
- **Hash Classes**: Strategy pattern for encryption (SHA1 vs NoHash)

### Message Passing
- Background script communicates with options page via `browser.runtime.sendMessage`
- Actions: `addToBlacklist`, `removeFromBlacklist`, `clearBlacklist`, `changeBlacklistType`, `changeBlacklistMatching`, `importBlacklist`

### Permissions Required
- `sessions` - Access to recently closed tabs/windows
- `tabs` - Tab information for context menu
- `history` - Browser history manipulation
- `storage` - Persistent blacklist storage
- `contextMenus` - Right-click menu integration

## Development Guidelines

### Code Style
- ES6+ JavaScript with async/await patterns
- JSDoc comments for all public methods
- Class-based architecture with clear separation of concerns
- Consistent error handling and Promise-based APIs

### Extension Standards
- Manifest V2 (legacy Firefox format)
- Uses `browser.*` APIs (not `chrome.*`)
- Internationalization ready with `_locales` structure
- Proper icon sizes for all Firefox requirements

### Security Considerations
- SHA1 encryption for blacklist privacy (though SHA1 is cryptographically weak, it's sufficient for this use case)
- No external network requests
- Minimal permissions requested
- Input validation for user-provided URLs

## Common Tasks
- Adding new matching strategies: Extend Matcher base class
- Modifying UI: Update options HTML/CSS/JS
- Adding features: Extend HistoryBlock class with new event listeners
- Localization: Add new strings to `_locales/en/messages.json`

## Build & Distribution
- Run `build.sh` to package the extension
- Extension ID: `historyblock@kain`
- Minimum Firefox version: 55.0
- GitHub repository: https://github.com/kainsavage/HistoryBlock
