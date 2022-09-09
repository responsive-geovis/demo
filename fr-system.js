"use strict";

function responsiveVis(params) {
	// init function

	// to handle js-generated events
	d3.select("body")
		.append("div")
		.attr("id", "eventHandler")
		.attr("class", "input hidden");

	// default parameters
	params.initSize = params.initSize ? params.initSize : { w: 600, h: 600 };
	params.maxSize = params.maxSize ? params.maxSize : { w: 1000, h: 1000 };
	params.minSize = params.minSize ? params.minSize : { w: 25, h: 25 };
	params.container = params.container ? params.container : "#container";
	// throw warning if vistypes is undefined

	const con = d3
		.select(params.container)
		.style("width", params.initSize.w + "px")
		.style("height", params.initSize.h + "px")
		.style("max-width", params.maxSize.w + "px")
		.style("max-height", params.maxSize.h + "px")
		.style("min-width", params.minSize.w + "px")
		.style("min-height", params.minSize.h + "px");

	const svg = con
		.append("svg")
		.attr("id", "svg")
		.attr("width", params.maxSize.w)
		.attr("height", params.maxSize.h);

	const overlay = con.append("div").attr("id", "svg-overlay");
	const tooltip = svg.append("text").attr("id", "tooltip");

	// initalise all selected vis types
	params.visTypes.forEach(function (d) {
		let v = visModules[d.type](con, params);
		d.adapt = v.adapt;
		d.conditions = v.conditions;
	});

	// listen to resize events and resize
	resizeObserver(params);

	return params;
}

function resizeObserver(params, adaptRules) {
	const divElem = document.querySelector(params.container);

	const resizeObserver = new ResizeObserver((entries) => {
		for (let entry of entries) {
			if (entry.contentBoxSize) {
				// Firefox implements `contentBoxSize` as a single content rect, rather than an array
				const contentBoxSize = Array.isArray(entry.contentBoxSize)
					? entry.contentBoxSize[0]
					: entry.contentBoxSize;

				var w = contentBoxSize.inlineSize;
				var h = contentBoxSize.blockSize;

				// update info table
				d3.select("#widthOutput").html(Math.round(w));
				d3.select("#heightOutput").html(Math.round(h));
				d3.select("#arOutput").html(Math.round((w / h) * 100) / 100);
				d3.select("#areaOutput").html(Math.round(w * h));

				// reset/hide tooltip just in case
				d3.select("#tooltip").attr("x", -100).attr("y", -100).text("");

				// update vis
				// check in order of priority if constraints are fulfilled
				for (let i = 0; i < params.visTypes.length; i++) {
					let vis = params.visTypes[i];
					if (vis.conditions({ x: w, y: h })) {
						displayVis(vis.type);
						vis.adapt({ x: w, y: h });
						break;
					}
				}
			} else {
				// need to figure out why this part is necessary?? does contentBoxSize not always exist?
				// h1Elem.style.fontSize = Math.max(1.5, entry.contentRect.width / 200) + 'rem';
				// pElem.style.fontSize = Math.max(1, entry.contentRect.width / 600) + 'rem';
			}
		}
	});

	resizeObserver.observe(divElem);
}

// show a specific state and hide all others
function displayVis(vis) {
	d3.selectAll(".visType").attr("display", "none");
	d3.select("#" + vis).attr("display", null);
}
