import * as bunyan from 'bunyan';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from 'google-spreadsheet';
import { DateTime } from 'luxon';
import { Preconditions, UnreachableError } from '../base/preconditions';
import { bb } from '../lib/bb';

const SERIAL_NUMBER_EPOCH = DateTime.fromISO('1899-12-30');

type Column = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J';
type ColumnConfig<T> = { column: Column, isKey?: boolean } & (
    | { type: 'date', get: (data: T) => Date }
    | { type: 'string', get: (data: T) => string }
    | { type: 'number', get: (data: T) => number }
    )

export class GoogleSheetsDestination<T> implements bb.Plugin<T[], void> {
  private readonly startColumnIndex: number;
  private readonly endColumnIndex: number;

  constructor(
      private readonly worksheet: GoogleSpreadsheetWorksheet,
      private readonly columns: ColumnConfig<T>[],
      private readonly offset: number,
      private readonly log: bunyan,
      private readonly dryrun: boolean,
  ) {

    const columnIndices = columns.map((col) => columnToIndex(col.column));
    this.startColumnIndex = Math.min(...columnIndices);
    this.endColumnIndex = Math.max(...columnIndices);
  }

  static async create<T>(
      credentialsFilePath: string,
      spreadsheetId: string,
      worksheetTitle: string,
      columns: ColumnConfig<T>[],
      offset: number,
      log: bunyan,
      dryrun: boolean,
  ): Promise<GoogleSheetsDestination<T>> {
    const doc = new GoogleSpreadsheet(spreadsheetId);
    const creds = JSON.parse(fs.readFileSync(credentialsFilePath, { encoding: 'utf-8' }));
    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();
    const worksheet = Preconditions.checkExists(
        doc.sheetsByIndex.find((sheet) => sheet.title === worksheetTitle));
    return new GoogleSheetsDestination(
        worksheet,
        columns,
        offset,
        log,
        dryrun,
    );
  }

  async exec(data: readonly T[]): Promise<void> {
    // Load all existing cells. Load into hashmap
    // Write new date, update existings.

    // Paginate rows, 1000 at a time, until a contiguous set of 10 blank rows are encountered where
    // we will stop paginating to avoid needing to read more blank data than is necessary..
    // TODO(NW): actually paginate...
    const sheetData = await this.getRows({ offset: this.offset, limit: 1000 });

    const hashedSheetData = new Map(sheetData
        // Filter to only calculate hash for rows with actual data in them
        .filter(row => row.some((cell) => cell != null))
        .map((row, i) =>
            [keyOfCellValues(row, this.columns), this.offset + i],
        ));

    const emptyRows = this.findNextEmptyRowIndex();


    for (const element of data) {
      const hash = keyOfElem(element, this.columns);
      if (hashedSheetData.has(hash)) {
        // TODO(NW): Feature: allow (opt-in) update of existing rows, rather than skipping them
        this.log.debug('Skipping writing of element with hash key %s as it exists already', hash);
        continue;
      }

      const rowIndexIter = await emptyRows.next();
      if (rowIndexIter.done) {
        throw new Error('No empty rows remaining');
      }

      if (!this.dryrun) {
        const rowIndex = rowIndexIter.value;
        this.writeRow(rowIndex, element);
      }
    }
    this.worksheet.saveUpdatedCells();
  }

  private async getRows({ offset, limit }: { offset: number, limit: number }): Promise<unknown[][]> {
    const range = {
      startRowIndex: offset,
      endRowIndex: Math.min(offset + limit, this.worksheet.rowCount),
      startColumnIndex: this.startColumnIndex,
      endColumnIndex: this.endColumnIndex + 1,
    };
    await this.worksheet.loadCells(range);

    const result = [];
    for (let rowIndex = range.startRowIndex; rowIndex < range.endRowIndex; rowIndex++) {
      result.push(this.readRow(rowIndex));
    }
    return result;
  }

  private writeRow(rowIndex: number, elem: T) {
    for (const column of this.columns) {
      const colIndex = columnToIndex(column.column);
      const cell = this.worksheet.getCell(rowIndex, colIndex);
      switch (column.type) {
        case 'date':
          // My understanding is that providing an empty pattern will result in the format
          // being inferred from the document's default locale
          cell.numberFormat = { type: 'DATE', pattern: '' };
          cell.value = DateTime.fromJSDate(column.get(elem)).diff(SERIAL_NUMBER_EPOCH).as('days');
          break;
        case 'number':
        case 'string':
          cell.value = column.get(elem);
          break;
        default:
          throw new UnreachableError(column);
      }
    }
  }

