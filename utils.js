"use strict";

///////////////
// GEO TOOLS //
///////////////

// used for choropleth
function areasize(feature, path) {
	// Find the size of the largest polygon in sq px
	// Source: https://observablehq.com/d/47c257e62a34b61d
	const geometry = feature.geometry;
	if (geometry.type === "Polygon") {
		return path.area(feature);
	} else {
		let largestPolygon = {},
			largestArea = 0;
		geometry.coordinates.forEach((coordinates) => {
			const polygon = { type: "Polygon", coordinates },
				area = path.area(polygon);
			if (area > largestArea) {
				largestPolygon = polygon;
				largestArea = area;
			}
		});
		return path.area(largestPolygon);
	}
}

// Centroid of features, to place circles at
// from https://observablehq.com/@harrystevens/dorling-cartogram
// Find the centroid of the largest polygon
const centroid = (feature) => {
	const geometry = feature.geometry;
	if (geometry.type === "Polygon") {
		return d3.geoCentroid(feature);
	} else {
		let largestPolygon = {},
			largestArea = 0;
		geometry.coordinates.forEach((coordinates) => {
			const polygon = { type: "Polygon", coordinates },
				area = d3.geoArea(polygon);
			if (area > largestArea) {
				largestPolygon = polygon;
				largestArea = area;
			}
		});
		return d3.geoCentroid(largestPolygon);
	}
};

/////////////
// LEGENDS //
/////////////

// used for hex map, choropleth
function drawLegend(sel, colors, labels, title) {
	let legend = sel;
	legend.style("font-size", "12px");

	let item = legend
		.selectAll("g")
		.data(colors)
		.enter()
		.append("g")
		.attr("transform", (d, i) => `translate(0,${i * 18})`);

	item.append("rect")
		.attr("width", 16)
		.attr("height", 16)
		.attr("fill", (d) => d);
	item.append("text")
		.attr("x", 20)
		.attr("y", 12)
		.text((d, i) => labels[i]);

	legend
		.append("text")
		.text(title)
		.attr("font-weight", "bold")
		.attr("font-size", "14px")
		.attr("y", -5);
}

// Circle Legend
// from https://observablehq.com/@harrystevens/circle-legend
const legendCircle = function (context) {
	let scale,
		tickValues,
		tickFormat = (d) => d,
		tickSize = 5;

	function legend(context) {
		let g = context.select("g");
		if (!g._groups[0][0]) {
			g = context.append("g");
		}
		g.attr("transform", `translate(${[1, 1]})`);

		const ticks = tickValues || scale.ticks();

		const max = ticks[ticks.length - 1];

		g.selectAll("circle")
			.data(ticks.slice().reverse())
			.enter()
			.append("circle")
			.attr("fill", "none")
			.attr("stroke", "currentColor")
			.attr("cx", scale(max))
			.attr("cy", scale)
			.attr("r", scale);

		g.selectAll("line")
			.data(ticks)
			.enter()
			.append("line")
			.attr("stroke", "currentColor")
			.attr("stroke-dasharray", "4, 2")
			.attr("x1", scale(max))
			.attr("x2", tickSize + scale(max) * 2)
			.attr("y1", (d) => scale(d) * 2)
			.attr("y2", (d) => scale(d) * 2);

		g.selectAll("text")
			.data(ticks)
			.enter()
			.append("text")
			.attr("font-family", "'Helvetica Neue', sans-serif")
			.attr("font-size", 11)
			.attr("dx", 3)
			.attr("dy", 4)
			.attr("x", tickSize + scale(max) * 2)
			.attr("y", (d) => scale(d) * 2)
			.text(tickFormat);
	}

	legend.tickSize = function (_) {
		return arguments.length ? ((tickSize = +_), legend) : tickSize;
	};

	legend.scale = function (_) {
		return arguments.length ? ((scale = _), legend) : scale;
	};

	legend.tickFormat = function (_) {
		return arguments.length ? ((tickFormat = _), legend) : tickFormat;
	};

	legend.tickValues = function (_) {
		return arguments.length ? ((tickValues = _), legend) : tickValues;
	};

	return legend;
};
