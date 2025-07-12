// public/sw.js
console.log("📡 Stock Service Worker loaded");

let refreshInterval = null;
let heartbeatInterval = null;
let apiKey = null;
let symbols = [];

// Quote cache in service worker (separate from main thread)
const quoteCache = new Map();
const QUOTE_CACHE_DURATION = 30000; // 30 seconds

// Keep service worker alive with heartbeat
const startHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = setInterval(() => {
    console.log("💓 Service Worker heartbeat");
    // Send heartbeat to all clients
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: "HEARTBEAT",
          timestamp: new Date().toISOString(),
        });
      });
    });
  }, 30000); // Every 30 seconds
};

self.addEventListener("message", (event) => {
  console.log("📨 Service Worker received message:", event.data.type);

  switch (event.data.type) {
    case "START_BACKGROUND_REFRESH":
      apiKey = event.data.apiKey;
      symbols = event.data.symbols;

      console.log("🚀 Starting background refresh for symbols:", symbols);

      // Clear existing intervals
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }

      // Start heartbeat to keep service worker alive
      startHeartbeat();

      // Start background refresh - NEVER gets throttled!
      refreshInterval = setInterval(() => {
        performBackgroundRefresh();
      }, 60000); // 60 seconds

      // Do initial refresh
      performBackgroundRefresh();
      break;

    case "UPDATE_SYMBOLS":
      symbols = event.data.symbols;
      console.log("📝 Updated symbols:", symbols);
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
      console.log("⏹️ Stopped background refresh");
      break;
  }
});

async function performBackgroundRefresh() {
  if (!apiKey || symbols.length === 0) {
    console.log("⚠️ No API key or symbols, skipping refresh");
    return;
  }

  console.log("🔄 Performing background refresh...");

  try {
    const updates = await Promise.all(
      symbols.map(async (symbol) => {
        // Check cache first
        const cached = quoteCache.get(symbol);
        if (cached && Date.now() - cached.timestamp < QUOTE_CACHE_DURATION) {
          console.log(`💾 Using cached data for ${symbol}`);
          return { symbol, data: cached.data, fromCache: true };
        }

        console.log(`🌐 Fetching fresh data for ${symbol}`);

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

    console.log("✅ Background refresh complete, sending updates...");

    // Send updates to all clients (tabs)
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: "STOCK_UPDATE",
        updates,
        timestamp: new Date().toISOString(),
      });
    });

    // Send heartbeat to keep alive
    clients.forEach((client) => {
      client.postMessage({
        type: "HEARTBEAT",
        timestamp: new Date().toISOString(),
      });
    });
  } catch (error) {
    console.error("❌ Background refresh failed:", error);

    // Notify clients of the error
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

// Install event
self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker installing");
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("⚡ Service Worker activated");
  event.waitUntil(self.clients.claim());
});

// Keep service worker alive on fetch events
self.addEventListener("fetch", (event) => {
  // Don't actually handle fetches, just use this to stay alive
  return;
});
