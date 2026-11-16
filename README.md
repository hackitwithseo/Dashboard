<div align="center">

# ⚡ Custom Dashboard Extension

A high-performance, fully customizable new-tab dashboard engineered for speed, zero bloat, and complete personalization. Featuring live Twitch status tracking, real-time system stats, dynamic YouTube feeds, and custom wallpaper modes.

[Installation](#-installation) • [Features](#-core-features) • [Settings & Customization](#-customization--settings)

</div>

---

## 🌟 Core Features

- **🔴 Live Twitch Streamer Tracker:** Polls channel status in real-time with hover-preview thumbnail tooltips. Automatically sorts streamers by live status so you never miss a broadcast.
- **📊 System & Hardware Monitoring:** Lightweight monitors track your live CPU usage, RAM consumption, and network connection status right from your top bar.
- **📺 Dynamic YouTube Creator Feeds:** Follow your favorite channels via automated RSS parsing that pulls their latest uploads and shorts straight into your dashboard.
- **🎨 Interactive Wallpapers & Glassmorphism:** Choose from live particle simulations, matrix rain, interactive waves, animated starfields, or upload your own custom wallpaper background with adjustable transparency sliders.
- **⚡ Quick Access Shortcuts:** Clean grid layout for your favorite websites with automatic favicon generation.
- **💾 Backup & Sync:** Easily export and import your entire configuration (shortcuts, streamers, and creator feeds) via JSON backup files.

---

## 📦 Installation

To install the dashboard extension locally as an unpacked extension:

1. **Clone or Download:** Clone this repository or download the source code as a `.zip` file and extract it to a folder.
2. **Open Extensions Page:** Open Google Chrome (or any Chromium-based browser) and navigate to:
   ```text
   chrome://extensions/
   ```
3. **Enable Developer Mode:** Toggle the **Developer mode** switch in the top-right corner of the extensions page.
4. **Load Unpacked:** Click the **Load unpacked** button in the top-left corner and select your extension's root directory.
5. **Ready!** Open a new tab to experience your custom dashboard.

---

## ⚙️ Customization & Settings

Click the settings gear icon (`⚙️`) on your dashboard to configure:
- **Wallpapers & Themes:** Switch between built-in canvas animations (dots, matrix, waves, starfield) or upload a custom image. Adjust box opacity and app scaling to fit your display.
- **Streamers:** Add, remove, or nickname your favorite Twitch streamers.
- **YouTube Creators:** Add YouTube channel IDs to track their latest uploads.
- **Shortcuts:** Customize your quick-launch bookmarks.

---

## 🛠️ Built With

- **Manifest V3** Chrome Extension Architecture
- Vanilla JavaScript & CSS3 (Glassmorphic UI)
- HTML5 Canvas for background particle simulations
- RSS-to-JSON & Twitch API integrations

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.