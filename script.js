"use strict";

// get container
const container = document.querySelector("#container");
const containerStyles = getComputedStyle(container);

let svg, map, circles;

// check for max width + height, throw error if not set - needed to create svg

let maxW = parseInt(containerStyles["max-width"]);
let maxH = parseInt(containerStyles["max-height"]);

if (maxW && maxH) {
	// create svg of that size
	svg = d3
		.select("#container")
		.append("svg")
		.attr("id", "svg")
		.attr("width", maxW)
		.attr("height", maxH);

	// add g elements for the different layers
	map = d3
		.select("#svg")
		.append("g")
		.attr("id", "map")
		.attr("class", "layer");
	circles = d3
		.select("#svg")
		.append("g")
		.attr("id", "circles")
		.attr("class", "layer");
} else {
	throw "Container needs to have max-width and max-height set.";
}

// map prep projection path etc
const mapAR = 1.884; // aspect ratio of map
const mapInitSize =
	maxW / maxH < mapAR ? [maxW, maxW / mapAR] : [maxH * mapAR, maxH];
const projection = d3.geoEqualEarth().rotate([-20, 0, 0]).fitSize(mapInitSize, {
	type: "Sphere",
});
let initProjScale = projection.scale();
let initProjTranslate = projection.translate();

const path = d3.geoPath(projection);

// data + setup
d3.json("ne_110m_admin_0_countries_lakes.json").then(function (topo) {
	// convert topojson to geojson
	const geo = topojson.feature(
		topo,
		topo.objects.ne_110m_admin_0_countries_lakes
	);
	console.log(geo);

	// get centroids
	geo.features.forEach((feature) => {
		feature.centroid = centroid(feature);
		return feature;
	});

	console.log(
		"min population:",
		d3.min(geo.features, (d) => d.properties.POP_EST),
		"max population:",
		d3.max(geo.features, (d) => d.properties.POP_EST)
	);

	// draw map
	map.selectAll(".country")
		.data(geo.features)
		.enter()
		.append("path")
		.attr("class", "country")
		.attr("d", path)
		.attr("fill", "#f5f5f5")
		.attr("stroke", "#e0e0e0");
});

resizeObserver(container);

function resizeObserver(container) {
	const divElem = container;

	const resizeObserver = new ResizeObserver((entries) => {
		for (let entry of entries) {
			if (entry.contentBoxSize) {
				// Firefox implements `contentBoxSize` as a single content rect, rather than an array
				const contentBoxSize = Array.isArray(entry.contentBoxSize)
					? entry.contentBoxSize[0]
					: entry.contentBoxSize;

				var w = contentBoxSize.inlineSize;
				var h = contentBoxSize.blockSize;

				// update info table
				d3.select("#widthOutput").html(Math.round(w));
				d3.select("#heightOutput").html(Math.round(h));
				d3.select("#arOutput").html(Math.round((w / h) * 100) / 100);
				d3.select("#areaOutput").html(Math.round(w * h));

				// resize map
				const scale =
					mapAR > w / h ? w / mapInitSize[0] : h / mapInitSize[1];
				// show + scale base map, update stroke width
				map.attr("display", "")
					.attr("transform", `scale(${scale})`)
					.attr("stroke-width", `${1 / scale}px`);
				// update vis
				// check in order of priority if constraints are fulfilled
				// for (let i = 0; i < params.visTypes.length; i++) {
				// 	let vis = params.visTypes[i];
				// 	if (resizers[vis].constraintCheck({ x: w, y: h })) {
				// 		displayVis(vis);
				// 		resizers[vis].resize({ x: w, y: h });
				// 		break;
				// 	}
				// }

				// resizeVis({ x: w, y: h }, params);
				// var vis = "choropleth";
				// resizers[vis]({ x: w, y: h }, params);
			} else {
				// need to figure out why this part is necessary?? does contentBoxSize not always exist?
				// h1Elem.style.fontSize = Math.max(1.5, entry.contentRect.width / 200) + 'rem';
				// pElem.style.fontSize = Math.max(1, entry.contentRect.width / 600) + 'rem';
			}
		}
	});

	resizeObserver.observe(divElem);
}

// Utilities for bubble charts
function centroid(feature) {
	// Find the centroid of the largest polygon
	// Source: https://observablehq.com/d/47c257e62a34b61d
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
}
