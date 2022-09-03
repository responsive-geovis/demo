"use strict";

// different vis modules can be added to this object
const visModules = {};

// TEMPLATE
// visModules.barchart = function (container, params) {
// 	console.log("drawing barchart");
// 	const g = container
// 		.select("#svg")
// 		.append("g")
// 		.attr("id", "barchart")
// 		.attr("class", "visType");

// 	const resize = function (e) {};

// 	const constraintCheck = function () {
// 		return true;
// 	};

// 	return { resize: resize, constraintCheck: constraintCheck };
// };

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

	// Legend
	const legend = g
		.append("g")
		.attr("id", "legend")
		.attr("transform", "translate(350,115)")
		.call(drawLegend, params.colors, params.category_labels, params.title);

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

	// Legend
	const legend = g
		.append("g")
		.attr("id", "legend")
		.attr("transform", "translate(520,30)")
		.call(drawLegend, params.colors, params.category_labels, params.title);

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
		return e.x > 300;
	};

	return { resize: resize, constraintCheck: constraintCheck };
};

// waffle chart
visModules.wafflechart = function (container, params) {
	console.log("drawing waffle chart");
	const g = container
		.select("#svg")
		.append("g")
		.attr("id", "wafflechart")
		.attr("class", "visType");

	const countries = ["England", "Scotland", "Wales", "Northern Ireland"].map(
		(d) => ({
			country: d,
			data: params.data
				.filter((el) => el.country_name === d)
				.sort((a, b) => a.first_party > b.first_party),
		})
	);
	console.log(countries);

	const n_categories = countries.length;
	const n_datapoints = params.data.length;

	let country = g.selectAll("g").data(countries).enter().append("g");

	let headers = country.append("text").text((d) => d.country);

	let squares = country
		.selectAll("rect")
		.data((d) => d.data)
		.enter()
		.append("rect")
		.attr("fill", (d) => params.colorScale(d.first_party));

	function partsSums(ls) {
		let sum = 0;
		let res = [0];
		for (let i = 1; i <= ls.length; i++) {
			sum += ls[i - 1];
			res.push(sum);
		}
		return res;
	}

	const resize = function (e) {
		// compute new sizes/grid
		let label = 30; // could update this step-wise?
		let margin = 5;
		let w = e.x - margin * 2;
		let h = e.y - label * n_categories - margin * 2; // 20px for each header, 5px *2 for margins
		let size = Math.floor(Math.sqrt(((w * h) / n_datapoints) * 0.7)); // spare space
		let padding = Math.ceil(size * 0.15);
		let wn = Math.floor(w / (size + padding));

		// console.log(size);

		let translate = partsSums(
			countries.map((d) => (d.data.length / wn) * (size + padding))
		);

		// update chart
		country.attr(
			"transform",
			(d, i) => `translate(5,${translate[i] + (i + 1) * label})`
		);
		headers.attr("font-size", label / 2).attr("y", -0.13 * label);
		squares
			// .transition()
			// .duration(50)
			.attr("width", size)
			.attr("height", size)
			.attr("x", (d, i) => (i % wn) * (size + padding))
			.attr("y", (d, i) => Math.floor(i / wn) * (size + padding));
	};

	const constraintCheck = function () {
		return true;
	};

	return { resize: resize, constraintCheck: constraintCheck };
};

