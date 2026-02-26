/* ============================================
   Dashboard JavaScript — Fetch, Render, Chart
   ============================================ */

const REFRESH_MS = 10_000;
const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

let chartData = {};      // { monitorName: [{ time, value }] }
let canvasCtx = null;
let chartCanvas = null;

// ---- Bootstrap ----
document.addEventListener('DOMContentLoaded', () => {
    chartCanvas = document.getElementById('response-chart');
    canvasCtx = chartCanvas.getContext('2d');
    fetchAll();
    setInterval(fetchAll, REFRESH_MS);
});

async function fetchAll() {
    try {
        const [statusRes, resultsRes, incidentsRes] = await Promise.all([
            fetch('/api/status'),
            fetch('/api/results?last=200'),
            fetch('/api/incidents'),
        ]);

        const statusData = await statusRes.json();
        const resultsData = await resultsRes.json();
        const incidentsData = await incidentsRes.json();

        renderLastUpdated();
        renderGlobalStats(statusData.monitors);
        renderMonitorCards(statusData.monitors, resultsData.results);
        renderChart(resultsData.results, statusData.monitors);
        renderChartLegend(statusData.monitors);
        renderIncidents(incidentsData.incidents);
    } catch (err) {
        console.error('Fetch error:', err);
        document.getElementById('last-updated').textContent = 'Connection error';
    }
}

// ---- Last Updated ----
function renderLastUpdated() {
    const el = document.getElementById('last-updated');
    el.textContent = `Updated ${new Date().toLocaleTimeString()}`;
}

// ---- Global Stats ----
function renderGlobalStats(monitors) {
    if (!monitors || monitors.length === 0) return;

    let totalChecks = 0, totalSuccess = 0, totalResponseTime = 0, responseTimeCount = 0;
    for (const m of monitors) {
        totalChecks += m.stats.total;
        totalSuccess += m.stats.success;
        if (m.stats.avgResponseTime) {
            totalResponseTime += m.stats.avgResponseTime;
            responseTimeCount++;
        }
    }

    const uptime = totalChecks > 0 ? ((totalSuccess / totalChecks) * 100).toFixed(1) : '—';
    const avgResp = responseTimeCount > 0 ? Math.round(totalResponseTime / responseTimeCount) : 0;

    document.getElementById('overall-uptime').textContent = uptime === '—' ? '—' : uptime + '%';
    document.getElementById('avg-response').textContent = avgResp ? avgResp + 'ms' : '—';
    document.getElementById('total-checks').textContent = totalChecks;

    // open incidents — fetch separately is already done; we count from monitors
    const downCount = monitors.filter(m => m.status === 'down' || m.status === 'degraded').length;
    const openEl = document.getElementById('open-incidents');
    openEl.textContent = downCount;
    openEl.style.background = downCount > 0 ? 'linear-gradient(135deg, #ef4444, #dc2626)' : '';
    openEl.style.webkitBackgroundClip = downCount > 0 ? 'text' : '';
    openEl.style.webkitTextFillColor = downCount > 0 ? 'transparent' : '';
}

// ---- Monitor Cards ----
function renderMonitorCards(monitors, allResults) {
    const grid = document.getElementById('monitors-grid');
    grid.innerHTML = '';

    for (const m of monitors) {
        const card = document.createElement('div');
        card.className = `monitor-card ${m.status}`;

        const last = m.lastResult;
        const lastTime = last ? new Date(last.timestamp).toLocaleTimeString() : '—';
        const responseTime = last && last.responseTime != null ? last.responseTime + 'ms' : '—';

        // Build sparkline data (last 20 results for this monitor)
        const monitorResults = allResults
            .filter(r => r.monitor === m.name)
            .slice(-20);

        let sparklineHTML = '<div class="sparkline-bar">';
        for (const r of monitorResults) {
            let cls = 'ok';
            if (!r.success) cls = 'fail';
            else if (r.responseTime > 2000) cls = 'slow';
            const heightPct = r.responseTime ? Math.min(100, Math.max(12, (r.responseTime / 3000) * 100)) : 12;
            sparklineHTML += `<div class="spark-segment ${cls}" style="height:${heightPct}%" title="${r.responseTime}ms"></div>`;
        }
        sparklineHTML += '</div>';

        // Mask API key in URL for display
        const displayUrl = m.url.replace(/appid=[^&]+/, 'appid=***');

        card.innerHTML = `
      <div class="card-top">
        <span class="card-name">${m.name}</span>
        <span class="status-badge ${m.status}">
          <span class="status-dot"></span>
          ${m.status.toUpperCase()}
        </span>
      </div>
      <div class="card-metrics">
        <div class="metric">
          <span class="metric-label">Uptime</span>
          <span class="metric-value">${m.stats.uptime}%</span>
        </div>
        <div class="metric">
          <span class="metric-label">Avg Resp</span>
          <span class="metric-value">${m.stats.avgResponseTime}ms</span>
        </div>
        <div class="metric">
          <span class="metric-label">Last Check</span>
          <span class="metric-value" style="font-size:0.85rem">${lastTime}</span>
        </div>
      </div>
      ${sparklineHTML}
      <div class="card-url">${displayUrl}</div>
    `;

        grid.appendChild(card);
    }
}

