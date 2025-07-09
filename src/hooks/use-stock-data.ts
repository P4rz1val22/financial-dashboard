import { useState, useEffect } from "react";
import { Stock, UseStockDataReturn } from "@/types";
import { stockService } from "@/services/stockService";
import toast from "react-hot-toast";

const useStockData = (): UseStockDataReturn => {
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | undefined>();
  const MAX_WATCHLIST_SIZE = 30;

  useEffect(() => {
    const refreshAllStocks = async () => {};
  }, []);

  const addStock = async (symbol: string) => {
    const symbolUpper = symbol.toUpperCase();

    const shouldProceed = await new Promise<boolean>((resolve) => {
      setWatchlist((prev) => {
        if (prev.some((stock) => stock.symbol === symbolUpper)) {
          toast.error(`${symbolUpper} is already in your watchlist`);
          resolve(false);
          return prev; // Return unchanged
        }

        if (prev.length >= MAX_WATCHLIST_SIZE) {
          toast.error(
            `Maximum ${MAX_WATCHLIST_SIZE} stocks allowed in watchlist`
          );
          resolve(false);
          return prev;
        }

        const loadingStock: Stock = {
          symbol: symbolUpper,
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

        resolve(true);
        return [...prev, loadingStock];
      });
    });

    if (!shouldProceed) return;

    try {
      const stock = await stockService.getQuote(symbolUpper);

      setWatchlist((prev) =>
        prev.map((s) => (s.symbol === symbolUpper ? stock : s))
      );
      toast.success(`Added ${stock.companyName} to watchlist`);
    } catch (error) {
      let errorMsg = "Unknown error";
      if (error instanceof Error && typeof error.message === "string") {
        errorMsg = error.message;
      }

      // Invalid symbols are user error – doesn't need a retry
      if (errorMsg.startsWith("INVALID_SYMBOL:")) {
        toast.error(`"${symbolUpper}" is not a valid stock symbol`);
        setWatchlist((prev) =>
          prev.filter((stock) => stock.symbol !== symbolUpper)
        );
      } else {
        if (errorMsg.startsWith("NETWORK_ERROR:")) {
          toast.error(`Failed to fetch data for ${symbolUpper}`);
        } else if (errorMsg.startsWith("RATE_LIMIT:")) {
          toast.error("API quota exceeded. Please try again later.");
        } else {
          toast.error(`Failed to load ${symbolUpper}`);
        }

        setWatchlist((prev) =>
          prev.map((stock) =>
            stock.symbol === symbolUpper
              ? { ...stock, isLoading: false, error: errorMsg }
              : stock
          )
        );
      }
    }
  };

  const removeStock = (symbol: string) => {
    const symbolUpper = symbol.toUpperCase();

    setWatchlist((prev) => {
      const newWatchlist = prev.filter((stock) => stock.symbol !== symbolUpper);
      return newWatchlist;
    });

    toast.success(`Removed ${symbolUpper} from watchlist`);
  };

  const selectStock = (stock: Stock) => {
    setSelectedStock(stock);
    console.log("Selected stock: ", stock.symbol);
  };

  const clearSelection = () => {
    setSelectedStock(null);
    console.log("Cleared selection");
  };

  const retryStock = async (symbol: string) => {
    const symbolUpper = symbol.toUpperCase();

    setWatchlist((prev) =>
      prev.map((stock) =>
        stock.symbol === symbolUpper
          ? { ...stock, isLoading: true, error: undefined }
          : stock
      )
    );

    try {
      const stock = await stockService.getQuote(symbolUpper);

      setWatchlist((prev) =>
        prev.map((s) => (s.symbol === symbolUpper ? stock : s))
      );

      toast.success(`Retried ${stock.companyName} successfully`);
    } catch (error) {
      let errorMsg = "Unknown error";
      if (error instanceof Error && typeof error.message === "string") {
        errorMsg = error.message;
      }

      setWatchlist((prev) =>
        prev.map((stock) =>
          stock.symbol === symbolUpper
            ? { ...stock, isLoading: false, error: errorMsg }
            : stock
        )
      );

      if (errorMsg.startsWith("INVALID_SYMBOL:")) {
        toast.error(`"${symbolUpper}" is not a valid stock symbol`);
      } else if (errorMsg.startsWith("NETWORK_ERROR:")) {
        toast.error(`Failed to fetch data for ${symbolUpper}`);
      } else if (errorMsg.startsWith("RATE_LIMIT:")) {
        toast.error("API quota exceeded. Please try again later.");
      }
    }
  };

  useEffect(() => {
    const refreshAllStocks = async () => {
      setWatchlist((prev) => {
        const stocksToRefresh = prev.filter(
          (stock) => !stock.isLoading && !stock.error
        );

        if (stocksToRefresh.length === 0) return prev;

        console.log(`Auto-refreshing ${stocksToRefresh.length} stocks...`);

        // Set all refreshable stocks to loading
        const updatedStocks = prev.map((stock) =>
          stocksToRefresh.some((s) => s.symbol === stock.symbol)
            ? { ...stock, isLoading: true }
            : stock
        );

        // Refresh each stock
        stocksToRefresh.forEach(async (stock) => {
          try {
            const updatedStock = await stockService.getQuote(stock.symbol);
            setWatchlist((current) =>
              current.map((s) => (s.symbol === stock.symbol ? updatedStock : s))
            );
          } catch (error) {
            // On refresh error, set error state
            let errorMsg = "Unknown error";
            if (error instanceof Error) {
              errorMsg = error.message;
            }

            setWatchlist((current) =>
              current.map((s) =>
                s.symbol === stock.symbol
                  ? { ...s, isLoading: false, error: errorMsg }
                  : s
              )
            );
          }
        });

        return updatedStocks;
      });
    };

    // Set up interval for every 60 seconds
    const interval = setInterval(refreshAllStocks, 60000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, []);

  return {
    watchlist,
    addStock,
    selectedStock,
    selectStock,
    clearSelection,
    removeStock,
    retryStock,
    isGlobalLoading,
    globalError,
    MAX_WATCHLIST_SIZE,
  };
};

export default useStockData;
