// update table with container status

resizeObserver("#container");

function resizeObserver(container) {
	const divElem = document.querySelector(container);

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

				// update vis
				// check in order of priority if constraints are fulfilled
				// for (let i = 0; i < params.visTypes.length; i++) {
				// 	let vis = params.visTypes[i];
				// 	if (resizers[vis].constraintCheck({ x: w, y: h })) {
				// 		displayVis(vis);
				// 		resizers[vis].resize({ x: w, y: h });
				// 		break;
				// 	}
				// }

				// resizeVis({ x: w, y: h }, params);
				// var vis = "choropleth";
				// resizers[vis]({ x: w, y: h }, params);
			} else {
				// need to figure out why this part is necessary?? does contentBoxSize not always exist?
				// h1Elem.style.fontSize = Math.max(1.5, entry.contentRect.width / 200) + 'rem';
				// pElem.style.fontSize = Math.max(1, entry.contentRect.width / 600) + 'rem';
			}
		}
	});

	resizeObserver.observe(divElem);
}
