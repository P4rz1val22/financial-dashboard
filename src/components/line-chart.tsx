// components/line-chart.tsx

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { LineChartProps } from "@/types";

export const LineChart = ({
  data,
  width = 400,
  height = 200,
  mini = false,
  symbol,
  isLoading = false,
}: LineChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [themeKey, setThemeKey] = useState(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = () => setThemeKey((prev) => prev + 1);

    mediaQuery.addEventListener("change", handleThemeChange);
    return () => mediaQuery.removeEventListener("change", handleThemeChange);
  }, []);
  useEffect(() => {
    if (!data || data.length === 0 || isLoading) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = mini
      ? { top: 5, right: 10, bottom: 15, left: 40 }
      : { top: 20, right: 30, bottom: 30, left: 55 };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create main group
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Set up scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.timestamp) as [Date, Date])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.price) as [number, number])
      .nice()
      .range([innerHeight, 0]);

    const line = d3
      .line<(typeof data)[0]>()
      .x((d) => xScale(d.timestamp))
      .y((d) => yScale(d.price))
      .curve(d3.curveMonotoneX);

    const firstPrice = data[0]?.price || 0;
    const lastPrice = data[data.length - 1]?.price || 0;
    const isPositive = lastPrice >= firstPrice;
    const lineColor = isPositive ? "#10b981" : "#ef4444";

    const gradient = g
      .append("defs")
      .append("linearGradient")
      .attr("id", `gradient-${symbol}`)
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", innerHeight);

    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", lineColor)
      .attr("stop-opacity", 0.3);

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", lineColor)
      .attr("stop-opacity", 0.05);

    const area = d3
      .area<(typeof data)[0]>()
      .x((d) => xScale(d.timestamp))
      .y0(innerHeight)
      .y1((d) => yScale(d.price))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(data)
      .attr("fill", `url(#gradient-${symbol})`)
      .attr("d", area);

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", lineColor)
      .attr("stroke-width", mini ? 1.5 : 2)
      .attr("d", line);

    // Check if dark mode is active
    const isDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const textColor = isDarkMode ? "#e2e8f0" : "#6b7280"; // slate-200 : gray-500
    const gridColor = isDarkMode ? "#475569" : "#d1d5db"; // slate-600 : gray-300

    if (!mini) {
      g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(
          d3
            .axisBottom(xScale)
            .tickFormat(d3.timeFormat("%H:%M") as any)
            .ticks(8)
        )
        .selectAll("text")
        .style("font-size", "12px")
        .style("fill", textColor);

      g.append("g")
        .call(d3.axisLeft(yScale).tickFormat(d3.format("$.2f")).ticks(6))
        .selectAll("text")
        .style("font-size", "12px")
        .style("fill", textColor);

      g.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(
          d3
            .axisBottom(xScale)
            .tickSize(-innerHeight)
            .tickFormat(() => "")
            .ticks(6)
        )
        .style("stroke", gridColor)
        .style("stroke-dasharray", "2,2")
        .style("opacity", 0.3);

      g.append("g")
        .attr("class", "grid")
        .call(
          d3
            .axisLeft(yScale)
            .tickSize(-innerWidth)
            .tickFormat(() => "")
            .ticks(6)
        )
        .style("stroke", gridColor)
        .style("stroke-dasharray", "2,2")
        .style("opacity", 0.3);
    } else {
      g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(
          d3
            .axisBottom(xScale)
            .tickFormat(d3.timeFormat("%H:%M") as any)
            .ticks(5)
        )
        .selectAll("text")
        .style("font-size", "8px")
        .style("fill", textColor);

      g.append("g")
        .call(d3.axisLeft(yScale).tickFormat(d3.format("$,.2f")).ticks(3))
        .selectAll("text")
        .style("font-size", "8px")
        .style("fill", textColor);

      g.selectAll(".domain")
        .style("stroke", gridColor)
        .style("stroke-width", "1px");

      g.selectAll(".tick line")
        .style("stroke", gridColor)
        .style("stroke-width", "1px");
    }

    if (mini) {
      g.selectAll(".dot")
        .data(data.slice(-10))
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", (d) => xScale(d.timestamp))
        .attr("cy", (d) => yScale(d.price))
        .attr("r", 1.5)
        .attr("fill", lineColor)
        .attr("opacity", 0.7);
    }

    if (!mini && data.length > 0) {
      const latestPoint = data[data.length - 1];
      const pulseCircle = g
        .append("circle")
        .attr("cx", xScale(latestPoint.timestamp))
        .attr("cy", yScale(latestPoint.price))
        .attr("r", 0)
        .attr("fill", lineColor)
        .attr("opacity", 0.6);

      pulseCircle
        .transition()
        .duration(1000)
        .ease(d3.easeCircleOut)
        .attr("r", 8)
        .attr("opacity", 0)
        .remove();
    }

    // ===== TOOLTIP FUNCTIONALITY =====

    d3.selectAll(`.chart-tooltip-${symbol}`).remove();

    // Dark mode aware tooltip styling
    const tooltipBg = isDarkMode ? "#1d293d" : "white"; // gray-700 : white
    const tooltipBorder = isDarkMode ? "#4b5563" : "#e5e7eb"; // gray-600 : gray-200
    const tooltipText = isDarkMode ? "#f8fafc" : "#1f2937"; // slate-50 : gray-800

    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", `chart-tooltip chart-tooltip-${symbol}`)
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", tooltipBg)
      .style("border", `1px solid ${tooltipBorder}`)
      .style("border-radius", "8px")
      .style("padding", "12px")
      .style(
        "box-shadow",
        isDarkMode
          ? "0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)"
          : "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
      )
      .style("font-size", "12px")
      .style("font-family", "system-ui, -apple-system, sans-serif")
      .style("z-index", "9999")
      .style("pointer-events", "none")
      .style("max-width", "250px")
      .style("color", tooltipText);

    const overlay = g
      .append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .style("fill", "none")
      .style("pointer-events", "all");

    // Add vertical line for hover indicator
    const hoverLine = g
      .append("line")
      .attr("stroke", textColor)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .attr("opacity", 0)
      .style("pointer-events", "none");

    const hoverCircle = g
      .append("circle")
      .attr("r", 4)
      .attr("fill", lineColor)
      .attr("stroke", isDarkMode ? "#1e293b" : "white") // slate-800 : white
      .attr("stroke-width", 2)
      .attr("opacity", 0)
      .style("pointer-events", "none");

    const bisect = d3.bisector((d: any) => d.timestamp).left;

    overlay.on("mousemove", function (event) {
      const [mouseX] = d3.pointer(event, this);
      const x0 = xScale.invert(mouseX);
      const i = bisect(data, x0, 1);
      const d0 = data[i - 1];
      const d1 = data[i];

      const d =
        d1 &&
        x0.getTime() - d0.timestamp.getTime() >
          d1.timestamp.getTime() - x0.getTime()
          ? d1
          : d0;

      if (d) {
        const xPos = mouseX;
        const yPos = yScale(d.price);

        hoverLine
          .attr("x1", xPos)
          .attr("x2", xPos)
          .attr("y1", 0)
          .attr("y2", innerHeight)
          .attr("opacity", 0.6);

        hoverCircle
          .attr("cx", xScale(d.timestamp))
          .attr("cy", yPos)
          .attr("opacity", 1);

        const prevPoint = data[Math.max(0, data.indexOf(d) - 1)];
        const priceChange = prevPoint ? d.price - prevPoint.price : 0;
        const priceChangePercent = prevPoint
          ? ((d.price - prevPoint.price) / prevPoint.price) * 100
          : 0;

        const tooltipContent = `
          <div style="font-weight: bold; margin-bottom: 4px; font-size:16px; color: ${tooltipText};">${symbol}</div>
          <div style="margin-bottom: 4px; font-weight:500; font-size:14px; color: ${tooltipText};">${d.price.toFixed(
          2
        )} USD
          </div>
          <div style="margin-bottom: 4px; color: ${tooltipText};">
            <span style="font-weight: 500;">Time:</span> ${d.timestamp.toLocaleTimeString(
              [],
              { hour: "2-digit", minute: "2-digit" }
            )}
          </div>
          <div style="margin-bottom: 4px; color: ${tooltipText};">
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
  }, [data, width, height, mini, symbol, isLoading, themeKey]);

  useEffect(() => {
    return () => {
      d3.selectAll(`.chart-tooltip-${symbol}`).remove();
    };
  }, [symbol]);

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
        className="flex items-center justify-center bg-slate-50 dark:bg-slate-700 rounded text-slate-500 dark:text-slate-400 text-sm transition-colors duration-200"
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
