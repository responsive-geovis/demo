"use strict";

// make an init function that creates and returns the projection function and any parameters I need

visModules.bubble = function (container, params) {
	console.log("drawing bubbles");

	// create g for bubble vis
	const g = container
		.select("#svg")
		.append("g")
		.attr("id", "bubble")
		.attr("class", "visType");

	const projection = params.projection;

	let initProjScale;
	let initProjTranslate;
	let simulation;

	const topo = params.data;
	// console.log(topo);

	// convert topojson to geojson
	const geo = topojson.feature(
		topo,
		topo.objects.ne_110m_admin_0_countries_lakes
	);

	// projection + path
	const mapAR = 1.884; // aspect ratio of map
	const mapInitSize =
		params.initSize.w / params.initSize.h < mapAR
			? [params.initSize.w, params.initSize.w / mapAR]
			: [params.initSize.h * mapAR, params.initSize.h];
	projection.fitSize(mapInitSize, {
		type: "Sphere",
	});
	initProjScale = projection.scale();
	initProjTranslate = projection.translate();

	const path = d3.geoPath(projection);

	// get centroids + areas
	geo.features.forEach((feature) => {
		feature.centroid = centroid(feature);
		feature.area = areasize(feature, path);
		return feature;
	});

	// get smallest area
	const minArea = d3.min(geo.features, (d) => d.area);
	console.log(minArea);

	// circle radius
	const r = d3
		.scaleSqrt()
		.domain([0, d3.max(geo.features, (d) => d.properties.POP_EST)])
		.range([0, Math.sqrt(params.initSize.w * params.initSize.h) / 10]);

	// draw map
	g.append("g")
		.attr("id", "basemap")
		.selectAll(".country")
		.data(geo.features)
		.enter()
		.append("path")
		.attr("class", "country")
		.attr("d", path)
		.attr("fill", "#f5f5f5")
		.attr("stroke", "#e0e0e0");

	// add circles at centroids
	g.append("g")
		.attr("id", "circles")
		.selectAll(".propCircle")
		.data(geo.features)
		.enter()
		.append("circle")
		.attr("cx", (d) => projection(d.centroid)[0])
		.attr("cy", (d) => projection(d.centroid)[1])
		.attr("r", (d) => r(d.properties.POP_EST))
		.style("fill", "#ff111155"); // transparent red

	// get Dorling cartogram positions
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
			d3.forceCollide((d) => 1 + r(d.properties.POP_EST))
		)
		.stop();

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

	const resize = function (e) {
		const map = d3.select("#basemap");
		const circles = d3.select("#circles");
		const scale =
			mapAR > e.x / e.y ? e.x / mapInitSize[0] : e.y / mapInitSize[1];

		// if below a certain size, switch to Dorling cartogram + remove base map
		if (e.x > 500) {
			// proportional circle map
			// if simulation is running, stop it
			simulation.stop();
			// show + scale base map
			map.attr("display", "").attr("transform", `scale(${scale})`);
			// update circle positions
			// circles.attr("transform", `scale(${e.x / params.initSize.w})`);
			projection
				.scale(initProjScale * scale)
				.translate([
					initProjTranslate[0] * scale,
					initProjTranslate[1] * scale,
				]);

			circles
				.selectAll("circle")
				.attr("cx", (d) => projection(d.centroid)[0])
				.attr("cy", (d) => projection(d.centroid)[1]);
		} else if (e.x > 250) {
			// Dorling cartogram
			// hide base map
			map.attr("display", "none");
			// start simulation
			simulation.restart();

			// simulation.tick(200);

			circles
				.selectAll("circle")
				.attr("cx", (d) => d.x * scale)
				.attr("cy", (d) => d.y * scale);
		} else {
			// bubble chart
			// hide base map
			map.attr("display", "none");
		}

		// if smaller, switch to circle packing (?)
	};

	const constraintCheck = function (e) {
		const scale =
			mapAR > e.x / e.y ? e.x / mapInitSize[0] : e.y / mapInitSize[1];
		return minArea * scale > 0.5;
	};

	return { resize: resize, constraintCheck: constraintCheck };
};

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

	const projection = params.projection;

	const topo = params.data;
	// console.log(topo)

	// convert topojson to geojson (individual area polygons)
	const geo = topojson.feature(topo, topo.objects.nhs_health_boards3);

	// create mesh for drawing outlines
	const mesh = topojson.mesh(topo);

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
	console.log(
		minArea,
		params.name(geo.features[d3.minIndex(geo.features, (d) => d.area)])
	);

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
		.style("fill", (d) => params.colorScale(d.properties.percentNow));

	// draw outlines on top
	g.append("g")
		.datum(mesh)
		.append("path")
		.attr("class", "mapMesh")
		.attr("d", path)
		.style("fill", "transparent")
		.style("stroke", "#444")
		.style("stroke-width", "1px");

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
		d3.select(".mapMesh").style("stroke-width", `${1 / s}px`);
	};

	const constraintCheck = function (e) {
		// check size of smallest region
		const s =
			mapAR > e.x / e.y ? e.x / mapInitSize[0] : e.y / mapInitSize[1];
		return minArea * s > 500;
		// return e.x * e.y > 150000;
	};

	return { resize: resize, constraintCheck: constraintCheck };
};

visModules.gridmap = function (container, params) {
	console.log("drawing grid map");
	const g = container
		.select("#svg")
		.append("g")
		.attr("id", "gridmap")
		.attr("class", "visType");

	const data = params.data;

	let tile = g
		.selectAll(".tile")
		.data(data.objects.nhs_health_boards3.geometries)
		.enter()
		.append("g")
		.attr("class", "tile");
	// transform-translate is added in resize function

	tile.append("rect").style("fill", (d) =>
		params.colorScale(d.properties.percentNow)
	);

	d3.select("#chart-overlay")
		.selectAll("div")
		.data(data.objects.nhs_health_boards3.geometries)
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
