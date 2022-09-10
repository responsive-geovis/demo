"use strict";

//load data from data.json
d3.json("data.json").then(function (scotmap) {
	// initalize selected visualizations
	responsiveVis({
		visTypes: ["choropleth", "gridmap", "summary"],
		data: scotmap,
		colorScale: d3.scaleSequential(d3.interpolateBlues).domain([0, 100]),
		initSize: { w: 700, h: 700 },
		projection: d3.geoAlbers().rotate([0, 0]),
		name: (feature) => feature.properties.HBName,
	});
});
