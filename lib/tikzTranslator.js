'use strict';
// Translator class for automatical Figure - TikzPicture translation.

const { Figure } = require('./structs');

function nodesPositionsHelper (figure) {
  const nodes = figure.getNodes();
  const n = Object.keys(nodes).length;

  const dim = 1 + Math.ceil(n / 4);
  Object.keys(nodes).map(k => nodes[k])
    .forEach((node, i, a) => {
      if (i === 0) {
        // Origin, do nothing.
      } else if (i < dim) {
        // First row
        node.updatePosition(`right=of ${a[i - 1].name}`);
      } else if (i === dim) {
        // Second row first
        node.updatePosition(`below=of ${a[0].name}`);
      } else if (i === dim + 1) {
        // Second row last
        node.updatePosition(`below=of ${a[dim - 1].name}`);
      } else if (i <= dim + (dim - 2) * 2) {
        // Until the first of the last row
        node.updatePosition(`below=of ${a[i - 2].name}`);
      } else {
        // Last row
        node.updatePosition(`right=of ${a[i - 1].name}`);
      }
    });
}

function edgePositionsHelper (figure) {
  const bendPositions = [
    'bend left=10',
    'bend left=40',
    'bend left=65',
    'bend right=10',
    'bend right=40',
    'bend right=65',
  ];

  const loopPositions = [
    'loop above',
    'loop below',
    'loop right',
    'loop left',
  ];

  const edgesFrom = {};
  figure.getEdges().forEach(edge => {
    const { fromNode: { name: from }, toNode: { name: to } } = edge;

    const positionMap = from === to ? loopPositions : bendPositions;

    if (edgesFrom[from]) {
      const existingEdges = edgesFrom[from].filter(x => x === to).length;
      if (existingEdges) {
        edge.updatePosition(positionMap[existingEdges]);
      }
      edgesFrom[from].push(to);
    } else {
      edgesFrom[from] = [to];
      if (Array.isArray(edgesFrom[to]) && edgesFrom[to].indexOf(from) !== -1) {
        edge.updatePosition(positionMap[0]);
      }
    }
  });
}

class TikzFigureTranslator {
  constructor (figure) {
    this._figure = figure;

    this._validate();

    this._optimize();
  }

  string () {
    return this._translateFigure();
  }

  _validate () {
    if (!(this._figure instanceof Figure)) {
      throw new Error(`Invalid Figure - ${this._figure}`);
    }
  }

  _optimize () {
    nodesPositionsHelper(this._figure);
    edgePositionsHelper(this._figure);
  }

  _translateFigure () {
    return `\\begin{figure}
\\centering
\\begin{tikzpicture}[shorten >=1pt,node distance=3cm,on grid,auto]
${this._translateNodes()}
\t\\path[->]
${this._translateEdges()};
\\end{tikzpicture}
\\caption{${this._figure.name.replace('_', '-')}} \\label{fig:${this._figure.name.replace('_', '-')}}
\\end{figure}
`;
  }

  _translateNodes () {
    const nodes = this._figure.getNodes();
    return Object.keys(nodes)
      .map(name => nodes[name])
      .map(({ name, states, label, position }) => {
        const statesStr = `state${states.start ? ',initial' : ''}${states.final ? ',accepting' : ''}`;
        const positionStr = position ? `[${position}]` : '';
        return `\t\\node[${statesStr}] (${name}) ${positionStr} {${label}};`;
      })
      .join('\n');
  }

  _translateEdges () {
    const edges = this._figure.getEdges();
    return edges.map(({ fromNode, toNode, label, position }) => {
      const positionStr = position ? `[${position}]` : '';
      return `\t\t(${fromNode.name}) edge ${positionStr} node {${label}} (${toNode.name})`;
    }).join('\n');
  }
}

const GenerateLatexTikzDocument = figures => `
\\documentclass{article}

\\usepackage[letterpaper,top=3cm,bottom=2cm,left=3cm,right=3cm,marginparwidth=1.75cm]{geometry}
\\usepackage{amsmath}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{enumitem}
\\usepackage{lipsum}
\\usepackage{fancyhdr}
\\usepackage{spverbatim}
\\usepackage{tikz}
\\usepackage{amsthm}
\\usetikzlibrary{automata,positioning}

\\begin{document}

${Object.keys(figures)
    .map(k => figures[k])
    .map(figure => new TikzFigureTranslator(figure))
    .map(tt => tt.string())
    .join('\n')}

\\end{document}
`;

module.exports = { TikzFigureTranslator, GenerateLatexTikzDocument };
