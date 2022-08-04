"use strict";

// get container
const container = document.querySelector("#container");
const containerStyles = getComputedStyle(container);

let svg,
	layerMap,
	layerCircles,
	layerLegend1,
	layerLegend2,
	map,
	circles,
	legend1,
	legend2,
	r1,
	r2,
	simulation;

// color for all circles
const circleColor = "#D9632B"; //"#C53838";
// colors for circles colored by continent
const continents = [
	"Africa",
	"Antarctica",
	"Asia",
	"Europe",
	"North America",
	"Oceania",
	"South America",
];
// ColorBrewer 6-class Set1 plus grey (#bbb)
const continent_colors = [
	"#e41a1c",
	"#bbb",
	"#377eb8",
	"#4daf4a",
	"#984ea3",
	"#ff7f00",
	"#FFE600",
];
const colorContinent = d3
	.scaleOrdinal()
	.domain(continents)
	.range(continent_colors);

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
	layerLegend1 = d3
		.select("#svg")
		.append("g")
		.attr("id", "legend1")
		.attr("class", "layer");
	layerLegend2 = d3
		.select("#svg")
		.append("g")
		.attr("id", "legend2")
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
Promise.all([
	d3.json("ne_110m_admin_0_countries_lakes.json"),
	d3.csv("continents.csv"),
])
	// d3.json("ne_110m_admin_0_countries_lakes.json")
	.then(function (data) {
		let topo = data[0];
		let continents_list = data[1];
		console.log(data);
		// convert topojson to geojson
		const geo = topojson.feature(
			topo,
			topo.objects.ne_110m_admin_0_countries_lakes
		);
		console.log(geo);

		// get centroids + add continent
		geo.features.forEach((feature) => {
			feature.properties.centroid = centroid(feature);
			// console.log(feature.properties.ISO_A3);
			feature.properties.continent = continents_list.find(
				(d) => d.iso == feature.properties.ISO_A3
			).continent;
			return feature;
		});

		// circle radius for prop circle map
		r1 = d3
			.scaleSqrt()
			.domain([0, d3.max(geo.features, (d) => d.properties.POP_EST)])
			.range([0, Math.sqrt(maxW * maxH) / 13]);
		// circle radius for Dorling/packed circles (slightly bigger)
		r2 = d3
			.scaleSqrt()
			.domain([0, d3.max(geo.features, (d) => d.properties.POP_EST)])
			.range([0, Math.sqrt(maxW * maxH) / 10]);

		// get Dorling cartogram positions
		// adds/updates d.x and d.y
		let dorlingSimulation = d3
			.forceSimulation(geo.features)
			.force(
				"x",
				d3.forceX((d) => projection(d.properties.centroid)[0])
			)
			.force(
				"y",
				d3.forceY((d) => projection(d.properties.centroid)[1])
			)
			.force(
				"collide",
				d3.forceCollide((d) => 1 + r2(d.properties.POP_EST))
			)
			.stop();
		dorlingSimulation.tick(200);
		geo.features.forEach(function (d) {
			d.properties.dorlingX = d.x;
			d.properties.dorlingY = d.y + 30;
		});

		// separate simulation for circle packing
		simulation = d3
			.forceSimulation(geo.features)
			// 400 iterations
			.alphaDecay(1 - Math.pow(0.001, 1 / 400));

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
			.attr("fill-opacity", 0.3);
		// fill, stroke, r, cx, cy set in resizer function below

		// legend
		// let n = d3.format(".2s");
		let labels = ["1 million", "100 million", "500 million", "1 billion"];
		let tickvals = [1000000, 100000000, 500000000, 1000000000];
		let circleLegend1 = legendCircle()
			.scale(r1)
			.tickValues(tickvals)
			.tickFormat(
				(d, i, e) => labels[i]
				// do this to add label to last one
				// i === e.length - 1 ? d + " bushels of hay" : d
			)
			.tickSize(5); // defaults to 5
		let circleLegend2 = legendCircle()
			.scale(r2)
			.tickValues(tickvals)
			.tickFormat((d, i, e) => labels[i])
			.tickSize(5); // defaults to 5

		legend1 = layerLegend1
			.append("g")
			.attr("transform", "translate(15,400)")
			.call(circleLegend1);
		legend2 = layerLegend2
			.append("g")
			.attr("transform", "translate(15,375)")
			.call(circleLegend2);

		return geo;
	})
	// .then(() => resizeObserver(container));
	.then(function (geo) {
		resizeObserver(container, geo);
	});

// resizeObserver(container);

