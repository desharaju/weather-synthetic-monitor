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
Install dependencies:

bash
npm install
Configure environment (optional): Copy the example config and adjust if needed:

bash
cp .env.example .env
Start the agent:

bash
npm start
View the Dashboard: Open your browser and navigate to http://localhost:3000

⚙️ Configuration
You can customize the agent's behavior by editing the .env file:

Variable	Default	Description
CHECK_INTERVAL_SECONDS	60	How often the scheduled checks run
ALERT_THRESHOLD_MS	3000	Response time (in ms) before triggering a "slow response" warning
PORT	3000	Port the dashboard and API runs on
MONITOR_CITY	London	City to query for the default weather checks
📡 API Endpoints
The server exposes a few REST endpoints for raw JSON data.

GET /api/status — Returns the current health, uptime, and average response times of all active monitors.
GET /api/results?last=100 — Returns an array of the most recent individual check executions.
GET /api/incidents — Returns a history of all system outages, validation failures, and their resolution times.
☁️ Deploying to Render (Free Public URL)
You can deploy this project for free on Render to get a live, public URL.

Create a free account on Render.
Click New + → Web Service.
Connect your GitHub account and select this repository.
Configure the service:
Environment: Node
Build Command: npm install
Start Command: npm start
Instance Type: Free
(Optional) Click Advanced and add Environment Variables (e.g., MONITOR_CITY).
Click Create Web Service.
Render will automatically install the dependencies, start the server, and provide you with an https://...onrender.com URL! Every time you push to the 

main
 branch, Render will auto-deploy your updates.

🛠️ Architecture

src/monitor.js
 — Core execution engine. Uses 

fetch
 with an abort controller, measures timing, and runs an array of validator functions.

src/checks/weather.js
 — Defines the specific URLs and validation logic (Current Weather, 7-Day Forecast, Geocoding).

src/alerts.js
 — Compares check results against thresholds and handles console logging and incident creation.

src/store.js
 — Handles data lifecycle (keeping only the last 1000 results to prevent massive memory usage) and disk persistence.
public/ — Contains vanilla HTML, CSS (CSS variables, flexbox/grid), and JS (<canvas> for charts) for the dashboard.
