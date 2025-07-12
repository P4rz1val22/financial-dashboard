// services/stockService.ts - Complete file with utilities

import {
  FinnhubQuoteResponse,
  FinnhubSymbolResponse,
  Stock,
  PricePoint,
} from "@/types";
import { CompanyNameResolver } from "@/utils/company-names";

const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY;
const BASE_URL = "https://finnhub.io/api/v1";
const quoteCache = new Map<string, { data: Stock; timestamp: number }>();
const QUOTE_CACHE_DURATION = 30000;

//////////////////////////// Error Checking /////////////////////////////////

const validateAPIKey = (symbol: string) => {
  if (!API_KEY) {
    throw new Error(`API_KEY_ERROR:${symbol}: Missing API key`);
  }
};

const validateResponse = (response: Response, symbol: string) => {
  if (response.status === 401 || response.status === 403) {
    throw new Error(`API_KEY_ERROR:${symbol}: Invalid or expired API key`);
  }

  if (response.status === 429) {
    throw new Error(`RATE_LIMIT:${symbol}: API quota exceeded`);
  }

  if (!response.ok) {
    throw new Error(
      `NETWORK_ERROR:${symbol}: Failed to fetch data for ${symbol}`
    );
  }
};

const validateStockData = (data: FinnhubQuoteResponse, symbol: string) => {
  if (
    (data.c === 0 && data.d === null && data.dp === null) ||
    data.c === null ||
    data.d === null ||
    data.dp === null
  ) {
    throw new Error(
      `INVALID_SYMBOL:${symbol}: "${symbol}" is not a valid stock symbol`
    );
  }
};

const isCustomError = (error: unknown): error is Error => {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string" &&
    ["API_KEY_ERROR:", "RATE_LIMIT:", "NETWORK_ERROR:", "INVALID_SYMBOL:"].some(
      (prefix) => (error as { message: string }).message.includes(prefix)
    )
  );
};

////////////////////////////////// Helper functions //////////////////////////////////

const toStartCase = (str: string): string => {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => {
      // Handle common abbreviations
      if (word === "inc" || word === "corp" || word === "ltd") {
        return word.charAt(0).toUpperCase() + word.slice(1) + ".";
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};

////////////////////////////////// Core functionality //////////////////////////////////

const companyNameCache = new Map<string, string>(
  JSON.parse(localStorage.getItem("companyNameCache") || "[]")
);

const saveCompanyNameCache = () => {
  localStorage.setItem(
    "companyNameCache",
    JSON.stringify([...companyNameCache])
  );
};

export const stockService = {
  async getQuoteWithTimeout(
    symbol: string,
    timeoutMs: number = 10000
  ): Promise<Stock> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("TIMEOUT: Request took too long")),
        timeoutMs
      );
    });

    return Promise.race([this.getQuote(symbol), timeoutPromise]);
  },

  async getCompanyName(symbol: string): Promise<string> {
    const symbolUpper = symbol.toUpperCase();

    // Checks cache first
    if (companyNameCache.has(symbolUpper)) {
      return companyNameCache.get(symbolUpper)!;
    }

    const mappedName = CompanyNameResolver.getCompanyName(symbolUpper);
    if (mappedName) {
      companyNameCache.set(symbolUpper, mappedName);
      saveCompanyNameCache();
      return mappedName;
    }

    try {
      const response = await fetch(
        `${BASE_URL}/search?q=${symbolUpper}&exchange=US&token=${API_KEY}`
      );

      if (response.status === 429) {
        console.warn(`Rate limited for company name: ${symbolUpper}`);
        companyNameCache.set(symbolUpper, symbolUpper);
        companyNameCache.set(symbolUpper, symbolUpper);
        saveCompanyNameCache();
        return symbolUpper;
      }

      const data = await response.json();

      let companyName = symbolUpper;
      if (data.result && data.result.length > 0) {
        const exactMatch = data.result.find(
          (item: any) => item.symbol.toUpperCase() === symbolUpper
        );

        if (exactMatch) {
          companyName = toStartCase(exactMatch.description);
        } else {
          console.warn(`No exact match found for symbol: ${symbolUpper}`);
          companyName = symbolUpper; // Worst case – keep symbol
        }
      }

      companyNameCache.set(symbolUpper, companyName);
      saveCompanyNameCache();
      return companyName;
    } catch (error) {
      console.warn(`Error fetching company name for ${symbolUpper}:`, error);
      companyNameCache.set(symbolUpper, symbolUpper);
      saveCompanyNameCache();
      return symbolUpper;
    }
  },

  async searchStocks(query: string): Promise<FinnhubSymbolResponse[]> {
    if (!query.trim()) return [];

    try {
      validateAPIKey("SEARCH");

      const response = await fetch(
        `${BASE_URL}/search?q=${encodeURIComponent(
          query
        )}&exchange=US&token=${API_KEY}`
      );

      validateResponse(response, "SEARCH");

      const data = await response.json();

      if (data.result && Array.isArray(data.result)) {
        return data.result
          .filter((item: any) => item.type === "Common Stock")
          .slice(0, 10);
      }

      return [];
    } catch (error) {
      console.error("Search error:", error);
      return [];
    }
  },

  async getQuote(symbol: string): Promise<Stock> {
    const cached = quoteCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < QUOTE_CACHE_DURATION) {
      return { ...cached.data, lastUpdated: new Date() };
    }

    try {
      validateAPIKey(symbol);

      const response = await fetch(
        `${BASE_URL}/quote?symbol=${symbol}&token=${API_KEY}`
      );
      validateResponse(response, symbol);

      const data: FinnhubQuoteResponse = await response.json();
      validateStockData(data, symbol);

      const rawCompanyName = await this.getCompanyName(symbol);
      const companyName = rawCompanyName === symbol ? symbol : rawCompanyName;

      return {
        symbol: symbol.toUpperCase(),
        companyName: companyName,
        currentPrice: data.c,
        change: data.d,
        changePercent: data.dp,
        dayHigh: data.h,
        dayLow: data.l,
        dayOpen: data.o,
        previousClose: data.pc,
        lastUpdated: new Date(),
        isLoading: false,
        error: undefined,
        priceHistory: [],
      };
    } catch (error) {
      if (isCustomError(error)) {
        throw error;
      }
      throw new Error(
        `PARSING_ERROR:${symbol}: Failed to parse data for ${symbol}`
      );
    }
  },

  createPricePoint(stock: Stock): PricePoint {
    return {
      timestamp: new Date(),
      price: stock.currentPrice || 0,
      change: stock.change || 0,
      changePercent: stock.changePercent || 0,
    };
  },

  addPriceToHistory(stock: Stock, maxPoints: number = 100): Stock {
    const newPricePoint = this.createPricePoint(stock);
    const updatedHistory = [...stock.priceHistory, newPricePoint].slice(
      -maxPoints
    );

    return {
      ...stock,
      priceHistory: updatedHistory,
    };
  },
};
