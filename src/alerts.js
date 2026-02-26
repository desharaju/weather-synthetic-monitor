const COLORS = {
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
    reset: '\x1b[0m',
    bold: '\x1b[1m',
};

class AlertManager {
    constructor(store, { thresholdMs = 3000 } = {}) {
        this.store = store;
        this.thresholdMs = thresholdMs;
    }

    /**
     * Evaluate a check result and trigger alerts / manage incidents.
     */
    evaluate(result) {
        const alerts = [];

        // 1. Non-success check
        if (!result.success) {
            alerts.push({
                type: 'failure',
                severity: 'critical',
                message: `Check FAILED for ${result.monitor}: ${result.errors.join('; ')}`,
            });

            // Open an incident if none exists
            const openIncidents = this.store.getOpenIncidents();
            const alreadyOpen = openIncidents.find(i => i.monitor === result.monitor);
            if (!alreadyOpen) {
                this.store.addIncident({
                    monitor: result.monitor,
                    startedAt: result.timestamp,
                    resolvedAt: null,
                    reason: result.errors.join('; '),
                    duration: null,
                });
            }
        }

        // 2. Slow response
        if (result.responseTime != null && result.responseTime > this.thresholdMs) {
            alerts.push({
                type: 'slow_response',
                severity: 'warning',
                message: `Slow response for ${result.monitor}: ${result.responseTime}ms (threshold: ${this.thresholdMs}ms)`,
            });
        }

        // 3. If check passes, resolve any open incident
        if (result.success) {
            const resolved = this.store.resolveIncident(result.monitor);
            if (resolved) {
                alerts.push({
                    type: 'resolved',
                    severity: 'info',
                    message: `Incident RESOLVED for ${result.monitor} (was down for ${resolved.duration}ms)`,
                });
            }
        }

        // Print alerts to console
        for (const alert of alerts) {
            this._log(alert);
        }

        return alerts;
    }

    _log(alert) {
        const ts = new Date().toISOString();
        let color;
        let icon;
        switch (alert.severity) {
            case 'critical':
                color = COLORS.red;
                icon = '🚨';
                break;
            case 'warning':
                color = COLORS.yellow;
                icon = '⚠️ ';
                break;
            case 'info':
                color = COLORS.green;
                icon = '✅';
                break;
            default:
                color = COLORS.gray;
                icon = 'ℹ️ ';
        }
        console.log(
            `${COLORS.gray}[${ts}]${COLORS.reset} ${icon} ${color}${COLORS.bold}[${alert.severity.toUpperCase()}]${COLORS.reset} ${color}${alert.message}${COLORS.reset}`
        );
    }
}

module.exports = AlertManager;
