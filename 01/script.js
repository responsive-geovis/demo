"use strict";

// load data
Promise.all([
	d3.json("data/ne_110m_admin_0_countries_lakes.json"),
	d3.csv("data/continents.csv"),
]).then(function (data) {
	// console.log(data);

	let topo = data[0];
	let continents_list = data[1];

	// convert topojson to geojson
	const geo = topojson.feature(
		topo,
		topo.objects.ne_110m_admin_0_countries_lakes
	);
	// get centroids + add continent
	// to do - check in beginning of each func that needs centroids if they've been added yet, then add if not (?)
	geo.features.forEach((feature) => {
		feature.properties.centroid = centroid(feature);
		// console.log(feature.properties.ISO_A3);
		feature.properties.continent = continents_list.find(
			(d) => d.iso == feature.properties.ISO_A3
		).continent;
		return feature;
	});

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

	// initialise responsive vis with parameters
	responsiveVis({
		visTypes: [
			{ type: "circleMap", params: [] },
			{ type: "circleCartogram", params: [] },
			{ type: "bubbleChart", params: [] },
		],
		initSize: { w: 1000, h: 600 },
		title: "World Population by Country",
		map: geo,
		circleColor: circleColor,
		colorContinent: colorContinent,
		// map: data[0],
		// hex: data[1],
		// data: data[2],
		// categories: categories,
		// colors: colors,
		// category_labels: category_labels,
		// collection: "merged",
		// map_id: (d) => d.properties.id,
		// hex_id: (d) => d.key,
		// data_id: (d) => d.ons_id,
		// colorScale: colorScale,
		// values: (d) => d.first_party,
		// values: (d) => (d ? d.pct_rmn - d.pct_lev : undefined),
		// name: (feature) => feature.properties.HBName,
	});
});