  private readRow(rowIndex: number): unknown[] {
    const row = [];
    for (const column of this.columns) {
      const columnIndex = columnToIndex(column.column);
      const cell = this.worksheet.getCell(rowIndex, columnIndex);
      switch (column.type) {
        case 'string':
        case 'number':
          row[columnToIndex(column.column)] = cell.value;
          break;
        case 'date':
          if (cell.value != null) {
            row[columnToIndex(column.column)] = SERIAL_NUMBER_EPOCH.plus({ days: Number(cell.value) })
                .toJSDate();
          }
          break;
        default:
          throw new UnreachableError(column);
      }
    }
    return row;
  }

  private async* findNextEmptyRowIndex(): AsyncIterator<number> {
    // TODO(NW): Support more than 1000 rows.
    for (let i = this.offset; i < 1000; i++) {
      // TODO(NW): Check all known cells, rather than just a single cell.
      // TODO(NW): Batch loading of cell lookahead
      // await this.worksheet.loadCells({
      //   startRowIndex: i,
      //   endRowIndex: i + 1,
      //   startColumnIndex: this.startColumnIndex,
      //   endColumnIndex: this.startColumnIndex + 1,
      // });
      if (this.worksheet.getCell(i, this.startColumnIndex).value == null) {
        yield i;
      }
    }
  }
}

function columnToIndex(col: Column): number {
  return col.charCodeAt(0) - 'A'.charCodeAt(0);
}

function keyOfCellValues<T>(
    cellValues: unknown[],
    columns: ColumnConfig<T>[],
): string {
  const h = crypto.createHash('md5');
  columns
      .filter(column => column.isKey)
      .forEach(column => {
        const cellIndex = columnToIndex(column.column);
        const cellValue = cellValues[cellIndex];
        let hashableValue;
        switch (column.type) {
          case 'date':
            hashableValue = (cellValue as Date).getTime();
            break;
          case 'string':
          case 'number':
            hashableValue = (cellValue as string | number).toString();
            break;
          default:
            throw new UnreachableError(column);
        }

        h.update(cellIndex + ':' + hashableValue);
      });
  return h.digest('hex');
}

function keyOfElem<T>(elem: T, columns: ColumnConfig<T>[]): string {
  const h = crypto.createHash('md5');
  columns
      .filter(column => column.isKey)
      .forEach(column => {
        const cellIndex = columnToIndex(column.column);
        let hashableValue;
        switch (column.type) {
          case 'date':
            hashableValue = column.get(elem).getTime();
            break;
          case 'string':
          case 'number':
            hashableValue = column.get(elem).toString();
            break;
          default:
            throw new UnreachableError(column);
        }

        h.update(cellIndex + ':' + hashableValue);
      });
  return h.digest('hex');
}

export type AspireTransaction = {
  date: Date;
  credit: number;
  debit: number;
  memo: string | undefined;
  category: string | undefined;
  accountName: string;
  status: 'settled' | 'pending';
}

export function createAspireTransactionsDestination(
    credentialsFilePath: string,
    spreadsheetId: string,
    log: bunyan,
    dryrun: boolean,
    offset = 8,
) {
  return GoogleSheetsDestination.create<AspireTransaction>(
      credentialsFilePath,
      spreadsheetId,
      'Transactions',
      [
        { type: 'date', get: (txn) => txn.date, isKey: true, column: 'B' },
        { type: 'number', get: (txn) => txn.debit, isKey: true, column: 'C' },
        { type: 'number', get: (txn) => txn.credit, isKey: true, column: 'D' },
        { type: 'string', get: (txn) => txn.category || '', column: 'E' },
        { type: 'string', get: (txn) => txn.accountName, isKey: true, column: 'F' },
        { type: 'string', get: (txn) => txn.memo || '', column: 'G' },
        { type: 'string', get: (txn) => statusToSymbol(txn.status), column: 'H' },
      ],
      offset,
      log,
      dryrun,
  );
}

function statusToSymbol(status: AspireTransaction['status']): string {
  switch (status) {
    case 'pending':
      return '🅿️';
    case 'settled':
      return '✅';
    default:
      throw new UnreachableError(status);
  }
}
