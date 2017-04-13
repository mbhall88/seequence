function parallelCoordinates() {
    var data          = [],
	    width,
	    margin        = {top: 20, right: 30, bottom: 110, left: 40},
	    margin2       = {top: 430, right: 20, bottom: 30, left: 40}, // margin for context pane
        height,
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
     var x = d3.scaleLinear(),
         x2 = d3.scaleLinear(),
         // padding makes lines the points up with the y axis ticks
         y = d3.scaleBand().paddingInner(1).paddingOuter(0.25),
         y2 = d3.scaleBand().paddingInner(1).paddingOuter(0.25),
		 yEntropy = d3.scaleLinear(),
		 yEntropy2 = d3.scaleLinear();
	//=======================================================================


	//=======================================================================
	// FUNCTIONS TO CALCULATE LINES
	// used for lines in the focus pane
    var line = function(d) {
	    return d3.line()
		    .curve(d3.curveMonotoneY)
		    .x(function (d) { return x(d.position); })
		    .y(function (d) { return y(d.bases); })
		    (d.values);
    };

    // used for lines in the context pane
    var line2 = function(d) {
	    return d3.line()
		    // .curve(d3.curveStep)
		    .x(function (d) { return x2(d.position); })
		    .y(function (d) { return y2(d.bases); })
		    (d.values);
    };

    // function to draw line of entropy data
	var entropyLine = function(d, i) {
		return d3.line()
			.curve(d3.curveBasis)
			.x(function (d, i) { return x(i + 1); })
			.y(function (d) { return yEntropy(d); })
			(d, i);
	};

	var entropyLine2 = function(d, i) {
		return d3.line()
			.curve(d3.curveBasis)
			.x(function (d, i) { return x2(i + 1); })
			.y(function (d) { return yEntropy2(d); })
			(d, i);
	};

	//=======================================================================


	//=======================================================================
	// WHERE THE MAGIC HAPPENS!!
    function chart(selection){
        selection.each(function() {
	        //========================================================================
	        // INITIALISE VARIABLES AND SVG ELEMENTS

	        var height2   = totalHeight - margin2.top - margin2.bottom, // height for context pane
	            seqLength = data[0].values.length;

	        x.domain([1, seqLength]).range([0, width]);
	        x2.domain([1, seqLength]).range([0, width]);
	        y.domain(domain).range([height, 0]);
	        y2.domain(domain).range([height2, 0]);
	        yEntropy.domain(d3.extent(entropy)).range([height, 0]);
	        yEntropy2.domain(d3.extent(entropy)).range([height2, 0]);

	        // colour each line based on the colourBy specified
	        if (lineColourBy) {
		        var colour = function(d) { return lineColourScale(mapping[d.id][lineColourBy]); }
	        }

	        var brush = d3.brushX() // limits brushing to x axis
		        .extent([[0,0], [width, height2]]) // brushing only in context pane
		        .on('brush end', brushed); // when brushing or when brushing ends call brushed

	        var zoom = d3.zoom()
		        .scaleExtent([1, seqLength / baseResolution]) // scale from 1x to Infinity
		        .translateExtent([[0,0], [width, height]]) // cannot pan outside focus pane
		        .extent([[0, 0], [width, height]]) // only zoom within focus pane
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
		        .attr('height', height);

            // this will be the area showing the brushed/zoomed segment of the data
            var focus = svg.append('g')
	            .attr('class', 'focus')
	            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            // this will be the area showing all of the data (think of it as fully zoomed out)
	        var context = svg.append('g')
		        .attr('class', 'context')
		        .attr('transform', 'translate(' + margin2.left + ',' + margin2.top + ')');

	        // transparent window over focus that allows zooming. THIS MUST COME AFTER THE
	        // FOCUS AND CONTEXT PANES HAVE BEEN APPENDED
	        svg.append('rect')
		        .attr('class', 'zoom')
		        .attr('width', width)
		        .attr('height', height)
		        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
		        .call(zoom);
	        //========================================================================


            //========================================================================
	        // ADDING ELEMENTS TO FOCUS PANE

	        // defining the axes
	        // xAxisTop will draw vertical lines that stay aligned with the plot when panning
	        var xAxisTop = d3.axisTop(x).ticks(baseResolution).tickSize(height, 0),
	            xAxisBottom = d3.axisBottom(x),
	            xAxis2 = d3.axisBottom(x2),
		        yAxisLeft = d3.axisLeft(y),
		        yAxisRight = d3.axisRight(y);

            // add x axes to focus
            focus.append('g')
	            .attr('class', 'x axis top')
	            .attr('transform', 'translate(0,' + height + ')')
	            .call(xAxisTop);

	        focus.append('g')
		        .attr('class', 'x axis bottom')
		        .attr('transform', 'translate(0,' + height + ')')
		        .call(xAxisBottom);

            // add y axis to left and right in focus
            focus.append('g')
	            .attr('class', 'y axis left')
	            .call(yAxisLeft);

	        focus.append('g')
		        .attr('class', 'y axis right')
		        .attr('transform', 'translate(' + width + ',0)')
		        .call(yAxisRight);

	        // add the Y gridlines
	        focus.append("g")
		        .attr("class", "grid")
		        .call(make_y_gridlines().tickSize(-width).tickFormat(""));

	        // add the entropy line
	        focus.append('path')
		        .datum(entropy)
		        .attr('class', 'entropy')
		        .attr('stroke', 'green')
		        .attr('stroke-width', '2px')
		        .attr('stroke-opacity', 0.5)
		        .attr('fill', 'none')
		        .attr('d', entropyLine);

	        // container for the lines and associated elements
	        var samples = focus.selectAll('.sample')
		        .data(data)
	          .enter().append('g')
		        .attr('class', 'sample');

	        // add lines
	        samples.append('path')
		        .attr('class', 'line')
		        .attr('d', line)
		        .style('stroke', colour || 'steelblue');
	        //========================================================================

	        //========================================================================
	        // ADDING CONTEXT PANES

	        // add x axis to focus
	        context.append('g')
		        .attr('class', 'x axis')
		        .attr('transform', 'translate(0,' + height2 + ')')
		        .call(xAxis2);

	        context.append('g')
		        .attr('class', 'brush')
		        .call(brush)
		        .call(brush.move, x.range());

	        // add the entropy line
	        context.append('path')
		        .datum(entropy)
		        .attr('class', 'entropy')
		        .attr('stroke', 'green')
		        .attr('stroke-width', '3px')
		        .attr('fill', 'none')
		        .attr('d', entropyLine2);

	        var samples2 = context.selectAll('.sample')
		        .data(data)
	          .enter().append('g')
		        .attr('class', 'sample');

	        // add lines
	        samples2.append('path')
		        .attr('class', 'context line')
		        .attr('d', line2)
		        .style('stroke', colour || 'steelblue');
	        //========================================================================


	        //========================================================================
	        // FUNCTIONS THAT CONTROL THE BRUSHING AND ZOOMING FUNCTIONALITY
	        function brushed() {
		        if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'zoom') return; // ignore brush-by-zoom
		        var s = d3.event.selection || x2.range();
		        x.domain(s.map(x2.invert, x2));
		        focus.selectAll('.line').attr('d', line);
		        focus.selectAll('.entropy').attr('d', entropyLine);
		        focus.select('.x.axis.top').call(xAxisTop);
		        focus.select('.x.axis.bottom').call(xAxisBottom);
		        svg.select('.zoom').call(zoom.transform, d3.zoomIdentity
			        .scale(width / (s[1] - s[0]))
			        .translate(-s[0], 0));
	        }

	        function zoomed() {
		        if (d3.event.sourceEvent && d3.event.sourceEvent.type === 'brush') return; // ignore zoom-by-brush
		        var t = d3.event.transform;
		        x.domain(t.rescaleX(x2).domain());
		        focus.selectAll('.line').attr('d', line);
		        focus.selectAll('.entropy').attr('d', entropyLine);
		        focus.select('.x.axis.top').call(xAxisTop);
		        focus.select('.x.axis.bottom').call(xAxisBottom);
		        context.select('.brush').call(brush.move, x.range().map(t.invertX, t));
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
        width = value - margin.left - margin.right;
        return chart;
    };

    chart.height = function(value) {
        if (!arguments.length) return height;
        totalHeight = value;
        height = value - margin.top - margin.bottom;
        return chart;
    };

    chart.margin = function(value) {
        if (!arguments.length) return margin;
        margin = value;
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
	function make_y_gridlines() { return d3.axisLeft(y).ticks(5); }

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