import * as parse from 'csv-parse';
import * as fs from 'fs';
import { DateTime } from 'luxon';
import { Transaction } from '../source';


function parseCsvFile(csvFilePath: string): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    fs.readFile(csvFilePath, { encoding: 'utf-8' }, (err, content) => {
      if (err) {
        reject(err);
      }
      parse(content, (err, data) => {
        if (err) {
          reject(err);
        }
        resolve(data);
      });
    });
  });
}

function cleanMemo(memo: string) {
  return memo
      .replace('\n', '')
      .replace(/\s+/g, ' ');
}

export async function parseTransactionsCsv(csvFilePath: string): Promise<Omit<Transaction, 'accountId'>[]> {
  const data = await parseCsvFile(csvFilePath);
  return data
      .slice(1) // Strip headers
      .reverse() // Oldest to newest
      .map((row, index) => {
        return ({
          index,
          date: DateTime.fromFormat(row[0], 'dd/LL/yyyy').toJSDate(),
          credit: Number(row[2]),
          debit: Number(row[3]) * -1,
          memo: cleanMemo(row[1]),
          category: undefined,
        });
      });
}
