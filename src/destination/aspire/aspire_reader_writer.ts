import { Preconditions } from 'base/preconditions';
import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from 'google-spreadsheet';
import * as moment from 'moment';

const SERIAL_NUMBER_EPOCH = moment('1899-12-30');

export type AspireTransaction = {
  date: Date,
  outflow: number,
  inflow: number,
  category: string | undefined,
  accountName: string,
  memo: string | undefined,
  status: string | undefined,
}

const CELL_INDICES = {
  DATE: 1,
  OUTFLOW: 2,
  INFLOW: 3,
  CATEGORY: 4,
  ACCOUNT: 5,
  MEMO: 6,
  STATUS: 7,
};

function loadTransactionRowCells(sheet: GoogleSpreadsheetWorksheet, rowIndex: number) {
  return {
    date: sheet.getCell(rowIndex, CELL_INDICES.DATE),
    outflow: sheet.getCell(rowIndex, CELL_INDICES.OUTFLOW),
    inflow: sheet.getCell(rowIndex, CELL_INDICES.INFLOW),
    category: sheet.getCell(rowIndex, CELL_INDICES.CATEGORY),
    account: sheet.getCell(rowIndex, CELL_INDICES.ACCOUNT),
    memo: sheet.getCell(rowIndex, CELL_INDICES.MEMO),
    status: sheet.getCell(rowIndex, CELL_INDICES.STATUS),
  };
}

export class AspireReaderWriter {
  private static TXNS_CELL_RANGE = {
    startRowIndex: 8,
    endRowIndex: 1000,
    startColumnIndex: CELL_INDICES.DATE,
    endColumnIndex: CELL_INDICES.STATUS + 1,
  };

  constructor(
      private readonly sheet: GoogleSpreadsheetWorksheet,
  ) {
  }

  static async of(doc: GoogleSpreadsheet) {
    await doc.loadInfo();
    const sheet = Preconditions.checkExists(
        doc.sheetsByIndex.find((sheet) => sheet.title === 'Transactions'));
    await sheet.loadCells(AspireReaderWriter.TXNS_CELL_RANGE);
    return new AspireReaderWriter(sheet);
  }

  loadTransactions(): readonly (AspireTransaction & { rowIndex: number })[] {
    const {
      startRowIndex,
      endRowIndex,
    } = AspireReaderWriter.TXNS_CELL_RANGE;

    const transactions = [];
    for (let i = startRowIndex; i < endRowIndex; i++) {
      const txn = this.loadTransaction(i);
      if (txn != null) {
        transactions.push({
          ...txn,
          rowIndex: i,
        });
      }
    }

    return transactions;
  }

  loadTransaction(rowIndex: number): AspireTransaction | null {
    const rowCells = loadTransactionRowCells(this.sheet, rowIndex);
    if (rowCells.date.value == null) {
      return null;
    }

    const inflow = rowCells.inflow.value;
    const outflow = rowCells.outflow.value;
    return {
      date: moment(rowCells.date.formattedValue, 'DD/MM/YYYY').toDate(),
      outflow: outflow && Number(outflow) || 0,
      inflow: inflow && Number(inflow) || 0,
      category: rowCells.category.value?.toString(),
      accountName: rowCells.account.value?.toString(),
      memo: rowCells.memo.value?.toString(),
      status: rowCells.status.value?.toString(),
    };
  }

  writeTransactions(txns: readonly AspireTransaction[]): void {
    const emptyRows = this.findNextEmptyRowIndex();
    for (const txn of txns) {
      const curr = emptyRows.next();
      if (curr.done) {
        throw new Error('No empty cells remaining');
      }

      this.writeTransaction(txn, curr.value);
    }
  }

  writeTransaction(txn: AspireTransaction, rowIndex?: number): void {
    // Write transaction in-place if index provided, otherwise insert at next
    // availble space
    const resolvedRowIndex: number = rowIndex ?? this.findNextEmptyRowIndex().next().value;
    const rowCells = loadTransactionRowCells(this.sheet, resolvedRowIndex);
    rowCells.date.value = moment(txn.date).diff(SERIAL_NUMBER_EPOCH, 'days');
    rowCells.outflow.value = txn.outflow > 0 ? txn.outflow : '';
    rowCells.inflow.value = txn.inflow > 0 ? txn.inflow : '';
    rowCells.category.value = txn.category || '';
    rowCells.account.value = txn.accountName || '';
    rowCells.memo.value = txn.memo || '';
    rowCells.status.value = txn.status || '✅';
  }

  * findNextEmptyRowIndex(): Iterator<number> {
    const {
      startRowIndex,
      startColumnIndex,
      endRowIndex,
    } = AspireReaderWriter.TXNS_CELL_RANGE;

    for (let i = startRowIndex; i < endRowIndex; i++) {
      if (this.sheet.getCell(i, startColumnIndex).value == null) {
        yield i;
      }
    }
  }

  commit() {
    return this.sheet.saveUpdatedCells();
  }

  rollback(): void {
    this.sheet.resetLocalCache(true);
  }
}
