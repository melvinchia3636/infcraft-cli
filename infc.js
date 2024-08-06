#!/usr/bin/env node

const chalk = require("chalk");
const fs = require("graceful-fs");
const cliProgress = require("cli-progress");
const readline = require("readline");

const raw = fs.readFileSync("./data.json");
let everything = JSON.parse(raw);
everything.recipes = new Map(Object.entries(everything.recipes));

console.clear();

const args = process.argv.slice(2);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function pairItems(first, second, status, i, pb) {
  return new Promise(async (resolve) => {
    const firstIdx = everything.elements.findIndex(
      (item) => item.text === first.text
    );
    const secondIdx = everything.elements.findIndex(
      (item) => item.text === second.text
    );

    if (
      everything.recipes[`${firstIdx}-${secondIdx}`] ||
      everything.recipes[`${secondIdx}-${firstIdx}`]
    ) {
      if (pb) {
        pb.increment();
      }

      resolve();
      return;
    }

    let success = false;
    let retryCount = 0;
    let isNew = false;

    while (!success && retryCount < 5) {
      try {
        await fetch(
          `https://infiniteback.org/pair?first=${first.text}&second=${second.text}`
        )
          .then((response) => response.json())
          .then((data) => {
            status.totalPairs++;

            if (!data || data.result === "Nothing") {
              return;
            }

            if (data.isNew) {
              status.newDiscoveryFound++;
            }

            if (
              !everything.elements.find((item) => item.text === data.result)
            ) {
              isNew = true;

              logAboveProgressBar([
                `(${chalk.green(`F: ${status.newItemFound}`)} ${chalk.magenta(
                  `D: ${status.newDiscoveryFound}`
                )} ${chalk.blue(`R: ${status.newRecipeFound}`)} ${chalk.yellow(
                  `T: ${status.totalPairs}`
                )})`,
                (() => {
                  if (data.isNew) {
                    return chalk.magenta("[DISCOVERY]");
                  }
                  return chalk.green("[FOUND]");
                })(),
                first.emoji,
                first.text,
                "+",
                second.emoji,
                second.text,
                "=",
                data.emoji,
                data.result,
              ]);

              everything.elements.push({
                text: data.result,
                emoji: data.emoji,
              });

              status.newItemFound++;
            }

            const firstIdx = everything.elements.findIndex(
              (item) => item.text === first.text
            );
            const secondIdx = everything.elements.findIndex(
              (item) => item.text === second.text
            );

            if (
              !everything.recipes.has(`${firstIdx}-${secondIdx}`) &&
              !everything.recipes.has(`${secondIdx}-${firstIdx}`)
            ) {
              if (!isNew) {
                // logAboveProgressBar([
                //   `(${chalk.green(`F: ${status.newItemFound}`)} ${chalk.magenta(
                //     `D: ${status.newDiscoveryFound}`
                //   )} ${chalk.blue(
                //     `R: ${status.newRecipeFound}`
                //   )} ${chalk.yellow(`T: ${status.totalPairs}`)})`,
                //   chalk.blue("[NEW RECIPE]"),
                //   first.emoji,
                //   first.text,
                //   "+",
                //   second.emoji,
                //   second.text,
                //   "=",
                //   data.emoji,
                //   data.result,
                // ]);
              }

              everything.recipes.set(
                `${firstIdx}-${secondIdx}`,
                everything.elements.findIndex(
                  (item) => item.text === data.result
                )
              );

              status.newRecipeFound++;
            }
          });

        if (pb) {
          pb.increment();
        }
        success = true;
        resolve();
      } catch (error) {
        if (error.message !== "fetch failed") {
          retryCount++;
          // logAboveProgressBar([
          //   chalk.red("Error: " + error.message, "Retrying..."),
          // ]);
        }
      }
    }

    resolve();
  });
}

function logSummary(status, timeTaken) {
  console.log();
  console.log(chalk.green("Done in " + timeTaken + "ms!"));
  console.log(chalk.yellow("Summary:"));
  console.log(chalk.white(`  Total items scanned: ${status.totalPairs}`));
  console.log(chalk.green(`  New items found: ${status.newItemFound}`));
  console.log(
    chalk.magenta(`  New discoveries found: ${status.newDiscoveryFound}`)
  );
  console.log(chalk.blue(`  New recipes found: ${status.newRecipeFound}`));
}

