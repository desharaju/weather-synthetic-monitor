require('dotenv').config();

const Monitor = require('./monitor');
const Scheduler = require('./scheduler');
const Store = require('./store');
const AlertManager = require('./alerts');
const createServer = require('./server');
const { createWeatherChecks } = require('./checks/weather');

const COLORS = {
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
    green: '\x1b[32m',
    reset: '\x1b[0m',
    bold: '\x1b[1m',
};

async function main() {
    console.log(`\n${COLORS.cyan}${COLORS.bold}  ╔══════════════════════════════════════════╗${COLORS.reset}`);
    console.log(`${COLORS.cyan}${COLORS.bold}  ║   🌦️  Weather API Synthetic Monitor      ║${COLORS.reset}`);
    console.log(`${COLORS.cyan}${COLORS.bold}  ╚══════════════════════════════════════════╝${COLORS.reset}\n`);

    // Load config
    const INTERVAL = parseInt(process.env.CHECK_INTERVAL_SECONDS || '60', 10);
    const THRESHOLD_MS = parseInt(process.env.ALERT_THRESHOLD_MS || '3000', 10);
    const PORT = parseInt(process.env.PORT || '3000', 10);
    const CITY = process.env.MONITOR_CITY || 'London';

    // Initialize components
    const store = new Store();
    const scheduler = new Scheduler();
    const alertManager = new AlertManager(store, { thresholdMs: THRESHOLD_MS });

    // Create weather checks (Open-Meteo — free, no API key needed)
    const checks = createWeatherChecks(CITY);

    console.log(`  📍 Monitoring city: ${COLORS.bold}${CITY}${COLORS.reset}`);
    console.log(`  ⏱️  Check interval: every ${COLORS.bold}${INTERVAL}s${COLORS.reset}`);
    console.log(`  🚨 Alert threshold: ${COLORS.bold}${THRESHOLD_MS}ms${COLORS.reset}`);
    console.log();

    // Create monitors and schedule them
    for (const checkConfig of checks) {
        const monitor = new Monitor(checkConfig);

        monitor.on('check:pass', (result) => {
            console.log(
                `${COLORS.gray}[${result.timestamp}]${COLORS.reset} ${COLORS.green}✓${COLORS.reset} ${result.monitor} — ${result.responseTime}ms`
            );
        });

        monitor.on('check:fail', (result) => {
            // AlertManager handles logging for failures
        });

        scheduler.add(monitor, INTERVAL, (result) => {
            store.addResult(result);
            alertManager.evaluate(result);
        });
    }

    // Start scheduling
    console.log('  📋 Starting monitors:');
    scheduler.start();

    // Run an initial check immediately
    console.log('\n  🔄 Running initial checks...\n');
    const monitors = scheduler.getMonitors();
    for (const monitor of monitors) {
        const result = await monitor.runCheck();
        store.addResult(result);
        alertManager.evaluate(result);
    }

    // Start web server
    await createServer(store, scheduler, PORT);

    console.log(`\n  ${COLORS.green}${COLORS.bold}✨ Monitoring is live!${COLORS.reset}\n`);

    // Graceful shutdown
    const shutdown = () => {
        console.log('\n  🛑 Shutting down...');
        scheduler.stop();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
