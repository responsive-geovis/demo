// used for choropleth
function areasize(feature, path) {
	// Find the size of the largest polygon in sq px
	// Source: https://observablehq.com/d/47c257e62a34b61d
	const geometry = feature.geometry;
	if (geometry.type === "Polygon") {
		return path.area(feature);
	} else {
		let largestPolygon = {},
			largestArea = 0;
		geometry.coordinates.forEach((coordinates) => {
			const polygon = { type: "Polygon", coordinates },
				area = path.area(polygon);
			if (area > largestArea) {
				largestPolygon = polygon;
				largestArea = area;
			}
		});
		return path.area(largestPolygon);
	}
}

// used for hex map, choropleth
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
