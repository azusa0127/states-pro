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
const { tokenMatcher } = require('chevrotain');

const { parser } = require('./parser');

// ----------------- Interpreter -----------------
// Obtains the default CstVisitor constructor to extend.
const BaseCstVisitor = parser.getBaseCstVisitorConstructor();

// All our semantics go into the visitor, completly separated from the grammar.
// Feel free to refactor the RULES more from parser if needed.
class DSLInterpreter extends BaseCstVisitor {
  constructor() {
    super();
    // This helper will detect any missing or redundant methods on this visitor
    this.validateVisitor();
  }

  // Entrance of the DSL interpretation, should use the CST tree passed in
  // to determine other interpreter calls.
  Program(ctx) {
    // TODO: Implement this.
    return 'STUB -- Program Interpreter Unimplemented';
  }

  DefineOperation(ctx) {
    // TODO: Implement this.
    return 'STUB -- DefineOperation Interpreter Unimplemented';
  }

  DefineStmt(ctx) {
    // TODO: Implement this.
    return 'STUB -- DefineStmt Interpreter Unimplemented';
  }

  Node(ctx) {
    // TODO: Implement this.
    return 'STUB -- Node Interpreter Unimplemented';
  }

  Edge(ctx) {
    // TODO: Implement this.
    return 'STUB -- Edge Interpreter Unimplemented';
  }
}

// We only need a single interpreter instance because our interpreter has no state.
const interpreter = new DSLInterpreter();

const interpretDSL = function (cst) {
  // Perform semantics using a CstVisitor.
  // Note that separation of concerns between the syntactic analysis (parsing) and the semantics.
  return interpreter.visit(cst);
};

module.exports = { interpretDSL };
