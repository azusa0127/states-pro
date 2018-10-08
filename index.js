const fs = require('fs');
const { Logger } = require('simple.logger');
const minimist = require('minimist');
const diff = require('diff');

const { parseDSL } = require('./parser');
const { interpretDSL } = require('./interpreter');

// A convenient debug console printer with same interface as `global.console`
const logger = new Logger({ level: 'log', showTime: false });

// Main Function
const main = async (argv = process.argv.slice(2)) => {
  // CLI options parsing.
  const args = minimist(argv);
  const {
    // Verbose logger switch (default: false)
    verbose = args.v | false,
    test = args.t | false,
  } = args;

  if (verbose) {
    logger.changeLogLevel('trace');
  }

  // Load sample snippet.
  const sampleContent = fs.readFileSync('./samples/simple.btk', 'utf8');
  logger.log('Sample file loaded!');

  // Parse the sample snippet.
  const sampleParsedResult = parseDSL(sampleContent);
  if (sampleParsedResult.lexErrors.length || sampleParsedResult.parseErrors.length) {
    logger.warn('Errors during parsing the sample file');
    logger.warn(sampleParsedResult);
  } else {
    logger.log('Sample file parsed successfully!');
    logger.debug(sampleParsedResult); // Only shown under Verbose mode.
  }

  // Interpret the parsed snippet CST
  const sampleInterpretedResult = interpretDSL(sampleParsedResult.cst);
  logger.log('Sample CST interpreted successfully!');
  logger.info(sampleInterpretedResult);

  // Test the interpretation with simple test:
  if (test) {
    // Load test snippet.
    const textSampleContent = fs.readFileSync('./samples/simple.tex', 'utf8');
    logger.log('Sample test latex file loaded!');

    const resultDiff = diff.diffLines(textSampleContent, sampleInterpretedResult);
    if (resultDiff.length) {
      logger.warn(resultDiff);
    }
  }
};

main().catch(e => logger.error(e));