// ---- Response Time Chart (Canvas) ----
function renderChart(results, monitors) {
    if (!canvasCtx || !chartCanvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = chartCanvas.parentElement.getBoundingClientRect();
    chartCanvas.width = rect.width * dpr;
    chartCanvas.height = rect.height * dpr;
    canvasCtx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const PAD = { top: 20, right: 20, bottom: 30, left: 50 };
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    canvasCtx.clearRect(0, 0, W, H);

    // Group results by monitor
    const groups = {};
    for (const r of results) {
        if (!groups[r.monitor]) groups[r.monitor] = [];
        groups[r.monitor].push(r);
    }

    // Find global max response time
    let maxRT = 0;
    for (const group of Object.values(groups)) {
        for (const r of group) {
            if (r.responseTime != null && r.responseTime > maxRT) maxRT = r.responseTime;
        }
    }
    maxRT = Math.max(maxRT, 500);
    maxRT = Math.ceil(maxRT / 500) * 500; // Round up to nearest 500

    // Draw grid lines
    canvasCtx.strokeStyle = 'rgba(255,255,255,0.06)';
    canvasCtx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
        const y = PAD.top + (plotH / gridLines) * i;
        canvasCtx.beginPath();
        canvasCtx.moveTo(PAD.left, y);
        canvasCtx.lineTo(PAD.left + plotW, y);
        canvasCtx.stroke();

        // Y-axis labels
        const val = Math.round(maxRT - (maxRT / gridLines) * i);
        canvasCtx.fillStyle = '#64748b';
        canvasCtx.font = '11px Inter, sans-serif';
        canvasCtx.textAlign = 'right';
        canvasCtx.fillText(val + 'ms', PAD.left - 8, y + 4);
    }

    // Draw lines for each monitor
    const monitorNames = monitors.map(m => m.name);
    monitorNames.forEach((name, idx) => {
        const data = (groups[name] || []).slice(-50);
        if (data.length < 2) return;

        const color = CHART_COLORS[idx % CHART_COLORS.length];

        // Draw line
        canvasCtx.strokeStyle = color;
        canvasCtx.lineWidth = 2;
        canvasCtx.lineJoin = 'round';
        canvasCtx.beginPath();

        for (let i = 0; i < data.length; i++) {
            const x = PAD.left + (plotW / (data.length - 1)) * i;
            const rt = data[i].responseTime || 0;
            const y = PAD.top + plotH - (rt / maxRT) * plotH;

            if (i === 0) canvasCtx.moveTo(x, y);
            else canvasCtx.lineTo(x, y);
        }
        canvasCtx.stroke();

        // Draw area fill
        canvasCtx.globalAlpha = 0.08;
        canvasCtx.lineTo(PAD.left + plotW, PAD.top + plotH);
        canvasCtx.lineTo(PAD.left, PAD.top + plotH);
        canvasCtx.closePath();
        canvasCtx.fillStyle = color;
        canvasCtx.fill();
        canvasCtx.globalAlpha = 1;

        // Draw dots for last point
        const lastPt = data[data.length - 1];
        const lx = PAD.left + plotW;
        const ly = PAD.top + plotH - ((lastPt.responseTime || 0) / maxRT) * plotH;
        canvasCtx.beginPath();
        canvasCtx.arc(lx, ly, 4, 0, Math.PI * 2);
        canvasCtx.fillStyle = color;
        canvasCtx.fill();
        canvasCtx.strokeStyle = '#0a0e1a';
        canvasCtx.lineWidth = 2;
        canvasCtx.stroke();
    });
}

// ---- Chart Legend ----
function renderChartLegend(monitors) {
    const legend = document.getElementById('chart-legend');
    legend.innerHTML = '';
    monitors.forEach((m, idx) => {
        const color = CHART_COLORS[idx % CHART_COLORS.length];
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `<span class="legend-dot" style="background:${color}"></span> ${m.name}`;
        legend.appendChild(item);
    });
}

// ---- Incidents ----
function renderIncidents(incidents) {
    const list = document.getElementById('incidents-list');

    if (!incidents || incidents.length === 0) {
        list.innerHTML = '<div class="empty-state">✨ No incidents recorded — all systems nominal</div>';
        return;
    }

    // Show newest first
    const sorted = [...incidents].reverse();
    list.innerHTML = '';

    for (const inc of sorted) {
        const item = document.createElement('div');
        item.className = 'incident-item';

        const isResolved = !!inc.resolvedAt;
        const icon = isResolved ? '✅' : '🔴';
        const statusLabel = isResolved ? 'Resolved' : 'Ongoing';
        const statusClass = isResolved ? 'closed' : 'open';

        const startTime = new Date(inc.startedAt).toLocaleString();
        let durationText = '';
        if (inc.duration) {
            const secs = Math.round(inc.duration / 1000);
            durationText = secs < 60 ? `${secs}s` : `${Math.round(secs / 60)}m ${secs % 60}s`;
            durationText = ` · Duration: ${durationText}`;
        }

        item.innerHTML = `
      <span class="incident-icon">${icon}</span>
      <div class="incident-body">
        <div class="incident-header">
          <span class="incident-monitor">${inc.monitor}</span>
          <span class="incident-time">${startTime}</span>
        </div>
        <div class="incident-reason">${inc.reason || 'Unknown error'}</div>
        <span class="incident-resolved ${statusClass}">${statusLabel}${durationText}</span>
      </div>
    `;

        list.appendChild(item);
    }
}
