# 🌦️ Weather API Synthetic Monitor

A self-contained Node.js application that proactively monitors weather APIs on a schedule, validates responses, tracks performance metrics, and displays results on a real-time dark-themed dashboard.

By default, this agent monitors the free **Open-Meteo** API (no API key required), but it is designed to be easily extensible to any REST API.

---

## ✨ Features

- **Automated Scheduling**: Runs HTTP checks against multiple endpoints every N seconds (configurable) using `node-cron`.
- **Intelligent Validation**: Validates not just HTTP 200 status codes, but also JSON structure and specific data sanity (e.g., temperature ranges).
- **Incident Management**: Automatically detects outages, creates incidents, and auto-resolves them when the endpoint recovers.
- **Real-Time Dashboard**: A premium, responsive glassmorphism UI served directly by the app. Includes:
  - Uptime and Average Response Time cards
  - Real-time sparklines
  - Canvas-based response time charts
  - Chronological incident timeline
- **REST API**: Built-in JSON endpoints for integrating with other tooling.
- **Zero Database Required**: Uses in-memory ring buffers backed by a simple JSON file on disk ([data/results.json](cci:7://file:///Users/krishnadesharaju/.gemini/antigravity/playground/glacial-sojourner/data/results.json:0:0-0:0)).

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/weather-synthetic-monitor.git
   cd weather-synthetic-monitor
