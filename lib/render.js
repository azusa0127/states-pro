'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const opn = require('opn');

const { GenerateLatexTikzDocument } = require('./tikzTranslator');

const RenderFigures = (figures, workingPath = path.join(process.cwd(), 'outputs/')) => {
  if (!fs.existsSync(workingPath)) {
    fs.mkdirSync(workingPath);
  }

  const filenamePrefix = path.join(workingPath, `${Object.keys(figures).join('_')}`);

  const tikzResult = GenerateLatexTikzDocument(figures);

  fs.writeFileSync(`${filenamePrefix}.tex`, tikzResult);

  execSync(`pdflatex ${filenamePrefix}.tex -halt-on-error`, { cwd: workingPath });

  opn(`${filenamePrefix}.pdf`).catch(e => console.error(e));

  return tikzResult;
};

module.exports = { RenderFigures };
