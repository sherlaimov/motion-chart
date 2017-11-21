// Various accessors that specify the four dimensions of data to visualize.
function x(d) {
  return d.income;
}
function y(d) {
  return d.lifeExpectancy;
}
function radius(d) {
  return d.population;
}
function color(d) {
  return d.region;
}
function key(d) {
  return d.name;
}

// Chart dimensions.
const margin = { top: 19.5, right: 19.5, bottom: 19.5, left: 39.5 };
const width = 960 - margin.right;
const height = 500 - margin.top - margin.bottom;

// Various scales. These domains make assumptions of data, naturally.
const xScale = d3
  .scaleLog()
  .domain([300, 1e5])
  .range([0, width]);

const yScale = d3
  .scaleLinear()
  .domain([10, 85])
  .range([height, 0]);

const radiusScale = d3
  .scaleSqrt()
  .domain([0, 5e8])
  .range([0, 40]);

const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

// The x & y axes.
const xAxis = d3.axisBottom(xScale).tickArguments(12, ',d');

const yAxis = d3.axisLeft(yScale);

// Create the SVG container and set the origin.
const svg = d3
  .select('#chart')
  .append('svg')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom)
  .append('g')
  .attr('transform', `translate(${margin.left},${margin.top})`);

// Add the x-axis.
svg
  .append('g')
  .attr('class', 'x axis')
  .attr('transform', `translate(0,${height})`)
  .call(xAxis);

// Add the y-axis.
svg
  .append('g')
  .attr('class', 'y axis')
  .call(yAxis);

// Add an x-axis label.
svg
  .append('text')
  .attr('class', 'x label')
  .attr('text-anchor', 'end')
  .attr('x', width)
  .attr('y', height - 6)
  .text('income per capita, inflation-adjusted (dollars)');

// Add a y-axis label.
svg
  .append('text')
  .attr('class', 'y label')
  .attr('text-anchor', 'end')
  .attr('y', 6)
  .attr('dy', '.75em')
  .attr('transform', 'rotate(-90)')
  .text('life expectancy (years)');

// Add the year label; the value is set on transition.
const label = svg
  .append('text')
  .attr('class', 'year label')
  .attr('text-anchor', 'end')
  .attr('y', height - 24)
  .attr('x', width)
  .text(1800);

// Load the data.
d3.json('nations.json', nations => {
  // A bisector since many nation's data is sparsely-defined.
  const bisect = d3.bisector(d => d[0]);

  // Positions the dots based on data.
  function position(dot) {
    dot
      .attr('cx', d => xScale(x(d)))
      .attr('cy', d => yScale(y(d)))
      .attr('r', d => radiusScale(radius(d)));
  }

  // Defines a sort order so that the smallest dots are drawn on top.
  function order(a, b) {
    return radius(b) - radius(a);
  }

  // Finds (and possibly interpolates) the value for the specified year.
  function interpolateValues(values, year) {
    const i = bisect.left(values, year, 0, values.length - 1);
    const a = values[i];
    if (i > 0) {
      const b = values[i - 1];
      const t = (year - a[0]) / (b[0] - a[0]);
      return a[1] * (1 - t) + b[1] * t;
    }
    return a[1];
  }

  // Interpolates the dataset for the given (fractional) year.
  function interpolateData(year) {
    return nations.map(d => ({
      name: d.name,
      region: d.region,
      income: interpolateValues(d.income, year),
      population: interpolateValues(d.population, year),
      lifeExpectancy: interpolateValues(d.lifeExpectancy, year),
    }));
  }

  // Add a dot per nation. Initialize the data at 1800, and set the colors.
  const dot = svg
    .append('g')
    .attr('class', 'dots')
    .selectAll('.dot')
    .data(interpolateData(1800))
    .enter()
    .append('circle')
    .attr('class', 'dot')
    .style('fill', d => colorScale(color(d)))
    .call(position)
    .sort(order);

  // Add a title.
  dot.append('title').text(d => d.name);

  // Add an overlay for the year label.
  const box = label.node().getBBox();

  const overlay = svg
    .append('rect')
    .attr('class', 'overlay')
    .attr('x', box.x)
    .attr('y', box.y)
    .attr('width', box.width)
    .attr('height', box.height)
    .on('mouseover', enableInteraction);

  // let playing = false;
  document.querySelector('#play').addEventListener('click', startPlaying);
  document.querySelector('#stop').addEventListener('click', stopPlaying);

  function startPlaying() {
    transition();
  }

  function stopPlaying() {
    console.log('stopPlaying', window.pVals.currYear);
    // window.test = svg.transition('yeah').duration(0);

    // console.log(test);
    svg.interrupt('yeah');
  }
  window.pVals = {
    lastTween: 0,
    currTween: null,
    currYear: null,
    calRatio() {
      const allWidth = 2009 - 1800;
      const diff = this.currYear - 1800;
      this.lastTween = diff / allWidth;
      return diff / allWidth;
    },
  };
  const duration = 209000;
  function transition() {
    // Start a transition that interpolates the data based on year.
    const t = svg
      .transition('yeah')
      .duration(d => {
        if (duration - duration * window.pVals.lastTween === 0) {
          console.log('IT"S ZERO');
        }
        console.log(duration - duration * window.pVals.lastTween);
        return duration - duration * window.pVals.lastTween;
      })
      // .delay((d, i) => i * 5)
      .ease(d3.easeLinear)
      .tween('year', (d, i, e) => tweenYear(d))
      .each((d, i, e) => {
        console.log('Why does this run only ONCE?');
        // console.log(d, i, e);
        return d;
      });

    t
      .on('start', d => {
        // ?????????????
        tweenYear(d)();
        console.log('Transition started', d);
      })
      .on('end', d => {
        console.log('Transition ended', d);
        // why do we need this method?
        enableInteraction(d);
      })
      .on('interrupt', (d, i, el) => {
        // console.log(d, i, el);
        window.pVals.lastTween = window.pVals.currTween;
        console.log('Transition interrupted', d);
      });
  }

  // After the transition finishes, you can mouseover to change the year.
  function enableInteraction() {
    console.log('*** enableInteraction ***');
    const yearScale = d3
      .scaleLinear()
      .domain([1800, 2009])
      .range([box.x + 10, box.x + box.width - 10])
      .clamp(true);

    // Cancel the current transition, if any.
    svg.transition().duration(0);

    overlay
      .on('mouseover', mouseover)
      .on('mouseout', mouseout)
      .on('mousemove', mousemove)
      .on('touchmove', mousemove);

    function mouseover() {
      label.classed('active', true);
    }

    function mouseout() {
      label.classed('active', false);
    }

    function mousemove() {
      displayYear(yearScale.invert(d3.mouse(this)[0]));
    }
  }

  // Tweens the entire chart by first tweening the year, and then the data.
  // For the interpolated data, the dots and label are redrawn.
  // d3doc: transition.tween - run custom code during the transition.
  function tweenYear() {
    const year = d3.interpolateNumber(window.pVals.currYear || 1800, 2009);
    return t => {
      // console.log(t);
      t += window.pVals.lastTween; // was it previously paused?
      window.pVals.currTween = t;
      // console.log('tweenYear()', year(t));
      window.pVals.currYear = Math.round(year(t));
      // $('#slider').slider('value', window.pVals.currYear);
      displayYear(year(t));
    };
  }
  // Updates the display to show the specified year.
  function displayYear(year) {
    // window.pVals.currYear = Math.round(year);
    dot
      .data(interpolateData(year), key)
      .call(position)
      .sort(order);
    label.text(Math.round(year));
    // console.log('current year', year);
    $('#slider').slider('value', Math.round(year));
  }

  const handle = $('#custom-handle');
  $('#slider').slider({
    create() {
      handle.text($(this).slider('value'));
    },
    slide(event, ui) {
      console.log('Slide event');
      handle.text(ui.value);
      window.pVals.currYear = ui.value;
      window.pVals.calRatio();
      displayYear(ui.value);
    },
    min: 1800,
    max: 2009,
    change(event, ui) {
      handle.text(ui.value);
      // window.pVals.currYear = ui.value;
      // window.pVals.calRatio();
      // displayYear(ui.value);
      // console.log(this);
      // $('#slider').slider('value', ???)
      // displayYear($('#slider').val());
    },
  });
});

