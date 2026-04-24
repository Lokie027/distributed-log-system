/**
 * app.js — Main dashboard application logic
 * Coordinates search, charts, streaming, and UI state.
 */

const API_BASE = 'http://localhost:3003';
let currentPage = 1;
let totalPages = 1;

// DOM elements
const elements = {
  statTotal: document.getElementById('statTotal'),
  statErrorRate: document.getElementById('statErrorRate'),
  statLogsPerMin: document.getElementById('statLogsPerMin'),
  statSources: document.getElementById('statSources'),
  tableCount: document.getElementById('tableCount'),
  logTableBody: document.getElementById('logTableBody'),
  pageInfo: document.getElementById('pageInfo'),
  prevPageBtn: document.getElementById('prevPageBtn'),
  nextPageBtn: document.getElementById('nextPageBtn'),
  modalOverlay: document.getElementById('modalOverlay'),
  modalBody: document.getElementById('modalBody'),
  modalClose: document.getElementById('modalClose'),
  filterSource: document.getElementById('filterSource'),
};

/**
 * Format a number with commas.
 */
function formatNumber(n) {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString();
}

/**
 * Format an ISO timestamp for display.
 */
function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}

/**
 * Create a level badge HTML string.
 */
function levelBadge(level) {
  return `<span class="level-badge level-${level}">${level}</span>`;
}

/**
 * Fetch and display stats.
 */
async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/api/stats`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const stats = await res.json();

    elements.statTotal.textContent = formatNumber(stats.total);
    elements.statErrorRate.textContent = `${stats.errorRate}%`;
    elements.statLogsPerMin.textContent = formatNumber(stats.logsPerMinute);
    elements.statSources.textContent = formatNumber(stats.activeSources);

    // Populate source filter dropdown
    if (stats.topSources && stats.topSources.length > 0) {
      const existing = elements.filterSource.querySelectorAll('option:not(:first-child)');
      existing.forEach((o) => o.remove());
      stats.topSources.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.source;
        opt.textContent = `${s.source} (${s.count})`;
        elements.filterSource.appendChild(opt);
      });
    }

    // Update charts
    if (window.updateVolumeChart) window.updateVolumeChart(stats.logsPerHour);
    if (window.updateLevelChart) window.updateLevelChart(stats.levelCounts);
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

/**
 * Render log rows into the table.
 */
function renderLogs(logs, prepend = false) {
  if (!prepend) {
    elements.logTableBody.innerHTML = '';
  }

  if (logs.length === 0 && !prepend) {
    elements.logTableBody.innerHTML =
      '<tr class="empty-row"><td colspan="5">No logs found. Try adjusting your search or filters.</td></tr>';
    return;
  }

  const fragment = document.createDocumentFragment();

  logs.forEach((log) => {
    const tr = document.createElement('tr');
    tr.className = prepend ? 'new-row' : '';
    tr.dataset.logId = log.id;

    tr.innerHTML = `
      <td class="col-time">${formatTime(log.timestamp)}</td>
      <td class="col-level">${levelBadge(log.level)}</td>
      <td class="col-source"><span class="source-name">${log.source}</span></td>
      <td class="col-message">${escapeHtml(log.message?.substring(0, 150))}${log.message?.length > 150 ? '...' : ''}</td>
      <td class="col-env"><span class="env-badge">${log.environment || '—'}</span></td>
    `;

    tr.addEventListener('click', () => showLogDetail(log));

    if (prepend) {
      fragment.prepend(tr);
    } else {
      fragment.appendChild(tr);
    }
  });

  if (prepend) {
    elements.logTableBody.prepend(fragment);
    // Remove excess rows if live tailing
    while (elements.logTableBody.children.length > 200) {
      elements.logTableBody.removeChild(elements.logTableBody.lastChild);
    }
  } else {
    elements.logTableBody.appendChild(fragment);
  }
}

/**
 * Show log detail modal.
 */
function showLogDetail(log) {
  const meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : (log.metadata || {});
  const tags = Array.isArray(log.tags) ? log.tags : [];

  elements.modalBody.innerHTML = `
    <div class="detail-row"><span class="detail-label">ID</span><span class="detail-value">${log.id}</span></div>
    <div class="detail-row"><span class="detail-label">Timestamp</span><span class="detail-value">${log.timestamp}</span></div>
    <div class="detail-row"><span class="detail-label">Level</span><span class="detail-value">${levelBadge(log.level)}</span></div>
    <div class="detail-row"><span class="detail-label">Source</span><span class="detail-value">${escapeHtml(log.source)}</span></div>
    <div class="detail-row"><span class="detail-label">Environment</span><span class="detail-value">${log.environment || '—'}</span></div>
    <div class="detail-row"><span class="detail-label">Tags</span><span class="detail-value">${tags.length > 0 ? tags.join(', ') : '—'}</span></div>
    <div class="detail-row"><span class="detail-label">Message</span></div>
    <div class="detail-json">${escapeHtml(log.message)}</div>
    <div class="detail-row" style="margin-top:16px"><span class="detail-label">Metadata</span></div>
    <div class="detail-json">${JSON.stringify(meta, null, 2)}</div>
  `;
  elements.modalOverlay.classList.add('active');
}

/**
 * Update pagination controls.
 */
function updatePagination(page, total) {
  currentPage = page;
  totalPages = total;
  elements.pageInfo.textContent = `Page ${page} of ${total}`;
  elements.prevPageBtn.disabled = page <= 1;
  elements.nextPageBtn.disabled = page >= total;
}

/**
 * Escape HTML to prevent XSS.
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Event Listeners ---

// Modal close
elements.modalClose.addEventListener('click', () => {
  elements.modalOverlay.classList.remove('active');
});
elements.modalOverlay.addEventListener('click', (e) => {
  if (e.target === elements.modalOverlay) {
    elements.modalOverlay.classList.remove('active');
  }
});

// Pagination
elements.prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    window.performSearch(currentPage);
  }
});
elements.nextPageBtn.addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage++;
    window.performSearch(currentPage);
  }
});

// --- Initialize ---
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  if (window.performSearch) window.performSearch(1);

  // Auto-refresh stats every 10 seconds
  setInterval(loadStats, 10000);
});

// Expose globals for other modules
window.API_BASE = API_BASE;
window.renderLogs = renderLogs;
window.updatePagination = updatePagination;
window.loadStats = loadStats;
window.formatTime = formatTime;
window.levelBadge = levelBadge;
window.escapeHtml = escapeHtml;
window.elements = elements;
