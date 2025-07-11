import { useEffect, useRef, useState } from "react";
import { DetailedStockModalProps } from "@/types";
import { LineChart } from "@/components/line-chart";
import { X } from "lucide-react";

export const DetailedStockModal = ({
  stock,
  onClose,
  isLoading,
}: DetailedStockModalProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(790);

  // Update chart width on resize
  useEffect(() => {
    const updateChartWidth = () => {
      if (chartContainerRef.current) {
        const containerWidth = chartContainerRef.current.offsetWidth;
        // Subtract padding (32px total: 16px each side from p-4)
        setChartWidth(Math.max(300, containerWidth - 36));
      }
    };

    updateChartWidth();
    window.addEventListener("resize", updateChartWidth);
    return () => window.removeEventListener("resize", updateChartWidth);
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-200 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center shadow-md h-25 p-6 justify-between bg-white">
          <div className="flex flex-row gap-2">
            <div className=" h-full flex flex-col justify-center">
              <h2 className="text-2xl font-bold">{stock.symbol}</h2>
              <p className="text-gray-600">{stock.companyName}</p>
            </div>
            <div className="text-left h-full flex flex-col justify-center">
              <h2 className="text-2xl font-bold">
                ${stock.currentPrice?.toFixed(2)}
              </h2>
              <p
                className={` ${
                  stock.change && stock.change >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {stock.change && stock.change >= 0 ? "⬆︎" : "⬇︎"}
                {stock.change?.toFixed(2)} ({stock.changePercent?.toFixed(2)}%)
                Today
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="mb-14 -mr-4.5 p-2 hover:bg-gray-100 rounded-sm transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6 ">
          <div
            className="border-1 border-gray-200 rounded-lg p-4 shadow-md bg-white"
            ref={chartContainerRef}
          >
            {stock.priceHistory.length > 0 ? (
              <div className="bg-white rounded p-4 cursor-crosshair">
                <LineChart
                  data={stock.priceHistory}
                  width={chartWidth}
                  height={300}
                  symbol={stock.symbol}
                  mini={false}
                  isLoading={isLoading}
                />
              </div>
            ) : (
              <div className="bg-white rounded p-4 flex items-center justify-center h-64">
                <div className="text-gray-500">No chart data available</div>
              </div>
            )}
          </div>

          {/* Stock Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white shadow-md rounded-lg p-4">
              <h4 className="font-semibold mb-2">Daily Range</h4>
              <p className="text-sm text-gray-600">
                Low: ${stock.dayLow?.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">
                High: ${stock.dayHigh?.toFixed(2)}
              </p>
            </div>

            <div className="bg-white shadow-md rounded-lg p-4">
              <h4 className="font-semibold mb-2">Opening Info</h4>
              <p className="text-sm text-gray-600">
                Open: ${stock.dayOpen?.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">
                Prev Close: ${stock.previousClose?.toFixed(2)}
              </p>
            </div>

            <div className="bg-white shadow-md rounded-lg p-4">
              <h4 className="font-semibold  mb-2">Session Tracking</h4>
              <p className="text-sm text-gray-600">
                Started:{" "}
                {stock.priceHistory.length > 0
                  ? formatTime(stock.priceHistory[0].timestamp)
                  : "N/A"}
              </p>
              <p className="text-sm text-gray-600">
                Updated: {formatTime(stock.lastUpdated)}
              </p>
            </div>
          </div>

          {/* Price History Table */}
          {stock.priceHistory.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 shadow-md">
              <h3 className="text-lg font-semibold mb-4">
                Recent Price History
              </h3>
              <div className="bg-white rounded border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 font-semibold">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                        Time
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                        Price
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                        Change
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                        Change %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stock.priceHistory
                      .slice(-10)
                      .reverse()
                      .map((point, index) => (
                        <tr key={index} className="border-t border-gray-200">
                          <td className="px-4 py-2 text-sm">
                            {formatDate(point.timestamp)}
                          </td>
                          <td className="px-4 py-2 text-sm font-medium">
                            ${point.price.toFixed(2)}
                          </td>
                          <td
                            className={`px-4 py-2 text-sm ${
                              point.change >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {point.change > 0 ? "+" : ""}
                            {point.change.toFixed(2)}
                          </td>
                          <td
                            className={`px-4 py-2 text-sm ${
                              point.changePercent >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {point.changePercent > 0 ? "+" : ""}
                            {point.changePercent.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
