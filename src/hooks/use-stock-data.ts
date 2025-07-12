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
  const maxWatchlistSize = 12;
  const MANUAL_REFRESH_COOLDOWN = 30000;

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FinnhubSymbolResponse[]>(
    []
  );
  const [isSearching, setIsSearching] = useState(false);
  const hasInitialized = useRef(false);
  const hasReloaded = useRef(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  // Nuclear cooldown helpers - persisted in localStorage
  const getLastRefreshTime = (): Date | null => {
    const stored = localStorage.getItem("lastRefreshTime");
    return stored ? new Date(stored) : null;
  };

  const setLastRefreshTime = (date: Date) => {
    localStorage.setItem("lastRefreshTime", date.toISOString());
  };

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
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
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

      // Add initial data point after 1 second
      setTimeout(() => {
        refreshSingleStock(symbolUpper);
      }, 1000);
    } catch (error) {
      handleStockError(symbolUpper, error);
    }
  };

  /**
   * Removes a stock from the watchlist
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
   */
  const refreshSingleStock = async (symbol: string) => {
    console.log("Refreshing Single Stock");
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
      // Silent fail for single stock refresh
    }
  };

  /**
   * Retries loading a failed stock with timeout protection
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
   */
  const refreshAllStocks = useCallback(
    async (isManual = false) => {
      if (!isManual) {
        const now = new Date();
        const lastRefresh = getLastRefreshTime();

        if (lastRefresh && now.getTime() - lastRefresh.getTime() < 60000) {
          return;
        }

        setLastRefreshTime(now);
      }

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

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
   */
  const performRefresh = useCallback(
    async (isManual: boolean) => {
      setWatchlist((currentWatchlist) => {
        const now = new Date();
        const twoMinutesAgo = now.getTime() - 2 * 60 * 1000;

        // Reset stuck loading stocks
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

  // AUTO-REFRESH STOCKS EVERY 60 SECONDS
  useEffect(() => {
    if (watchlist.length > 0) {
      const refreshInterval = setInterval(() => {
        watchlist.forEach((stock, index) => {
          setTimeout(() => {
            if (!stock.isLoading && !stock.error) {
              refreshSingleStock(stock.symbol);
            }
          }, index * 200);
        });
      }, 60000);

      return () => clearInterval(refreshInterval);
    }
  }, [watchlist]);

  /**
   * Initialization effect - runs once on component mount
   */
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Handle stocks stuck in loading state from previous session
    const stuckLoadingStocks = watchlist.filter((stock) => stock.isLoading);
    const failedStocks = watchlist.filter((stock) => stock.error);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const now = new Date();
        const lastRefresh = getLastRefreshTime();

        if (!lastRefresh || now.getTime() - lastRefresh.getTime() > 60000) {
          refreshAllStocks();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Auto-retry stuck/failed stocks
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
    }

    // Auto-retry failed stocks
    if (failedStocks.length > 0) {
      setTimeout(() => {
        failedStocks.forEach((stock) => {
          refreshSingleStock(stock.symbol);
        });
      }, 2000);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
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
