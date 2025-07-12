// public/sw.js

let refreshInterval = null;
let heartbeatInterval = null;
let apiKey = null;
let symbols = [];

const quoteCache = new Map();
const QUOTE_CACHE_DURATION = 30000;

const startHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = setInterval(() => {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: "HEARTBEAT",
          timestamp: new Date().toISOString(),
        });
      });
    });
  }, 30000);
};

self.addEventListener("message", (event) => {
  switch (event.data.type) {
    case "START_BACKGROUND_REFRESH":
      apiKey = event.data.apiKey;
      symbols = event.data.symbols;

      if (refreshInterval) {
        clearInterval(refreshInterval);
      }

      startHeartbeat();

      refreshInterval = setInterval(() => {
        performBackgroundRefresh();
      }, 60000);

      performBackgroundRefresh();
      break;

    case "UPDATE_SYMBOLS":
      symbols = event.data.symbols;
      break;

    case "STOP_BACKGROUND_REFRESH":
      if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      break;
  }
});

/**
 * Performs a background refresh of stock quotes for the specified symbols.
 * Fetches updated quotes from the Finnhub API unless cached data is still valid.
 * Updates the cache and notifies all connected clients with the latest stock data,
 * a heartbeat message, or an error if the refresh fails.
 *
 * @async
 * @function
 * @returns {Promise<void>} Resolves when the refresh and client notifications are complete.
 */
async function performBackgroundRefresh() {
  if (!apiKey || symbols.length === 0) {
    return;
  }

  try {
    const updates = await Promise.all(
      symbols.map(async (symbol) => {
        const cached = quoteCache.get(symbol);
        if (cached && Date.now() - cached.timestamp < QUOTE_CACHE_DURATION) {
          return { symbol, data: cached.data, fromCache: true };
        }

        const response = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} for ${symbol}`);
        }

        const data = await response.json();

        // Cache the result
        quoteCache.set(symbol, { data, timestamp: Date.now() });

        return { symbol, data, fromCache: false };
      })
    );

    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: "STOCK_UPDATE",
        updates,
        timestamp: new Date().toISOString(),
      });
    });

    clients.forEach((client) => {
      client.postMessage({
        type: "HEARTBEAT",
        timestamp: new Date().toISOString(),
      });
    });
  } catch (error) {
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: "REFRESH_ERROR",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    });
  }
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  return;
});
