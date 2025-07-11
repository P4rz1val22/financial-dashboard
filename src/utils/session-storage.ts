// utils/sessionStorage.ts

import { Stock } from "@/types";

export const STORAGE_KEYS = {
  WATCHLIST: "financial-dashboard-watchlist",
  SELECTED_STOCK: "financial-dashboard-selected-stock",
  LAST_MANUAL_REFRESH: "financial-dashboard-last-refresh",
  REFRESH_HISTORY: "financial-dashboard-refresh-history",
} as const;

export class SessionStorageManager {
  static saveToSession(key: string, data: any): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn("Failed to save to session storage:", error);
    }
  }

  static loadFromSession<T>(key: string, defaultValue: T): T {
    try {
      const stored = sessionStorage.getItem(key);
      if (!stored) return defaultValue;

      const parsed = JSON.parse(stored);

      // Special handling for different data types
      if (key === STORAGE_KEYS.WATCHLIST && Array.isArray(parsed)) {
        return parsed.map((stock) => ({
          ...stock,
          lastUpdated: new Date(stock.lastUpdated),
          priceHistory:
            stock.priceHistory?.map((point: any) => ({
              ...point,
              timestamp: new Date(point.timestamp),
            })) || [],
        })) as T;
      }

      if (key === STORAGE_KEYS.SELECTED_STOCK && parsed) {
        return {
          ...parsed,
          lastUpdated: new Date(parsed.lastUpdated),
          priceHistory:
            parsed.priceHistory?.map((point: any) => ({
              ...point,
              timestamp: new Date(point.timestamp),
            })) || [],
        } as T;
      }

      if (key === STORAGE_KEYS.LAST_MANUAL_REFRESH && parsed) {
        return new Date(parsed) as T;
      }

      return parsed;
    } catch (error) {
      console.warn("Failed to load from session storage:", error);
      return defaultValue;
    }
  }

  static initializeWatchlist(): Stock[] {
    return this.loadFromSession(STORAGE_KEYS.WATCHLIST, []);
  }

  static initializeSelectedStock(): Stock | null {
    return this.loadFromSession(STORAGE_KEYS.SELECTED_STOCK, null);
  }

  static initializeLastManualRefresh(): Date | null {
    return this.loadFromSession(STORAGE_KEYS.LAST_MANUAL_REFRESH, null);
  }

  static saveWatchlist(watchlist: Stock[]): void {
    this.saveToSession(STORAGE_KEYS.WATCHLIST, watchlist);
  }

  static saveSelectedStock(stock: Stock | null): void {
    this.saveToSession(STORAGE_KEYS.SELECTED_STOCK, stock);
  }

  static saveLastManualRefresh(timestamp: Date | null): void {
    this.saveToSession(STORAGE_KEYS.LAST_MANUAL_REFRESH, timestamp);
  }
}
