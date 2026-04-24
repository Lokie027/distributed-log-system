/**
 * charts.js — Chart.js visualizations
 */

let volumeChart = null;
let levelChart = null;

const chartColors = {
  accent: 'rgba(99, 102, 241, 0.8)',
  accentBg: 'rgba(99, 102, 241, 0.1)',
  debug: 'rgba(6, 182, 212, 0.8)',
  info: 'rgba(99, 102, 241, 0.8)',
  warn: 'rgba(234, 179, 8, 0.8)',
  error: 'rgba(239, 68, 68, 0.8)',
  fatal: 'rgba(239, 68, 68, 1)',
};

const chartDefaults = {
  color: '#94a3b8',
  borderColor: 'rgba(255,255,255,0.06)',
};

/**
 * Initialize or update the log volume line chart.
 */
function updateVolumeChart(data) {
  const ctx = document.getElementById('volumeChart');
  if (!ctx) return;

  const labels = (data || []).map((d) => {
    const date = new Date(d.hour);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  });
  const values = (data || []).map((d) => d.count);

  if (volumeChart) {
    volumeChart.data.labels = labels;
    volumeChart.data.datasets[0].data = values;
    volumeChart.update('none');
    return;
  }

  volumeChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Logs',
        data: values,
        borderColor: chartColors.accent,
        backgroundColor: chartColors.accentBg,
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: chartDefaults.color, maxTicksLimit: 12 }, grid: { color: chartDefaults.borderColor } },
        y: { ticks: { color: chartDefaults.color }, grid: { color: chartDefaults.borderColor }, beginAtZero: true },
      },
    },
  });
}

/**
 * Initialize or update the level distribution doughnut chart.
 */
function updateLevelChart(data) {
  const ctx = document.getElementById('levelChart');
  if (!ctx) return;

  const labels = (data || []).map((d) => d.level);
  const values = (data || []).map((d) => d.count);
  const colors = (data || []).map((d) => chartColors[d.level] || chartColors.info);

  if (levelChart) {
    levelChart.data.labels = labels;
    levelChart.data.datasets[0].data = values;
    levelChart.data.datasets[0].backgroundColor = colors;
    levelChart.update('none');
    return;
  }

  levelChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: 'rgba(10, 14, 26, 0.8)',
        borderWidth: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: chartDefaults.color, padding: 12, usePointStyle: true, pointStyle: 'circle' },
        },
      },
    },
  });
}

// Expose globally
window.updateVolumeChart = updateVolumeChart;
window.updateLevelChart = updateLevelChart;
