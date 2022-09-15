"use strict";

// different vis modules can be added to this object
const visModules = {};

// TEMPLATE
// visModules.barchart = function (container, params) {
// 	const g = container
// 		.select("#svg")
// 		.append("g")
// 		.attr("id", "barchart")
// 		.attr("class", "visType");

// 	const adapt = function (e) {};

// 	const conditions = function () {
// 		return true;
// 	};

// 	return { adapt: adapt, conditions: conditions };
// };

visModules.choropleth = function (container, params) {
	// parameters specifically for this vis type
	let local = params.visTypes.find((d) => d.type === "choropleth");
	let params_local = local.params;

	const projection = params_local.projection;

	// create g for choropleth
	const g = container
		.select("#svg")
		.append("g")
		.attr("id", "choropleth")
		.attr("class", "visType");

	// g elements for filled polygons + mesh on top
	const polygons_g = g.append("g").attr("id", "polygons");
	const mesh_g = g.append("g").attr("id", "mesh");
	const legend = g.append("g").attr("id", "legend");

	// convert topojson to geojson (individual area polygons)
	const geo = topojson.feature(
		params.map,
		params.map.objects[params.collection]
	);
	// create mesh for drawing outlines
	const mesh = topojson.mesh(params.map);
	// get correct size for projection
	projection.fitSize([params.initSize.w, params.initSize.h], mesh);
	const path = d3.geoPath(projection);

	// draw mesh first to get size + aspect ratio
	mesh_g.datum(mesh).append("path").attr("class", "mapMesh").attr("d", path);
	const mapInitBBox = mesh_g.node().getBBox();
	const mapAR = mapInitBBox.width / mapInitBBox.height;

	// make map align with top left corner
	polygons_g.attr(
		"transform",
		`translate(${-mapInitBBox.x},${-mapInitBBox.y})`
	);
	mesh_g.attr("transform", `translate(${-mapInitBBox.x},${-mapInitBBox.y})`);

	// get area sizes
	geo.features.forEach((feature) => {
		feature.area = areasize(feature, path);
		return feature;
	});

	// get smallest area

	let filterFunc =
		typeof local.params.conditions.minAreaFilter === "function"
			? local.params.conditions.minAreaFilter
			: (d) => true;
	console.log(geo.features);
	const minArea = d3.min(geo.features.filter(filterFunc), (d) => d.area);
	console.log(minArea);
	// console.log(
	// 	minArea
	// 	// params.name(geo.features[d3.minIndex(geo.features, (d) => d.area)])
	// );

	// draw coloured regions
	polygons_g
		.selectAll(".area")
		.data(geo.features)
		.enter()
		.append("path")
		.attr("class", "area")
		.attr("id", (d) => params.map_id(d))
		.attr("d", path)
		.style("fill", (d) => {
			let result = params.data.find(
				(x) => params.data_id(x) === params.map_id(d)
			);
			return result ? params.colorScale(params.values(result)) : "#000";
		});

	// draw mesh on top
	mesh_g
		.select(".mapMesh")
		.attr("d", path)
		.style("fill", "transparent")
		.style("stroke", "#fff")
		.style("stroke-width", "0.5px");

	// position + draw legend on top
	legend
		.attr(
			"transform",
			`translate(${params_local.legendPosition[0]},${params_local.legendPosition[1]})`
		)
		.call(drawLegend, params.colors, params.category_labels, params.title);

	const adapt = function (e) {
		// compute scale + translate so that map is always at max size, centered within the container
		const s =
			mapAR > e.x / e.y
				? e.x / mapInitBBox.width
				: e.y / mapInitBBox.height;
		const t =
			mapAR < e.x / e.y
				? [(e.x - s * mapInitBBox.width) / 2, 0]
				: [0, (e.y - s * mapInitBBox.height) / 2];
		g.attr("transform", `translate(${t[0]},${t[1]}) scale(${s})`);
		d3.select(".mapMesh").style("stroke-width", `${0.5 / s}px`);
	};

	const conditions = function (e) {
		// check size of smallest region
		const s =
			mapAR > e.x / e.y
				? e.x / mapInitBBox.width
				: e.y / mapInitBBox.height;
		const containerAR = e.x / e.y;

		return (
			minArea * s > params_local.conditions.minAreaSize &&
			// aspect ratio difference
			containerAR / mapAR >=
				1 / local.params.conditions.maxAspectRatioDiff &&
			containerAR / mapAR <= local.params.conditions.maxAspectRatioDiff
		);
	};

	return { adapt: adapt, conditions: conditions };
};

