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

visModules.choropleth = function (container, data, params) {
	console.log("drawing choropleth map");

	// create g for choropleth
	const g = container
		.select("#svg")
		.append("g")
		.attr("id", "choropleth")
		.attr("class", "visType");

	const projection = params.projection;

	// const topo = data;
	// console.log(topo)

	// convert topojson to geojson (individual area polygons)
	const geo = topojson.feature(data, data.objects[params.collection]);

	// create mesh for drawing outlines
	const mesh = topojson.mesh(data);

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

	// get range of values and create color scheme
	let domain = [
		d3.min(geo.features, (d) => params.values(d.properties)),
		d3.max(geo.features, (d) => params.values(d.properties)),
	];
	console.log(domain);

	const colorScale = d3.scaleSequential(params.colorScheme).domain([-80, 80]);

	// Legend
	const legend = g
		.append("g")
		.attr("id", "legend")
		.attr("transform", "translate(360,140)")
		.call(drawLegend, colorScale);

	// draw coloured regions
	const regions = g
		.selectAll(".area")
		.data(geo.features)
		.enter()
		.append("path")
		.attr("class", "area")
		.attr("id", function (d) {
			return d.id;
		})
		.attr("d", path)
		.style("fill", (d) => colorScale(params.values(d.properties)));

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
		// return minArea * s > 500;
		return true;
		// return e.x * e.y > 150000;
	};

	return { resize: resize, constraintCheck: constraintCheck };
};

visModules.gridmap = function (container, data, params) {
	console.log("drawing grid map");
	const g = container
		.select("#svg")
		.append("g")
		.attr("id", "gridmap")
		.attr("class", "visType");

	let tile = g
		.selectAll(".tile")
		.data(data.objects[params.collection])
		.enter()
		.append("g")
		.attr("class", "tile");
	// transform-translate is added in resize function

	tile.append("rect").style("fill", (d) =>
		params.colorScale(d.properties.percentNow)
	);

	d3.select("#chart-overlay")
		.selectAll("div")
		.data(data.objects[params.collection])
		.enter()
		.append("div")
		.html((d) => `${d.properties.HBName}`)
		.style("font-size", "11px")
		.style("color", "#555")
		.style("padding", "1px");

	const resize = function (e) {
		// space between tiles
		const spacing = 2;
		// padding within tile on all four sides
		const padding = 1;
		let nx, ny;
		let bool_tilemap = false;
		let mw, mh, sq;

		// set values based on aspect ratio
		if (e.x / e.y > 14) {
			// 14 x 1
			nx = 14;
			ny = 1;
		} else if (e.x / e.y > 3.5) {
			// 7 x 2
			nx = 7;
			ny = 2;
		} else if (e.x / e.y > 1.67) {
			// 5 x 3
			nx = 5;
			ny = 3;
		} else if (e.x / e.y > 0.5) {
			// tile map
			bool_tilemap = true;
			// tile map
			mw = e.x / 4; // tile max width
			mh = e.y / 6; // tile max height
			sq = d3.min([mh, mw]); // choose smaller value of the two for square size
		} else if (e.x / e.y > 0.28) {
			// 2 x 7
			nx = 2;
			ny = 7;
		} else if (e.x / e.y > 0.07) {
			// 1 x 14
			nx = 1;
			ny = 14;
		} else {
		}

		// reposition g's
		const tile = d3.selectAll(".tile");
		tile.attr("transform", function (d) {
			let dx, dy;
			if (bool_tilemap) {
				dx = d.properties.tileCol * sq + spacing / 2;
				dy = d.properties.tileRow * sq + spacing / 2;
			} else {
				dx = (d.properties.sortOrder % nx) * (e.x / nx) + spacing / 2;
				dy =
					Math.floor(d.properties.sortOrder / nx) * (e.y / ny) +
					spacing / 2;
			}

			return `translate(${dx},${dy})`;
		});

		// resize squares
		tile.select("rect")
			.attr("width", (bool_tilemap ? sq : e.x / nx) - spacing)
			.attr("height", (bool_tilemap ? sq : e.y / ny) - spacing);
	};

	const constraintCheck = function (e) {
		return e.x * e.y > 25000;
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
