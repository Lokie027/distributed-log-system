const WebSocket = require('ws');
const { getSubscriber, config, createLogger } = require('@dls/common');

const logger = createLogger('query-service:ws');

/**
 * Sets up the WebSocket server for live log tailing.
 * Subscribes to Redis Pub/Sub and forwards messages to connected clients.
 *
 * @param {import('http').Server} server - HTTP server to attach WS to
 */
function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server, path: '/api/stream' });

  let subscriberClient = null;
  let subscriberActive = false;

  /**
   * Start Redis Pub/Sub subscription when first client connects.
   */
  function startSubscriber() {
    if (subscriberActive) return;

    subscriberClient = getSubscriber();
    subscriberClient.subscribe(config.pubsub.liveChannel);
    subscriberActive = true;

    subscriberClient.on('message', (channel, message) => {
      if (channel !== config.pubsub.liveChannel) return;

      // Broadcast to all connected WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    });

    logger.info('Redis Pub/Sub subscriber started for live tail');
  }

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    logger.info(`WebSocket client connected from ${clientIp}`);

    // Start subscriber on first connection
    startSubscriber();

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: 'connected',
        message: 'Live log stream connected',
        timestamp: new Date().toISOString(),
      })
    );

    // Handle client messages (e.g., filter preferences)
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        logger.debug({ msg }, 'Received client message');
      } catch {
        // Ignore invalid messages
      }
    });

    ws.on('close', () => {
      logger.info(`WebSocket client disconnected from ${clientIp}`);
    });

    ws.on('error', (err) => {
      logger.error({ err }, 'WebSocket error');
    });
  });

  // Heartbeat to keep connections alive
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      }
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  logger.info('WebSocket server initialized on /api/stream');
  return wss;
}

module.exports = { setupWebSocket };