visModules.hexmap = function (container, params) {
	let local = params.visTypes.find((d) => d.type === "hexmap");

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

	// get width of first hex (which is the same as all others)
	let hexWidth =
		d3.max(hexes[0].vertices, (d) => d.x) -
		d3.min(hexes[0].vertices, (d) => d.x);

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
		.attr("class", "hex")
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

	console.log(hexmap);

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

	// get size of hex, check for min hex size

	const adapt = function (e) {
		const s = hexAR > e.x / e.y ? e.x / hexInitSize.w : e.y / hexInitSize.h;
		g.attr("transform", `scale(${s})`);
		// d3.select(".mapMesh").style("stroke-width", `${0.5 / s}px`);
	};

	const conditions = function (e) {
		const s = hexAR > e.x / e.y ? e.x / hexInitSize.w : e.y / hexInitSize.h;
		const containerAR = e.x / e.y;

		return (
			hexWidth * s > local.params.conditions.minHexSize &&
			// aspect ratio difference
			containerAR / hexAR >=
				1 / local.params.conditions.maxAspectRatioDiff &&
			containerAR / hexAR <= local.params.conditions.maxAspectRatioDiff
		);
	};

	return { adapt: adapt, conditions: conditions };
};

// waffle chart
visModules.wafflechart = function (container, params) {
	const g = container
		.select("#svg")
		.append("g")
		.attr("id", "wafflechart")
		.attr("class", "visType");

	const countries = ["Scotland", "Northern Ireland", "Wales", "England"].map(
		(d) => ({
			country: d,
			data: params.data
				.filter((el) => el.country_name === d)
				.sort((a, b) => a.first_party > b.first_party),
		})
	);

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

	const adapt = function (e) {
		// compute new sizes/grid
		let label = 30; // could update this step-wise?
		let margin = 5;
		let w = e.x - margin * 2;
		let h = e.y - label * n_categories - margin * 2; // 20px for each header, 5px *2 for margins
		let size = Math.floor(Math.sqrt(((w * h) / n_datapoints) * 0.7)); // spare space
		let padding = Math.ceil(size * 0.15);
		let wn = Math.floor(w / (size + padding));

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

	const conditions = function () {
		return true;
	};

	return { adapt: adapt, conditions: conditions };
};

visModules.circleMap = function (container, params) {
	// parameters specifically for this vis type
	let local = params.visTypes.find((d) => d.type === "circleMap");
	let params_local = local.params;

	const projection = params_local.projection;

	// create g for circle map
	const g = container
		.select("#svg")
		.append("g")
		.attr("id", "circleMap")
		.attr("class", "visType");
	const map = g.append("g").attr("id", "map");
	const circles = g.append("g").attr("id", "circles");
	const legend = g.append("g").attr("id", "legend");

	// const mapInitSize =
	// 	params.initSize.w / params.initSize.h < mapAR
	// 		? [params.initSize.w, params.initSize.w / mapAR]
	// 		: [params.initSize.h * mapAR, params.initSize.h];

	// fit projection to container + geo data
	projection.fitSize([params.initSize.w, params.initSize.h], params.map);
	const path = d3.geoPath(projection);

	// draw map
	map.selectAll(".country")
		.data(params.map.features)
		.enter()
		.append("path")
		.attr("class", "country")
		.attr("id", (d) => d.properties.ISO_A3)
		.attr("d", path)
		.attr("fill", "#f5f5f5")
		.attr("stroke", "#e0e0e0");

	// get initial bbox of map + compute aspect ratio
	const mapInitBBox = map.node().getBBox();
	const mapAR = mapInitBBox.width / mapInitBBox.height;

	// make map + circles align with top left corner
	// will be centered in adapt function
	map.attr("transform", `translate(${-mapInitBBox.x},${-mapInitBBox.y})`);
	circles.attr("transform", `translate(${-mapInitBBox.x},${-mapInitBBox.y})`);

	// circle radius for prop circle map
	const r = d3
		.scaleSqrt()
		.domain([0, d3.max(params.map.features, (d) => d.properties.POP_EST)])
		.range([0, Math.sqrt(params.initSize.w * params.initSize.h) / 13]);

	// draw circles
	circles
		.selectAll("circle")
		.data(params.map.features)
		.enter()
		.append("circle")
		.attr("r", (d) => r(d.properties.POP_EST))
		.attr("cx", (d) => projection(d.properties.centroid)[0])
		.attr("cy", (d) => projection(d.properties.centroid)[1])
		.attr("fill", params_local.circleColor)
		.attr("fill-opacity", 0.4)
		.attr("stroke", params_local.circleColor)
		.on("mouseover", function (d) {
			d3.select("#tooltip")
				.attr("x", d3.select(this).attr("cx"))
				.attr("y", d3.select(this).attr("cy"))
				.text(d.originalTarget.__data__.properties.ADMIN);
		})
		.on("mouseout", function () {
			d3.select("#tooltip").attr("x", -100).attr("y", -100);
		});

	// legend
	// let n = d3.format(".2s"); // number formatting
	let circleLegend = legendCircle()
		.scale(r)
		.tickValues(params_local.legendTickValues)
		.tickFormat(
			(d, i, e) => params_local.legendTickFormat(d, i, e)
			// do this to add label to last one
			// i === e.length - 1 ? d + " bushels of hay" : d
		)
		.tickSize(5); // defaults to 5

	legend.call(circleLegend);

	// position legend in bottom left of map area
	// get size of legend
	const legendBBox = legend.node().getBBox();
	legend.attr(
		"transform",
		`translate(${5},${mapInitBBox.height - legendBBox.height - 5})`
	);
	// for custom positioning
	// .attr("transform", `translate(${params_local.legendPosition[0]},${params_local.legendPosition[1]})`)

	// calculate some things for conditions
	let pop_vals = params.map.features.map((d) => d.properties.POP_EST);
	let lower_bound = pop_vals.sort((a, b) => a - b)[
		Math.floor(pop_vals.length * 0.1)
	];

	const adapt = function (e) {
		// compute scale + translate so that map is always at max size, centered within the container
		const s =
			mapAR > e.x / e.y
				? e.x / mapInitBBox.width
				: e.y / mapInitBBox.height;
		const t =
			mapAR < e.x / e.y
				? [(e.x - s * mapInitBBox.width) / 2, 0]
				: [0, (e.y - s * mapInitBBox.height) / 2];
		// g contains map, circles, and legend
		g.attr("transform", `translate(${t[0]},${t[1]}) scale(${s})`);
		map.attr("stroke-width", `${0.7 / s}px`);
		circles.attr("stroke-width", `${1 / s}px`);

		// rescale legend
		circleLegend.adapt(s);
	};

	const conditions = function (e) {
		let s =
			mapAR > e.x / e.y
				? e.x / mapInitBBox.width
				: e.y / mapInitBBox.height;
		let containerAR = e.x / e.y;

		return (
			// min r - at least 90% of circles visible
			r(lower_bound) * s > local.params.conditions.minCircleRadius &&
			// aspect ratio difference - no more than 1/3 white space
			containerAR / mapAR >=
				1 / local.params.conditions.maxAspectRatioDiff &&
			containerAR / mapAR <= local.params.conditions.maxAspectRatioDiff
		);
	};

	return { adapt: adapt, conditions: conditions };
};

visModules.circleCartogram = function (container, params) {
	// parameters specifically for this vis type
	let local = params.visTypes.find((d) => d.type === "circleCartogram");
	let params_local = local.params;

	const projection = params_local.projection;

	// g for cartogram
	const g = container
		.select("#svg")
		.append("g")
		.attr("id", "circleCartogram")
		.attr("class", "visType");
	const circles = g.append("g").attr("id", "circles");
	const legend = g.append("g").attr("id", "legend");

	// fit projection to container + geo data
	projection.fitSize([params.initSize.w, params.initSize.h], params.map);

	// circle radius for Dorling/packed circles (slightly bigger)
	const r = d3
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
			d3.forceCollide((d) => r(d.properties.POP_EST))
		)
		.stop();
	dorlingSimulation.tick(200);
	params.map.features.forEach(function (d) {
		d.properties.dorlingX = d.x;
		d.properties.dorlingY = d.y + 30;
	});

	// draw circles
	circles
		.selectAll("circle")
		.data(params.map.features)
		.enter()
		.append("circle")
		.attr("fill", (d) => params_local.circleColor(d))
		.attr("fill-opacity", 0.4)
		.attr("r", (d) => r(d.properties.POP_EST))
		.attr("cx", (d) => d.properties.dorlingX)
		.attr("cy", (d) => d.properties.dorlingY)
		.attr("stroke", params_local.circleColor)
		.on("mouseover", function (d) {
			d3.select("#tooltip")
				.attr("x", d3.select(this).attr("cx"))
				.attr("y", d3.select(this).attr("cy"))
				.text(d.originalTarget.__data__.properties.ADMIN);
		})
		.on("mouseout", function () {
			d3.select("#tooltip").attr("x", -100).attr("y", -100);
		});

	// get initial bbox of circles + compute aspect ratio
	const mapInitBBox = circles.node().getBBox();
	const mapAR = mapInitBBox.width / mapInitBBox.height;

	// make circles align with top left corner
	// will be centered in adapt function
	circles.attr("transform", `translate(${-mapInitBBox.x},${-mapInitBBox.y})`);

	// legend
	// let n = d3.format(".2s"); // number formatting
	let circleLegend = legendCircle()
		.scale(r)
		.tickValues(params_local.legendTickValues)
		.tickFormat(
			(d, i, e) => params_local.legendTickFormat(d, i, e)
			// do this to add label to last one
			// i === e.length - 1 ? d + " bushels of hay" : d
		)
		.tickSize(5); // defaults to 5
	legend.call(circleLegend);

	// position legend in bottom left of map area
	// get size of legend
	const legendBBox = legend.node().getBBox();
	legend.attr(
		"transform",
		`translate(${local.params.legendPosLeft},${
			mapInitBBox.height - legendBBox.height - 5
		})`
	);
	// for custom positioning
	// .attr("transform", `translate(${params_local.legendPosition[0]},${params_local.legendPosition[1]})`)

	// calculate some things for conditions
	// mapAR is a const
	let pop_vals = params.map.features.map((d) => d.properties.POP_EST);
	let lower_bound = pop_vals.sort((a, b) => a - b)[
		Math.floor(pop_vals.length * 0.1)
	];

	const adapt = function (e) {
		// compute scale + translate so that map is always at max size, centered within the container
		const s =
			mapAR > e.x / e.y
				? e.x / mapInitBBox.width
				: e.y / mapInitBBox.height;
		const t =
			mapAR < e.x / e.y
				? [(e.x - s * mapInitBBox.width) / 2, 0]
				: [0, (e.y - s * mapInitBBox.height) / 2];
		// g contains map, circles, and legend
		g.attr("transform", `translate(${t[0]},${t[1]}) scale(${s})`);
		circles.attr("stroke-width", `${1 / s}px`);

		// rescale legend
		circleLegend.adapt(s);
	};

	const conditions = function (e) {
		const s =
			mapAR > e.x / e.y
				? e.x / mapInitBBox.width
				: e.y / mapInitBBox.height;
		let containerAR = e.x / e.y;

		// min r - at least 90% of circles visible
		return (
			// min r - at least 90% of circles visible
			r(lower_bound) * s > local.params.conditions.minCircleRadius &&
			// aspect ratio difference - no more than 1/3 white space
			containerAR / mapAR >=
				1 / local.params.conditions.maxAspectRatioDiff &&
			containerAR / mapAR <= local.params.conditions.maxAspectRatioDiff
		);
	};

	return { adapt: adapt, conditions: conditions };
};

