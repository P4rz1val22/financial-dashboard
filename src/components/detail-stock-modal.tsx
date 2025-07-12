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
        setChartWidth(containerWidth - 36);
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
        className="bg-slate-200 dark:bg-black dark:border-slate-900 dark:border rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transition-colors duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center shadow-md h-25 p-6 justify-between bg-white dark:bg-slate-900 transition-colors duration-200">
          <div className="flex flex-row gap-2">
            <div className=" h-full flex flex-col justify-center">
              <h2
                className="text-2xl font-bold text-slate-900 dark:text-white"
                id="modal-title"
              >
                {stock.symbol}
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                {stock.companyName}
              </p>
            </div>
            <div className="text-left h-full flex flex-col justify-center">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                ${stock.currentPrice?.toFixed(2)}
              </h2>
              <p
                className={` ${
                  stock.change && stock.change >= 0
                    ? "text-green-600 dark:text-green-500"
                    : "text-red-600 dark:text-red-500"
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
            aria-label="Close stock details modal"
            className="mb-14 -mr-4.5 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-sm transition-colors duration-200 cursor-pointer text-slate-700 dark:text-slate-300"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6 ">
          <div
            className=" dark:border-slate-700 rounded-lg p-4 shadow-md bg-white dark:bg-slate-900 transition-colors duration-200"
            ref={chartContainerRef}
          >
            {stock.priceHistory.length > 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded p-4 cursor-crosshair transition-colors duration-200">
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
              <div className="bg-white dark:bg-slate-900 rounded p-4 flex items-center justify-center h-64 transition-colors duration-200">
                <div className="text-slate-600 dark:text-slate-300">
                  No chart data available
                </div>
              </div>
            )}
          </div>

          {/* Stock Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 shadow-md rounded-lg p-4 transition-colors duration-200">
              <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">
                Daily Range
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Low: ${stock.dayLow?.toFixed(2)}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                High: ${stock.dayHigh?.toFixed(2)}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 shadow-md rounded-lg p-4 transition-colors duration-200">
              <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">
                Opening Info
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Open: ${stock.dayOpen?.toFixed(2)}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Prev Close: ${stock.previousClose?.toFixed(2)}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 shadow-md rounded-lg p-4 transition-colors duration-200">
              <h3 className="font-semibold  mb-2 text-slate-900 dark:text-white">
                Session Tracking
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Started:{" "}
                {stock.priceHistory.length > 0
                  ? formatTime(stock.priceHistory[0].timestamp)
                  : "N/A"}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Updated: {formatTime(stock.lastUpdated)}
              </p>
            </div>
          </div>

          {/* Price History Table */}
          {stock.priceHistory.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 shadow-md transition-colors duration-200">
              <h3 className="text-lg font-semibold mb-4 text-slate-900  dark:text-white">
                Recent Price History
              </h3>
              <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 overflow-scroll transition-colors duration-200">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 font-semibold transition-colors duration-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-slate-600 dark:text-slate-300">
                        Time
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-slate-600 dark:text-slate-300">
                        Price
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-slate-600 dark:text-slate-300">
                        Change
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-slate-600 dark:text-slate-300">
                        Change %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stock.priceHistory
                      .slice(-10)
                      .reverse()
                      .map((point, index) => {
                        // Calculate change from previous point (same logic as tooltip)
                        const currentIndex =
                          stock.priceHistory.length - 1 - index;
                        const prevPoint =
                          stock.priceHistory[Math.max(0, currentIndex - 1)];
                        const pointToPointChange = prevPoint
                          ? point.price - prevPoint.price
                          : 0;
                        const pointToPointChangePercent = prevPoint
                          ? ((point.price - prevPoint.price) /
                              prevPoint.price) *
                            100
                          : 0;

                        return (
                          <tr
                            key={index}
                            className="border-t border-slate-200 dark:border-slate-700 transition-colors duration-200"
                          >
                            <td className="px-4 py-2 text-sm text-slate-900 dark:text-slate-300">
                              {formatDate(point.timestamp)}
                            </td>
                            <td className="px-4 py-2 text-sm font-medium text-slate-900 dark:text-white">
                              ${point.price.toFixed(2)}
                            </td>
                            <td
                              className={`px-4 py-2 text-sm ${
                                pointToPointChange >= 0
                                  ? "text-green-600"
                                  : "text-red-600 "
                              }`}
                            >
                              {pointToPointChange > 0 ? "+" : ""}
                              {pointToPointChange.toFixed(2)}
                            </td>
                            <td
                              className={`px-4 py-2 text-sm ${
                                pointToPointChangePercent >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {pointToPointChangePercent > 0 ? "+" : ""}
                              {pointToPointChangePercent.toFixed(2)}%
                            </td>
                          </tr>
                        );
                      })}
                    <tr className="border-t-1 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 font-semibold transition-colors duration-200">
                      <td className="px-4 py-2 text-sm text-slate-900 dark:text-white">
                        Today
                      </td>
                      <td className="px-4 py-2 text-sm font-bold text-slate-900 dark:text-white">
                        ${stock.currentPrice?.toFixed(2)}
                      </td>
                      <td
                        className={`px-4 py-2 text-sm font-bold ${
                          (stock.change ?? 0) >= 0
                            ? "text-green-600 dark:text-green-500"
                            : "text-red-600 dark:text-red-500"
                        }`}
                      >
                        {(stock.change ?? 0) >= 0 ? "+" : ""}
                        {stock.change?.toFixed(2)}
                      </td>
                      <td
                        className={`px-4 py-2 text-sm font-bold ${
                          (stock.changePercent ?? 0) >= 0
                            ? "text-green-600 dark:text-green-500"
                            : "text-red-600 dark:text-red-500"
                        }`}
                      >
                        {(stock.changePercent ?? 0) >= 0 ? "+" : ""}
                        {stock.changePercent?.toFixed(2)}%
                      </td>
                    </tr>
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