function logAboveProgressBar(message) {
  readline.cursorTo(process.stdout, 0, 1);
  readline.clearLine(process.stdout, 0);
  console.log(...message);
  readline.cursorTo(process.stdout, 0, 2);
}

async function pairAllFor(name, nonSensitive) {
  const items = nonSensitive
    ? everything.elements.filter((item) =>
        item.text.toLowerCase().includes(name.toLowerCase())
      )
    : [everything.elements.find((item) => item.text === name)].filter((e) => e);

  if (!items.length) {
    console.log(chalk.red("Item not found"));
    return;
  }

  const status = {
    totalPairs: 0,
    newItemFound: 0,
    newDiscoveryFound: 0,
    newRecipeFound: 0,
  };

  console.log(
    chalk.cyan(
      "Now pairing all items with: ",
      nonSensitive
        ? `${items.length} items`
        : items[0].emoji + " " + items[0].text
    )
  );
  console.log();

  const bar1 = new cliProgress.SingleBar(
    {
      etaAsynchronousUpdate: false,
      format: `Pairing | {bar} | {percentage}% | {value}/{total} | Time Elapsed: {duration_formatted}`,
    },
    cliProgress.Presets.legacy
  );

  bar1.start(everything.elements.length * items.length, 0);

  for (const item of items) {
    for (let i = 0; i < everything.elements.length; i += 1000) {
      const allPromises = [];

      for (let j = i; j < Math.min(i + 1000, everything.elements.length); j++) {
        const second = everything.elements[j];
        const promise = pairItems(
          {
            text: item.text,
            emoji: item.emoji,
          },
          {
            text: second.text,
            emoji: second.emoji,
          },
          status,
          j,
          bar1
        );
        allPromises.push(promise);
      }

      await Promise.all(allPromises).then(() => {
        const newEverything = {
          elements: everything.elements,
          recipes: Object.fromEntries(everything.recipes),
        };
        fs.writeFileSync("./data.json", JSON.stringify(newEverything, null, 2));
      });
    }
  }

  bar1.stop();
}

async function pairFromTo(args) {
  const firstIdx = parseInt(args[1]);
  const secondIdx = parseInt(args[2]);

  if (
    firstIdx >= Object.keys(everything.elements).length ||
    secondIdx >= Object.keys(everything.elements).length ||
    firstIdx < 0 ||
    secondIdx < 0 ||
    firstIdx >= secondIdx
  ) {
    console.log(chalk.red("Invalid item id"));
    return;
  }

  console.log(
    chalk.cyan(
      `Pairing everything.elements from ${everything.elements[firstIdx].text} to ${everything.elements[secondIdx].text}`
    )
  );

  const start = Date.now();

  const status = {
    totalPairs: 0,
    newItemFound: 0,
    newDiscoveryFound: 0,
    newRecipeFound: 0,
  };

  const bar1 = new cliProgress.SingleBar(
    {
      format: `Pairing | {bar} | {percentage}% | {value}/{total}`,
    },
    cliProgress.Presets.legacy
  );

  bar1.start((secondIdx - firstIdx) * (secondIdx - firstIdx), 0);

  for (let i = firstIdx; i < secondIdx; i++) {
    const first = everything.elements[i];

    for (let j = firstIdx; j < secondIdx; j += 1000) {
      const allPromises = [];

      for (let k = j; k < Math.min(j + 1000, secondIdx); k++) {
        const second = everything.elements[k];
        const promise = pairItems(
          {
            text: first.text,
            emoji: first.emoji,
          },
          {
            text: second.text,
            emoji: second.emoji,
          },
          status,
          i,
          bar1
        );
        allPromises.push(promise);
      }

      await Promise.all(allPromises).then(() => {
        const newEverything = {
          elements: everything.elements,
          recipes: Object.fromEntries(everything.recipes),
        };
        fs.writeFileSync("./data.json", JSON.stringify(newEverything, null, 2));
      });
    }
  }

  bar1.stop();
}

