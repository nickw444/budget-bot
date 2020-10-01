import { DateTime } from 'luxon';
import { bb } from '../lib/bb';


export class DateFilterTransformer<T extends { date: Date }> implements bb.Plugin<T[], T[]> {
  constructor(
      private readonly notBefore: DateTime,
  ) {
  }

  async exec(txns: T[]): Promise<T[]> {
    return txns.filter(txn => DateTime.fromJSDate(txn.date) > this.notBefore);
  }
}