visModules.circleMap = function (container, params) {
	console.log("drawing proportional circle map (circleMap)");
	const g = container
		.select("#svg")
		.append("g")
		.attr("id", "circleMap")
		.attr("class", "visType");

	// map prep projection path etc
	const mapAR = 1.884; // aspect ratio of map
	const mapInitSize =
		params.initSize.w / params.initSize.h < mapAR
			? [params.initSize.w, params.initSize.w / mapAR]
			: [params.initSize.h * mapAR, params.initSize.h];
	const projection = d3
		.geoEqualEarth()
		.rotate([-20, 0, 0])
		.fitSize(mapInitSize, {
			type: "Sphere",
		});
	let initProjScale = projection.scale();
	let initProjTranslate = projection.translate();
	const path = d3.geoPath(projection);

	// circle radius for prop circle map
	const r1 = d3
		.scaleSqrt()
		.domain([0, d3.max(params.map.features, (d) => d.properties.POP_EST)])
		.range([0, Math.sqrt(params.initSize.w * params.initSize.h) / 13]);

	// draw map
	let map = g
		.append("g")
		.selectAll(".country")
		.data(params.map.features)
		.enter()
		.append("path")
		.attr("class", "country")
		.attr("d", path)
		.attr("fill", "#f5f5f5")
		.attr("stroke", "#e0e0e0");

	// draw circles
	let circles = g
		.append("g")
		.selectAll("circle")
		.data(params.map.features)
		.enter()
		.append("circle")
		.attr("fill", params.circleColor)
		.attr("fill-opacity", 0.3)
		.attr("stroke", params.circleColor)
		.on("mouseover", function (d) {
			d3.select("#tooltip")
				.attr("x", d3.select(this).attr("cx"))
				.attr("y", d3.select(this).attr("cy"))
				.text(d.originalTarget.__data__.properties.ADMIN);
		})
		.on("mouseout", function () {
			d3.select("#tooltip").attr("x", -100).attr("y", -100);
		});
	// fill, stroke, r, cx, cy set in resizer function below

	// add legend
	// legend
	// let n = d3.format(".2s");
	// to do move to params
	let labels = ["1 million", "100 million", "500 million", "1 billion"];
	let tickvals = [1000000, 100000000, 500000000, 1000000000];
	let circleLegend = legendCircle()
		.scale(r1)
		.tickValues(tickvals)
		.tickFormat(
			(d, i, e) => labels[i]
			// do this to add label to last one
			// i === e.length - 1 ? d + " bushels of hay" : d
		)
		.tickSize(5); // defaults to 5

	let legend = g.append("g"); // scale will be applied to this g
	legend
		.append("g")
		.attr("transform", "translate(15,400)")
		.call(circleLegend);

	// calculate some things for conditions
	// mapAR is a const
	let pop_vals = params.map.features.map((d) => d.properties.POP_EST);
	let lower_bound = pop_vals.sort((a, b) => a - b)[
		Math.floor(pop_vals.length * 0.1)
	];

	const resize = function (e) {
		const s =
			mapAR > e.x / e.y ? e.x / mapInitSize[0] : e.y / mapInitSize[1];
		// g.attr("transform", `scale(${s})`);
		// d3.select(".mapMesh").style("stroke-width", `${0.5 / s}px`);

		// show + scale base map, update stroke width
		map.attr("transform", `scale(${s})`).attr("stroke-width", `${1 / s}px`);

		// rescale + move circles
		circles
			.attr("r", (d) => s * r1(d.properties.POP_EST))
			.attr("cx", (d) => s * projection(d.properties.centroid)[0])
			.attr("cy", (d) => s * projection(d.properties.centroid)[1]);

		// rescale legend
		legend.attr("transform", `scale(${s})`);
		legend.selectAll("text").attr("font-size", 11 / s);
	};

	const constraintCheck = function (e) {
		const s =
			mapAR > e.x / e.y ? e.x / mapInitSize[0] : e.y / mapInitSize[1];
		let containerAR = e.x / e.y;

		// min r - at least 90% of circles visible
		return (
			r1(lower_bound) * s > 1 &&
			// aspect ratio difference - no more than 1/3 white space
			containerAR / mapAR >= 0.67 &&
			containerAR / mapAR <= 1.5
		);
	};

	return { resize: resize, constraintCheck: constraintCheck };
};

visModules.circleCartogram = function (container, params) {
	console.log("drawing circle cartogram (circleCartogram)");

	const g = container
		.select("#svg")
		.append("g")
		.attr("id", "circleCartogram")
		.attr("class", "visType");

	// map prep projection path etc
	const mapAR = 1.884; // aspect ratio of map
	const mapInitSize =
		params.initSize.w / params.initSize.h < mapAR
			? [params.initSize.w, params.initSize.w / mapAR]
			: [params.initSize.h * mapAR, params.initSize.h];
	const projection = d3
		.geoEqualEarth()
		.rotate([-20, 0, 0])
		.fitSize(mapInitSize, {
			type: "Sphere",
		});

	// circle radius for Dorling/packed circles (slightly bigger)
	const r2 = d3
		.scaleSqrt()
		.domain([0, d3.max(params.map.features, (d) => d.properties.POP_EST)])
		.range([0, Math.sqrt(params.initSize.w * params.initSize.h) / 10]);

	// get Dorling cartogram positions
	// adds/updates d.x and d.y
	let dorlingSimulation = d3
		.forceSimulation(params.map.features)
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
	params.map.features.forEach(function (d) {
		d.properties.dorlingX = d.x;
		d.properties.dorlingY = d.y + 30;
	});

	// draw circles
	let circles = g
		.append("g")
		.selectAll("circle")
		.data(params.map.features)
		.enter()
		.append("circle")
		.attr("fill", params.circleColor)
		.attr("fill-opacity", 0.3)
		.attr("stroke", params.circleColor)
		.on("mouseover", function (d) {
			d3.select("#tooltip")
				.attr("x", d3.select(this).attr("cx"))
				.attr("y", d3.select(this).attr("cy"))
				.text(d.originalTarget.__data__.properties.ADMIN);
		})
		.on("mouseout", function () {
			d3.select("#tooltip").attr("x", -100).attr("y", -100);
		});
	// r, cx, cy set in resizer function below

	// legend
	// let n = d3.format(".2s");
	let labels = ["1 million", "100 million", "500 million", "1 billion"];
	let tickvals = [1000000, 100000000, 500000000, 1000000000];
	let circleLegend = legendCircle()
		.scale(r2)
		.tickValues(tickvals)
		.tickFormat((d, i, e) => labels[i])
		.tickSize(5); // defaults to 5
	let legend = g.append("g"); // scale will be applied to this g
	legend
		.append("g")
		.attr("transform", "translate(15,375)")
		.call(circleLegend);

	// calculate some things for conditions
	// mapAR is a const
	let pop_vals = params.map.features.map((d) => d.properties.POP_EST);
	let lower_bound = pop_vals.sort((a, b) => a - b)[
		Math.floor(pop_vals.length * 0.1)
	];

	const resize = function (e) {
		// 'stable' Dorling
		const s =
			mapAR > e.x / e.y ? e.x / mapInitSize[0] : e.y / mapInitSize[1];

		// hide base map
		// layerMap.attr("display", "none");
		// if simulation is running, stop it
		// simulation.stop();
		// rescale + move circles to scaled Dorling positions
		circles
			.attr("r", (d) => s * r2(d.properties.POP_EST))
			.attr("cx", (d) => s * d.properties.dorlingX)
			.attr("cy", (d) => s * d.properties.dorlingY);
		// rescale legend
		legend.attr("transform", `scale(${s})`);
		legend.selectAll("text").attr("font-size", 11 / s);
	};

	const constraintCheck = function (e) {
		const s =
			mapAR > e.x / e.y ? e.x / mapInitSize[0] : e.y / mapInitSize[1];
		let containerAR = e.x / e.y;

		// min r - at least 90% of circles visible
		return (
			r2(lower_bound) * s > 1 &&
			// aspect ratio difference - no more than 1/3 white space
			containerAR / mapAR >= 0.67 &&
			containerAR / mapAR <= 1.5
		);
	};

	return { resize: resize, constraintCheck: constraintCheck };
};

