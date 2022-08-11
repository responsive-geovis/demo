"use strict";

// make an init function that creates and returns the projection function and any parameters I need

// different vis modules can be added to this object
const visModules = {};

visModules.barchart = function (container, params) {
	console.log("drawing barchart");
	const g = container
		.select("#svg")
		.append("g")
		.attr("id", "barchart")
		.attr("class", "visType");

	const resize = function (e) {};

	const constraintCheck = function () {
		return true;
	};

	return { resize: resize, constraintCheck: constraintCheck };
};

visModules.choropleth = function (container, params) {
	console.log("drawing choropleth map");

	// create g for choropleth
	const g = container
		.select("#svg")
		.append("g")
		.attr("id", "choropleth")
		.attr("class", "visType");

	const projection = d3.geoAlbers().rotate([0, 0]);

	// convert topojson to geojson (individual area polygons)
	const geo = topojson.feature(
		params.map,
		params.map.objects[params.collection]
	);

	// create mesh for drawing outlines
	const mesh = topojson.mesh(params.map);

	// need to automate this
	const mapAR = 0.8; // natural aspect ratio of the map - width divided by height (estimate here, needs to be automated)

	const mapInitSize =
		params.initSize.w / params.initSize.h < mapAR
			? [params.initSize.w, params.initSize.w / mapAR]
			: [params.initSize.h * mapAR, params.initSize.h];

	projection.fitSize(mapInitSize, mesh);
	const path = d3.geoPath(projection);

	// get area sizes
	geo.features.forEach((feature) => {
		feature.area = areasize(feature, path);
		return feature;
	});

	// get smallest area
	const minArea = d3.min(geo.features, (d) => d.area);
	// console.log(
	// 	minArea
	// 	// params.name(geo.features[d3.minIndex(geo.features, (d) => d.area)])
	// );

	// // Legend
	// const legend = g
	// 	.append("g")
	// 	.attr("id", "legend")
	// 	.attr("transform", "translate(360,140)")
	// 	.call(drawLegend, colorScale);

	// draw coloured regions
	const regions = g
		.selectAll(".area")
		.data(geo.features)
		.enter()
		.append("path")
		.attr("class", "area")
		.attr("id", (d) => params.map_id(d))
		.attr("d", path)
		.style("fill", (d) =>
			params.colorScale(
				params.values(
					params.data.find(
						(x) => params.data_id(x) === params.map_id(d)
					)
				)
			)
		);

	// draw outlines on top
	g.append("g")
		.datum(mesh)
		.append("path")
		.attr("class", "mapMesh")
		.attr("d", path)
		.style("fill", "transparent")
		.style("stroke", "#444")
		.style("stroke-width", "0.5px");

	// get centre of bbox of each region + draw line chart centred on region
	regions
		.append("circle")
		.attr("r", 5)
		.attr("cx", 40)
		.attr("cy", 40)
		.style("fill", "red");

	const resize = function (e) {
		const s =
			mapAR > e.x / e.y ? e.x / mapInitSize[0] : e.y / mapInitSize[1];
		g.attr("transform", `scale(${s})`);
		d3.select(".mapMesh").style("stroke-width", `${0.5 / s}px`);
	};

	const constraintCheck = function (e) {
		// check size of smallest region
		const s =
			mapAR > e.x / e.y ? e.x / mapInitSize[0] : e.y / mapInitSize[1];
		return minArea * s > 2;
		// return false;
		// return e.x * e.y > 150000;
	};

	return { resize: resize, constraintCheck: constraintCheck };
};

