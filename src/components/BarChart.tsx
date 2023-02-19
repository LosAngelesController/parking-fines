import React, { useRef, useEffect } from "react";
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
  margin = { top: 20, right: 20, bottom: 20, left: 40 },
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Set up chart dimensions
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  useEffect(() => {
    const svg = d3.select(svgRef.current);

    // Define scales and axis
    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.label))
      .range([0, innerWidth])
      .padding(0.1);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value) ?? 0])
      .nice()
      .range([innerHeight, 0]);

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    // Render axis
    svg
      .select<SVGGElement>(".x-axis")
      .attr(
        "transform",
        `translate(${margin.left},${innerHeight + margin.top})`
      )
      .call(xAxis);

    svg.select<SVGGElement>(".y-axis").call(yAxis);

    // Render bars
    const bars = svg
      .select<SVGGElement>(".bars")
      .selectAll<SVGRectElement, DataPoint>(".bar")
      .data(data);

    bars
      .enter()
      .append("rect")
      .attr("class", "bar")
      .merge(bars)
      .attr("x", (d) => xScale(d.label) ?? 0)
      .attr("y", (d) => yScale(d.value))
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => innerHeight - yScale(d.value))
      .attr("fill", (d) => (d.value >= 50 ? "green" : "red"))
      .on(
        "mouseover",
        function (this: SVGRectElement, event: MouseEvent, d: DataPoint) {
          d3.select(this).attr("fill", "orange");
        }
      )
      .on("mouseout", function (this: SVGRectElement, d: DataPoint) {
        d3.select(this).attr("fill", d.value >= 50 ? "green" : "red");
      });

    bars.exit().remove();
  }, [data, height, margin, width]);

  return (
    <svg className="bar-chart" ref={svgRef} width={width} height={height}>
      <g
        className="x-axis"
        transform={`translate(${margin.left},${innerHeight})`}
      />

      <g
        className="y-axis"
        transform={`translate(${margin.left},${margin.top})`}
      />
      <g
        className="bars"
        transform={`translate(${margin.left},${margin.top})`}
      />
    </svg>
  );
};

export default BarChart;
