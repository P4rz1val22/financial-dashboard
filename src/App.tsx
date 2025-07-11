import StockCard from "@/components/stock-card";
import { Toaster } from "react-hot-toast";
import useStockData from "@/hooks/use-stock-data";
import { useEffect, useState, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { SearchDropdown } from "@/components/search-dropdown";
import { DetailedStockModal } from "./components/detail-stock-modal";

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

  // Add responsive chart sizing at app level
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(180);

  useEffect(() => {
    const updateChartWidth = () => {
      if (chartContainerRef.current) {
        const containerWidth = chartContainerRef.current.offsetWidth;
        // Calculate width based on grid columns and gaps
        // For lg: 3 columns, md: 2 columns, sm: 1 column
        const isLarge = window.innerWidth >= 1024;
        const isMedium = window.innerWidth >= 768;

        let availableWidth;
        if (isLarge) {
          // 3 columns with gaps
          availableWidth = (containerWidth - 16) / 3; // 16px = 2 gaps * 8px
        } else if (isMedium) {
          // 2 columns with gaps
          availableWidth = (containerWidth - 8) / 2; // 8px = 1 gap * 8px
        } else {
          // 1 column
          availableWidth = containerWidth;
        }

        // Subtract card padding and some buffer
        setChartWidth(Math.max(150, availableWidth - 40));
      }
    };

    updateChartWidth();
    window.addEventListener("resize", updateChartWidth);
    return () => window.removeEventListener("resize", updateChartWidth);
  }, [isGlobalLoading, watchlist.length]);

  // Filter out stocks that are already in watchlist
  const filteredSearchResults = searchResults.filter(
    (result) => !watchlist.some((stock) => stock.symbol === result.symbol)
  );

  // Reset selected index when search results change (not filtered results)
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchResults]);

  // CUSTOM HOOK FOR REFRESH TIMER (replaces forceUpdate)
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
    setSelectedIndex(-1); // Reset selection when typing

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
    console.log(
      "🔍 Key pressed:",
      e.key,
      "Dropdown visible:",
      isDropdownVisible,
      "Results:",
      filteredSearchResults.length
    );

    if (!isDropdownVisible || filteredSearchResults.length === 0) {
      // Original behavior when dropdown is not visible
      if (e.key === "Enter") {
        await addStock(e.currentTarget.value);
        setTempQuery("");
        setIsDropdownVisible(false);
      } else if (e.key === "Escape") {
        setIsDropdownVisible(false);
      }
      return;
    }

    // Keyboard navigation when dropdown is visible
    switch (e.key) {
      case "ArrowDown":
        console.log("⬇️ Arrow down pressed, current index:", selectedIndex);
        e.preventDefault();
        setSelectedIndex((prev) => {
          const newIndex =
            prev < filteredSearchResults.length - 1 ? prev + 1 : 0;
          console.log("⬇️ New index:", newIndex);
          return newIndex;
        });
        break;

      case "ArrowUp":
        console.log("⬆️ Arrow up pressed, current index:", selectedIndex);
        e.preventDefault();
        setSelectedIndex((prev) => {
          const newIndex =
            prev > 0 ? prev - 1 : filteredSearchResults.length - 1;
          console.log("⬆️ New index:", newIndex);
          return newIndex;
        });
        break;

      case "Enter":
        console.log("✅ Enter pressed, selected index:", selectedIndex);
        e.preventDefault();
        if (
          selectedIndex >= 0 &&
          selectedIndex < filteredSearchResults.length
        ) {
          await handleSelectStock(filteredSearchResults[selectedIndex].symbol);
        } else {
          // Fallback to original behavior
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
    <div className="p-4 bg-gray-200 flex flex-col gap-2 w-screen min-h-screen -mb-6">
      <div className="bg-white rounded-lg shadow-md p-4 transition ">
        <h1 className="text-3xl font-bold text-gray-800">
          Financial Dashboard
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-2 transition">
        <h1 className="text-xl font-light text-gray-800">
          <div className="relative">
            <input
              className="w-full focus-visible:!!!ring-offset-8 p-2"
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

          <div className="text-sm text-gray-500 p-1 px-2 flex flex-row gap-2 justify-between">
            <button
              onClick={() => refreshAllStocks(true)}
              disabled={isRefreshDisabled() || isGlobalLoading}
              className={`flex flex-row items-center gap-1 select-none ${
                isGlobalLoading || isRefreshDisabled()
                  ? "cursor-not-allowed"
                  : "hover:underline cursor-pointer"
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
