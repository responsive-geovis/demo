"use strict";

// make an init function that creates and returns the projection function and any parameters I need

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
