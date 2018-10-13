'use strict';
/**
 * Interpreter implementation file for our DSL
 *
 * This shall be implemented using the CST Visior pattern provided by chevrotain library
 *   Document:
 * http://sap.github.io/chevrotain/docs/tutorial/step3a_adding_actions_visitor.html
 *   Example:
 * https://github.com/SAP/chevrotain/blob/master/examples/grammars/calculator/calculator_pure_grammar.js
 *
 */
const { parser } = require('./parser');
const { NodeState, Node, Edge, Figure } = require('./structs');
const { GenerateLatexTikzDocument } = require('./tikzTranslator');
const { RenderFigures } = require('./render');

// ----------------- Interpreter -----------------
// Obtains the default CstVisitor constructor to extend.
const BaseCstVisitor = parser.getBaseCstVisitorConstructor();

// All our semantics go into the visitor, completly separated from the grammar.
// Feel free to refactor the RULES more from parser if needed.
class DSLInterpreter extends BaseCstVisitor {
  constructor () {
    super();

    // This helper will detect any missing or redundant methods on this visitor
    this.validateVisitor();
  }

  // Entrance of the DSL interpretation, should use the CST tree passed in
  // to determine other interpreter calls.
  Program ({ DefineOperation, DrawOperation, MergeOperation }) {
    const figures = {};

    for (const defineOperationCST of DefineOperation) {
      this.DefineOperation({ defineOperationCST, figures });
    }

    if (Array.isArray(MergeOperation)) {
      for (const mergeOperationCST of MergeOperation) {
        this.MergeOperation({ mergeOperationCST, figures });
      }
    }

    if (Array.isArray(DrawOperation)) {
      for (const drawOperationCST of DrawOperation) {
        this.DrawOperation({ drawOperationCST, figures });
      }
    }

    return GenerateLatexTikzDocument(figures);
  }

  DefineOperation ({ defineOperationCST, figures }) {
    const [{ image: name }] = defineOperationCST.children.Identifier;
    if (figures[name]) {
      throw new Error(`Figure ${name} is already decleared.`);
    }

    const figure = new Figure(name);
    for (const defineStmtCST of defineOperationCST.children.DefineStmt) {
      this.DefineStmt({ defineStmtCST, figure });
    }

    // Save the figure to the global symbols.
    figures[name] = figure;
    return figure;
  }

  DefineStmt ({ defineStmtCST, figure }) {
    let fromNode = null;
    for (const nodeCST of defineStmtCST.children.Node) {
      fromNode = this.Node({ nodeCST, figure });
    }

    if (Array.isArray(defineStmtCST.children.Edge)) {
      for (const edgeCST of defineStmtCST.children.Edge) {
        this.Edge({ edgeCST, fromNode, figure });
      }
    }

    return figure;
  }

  Node ({ nodeCST, figure }) { // eslint-disable-line class-methods-use-this
    const {
      Identifier: [{ image: name }, labelIdt],
      StringLabel,
      LatexLabel,
      NodeState: CSTNodeStates } = nodeCST.children;

    let label = name;
    if (labelIdt) {
      label = labelIdt.image;
    } else if (StringLabel && StringLabel.length) {
      label = `\\text{${StringLabel[0].image.slice(1, -1)}}`;
    } else if (LatexLabel && LatexLabel.length) {
      label = LatexLabel[0].image;
    }

    const states = new NodeState();
    if (Array.isArray(CSTNodeStates)) {
      switch (CSTNodeStates[0].image) {
        case 's':
          states.start = true;
          states.final = false;
          break;
        case 'f':
          states.start = false;
          states.final = true;
          break;
        case 'sf':
        case 'fs':
          states.start = true;
          states.final = true;
          break;
        case 'n':
          states.start = false;
          states.final = false;
          break;
      }
    }

    const node = new Node({ name, states, label });
    figure.addNode(node);
    return node;
  }

  Edge ({ edgeCST, fromNode, figure }) { // eslint-disable-line class-methods-use-this
    const {
      Identifier: [{ image: toNodeName }, labelIdt],
      StringLabel,
      LatexLabel } = edgeCST.children;

    let toNode = figure.getNode(toNodeName);
    // forward declaration of an unknow node
    if (!toNode) {
      toNode = new Node({ name: toNodeName });
      figure.addNode(toNode, true);
    }

    let label = '';
    if (labelIdt) {
      label = labelIdt.image;
    } else if (StringLabel && StringLabel.length) {
      label = `\\text{${StringLabel[0].image.slice(1, -1)}}`;
    } else if (LatexLabel && LatexLabel.length) {
      label = LatexLabel[0].image;
    }

    const edge = new Edge({ fromNode, toNode, label });
    figure.addEdge(edge);
    return edge;
  }

