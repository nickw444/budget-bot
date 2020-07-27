import * as bunyan from 'bunyan';
import * as moment from 'moment';
import { Moment } from 'moment';
import { Transaction } from 'source/source';
import { Transformer } from 'transformer/transformer';

export type DateFilterTransformerConfig = {
  kind: 'date-filter',
  notBefore: string
}

export class DateFilterTransformer implements Transformer {
  private readonly notBefore: Moment;

  constructor(
      private readonly config: DateFilterTransformerConfig,
      private readonly log: bunyan,
  ) {
    this.notBefore = moment(config.notBefore, 'DD-MM-YYYY');
  }

  async transform(txns: readonly Transaction[]): Promise<readonly Transaction[]> {
    return txns
        .filter(txn => moment(txn.date).isAfter(this.notBefore));
  }
}
