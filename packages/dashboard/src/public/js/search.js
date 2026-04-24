/**
 * search.js — Search and filter functionality
 */

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const filterLevel = document.getElementById('filterLevel');
const filterSource = document.getElementById('filterSource');
const filterEnv = document.getElementById('filterEnv');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const tableCount = document.getElementById('tableCount');

/**
 * Build query string from current filters.
 */
function buildQueryParams(page = 1) {
  const params = new URLSearchParams();

  const q = searchInput.value.trim();
  if (q) params.set('q', q);

  const level = filterLevel.value;
  if (level) params.set('level', level);

  const source = filterSource.value;
  if (source) params.set('source', source);

  const env = filterEnv.value;
  if (env) params.set('environment', env);

  params.set('page', page);
  params.set('limit', 50);

  return params.toString();
}

/**
 * Perform search and update the table.
 */
async function performSearch(page = 1) {
  try {
    const queryStr = buildQueryParams(page);
    const res = await fetch(`${window.API_BASE}/api/search?${queryStr}`);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    tableCount.textContent = `${data.total.toLocaleString()} results`;
    window.renderLogs(data.logs);
    window.updatePagination(data.page, data.totalPages);
  } catch (err) {
    console.error('Search failed:', err);
    tableCount.textContent = 'Error loading logs';
  }
}

// --- Event Listeners ---

searchBtn.addEventListener('click', () => performSearch(1));

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') performSearch(1);
});

// Filter changes trigger search
filterLevel.addEventListener('change', () => performSearch(1));
filterSource.addEventListener('change', () => performSearch(1));
filterEnv.addEventListener('change', () => performSearch(1));

// Clear all filters
clearFiltersBtn.addEventListener('click', () => {
  searchInput.value = '';
  filterLevel.value = '';
  filterSource.value = '';
  filterEnv.value = '';
  performSearch(1);
});

// Expose globally
window.performSearch = performSearch;
