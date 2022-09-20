"use strict";

let vis;

//load data
Promise.all([
	d3.json("data/merged.json"),
	d3.json("data/test.hexjson"),
	d3.csv("data/HoC-GE2019-results-by-constituency-csv.csv"),
]).then(function (data) {
	// console.log(data);

	const map = data[0];
	const hex = data[1];
	const results = data[2];

	// pull results only from map file:
	// const results = {};
	// map.objects.geotheory_uk_2016_eu_referendum_with_ni.geometries.forEach(
	// 	function (d) {
	// 		results[d.properties.area_cd] = d.properties;
	// 	}
	// );
	// console.log(results); // saved to referendum_vote.json

	const categories = [
		"Con",
		"Lab",
		"SNP",
		"LD",
		"DUP",
		"SF",
		"PC",
		"SDLP",
		"Green",
		"Alliance",
		"Spk",
	];
	const colors = [
		"#0575c9",
		"#e91d0e",
		"#f8ed2e",
		"#efac18",
		"#b51c4b",
		"#159b78",
		"#13e594",
		"#224922",
		"#5fb25f",
		"#d6b429",
		"#d4cfbe",
	];
	const category_labels = [
		"Conservative",
		"Labour",
		"Scottish National Party",
		"Liberal Democrat",
		"Democratic Unionist Party",
		"Sinn Féin",
		"Plaid Cymru",
		"Social Democratic & Labour Party",
		"Green",
		"Alliance Party",
		"Speaker",
	];

	let colorScale = d3.scaleOrdinal().domain(categories).range(colors);

	// initialise responsive vis with parameters
	vis = responsiveVis({
		viewStates: [
			{
				type: "choropleth",
				params: {
					projection: d3.geoAlbers().rotate([0, 0]),
					legendPosition: [280, 115], // relative to initSize
					conditions: {
						minAreaSize: 2,
						minAreaFilter: (d) =>
							d.properties.id.slice(0, 1) === "S",
						maxAspectRatioDiff: 2,
					},
				},
			},
			{
				type: "hexmap",
				params: {
					conditions: {
						minHexSize: 5,
						maxAspectRatioDiff: 2,
					},
				},
			},
			{ type: "wafflechart", params: {} },
		],
		initSize: { w: 700, h: 700 },
		minSize: { w: 150, h: 150 },
		title: "UK General Election 2019",
		map: data[0],
		hex: data[1],
		data: data[2],
		categories: categories,
		colors: colors,
		category_labels: category_labels,
		collection: "merged",
		map_id: (d) => d.properties.id,
		hex_id: (d) => d.key,
		data_id: (d) => d.ons_id,
		colorScale: colorScale,
		values: (d) => d.first_party,
		// values: (d) => (d ? d.pct_rmn - d.pct_lev : undefined),
		// name: (feature) => feature.properties.HBName,
	});
});
