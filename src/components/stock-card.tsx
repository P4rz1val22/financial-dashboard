import { CardProps } from "@/types";
import { LineChart } from "@/components/line-chart";
import { useRef, useState, useEffect } from "react";

/**
 * Renders a card component displaying stock information, including symbol, company name,
 * current price, price change, and a mini line chart of the price history.
 *
 * Handles three states:
 * - Loading: Shows a loading indicator while stock data is being fetched.
 * - Error: Displays an error message with options to retry or remove the stock.
 * - Loaded: Shows stock details and chart, with options to select or remove the stock.
 *
 * Supports keyboard accessibility:
 * - Enter/Space: Selects the stock.
 * - Delete/Backspace: Removes the stock.
 * - R: Retries loading if there was an error.
 *
 * Props:
 * @param props
 * @param props.stock - The stock data to display.
 * @param props.onRemove - Callback to remove the stock from the watchlist.
 * @param props.onSelect - Callback to select the stock.
 * @param props.onRetry - Callback to retry loading the stock data.
 * @param props.isSelected - Indicates if the card is currently selected.
 * @param props.isGlobalLoading - Indicates if global loading is in progress.
 * @param props.chartWidth - The width of the chart.
 *
 * @returns A JSX element representing the stock card.
 */
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

  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setForceUpdate((prev) => prev + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, [stock.symbol]);

  const baseCardClasses =
    "bg-white dark:bg-slate-900 rounded-lg shadow-md p-4 transition h-74 overflow-hidden";

  const cardRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case "Enter":
      case " ":
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
        if (stock.error) {
          e.preventDefault();
          onRetry(stock.symbol);
        }
        break;
    }
  };

  // LOADING CARD
  if (stock.isLoading) {
    return (
      <div
        className={`${baseCardClasses}`}
        tabIndex={0}
        role="button"
        aria-label={`Loading stock data for ${stock.symbol}`}
        aria-busy="true"
      >
        <div className="flex flex-row items-center gap-1">
          <h2>{stock.symbol}</h2>
          <div className="text-slate-600">Loading...</div>
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

  // ERROR CARD
  if (stock.error) {
    return (
      <button
        ref={cardRef}
        className={`${baseCardClasses} border-l-4 border-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900`}
        tabIndex={0}
        role="button"
        aria-label={`Stock ${stock.symbol} failed to load. Press R to retry, Delete to remove.`}
        onKeyDown={handleKeyDown}
      >
        <div className="flex flex-col gap-2 justify-between h-full">
          <div>
            <h2 className="font-bold text-red-600">{stock.symbol}</h2>
            <p className="text-sm text-red-700">
              Failed to load – {formatErrorMessage(stock.error)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRetry(stock.symbol);
              }}
              className="bg-white border-slate-300 border-1 hover:text-blue-500 dark:bg-slate-900 dark:border-slate-600 p-2 cursor-pointer rounded-md text-md hover:border-blue-500 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label={`Retry loading ${stock.symbol}`}
            >
              Retry
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(stock.symbol);
              }}
              className="bg-white border-slate-300 dark:bg-slate-900 dark:border-slate-600 border-1 hover:text-red-700  p-2 cursor-pointer rounded-md text-md hover:border-red-700 transition focus:outline-none focus:ring-2 focus:ring-red-400"
              aria-label={`Remove ${stock.symbol} from watchlist`}
            >
              Remove
            </button>
          </div>
        </div>
      </button>
    );
  }

  // MAIN CARD
  return (
    <button
      ref={cardRef}
      className={`${baseCardClasses} cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 text-left${
        isSelected ? " ring-2 ring-blue-500" : ""
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
          <span
            className={`text-sm ${
              stock.change && stock.change >= 0
                ? "text-green-600  dark:text-green-500"
                : "text-red-600 dark:text-red-500"
            }`}
          >
            {stock.change?.toFixed(2)} ({stock.changePercent?.toFixed(2)}%)
            {stock.change && stock.change >= 0 ? "⬆︎" : "⬇︎"}Today
          </span>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300">
          {stock.companyName}
        </p>

        <p className="text-lg font-semibold text-slate-900 dark:text-white">
          ${stock.currentPrice?.toFixed(2)}
        </p>

        <div className="flex-1 min-h-[50px] flex items-center justify-center my-1 pointer-events-none cursor-crosshair">
          {stock.priceHistory.length > 0 ? (
            <LineChart
              key={`${stock.symbol}-${isSelected}-${forceUpdate}`}
              data={stock.priceHistory}
              width={chartWidth}
              height={150}
              symbol={stock.symbol}
              mini={true}
              isLoading={isGlobalLoading}
            />
          ) : (
            <div className="text-xs text-slate-600 dark:text-slate-300 text-center">
              Loading chart data...
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(stock.symbol);
          }}
          className=" text-red-700 dark:text-red-500 hover:underline text-md cursor-pointer self-start focus:outline-none focus:ring-2 focus:ring-red-400 dark:focus:ring-offset-slate-900 focus:ring-offset-2 rounded px-3 py-2 transition min-h-[44px] "
          aria-label={`Remove ${stock.symbol} from watchlist`}
        >
          Remove
        </button>
      </div>
    </button>
  );
}

export default StockCard;