visModules.hexmap = function (container, params) {
	console.log("drawing hex map");

	const hexAR = 0.8;
	const hexInitSize =
		params.initSize.w / params.initSize.h > hexAR
			? { w: params.initSize.w, h: params.initSize.w / hexAR }
			: { w: params.initSize.h * hexAR, h: params.initSize.h };

	const g = container
		.select("#svg")
		.append("g")
		.attr("id", "hexmap")
		.attr("class", "visType");

	let width = hexInitSize.w;
	let height = hexInitSize.h;

	// Render the hexes
	var hexes = d3.renderHexJSON(params.hex, width, height);

	// Bind the hexes to g elements of the svg and position them
	var hexmap = g
		.selectAll("g")
		.data(hexes)
		.enter()
		.append("g")
		.attr("transform", function (hex) {
			return "translate(" + hex.x + "," + hex.y + ")";
		});

	// Draw the polygons around each hex's centre
	hexmap
		.append("polygon")
		.attr("points", function (hex) {
			return hex.points;
		})
		.attr("stroke", "white")
		.attr("stroke-width", "2")
		.attr("fill", (d) =>
			params.colorScale(
				params.values(
					params.data.find(
						(x) => params.data_id(x) === params.hex_id(d)
					)
				)
			)
		);

	// Add the hex codes as labels
	// hexmap
	// 	.append("text")
	// 	.append("tspan")
	// 	.attr("text-anchor", "middle")
	// 	.text(function(hex) {return hex.key;});

	const resize = function (e) {
		const s = hexAR > e.x / e.y ? e.x / hexInitSize.w : e.y / hexInitSize.h;
		g.attr("transform", `scale(${s})`);
		// d3.select(".mapMesh").style("stroke-width", `${0.5 / s}px`);
	};

	const constraintCheck = function (e) {
		// return e.x * e.y > 25000;
		return true;
	};

	return { resize: resize, constraintCheck: constraintCheck };
};

visModules.summary = function (container, params) {
	console.log("drawing summary");
	const g = container
		.select("#svg")
		.append("g")
		.attr("id", "summary")
		.attr("class", "visType");

	g.append("text")
		.text("Total vaccinations")
		.attr("y", 20)
		.attr("font-weight", "bold")
		.attr("font-size", "15px");
	g.append("text")
		.text("in Scotland:")
		.attr("y", 35)
		.attr("font-weight", "bold")
		.attr("font-size", "15px");
	g.append("text").text("xxx").attr("y", 50);

	const resize = function (e) {};

	const constraintCheck = function (e) {
		return true;
	};

	return { resize: resize, constraintCheck: constraintCheck };
};

function drawLegend(sel, colorScale) {
	let legend = sel;
	legend.style("font-size", "12px");
	let gradient = legend
		.append("defs")
		.append("linearGradient")
		.attr("id", "legendGradient")
		.attr("x1", "0%")
		.attr("y1", "0%")
		.attr("x2", "100%")
		.attr("y2", "0%");
	gradient
		.selectAll("stop")
		.data(d3.range(0, 101, 5).map((d) => [d, colorScale(d * 1.6 - 80)]))
		.enter()
		.append("stop")
		.attr("offset", (d) => d[0] + "%")
		.style("stop-color", (d) => d[1])
		.style("stop-opacity", 1);

	legend
		.append("rect")
		.attr("width", 150)
		.attr("height", 20)
		.attr("fill", "url('#legendGradient')");
	legend
		.append("line")
		.attr("x1", 75)
		.attr("x2", 75)
		.attr("y1", -2)
		.attr("y2", 22)
		.style("stroke", "#000")
		.style("stroke-width", "1px");
	legend
		.append("text")
		.text("EU Referendum Vote")
		.attr("font-weight", "bold")
		.attr("font-size", "14px")
		.attr("y", -22);
	legend
		.append("text")
		.text("Remain")
		.attr("x", 150)
		.attr("y", -4)
		.attr("text-anchor", "end");
	legend.append("text").text("Leave").attr("y", -4);
	legend
		.append("text")
		.text("0%")
		.attr("x", 75)
		.attr("y", 24)
		.attr("dominant-baseline", "hanging")
		.attr("text-anchor", "middle");
	legend
		.append("text")
		.text("80%")
		.attr("x", 0)
		.attr("y", 24)
		.attr("dominant-baseline", "hanging")
		.attr("text-anchor", "middle");
	legend
		.append("text")
		.text("80%")
		.attr("x", 150)
		.attr("y", 24)
		.attr("dominant-baseline", "hanging")
		.attr("text-anchor", "middle");
}
