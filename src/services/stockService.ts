import { FinnhubQuoteResponse, Stock } from "@/types";

const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY;
const BASE_URL = "https://finnhub.io/api/v1";

//////////////////////////// Helper functions for error checking /////////////////////////////////

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

////////////////////////////////// Core functionality //////////////////////////////////

export const stockService = {
  async getQuote(symbol: string): Promise<Stock> {
    try {
      validateAPIKey(symbol);

      const response = await fetch(
        `${BASE_URL}/quote?symbol=${symbol}&token=${API_KEY}`
      );
      validateResponse(response, symbol);

      const data: FinnhubQuoteResponse = await response.json();
      validateStockData(data, symbol);

      return {
        symbol: symbol.toUpperCase(),
        companyName: symbol.toUpperCase(),
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
