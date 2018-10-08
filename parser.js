'use strict';
const { createToken, Lexer, Parser } = require('chevrotain');

// ----------------- lexer -----------------

const LCurly = createToken({ name: 'LCurly', pattern: /{/ });
const RCurly = createToken({ name: 'RCurly', pattern: /}/ });
const LParen = createToken({ name: 'LParen', pattern: /\(/ });
const RParen = createToken({ name: 'RParen', pattern: /\)/ });
const Comma = createToken({ name: 'Comma', pattern: /,/ });
const SemiColon = createToken({ name: 'SemiColon', pattern: /;/ });
const LineBreak = createToken({ name: 'LineBreak', pattern: /\n/ });
const WhiteSpace = createToken({ name: 'WhiteSpace', pattern: /[ \t\r]+/, group: Lexer.SKIPPED });

const StringLabel = createToken({ name: 'StringLabel', pattern: /`.*?`/ });
const LatexLabel = createToken({ name: 'LatexLabel', pattern: /\$.*?\$/ });
const Identifier = createToken({ name: 'Identifier', pattern: /[a-zA-Z]\w*/ });

const Define = createToken({ name: 'Define', pattern: /define/ });
const StateMachine = createToken({ name: 'StateMachine', pattern: /StateMachine/, longer_alt: Identifier });
const RightArrow = createToken({ name: 'RightArrow', pattern: /->/ });
const NodeState = createToken({ name: 'NodeState', pattern: /(sf|fs|s|f|n)/ });

const allTokens = [
  WhiteSpace,
  StringLabel,
  LatexLabel,
  LineBreak,
  NodeState,
  Define,
  StateMachine,
  Identifier,
  RightArrow,
  LCurly,
  RCurly,
  LParen,
  RParen,
  Comma,
  SemiColon,
];

const DSLLexer = new Lexer(allTokens);

// ----------------- parser -----------------
class DSLParse extends Parser {
  constructor(input) {
    super(allTokens);

    // for conciseness, not mandatory
    const $ = this;

    $.RULE('Program', () => {
      $.AT_LEAST_ONE(() => {
        $.SUBRULE($.DefineOperation);
        $.MANY(() => $.CONSUME(LineBreak));
      });
    });

    $.RULE('DefineOperation', () => {
      $.CONSUME(Define);
      $.CONSUME(StateMachine);
      $.CONSUME(Identifier);
      $.CONSUME(LCurly);
      $.CONSUME(LineBreak);
      $.AT_LEAST_ONE(() => {
        $.SUBRULE($.DefineStmt);
      });
      // $.CONSUME(LineBreak);
      $.CONSUME(RCurly);
    });

    $.RULE('DefineStmt', () => {
      $.SUBRULE($.Node);
      $.OPTION(() => {
        $.CONSUME(RightArrow);
        $.AT_LEAST_ONE_SEP({
          SEP: Comma,
          DEF() {
            $.SUBRULE($.Edge);
          }
        });
      });
      $.CONSUME(LineBreak);
    });

    $.RULE('Node', () => {
      $.CONSUME(Identifier);
      $.OPTION(() => {
        $.CONSUME(LParen);
        $.CONSUME(NodeState);
        $.OPTION1(() => {
          $.CONSUME(Comma);
          $.OR([
            { ALT() { $.CONSUME1(Identifier); } },
            { ALT() { $.CONSUME(StringLabel); } },
            { ALT() { $.CONSUME(LatexLabel); } },
          ]);
        });
        $.CONSUME(RParen);
      });
    });

    $.RULE('Edge', () => {
      $.CONSUME(Identifier);
      $.OPTION(() => {
        $.CONSUME(LParen);
        $.OR([
          { ALT() { $.CONSUME1(Identifier); } },
          { ALT() { $.CONSUME(StringLabel); } },
          { ALT() { $.CONSUME(LatexLabel); } },
        ]);
        $.CONSUME(RParen);
      });
    });

    // This must be called at the end of a Parser constructor.
    this.performSelfAnalysis();
  }
}

// ----------------- wrapping it all together -----------------

// reuse the same parser instance.
const parser = new DSLParse();

const parseDSL = function (text) {
  const lexResult = DSLLexer.tokenize(text);
  // setting a new input will RESET the parser instance's state.
  parser.input = lexResult.tokens;
  // any top level rule may be used as an entry point
  const cst = parser.Program();

  return {
    cst,
    lexErrors: lexResult.errors,
    parseErrors: parser.errors
  };
};

module.exports = { parseDSL, parser, DSLParse, DSLLexer };