function resizeObserver(container, geo) {
	const divElem = container;

	const resizeObserver = new ResizeObserver((entries) => {
		for (let entry of entries) {
			if (entry.contentBoxSize) {
				// Firefox implements `contentBoxSize` as a single content rect, rather than an array
				const contentBoxSize = Array.isArray(entry.contentBoxSize)
					? entry.contentBoxSize[0]
					: entry.contentBoxSize;

				const w = contentBoxSize.inlineSize;
				const h = contentBoxSize.blockSize;

				// update info table
				d3.select("#widthOutput").html(Math.round(w));
				d3.select("#heightOutput").html(Math.round(h));
				d3.select("#arOutput").html(Math.round((w / h) * 100) / 100);
				d3.select("#areaOutput").html(Math.round(w * h));

				// get scale factor
				const k =
					mapAR > w / h ? w / mapInitSize[0] : h / mapInitSize[1];

				// calculate some things for conditions
				// mapAR is a const
				let containerAR = w / h;
				let pop_vals = geo.features.map((d) => d.properties.POP_EST);
				let lower_bound = pop_vals.sort((a, b) => a - b)[
					Math.floor(pop_vals.length * 0.1)
				];
				// console.log(pop_vals, lower_bound);
				// console.log(
				// 	"AR Diff: ",
				// 	containerAR / mapAR,
				// 	"r1: ",
				// 	r1(lower_bound),
				// 	"r2: ",
				// 	r2(lower_bound)
				// );

				// conditions for prop circle map
				if (
					// min r - at least 90% of circles visible
					r1(lower_bound) * k > 1 &&
					// aspect ratio difference - no more than 1/3 white space
					containerAR / mapAR >= 0.67 &&
					containerAR / mapAR <= 1.5
				) {
					// show + scale base map, update stroke width
					layerMap
						.attr("display", "")
						.attr("transform", `scale(${k})`)
						.attr("stroke-width", `${1 / k}px`);
					// if simulation is running, stop it
					simulation.stop();
					// rescale + move circles
					circles
						.attr("fill", circleColor)
						.attr("stroke", circleColor)
						.attr("r", (d) => k * r1(d.properties.POP_EST))
						.attr(
							"cx",
							(d) => k * projection(d.properties.centroid)[0]
						)
						.attr(
							"cy",
							(d) => k * projection(d.properties.centroid)[1]
						);
					// rescale legend
					layerLegend1
						.attr("display", "")
						.attr("transform", `scale(${k})`);
					layerLegend1.selectAll("text").attr("font-size", 11 / k);
					layerLegend2.attr("display", "none");
				} else if (
					// min r - at least 90% of circles visible
					r2(lower_bound) * k > 1 &&
					// aspect ratio difference - no more than 1/3 white space
					containerAR / mapAR >= 0.67 &&
					containerAR / mapAR <= 1.5
				) {
					// 'stable' Dorling
					// hide base map
					layerMap.attr("display", "none");
					// if simulation is running, stop it
					simulation.stop();
					// rescale + move circles to scaled Dorling positions
					circles
						.attr("fill", circleColor)
						.attr("stroke", circleColor)
						.attr("r", (d) => k * r2(d.properties.POP_EST))
						.attr("cx", (d) => k * d.properties.dorlingX)
						.attr("cy", (d) => k * d.properties.dorlingY);
					// rescale legend
					layerLegend2
						.attr("display", "")
						.attr("transform", `scale(${k})`);
					layerLegend2.selectAll("text").attr("font-size", 11 / k);
					layerLegend1.attr("display", "none");
				} else {
					// constantly updating circle packing
					let r = d3
						.scaleSqrt()
						.domain([
							0,
							d3.max(geo.features, (d) => d.properties.POP_EST),
						])
						.range([
							0,
							d3.min([Math.sqrt(w * h) / 5, w / 2, h / 2]),
						]);

					// hide base map
					layerMap.attr("display", "none");
					// hide legends
					layerLegend1.attr("display", "none");
					layerLegend2.attr("display", "none");
					// keep simulation running constantly
					// forces depend on container
					simulation
						.force(
							"x",
							d3.forceX(
								(d) =>
									(w / maxW) *
									projection(d.properties.centroid)[0]
							)
						)
						.force(
							"y",
							d3.forceY(
								(d) =>
									(h / maxH) *
									projection(d.properties.centroid)[1]
							)
						)
						.force(
							"collide",
							d3.forceCollide((d) => 1 + r(d.properties.POP_EST))
						)
						.on("tick", tick)
						.alpha(1)
						.restart();

					function tick() {
						console.log("tick");
						circles
							.attr("fill", (d) =>
								colorContinent(d.properties.continent)
							)
							.attr("stroke", (d) =>
								colorContinent(d.properties.continent)
							)
							.attr("r", (d) => r(d.properties.POP_EST))
							.attr("cx", function (d) {
								return (d.x = Math.max(
									r(d.properties.POP_EST),
									Math.min(w - r(d.properties.POP_EST), d.x)
								));
							})
							.attr("cy", function (d) {
								return (d.y = Math.max(
									r(d.properties.POP_EST),
									Math.min(h - r(d.properties.POP_EST), d.y)
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
