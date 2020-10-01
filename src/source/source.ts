export type Transaction = {
  index: number;
  date: Date;
  credit: number;
  debit: number;
  memo: string | undefined;
  category: string | undefined;
  accountId: string;
}
