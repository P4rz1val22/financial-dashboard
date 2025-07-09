import { useState, useEffect, useCallback, useRef } from "react";
import { SearchResult, Stock, UseStockDataReturn } from "@/types";
import { stockService } from "@/services/stockService";
import toast from "react-hot-toast";

const useStockData = (): UseStockDataReturn => {
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | undefined>();
  const maxWatchlistSize = 30;
  const [lastManualRefresh, setLastManualRefresh] = useState<Date | null>(null);
  const MANUAL_REFRESH_COOLDOWN = 30000;

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const hasInitialized = useRef(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ADD DEBOUNCING FOR REFRESH
  const refreshDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const searchStocks = useCallback((query: string) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await stockService.searchStocks(query);
        setSearchResults(results);
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      // CLEANUP REFRESH DEBOUNCE
      if (refreshDebounceRef.current) {
        clearTimeout(refreshDebounceRef.current);
      }
    };
  }, []);

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  const addStock = async (symbol: string) => {
    const symbolUpper = symbol.toUpperCase();

    if (watchlist.some((stock) => stock.symbol === symbolUpper)) {
      toast.error(`${symbolUpper} is already in your watchlist`);
      return;
    }

    if (watchlist.length >= maxWatchlistSize) {
      toast.error(`Maximum ${maxWatchlistSize} stocks allowed in watchlist`);
      return;
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

    setWatchlist((prev) => [...prev, loadingStock]);

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
    setWatchlist((prev) =>
      prev.filter((stock) => stock.symbol !== symbolUpper)
    );
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

  const refreshAllStocks = useCallback(async (isManual = false) => {
    // DEBOUNCE MANUAL REFRESH CALLS
    if (isManual) {
      if (refreshDebounceRef.current) {
        clearTimeout(refreshDebounceRef.current);
      }

      refreshDebounceRef.current = setTimeout(() => {
        performRefresh(true);
      }, 100);
      return;
    }

    // Auto refresh (no debouncing needed)
    performRefresh(false);
  }, []);

  // SEPARATE ACTUAL REFRESH LOGIC - FIXED: Access current watchlist via setWatchlist callback
  const performRefresh = useCallback(
    async (isManual: boolean) => {
      if (isManual) {
        const now = new Date();
        if (
          lastManualRefresh &&
          now.getTime() - lastManualRefresh.getTime() < MANUAL_REFRESH_COOLDOWN
        ) {
          const remainingSeconds = Math.ceil(
            (MANUAL_REFRESH_COOLDOWN -
              (now.getTime() - lastManualRefresh.getTime())) /
              1000
          );
          toast.error(
            `Please wait ${remainingSeconds} seconds before refreshing again`
          );
          return;
        }
        setLastManualRefresh(now);
      }

      // FIXED: Get current watchlist state inside the function
      setWatchlist((currentWatchlist) => {
        const stocksToRefresh = currentWatchlist.filter(
          (stock) => !stock.isLoading && !stock.error
        );

        // Check for empty watchlist BEFORE showing loading toast
        if (stocksToRefresh.length === 0) {
          if (isManual) {
            toast.success("No stocks to refresh");
          }
          return currentWatchlist; // Return unchanged state
        }

        // NOW show loading state only if we have stocks to refresh
        if (isManual) {
          setIsGlobalLoading(true);
          toast("Refreshing all stocks...", { icon: "🔄" });
        }

        // Refresh each stock (async operations)
        const refreshPromises = stocksToRefresh.map(async (stock) => {
          try {
            const updatedStock = await stockService.getQuote(stock.symbol);
            setWatchlist((current) =>
              current.map((s) => (s.symbol === stock.symbol ? updatedStock : s))
            );
          } catch (error) {
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

        if (isManual) {
          // Wait for all promises to complete before showing success
          Promise.allSettled(refreshPromises).then(() => {
            setIsGlobalLoading(false);
            toast.success("Refresh complete!");
          });
        }

        // Return watchlist with loading states set
        return currentWatchlist.map((stock) =>
          stocksToRefresh.some((s) => s.symbol === stock.symbol)
            ? { ...stock, isLoading: true }
            : stock
        );
      });
    },
    [lastManualRefresh]
  );

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    refreshAllStocks(); // Initial call

    const interval = setInterval(() => {
      refreshAllStocks();
    }, 60000);

    return () => clearInterval(interval);
  }, [refreshAllStocks]);

  return {
    searchQuery,
    searchResults,
    isSearching,
    watchlist,
    selectedStock,
    isGlobalLoading,
    globalError,
    maxWatchlistSize,
    addStock,
    refreshAllStocks,
    selectStock,
    searchStocks,
    clearSearch,
    clearSelection,
    removeStock,
    retryStock,
    lastManualRefresh,
    MANUAL_REFRESH_COOLDOWN,
  };
};

export default useStockData;
