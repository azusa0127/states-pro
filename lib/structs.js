'use strict';
// Definition files on Node and Egde struct etc

const simpleLabelRegex = /^(\w+)(\d+)$/;

class Labelable {
  constructor (label = '') {
    this.label = label;
    this.formatLabel();
  }

  isEmpty () {
    return !this.label;
  }

  formatLabel (label) {
    if (this.isEmpty()) return;
    // Format label
    if (simpleLabelRegex.test(this.label)) {
      const [, a, b] = simpleLabelRegex.exec(this.label);
      this.label = `${a}_{${b}}`;
    }

    if (this.label && this.label[0] !== '$') {
      this.label = `$${this.label}$`;
    }
  }
}

class NodeState {
  constructor ({ start = false, final = false } = {}) {
    this.start = start;
    this.final = final;
  }
}

class Node extends Labelable {
  constructor ({ name, states = new NodeState(), label = name, position = '' }) {
    super(label);
    this.name = name;
    this.states = states;
    this.position = position;

    this._validate();
  }

  _validate () {
    if (!this.name) {
      throw new Error('Name of a Node cannot be empty');
    }

    if (!(this.states instanceof NodeState)) {
      throw new Error(`Invalid Node states - ${this.states}`);
    }
  }

  updateNode ({ name = this.name, states = this.states, label = this.label, position = this.position }) {
    this.name = name;
    this.states = states;
    this.label = label;
    this.position = position;

    this._validate();
    this.formatLabel();
  }

  updatePosition (np) {
    this.position = np;
  }
}

class Edge extends Labelable {
  constructor ({ fromNode, toNode, label = '', position = '' }) {
    super(label);
    this.fromNode = fromNode;
    this.toNode = toNode;
    this.position = position;

    this._validate();
  }

  _validate () {
    if (!(this.fromNode instanceof Node)) {
      throw new Error(`Invalid edge fromNode - ${this.fromNode}`);
    }
    if (!(this.toNode instanceof Node)) {
      throw new Error(`Invalid edge toNode - ${this.toNode}`);
    }
    if (this.loop && this.fromNode !== this.toNode) {
      throw new Error(`Edge loop can only specified on the same node - from ${this.fromNode} to ${this.toNode}`);
    }
  }

  updatePosition (np) {
    this.position = np;
  }

  containsNode (nodeName) {
    return this.fromNode.name === nodeName || this.toNode.name === nodeName;
  }
}

class Figure extends Labelable {
  constructor (name) {
    super(name);
    this.name = name;
    this._nodes = {};
    this._edges = [];
    this._forwardDeclarations = new Set();

    this._validate();
  }

  _validate () {
    if (!this.name) {
      throw new Error('Name of a Figure cannot be empty');
    }
  }

  getNode (nodeName) {
    return this._nodes[nodeName];
  }

  getNodes () {
    return this._nodes;
  }

  getEdges () {
    return this._edges;
  }

  addNode (node, isForwardDeclaration = false) {
    if (!(node instanceof Node)) throw new Error(`Invalid node - ${node}`);

    if (this._nodes[node.name]) {
      if (this._forwardDeclarations.has(node.name) && !isForwardDeclaration) {
        this._nodes[node.name].updateNode(node);
        this._forwardDeclarations.delete(node.name);
      }
    } else {
      this._nodes[node.name] = node;
      if (isForwardDeclaration) { this._forwardDeclarations.add(node.name); }
    }
  }

  addEdge (edge) {
    if (!(edge instanceof Edge)) throw new Error(`Invalid edge - ${edge}`);
    this._edges.push(edge);
  }

  deleteNode (nodeName) {
    if (!this._nodes[nodeName]) {
      throw new Error(`Cannot delete node ${nodeName} - node undefined.`);
    }

    this._edges = this._edges.filter(x => !x.containsNode(nodeName));
    delete this._nodes[nodeName];
  }

  deleteEdge (fromNodeName, toNodeName) {
    this._edges = this._edges.filter(({ fromNode: { name: from }, toNode: { name: to } }) => !(from === fromNodeName && to === toNodeName));
  }

  copyFromFigure (figure, renameNodes = false) {
    const nodeName = name => renameNodes ? `${figure.name}_${name}` : name;

    const fNodes = figure.getNodes();
    for (const { name: oName, states, label } of Object.keys(fNodes).map(k => fNodes[k])) {
      this.addNode(new Node({ name: nodeName(oName), states: new NodeState(states), label }));
    }
    for (const { fromNode, toNode, label } of figure.getEdges()) {
      this.addEdge(new Edge({
        fromNode: this.getNode(nodeName(fromNode.name)),
        toNode: this.getNode(nodeName(toNode.name)),
        label
      }));
    }
  }
}

module.exports = { NodeState, Node, Edge, Figure };
