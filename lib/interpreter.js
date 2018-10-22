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
  Program ({ DefineOperation, DrawOperation, MergeOperation, EditOperation }) {
    const operations = [];
    for (const defineOperationCST of DefineOperation) {
      const { children: { Define: [{ startLine }] } } = defineOperationCST;
      operations.push({ startLine, defineOperationCST });
    }
    if (Array.isArray(EditOperation)) {
      for (const editOperationCST of EditOperation) {
        const { children: { Edit: [{ startLine }] } } = editOperationCST;
        operations.push({ startLine, editOperationCST });
      }
    }
    if (Array.isArray(MergeOperation)) {
      for (const mergeOperationCST of MergeOperation) {
        const { children: { Merge: [{ startLine }] } } = mergeOperationCST;
        operations.push({ startLine, mergeOperationCST });
      }
    }
    if (Array.isArray(DrawOperation)) {
      for (const drawOperationCST of DrawOperation) {
        const { children: { Draw: [{ startLine }] } } = drawOperationCST;
        operations.push({ startLine, drawOperationCST });
      }
    }
    operations.sort(({ startLine: a }, { startLine: b }) => a - b);

    const figures = {};
    for (const { defineOperationCST, editOperationCST, mergeOperationCST, drawOperationCST } of operations) {
      if (defineOperationCST) {
        this.DefineOperation({ defineOperationCST, figures });
      } else if (editOperationCST) {
        this.EditOperation({ editOperationCST, figures });
      } else if (mergeOperationCST) {
        this.MergeOperation({ mergeOperationCST, figures });
      } else if (drawOperationCST) {
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

  Node ({ nodeCST, figure }) {
    const node = new Node(this._extractNodeInfo({ nodeCST }));
    figure.addNode(node);
    return node;
  }

  Edge ({ edgeCST, fromNode, figure }) { // eslint-disable-line class-methods-use-this
    const {
      Identifier: [{ image: toNodeName }, labelIdt],
      StringLabel,
      LatexLabel,
      Numeric } = edgeCST.children;

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
    } else if (Numeric && Numeric.length) {
      label = Numeric[0].image;
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
    const { children: { Identifier, MergeStmt: mergeStmts } } = mergeOperationCST;
    const { image: name } = Identifier[Identifier.length - 1];
    const figure = new Figure(name);

    for (const f of Identifier.slice(0, -1).map(({ image }) => figures[image])) {
      if (!f) {
        throw new Error(`Invalid figure in merge statement.`);
      }
      figure.copyFromFigure(f, true);
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
      Numeric,
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
    } else if (Numeric && Numeric.length) {
      label = Numeric[0].image;
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
      LatexLabel,
      Numeric } = mergeEdgeCST.children;

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
    } else if (Numeric && Numeric.length) {
      label = Numeric[0].image;
    }

    const edge = new Edge({ fromNode, toNode, label });
    figure.addEdge(edge);
    return edge;
  }

  // eslint-disable-next-line class-methods-use-this
  PropIdentifier ({ children: { Identifier: [{ image: figName }, { image: nodeName }] } }) {
    return `${figName}_${nodeName}`;
  }

  EditOperation ({ editOperationCST, figures }) {
    let { Identifier: [{ image: name }, newID],
      DeleteStmt: deleteStmts,
      DefineStmt: defineStmts } = editOperationCST.children;

    let figure = figures[name];
    if (!figure) {
      throw new Error(`Invalid figure ${name} in edit statement.`);
    }

    if (newID) {
      // Copies original figure over.
      const { image: newName } = newID;
      figure = new Figure(newName);
      figure.copyFromFigure(figures[name]);
      name = newName;
    }

    // Delete statements
    if (Array.isArray(deleteStmts)) {
      for (const deleteStmtCST of deleteStmts) {
        this.DeleteStmt({ deleteStmtCST, figure });
      }
    }

    // Define statements
    if (Array.isArray(defineStmts)) {
      for (const defineStmtCST of defineStmts) {
        const { Node: [nodeCST], Edge: edgeCSTs } = defineStmtCST.children;
        const { name: fromNodeName, states, label } = this._extractNodeInfo({ nodeCST });
        const fromNode = figure.getNode(fromNodeName);

        if (!fromNode) {
          // Normal DefineSTMT
          this.DefineStmt({ defineStmtCST, figure });
        } else if (Array.isArray(edgeCSTs)) {
          // Adding the edges only.
          for (const edgeCST of edgeCSTs) {
            this.Edge({ edgeCST, fromNode, figure });
          }
        } else {
          // Updating the node.
          fromNode.updateNode({ name: fromNodeName, states, label });
        }
      }
    }

    // Save the figure to the global symbols.
    figures[name] = figure;
    return figure;
  }

  // eslint-disable-next-line class-methods-use-this
  DeleteStmt ({ deleteStmtCST: { children: { DefineStmt: [defineStmtCST] } }, figure }) {
    const { Node: [NodeCST], Edge: edgeCSTs } = defineStmtCST.children;
    const { Identifier: [{ image: nodeName }] } = NodeCST.children;

    if (Array.isArray(edgeCSTs)) {
      // Delete only the edges
      for (const edgeCST of edgeCSTs.children.Edge) {
        const { Identifier: [{ image: toNodeName }] } = edgeCST.children;
        figure.deleteEdge(nodeName, toNodeName);
      }
    } else {
      // Deleting node with all edges connected to it.
      figure.deleteNode(nodeName);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  _extractNodeInfo ({ nodeCST }) {
    const {
      Identifier: [{ image: name }, labelIdt],
      StringLabel,
      LatexLabel,
      Numeric,
      NodeState: CSTNodeStates } = nodeCST.children;

    let label = name;
    if (labelIdt) {
      label = labelIdt.image;
    } else if (StringLabel && StringLabel.length) {
      label = `\\text{${StringLabel[0].image.slice(1, -1)}}`;
    } else if (LatexLabel && LatexLabel.length) {
      label = LatexLabel[0].image;
    } else if (Numeric && Numeric.length) {
      label = Numeric[0].image;
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
    return { name, states, label };
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
