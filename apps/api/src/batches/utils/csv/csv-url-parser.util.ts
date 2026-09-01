import { parse } from 'csv-parse';
import { isURL } from 'class-validator';

import { BATCH_CONSTANTS } from '@bulk-url-health-checker/shared-contracts';

export type ParsedCsvUrls = {
  urls: string[];
  malformedRowCount: number;
};

export class CsvUrlParserUtil {
  static async parse(buffer: Buffer): Promise<ParsedCsvUrls> {
    const parser = parse(buffer, {
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    const urls: string[] = [];
    let malformedRowCount = 0;
    let scannedRows = 0;

    for await (const row of parser as AsyncIterable<string[]>) {
      if (scannedRows >= BATCH_CONSTANTS.MAX_CSV_ROWS_SCANNED) break;
      scannedRows++;

      const candidate = row[0];
      if (candidate && this.isValidUrl(candidate)) {
        urls.push(candidate);
      } else if (candidate) {
        malformedRowCount++;
      }
    }

    return { urls, malformedRowCount };
  }

  private static isValidUrl(candidate: string): boolean {
    return isURL(candidate, { protocols: ['http', 'https'], require_protocol: true });
  }
}
