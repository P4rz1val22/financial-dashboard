import StockCard from "@/components/stock-card";
import { Toaster } from "react-hot-toast";
import useStockData from "@/hooks/use-stock-data";
import { useState } from "react";

function App() {
  const {
    watchlist,
    addStock,
    removeStock,
    selectStock,
    retryStock,
    selectedStock,
  } = useStockData();
  const [popularStocks, setPopularStocks] = useState([
    "AAPL",
    "GOOGL",
    "MSFT",
    "TSLA",
  ]);

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
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addStock(e.currentTarget.value);
                e.currentTarget.value = "";
              }
            }}
          />
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
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
