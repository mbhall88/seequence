function parallelCoordinates() {
    var data          = [],
	    width,
	    marginTop        = {top: 20, right: 30, bottom: 250, left: 40}, // margin for sequence pane
	    marginBottom       = {top: 430, right: 20, bottom: 30, left: 40}, // margin for context pane
	    marginMiddle       = {top: 290, right: 30, bottom: 110, left: 40}, // margin for entropy pane
        heightTop,
        domain        = ["A", "T", "C", "G", "-"], // y domain
        mapping       = [], // data that maps the sample id to MIC, sequence etc
        entropy, // array of entropy for each position
        sampleID, // parameter name that uniquely identifies samples
        sequence, // parameter name that sequence is held under
        totalWidth, // original width user inputs
        totalHeight, // original height user inputs
        lineColourBy, // parameter to colour the lines by
        baseResolution = 10, // minimum number of bases that can be zoomed into
        lineColourScale,
        lineColourRange,
        lineColourDomain;


	//=======================================================================
	// SCALES FOR THE AXES - 2 indicates use for context pane
     var xTop = d3.scaleLinear(), // top axis on the sequence pane
         xBottom = d3.scaleLinear(), // main x axis
         // padding makes lines the points up with the y axis ticks
         yTop = d3.scaleBand().paddingInner(1).paddingOuter(0.25),
         yBottom = d3.scaleBand().paddingInner(1).paddingOuter(0.25),
		 yEntropy = d3.scaleLinear(), // y axis for the entropy pane
		 yEntropyBottom = d3.scaleLinear(); // y axis for the entropy line in context pane
	//=======================================================================


	//=======================================================================
	// FUNCTIONS TO CALCULATE LINES
	// used for lines in the sequence pane
    var line = function(d) {
	    return d3.line()
		    .curve(d3.curveMonotoneY)
		    .x(function (d) { return xTop(d.position); })
		    .y(function (d) { return yTop(d.bases); })
		    (d.values);
    };

    // used for sequence lines in the context pane
    var lineBottom = function(d) {
	    return d3.line()
		    // .curve(d3.curveStep)
		    .x(function (d) { return xBottom(d.position); })
		    .y(function (d) { return yBottom(d.bases); })
		    (d.values);
    };

    // draw line of entropy data in entropy pane
	var entropyLine = function(d, i) {
		return d3.line()
			.curve(d3.curveBasis)
			.x(function (d, i) { return xTop(i + 1); })
			.y(function (d) { return yEntropy(d); })
			(d, i);
	};

	// draw entropy line in context pane
	var entropyLineBottom = function(d, i) {
		return d3.line()
			.curve(d3.curveBasis)
			.x(function (d, i) { return xBottom(i + 1); })
			.y(function (d) { return yEntropyBottom(d); })
			(d, i);
	};
	//=======================================================================


	//=======================================================================
	// WHERE THE MAGIC HAPPENS!!
    function chart(selection){

        selection.each(function() {
	        //========================================================================
	        // INITIALISE VARIABLES AND SVG ELEMENTS

	        var heightBottom   = totalHeight - marginBottom.top - marginBottom.bottom, // height for context pane
	            heightMiddle   = totalHeight - marginMiddle.top - marginMiddle.bottom, // height for entropy pane
	            focusHeight    = totalHeight - marginTop.top - marginMiddle.bottom, // height for entropy pane + sequence pane
	            seqLength      = data[0].values.length;

	        xTop.domain([1, seqLength]).range([0, width]);
	        xBottom.domain([1, seqLength]).range([0, width]);
	        yTop.domain(domain).range([heightTop, 0]);
	        yBottom.domain(domain).range([heightBottom, 0]);
	        yEntropy.domain(d3.extent(entropy)).range([heightMiddle, 0]);
	        yEntropyBottom.domain(d3.extent(entropy)).range([heightBottom, 0]);

	        // colour each line based on the colourBy specified
	        if (lineColourBy) {
		        var colour = function(d) { return lineColourScale(mapping[d.id][lineColourBy]); }
	        }

	        var brush = d3.brushX() // limits brushing to x axis
		        .extent([[0,0], [width, heightBottom]]) // brushing only in context pane
		        .on('brush end', brushed); // when brushing or when brushing ends call brushed

	        var zoom = d3.zoom()
		        .scaleExtent([1, seqLength / baseResolution]) // scale from 1 to ...
		        .translateExtent([[0,0], [width, focusHeight]]) // cannot pan outside focus pane
		        .extent([[0, 0], [width, focusHeight]]) // only zoom within focus pane
		        .on('zoom', zoomed);

            // append the svg object to the selection
            var svg = selection.append('svg')
                .attr('width', totalWidth)
                .attr('height', totalHeight);

	        // a clipPath prevents anything outside it from being drawn
	        svg.append('defs').append('clipPath')
		        .attr('id', 'clip')
		        .append('rect')
		        .attr('width', width)
		        .attr('height', focusHeight);

            // this will be the area showing the brushed/zoomed segment of the data
            var sequencePane = svg.append('g')
	            .attr('class', 'sequencePane')
	            .attr('transform', 'translate(' + marginTop.left + ',' + marginTop.top + ')');

            var entropyPane = svg.append('g')
	            .attr('class', 'entropyPane')
	            .attr('transform', 'translate(' + marginMiddle.left + ',' + marginMiddle.top + ')');

            // this will be the area showing all of the data (think of it as fully zoomed out)
	        var context = svg.append('g')
		        .attr('class', 'context')
		        .attr('transform', 'translate(' + marginBottom.left + ',' + marginBottom.top + ')');

	        // transparent window over focus that allows zooming. THIS MUST COME AFTER THE
	        // FOCUS AND CONTEXT PANES HAVE BEEN APPENDED
	        svg.append('rect')
		        .attr('class', 'zoom')
		        .attr('width', width)
		        .attr('height', focusHeight)
		        .attr('transform', 'translate(' + marginTop.left + ',' + marginTop.top + ')')
		        .call(zoom);
	        //========================================================================


	        //========================================================================
	        // FOCUS PANES

            //========================================================================
	        // ADDING AXES

	        // defining the axes
	        // xAxisTop will draw vertical lines that stay aligned with the plot when panning
	        var xAxisTopSeq = d3.axisTop(xTop).ticks(baseResolution).tickSize(heightTop, 0),
	            xAxisBottomFocus = d3.axisBottom(xTop),
	            xAxisContext = d3.axisBottom(xBottom),
		        yAxisLeftSeq = d3.axisLeft(yTop),
		        yAxisRightSeq = d3.axisRight(yTop),
                yAxisEntropy  = d3.axisLeft(yEntropy).ticks(5);

            // add x axes to sequence pane
            sequencePane.append('g')
	            .attr('class', 'x axis top')
	            .attr('transform', 'translate(0,' + heightTop + ')')
	            .call(xAxisTopSeq);

	        sequencePane.append('g')
		        .attr('class', 'x axis bottom')
		        .attr('transform', 'translate(0,' + heightTop + ')')
		        .call(xAxisBottomFocus);

            // add y axis to left and right in sequence pane
            sequencePane.append('g')
	            .attr('class', 'y axis left')
	            .call(yAxisLeftSeq);

	        sequencePane.append('g')
		        .attr('class', 'y axis right')
		        .attr('transform', 'translate(' + width + ',0)')
		        .call(yAxisRightSeq);

	        // add the Y gridlines to sequence pane
	        sequencePane.append("g")
		        .attr("class", "grid")
		        .call(make_y_gridlines(yTop).tickSize(-width).tickFormat(""));

	        // add entropy x axis
	        entropyPane.append('g')
		        .attr('class', 'x axis entropy')
		        .attr('transform', 'translate(0,' + heightMiddle + ')')
		        .call(xAxisBottomFocus);

	        // add entropy y axis
	        entropyPane.append('g')
		        .attr('class', 'y axis entropy')
		        .call(yAxisEntropy);

	        // make entropy y gridline
	        entropyPane.append("g")
		        .attr("class", "grid")
		        .call(make_y_gridlines(yEntropy).tickSize(-width).tickFormat(""));
	        //========================================================================


	        //========================================================================
			// DRAW LINES IN FOCUS PANES
	        // add the entropy line
	        entropyPane.append('path')
		        .datum(entropy)
		        .attr('class', 'entropy line')
		        .attr('stroke', 'green')
		        .attr('stroke-width', '2px')
		        .attr('stroke-opacity', 0.7)
		        .attr('fill', 'none')
		        .attr('d', entropyLine);

	        // container for the sequence lines and associated elements
	        var samples = sequencePane.selectAll('.sample')
		        .data(data)
	          .enter().append('g')
		        .attr('class', 'sample');

	        // add lines
	        samples.append('path')
		        .attr('class', 'line')
		        .attr('stroke-opacity', 0.15)
		        .attr('d', line)
		        .style('stroke', colour || 'steelblue');
	        //========================================================================

	        //========================================================================


	        //========================================================================
	        // ADDING CONTEXT PANE

	        // add x axis to focus
	        context.append('g')
		        .attr('class', 'x axis')
		        .attr('transform', 'translate(0,' + heightBottom + ')')
		        .call(xAxisContext);

	        context.append('g')
		        .attr('class', 'brush')
		        .call(brush)
		        .call(brush.move, xTop.range());

	        // add the entropy line
	        context.append('path')
		        .datum(entropy)
		        .attr('class', 'entropy')
		        .attr('stroke', 'green')
		        .attr('stroke-width', '3px')
		        .attr('fill', 'none')
		        .attr('d', entropyLineBottom);

	        var samples2 = context.selectAll('.sample')
		        .data(data)
	          .enter().append('g')
		        .attr('class', 'sample');

	        // add lines
	        samples2.append('path')
		        .attr('class', 'context line')
		        .attr('d', lineBottom)
		        .style('stroke', colour || 'steelblue');
	        //========================================================================


	        //========================================================================
	        // FUNCTIONS THAT CONTROL THE BRUSHING AND ZOOMING FUNCTIONALITY
	        function brushed() {
		        if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'zoom') return; // ignore brush-by-zoom
		        var s = d3.event.selection || xBottom.range();
		        xTop.domain(s.map(xBottom.invert, xBottom));
		        updateChart();
		        svg.select('.zoom').call(zoom.transform, d3.zoomIdentity
			        .scale(width / (s[1] - s[0]))
			        .translate(-s[0], 0));
	        }

	        function zoomed() {
		        if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'brush') return; // ignore zoom-by-brush
		        var t = d3.event.transform;
		        xTop.domain(t.rescaleX(xBottom).domain());
		        updateChart();
		        context.select('.brush').call(brush.move, xTop.range().map(t.invertX, t));
	        }

	        function updateChart() {
		        sequencePane.selectAll('.line').attr('d', line);
		        entropyPane.select('.entropy.line').attr('d', entropyLine);
		        sequencePane.select('.x.axis.top').call(xAxisTopSeq);
		        sequencePane.select('.x.axis.bottom').call(xAxisBottomFocus);
		        entropyPane.select('.x.axis.entropy').call(xAxisBottomFocus);
	        }
	        //========================================================================
        });
    }
	//=======================================================================

	//========================================================================
	// GETTER AND SETTER FUNCTIONS

    chart.width = function(value) {
        if (!arguments.length) return width;
        totalWidth = value;
        width = value - marginTop.left - marginTop.right;
        return chart;
    };

    chart.height = function(value) {
        if (!arguments.length) return heightTop;
        totalHeight = value;
        heightTop = value - marginTop.top - marginTop.bottom;
        return chart;
    };

    chart.marginTop = function(value) {
        if (!arguments.length) return marginTop;
        marginTop = value;
        return chart;
    };

	chart.marginMiddle = function(value) {
		if (!arguments.length) return marginMiddle;
		marginMiddle = value;
		return chart;
	};

	chart.marginBottom = function(value) {
		if (!arguments.length) return marginBottom;
		marginBottom = value;
		return chart;
	};

    chart.sequence = function(value) {
    	if (!arguments.length) return sequence;
    	sequence = value;
    	return chart;
    };

	chart.sampleID = function(value) {
		if (!arguments.length) return sampleID;
		sampleID = value;
		return chart;
	};

	chart.domain = function(value) {
		if (!arguments.length) return domain;
		domain = value;
		return chart;
	};

	chart.data = function(value) {
		if (!arguments.length) return data;
		data = value;
		entropy = shannonEntropy(data);
		return chart;
	};

	chart.mapping = function(value) {
		if (!arguments.length) return mapping;
		mapping = value;
		return chart;
	};

	chart.lineColourBy = function(value) {
		if (!arguments.length) return lineColourBy;
		lineColourBy = value;
		return chart;
	};

	chart.lineColourScale = function(domain, range) {
		if (!arguments.length) return lineColourScale;
		lineColourDomain = domain;
		lineColourRange  = range;
		// create a colour scale that takes a value and returns closest colour
		// based on the domain of values and the colour scale
		lineColourScale = function(t) {
			return range[domain.closest(t)];
		};
		return chart;
	};

	chart.baseResolution = function(value) {
		if (!arguments.length) return baseResolution;
		// dont allow anything lower than 1 or a float
		baseResolution = (value < 1) ? 1 : Math.round(value);
		return chart;
	};
	//========================================================================


	//========================================================================
	// GENERAL FUNCTIONS

	// function that searches for the closest number to num in array and returns idx
	Array.prototype.closest = function(num) {
		var mid;
		var lo = 0;
		var hi = this.length - 1;
		while (hi - lo > 1) {
			mid = Math.floor ((lo + hi) / 2);
			if (this[mid] < num) {
				lo = mid;
			} else {
				hi = mid;
			}
		}
		if (num - this[lo] <= this[hi] - num) {
			return lo;
		}
		return hi;
	};

	// gridlines in y axis function
	function make_y_gridlines(scale) { return d3.axisLeft(scale).ticks(5); }

	// calculate the shannon entropy (variance) for the data
	function shannonEntropy(data) {
		var N       = data.length, // number of samples
		    bases   = ["A", "T", "C", "G", "-"],
		    prob    = [0.2, 0.2, 0.2, 0.2, 0.2],
		    entropy = [],
		    result  = [];
		data.forEach(tally); // get counts for each sample
		entropy.forEach(function(d, i) { result[i - 1] = sumEntropy(Object.values(d), N); });
		return result;

		function tally(obj) {
			obj.values.forEach(iter) // get counts for each position in sample
		}

		function iter(pos) {
			if (!entropy[pos.position]) { // if first time calculating count for this position:
				var skeleton = {};
				bases.forEach(function(b) { skeleton[b] = 0 });
				entropy[pos.position] = skeleton;
				entropy[pos.position][pos.bases] = 1;
			} else {
				entropy[pos.position][pos.bases] += 1;
			}
		}

		// returns the negative sum of the entropy for given counts
		function sumEntropy(counts, N) {

			return -counts.reduce(function(acc, val, idx) {
				// dont calculate entropy if the value is 0 as this will return -Infinity
				var x = (val === 0) ? 0 : calculateEntropy(val, prob[idx]);
				return acc + x;
			}, 0);

			// calculate the entropy for a single value
			function calculateEntropy(val) {
				return val / N * getBaseLog(2, val / N);
			}
		}

		// get the log base x of value y
		function getBaseLog(x, y) { return Math.log(y) / Math.log(x); }

	}
	//========================================================================

    return chart;
}