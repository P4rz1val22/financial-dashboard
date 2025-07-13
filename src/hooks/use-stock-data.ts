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
  const maxWatchlistSize = 12;
  const MANUAL_REFRESH_COOLDOWN = 30000;

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FinnhubSymbolResponse[]>(
    []
  );
  const [isSearching, setIsSearching] = useState(false);

  const hasInitialized = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getLastRefreshTime = useCallback((): Date | null => {
    const stored = localStorage.getItem("lastRefreshTime");
    return stored ? new Date(stored) : null;
  }, []);

  const setLastRefreshTime = useCallback((date: Date) => {
    localStorage.setItem("lastRefreshTime", date.toISOString());
  }, []);

  /**
   * Limits price history to today's data with max 288 entries (5-minute intervals for 24 hours)
   */
  const limitPriceHistoryToToday = useCallback((priceHistory: Array<any>) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysData = priceHistory.filter((point) => {
      const pointDate = new Date(point.timestamp);
      pointDate.setHours(0, 0, 0, 0);
      return pointDate.getTime() === today.getTime();
    });

    const normalizedData = todaysData.map((point) => ({
      price: point.price,
      timestamp: new Date(point.timestamp),
      change: point.change ?? 0,
      changePercent: point.changePercent ?? 0,
    }));

    if (normalizedData.length > 288) {
      return normalizedData.slice(-288);
    }

    return normalizedData;
  }, []);

  const debouncedSaveWatchlist = useCallback(
    debounce((watchlist: Stock[]) => {
      SessionStorageManager.saveWatchlist(watchlist);
    }, 500),
    []
  );

  const debouncedSaveSelectedStock = useCallback(
    debounce((stock: Stock | null) => {
      SessionStorageManager.saveSelectedStock(stock);
    }, 500),
    []
  );

  useEffect(() => {
    debouncedSaveWatchlist(watchlist);
  }, [watchlist, debouncedSaveWatchlist]);

  useEffect(() => {
    debouncedSaveSelectedStock(selectedStock);
  }, [selectedStock, debouncedSaveSelectedStock]);

  useEffect(() => {
    SessionStorageManager.saveLastManualRefresh(lastManualRefresh);
  }, [lastManualRefresh]);

  /**
   * Debounce utility function
   */
  function debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

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
    };
  }, []);

  /**
   * Clears the current search query and results
   */
  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  /**
   * Wraps a promise with a timeout to prevent hanging requests
   */
  const withTimeout = useCallback(
    <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(
            () => reject(new Error("TIMEOUT: Request took too long")),
            timeoutMs
          )
        ),
      ]);
    },
    []
  );

  /**
   * Updates a stock in the watchlist with new data
   */
  const updateStockInWatchlist = useCallback(
    (symbol: string, update: Partial<Stock>) => {
      setWatchlist((prev) =>
        prev.map((stock) =>
          stock.symbol === symbol ? { ...stock, ...update } : stock
        )
      );
    },
    []
  );

  /**
   * Handles stock loading errors with appropriate user feedback
   */
  const handleStockError = useCallback(
    (symbol: string, error: unknown) => {
      let errorMsg = "Unknown error";
      if (error instanceof Error && typeof error.message === "string") {
        errorMsg = error.message;
      }

      if (errorMsg.startsWith("INVALID_SYMBOL:")) {
        toast.error(`"${symbol}" is not a valid stock symbol`);
        setWatchlist((prev) => prev.filter((stock) => stock.symbol !== symbol));
      } else {
        const errorMessages = {
          NETWORK_ERROR: `Failed to fetch data for ${symbol}`,
          RATE_LIMIT: "API quota exceeded. Please try again later.",
          TIMEOUT: `Request timeout for ${symbol} - please try again`,
        };

        const errorType = Object.keys(errorMessages).find((type) =>
          errorMsg.startsWith(type)
        ) as keyof typeof errorMessages;

        toast.error(errorMessages[errorType] || `Failed to load ${symbol}`);

        updateStockInWatchlist(symbol, {
          isLoading: false,
          error: errorMsg,
        });
      }
    },
    [updateStockInWatchlist]
  );

  /**
   * Refreshes a single stock with timeout protection
   */
  const refreshSingleStock = useCallback(
    async (symbol: string) => {
      try {
        const stock = await withTimeout(stockService.getQuote(symbol), 5000);

        setWatchlist((prev) =>
          prev.map((s) => {
            if (s.symbol === symbol) {
              const updatedStock = { ...stock, priceHistory: s.priceHistory };
              const stockWithNewPoint =
                stockService.addPriceToHistory(updatedStock);

              return {
                ...stockWithNewPoint,
                priceHistory: limitPriceHistoryToToday(
                  stockWithNewPoint.priceHistory
                ),
              };
            }
            return s;
          })
        );
      } catch (error) {}
    },
    [withTimeout, limitPriceHistoryToToday]
  );

  /**
   * Adds a new stock to the watchlist with initial data fetch
   */
  const addStock = useCallback(
    async (symbol: string) => {
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

        updateStockInWatchlist(symbolUpper, stockWithHistory);
        toast.success(`Added ${stock.companyName} to watchlist`);

        setTimeout(() => {
          refreshSingleStock(symbolUpper);
        }, 1000);
      } catch (error) {
        handleStockError(symbolUpper, error);
      }
    },
    [watchlist, handleStockError, refreshSingleStock, updateStockInWatchlist]
  );

  /**
   * Removes a stock from the watchlist
   */
  const removeStock = useCallback(
    (symbol: string) => {
      const symbolUpper = symbol.toUpperCase();
      setWatchlist((prev) =>
        prev.filter((stock) => stock.symbol !== symbolUpper)
      );

      if (selectedStock?.symbol === symbolUpper) {
        setSelectedStock(null);
      }

      toast.success(`Removed ${symbolUpper} from watchlist`);
    },
    [selectedStock]
  );

  /**
   * Selects a stock for detailed view
   */
  const selectStock = useCallback((stock: Stock | null) => {
    setSelectedStock(stock);
  }, []);

  /**
   * Clears the currently selected stock
   */
  const clearSelection = useCallback(() => {
    setSelectedStock(null);
  }, []);

  /**
   * Retries loading a failed stock with timeout protection
   */
  const retryStock = useCallback(
    async (symbol: string) => {
      const symbolUpper = symbol.toUpperCase();

      updateStockInWatchlist(symbolUpper, {
        isLoading: true,
        error: undefined,
      });

      try {
        const stock = await withTimeout(
          stockService.getQuote(symbolUpper),
          5000
        );
        const stockWithHistory = {
          ...stock,
          priceHistory:
            watchlist.find((s) => s.symbol === symbolUpper)?.priceHistory || [],
        };

        updateStockInWatchlist(
          symbolUpper,
          stockService.addPriceToHistory(stockWithHistory)
        );

        toast.success(`Retried ${stock.companyName} successfully`);
      } catch (error) {
        handleStockError(symbolUpper, error);
      }
    },
    [withTimeout, watchlist, handleStockError, updateStockInWatchlist]
  );

  /**
   * Refreshes all stocks in the watchlist with rate limiting
   */
  const refreshAllStocks = useCallback(
    async (isManual = false) => {
      if (!isManual) {
        const now = new Date();
        const lastRefresh = getLastRefreshTime();

        if (lastRefresh && now.getTime() - lastRefresh.getTime() < 300000) {
          return;
        }

        setLastRefreshTime(now);
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

        setIsGlobalLoading(true);
        toast("Refreshing all stocks...", { icon: "🔄" });
      }

      const stocksToRefresh = watchlist.filter(
        (stock) => !stock.isLoading && (!stock.error || !isManual)
      );

      if (stocksToRefresh.length === 0) {
        if (isManual) {
          toast.success("No stocks to refresh");
          setIsGlobalLoading(false);
        }
        return;
      }

      const refreshPromises = stocksToRefresh.map(async (stock) => {
        try {
          const updatedStock = await stockService.getQuote(stock.symbol);
          const stockWithHistory = {
            ...updatedStock,
            priceHistory: stock.priceHistory,
          };

          const stockWithNewPoint =
            stockService.addPriceToHistory(stockWithHistory);

          updateStockInWatchlist(stock.symbol, {
            ...stockWithNewPoint,
            priceHistory: limitPriceHistoryToToday(
              stockWithNewPoint.priceHistory
            ),
          });
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
          updateStockInWatchlist(stock.symbol, {
            isLoading: false,
            error: errorMsg,
          });
        }
      });

      if (isManual) {
        Promise.allSettled(refreshPromises).then(() => {
          setIsGlobalLoading(false);
          toast.success("Refresh complete!");
        });
      }
    },
    [
      lastManualRefresh,
      watchlist,
      getLastRefreshTime,
      setLastRefreshTime,
      updateStockInWatchlist,
    ]
  );

  useEffect(() => {
    if (watchlist.length === 0) return;

    const refreshInterval = setInterval(() => {
      watchlist.forEach((stock, index) => {
        setTimeout(() => {
          if (!stock.isLoading && !stock.error) {
            refreshSingleStock(stock.symbol);
          }
        }, index * 200);
      });
    }, 300000);

    return () => clearInterval(refreshInterval);
  }, [watchlist, refreshSingleStock]);

  /**
   * Initialization effect - runs once on component mount
   */
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const stuckLoadingStocks = watchlist.filter((stock) => stock.isLoading);
    const failedStocks = watchlist.filter((stock) => stock.error);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const now = new Date();
        const lastRefresh = getLastRefreshTime();

        if (!lastRefresh || now.getTime() - lastRefresh.getTime() > 300000) {
          refreshAllStocks();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (stuckLoadingStocks.length > 0) {
      setIsGlobalLoading(true);

      const retryPromises = stuckLoadingStocks.map(async (stock) => {
        try {
          const updatedStock = await withTimeout(
            stockService.getQuote(stock.symbol),
            5000
          );

          const stockWithHistory = {
            ...updatedStock,
            priceHistory: stock.priceHistory,
          };

          updateStockInWatchlist(
            stock.symbol,
            stockService.addPriceToHistory(stockWithHistory)
          );
        } catch (error) {
          handleStockError(stock.symbol, error);
        }
      });

      Promise.allSettled(retryPromises).then(() => {
        setIsGlobalLoading(false);
      });
    }

    if (failedStocks.length > 0) {
      setTimeout(() => {
        failedStocks.forEach((stock) => {
          refreshSingleStock(stock.symbol);
        });
      }, 2000 + Math.random() * 3000);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    watchlist.length,
    withTimeout,
    handleStockError,
    refreshSingleStock,
    refreshAllStocks,
    getLastRefreshTime,
    updateStockInWatchlist,
  ]);

  return {
    searchQuery,
    searchResults,
    isSearching,
    watchlist,
    selectedStock,
    isGlobalLoading,
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
