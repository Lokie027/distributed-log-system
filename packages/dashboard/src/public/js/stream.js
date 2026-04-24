/**
 * stream.js — WebSocket live tail functionality
 */

const WS_URL = 'ws://localhost:3003/api/stream';
const liveTailBtn = document.getElementById('liveTailBtn');
const liveTailBar = document.getElementById('liveTailBar');
const stopTailBtn = document.getElementById('stopTailBtn');
const connectionStatus = document.getElementById('connectionStatus');

let ws = null;
let isLiveTailing = false;
let reconnectTimer = null;

/**
 * Update the connection status indicator.
 */
function setConnectionStatus(connected) {
  const dot = connectionStatus.querySelector('.status-dot');
  const text = connectionStatus.querySelector('.status-text');

  if (connected) {
    dot.className = 'status-dot online';
    text.textContent = 'Connected';
  } else {
    dot.className = 'status-dot offline';
    text.textContent = 'Disconnected';
  }
}

/**
 * Start WebSocket live tail.
 */
function startLiveTail() {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    isLiveTailing = true;
    setConnectionStatus(true);
    liveTailBtn.classList.add('active');
    liveTailBar.classList.add('active');
    console.log('[LiveTail] Connected');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      // Skip system messages
      if (data.type === 'connected') return;

      // Prepend new log to table
      window.renderLogs([data], true);

      // Refresh stats periodically handled by app.js
    } catch (err) {
      console.error('[LiveTail] Parse error:', err);
    }
  };

  ws.onclose = () => {
    setConnectionStatus(false);
    console.log('[LiveTail] Disconnected');

    // Auto-reconnect if still in live tail mode
    if (isLiveTailing) {
      reconnectTimer = setTimeout(() => {
        console.log('[LiveTail] Reconnecting...');
        startLiveTail();
      }, 3000);
    }
  };

  ws.onerror = (err) => {
    console.error('[LiveTail] Error:', err);
  };
}

/**
 * Stop WebSocket live tail.
 */
function stopLiveTail() {
  isLiveTailing = false;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (ws) {
    ws.close();
    ws = null;
  }

  liveTailBtn.classList.remove('active');
  liveTailBar.classList.remove('active');
  setConnectionStatus(false);
}

// --- Event Listeners ---

liveTailBtn.addEventListener('click', () => {
  if (isLiveTailing) {
    stopLiveTail();
  } else {
    startLiveTail();
  }
});

stopTailBtn.addEventListener('click', stopLiveTail);
