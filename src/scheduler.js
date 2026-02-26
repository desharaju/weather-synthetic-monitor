const cron = require('node-cron');

class Scheduler {
    constructor() {
        this.jobs = new Map();
    }

    /**
     * Schedule a monitor to run at a fixed interval.
     * @param {Monitor} monitor
     * @param {number} intervalSeconds
     * @param {Function} onResult - callback receiving the check result
     */
    add(monitor, intervalSeconds, onResult) {
        // Build a cron expression: */N * * * * * (every N seconds)
        const cronExpr = `*/${intervalSeconds} * * * * *`;

        const task = cron.schedule(cronExpr, async () => {
            try {
                const result = await monitor.runCheck();
                if (onResult) onResult(result);
            } catch (err) {
                console.error(`[Scheduler] Error running check for ${monitor.name}:`, err);
            }
        }, { scheduled: false });

        this.jobs.set(monitor.name, { monitor, task });
    }

    start() {
        for (const [name, { task }] of this.jobs) {
            task.start();
            console.log(`  ▸ Scheduled: ${name}`);
        }
    }

    stop() {
        for (const [, { task }] of this.jobs) {
            task.stop();
        }
    }

    getMonitors() {
        return Array.from(this.jobs.values()).map(j => j.monitor);
    }
}

module.exports = Scheduler;