async function randomPair(args) {
  const flag = args[2];
  let inf = false;

  if (flag === "--infinite") {
    inf = true;
  }

  const times = parseInt(args[1]);
  if (isNaN(times)) {
    console.log(chalk.red("Invalid number"));
    return;
  }

  if (!inf) {
    console.log(chalk.cyan(`Randomly pairing ${times} times: `));
  } else {
    console.log(chalk.cyan("Randomly pairing infinitely: "));
  }

  const start = Date.now();

  const status = {
    totalPairs: 0,
    newItemFound: 0,
    newDiscoveryFound: 0,
    newRecipeFound: 0,
  };

  const allPromises = [];

  for (let i = 0; i < times; i++) {
    const first =
      everything.elements[
        Math.floor(Math.random() * everything.elements.length)
      ];
    const second =
      everything.elements[
        Math.floor(Math.random() * everything.elements.length)
      ];

    const promise = pairItems(
      {
        text: first.text,
        emoji: first.emoji,
      },
      {
        text: second.text,
        emoji: second.emoji,
      },
      status,
      i
    );
    allPromises.push(promise);
  }

  await Promise.all(allPromises).then(() => {
    const newEverything = {
      elements: everything.elements,
      recipes: Object.fromEntries(everything.recipes),
    };
    fs.writeFileSync("./data.json", JSON.stringify(newEverything, null, 2));

    const timeTaken = Date.now() - start;
  });

  while (inf) {
    const allPromises = [];

    for (let i = 0; i < times; i++) {
      const first =
        everything.elements[
          Math.floor(Math.random() * everything.elements.length)
        ];
      const second =
        everything.elements[
          Math.floor(Math.random() * everything.elements.length)
        ];

      const promise = pairItems(
        {
          text: first.text,
          emoji: first.emoji,
        },
        {
          text: second.text,
          emoji: second.emoji,
        },
        status,
        i
      );
      allPromises.push(promise);
    }

    await Promise.all(allPromises).then(() => {
      const newEverything = {
        elements: everything.elements,
        recipes: Object.fromEntries(everything.recipes),
      };
      fs.writeFileSync("./data.json", JSON.stringify(newEverything, null, 2));

      const timeTaken = Date.now() - start;
    });
  }
}

