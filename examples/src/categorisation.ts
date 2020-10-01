import {
  AspireTransaction,
  bb,
  createAspireTransactionsDestination,
  RegexpCategoriserTransformer,
  SortTransformer,
  UpSource,
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
      .pipe(UpSource.create('up:yeah:XXXXXXX', ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'], log))
      .step(new SortTransformer(['date', 'accountId']))
      .step(new RegexpCategoriserTransformer([
        {
          pattern: /(COLES)|(WOOLWORTHS)/,
          category: 'Groceries',
          match: (t) => t.accountId === '11223344' && t.debit > 0,
        },
      ]))
      .step(txns => txns.map((txn): AspireTransaction => ({
        ...txn,
        accountName: txn.accountId.toString(),
        status: 'settled',
      })))
      .step(await createAspireTransactionsDestination(
          argv.credentialsPath,
          argv.sheetId,
          log,
          argv.dryrun,
      ))
      .exec();

  log.debug('Execution complete');
}

main();
