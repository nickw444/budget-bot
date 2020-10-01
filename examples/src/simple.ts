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
