"use strict";

// get container
const container = document.querySelector("#container");
const containerStyles = getComputedStyle(container);

let svg, layerMap, layerCircles, map, circles, r1, r2, simulation;

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
	layerMap = d3
		.select("#svg")
		.append("g")
		.attr("id", "map")
		.attr("class", "layer");
	layerCircles = d3
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
d3.json("ne_110m_admin_0_countries_lakes.json")
	.then(function (topo) {
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

		// circle radius for prop circle map
		r1 = d3
			.scaleSqrt()
			.domain([0, d3.max(geo.features, (d) => d.properties.POP_EST)])
			.range([0, Math.sqrt(maxW * maxH) / 10]);
		// circle radius for Dorling/packed circles (slightly bigger)
		r2 = d3
			.scaleSqrt()
			.domain([0, d3.max(geo.features, (d) => d.properties.POP_EST)])
			.range([0, Math.sqrt(maxW * maxH) / 12]);

		// get Dorling cartogram positions
		// adds/updates d.x and d.y
		let dorlingSimulation = d3
			.forceSimulation(geo.features)
			.force(
				"x",
				d3.forceX((d) => projection(d.centroid)[0])
			)
			.force(
				"y",
				d3.forceY((d) => projection(d.centroid)[1])
			)
			.force(
				"collide",
				d3.forceCollide((d) => 1 + r2(d.properties.POP_EST))
			)
			.stop();
		dorlingSimulation.tick(200);
		geo.features.forEach(function (d) {
			d.dorlingX = d.x;
			d.dorlingY = d.y;
		});

		// new simulation to be used for live updates
		simulation = d3
			.forceSimulation(geo.features)
			.force(
				"x",
				d3.forceX((d) => projection(d.centroid)[0])
			)
			.force(
				"y",
				d3.forceY((d) => projection(d.centroid)[1])
			)
			.force(
				"collide",
				d3.forceCollide((d) => 1 + r2(d.properties.POP_EST))
			);

		console.log(geo.features);

		console.log(
			"min population:",
			d3.min(geo.features, (d) => d.properties.POP_EST),
			"max population:",
			d3.max(geo.features, (d) => d.properties.POP_EST)
		);

		// draw map
		map = layerMap
			.selectAll(".country")
			.data(geo.features)
			.enter()
			.append("path")
			.attr("class", "country")
			.attr("d", path)
			.attr("fill", "#f5f5f5")
			.attr("stroke", "#e0e0e0");

		// draw circles
		circles = layerCircles
			.selectAll("circle")
			.data(geo.features)
			.enter()
			.append("circle")
			.attr("fill", "steelblue")
			.attr("fill-opacity", 0.3)
			.attr("stroke", "steelblue");
		// r, cx, cy set in resizer function below
	})
	.then(() => resizeObserver(container));

// resizeObserver(container);

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

				// update these with more complex conditions
				let conditions1 = w > 700;
				let conditions2 = w > 400;
				// need to do some getter setter magic to get conditions to recognise previous states

				console.log;

				// get scale factor
				const k =
					mapAR > w / h ? w / mapInitSize[0] : h / mapInitSize[1];

				// large version
				if (conditions1) {
					// show + scale base map, update stroke width
					layerMap
						.attr("display", "")
						.attr("transform", `scale(${k})`)
						.attr("stroke-width", `${1 / k}px`);
					// if simulation is running, stop it
					simulation.stop();
					// rescale + move circles
					circles
						.attr("r", (d) => k * r1(d.properties.POP_EST))
						.attr("cx", (d) => k * projection(d.centroid)[0])
						.attr("cy", (d) => k * projection(d.centroid)[1]);
				} else if (conditions2) {
					// 'stable' Dorling
					// hide base map
					layerMap.attr("display", "none");
					// if simulation is running, stop it
					simulation.stop();
					// rescale + move circles to scaled Dorling positions
					circles
						.attr("r", (d) => k * r2(d.properties.POP_EST))
						.attr("cx", (d) => k * d.dorlingX)
						.attr("cy", (d) => k * d.dorlingY);
				} else {
					// constantly updating circle packing
					// scale inconsiderate of map ratio:
					let s = Math.sqrt((w * h) / 90000); // ??
					// hide base map
					layerMap.attr("display", "none");
					// keep simulation running constantly
					simulation.on("tick", tick);
					simulation.restart();

					function tick() {
						console.log("tick");

						circles
							.attr("r", (d) => s * r2(d.properties.POP_EST))
							.attr("cx", function (d) {
								return (d.x = Math.max(
									s * r2(d.properties.POP_EST),
									Math.min(
										w - s * r2(d.properties.POP_EST),
										d.x
									)
								));
							})
							.attr("cy", function (d) {
								return (d.y = Math.max(
									s * r2(d.properties.POP_EST),
									Math.min(
										h - s * r2(d.properties.POP_EST),
										d.y
									)
								));
							});
					}
				}
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
