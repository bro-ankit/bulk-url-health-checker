import { CsvUrlParserUtil } from '../../../../src/batches/utils/csv/csv-url-parser.util';

describe('Given CsvUrlParserUtil', () => {
  describe('When parse is called with a csv of valid urls', () => {
    test('Then it returns those urls with a zero malformedRowCount', async () => {
      const buffer = Buffer.from('https://example.com\nhttps://example.org\n');

      const result = await CsvUrlParserUtil.parse(buffer);

      expect(result).toStrictEqual({
        urls: ['https://example.com', 'https://example.org'],
        malformedRowCount: 0,
      });
    });
  });

  describe('When parse is called with a mix of valid and invalid rows', () => {
    test('Then it returns only the valid urls and counts the rest as malformed', async () => {
      const buffer = Buffer.from('https://example.com\nnot-a-url\nftp://example.com/file\n');

      const result = await CsvUrlParserUtil.parse(buffer);

      expect(result).toStrictEqual({
        urls: ['https://example.com'],
        malformedRowCount: 2,
      });
    });
  });

  describe('When parse is called with empty rows', () => {
    test('Then it skips them without counting them as malformed', async () => {
      const buffer = Buffer.from('https://example.com\n\n\n');

      const result = await CsvUrlParserUtil.parse(buffer);

      expect(result).toStrictEqual({
        urls: ['https://example.com'],
        malformedRowCount: 0,
      });
    });
  });
});