visModules.bubbleChart = function (container, params) {
	console.log("drawing bubble chart (bubbleChart)");
	const g = container
		.select("#svg")
		.append("g")
		.attr("id", "bubbleChart")
		.attr("class", "visType");

	// map prep projection path etc
	const mapAR = 1.884; // aspect ratio of map
	const mapInitSize =
		params.initSize.w / params.initSize.h < mapAR
			? [params.initSize.w, params.initSize.w / mapAR]
			: [params.initSize.h * mapAR, params.initSize.h];
	const projection = d3
		.geoEqualEarth()
		.rotate([-20, 0, 0])
		.fitSize(mapInitSize, {
			type: "Sphere",
		});
	let initProjScale = projection.scale();
	let initProjTranslate = projection.translate();

	// simulation for circle packing
	let simulation = d3
		.forceSimulation(params.map.features)
		// 400 iterations
		.alphaDecay(1 - Math.pow(0.001, 1 / 400));

	// draw circles
	let circles = g
		.append("g")
		.selectAll("circle")
		.data(params.map.features)
		.enter()
		.append("circle")
		.attr("fill", (d) => params.colorContinent(d.properties.continent))
		.attr("fill-opacity", 0.3)
		.attr("stroke", (d) => params.colorContinent(d.properties.continent))
		.on("mouseover", function (d) {
			d3.select("#tooltip")
				.attr("x", d3.select(this).attr("cx"))
				.attr("y", d3.select(this).attr("cy"))
				.text(d.originalTarget.__data__.properties.ADMIN);
		})
		.on("mouseout", function () {
			d3.select("#tooltip").attr("x", -100).attr("y", -100);
		});

	const resize = function (e) {
		// constantly updating circle packing
		let r = d3
			.scaleSqrt()
			.domain([
				0,
				d3.max(params.map.features, (d) => d.properties.POP_EST),
			])
			.range([0, d3.min([Math.sqrt(e.x * e.y) / 5, e.x / 2, e.y / 2])]);

		// keep simulation running constantly
		// forces depend on container
		simulation
			.force(
				"x",
				d3.forceX(
					(d) =>
						(e.x / params.maxSize.w) *
						projection(d.properties.centroid)[0]
				)
			)
			.force(
				"y",
				d3.forceY(
					(d) =>
						(e.y / params.maxSize.h) *
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
			// console.log("tick");
			circles
				.attr("r", (d) => r(d.properties.POP_EST))
				.attr("cx", function (d) {
					return (d.x = Math.max(
						r(d.properties.POP_EST),
						Math.min(e.x - r(d.properties.POP_EST), d.x)
					));
				})
				.attr("cy", function (d) {
					return (d.y = Math.max(
						r(d.properties.POP_EST),
						Math.min(e.y - r(d.properties.POP_EST), d.y)
					));
				});
		}
	};

	const constraintCheck = function () {
		return true;
	};

	return { resize: resize, constraintCheck: constraintCheck };
};
