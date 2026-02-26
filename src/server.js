const express = require('express');
const path = require('path');

function createServer(store, scheduler, port = 3000) {
    const app = express();

    // Serve static dashboard files
    app.use(express.static(path.join(__dirname, '..', 'public')));

    // ---------- API Routes ----------

    // Current status of all monitors
    app.get('/api/status', (req, res) => {
        const monitors = scheduler.getMonitors();
        const status = monitors.map(m => {
            const stats = store.getStats(m.name);
            return {
                name: m.name,
                url: m.url,
                status: m.status,
                lastResult: m.lastResult,
                stats,
            };
        });
        res.json({ monitors: status, timestamp: new Date().toISOString() });
    });

    // Recent check results
    app.get('/api/results', (req, res) => {
        const { monitor, last = 100 } = req.query;
        const results = store.getResults(monitor || null, parseInt(last, 10));
        res.json({ results });
    });

    // Incident history
    app.get('/api/incidents', (req, res) => {
        const { last = 50 } = req.query;
        const incidents = store.getIncidents(parseInt(last, 10));
        res.json({ incidents });
    });

    // Start the server
    return new Promise((resolve) => {
        const server = app.listen(port, () => {
            console.log(`\n  🌐 Dashboard: http://localhost:${port}`);
            resolve(server);
        });
    });
}

module.exports = createServer;
