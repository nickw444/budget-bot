import * as bunyan from 'bunyan';
import * as bunyanFormat from 'bunyan-format';
import { DestinationConfig, Destinaton } from 'destination/destination';
import * as fs from 'fs';
import { Source, SourceConfig, Transaction } from 'source/source';
import { Transformer, TransformerConfig } from 'transformer/transformer';
import * as yargs from 'yargs';


type Config = {
  sources: readonly SourceConfig[],
  transformers: readonly TransformerConfig[],
  destinations: readonly DestinationConfig[],
}

async function main() {
  const argv = yargs
      .boolean('verbose')
      .alias('v', 'verbose')
      .describe('v', 'Enable verbose output')
      .string('config')
      .default('config', 'config.json')
      .alias('c', 'config')
      .describe('c', 'Path to config file')
      .boolean('dryrun')
      .default('dryrun', false)
      .describe('dryrun', 'Don\'t write any data')
      .boolean('useCachedData')
      .default('useCachedData', false)
      .describe('useCachedData', 'Don\'t download/scrape recent data')
      .argv;

  const logFormat = bunyanFormat({ outputMode: 'short' });
  const log = bunyan.createLogger({
    name: 'budget-bot',
    stream: logFormat,
    level: argv.verbose ? 'debug' : 'info',
  });
  const config: Config = JSON.parse(fs.readFileSync(argv.config, { encoding: 'utf-8' }));
  const sources = config.sources.map(config => Source.of(config, log, argv.useCachedData));
  const transformers = config.transformers.map(config => Transformer.of(config, log));
  const destinations = await Promise.all(config.destinations.map(config => Destinaton.of(
      config,
      log,
      argv.dryrun,
  )));

  log.info('Collecting transaction data from all sources');
  let transactions: Transaction[] = [];
  for (const source of sources) {
    transactions.push(...await source.getTransactions());
  }

  log.info('Tranforming tranaction data through all transformers');
  for (const transformer of transformers) {
    transactions = [...await transformer.transform(transactions)];
  }

  log.info('Writing transactions to destinations');
  for (const destination of destinations) {
    await destination.writeTransactions(transactions);
  }
}

main();