visModules.geoPackedCircles = function (container, params) {
	// parameters specifically for this vis type
	let params_local = params.visTypes.find(
		(d) => d.type === "geoPackedCircles"
	).params;

	const projection = params_local.projection;

	const g = container
		.select("#svg")
		.append("g")
		.attr("id", "geoPackedCircles")
		.attr("class", "visType");

	// doesn't really matter since it will be scaled anyway
	// but easier to have all >0 coordinates
	projection.fitSize([1000, 1000], params.map);

	// project all centroids and create simplified dataset
	// no more projecting later on
	const data = params.map.features.map((d) => {
		d.properties.centroid_proj = projection(d.properties.centroid);
		return d.properties;
	});

	// for uniform distribution...
	// temp0.sort((a,b) => a.centroid_proj[0] > b.centroid_proj[0]).forEach((d,i) => {d.uniform_x = i})

	// get 'bbox' of centroids
	const bbox = {
		minX: d3.min(data, (d) => d.centroid_proj[0]),
		minY: d3.min(data, (d) => d.centroid_proj[1]),
		maxX: d3.max(data, (d) => d.centroid_proj[0]),
		maxY: d3.max(data, (d) => d.centroid_proj[1]),
	};

	// draw circles
	const circles = g
		.append("g")
		.attr("id", "circles")
		.selectAll("circle")
		.data(data)
		.enter()
		.append("circle")
		.attr("fill", params_local.circleColor)
		.attr("fill-opacity", 0.4)
		.attr("stroke", params_local.circleColor)
		.on("mouseover", function (d) {
			d3.select("#tooltip")
				.attr("x", d3.select(this).attr("cx"))
				.attr("y", d3.select(this).attr("cy"))
				.text(d.originalTarget.__data__.ADMIN);
		})
		.on("mouseout", function () {
			d3.select("#tooltip").attr("x", -100).attr("y", -100);
		});
	// r, cx, cy set in adapt function below

	const adapt = function (e) {
		let r = d3
			.scaleSqrt()
			.domain([0, d3.max(data, (d) => d.POP_EST)])
			.range([0, d3.min([Math.sqrt(e.x * e.y) / 5, e.x / 2, e.y / 2])]);

		let x = d3.scaleLinear().domain([bbox.minX, bbox.maxX]).range([0, e.x]);
		let y = d3.scaleLinear().domain([bbox.minY, bbox.maxY]).range([0, e.y]);

		// run a fresh simulation every time
		let simulation = d3
			.forceSimulation(data)
			.force("x", d3.forceX((d) => x(d.centroid_proj[0])).strength(0.02))
			.force("y", d3.forceY((d) => y(d.centroid_proj[1])).strength(0.02))
			.force("collide", d3.forceCollide((d) => r(d.POP_EST)).strength(1))
			.force(
				"bounds",
				forceBoundingBox(0, 0, e.x, e.y, (d) => r(d.POP_EST))
			)
			.stop();

		simulation.tick(300);

		// .on("tick", tick)
		// .alpha(1)
		// .restart();

		// function tick() {
		// console.log("tick");
		circles
			.attr("r", (d) => r(d.POP_EST))
			.attr("cx", (d) => d.x)
			.attr("cy", (d) => d.y);
		// .attr("cy", function (d) {
		// 	return (d.y = Math.max(
		// 		r(d.POP_EST),
		// 		Math.min(e.y - r(d.POP_EST), d.y)
		// 	));
		// });
		// }
	};

	const conditions = function () {
		return true;
	};

	return { adapt: adapt, conditions: conditions };
};
