"use strict";

// different vis modules can be added to this object
const visModules = {};

// initial setup
function responsiveVis(params) {
	params.initSize = params.initSize ? params.initSize : { w: 600, h: 600 };
	params.maxSize = params.maxSize ? params.maxSize : { w: 1000, h: 1000 };
	params.container = params.container ? params.container : "#container";
	// throw warning if vistypes is undefined

	console.log("Parameters:", params);

	// to handle js-generated events
	d3.select("body")
		.append("div")
		.attr("id", "eventHandler")
		.attr("class", "input hidden");

	const con = d3
		.select(container)
		.style("width", params.initSize.w + "px")
		.style("height", params.initSize.h + "px")
		.style("max-width", params.maxSize.w + "px")
		.style("max-height", params.maxSize.h + "px");

	var svg = con
		.append("svg")
		.attr("id", "svg")
		.attr("width", params.maxSize.w)
		.attr("height", params.maxSize.h);

	var overlay = con.append("div").attr("id", "svg-overlay");

	// initalise all selected vis types
	const resizers = {}; // add resizer functions into this
	params.visTypes.forEach(function (d) {
		resizers[d] = visModules[d](con, params);
	});

	// listen to resize events and resize
	resizeObserver(params, resizers);

	return { container: con };

	// add warning for if no vistypes are specified
}

function resizeObserver(params, resizers) {
	const divElem = document.querySelector(params.container);

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

				// update vis
				// check in order of priority if constraints are fulfilled
				for (let i = 0; i < params.visTypes.length; i++) {
					let vis = params.visTypes[i];
					if (resizers[vis].constraintCheck({ x: w, y: h })) {
						displayVis(vis);
						resizers[vis].resize({ x: w, y: h });
						break;
					}
				}

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

// function is called whenever the vis is resized using the drag handle
// switches between different states
// function resizeVis(e, params) {
// 	// need to actually implement smart switches between types
// 	// e.x, e.y -> width, height

// 	var vis = "bubble";
// 	displayVis(vis);
// 	resize(e, params);
// }

// show a specific state and hide all others
function displayVis(vis) {
	d3.selectAll(".visType").attr("display", "none");
	d3.select("#" + vis).attr("display", null);
}

// helper functions
// would probably be better to create a module to take them out of global scope
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
