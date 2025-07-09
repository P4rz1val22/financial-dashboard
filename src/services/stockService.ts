import { FinnhubQuoteResponse, SearchResult, Stock } from "@/types";

const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY;
const BASE_URL = "https://finnhub.io/api/v1";

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
      // Regular words
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};

////////////////////////////////// Core functionality //////////////////////////////////

const companyNameCache = new Map<string, string>();

export const stockService = {
  async getCompanyName(symbol: string): Promise<string> {
    // Check cache first
    if (companyNameCache.has(symbol)) {
      return companyNameCache.get(symbol)!;
    }

    try {
      const response = await fetch(
        `${BASE_URL}/search?q=${symbol}&exchange=US&token=${API_KEY}`
      );
      const data = await response.json();

      let companyName = symbol; // Fallback
      if (data.result && data.result.length > 0) {
        companyName = data.result[0].description;
      }

      companyNameCache.set(symbol, companyName);
      return companyName;
    } catch (error) {
      console.error(`Error fetching company name for ${symbol}:`, error);
      companyNameCache.set(symbol, symbol);
      return symbol;
    }
  },

  async searchStocks(query: string): Promise<SearchResult[]> {
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
          .filter((item: any) => item.type === "Common Stock") // Only show stocks
          .slice(0, 10); // Limit to 10 results
      }

      return [];
    } catch (error) {
      console.error("Search error:", error);
      return [];
    }
  },

  async getQuote(symbol: string): Promise<Stock> {
    try {
      validateAPIKey(symbol);

      const response = await fetch(
        `${BASE_URL}/quote?symbol=${symbol}&token=${API_KEY}`
      );
      validateResponse(response, symbol);

      const data: FinnhubQuoteResponse = await response.json();
      validateStockData(data, symbol);

      const rawCompanyName = await this.getCompanyName(symbol);
      const companyName = toStartCase(rawCompanyName);

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
};
