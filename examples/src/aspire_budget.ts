import {
  AspireTransaction,
  bb,
  createAspireTransactionsDestination,
  SortTransformer,
} from 'budget-bot';
import * as bunyan from 'bunyan';
import * as bunyanFormat from 'bunyan-format';
import * as yargs from 'yargs';

async function main() {
  const argv = yargs
      .boolean('verbose')
      .alias('v', 'verbose')
      .describe('v', 'Enable verbose output')
      .boolean('dryrun')
      .default('dryrun', false)
      .describe('dryrun', 'Don\'t write any data')
      .string('sheetId')
      .describe(
          'sheetId',
          'The ID of the google sheet, i.e. https://docs.google.com/spreadsheets/d/:sheetId/edit',
      )
      .required('sheetId')
      .string('credentialsPath')
      .describe('credentialsPath', 'The path to the credentials json file to access the sheet')
      .required('credentialsPath')
      .argv;

  const logFormat = bunyanFormat({ outputMode: 'short' });
  const log = bunyan.createLogger({
    name: 'budget-bot',
    stream: logFormat,
    level: argv.verbose ? 'debug' : 'info',
  });

  log.debug('Executing pipeline');
  await bb
      .pipe(() => createFakeTransactions(10))
      .step(new SortTransformer(['date', 'accountName']))
      .step(await createAspireTransactionsDestination(
          argv.credentialsPath,
          argv.sheetId,
          log,
          argv.dryrun,
      ))
      .exec();

  log.debug('Execution complete');
}

function createFakeTransactions(n: number) {
  return Array.from({ length: n }, (_, i): AspireTransaction => ({
    memo: `fake transaction #${i}`,
    accountName: 'Some Account',
    category: 'Some Category',
    credit: i % 2 === 0 ? i : 0,
    debit: i % 2 !== 0 ? i : 0,
    date: new Date(1599307558912 + i * 60 * 60 * 24 * 1000),
    status: 'settled',
  }));
}

main();
