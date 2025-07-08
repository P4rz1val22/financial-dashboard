import { useState, useEffect } from "react";
import { Stock, UseStockDataReturn } from "@/types";
import { stockService } from "@/services/stockService";
import toast from "react-hot-toast";

const useStockData = (): UseStockDataReturn => {
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | undefined>();

  // TODO: Functions will go here
  const addStock = async (symbol: string) => {
    // call the API for the stock data
    if (watchlist.some((stock) => stock.symbol === symbol)) {
      // error, no duplicates, exit out of this
      console.log("error, no duplicates");
      return;
    }

    // call API and load, handle error gracefully
    const loadingStock: Stock = {
      symbol: symbol.toUpperCase(),
      companyName: "Loading...",
      currentPrice: 0,
      change: 0,
      changePercent: 0,
      dayHigh: 0,
      dayLow: 0,
      dayOpen: 0,
      previousClose: 0,
      lastUpdated: new Date(),
      isLoading: true,
      error: undefined,
    };

    // otherwise append newStock to the watchlist

    try {
      const stock = await stockService.getQuote(symbol);
    } catch (error) {
      let errorMsg = "Unknown error";
      if (error instanceof Error && typeof error.message === "string") {
        errorMsg = error.message;
      }

      if (errorMsg.startsWith("INVALID_SYMBOL:")) {
        toast.error(`"${symbol}" is not a valid stock symbol`);
      } else if (errorMsg.startsWith("NETWORK_ERROR:")) {
        toast.error(`Failed to fetch data for ${symbol}`);
      } else if (errorMsg.startsWith("RATE_LIMIT:")) {
        toast.error("API quota exceeded. Please try again later.");
      }

      // Remove the loading stock from watchlist
      setWatchlist((prev) => prev.filter((stock) => stock.symbol !== symbol));
    }

    console.log("added " + { symbol });
  };

  return {
    watchlist,
    addStock,
    selectedStock,
    selectStock: () => {},
    clearSelection: () => {},
    removeStock: () => {},
    retryStock: async () => {},
    isGlobalLoading,
    globalError,
  };
};

export default useStockData;
