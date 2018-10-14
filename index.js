const fs = require('fs');
const { Logger } = require('simple.logger');
const minimist = require('minimist');

const { parseDSL } = require('./lib/parser');
const { interpretDSL } = require('./lib/interpreter');

// A convenient debug console printer with same interface as `global.console`
const logger = new Logger({ level: 'info', showTime: false });

const sampleFile = 'samples/simple.btk';

// Main Function
const main = async (argv = process.argv.slice(2)) => {
  // CLI options parsing.
  const args = minimist(argv);
  const {
    // Verbose logger switch (default: false)
    verbose = args.v || false,
    file = args.f || sampleFile,
    output = args.o || false,
  } = args;

  if (verbose) {
    logger.changeLogLevel('trace');
  }

  // Load sample snippet.
  const content = fs.readFileSync(file, 'utf8');
  logger.log('Sample file loaded!');

  // Parse the sample snippet.
  const parsedResult = parseDSL(content);
  if (parsedResult.lexErrors.length || parsedResult.parseErrors.length) {
    logger.warn('Errors during parsing the sample file');
    const parserErrors = parsedResult.parseErrors;
    parserErrors.forEach(e => logger.warn(`${e.name}: ${e.message}`));
    const lexErrors = parsedResult.lexErrors;
    lexErrors.forEach(e => logger.warn(`${e.name}: ${e.message}`));
  } else {
    logger.log('Sample file parsed successfully!');
    logger.debug(parsedResult); // Only shown under Verbose mode.

    // Interpret the parsed snippet CST
    const interpretedResult = interpretDSL(parsedResult.cst);
    logger.log('Sample CST interpreted successfully!');
    logger.debug(interpretedResult);
    if (output) {
      fs.writeFileSync(output, interpretedResult, 'utf8');
      logger.info(`Done. Result wrote to ${output}.`);
    } else {
      console.info(interpretedResult);
    }
  }
};

main().catch(e => logger.error(e));
