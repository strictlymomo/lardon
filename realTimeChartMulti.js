'use strict';

function realTimeChartMulti() {

	let datum, data,
		maxSeconds, pixelsPerSecond = 10,
		svgWidth = 700, svgHeight = 300,
		margin = { top: 20, bottom: 20, left: 100, right: 30, topNav: 10, bottomNav: 20 },
		dimension = { xAxis: 20, yAxis: 20, xTitle: 20, yTitle: 20, navChart: 70 },
		yTitle, xTitle,
		drawXAxis = true, drawYAxis = true, drawNavChart = true,
		border,
		selection,
		yDomain = [],
		debug = false,
		halted = false,
		x, y,
		xNav, yNav,
		width, height,
		widthNav, heightNav,
		xAxisG, yAxisG,
		xAxis, yAxis,
		svg,
		backgroundColor,
		offset,
		headSlotTimeOffset,
		showRoots = false,
		showProposers = false,
		showAttestations = false,
		store,
		radius = 4;

	/* 	------------------------------------------------------------------------------------
		create the chart
		------------------------------------------------------------------------------------ */

	let chart = function (s) {
		selection = s;
		if (selection == undefined) {
			console.error("selection is undefined");
			return;
		};

		// process titles
		xTitle = xTitle || "";
		yTitle = yTitle || "";
		backgroundColor = backgroundColor || "#0f1927";

		// process time
		maxSeconds = maxSeconds || 300;
		headSlotTimeOffset = headSlotTimeOffset || 0;

		// compute component dimensions
		let xTitleDim = xTitle == "" ? 0 : dimension.xTitle,
			yTitleDim = yTitle == "" ? 0 : dimension.yTitle,
			xAxisDim = !drawXAxis ? 0 : dimension.xAxis,
			yAxisDim = !drawYAxis ? 0 : dimension.yAxis,
			navChartDim = !drawNavChart ? 0 : dimension.navChart;

		// compute dimension of main and nav charts, and offsets
		let marginTop = margin.top;
		height = svgHeight - marginTop - margin.bottom - xTitleDim - xAxisDim - navChartDim + 15;
		heightNav = navChartDim - margin.topNav - margin.bottomNav;
		let marginTopNav = svgHeight - margin.bottom - heightNav - margin.topNav;
		width = svgWidth - margin.left - margin.right;
		widthNav = width;
		offset = 4;

		// append the svg
		svg = selection.append("svg")
			.attr("width", svgWidth)
			.attr("height", svgHeight)
			.style("border", () => border ? "1px solid #e2e8f0" : null);

		/* 	------------------------------------------------------------------------------------
			create main chart
			------------------------------------------------------------------------------------ */

		// create main group and translate
		let main = svg.append("g")
			.attr("transform", "translate (" + margin.left + "," + marginTop + ")");

		// define clip-path
		main.append("defs").append("clipPath")
			.attr("id", "myClip")
			.append("rect")
			.attr("x", 0)
			.attr("y", -radius)
			.attr("width", width)
			.attr("height", height + radius * 2);

		// create chart background
		main.append("rect")
			.attr("x", 0)
			.attr("y", 0)
			.attr("width", width)
			.attr("height", height)
			.style("fill", backgroundColor);

		/* 	----------------------------------------
			create axes & labels
			---------------------------------------- */

		// add group for x axis
		xAxisG = main.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + height + ")");

		// add group for y axis
		yAxisG = main.append("g")
			.attr("class", "y axis");

		// in x axis group, add x axis title
		xAxisG.append("text")
			.attr("class", "title")
			.attr("x", width / 2)
			.attr("y", 25)
			.attr("dy", ".71em")
			.text(() => (xTitle === undefined) ? "" : xTitle);

		// in y axis group, add y axis title
		yAxisG.append("text")
			.attr("class", "title")
			.attr("transform", "rotate(-90)")
			.attr("x", - height / 2)
			.attr("y", -margin.left + 15) //-35
			.attr("dy", ".71em")
			.text(() => (yTitle === undefined) ? "" : yTitle);

		// define main chart scales
		x = d3.scaleTime().range([0, width]);
		y = d3.scalePoint().domain(yDomain).rangeRound([height, 0]).padding(.5);

		/* 	------------------------------------------------------------------------------------
			scales
			------------------------------------------------------------------------------------ */

		// define main chart axis
		xAxis = d3.axisBottom(x);
		yAxis = d3.axisLeft(y);

		/* 	------------------------------------------------------------------------------------
			create nav
			------------------------------------------------------------------------------------ */

		// add nav chart
		let nav = svg.append("g")
			.attr("transform", "translate (" + margin.left + "," + marginTopNav + ")");

		// add nav background
		nav.append("rect")
			.attr("x", 0)
			.attr("y", 0)
			.attr("width", width)
			.attr("height", heightNav)
			.style("fill", "#0f1927")
			.style("shape-rendering", "crispEdges")
			.attr("transform", "translate(0, 0)");

		// add group to data items
		let navG = nav.append("g")
			.attr("class", "nav");

		// add group to hold nav x axis
		// please note that a clip path has yet to be added here (tbd)
		let xAxisGNav = nav.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + heightNav + ")");

		// define nav chart scales
		xNav = d3.scaleTime().range([0, widthNav]);
		yNav = d3.scalePoint().domain(yDomain).rangeRound([heightNav, 0]).padding(.5)

		// define nav axis
		let xAxisNav = d3.axisBottom();

		/* 	----------------------------------------
			create groups for binding data
			---------------------------------------- */

		// note that two groups are created here, the latter assigned to blocksG;
		// the former will contain a clip path to constrain objects to the chart area; 
		// no equivalent clip path is created for the nav chart as the data itself
		// is clipped to the full time domain
		let nowG = main.append("g")
			.attr("class", "nowGroup")
			.attr("transform", "translate(0, 0)")
			.attr("clip-path", "url(#myClip")
			.append("g");

		let chainheadG = main.append("g")
			.attr("class", "chainheadGroup")
			.attr("transform", "translate(0, 0)")
			.attr("clip-path", "url(#myClip")
			.append("g");

		let justificationG = main.append("g")
			.attr("class", "justificationGroup")
			.attr("transform", "translate(0, 0)")
			.attr("clip-path", "url(#myClip")
			.append("g");

		let finalizationG = main.append("g")
			.attr("class", "finalizationGroup")
			.attr("transform", "translate(0, 0)")
			.attr("clip-path", "url(#myClip")
			.append("g");

		let epochsG = main.append("g")
			.attr("class", "epochsGroup")
			.attr("transform", "translate(0, 0)")
			.attr("clip-path", "url(#myClip")
			.append("g");

		let blocksG = main.append("g")
			.attr("class", "blocksGroup")
			.attr("transform", "translate(0, 0)")
			.attr("clip-path", "url(#myClip")
			.append("g");

		let rootsG = main.append("g")
			.attr("class", "rootsGroup")
			.attr("transform", "translate(0, 0)")
			.attr("clip-path", "url(#myClip")
			.append("g");

		let proposersG = main.append("g")
			.attr("class", "proposersGroup")
			.attr("transform", "translate(0, 0)")
			.attr("clip-path", "url(#myClip")
			.append("g");

		let attestationsG = main.append("g")
			.attr("class", "attestationsGroup")
			.attr("transform", "translate(0, 0)")
			.attr("clip-path", "url(#myClip")
			.append("g");

		/* 	----------------------------------------
			SVG defs, styles and icons
			---------------------------------------- */

		// define root hash arrow
		svg.append("svg:defs").append("svg:marker")
			.attr("id", "triangle")
			.attr("refX", 3)
			.attr("refY", 3)
			.attr("markerWidth", 15)
			.attr("markerHeight", 15)
			.attr("markerUnits", "userSpaceOnUse")
			.attr("orient", "auto")
			.append("path")
			.attr("d", "M 0 0 6 3 0 6 1.5 3")
			.style("fill", "#FFF");

		svg.append("svg:defs").append("svg:marker")
			.attr("id", "orphaned-triangle")
			.attr("refX", 3)
			.attr("refY", 3)
			.attr("markerWidth", 15)
			.attr("markerHeight", 15)
			.attr("markerUnits", "userSpaceOnUse")
			.attr("orient", "auto")
			.append("path")
			.attr("d", "M 0 0 6 3 0 6 1.5 3")
			.style("fill", "#ccc");

		svg.append('defs')
			.append('style')
			.attr('type', 'text/css')
			.text("@import url('https://fonts.googleapis.com/css?family=Barlow:400,300,600,700,800);");

		/* 	----------------------------------------
			scales
			---------------------------------------- */

		// compute initial time domains...
		let ts = new Date(new Date().getTime() + headSlotTimeOffset);

		// first, the full time domain
		let endTime = new Date(ts);
		let startTime = new Date(endTime.getTime() - maxSeconds * 1000);
		let interval = endTime.getTime() - startTime.getTime();

		// then the viewport time domain (what's visible in the main chart and the viewport in the nav chart)
		let endTimeViewport = new Date(ts);
		let startTimeViewport = new Date(endTime.getTime() - width / pixelsPerSecond * 1000);
		let intervalViewport = endTimeViewport.getTime() - startTimeViewport.getTime();
		let offsetViewport = startTimeViewport.getTime() - startTime.getTime();

		// initialize extent
		let extent = [startTimeViewport, endTimeViewport];

		// set the scale domains for main and nav charts
		x.domain(extent);
		xNav.domain([startTime, endTime]);

		// update axis with modified scale
		xAxis.scale(x)(xAxisG);
		xAxisNav.scale(xNav)(xAxisGNav);

		/* 	----------------------------------------
			focus + context via brushing
			---------------------------------------- */
		// create brush (moveable, changable rectangle that determines the time domain of main chart)
		let viewport = d3.brushX()
			.extent([[0, 0], [widthNav, heightNav]])
			.on("brush", brushed);

		function brushed() {

			const selection = d3.event.selection || xNav.range();

			// console.log("selection", selection);

			// get the current time extent of viewport
			startTimeViewport = xNav.invert(selection[0]);
			endTimeViewport = xNav.invert(selection[1]);
			extent = [startTimeViewport, endTimeViewport];

			// console.log("startTimeViewport", startTimeViewport);
			// console.log("endTimeViewport", endTimeViewport);
			// console.log("extent", extent);

			// compute viewport extent in milliseconds
			intervalViewport = endTimeViewport.getTime() - startTimeViewport.getTime();
			offsetViewport = startTimeViewport.getTime() - startTime.getTime();

			// handle invisible viewport
			if (intervalViewport == 0) {
				intervalViewport = maxSeconds * 1000;
				offsetViewport = 0;
			}

			// update the x domain of the main chart
			x.domain(extent);
			xNav.domain([startTime, endTime]);

			// update the x axis of the main chart
			xAxis.scale(x)(xAxisG);

			// update display
			refresh();
		}

		// initial invocation; update display
		data = [];
		refresh();

		// create group and assign to brush
		let viewportG = nav.append("g")
			.attr("class", "viewport")
			.call(viewport)
			.call(viewport.move, xNav.range());

		/* 	------------------------------------------------------------------------------------
			function to refresh the viz upon changes of the time domain 
			- happens constantly, or 
			- after arrival of new data, or
			- at init
			------------------------------------------------------------------------------------ */

		function refresh() {

			// process data to remove too late data items 
			data = data.filter(d => (d.time.getTime() > startTime.getTime()) ? true : false)

			/* 	------------------------------------------------------------------------------------
				NOW
				------------------------------------------------------------------------------------ */

			let now = [{ time: new Date(new Date().getTime()) }];

			// create update selection
			let updateNowSel = nowG.selectAll(".now")
				.data(now);

			// remove items
			updateNowSel.exit().remove();

			// add items
			updateNowSel.enter()
				.append("g")
				.attr("class", "now")
				.attr("transform", d => translateNow(d))
				.html(d => nowTemplate());

			updateNowSel
				.attr("transform", d => translateNow(d))
				.html(d => nowTemplate());

			if (store) {

				/* 	------------------------------------------------------------------------------------
					CHAINHEAD
					------------------------------------------------------------------------------------ */

				let chainhead = [{
					label: "Chainhead",
					time: calculateTime(store.headSlot),
					slot: store.headSlot,
					color: "rgba(54, 149, 141, .67)"
				}];

				// create update selection
				let updateChainheadSel = chainheadG.selectAll(".chainhead")
					.data(chainhead);

				// remove items
				updateChainheadSel.exit().remove();

				// add items
				updateChainheadSel.enter()
					.append("g")
					.attr("class", "chainhead")
					.attr("transform", d => translateChainhead(d))
					.html(d => chainheadTemplate(d));

				updateChainheadSel
					.attr("transform", d => translateChainhead(d))
					.html(d => chainheadTemplate(d));

				/* 	------------------------------------------------------------------------------------
					JUSTIFICATION CHECKPOINT
					------------------------------------------------------------------------------------ */

				let jData = data.filter(d => d.category === "Epochs").filter(d => d.label === store.justifiedEpoch);

				if (jData.length !== 0) {
					let justification = [{
						label: "Last Justified",
						time: calculateTime(store.justifiedSlot),
						slot: store.justifiedSlot,
						stake: Math.round(jData[0].participation.globalParticipationRate * 100).toFixed(1),
						color: "rgba(54, 149, 141, .67)"
					}];

					// create update selection
					let updateJustificationSel = justificationG.selectAll(".justification")
						.data(justification);

					// remove items
					updateJustificationSel.exit().remove();

					// add items
					updateJustificationSel.enter()
						.append("g")
						.attr("class", "justification")
						.attr("transform", d => translateCheckpoint(d))
						.html(d => checkpointTemplate(d));

					updateJustificationSel
						.attr("transform", d => translateCheckpoint(d))
						.html(d => checkpointTemplate(d));
				}

				/* 	------------------------------------------------------------------------------------
					FINALIZATION CHECKPOINT
					------------------------------------------------------------------------------------ */

				let fData = data.filter(d => d.category === "Epochs").filter(d => d.label === store.finalizedEpoch);

				if (fData.length !== 0) {
					let finalization = [{
						label: "Last Finalized",
						time: calculateTime(store.finalizedSlot),
						slot: store.finalizedSlot,
						stake: Math.round(fData[0].participation.globalParticipationRate * 100).toFixed(1),
						color: "rgba(54, 149, 141, 1)"
					}];

					// create update selection
					let updatefinalizationSel = finalizationG.selectAll(".finalization")
						.data(finalization);

					// remove items
					updatefinalizationSel.exit().remove();

					// add items
					updatefinalizationSel.enter()
						.append("g")
						.attr("class", "finalization")
						.attr("transform", d => translateCheckpoint(d))
						.html(d => checkpointTemplate(d));

					updatefinalizationSel
						.attr("transform", d => translateCheckpoint(d))
						.html(d => checkpointTemplate(d));
				}

			}

			/* 	------------------------------------------------------------------------------------
				EPOCHS
				------------------------------------------------------------------------------------ */

			/*
			here we bind the new data to the main chart
			
			note: no key function is used here; 
			- therefore the data binding is by index, which effectivly means that available DOM elements
			are associated with each item in the available data array, from 
			first to last index; if the new data array contains fewer elements
			than the existing DOM elements, the LAST DOM elements are removed;
			
			- basically, for each step, the data items "walks" leftward (each data 
			item occupying the next DOM element to the left);
			
			- This data binding is very different from one that is done with a key 
			function; in such a case, a data item stays "resident" in the DOM
			element, and such DOM element (with data) would be moved left, until
			the x position is to the left of the chart, where the item would be 
			exited
			*/

			let epochsData = data.filter(d => d.category === "Epochs");

			let updateEpochsSel = epochsG.selectAll(".bar")
				.data(epochsData);

			// remove items
			updateEpochsSel.exit().remove();

			// add items
			updateEpochsSel.enter()
				.append("g")
				.attr("class", "bar")
				.attr("id", d => `bar-${d.label}`)
				.attr("transform", d => translateEpoch(d))
				.html(d => epochTemplate(d));

			updateEpochsSel
				.attr("transform", d => translateEpoch(d))
				.html(d => epochTemplate(d));

			/* 	------------------------------------------------------------------------------------
				SLOTS / BLOCKS
				------------------------------------------------------------------------------------ */

			let updateBlocksSel = blocksG.selectAll(".blocks")
				.data(data.filter(d => d.category === "Blocks"));

			let slotWidth = 1;
			if (updateBlocksSel.data().length > 0) {
				slotWidth = getSlotWidth(updateBlocksSel.data()[0]);
			}

			// remove items
			updateBlocksSel.exit().remove();

			// add items
			updateBlocksSel.enter()
				.append(d => {
					if (debug) console.log("d", JSON.stringify(d));
					let type = "g";
					let node = document.createElementNS("http://www.w3.org/2000/svg", type);
					return node;
				})
				.attr("class", "blocks")
				.attr("id", d => `block-${d.slot}`)
				.attr("transform", d => translateDataGroup(d))
				.html(d => blockTemplate(d));

			// update items; added items are now part of the update selection
			updateBlocksSel
				.attr("transform", d => translateDataGroup(d))
				.html(d => blockTemplate(d));

			/* 	------------------------------------------------------------------------------------
				ROOTS
				------------------------------------------------------------------------------------ */

			if (!showRoots) {
				d3.selectAll(".roots").remove();
			}

			if (showRoots) {
				let updateRootsSel = rootsG.selectAll(".roots")
					.data(data.filter(d => d.category === "Blocks"));

				// remove items
				updateRootsSel.exit().remove();

				// add items
				updateRootsSel.enter()
					.append("path")
					.attr("class", "roots")
					.attr("id", d => `root-${d.slot}`);

				// update items; added items are now part of the update selection
				updateRootsSel
					.attr("d", (d, i) => {
						let x0 = Math.round(x(d.time)) + (slotWidth / 2),
							y0 = y(d.category) * 1.5,
							x1 = getPreviousRootPosition(updateRootsSel, i) + (slotWidth * (3 / 4)),
							y1 = y0,
							cpx = x1 + ((x0 - x1) * .5),
							cpy = (y(d.category) * 1.5) + (1 * y(d.category) / 8) + offset + 1,
							path = d3.path();
						// square
						if (getSlotWidth(d) > `${y(d.category)}`) {
							x0 = Math.round(x(d.time));
							y0 = y(d.category);
							x1 = getPreviousRootPosition(updateRootsSel, i) + y(d.category);
							y1 = y0;
							cpx = x1 + ((x0 - x1) * .5);
							cpy = y(d.category);
						}
						path.moveTo(x0, y0);
						path.quadraticCurveTo(cpx, cpy, x1, y1);
						return path;
					})
					.attr("stroke", d => {
						switch (d.status) {
							case "finalized":
							case "justified":
							case "proposed":
								return "white";
							case "orphaned":
								return "#ccc"
							default:
								return "none"
						}
					})
					.attr("fill", "transparent")
					.attr("marker-end", d => {
						switch (d.status) {
							case "finalized":
							case "justified":
							case "proposed":
								return "url(#triangle)";
							case "orphaned":
								return "url(#orphaned-triangle)"
							default:
								return ""
						}
					});
			}

			/* 	------------------------------------------------------------------------------------
				PROPOSERS
				------------------------------------------------------------------------------------ */

			if (!showProposers) {
				d3.selectAll(".proposers").remove();
			}

			if (showProposers) {
				let updateProposersSel = proposersG.selectAll(".proposers")
					.data(data.filter(d => d.category === "Blocks"));

				// remove items
				updateProposersSel.exit().remove();

				// add items
				updateProposersSel.enter()
					.append(d => {
						if (debug) { console.log("d", JSON.stringify(d)); }
						let type = "g";
						let node = document.createElementNS("http://www.w3.org/2000/svg", type);
						return node;
					})
					.attr("class", "proposers")
					.attr("id", d => `bar-${d.proposedBy}`)
					.attr("transform", d => translateDataGroup(d))
					.html(d => proposerTemplate(d));

				// update items; added items are now part of the update selection
				updateProposersSel
					.attr("transform", d => translateDataGroup(d))
					.html(d => proposerTemplate(d));
			}

			/* 	------------------------------------------------------------------------------------
				ATTESTATIONS
				------------------------------------------------------------------------------------ */

			if (!showAttestations) {
				d3.selectAll(".attestations").remove();
			}

			if (showAttestations) {
				let updateAttestationsSel = attestationsG.selectAll(".attestations")
					.data(data.filter(d => d.category === "Blocks"));

				// remove items
				updateAttestationsSel.exit().remove();

				// add items
				updateAttestationsSel.enter()
					.append(d => {
						if (debug) { console.log("d", JSON.stringify(d)); }
						let type = "g";
						let node = document.createElementNS("http://www.w3.org/2000/svg", type);
						return node;
					})
					.attr("class", "attestations")
					.attr("id", d => `attestations-${d.attestations}`)
					.attr("transform", d => translateDataGroup(d))
					.html(d => attestationsTemplate(d));

				// update items; added items are now part of the update selection
				updateAttestationsSel
					.attr("transform", d => translateDataGroup(d))
					.html(d => attestationsTemplate(d));
			}
			/* 	------------------------------------------------------------------------------------
				nav update
				------------------------------------------------------------------------------------ */

			// create update selection for the nav chart, by applying data
			let updateBlocksSelNav = navG.selectAll("circle")
				.data(data);

			// remove items
			updateBlocksSelNav.exit().remove();

			// add items
			updateBlocksSelNav.enter().append("circle")
				.attr("r", 1)
				.attr("fill", "white");

			// added items now part of update selection; set coordinates of points
			updateBlocksSelNav
				.attr("cx", d => Math.round(xNav(d.time)))
				.attr("cy", d => yNav(d.category));

		} // end refreshChart function

		/* 	------------------------------------------------------------------------------------
			templates and translations
			------------------------------------------------------------------------------------ */

		function translateNow(d) {
			let retValX = Math.round(x(d.time)),
				retValY = 0;
			return `translate(${retValX},${retValY})`;
		}

		function translateChainhead(d) {
			let retValX = Math.round(x(d.time)),
				retValY = 0;
			return `translate(${retValX},${retValY})`;
		}

		function translateCheckpoint(d) {
			let retValX = Math.round(x(d.time)),
				retValY = 0;
			return `translate(${retValX},${retValY})`;
		}

		function translateDataGroup(d) {
			let retValX = Math.round(x(d.time)),
				retValY = y(d.category);
			return `translate(${retValX},${retValY})`;
		}

		/* 	--------------------------------------
			NOW
			-------------------------------------- */

		function nowTemplate() {
			return `
				<line
					x1="0" 
					x2="0" 
					y1="0"
					y2="${height}"
					stroke="red"
					stroke-width="2"
				></line>
				<circle 
					cx="0" 
					cy="${height}" 
					r="${radius}" 
					fill="red"
				></circle>
				<text 
					x="${offset * 2}" 
					y="${height - 40}"  
					font-size=".71em" 
					fill="red"
				>
					<tspan x="${offset * 2}" dy="2.4em">${new Date().toLocaleTimeString("en-US")}</tspan>
				</text>
			`;
		}


		/* 	--------------------------------------
			CHAINHEAD
			-------------------------------------- */

		function chainheadTemplate(d) {
			return `
				<circle 
					cx="${getSlotWidth(d) / 2}" 
					cy="${height - 70}" 
					r="${radius}" 
					fill="${d.color}"
				></circle>
				<line
					x1="${getSlotWidth(d) / 2}" 
					x2="${getSlotWidth(d) / 2}" 
					y1="${height - 70 + radius}"
					y2="${height}"
					stroke="${d.color}"
					stroke-width="2"
				></line>
				<text 
					x="${getSlotWidth(d) / 2 - offset * 1.5}"
					y="${height - 40}" 
					text-anchor="end" 
					font-size=".71em" 
					fill="${d.color}"
				>${d.label}
					<tspan x="${getSlotWidth(d) / 2 - offset * 1.5}" dy="1.2em">Slot ${d.slot}</tspan>
				</text>
			`;
		}

		/* 	--------------------------------------
			CHECKPOINT
			-------------------------------------- */

		function checkpointTemplate(d) {
			return `
				<circle 
					cx="${getSlotWidth(d) / 2}" 
					cy="${height - 70}" 
					r="${radius}" 
					fill="${d.color}"
				></circle>
				<line
					x1="${getSlotWidth(d) / 2}" 
					x2="${getSlotWidth(d) / 2}" 
					y1="${height - 70 + radius}"
					y2="${height}"
					stroke="${d.color}"
					stroke-width=2
				></line>
				<text 
					x="${getSlotWidth(d) / 2 + offset * 1.5}" 
					y="${height - 40}" 
					font-size=".71em" 
					fill="${d.color}"
				>${d.label} Checkpoint
					<tspan x="${getSlotWidth(d) / 2 + offset * 1.5}" dy="1.2em">Slot ${d.slot}</tspan>
					<tspan x="${getSlotWidth(d) / 2 + offset * 1.5}" dy="1.2em">Stake ${d.stake}%</tspan>
				</text>
			`;
		}

		/* 	--------------------------------------
			EPOCH
			-------------------------------------- */

		function translateEpoch(d) {
			let retValX = Math.round(x(d.time)),
				retValY = 0;
			return `translate(${retValX},${retValY})`;
		}

		function epochTemplate(d) {
			return `
				<line
					x1="0" 
					x2="0" 
					y1="${0}"
					y2="${height}"
					stroke="white"
					stroke-opacity=".37"
				>
				</line>
				<text 
					x="${offset}" 
					y="${8}" 
					font-size=".71em" 
					fill="white"
				>EPOCH ${d.label}
					<tspan x="${offset}" dy="1.2em">${(d.status).toUpperCase()}</tspan>
				</text>
			`;
		}

		/* 	--------------------------------------
			BLOCK
			-------------------------------------- */

		function blockTemplate(d) {
			let text = ``,
				line = ``,
				rect = ``,
				content = ``,
				votes_arr = [];

			rect = `
				<rect 
					class="block"
					x="${0}"
					y="${-(y(d.category) / 2)}" 
					width="${getSlotWidth(d) - 1}"
					height="${y(d.category)}"
					rx="${roundedCorner(d)}" 
					ry="${roundedCorner(d)}"
					fill="${mapBlockStatusToColor(d)}"
					stroke="none"
				></rect>`;

			if (getSlotWidth(d) > 10) {
				line = `
					<line
						class="slot_line" 
						x1="0" 
						x2="0" 
						y1="${-(y(d.category))}"
						y2="${y(d.category)}"
						stroke="white"
						stroke-opacity=".07"
					></line>`
			}

			if (getSlotWidth(d) > 35 || d.slot % 32 === 0) {
				text = `
					<text 
						x="${offset}"
						y="${-(y(d.category) / 2) - 6}"
						font-size=".75em" 
						fill="white"
						opacity=".73"
						${/* TODO: transform="rotate(-90, ${-offset}, 0)" */""}
					>${d.slot}</text>`
			}

			if (getSlotWidth(d) > 100) {
				let w = 2,
					h = 2,
					votes = d.votes;

				for (votes; votes > 0; votes--) {
					let vote = `<rect
						x="${getSlotWidth(d) / 2}"
						y="${((y(d.category) / 4)) - (2 * h * votes)}"
						width=${w}
						height=${h}
						fill="white"
						></rect>`;
					votes_arr.push(vote);
				};

				// square
				if (getSlotWidth(d) > `${y(d.category)}`) {
					rect = `
						<rect 
							class="block"
							x="${0}"
							y="${-(y(d.category) / 2)}" 
							width="${y(d.category)}"
							height="${y(d.category)}"
							rx="${roundedCorner(d)}" 
							ry="${roundedCorner(d)}"
							fill="${mapBlockStatusToColor(d)}"
							stroke="none"
						></rect>`;
				}

				switch (d.status) {
					case "missed":
						content = `<text 
							x="${getSlotWidth(d) / 2}"
							y="${((y(d.category) / 4))}"
							font-size=".75em" 
							text-anchor="middle"
							dominant-baseline="middle"
							fill="white"
							opacity=".37"
						>Missed</text>`;
						break;
					case "finalized":
					case "justified":
					case "proposed":
					case "orphaned":
						let parentRoot = `
							<text 
								text-anchor="start"
								font-size="1em"
								x="${offset * 2}" y="0"
								fill="white" opacity=".17">${d.parentRoot.substr(2, 4)}</text>
						`;
						let xPos = (getSlotWidth(d) > `${y(d.category)}`) ? `${y(d.category) - offset * 2}` : `${getSlotWidth(d) - offset * 2}`;
						let blockRoot = `
							<text 
								text-anchor="end"
								font-size="1em"
								x="${xPos}"  y="0" 
								fill="white" opacity="1">${d.blockRoot.substr(2, 4)}</text>	
						`;
						content = parentRoot + blockRoot;
						break;
					default:
						break;
				}
			}

			let construction = `
			<line 
				x1="0" 
				x2="${width}" 
				y1="${-(y(d.category) * 3 / 4)}"
				y2="${-(y(d.category) * 3 / 4)}"
				stroke="orange"
				stroke-dasharray="10 5"
			></line>
			<line 
				x1="0" 
				x2="${width}" 
				y1="${-(y(d.category) / 2)}"
				y2="${-(y(d.category) / 2)}"
				stroke="orange"
				stroke-dasharray="10 5"
			></line>
			<line 
				x1="0" 
				x2="${width}" 
				y1="${-(y(d.category) / 4)}"
				y2="${-(y(d.category) / 4)}"
				stroke="orange"
				stroke-dasharray="10 5"
			></line>
			<line 
				x1="0" 
				x2="${width}" 
				y1="0"
				y2="0"
				stroke="orange"
				stroke-dasharray="10 5"
			></line>
			<line 
				x1="0" 
				x2="${width}" 
				y1="${y(d.category) / 4}"
				y2="${y(d.category) / 4}"
				stroke="orange"
				stroke-dasharray="10 5"
			></line>
			<line 
				x1="0" 
				x2="${width}" 
				y1="${y(d.category) / 2}"
				y2="${y(d.category) / 2}"
				stroke="orange"
				stroke-dasharray="10 5"
			></line>
			<line 
				x1="0" 
				x2="${width}" 
				y1="${y(d.category) * 3 / 4}"
				y2="${y(d.category) * 3 / 4}"
				stroke="orange"
				stroke-dasharray="10 5"
			></line>`;

			return `
			${text}
			${line}
			${rect}
			${content}
			${/* TODO: ${votes_arr} */""}
			`;
		}
		// ${construction}

		function getSlotWidth(d) {
			let t1 = x(d.time),
				t2 = x(new Date(d.time.getTime() + 12000));
			return t2 - t1;
		}

		function roundedCorner(d) {
			return getSlotWidth(d) > 20 ? 4 : 0;
		}

		function mapBlockStatusToColor(d) {
			let retVal = "none";
			switch (d.status) {
				case "finalized":
					retVal = "rgba(54, 149, 141, 1)";
					break;
				case "justified":
					retVal = "rgba(54, 149, 141, .67)";
					break;
				case "proposed":
					retVal = "rgba(54, 149, 141, .17)";
					break;
				case "orphaned":
					retVal = "rgba(0, 0, 0, .17)";
					break;
				case "missing":
					retVal = "transparent"
					break;
				default:
					break;
			}
			return retVal;
		}

		/* 	--------------------------------------
			ROOTS
			-------------------------------------- */

		// TODO: calling this function kills memory. store the root hashes or rely on the API
		function getPreviousRootPosition(selection, i) {
			let prevBlock = selection.data()[i - 1],
				prevBlockIndex = i - 1,
				parentIndex = 0;

			// there is a block
			if (prevBlock) {
				// ... and it is the parent block
				if (prevBlock.status === "finalized" ||
					prevBlock.status === "justified" ||
					prevBlock.status === "proposed") {
					parentIndex = Math.round(x(prevBlock.time));
					return parentIndex;
				}
				// ... and it is a missing or orphaned block. recursively find parent block.
				parentIndex = getPreviousRootPosition(selection, prevBlockIndex);
				return parentIndex;
			}
			// no block
			return parentIndex;
		}

		/* 	--------------------------------------
			PROPOSERS
			-------------------------------------- */

		function proposerTemplate(d) {
			return `
				<circle
					cx="${getSlotWidth(d) / 2}" 
					cy="${y(d.category) * .75 - 20}" 
					r="${setRadius(d)}"
					fill="${mapBlockStatusToColor(d)}"
				></circle>
				<text 
					x="${offset}"
					y="${y(d.category) * .75 - 10}"
					font-size=".5em" 
					fill="white"
					opacity="1"
					>${d.proposedBy}</text>
				`;
		}

		function setRadius(d) {
			return getSlotWidth(d) < 1 ? .25 : 2;
		}

		/* 	--------------------------------------
			ATTESTATIONS
			-------------------------------------- */

		function attestationsTemplate(d) {
			let w = 2,
				h = 2,
				votes = d.votes,
				votes_arr = [];
			for (votes; votes > 0; votes--) {
				let vote = `<rect
					x="${offset * 2}"
					y="${y(d.category) - (2 * h * votes)}"
					width=${w}
					height=${h}
					fill="white"
					></rect>`;
				votes_arr.push(vote);
			};
			return `
			${votes_arr}
			<text 
				x="${offset}"
				y="${y(d.category) * 1.5 - 10}"
				font-size=".5em" 
				fill="white"
				opacity="1"
				>${d.votes}</text>
			`;
		}


		/* 	------------------------------------------------------------------------------------
			function to keep the chart "moving" through time (right to left) 
			------------------------------------------------------------------------------------ */

		setInterval(function () {

			if (halted) return;

			// get current viewport extent
			let interval = extent[1].getTime() - extent[0].getTime(),
				offset = extent[0].getTime() - xNav.domain()[0].getTime();

			// compute new nav extents
			endTime = new Date(new Date().getTime() + headSlotTimeOffset);
			startTime = new Date(endTime.getTime() - maxSeconds * 1000);

			// compute new viewport extents 
			startTimeViewport = new Date(startTime.getTime() + offset);
			endTimeViewport = new Date(startTimeViewport.getTime() + interval);
			extent = [startTimeViewport, endTimeViewport];
			viewport.extent(extent);

			// update scales
			x.domain(extent);
			xNav.domain([startTime, endTime]);

			// update axis
			xAxis.scale(x)(xAxisG);
			xAxisNav.scale(xNav)(xAxisGNav);

			// refresh svg
			refresh();

		}, 1000)

		return chart;

	} // end chart function


	/* 	------------------------------------------------------------------------------------
		chart getters/setters
		------------------------------------------------------------------------------------ */

	// new data item (this most recent item will appear 
	// on the right side of the chart, and begin moving left)
	chart.datum = function (_) {
		if (arguments.length === 0) return datum;
		datum = _;
		data.push(datum);
		return chart;
	}

	// svg width
	chart.width = function (_) {
		if (arguments.length === 0) return svgWidth;
		svgWidth = _;
		return chart;
	}

	// svg height
	chart.height = function (_) {
		if (arguments.length === 0) return svgHeight;
		svgHeight = _;
		return chart;
	}

	// svg border
	chart.border = function (_) {
		if (arguments.length === 0) return border;
		border = _;
		return chart;
	}

	// x axis title
	chart.xTitle = function (_) {
		if (arguments.length === 0) return xTitle;
		xTitle = _;
		return chart;
	}

	// y axis title
	chart.yTitle = function (_) {
		if (arguments.length === 0) return yTitle;
		yTitle = _;
		return chart;
	}

	// yItems (can be dynamically added after chart construction)
	chart.yDomain = function (_) {
		if (arguments.length === 0) return yDomain;
		yDomain = _;
		if (svg) {
			// update the y ordinal scale
			y = d3.scalePoint().domain(yDomain).rangeRound([height, 0]).padding(.5);
			// update the y axis
			yAxis.scale(y)(yAxisG);
			// update the y ordinal scale for the nav chart
			yNav = d3.scalePoint().domain(yDomain).rangeRound([heightNav, 0]).padding(.5);
		}
		return chart;
	}

	// background color
	chart.backgroundColor = function (_) {
		if (arguments.length === 0) return backgroundColor;
		backgroundColor = _;
		return chart;
	}

	// timeframe
	chart.maxSeconds = function (_) {
		if (arguments.length === 0) return maxSeconds;
		maxSeconds = _;
		return chart;
	}

	// timeframe
	chart.headSlotTimeOffset = function (_) {
		if (arguments.length === 0) return headSlotTimeOffset;
		headSlotTimeOffset = _;
		return chart;
	}

	// debug
	chart.debug = function (_) {
		if (arguments.length === 0) return debug;
		debug = _;
		return chart;
	}

	// halt
	chart.halt = function (_) {
		if (arguments.length === 0) return halted;
		halted = _;
		return chart;
	}

	// show roots
	chart.showRoots = function (_) {
		if (arguments.length === 0) return showRoots;
		showRoots = _;
		return chart;
	}

	// show proposers
	chart.showProposers = function (_) {
		if (arguments.length === 0) return showProposers;
		showProposers = _;
		return chart;
	}

	// show proposers
	chart.showAttestations = function (_) {
		if (arguments.length === 0) return showAttestations;
		showAttestations = _;
		return chart;
	}

	chart.store = function (_) {
		if (arguments.length === 0) return store;
		store = _;
		return chart;
	}

	chart.getData = function () {
		return data;
	}

	chart.update = function (store) {
		for (const d of data) {
			switch (d.category) {
				case "Epochs":
					if (d.label >= store.nextEpochTransition) d.status = "scheduled";
					else if (d.label < store.nextEpochTransition && d.label > store.justifiedEpoch) d.status = "pending";
					else if (d.label <= store.justifiedEpoch && d.label > store.finalizedEpoch) d.status = "justified";
					else if (d.label <= store.finalizedEpoch) d.status = "finalized";
					break;
				case "Blocks":
					if (d.status === "justified")
						if (d.slot <= store.finalizedSlot) d.status = "finalized";
					if (datum.status === "proposed")
						if (d.slot > store.finalizedSlot && d.slot <= store.justifiedSlot) d.status = "justified";
					break;
				default:
					return;
			}
		}
		return chart;
	}

	chart.updateEpoch = function(update) {
		const test = el => el.category === "Epochs" && el.label === update.label,
			index = data.findIndex(test);
		if (index && index !== -1) {
			let target = data[index];
			target.participation.globalParticipationRate = update.participation.globalParticipationRate;
			target.participation.votedEther = update.participation.votedEther;
			target.participation.eligibleEther = update.participation.eligibleEther;
		}
	}

	return chart;

} // end realTimeChart function