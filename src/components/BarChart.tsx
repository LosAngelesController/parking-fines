import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface DataPoint {
  label: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  width: number;
  height: number;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

const BarChart: React.FC<Props> = ({
  data,
  width,
  height,
  margin = { top: 20, right: 20, bottom: 20, left: 20 },
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedBar, setSelectedBar] = useState<DataPoint | null>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);

    // Define scales and axis
    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.label))
      .range([margin.left, width - margin.right])
      .padding(0.1);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value) ?? 0])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    // Render axis
    svg.select<SVGGElement>(".x-axis")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(xAxis);

    svg.select<SVGGElement>(".y-axis")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(yAxis);

    // Render bars
    svg.selectAll<SVGRectElement, DataPoint>(".bar")
      .data(data)
      .join("rect")
      .attr("class", "bar")
      .attr("x", (d) => xScale(d.label) ?? 0)
      .attr("y", (d) => yScale(d.value))
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => yScale(0) - yScale(d.value))
      .attr("fill", (d) => (d === selectedBar ? "red" : "steelblue"))
      .on("click", (event, d) => setSelectedBar(d));
  }, [data, height, margin, selectedBar, width]);

  return (
    <svg className="bar-chart" ref={svgRef} width={width} height={height}>
      <g className="x-axis" />
      <g className="y-axis" />
    </svg>
  );
};

export default BarChart;
