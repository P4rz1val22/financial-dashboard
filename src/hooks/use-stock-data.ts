import { useState, useEffect, useCallback, useRef } from "react";
import { FinnhubSymbolResponse, Stock, UseStockDataReturn } from "@/types";
import { stockService } from "@/services/stockService";
import toast from "react-hot-toast";
import { RateLimiter } from "@/utils/rate-limiting";
import { SessionStorageManager } from "@/utils/session-storage";

/**
 * Custom hook for managing stock data, watchlist, and real-time updates
 *
 * Features:
 * - Real-time stock quotes with 60-second auto-refresh
 * - Persistent watchlist across browser sessions
 * - Rate limiting and timeout protection
 * - Search functionality with debouncing
 * - Automatic recovery from stuck/failed states
 * - Single stock refresh after adding new stocks
 *
 * @returns Complete stock management interface
 */
const useStockData = (): UseStockDataReturn => {
  // Initialize state from session storage
  const [watchlist, setWatchlist] = useState<Stock[]>(() =>
    SessionStorageManager.initializeWatchlist()
  );

  const [selectedStock, setSelectedStock] = useState<Stock | null>(() =>
    SessionStorageManager.initializeSelectedStock()
  );

  const [lastManualRefresh, setLastManualRefresh] = useState<Date | null>(() =>
    SessionStorageManager.initializeLastManualRefresh()
  );

  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | undefined>();
  const maxWatchlistSize = 25;
  const MANUAL_REFRESH_COOLDOWN = 30000;

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FinnhubSymbolResponse[]>(
    []
  );
  const [isSearching, setIsSearching] = useState(false);
  const hasInitialized = useRef(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save to session storage whenever state changes
  useEffect(() => {
    SessionStorageManager.saveWatchlist(watchlist);
  }, [watchlist]);

  useEffect(() => {
    SessionStorageManager.saveSelectedStock(selectedStock);
  }, [selectedStock]);

  useEffect(() => {
    SessionStorageManager.saveLastManualRefresh(lastManualRefresh);
  }, [lastManualRefresh]);

  /**
   * Searches for stocks using the Finnhub API with debouncing
   *
   * @param query - Search term (stock symbol or company name)
   */
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
    };
  }, []);

  /**
   * Clears the current search query and results
   */
  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  /**
   * Adds a new stock to the watchlist with initial data fetch
   * Includes single stock refresh after 1 second for better UX
   *
   * @param symbol - Stock symbol to add
   */
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
      priceHistory: [],
    };

    setWatchlist((prev) => [...prev, loadingStock]);

    try {
      const stock = await stockService.getQuote(symbolUpper);
      const stockWithHistory = stockService.addPriceToHistory(stock, 1);

      setWatchlist((prev) =>
        prev.map((s) => (s.symbol === symbolUpper ? stockWithHistory : s))
      );
      toast.success(`Added ${stock.companyName} to watchlist`);

      // UX Improvement: Single stock refresh after 1 second for better chart visualization
      setTimeout(() => {
        refreshSingleStock(symbolUpper);
      }, 1000);
    } catch (error) {
      handleStockError(symbolUpper, error);
    }
  };

  /**
   * Removes a stock from the watchlist
   *
   * @param symbol - Stock symbol to remove
   */
  const removeStock = (symbol: string) => {
    const symbolUpper = symbol.toUpperCase();
    setWatchlist((prev) =>
      prev.filter((stock) => stock.symbol !== symbolUpper)
    );

    if (selectedStock?.symbol === symbolUpper) {
      setSelectedStock(null);
    }

    toast.success(`Removed ${symbolUpper} from watchlist`);
  };

  /**
   * Selects a stock for detailed view
   *
   * @param stock - Stock to select, or null to clear selection
   */
  const selectStock = (stock: Stock | null) => {
    setSelectedStock(stock);
  };

  /**
   * Clears the currently selected stock
   */
  const clearSelection = () => {
    setSelectedStock(null);
  };

  /**
   * Wraps a promise with a timeout to prevent hanging requests
   *
   * @param promise - Promise to wrap
   * @param timeoutMs - Timeout in milliseconds
   * @returns Promise that resolves or rejects within the timeout
   */
  const withTimeout = <T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error("TIMEOUT: Request took too long")),
          timeoutMs
        )
      ),
    ]);
  };

  /**
   * Handles stock loading errors with appropriate user feedback
   *
   * @param symbol - Stock symbol that failed
   * @param error - Error object or message
   */
  const handleStockError = (symbol: string, error: unknown) => {
    let errorMsg = "Unknown error";
    if (error instanceof Error && typeof error.message === "string") {
      errorMsg = error.message;
    }

    if (errorMsg.startsWith("INVALID_SYMBOL:")) {
      toast.error(`"${symbol}" is not a valid stock symbol`);
      setWatchlist((prev) => prev.filter((stock) => stock.symbol !== symbol));
    } else {
      if (errorMsg.startsWith("NETWORK_ERROR:")) {
        toast.error(`Failed to fetch data for ${symbol}`);
      } else if (errorMsg.startsWith("RATE_LIMIT:")) {
        toast.error("API quota exceeded. Please try again later.");
      } else if (errorMsg.startsWith("TIMEOUT:")) {
        toast.error(`Request timeout for ${symbol} - please try again`);
      } else {
        toast.error(`Failed to load ${symbol}`);
      }

      setWatchlist((prev) =>
        prev.map((stock) =>
          stock.symbol === symbol
            ? { ...stock, isLoading: false, error: errorMsg }
            : stock
        )
      );
    }
  };

  /**
   * Refreshes a single stock with timeout protection
   * Used for UX improvement after adding stocks
   *
   * @param symbol - Stock symbol to refresh
   */
  const refreshSingleStock = async (symbol: string) => {
    try {
      const stock = await withTimeout(stockService.getQuote(symbol), 5000);

      setWatchlist((prev) =>
        prev.map((s) => {
          if (s.symbol === symbol) {
            const updatedStock = { ...stock, priceHistory: s.priceHistory };
            return stockService.addPriceToHistory(updatedStock);
          }
          return s;
        })
      );
    } catch (error) {
      // Silent fail for single stock refresh - user can manually retry if needed
    }
  };

  /**
   * Retries loading a failed stock with timeout protection
   *
   * @param symbol - Stock symbol to retry
   */
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
      const stock = await withTimeout(stockService.getQuote(symbolUpper), 5000);

      setWatchlist((prev) =>
        prev.map((s) => {
          if (s.symbol === symbolUpper) {
            const updatedStock = { ...stock, priceHistory: s.priceHistory };
            return stockService.addPriceToHistory(updatedStock);
          }
          return s;
        })
      );

      toast.success(`Retried ${stock.companyName} successfully`);
    } catch (error) {
      handleStockError(symbolUpper, error);
    }
  };

  /**
   * Refreshes all stocks in the watchlist with rate limiting
   *
   * @param isManual - Whether this is a manual refresh (applies rate limiting)
   */
  const refreshAllStocks = useCallback(
    async (isManual = false) => {
      if (isManual) {
        const rateLimit = RateLimiter.isRefreshAllowed(lastManualRefresh);

        if (!rateLimit.allowed) {
          toast.error(RateLimiter.getErrorMessage(rateLimit));
          return;
        }

        const now = new Date();
        setLastManualRefresh(now);
        RateLimiter.addToRefreshHistory(now);

        setTimeout(() => performRefresh(true), 0);
        return;
      }

      setTimeout(() => performRefresh(false), 0);
    },
    [lastManualRefresh]
  );

  /**
   * Performs the actual refresh operation for all stocks
   * Handles stuck stocks and failed stocks appropriately
   *
   * @param isManual - Whether this is a manual refresh
   */
  const performRefresh = useCallback(
    async (isManual: boolean) => {
      setWatchlist((currentWatchlist) => {
        const now = new Date();
        const twoMinutesAgo = now.getTime() - 2 * 60 * 1000;

        // Reset stuck loading stocks for auto-refresh
        let processedWatchlist = currentWatchlist;
        if (!isManual) {
          processedWatchlist = currentWatchlist.map((stock) => {
            if (
              stock.isLoading &&
              stock.lastUpdated.getTime() < twoMinutesAgo
            ) {
              return {
                ...stock,
                isLoading: false,
                error: "Request timeout - please retry",
              };
            }
            return stock;
          });
        }

        // UX Improvement: Include failed stocks in refresh for auto-retry
        const stocksToRefresh = processedWatchlist.filter(
          (stock) => !stock.isLoading && (!stock.error || !isManual)
        );

        if (stocksToRefresh.length === 0) {
          if (isManual) {
            toast.success("No stocks to refresh");
          }
          return processedWatchlist;
        }

        if (isManual) {
          setIsGlobalLoading(true);
          toast("Refreshing all stocks...", { icon: "🔄" });
        }

        const refreshPromises = stocksToRefresh.map(async (stock) => {
          try {
            const updatedStock = await stockService.getQuote(stock.symbol);

            setWatchlist((current) =>
              current.map((s) => {
                if (s.symbol === stock.symbol) {
                  const stockWithHistory = {
                    ...updatedStock,
                    priceHistory: s.priceHistory,
                  };
                  return stockService.addPriceToHistory(stockWithHistory);
                }
                return s;
              })
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
          Promise.allSettled(refreshPromises).then(() => {
            setIsGlobalLoading(false);
            toast.success("Refresh complete!");
          });
        }

        return processedWatchlist.map((stock) =>
          stocksToRefresh.some((s) => s.symbol === stock.symbol)
            ? { ...stock, isLoading: true }
            : stock
        );
      });
    },
    [lastManualRefresh]
  );

  /**
   * Initialization effect that handles session restoration and auto-recovery
   * Runs once on component mount
   */
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Handle stocks stuck in loading state from previous session
    const stuckLoadingStocks = watchlist.filter((stock) => stock.isLoading);

    // UX Improvement: Handle stocks that failed in previous session
    const failedStocks = watchlist.filter((stock) => stock.error);

    if (stuckLoadingStocks.length > 0) {
      setIsGlobalLoading(true);

      const retryPromises = stuckLoadingStocks.map(async (stock) => {
        try {
          const updatedStock = await withTimeout(
            stockService.getQuote(stock.symbol),
            5000
          );

          setWatchlist((prev) =>
            prev.map((s) => {
              if (s.symbol === stock.symbol) {
                const stockWithHistory = {
                  ...updatedStock,
                  priceHistory: s.priceHistory,
                };
                return stockService.addPriceToHistory(stockWithHistory);
              }
              return s;
            })
          );
        } catch (error) {
          handleStockError(stock.symbol, error);
        }
      });

      Promise.allSettled(retryPromises).then(() => {
        setIsGlobalLoading(false);
      });

      toast(
        `Auto-retrying ${stuckLoadingStocks.length} stocks that were loading...`,
        {
          icon: "🔄",
        }
      );
    }

    // UX Improvement: Auto-retry failed stocks on page load
    if (failedStocks.length > 0) {
      setTimeout(() => {
        failedStocks.forEach((stock) => {
          refreshSingleStock(stock.symbol);
        });
      }, 2000); // Delay to avoid overwhelming the API
    }

    if (watchlist.length > 0) {
      const healthyStocks =
        watchlist.length - stuckLoadingStocks.length - failedStocks.length;
      if (healthyStocks > 0) {
        toast.success(
          `Welcome back! Restored ${watchlist.length} stocks from your session`
        );
      }
    }

    // Start regular refresh cycle
    refreshAllStocks();
    const interval = setInterval(() => {
      refreshAllStocks();
    }, 60000);

    return () => clearInterval(interval);
  }, [refreshAllStocks, watchlist.length]);

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
