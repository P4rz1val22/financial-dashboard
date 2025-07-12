import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as d3 from "d3";
import { LineChartProps } from "@/types";

/**
 * Renders an interactive line chart using D3.js for financial data visualization.
 *
 * @param data - Array of data points containing price, timestamp, and change information.
 * @param width - Width of the chart in pixels. Defaults to 400.
 * @param height - Height of the chart in pixels. Defaults to 200.
 * @param mini - If true, renders a compact version of the chart.
 * @param symbol - The financial symbol (e.g., stock ticker) to display in tooltips.
 * @param isLoading - If true, displays a loading spinner instead of the chart.
 *
 * @returns A React component rendering the SVG chart or a loading/empty state.
 *
 */
export const LineChart = ({
  data,
  width = 400,
  height = 200,
  mini = false,
  symbol,
  isLoading = false,
}: LineChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  const handleThemeChange = useCallback((e: MediaQueryListEvent) => {
    setIsDarkMode(e.matches);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", handleThemeChange);
    return () => mediaQuery.removeEventListener("change", handleThemeChange);
  }, [handleThemeChange]);

  const theme = useMemo(
    () => ({
      textColor: isDarkMode ? "#e2e8f0" : "#6b7280",
      gridColor: isDarkMode ? "#475569" : "#d1d5db",
      tooltipBg: isDarkMode ? "#1d293d" : "white",
      tooltipBorder: isDarkMode ? "#4b5563" : "#e5e7eb",
      tooltipText: isDarkMode ? "#f8fafc" : "#1f2937",
      circleStroke: isDarkMode ? "#1e293b" : "white",
      boxShadow: isDarkMode
        ? "0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)"
        : "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    }),
    [isDarkMode]
  );

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const firstPrice = data[0]?.price || 0;
    const lastPrice = data[data.length - 1]?.price || 0;
    const isPositive = lastPrice >= firstPrice;
    const lineColor = isPositive ? "#10b981" : "#ef4444";

    return {
      data,
      lineColor,
      isPositive,
      xDomain: d3.extent(data, (d) => d.timestamp) as [Date, Date],
      yDomain: d3.extent(data, (d) => d.price) as [number, number],
    };
  }, [data]);

  const margin = useMemo(
    () =>
      mini
        ? { top: 5, right: 10, bottom: 15, left: 40 }
        : { top: 20, right: 30, bottom: 30, left: 55 },
    [mini]
  );

  const dimensions = useMemo(
    () => ({
      innerWidth: width - margin.left - margin.right,
      innerHeight: height - margin.top - margin.bottom,
    }),
    [width, height, margin]
  );

  const scales = useMemo(() => {
    if (!chartData) return null;

    const xScale = d3
      .scaleTime()
      .domain(chartData.xDomain)
      .range([0, dimensions.innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain(chartData.yDomain)
      .nice()
      .range([dimensions.innerHeight, 0]);

    return { xScale, yScale };
  }, [chartData, dimensions]);

  const pathGenerators = useMemo(() => {
    if (!scales) return null;

    const line = d3
      .line<(typeof data)[0]>()
      .x((d) => scales.xScale(d.timestamp))
      .y((d) => scales.yScale(d.price))
      .curve(d3.curveMonotoneX);

    const area = d3
      .area<(typeof data)[0]>()
      .x((d) => scales.xScale(d.timestamp))
      .y0(dimensions.innerHeight)
      .y1((d) => scales.yScale(d.price))
      .curve(d3.curveMonotoneX);

    return { line, area };
  }, [scales, dimensions, data]);

  const cleanupTooltips = useCallback(() => {
    d3.selectAll(`.chart-tooltip-${symbol}`).remove();
  }, [symbol]);

  useEffect(() => {
    if (!chartData || !scales || !pathGenerators || isLoading) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const gradient = g
      .append("defs")
      .append("linearGradient")
      .attr("id", `gradient-${symbol}`)
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", dimensions.innerHeight);

    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", chartData.lineColor)
      .attr("stop-opacity", 0.3);

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", chartData.lineColor)
      .attr("stop-opacity", 0.05);

    g.append("path")
      .datum(chartData.data)
      .attr("fill", `url(#gradient-${symbol})`)
      .attr("d", pathGenerators.area);

    g.append("path")
      .datum(chartData.data)
      .attr("fill", "none")
      .attr("stroke", chartData.lineColor)
      .attr("stroke-width", mini ? 1.5 : 2)
      .attr("d", pathGenerators.line);

    if (!mini) {
      g.append("g")
        .attr("transform", `translate(0,${dimensions.innerHeight})`)
        .call(
          d3
            .axisBottom(scales.xScale)
            .tickFormat(d3.timeFormat("%H:%M") as any)
            .ticks(8)
        )
        .selectAll("text")
        .style("font-size", "12px")
        .style("fill", theme.textColor);

      g.append("g")
        .call(d3.axisLeft(scales.yScale).tickFormat(d3.format("$.2f")).ticks(6))
        .selectAll("text")
        .style("font-size", "12px")
        .style("fill", theme.textColor);

      const gridGroup = g.append("g").attr("class", "grid-group");

      gridGroup
        .append("g")
        .attr("transform", `translate(0,${dimensions.innerHeight})`)
        .call(
          d3
            .axisBottom(scales.xScale)
            .tickSize(-dimensions.innerHeight)
            .tickFormat(() => "")
            .ticks(6)
        )
        .style("stroke", theme.gridColor)
        .style("stroke-dasharray", "2,2")
        .style("opacity", 0.3);

      gridGroup
        .append("g")
        .call(
          d3
            .axisLeft(scales.yScale)
            .tickSize(-dimensions.innerWidth)
            .tickFormat(() => "")
            .ticks(6)
        )
        .style("stroke", theme.gridColor)
        .style("stroke-dasharray", "2,2")
        .style("opacity", 0.3);
    } else {
      g.append("g")
        .attr("transform", `translate(0,${dimensions.innerHeight})`)
        .call(
          d3
            .axisBottom(scales.xScale)
            .tickFormat(d3.timeFormat("%H:%M") as any)
            .ticks(5)
        )
        .selectAll("text")
        .style("font-size", "8px")
        .style("fill", theme.textColor);

      g.append("g")
        .call(
          d3.axisLeft(scales.yScale).tickFormat(d3.format("$,.2f")).ticks(3)
        )
        .selectAll("text")
        .style("font-size", "8px")
        .style("fill", theme.textColor);

      g.selectAll(".domain")
        .style("stroke", theme.gridColor)
        .style("stroke-width", "1px");

      g.selectAll(".tick line")
        .style("stroke", theme.gridColor)
        .style("stroke-width", "1px");

      g.selectAll(".dot")
        .data(chartData.data.slice(-10))
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", (d) => scales.xScale(d.timestamp))
        .attr("cy", (d) => scales.yScale(d.price))
        .attr("r", 1.5)
        .attr("fill", chartData.lineColor)
        .attr("opacity", 0.7);
    }

    if (!mini && chartData.data.length > 0) {
      const latestPoint = chartData.data[chartData.data.length - 1];
      const pulseCircle = g
        .append("circle")
        .attr("cx", scales.xScale(latestPoint.timestamp))
        .attr("cy", scales.yScale(latestPoint.price))
        .attr("r", 0)
        .attr("fill", chartData.lineColor)
        .attr("opacity", 0.6);

      pulseCircle
        .transition()
        .duration(1000)
        .ease(d3.easeCircleOut)
        .attr("r", 8)
        .attr("opacity", 0)
        .remove();
    }

    cleanupTooltips();

    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", `chart-tooltip chart-tooltip-${symbol}`)
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", theme.tooltipBg)
      .style("border", `1px solid ${theme.tooltipBorder}`)
      .style("border-radius", "8px")
      .style("padding", "12px")
      .style("box-shadow", theme.boxShadow)
      .style("font-size", "12px")
      .style("font-family", "system-ui, -apple-system, sans-serif")
      .style("z-index", "9999")
      .style("pointer-events", "none")
      .style("max-width", "250px")
      .style("color", theme.tooltipText);

    const overlay = g
      .append("rect")
      .attr("width", dimensions.innerWidth)
      .attr("height", dimensions.innerHeight)
      .style("fill", "none")
      .style("pointer-events", "all");

    const hoverLine = g
      .append("line")
      .attr("stroke", theme.textColor)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .attr("opacity", 0)
      .style("pointer-events", "none");

    const hoverCircle = g
      .append("circle")
      .attr("r", 4)
      .attr("fill", chartData.lineColor)
      .attr("stroke", theme.circleStroke)
      .attr("stroke-width", 2)
      .attr("opacity", 0)
      .style("pointer-events", "none");

    const bisect = d3.bisector((d: any) => d.timestamp).left;

    overlay.on("mousemove", function (event) {
      const [mouseX] = d3.pointer(event, this);
      const x0 = scales.xScale.invert(mouseX);
      const i = bisect(chartData.data, x0, 1);
      const d0 = chartData.data[i - 1];
      const d1 = chartData.data[i];

      const d =
        d1 &&
        x0.getTime() - d0.timestamp.getTime() >
          d1.timestamp.getTime() - x0.getTime()
          ? d1
          : d0;

      if (d) {
        const xPos = mouseX;
        const yPos = scales.yScale(d.price);

        hoverLine
          .attr("x1", xPos)
          .attr("x2", xPos)
          .attr("y1", 0)
          .attr("y2", dimensions.innerHeight)
          .attr("opacity", 0.6);

        hoverCircle
          .attr("cx", scales.xScale(d.timestamp))
          .attr("cy", yPos)
          .attr("opacity", 1);

        const prevPoint =
          chartData.data[Math.max(0, chartData.data.indexOf(d) - 1)];
        const priceChange = prevPoint ? d.price - prevPoint.price : 0;
        const priceChangePercent = prevPoint
          ? ((d.price - prevPoint.price) / prevPoint.price) * 100
          : 0;

        const tooltipContent = `
          <div style="font-weight: bold; margin-bottom: 4px; font-size:16px; color: ${
            theme.tooltipText
          };">${symbol}</div>
          <div style="margin-bottom: 4px; font-weight:500; font-size:14px; color: ${
            theme.tooltipText
          };">${d.price.toFixed(2)} USD</div>
          <div style="margin-bottom: 4px; color: ${theme.tooltipText};">
            <span style="font-weight: 500;">Time:</span> ${d.timestamp.toLocaleTimeString(
              [],
              { hour: "2-digit", minute: "2-digit" }
            )}
          </div>
          <div style="margin-bottom: 4px; color: ${theme.tooltipText};">
            <span style="font-weight: 500;">Date:</span> ${d.timestamp.toLocaleDateString()}
          </div>
          <div style="margin-bottom: 4px; color: ${
            d.change >= 0 ? "#10b981" : "#ef4444"
          };">
            <span style="font-weight: 500;">Daily Change:</span> ${
              d.change >= 0 ? "+" : ""
            }$${d.change.toFixed(2)} (${
          d.changePercent >= 0 ? "+" : ""
        }${d.changePercent.toFixed(2)}%)
          </div>
          <div style="margin-bottom: 4px; color: ${
            priceChange >= 0 ? "#10b981" : "#ef4444"
          };">
            <span style="font-weight: 500;">From Previous:</span> ${
              priceChange >= 0 ? "+" : ""
            }$${priceChange.toFixed(2)} (${
          priceChangePercent >= 0 ? "+" : ""
        }${priceChangePercent.toFixed(2)}%)
          </div>
        `;

        const svgRect = svgRef.current!.getBoundingClientRect();
        const mouseXRelativeToSVG = event.offsetX || event.layerX;
        const tooltipX = Math.max(
          10,
          Math.min(
            svgRect.left + mouseXRelativeToSVG - 100,
            window.innerWidth - 210
          )
        );
        let tooltipY = svgRect.top + 50;
        if (mini) {
          tooltipY = svgRect.top;
        }

        tooltip
          .style("visibility", "visible")
          .style("left", tooltipX + "px")
          .style("top", tooltipY - 140 + "px")
          .html(tooltipContent);
      }
    });

    overlay.on("mouseleave", function () {
      tooltip.style("visibility", "hidden");
      hoverLine.attr("opacity", 0);
      hoverCircle.attr("opacity", 0);
    });

    return cleanupTooltips;
  }, [
    chartData,
    scales,
    pathGenerators,
    isLoading,
    margin,
    dimensions,
    theme,
    mini,
    symbol,
    cleanupTooltips,
  ]);

  useEffect(() => {
    return cleanupTooltips;
  }, [cleanupTooltips]);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center bg-slate-50 dark:bg-slate-700 rounded transition-colors duration-200"
        style={{ width, height }}
      >
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-slate-50 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 text-sm transition-colors duration-200"
        style={{ width, height }}
      >
        No chart data
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="rounded bg-white dark:bg-slate-900 transition-colors duration-200"
    />
  );
};
