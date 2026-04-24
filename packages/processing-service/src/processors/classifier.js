const SEVERITY_ORDER = ['debug', 'info', 'warn', 'error', 'fatal'];

/**
 * Classifies a log entry and determines if it needs special handling.
 *
 * @param {object} logEntry - Enriched log entry
 * @returns {object} Classification result
 */
function classify(logEntry) {
  const level = (logEntry.level || 'info').toLowerCase();
  const severityIndex = SEVERITY_ORDER.indexOf(level);

  return {
    isError: severityIndex >= 3, // error or fatal
    isWarning: severityIndex === 2, // warn
    severity: severityIndex >= 0 ? severityIndex : 1,
    requiresAlert: level === 'fatal',
  };
}

module.exports = { classify };
