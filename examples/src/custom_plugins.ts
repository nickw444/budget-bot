import { bb } from 'budget-bot';
import * as bunyan from 'bunyan';
import * as bunyanFormat from 'bunyan-format';

class StringListSource implements bb.Plugin<void, string[]> {
  async exec(input: void): Promise<string[]> {
    return ['a', 'b', 'c'];
  }
}

class NumberListSource implements bb.Plugin<void, number[]> {
  async exec(input: void): Promise<number[]> {
    return [1, 2, 3];
  }
}

class IdentityPlugin implements bb.Plugin<string[], string[]> {
  async exec(input: string[]): Promise<string[]> {
    return input;
  }
}

class LogWriterDestination implements bb.Plugin<string[], void> {
  constructor(private readonly log: bunyan) {
  }

  async exec(input: string[]): Promise<void> {
    return this.log.info(input);
  }
}

async function main() {
  const logFormat = bunyanFormat({ outputMode: 'short' });
  const log = bunyan.createLogger({
    name: 'budget-bot',
    stream: logFormat,
    level: 'info',
  });

  log.info('Executing pipeline');

  await bb.pipe(
      bb.allSeq(
          new StringListSource(),
          new NumberListSource(),
          () => ['foo', 'bar', 'baz'],
      ))
      .step(([d1, d2, d3]) => [...d1, ...d2.map(e => e.toString()), ...d3])
      .step(new IdentityPlugin())
      .step(bb.all(
          new LogWriterDestination(log.child({ id: 1 })),
          new LogWriterDestination(log.child({ id: 2 })),
          bb.pipe(() => ['a', 'b', 'c']),
          () => [1, 2, 3],
      ))
      .step((result) => log.info('After all, result: ', result))
      .exec();

  log.info('Execution complete');
}

main();