if (args.length === 0) {
  console.log(chalk.yellow("Usage:"));
  console.log(chalk.green("  infc <command>"));
  console.log(chalk.cyan("Commands:"));
  console.log(chalk.green("  infc list <item|recipe>"));
  console.log(chalk.green("  infc search <item|recipe> <name>"));
  console.log(chalk.green("  infc pair-all-for <item>"));
  console.log(chalk.green("  infc random-pair <times>"));
} else {
  switch (args[0]) {
    case "list":
      if (args.length === 1) {
        console.log(chalk.yellow("Usage:"));
        console.log(chalk.green("  infc list <item|recipe>"));
      } else {
        switch (args[1]) {
          case "item":
            console.log(chalk.cyan("Items:"));
            everything.elements.forEach((item) => {
              console.log(chalk.white(`  ${item.emoji} ${item.text}`));
            });
            break;
          case "recipe":
            const name = args[2];

            const item = everything.elements.find((item) => item.text === name);

            if (!item) {
              console.log(chalk.red("Item not found"));
              return;
            }

            const recipes = item.recipes;

            if (!recipes.length) {
              console.log(chalk.red("No recipe found"));
              return;
            }

            console.log(chalk.green("Recipes:"));
            recipes.forEach((key) => {
              const [f, s] = key.split("-");
              const first = everything.elements[+f];
              const second = everything.elements[+s];

              console.log(
                chalk.white(
                  `    ${first.emoji} ${first.text} + ${second.emoji} ${second.text}`
                )
              );
            });
            break;
          default:
            console.log(chalk.red("Unknown list type"));
            break;
        }
      }
      break;
    case "search":
      if (args.length === 1) {
        console.log(chalk.yellow("Usage:"));
        console.log(chalk.green("  infc search <item|recipe>"));
      } else {
        switch (args[1]) {
          case "item":
            if (args.length === 2) {
              console.log(chalk.yellow("Usage:"));
              console.log(chalk.green("  infc search item <name>"));
            } else {
              const name = args.slice(2).join(" ");
              const item = everything.elements
                .filter((item) =>
                  item.text.toLowerCase().includes(name.toLowerCase())
                )
                .sort((a, b) => a.text.localeCompare(b.text));

              if (item.length) {
                const freq = Array.from(everything.recipes.entries()).reduce(
                  (acc, [key, value]) => {
                    acc.res[value] = (acc.res[value] || 0) + 1;
                    const [f, s] = key.split("-");
                    acc.craft[f] = (acc.craft[f] || 0) + 1;
                    acc.craft[s] = (acc.craft[s] || 0) + 1;
                    return acc;
                  },
                  { res: {}, craft: {} }
                );

                for (let i = 0; i < item.length; i++) {
                  const idx = everything.elements.findIndex(
                    (element) => element.text === item[i].text
                  );

                  console.log(
                    chalk.white(`  ${item[i].emoji} ${item[i].text}`),
                    chalk.grey(
                      `(${freq.res[idx] || 0} recipes, can craft ${
                        freq.craft[idx] || 0
                      } items)`
                    )
                  );
                }
              } else {
                console.log(chalk.red("No item found"));
              }
            }
            break;
          case "recipe":
            if (args.length === 2) {
              console.log(chalk.yellow("Usage:"));
              console.log(chalk.green("  infc search recipe <name>"));
            } else {
              const name = args.slice(2).join(" ");
              const target = everything.elements.find(
                (item) => item.text === name
              );
              const targetIdx = everything.elements.findIndex(
                (item) => item.text === name
              );

              const recipe = Array.from(everything.recipes.entries())
                .filter(([key, value]) => value === targetIdx)
                .map(([key, value]) => key)
                .sort((a, b) => {
                  const [fa, sa] = a.split("-");
                  const [fb, sb] = b.split("-");
                  const firstA = everything.elements[+fa].text;
                  const firstB = everything.elements[+fb].text;
                  if (firstA === firstB) {
                    const secondA = everything.elements[+sa].text;
                    const secondB = everything.elements[+sb].text;
                    return secondA.localeCompare(secondB);
                  }
                  return firstA.localeCompare(firstB);
                });

              if (recipe?.length) {
                console.log(
                  chalk.green("Recipes for: "),
                  target.emoji,
                  target.text
                );
                recipe.forEach((key) => {
                  const [f, s] = key.split("-");
                  const first = everything.elements[+f];
                  const second = everything.elements[+s];

                  console.log(
                    chalk.white(
                      `  ${first.emoji} ${first.text} + ${second.emoji} ${second.text} = ${target.emoji} ${target.text}`
                    )
                  );
                });
              } else {
                console.log(chalk.red("Recipe not found"));
              }
            }
            break;
          default:
            console.log(chalk.red("Unknown search type"));
            break;
        }
      }
      break;

    case "pair-all-for":
      if (args.length === 1) {
        console.log(chalk.yellow("Usage:"));
        console.log(
          chalk.green("  infc pair-all-for <item> [--non-sensitive]")
        );
      } else {
        const name = args[1];
        pairAllFor(name, args[2] === "--non-sensitive");
      }
      break;

    case "random-pair":
      if (args.length === 1) {
        console.log(chalk.yellow("Usage:"));
        console.log(chalk.green("  infc random-pair <times>"));
        return;
      }

      randomPair(args);
      break;

    case "pair-from-to":
      if (args.length === 1) {
        console.log(chalk.yellow("Usage:"));
        console.log(chalk.green("  infc pair-form-to <item> <item>"));
      } else {
        if (isNaN(args[1]) || isNaN(args[2])) {
          console.log(chalk.red("Invalid item id"));
          break;
        }

        pairFromTo(args);
      }
      break;

    default:
      console.log(chalk.red("Unknown command"));
      break;
  }
}
