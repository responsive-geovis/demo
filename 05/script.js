"use strict";

//load data
Promise.all([
	d3.json("data/france-metro-topo.json"),
	// d3.json(""),
	d3.csv("data/france-metro-results.csv"),
]).then(function (data) {
	console.log(data);

	const collection = "france-metro";

	const map = data[0];
	// const hex = data[1];
	const results = data[1];

	// add ID
	results.forEach((d) => {
		d.id = d.Dept_code + d.Circ_code;
	});
	map.objects[collection].geometries.forEach((d) => {
		d.properties.id2 =
			d.properties.code_dpt.padStart(3, "0") +
			d.properties.num_circ.padStart(2, "0");
	});

	// check IDs match
	let id_map = map.objects[collection].geometries.map(
		(d) => d.properties.id2
	);
	//console.log(id_map);
	let id_results = results.map((d) => d.id);
	//console.log(id_results);
	console.log("Map IDs without associated results:");
	id_map.forEach((d) => {
		if (id_results.indexOf(d) === -1) {
			console.log(d);
		}
	});

	// "Code du département": "05")

	// pull results only from map file:
	// const results = {};
	// map.objects.geotheory_uk_2016_eu_referendum_with_ni.geometries.forEach(
	// 	function (d) {
	// 		results[d.properties.area_cd] = d.properties;
	// 	}
	// );
	// console.log(results); // saved to referendum_vote.json

	const categories = [
		"DLF",
		"DVD",
		"DVG",
		"Ensemble",
		"FaC",
		"NUPES",
		"PNC",
		"PRG",
		"RN",
		"UDC",
	];

	const colors = [
		"#0087CD",
		"#ADC1FD",
		"#FFC0C0",
		"#FFD600",
		"#FFD700",
		"#BB1840",
		"#FF8C00",
		"#F0C200",
		"#004A77",
		"#0066CC",
	];
	const category_labels = [
		"DLF",
		"DVD",
		"DVG",
		"Ensemble",
		"FaC",
		"NUPES",
		"PNC",
		"PRG",
		"RN",
		"UDC",
	];

	let colorScale = d3.scaleOrdinal().domain(categories).range(colors);

	// initialise responsive vis with parameters
	responsiveVis({
		visTypes: [
			{
				type: "choropleth",
				params: {
					projection: d3.geoConicConformal().parallels([44, 49]), // Lambert-93
					legendPosition: [0, 350], // relative to initSize
					conditions: {
						minAreaSize: 0, // disable condition
					},
				},
			},
		], //"hexmap", "wafflechart"],
		initSize: { w: 700, h: 700 },
		title: "French Legislative Election 2022",
		map: map,
		// hex: data[1],
		data: results,
		categories: categories,
		colors: colors,
		category_labels: category_labels,
		collection: collection,
		map_id: (d) => d.properties.id2,
		// hex_id: (d) => d.key,
		data_id: (d) => d.id,
		colorScale: colorScale,
		values: (d) => d.Party,
		// values: (d) => (d ? d.pct_rmn - d.pct_lev : undefined),
		// name: (feature) => feature.properties.HBName,
	});
});
