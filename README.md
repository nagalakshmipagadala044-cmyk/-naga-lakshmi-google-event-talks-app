# Google BigQuery Release Notes Dashboard

An interactive, premium single-page web dashboard designed to fetch, parse, search, filter, and share updates from the official Google Cloud BigQuery Release Notes.

## 🚀 Features

- **Live Feed Sync & Cache**: Automatically fetches and parses Google's official XML/Atom release notes feed. Features an in-memory cache to optimize performance and a manual **Refresh Feed** control.
- **Categorized Releases**: Automatically segments updates into distinct types:
  - 🟢 **Features**: Direct enhancements and additions.
  - 🔴 **Issues**: Active warnings or temporary disablements.
  - 🟠 **Breaking**: Crucial changes and deprecations.
  - 🔵 **Announcements**: General info (billing, branding, domains).
  - 🟣 **Changes**: Library, driver, or connector updates.
- **Search & Filtering**: Instantly search updates by keywords, dates, or titles, with real-time sidebar statistics showing release counts.
- **X/Twitter Integration**: Built-in dialog modal for sharing selected release notes. Features character limits validation (supporting X's 23-character URL limit) with a live character countdown.
- **Modern Dark UI**: Features a glassmorphism design with a fully responsive layout tailored for all device resolutions.

---

## 🛠️ Tech Stack

- **Backend**: Python Flask, Requests
- **Frontend**: Plain Vanilla HTML5, CSS3, ES6 JavaScript

---

## 💻 Getting Started

### Prerequisites
- Python 3.10+ installed.

### Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/nagalakshmipagadala044-cmyk/-naga-lakshmi-google-event-talks-app.git
   cd -naga-lakshmi-google-event-talks-app
   ```

2. **Initialize a Virtual Environment**:
   ```bash
   python -m venv venv
   ```

3. **Activate the Virtual Environment**:
   * **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   * **macOS / Linux**:
     ```bash
     source venv/bin/activate
     ```

4. **Install Dependencies**:
   ```bash
   pip install flask requests
   ```

5. **Start the Flask Server**:
   ```bash
   python app.py
   ```

6. **Open in Browser**:
   Navigate to [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## 📁 Directory Structure

```text
├── app.py              # Flask server and XML/HTML parsing backend
├── templates/
│   └── index.html      # Semantic dashboard layout & modals structure
├── static/
│   ├── css/
│   │   └── style.css   # HSL layout configurations, badges, and animations
│   └── js/
│       └── main.js     # Real-time search, filters, statistics, and tweet flow
└── .gitignore          # Configured git ignore rules
```