// $('#slider').ready(() => {
// $('#slider').slider({
// 	change: (event, ui) => {
// 		console.log('change event');
// 		// displayYear($(this).val());
// 	},
// });
// });

$(() => {
  // const handle = $('#custom-handle');
  // $('#slider').slider({
  // 	create() {
  // 		handle.text($(this).slider('value'));
  // 	},
  // 	slide(event, ui) {
  // 		handle.text(ui.value);
  // 	},
  // 	min: 1800,
  // 	max: 2009,
  // });
});

// **** CUSTOM TIMELINE *** //

// const svgBox = svg.node().getBBox();

// const timeline = d3
// 	.select('#timeline')
// 	.append('svg')
// 	.attr('width', svgBox.width)
// 	.attr('height', svgBox.height / 10)
// 	.append('rect')
// 	.attr('class', 'timeline')
// 	.attr('x', 0)
// 	.attr('y', 0)
// 	.attr('width', svgBox.width)
// 	.attr('height', svgBox.height / 10);
// // .attr('transform', `translate(0,${height})`)
// // .on('mouseover', enableInteraction);

// const timelineBox = timeline.node().getBBox();

// const drag = d3
// 	.drag()
// 	.on('start', dragstarted)
// 	.on('drag', dragged)
// 	.on('end', dragended);

// const timelineControl = d3
// 	.select('#timeline')
// 	.select('svg')
// 	.append('circle')
// 	.attr('class', 'time-line-control')
// 	.attr('r', timelineBox.height / 2)
// 	.attr('cx', timelineBox.height / 2)
// 	.attr('cy', timelineBox.height / 2)
// 	.call(drag);

// function dragstarted(d) {
// 	d3
// 		.select(this)
// 		.raise()
// 		.classed('dragging', true);
// }

// function dragged(d) {
// 	const control = d3.select(this);
// 	const controlR = control.attr('r');
// 	const currCX = control.attr('cx');

// 	if (currCX < timelineBox.height / 2) {
// 		control.attr('cx', timelineBox.height / 2 + 1);
// 	}
// 	if (currCX + controlR > timelineBox.width) {
// 		control.attr('cx', timelineBox.width);
// 	}
// 	const cx = +control.attr('cx') + d3.event.dx;
// 	control.attr('cx', cx);
// }

// function dragended(d) {
// 	d3.select(this).classed('dragging', false);
// }
