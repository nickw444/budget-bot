import { bb, GoogleSheetsDestination } from 'budget-bot';
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

  await bb.pipe(() => Array.from({ length: 20 }, (_, i) => ({
        date: new Date(1599307558912 + i * 60 * 60 * 24 * 1000),
        name: 'Row ' + i,
      })))
      .step(await GoogleSheetsDestination.create(
          argv.credentialsPath,
          argv.sheetId,
          'Sheet1',
          [
            { type: 'date', isKey: true, column: 'A', get: row => row.date },
            { type: 'string', column: 'C', get: row => row.name },
            { type: 'string', column: 'D', get: () => '😅' },
          ],
          0,
          log,
          argv.dryrun,
      ))
      .exec();

  log.debug('Execution complete');
}

main();
