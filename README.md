# Budget Bot

An extensible library to build data pipelines from your bank account to any destination.

## Architecture

Data pipelines are built by composing a series of _Plugins_. The base library includes a handful of 
[_sources_](src/source), [_transformers_](src/transform), and [_destinations_](src/destination) 
to help you begin connecting your banking data to 3rd party services.

Pipelines are defined in _user-land_ Typescript, rather than a configuration file. This allows us 
to counter the
[inner platform effect](https://exceptionnotfound.net/the-inner-platform-effect-the-daily-software-anti-pattern/), 
whilst providing an extensible environment for user-built plugins. See our [full examples](examples/src)
to see how you can build complex pipelines.

### Example Pipeline

```typescript
import { bb, flatten } from 'budget-bot';

class StringListSource implements bb.Plugin<void, string[]> {
  async exec(input: void): Promise<string[]> {
    return ['a', 'b', 'c'];
  }
}

async function main() {
  await bb.pipe(
      bb.allSeq(
          new StringListSource(),
          new StringListSource(),
      ))
      .step(flatten)
      .step((result) => console.log(result))
      .exec();
}

main();

```

You can explore more examples in our [examples](examples/src) directory. 

* [Aspire Budget](examples/src/aspire_budget.ts)
* [Custom Plugins](examples/src/custom_plugins.ts)
* [Google Sheets](examples/src/google_sheets.ts)
* [Categorisation](examples/src/categorisation.ts)

## Plugins

### Sources

- [Up](https://up.com.au/) through official support via their [public, read-only API](https://developer.up.com.au) ([implementation](src/source/up/))
- [ING](https://www.ing.com.au/) through screen scraping and CSV download ([implementation](src/source/ing/))

### Destinations

- [Google Sheets](https://www.google.com.au/sheets/about/) ([implementation](src/destination/google_sheets_destination.ts))
- [Aspire Budget Spreadsheet (via Google Sheets)](https://www.aspirebudget.com/) ([implementation](src/destination/google_sheets_destination.ts))

### Transformers

- [Date Filter](src/transform/date_filter_transformer.ts): Filter transactions by their date
- [Regexp Categoriser](src/transform/regexp_categoriser_transformer.ts): Apply a categorisation to transactions based on a regexp matching their memo field.
- [Sort](src/transform/sort_transformer.ts): Sort transactions by a limited set of criterion
- [Flatten](src/transform/flatten.ts): Flatten a `T[][]` to a `T[]` 

### Custom Plugins

If these plugins aren't quite what you're looking for, then you can build your own. Simply implement the `bb.Plugin<Input, Output>` interface:

```typescript
import { bb } from 'budget-bot';

class IdentityPlugin implements bb.Plugin<string[], string[]> {
  async exec(input: string[]): Promise<string[]> {
    return input;
  }
}
```

If you build a complex plugin which may benefit others, please feel free to raise a Pull Request.
