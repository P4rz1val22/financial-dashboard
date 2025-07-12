import StockCard from "@/components/stock-card";
import { Toaster } from "react-hot-toast";
import useStockData from "@/hooks/use-stock-data";
import { useEffect, useState, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { SearchDropdown } from "@/components/search-dropdown";
import { DetailedStockModal } from "./components/detail-stock-modal";

/**
 * The main application component for the Financial Dashboard.
 *
 * This component manages the overall state and UI for searching stocks,
 * managing a watchlist, refreshing stock data, and displaying detailed stock information.
 *
 * Features:
 * - Search for stocks and add them to a watchlist.
 * - Display a list of stocks in the watchlist with charts.
 * - Remove stocks from the watchlist.
 * - Retry loading stock data if there are errors.
 * - Select a stock to view detailed information in a modal.
 * - Refresh all stocks with a cooldown timer.
 * - Responsive chart sizing based on container and window size.
 * - Keyboard navigation for search dropdown.
 *
 * State Management:
 * - Uses `useStockData` custom hook for stock-related state and actions.
 * - Manages local UI state for search input, dropdown visibility, selected index, and chart width.
 *
 * UI Components:
 * - `SearchDropdown`: Displays search results for stocks.
 * - `StockCard`: Shows individual stock information and chart.
 * - `DetailedStockModal`: Modal for detailed stock info.
 * - `Toaster`: Displays notifications. (from react-hot-toast)
 *
 * @returns {JSX.Element} The rendered Financial Dashboard application.
 */
function App() {
  const {
    watchlist,
    addStock,
    removeStock,
    selectStock,
    retryStock,
    selectedStock,
    searchStocks,
    maxWatchlistSize,
    refreshAllStocks,
    isGlobalLoading,
    lastManualRefresh,
    MANUAL_REFRESH_COOLDOWN,
    searchResults,
    isSearching,
  } = useStockData();

  const [tempQuery, setTempQuery] = useState("");
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(180);

  useEffect(() => {
    const updateChartWidth = () => {
      if (chartContainerRef.current) {
        const containerWidth = chartContainerRef.current.offsetWidth;
        const isLarge = window.innerWidth >= 1024;

        let availableWidth;
        if (isLarge) {
          availableWidth = (containerWidth - 16) / 3;
          availableWidth = (containerWidth - 8) / 2;
        } else {
          availableWidth = containerWidth;
        }

        setChartWidth(Math.max(150, availableWidth - 40));
      }
    };

    updateChartWidth();
    window.addEventListener("resize", updateChartWidth);
    return () => window.removeEventListener("resize", updateChartWidth);
  }, [isGlobalLoading, watchlist.length]);

  const filteredSearchResults = searchResults.filter(
    (result) => !watchlist.some((stock) => stock.symbol === result.symbol)
  );

  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchResults]);

  const useRefreshTimer = () => {
    const [, setTick] = useState(0);

    useEffect(() => {
      if (!isRefreshDisabled()) return;

      const interval = setInterval(() => {
        setTick((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    }, [isRefreshDisabled()]);
  };

  const isRefreshDisabled = () => {
    if (isGlobalLoading) return true;
    if (!lastManualRefresh) return false;

    const now = new Date();
    return (
      now.getTime() - lastManualRefresh.getTime() < MANUAL_REFRESH_COOLDOWN
    );
  };

  const getRemainingSeconds = () => {
    if (!lastManualRefresh) return 0;
    const now = new Date();
    return Math.ceil(
      (MANUAL_REFRESH_COOLDOWN -
        (now.getTime() - lastManualRefresh.getTime())) /
        1000
    );
  };

  const getRefreshButtonText = () => {
    if (isGlobalLoading) return "Refreshing...";
    if (isRefreshDisabled() && lastManualRefresh) {
      return `Refresh in ${getRemainingSeconds()}s`;
    }
    return "Refresh All";
  };

  useRefreshTimer();

  const handleSearchChange = async (value: string) => {
    setTempQuery(value);
    setSelectedIndex(-1);

    if (value.trim()) {
      await searchStocks(value);
      setIsDropdownVisible(true);
    } else {
      setIsDropdownVisible(false);
    }
  };

  const handleSelectStock = async (symbol: string) => {
    await addStock(symbol);
    setTempQuery("");
    setIsDropdownVisible(false);
    setSelectedIndex(-1);
  };

  const handleSearchKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (!isDropdownVisible || filteredSearchResults.length === 0) {
      if (e.key === "Enter") {
        await addStock(e.currentTarget.value);
        setTempQuery("");
        setIsDropdownVisible(false);
      } else if (e.key === "Escape") {
        setIsDropdownVisible(false);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => {
          const newIndex =
            prev < filteredSearchResults.length - 1 ? prev + 1 : 0;
          return newIndex;
        });
        break;

      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => {
          const newIndex =
            prev > 0 ? prev - 1 : filteredSearchResults.length - 1;
          return newIndex;
        });
        break;

      case "Enter":
        e.preventDefault();
        if (
          selectedIndex >= 0 &&
          selectedIndex < filteredSearchResults.length
        ) {
          await handleSelectStock(filteredSearchResults[selectedIndex].symbol);
        } else {
          await addStock(e.currentTarget.value);
          setTempQuery("");
          setIsDropdownVisible(false);
        }
        break;

      case "Escape":
        setIsDropdownVisible(false);
        setSelectedIndex(-1);
        break;

      case "Tab":
        setIsDropdownVisible(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleCloseDropdown = () => {
    setIsDropdownVisible(false);
    setSelectedIndex(-1);
  };

  const handleKeyboardSelect = (index: number) => {
    setSelectedIndex(index);
  };

  return (
    <div className="p-4 bg-slate-200 dark:bg-black flex flex-col gap-2 w-screen min-h-screen -mb-6 transition-colors duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-4 transition-colors duration-200">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Financial Dashboard
        </h1>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-2 transition-colors duration-200">
        <h1 className="text-xl font-light text-slate-900 dark:text-white">
          <div className="relative">
            <input
              className="p-2 py-1 text-slate-900 border-b dark:text-white border-slate-200 dark:border-slate-600 w-full transition-colors duration-200 focus:outline-none focus:ring-0 focus:ring-transparent"
              placeholder="Search for a Stock"
              onChange={(e) => handleSearchChange(e.target.value)}
              value={tempQuery}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => {
                if (tempQuery.trim() && searchResults.length > 0) {
                  setIsDropdownVisible(true);
                }
              }}
              role="combobox"
              aria-expanded={isDropdownVisible}
              aria-autocomplete="list"
              aria-haspopup="listbox"
            />

            <SearchDropdown
              searchResults={filteredSearchResults}
              isVisible={isDropdownVisible}
              onSelectStock={handleSelectStock}
              onClose={handleCloseDropdown}
              isSearching={isSearching}
              selectedIndex={selectedIndex}
              onKeyboardSelect={handleKeyboardSelect}
            />
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400 p-1 pt-3 px-2 flex flex-row gap-2 justify-between">
            <button
              onClick={() => refreshAllStocks(true)}
              disabled={isRefreshDisabled() || isGlobalLoading}
              className={`flex flex-row items-center gap-1 select-none duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition rounded p-1 ${
                isGlobalLoading || isRefreshDisabled()
                  ? "cursor-not-allowed opacity-50"
                  : "hover:underline cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <RefreshCw
                className={isGlobalLoading ? "animate-spin size-4" : "size-4"}
              />
              {getRefreshButtonText()}
            </button>
            Watchlist: {watchlist.length}/{maxWatchlistSize}
          </div>
        </h1>
      </div>

      <div
        className="w-full grid gap-2 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        ref={chartContainerRef}
      >
        {watchlist.map((stock) => (
          <StockCard
            key={stock.symbol}
            stock={stock}
            onRetry={retryStock}
            onRemove={removeStock}
            onSelect={selectStock}
            isSelected={selectedStock?.symbol === stock.symbol}
            isGlobalLoading={isGlobalLoading}
            chartWidth={chartWidth}
          />
        ))}
      </div>
      <Toaster position="top-right" />
      {selectedStock && (
        <DetailedStockModal
          stock={selectedStock}
          onClose={() => selectStock(null)}
          isLoading={isGlobalLoading}
        />
      )}
    </div>
  );
}

export default App;
