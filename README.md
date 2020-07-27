# Budget Bot

An extensible pipelining tool to build data pipelines from your bank account to any destination.

## Architecture

Budget Bot implements a general purpose pipeline system with 3 main entity types:

- Sources
- Transformers
- Destinations

The follow diagram illustrates how data flows through the system:

```
Source 1 ---+                                          +--- Destination 1
            |                                          |
Source 2 ---+---- Transformer 1 -> Transformer 2 -> ---+--- Destination 2
            |                                          |
Source 3 ---+                                          +--- Destination 3
```

Data collected from each source is flat mapped into a single list, and passed through the transformer chain. The full set of transformed data is then provided to each destination.

### Configuration

Pipelines are configured using a JSON configuration file format:

```json
{
  "sources": [
    {
      "kind": "up",
      "personalAccessToken": "up:yeah:XXXXX",
      "accounts": [
        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
      ]
    }
  ],
  "transformers": [
    {
      "kind": "date-filter",
      "notBefore": "01/07/2020"
    },
    {
      "kind": "sort",
      "sortBy": [
        "date"
      ]
    },
    {
      "kind": "regexp-categoriser",
      "rules": [
        {
          "pattern": "(COLES)|(WOOLWORTHS)",
          "debit": true,
          "account": "11223344",
          "category": "Groceries"
        }
      ]
    }
  ],
  "destinations": [
    {
      "kind": "aspire-budget",
      "credentials": "my-service-account.json",
      "spreadsheetId": "your-spreadsheet-id-here",
      "accounts": [
        {
          "accountId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          "accountName": "Up Transactions"
        }
      ]
    }
  ]
}
```

See [config.example.json](config.example.json) for a more complex/detailed configuration example.

## Supported Banks

- [Up](https://up.com.au/) through official support via their [public, read-only API](https://developer.up.com.au)
- [ING](https://www.ing.com.au/) through screen scraping and CSV download

## Supported Destinations

- [Aspire Budget Spreadsheet](https://www.aspirebudget.com/)

## Available Data Transformers

- [Date Filter](src/transformer/date_filter_transformer.ts): Filter transactions by their date
- [Regexp Categoriser](src/transformer/regexp_categoriser_transformer.ts): Apply a categorisation to transactions based on a regexp matching their memo field.
- [Sort](src/transformer/sort_transformer.ts): Sort transactions by a limited set of criterion

## Usage

```
$> npm start -- --help
Options:
  --help           Show help                                           [boolean]
  --version        Show version number                                 [boolean]
  -v, --verbose    Enable verbose output                               [boolean]
  -c, --config     Path to config file                                  [string]
  --dryrun         Don't write any data               [boolean] [default: false]
  --useCachedData  Don't download/scrape recent data  [boolean] [default: false]
```