  DrawOperation ({ drawOperationCST, figures }) { // eslint-disable-line class-methods-use-this
    const { children: { Identifier: figNames } } = drawOperationCST;

    const renderFigs = {};
    for (const { image: figName } of figNames) {
      if (!figures[figName]) {
        throw new Error(`Invalid figure ${figName} in draw statement.`);
      }
      renderFigs[figName] = figures[figName];
    }

    return RenderFigures(renderFigs);
  }

  MergeOperation ({ mergeOperationCST, figures }) {
    const { children: {
      Identifier: [
        { image: inFigName1 },
        { image: inFigName2 },
        { image: name }],
      MergeStmt: mergeStmts } } = mergeOperationCST;

    const figure = new Figure(name);

    for (const f of [inFigName1, inFigName2].map(x => figures[x])) {
      if (!f) {
        throw new Error(`Invalid figure in merge statement.`);
      }
      const fNodes = f.getNodes();
      for (const { name: oName, states, label } of Object.keys(fNodes).map(k => fNodes[k])) {
        figure.addNode(new Node({ name: `${f.name}_${oName}`, states, label }));
      }
      for (const { fromNode, toNode, label } of f.getEdges()) {
        figure.addEdge(new Edge({
          fromNode: figure.getNode(`${f.name}_${fromNode.name}`),
          toNode: figure.getNode(`${f.name}_${toNode.name}`),
          label
        }));
      }
    }

    for (const mergeStmtCST of mergeStmts) {
      this.MergeStmt({ mergeStmtCST, figure });
    }

    // Save the figure to the global symbols.
    figures[name] = figure;
    return figure;
  }

  MergeStmt ({ mergeStmtCST, figure }) {
    const { children: { MergeNode: [mergeNodeCST], MergeEdge } } = mergeStmtCST;

    const fromNode = this.MergeNode({ mergeNodeCST, figure });

    if (Array.isArray(MergeEdge)) {
      for (const mergeEdgeCST of MergeEdge) {
        this.MergeEdge({ mergeEdgeCST, fromNode, figure });
      }
    }

    return figure;
  }

  MergeNode ({ mergeNodeCST, figure }) {
    const {
      PropIdentifier: [propIdentifierCST],
      Identifier,
      StringLabel,
      LatexLabel,
      NodeState: CSTNodeStates } = mergeNodeCST.children;

    const name = this.PropIdentifier(propIdentifierCST);
    const node = figure.getNode(name);
    if (!node) {
      throw new Error(`Invalid node ${name} in MergeNode statement`);
    }
    let { label, states } = node;
    if (Identifier && Identifier.length) {
      label = Identifier[0].image;
    } else if (StringLabel && StringLabel.length) {
      label = `\\text{${StringLabel[0].image.slice(1, -1)}}`;
    } else if (LatexLabel && LatexLabel.length) {
      label = LatexLabel[0].image;
    }

    if (Array.isArray(CSTNodeStates)) {
      switch (CSTNodeStates[0].image) {
        case 's':
          states.start = true;
          states.final = false;
          break;
        case 'f':
          states.start = false;
          states.final = true;
          break;
        case 'sf':
        case 'fs':
          states.start = true;
          states.final = true;
          break;
        case 'n':
          states.start = false;
          states.final = false;
          break;
      }
    }

    node.updateNode({ name, label, states });
    return node;
  }

  MergeEdge ({ mergeEdgeCST, fromNode, figure }) {
    const {
      PropIdentifier: [propIdentifierCST],
      Identifier,
      StringLabel,
      LatexLabel } = mergeEdgeCST.children;

    const toNodeName = this.PropIdentifier(propIdentifierCST);
    const toNode = figure.getNode(toNodeName);
    // forward declaration of an unknow node
    if (!toNode) {
      throw new Error(`Invalid node ${toNodeName} in MergeEdge statement`);
    }

    let label = '';
    if (Identifier && Identifier.length) {
      label = Identifier[0].image;
    } else if (StringLabel && StringLabel.length) {
      label = `\\text{${StringLabel[0].image.slice(1, -1)}}`;
    } else if (LatexLabel && LatexLabel.length) {
      label = LatexLabel[0].image;
    }

    const edge = new Edge({ fromNode, toNode, label });
    figure.addEdge(edge);
    return edge;
  }

  // eslint-disable-next-line class-methods-use-this
  PropIdentifier ({ children: { Identifier: [{ image: figName }, { image: nodeName }] } }) {
    return `${figName}_${nodeName}`;
  }
};

// We only need a single interpreter instance because our interpreter has no state.
const interpreter = new DSLInterpreter();

const interpretDSL = function (cst) {
  // Perform semantics using a CstVisitor.
  // Note that separation of concerns between the syntactic analysis (parsing) and the semantics.
  return interpreter.visit(cst);
};

module.exports = { interpretDSL };
