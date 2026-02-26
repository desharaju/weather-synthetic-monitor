const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'results.json');
const MAX_RESULTS = 1000;

class Store {
    constructor() {
        this.results = [];     // ring buffer of check results
        this.incidents = [];   // list of incidents
        this._load();
    }

    addResult(result) {
        this.results.push(result);
        if (this.results.length > MAX_RESULTS) {
            this.results = this.results.slice(-MAX_RESULTS);
        }
        this._persist();
    }

    getResults(monitorName, last = 100) {
        let filtered = this.results;
        if (monitorName) {
            filtered = filtered.filter(r => r.monitor === monitorName);
        }
        return filtered.slice(-last);
    }

    getStats(monitorName) {
        const results = this.getResults(monitorName, 100);
        if (results.length === 0) {
            return { total: 0, success: 0, failed: 0, uptime: 0, avgResponseTime: 0 };
        }
        const success = results.filter(r => r.success).length;
        const responseTimes = results.filter(r => r.responseTime != null).map(r => r.responseTime);
        const avgResponseTime = responseTimes.length > 0
            ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
            : 0;

        return {
            total: results.length,
            success,
            failed: results.length - success,
            uptime: parseFloat(((success / results.length) * 100).toFixed(2)),
            avgResponseTime,
        };
    }

    // ---------- Incident tracking ----------

    addIncident(incident) {
        this.incidents.push(incident);
        if (this.incidents.length > 200) {
            this.incidents = this.incidents.slice(-200);
        }
        this._persist();
    }

    resolveIncident(monitorName) {
        const open = this.incidents.find(
            i => i.monitor === monitorName && !i.resolvedAt
        );
        if (open) {
            open.resolvedAt = new Date().toISOString();
            open.duration = new Date(open.resolvedAt) - new Date(open.startedAt);
            this._persist();
        }
        return open;
    }

    getIncidents(last = 50) {
        return this.incidents.slice(-last);
    }

    getOpenIncidents() {
        return this.incidents.filter(i => !i.resolvedAt);
    }

    // ---------- Persistence ----------

    _persist() {
        try {
            if (!fs.existsSync(DATA_DIR)) {
                fs.mkdirSync(DATA_DIR, { recursive: true });
            }
            const data = JSON.stringify({ results: this.results, incidents: this.incidents });
            fs.writeFileSync(DATA_FILE, data, 'utf-8');
        } catch (err) {
            console.error('[Store] Persist error:', err.message);
        }
    }

    _load() {
        try {
            if (fs.existsSync(DATA_FILE)) {
                const raw = fs.readFileSync(DATA_FILE, 'utf-8');
                const data = JSON.parse(raw);
                this.results = data.results || [];
                this.incidents = data.incidents || [];
            }
        } catch (err) {
            console.error('[Store] Load error:', err.message);
        }
    }
}

module.exports = Store;
