import StockCard from "@/components/stock-card";
import { Toaster } from "react-hot-toast";
import useStockData from "@/hooks/use-stock-data";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

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
  } = useStockData();

  const [popularStocks, setPopularStocks] = useState([
    "AAPL",
    "GOOGL",
    "MSFT",
    "TSLA",
  ]);

  const [tempQuery, setTempQuery] = useState("");

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

  // Use the custom hook
  useRefreshTimer();

  const testSearch = async () => {
    const results = await searchStocks("Apple");
    console.log("Search results:", results);
  };

  return (
    <div className="p-4 bg-gray-200 flex flex-col gap-2 w-screen min-h-screen">
      <div className="bg-white rounded-lg shadow-md p-4 transition ">
        <h1 className="text-3xl font-bold text-gray-800">
          Financial Dashboard
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-2 transition">
        <h1 className="text-xl font-light text-gray-800">
          <input
            className="w-full focus-visible:!!!ring-offset-8 p-2"
            placeholder="Search for a Stock"
            onChange={async (e) => {
              setTempQuery(e.target.value);
              await searchStocks(e.target.value);
            }}
            value={tempQuery}
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                await addStock(e.currentTarget.value);
                setTempQuery("");
              }
            }}
          />
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

      {popularStocks.length !== 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 gap-2 flex flex-col">
          <h3>Popular Stocks: </h3>
          <div className="flex gap-2">
            {popularStocks.map((symbol) => (
              <button
                key={symbol}
                onClick={() => {
                  addStock(symbol);
                  setPopularStocks(popularStocks.filter((e) => e !== symbol));
                }}
                disabled={watchlist.some(
                  (s) => s.symbol === symbol && s.isLoading
                )}
                className="bg-white border border-gray-300 p-2 rounded-md cursor-pointer hover:border-blue-500 transition"
              >
                {symbol}
              </button>
            ))}
            <button
              onClick={() => setPopularStocks([])}
              className="text-gray-500 hover:text-gray-700 mr-auto transition flex items-end pb-1 hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="w-full grid-cols-3 gap-2 grid bg-red-">
        {watchlist.map((stock) => (
          <StockCard
            key={stock.symbol}
            stock={stock}
            onRetry={retryStock}
            onRemove={removeStock}
            onSelect={selectStock}
            isSelected={selectedStock?.symbol === stock.symbol}
          />
        ))}
      </div>

      <button onClick={testSearch}>
        Test Search
        <ul>
          {searchResults.map((result, idx) => (
            <li key={result.symbol ?? idx}>
              {result.symbol} - {result.description}
            </li>
          ))}
        </ul>
      </button>

      <Toaster position="top-right" />
    </div>
  );
}

export default App;
