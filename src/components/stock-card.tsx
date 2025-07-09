// Try importing something that definitely exists
import { CardProps } from "@/types";

function StockCard(props: Readonly<CardProps>) {
  const { stock, onRemove, onSelect, onRetry, isSelected } = props;

  if (stock.isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 transition cursor-pointer h-70 overflow-auto">
        <div className="flex flex-row items-center gap-1">
          <h2>{stock.symbol}</h2>
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  const formatErrorMessage = (error: string) => {
    // Extract the message after the second colon
    const parts = error.split(": ");
    if (parts.length >= 2) {
      return parts.slice(1).join(": "); // Join everything after the first colon
    }
    return error; // Fallback to original if parsing fails
  };

  if (stock.error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 transition h-70 overflow-auto border-l-4 border-red-500">
        <div className="flex flex-col gap-2 justify-between h-full">
          <div>
            <h2 className="font-bold text-red-600">{stock.symbol}</h2>
            <p className="text-sm text-red-500">
              Failed to load – {formatErrorMessage(stock.error)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onRetry(stock.symbol)}
              className="bg-white border-gray-300 border-1 hover:text-blue-500 p-2 cursor-pointer rounded-md text-md hover:border-blue-500 transition"
            >
              Retry
            </button>
            <button
              onClick={() => onRemove(stock.symbol)}
              className="bg-white border-gray-300 border-1 hover:text-red-500 p-2 cursor-pointer rounded-md text-md hover:border-red-500 transition"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-4 transition cursor-pointer h-70 overflow-auto ${
        isSelected ? "ring-2 ring-blue-500" : ""
      }`}
      onClick={() => {
        onSelect(stock);
      }}
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-row items-center gap-2">
          <h2 className="font-bold">{stock.symbol}</h2>
          <h4
            className={`${
              stock.change && stock.change >= 0
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {stock.change?.toFixed(2)} ({stock.changePercent?.toFixed(2)}%)
          </h4>
        </div>
        <p className="text-sm text-gray-600">{stock.companyName}</p>
        <p className="text-lg font-semibold">
          ${stock.currentPrice?.toFixed(2)}
        </p>
      </div>
      <button
        onClick={() => onRemove(stock.symbol)}
        className="text-red-500 hover:text-red-700 text-sm cursor-pointer"
      >
        Remove
      </button>
    </div>
  );
}

export default StockCard;
