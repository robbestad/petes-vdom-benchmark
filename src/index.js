/*

One of the things that makes React fast is that it makes a set of tradeoffs that make sense in real-world apps.

Diffing thousands of nodes is never going to have great performance. So we have a rule in place that short-circuits
the algorithm in some cases. One of these cases is when a component class type changes. Think of a single-page
application. You'll usually have some piece of code in there that effectively does this:

if (route === '/home') {
  React.renderComponent(<Newsfeed />, document.body);
} else if (route === '/profile') {
  React.renderComponent(<Profile />, document.body);
}

Newsfeed and Profile, if they're anything like Facebook.com, have several thousand DOM nodes. In other virtual DOM
systems these would be implemented as functions that return trees, which means we'd have to walk the contents of
Newsfeed and Profile to determine what needs to be changed.

React is smarter than that -- it notices that the type of the node has changed from Newsfeed to Profile and
skips the entire diff step and simply blows away the old DOM. This heuristic is based on experiences we've had
building real-world applications with React. Essentially it's using extra information the programmer has encoded
about the problem domain to infer situations where it can short-circuit the diff.

The "simple" test cases here use two different component classes (more representative of the real world) and the
"props" test case reuses 1 component class. On my machine I saw a 3x speedup with the "simple" test case. This
situation is likely repeated at multiple levels throughout your app so the real-world benefits may be bigger.

I'm sure that React won't win every benchmark because there are more design considerations in play than pure
speed. React also hedges against the platform it's running on as well as tries to provide a good (and scalable)
developer experience, all of which require trading a little speed. But I think these are the right trade-offs.

*/

var React = require('react');

var N = 4667; // document.querySelectorAll('*').length on Facebook.com, simulating single-page app transition

function createElements(elementFactory) {
  var elements = [];
  for (var i = 0; i < N; i++) {
    elements.push(elementFactory({key: i}, 'element ' + i));
  }
  return elements;
}

function createSimpleTestReactClass(elementFactory) {
  return React.createClass({
    render: function() {
      return React.DOM.div(null, createElements(elementFactory));
    }
  });
}


var PropsReactTestClass = React.createClass({
  render: function() {
    return React.DOM.div(null, createElements(this.props.elementFactory));
  }
});

var Simple1 = createSimpleTestReactClass(React.DOM.span);
var Simple2 = createSimpleTestReactClass(React.DOM.div);

function runSimpleTest() {
  var domNode = document.body;
  var initialRenderStart = window.performance.now();
  React.renderComponent(Simple1(), domNode);
  var updateStart = window.performance.now();
  React.renderComponent(Simple2(), domNode);
  var updateEnd = window.performance.now();
  React.unmountComponentAtNode(domNode);
  return [updateStart - initialRenderStart, updateEnd - updateStart];
}

function runPropsTest() {
  var domNode = document.body;
  var initialRenderStart = window.performance.now();
  React.renderComponent(PropsReactTestClass({elementFactory: React.DOM.span}), domNode);
  var updateStart = window.performance.now();
  React.renderComponent(PropsReactTestClass({elementFactory: React.DOM.div}), domNode);
  var updateEnd = window.performance.now();
  React.unmountComponentAtNode(domNode);
  return [updateStart - initialRenderStart, updateEnd - updateStart];
}

function aggregateStats(stats) {
  var sums = stats.reduce(function(accum, entry) {
    return [accum[0] + entry[0], accum[1] + entry[1]];
  });
  return [sums[0] / sums.length, sums[1] / sums.length];
}

window.go = function() {
  // Warmup
  for (var i = 0; i < 10; i++) {
    runSimpleTest();
    runPropsTest();
  }

  // Run tests
  var simpleTimes = [];
  var propsTimes = [];

  for (i = 0; i < 10; i++) {
    simpleTimes.push(runSimpleTest());
    propsTimes.push(runPropsTest());
  }

  console.log('Simple times (initial render / update):', aggregateStats(simpleTimes));
  console.log('props times (initial render / update):', aggregateStats(propsTimes));
};
