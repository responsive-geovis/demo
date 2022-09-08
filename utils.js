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
		tickSize = 5,
		g;

	function legend(context) {
		g = context.select("g");
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
			.attr("dominant-baseline", "central")
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

	legend.adapt = function (s) {
		g.attr("stroke-width", `${1 / s}px`);
		g.selectAll("line").attr("stroke-dasharray", `${4 / s}, ${2 / s}`);
		g.selectAll("text").attr("font-size", 11 / s);
	};

	return legend;
};

// custom function based on the force functions included in d3-force
function forceBoundingBox(minX, minY, maxX, maxY, radius) {
	var nodes,
		strength = 1;

	if (minX == null) minX = 0;
	if (minY == null) minY = 0;
	if (maxX == null) maxX = 0;
	if (maxY == null) maxY = 0;

	if (typeof radius !== "function")
		radius = (d) => (radius == null ? 1 : +radius);

	function force() {
		var i,
			n = nodes.length,
			node,
			r;

		for (i = 0; i < n; ++i) {
			node = nodes[i];
			r = radius(node);
			node.x =
				node.x < minX + r
					? minX + r
					: node.x > maxX - r
					? maxX - r
					: node.x;
			node.y =
				node.y < minY + r
					? minY + r
					: node.y > maxY - r
					? maxY - r
					: node.y;
			// console.log(minX, maxX, minY, maxY, r);
		}
	}

	force.initialize = function (_) {
		nodes = _;
	};

	force.minX = function (_) {
		return arguments.length ? ((minX = +_), force) : minX;
	};

	force.minY = function (_) {
		return arguments.length ? ((minY = +_), force) : minY;
	};

	force.maxX = function (_) {
		return arguments.length ? ((maxX = +_), force) : maxX;
	};

	force.maxY = function (_) {
		return arguments.length ? ((maxY = +_), force) : maxY;
	};

	force.radius = function (_) {
		return arguments.length ? ((radius = +_), force) : radius;
	};

	force.strength = function (_) {
		return arguments.length ? ((strength = +_), force) : strength;
	};

	return force;
}
