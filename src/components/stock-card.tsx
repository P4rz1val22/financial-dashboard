import { CardProps } from "@/types";
import { LineChart } from "@/components/line-chart";
import { useRef } from "react";

function StockCard(props: Readonly<CardProps>) {
  const {
    stock,
    onRemove,
    onSelect,
    onRetry,
    isSelected,
    isGlobalLoading,
    chartWidth,
  } = props;

  const cardRef = useRef<HTMLButtonElement>(null);

  /**
   * Handles keyboard interactions for the stock card
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case "Enter":
      case " ": // Space bar
        e.preventDefault();
        onSelect(stock);
        break;

      case "Delete":
      case "Backspace":
        e.preventDefault();
        onRemove(stock.symbol);
        break;

      case "r":
      case "R":
        // Retry shortcut for error cards
        if (stock.error) {
          e.preventDefault();
          onRetry(stock.symbol);
        }
        break;
    }
  };

  if (stock.isLoading) {
    return (
      <div
        className="bg-white rounded-lg shadow-md p-4 transition cursor-pointer h-70 overflow-hidden opacity-75"
        tabIndex={0}
        role="button"
        aria-label={`Loading stock data for ${stock.symbol}`}
        aria-busy="true"
      >
        <div className="flex flex-row items-center gap-1">
          <h2>{stock.symbol}</h2>
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  const formatErrorMessage = (error: string) => {
    const parts = error.split(": ");
    if (parts.length >= 2) {
      return parts.slice(1).join(": ");
    }
    return error;
  };

  if (stock.error) {
    return (
      <button
        ref={cardRef}
        className="bg-white rounded-lg shadow-md p-4 transition h-70 overflow-hidden border-l-4 border-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
        tabIndex={0}
        role="button"
        aria-label={`Stock ${stock.symbol} failed to load. Press R to retry, Delete to remove.`}
        onKeyDown={handleKeyDown}
      >
        <div className="flex flex-col gap-2 justify-between h-full">
          <div>
            <h2 className="font-bold text-red-600">{stock.symbol}</h2>
            <p className="text-sm text-red-500">
              Failed to load – {formatErrorMessage(stock.error)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRetry(stock.symbol);
              }}
              className="bg-white border-gray-300 border-1 hover:text-blue-500 p-2 cursor-pointer rounded-md text-md hover:border-blue-500 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label={`Retry loading ${stock.symbol}`}
            >
              Retry
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(stock.symbol);
              }}
              className="bg-white border-gray-300 border-1 hover:text-red-500 p-2 cursor-pointer rounded-md text-md hover:border-red-500 transition focus:outline-none focus:ring-2 focus:ring-red-400"
              aria-label={`Remove ${stock.symbol} from watchlist`}
            >
              Remove
            </button>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      ref={cardRef}
      className={`bg-white rounded-lg shadow-md p-4 transition cursor-crosshair h-70 overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 text-left${
        isSelected ? "ring-2 ring-blue-500" : ""
      }`}
      onClick={() => onSelect(stock)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label={`Stock ${stock.symbol} - ${
        stock.companyName
      }. Price: $${stock.currentPrice?.toFixed(2)}. Change: ${
        (stock.change ?? 0) >= 0 ? "up" : "down"
      } ${Math.abs(stock.change ?? 0).toFixed(
        2
      )} dollars. Press Enter to view details, Delete to remove.`}
      aria-pressed={isSelected}
    >
      <div className="flex flex-col">
        <div className="flex flex-row items-center gap-2">
          <h2 className="font-bold">{stock.symbol}</h2>
          <h4
            className={`text-sm ${
              stock.change && stock.change >= 0
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {stock.change?.toFixed(2)} ({stock.changePercent?.toFixed(2)}%)
            {stock.change && stock.change >= 0 ? "⬆︎" : "⬇︎"}Today
          </h4>
        </div>

        <p className="text-sm text-gray-600">{stock.companyName}</p>

        <p className="text-lg font-semibold">
          ${stock.currentPrice?.toFixed(2)}
        </p>

        <div className="flex-1 min-h-[50px] flex items-center justify-center my-1 pointer-events-none">
          {stock.priceHistory.length > 0 ? (
            <LineChart
              key={`${stock.symbol}-${isSelected}`}
              data={stock.priceHistory}
              width={chartWidth}
              height={150}
              symbol={stock.symbol}
              mini={true}
              isLoading={isGlobalLoading}
            />
          ) : (
            <div className="text-xs text-gray-400 text-center">
              Loading chart data...
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(stock.symbol);
          }}
          className="text-red-500 hover:text-red-700 text-sm cursor-pointer self-start focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 rounded px-1"
          aria-label={`Remove ${stock.symbol} from watchlist`}
        >
          Remove
        </button>
      </div>
    </button>
  );
}

export default StockCard;
