"use strict";

// load data
Promise.all([d3.json("data/americas.geojson")]).then(function (data) {
	let geo = data[0];
	console.log(geo);

	// color for all circles
	const circleColor = (d) => "#D9632B"; //"#C53838";
	// colors for circles colored by continent
	const continents = ["North America", "South America"];
	// from ColorBrewer 6-class Set1
	const continent_colors = ["#984ea3", "#FFE600"];

	const colorContinent = (d) =>
		d3.scaleOrdinal().domain(continents).range(continent_colors)(
			d.properties.continent
		);

	// configure legend
	const legendTickValues = [1000000, 50000000, 150000000, 300000000];
	const legendTickFormat = (d, i) => d / 1000000 + " million";

	// initialise responsive vis with parameters
	responsiveVis({
		visTypes: [
			{
				type: "circleMap",
				params: {
					projection: d3.geoEqualEarth().rotate([90, 0]),
					circleColor: circleColor,
					legendTickValues: legendTickValues,
					legendTickFormat: legendTickFormat,
				},
			},
			{
				type: "circleCartogram",
				params: {
					projection: d3.geoEqualEarth().rotate([90, 0]),
					circleColor: circleColor,
					legendTickValues: legendTickValues,
					legendTickFormat: legendTickFormat,
				},
			},
			{
				type: "bubbleChart",
				params: {
					circleColor: colorContinent,
				},
			},
		],
		initSize: { w: 1000, h: 600 },
		title: "Population of the Americas by Country",
		map: geo,
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
