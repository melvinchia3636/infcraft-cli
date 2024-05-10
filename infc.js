#!/usr/bin/env node

const chalk = require('chalk');
const fs = require('fs');

const raw = fs.readFileSync('./data.json');
let everything = JSON.parse(raw);

everything.elements = everything.elements.sort((a, b) => a.id - b.id);

fs.writeFileSync('./data.json', JSON.stringify(everything, null, 2));

const args = process.argv.slice(2);

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function pairItems(first, second, status, i) {
    return new Promise(async (resolve) => {
        await sleep(i * 100)
        await fetch(`https://infiniteback.org/pair?first=${first.text}&second=${second.text}`)
            .then((response) => response.json()).then((data) => {
                status.totalPairs++;

                if (!data || data.result === "Nothing") {
                    resolve()
                    return
                }

                if (data.isNew) {
                    status.newDiscoveryFound++;
                }

                if (everything.elements.findIndex((element) => element.text === data.result) === -1) {
                    isNew = true;

                    console.log((() => {
                        if (data.isNew) {
                            return chalk.magenta("[DISCOVERY]");
                        }
                        return chalk.green("[FOUND]");
                    })(), chalk.yellow(
                        `${status.totalPairs} / ${everything.elements.length}`,
                    ), '-', first.emoji, first.text, "+", second.emoji, second.text, "=", data.emoji, data.result);

                    everything.elements.push({
                        id: everything.elements.length,
                        emoji: data.emoji,
                        text: data.result,
                        isNew: data.isNew
                    });

                    status.newItemFound++;
                }

                if (!everything.recipe[`${first.id} + ${second.id}`] || !everything.recipe[`${second.id} + ${first.id}`]) {
                    everything.recipe[`${first.id} + ${second.id}`] = everything.elements.find(item => item.text === data.result).id;
                    status.newRecipeFound++;
                }
            })

        resolve()
    })
}

function logSummary(status, timeTaken) {
    console.log();
    console.log(chalk.green('Done in ' + timeTaken + 'ms!'));
    console.log(chalk.yellow('Summary:'));
    console.log(chalk.white(`  Total items scanned: ${status.totalPairs}`));
    console.log(chalk.green(`  New items found: ${status.newItemFound}`));
    console.log(chalk.magenta(`  New discoveries found: ${status.newDiscoveryFound}`));
    console.log(chalk.blue(`  New recipes found: ${status.newRecipeFound}`));
}

if (args.length === 0) {
    console.log(chalk.yellow('Usage:'));
    console.log(chalk.green('  infc <command>'));
    console.log(chalk.cyan('Commands:'));
    console.log(chalk.green('  infc list <item|recipe>'));
    console.log(chalk.green('  infc search <item|recipe> <name>'));
    console.log(chalk.green('  infc pair-all-for <item>'));
    console.log(chalk.green('  infc random-pair <times>'))
} else {
    switch (args[0]) {
        case 'list':
            if (args.length === 1) {
                console.log(chalk.yellow('Usage:'));
                console.log(chalk.green('  infc list <item|recipe>'));
            } else {
                switch (args[1]) {
                    case 'item':
                        console.log(chalk.cyan('Items:'));
                        everything.elements.forEach(item => {
                            console.log(chalk.white(`  ${item.emoji} ${item.text}`));
                        });
                        break;
                    case 'recipe':
                        console.log(chalk.cyan('recipe:'));
                        everything.recipe.forEach(recipe => {
                            console.log(chalk.green(`  ${recipe.name}`));
                        });
                        break;
                    default:
                        console.log(chalk.red('Unknown list type'));
                        break;
                }
            }
            break;
        case 'search':
            if (args.length === 1) {
                console.log(chalk.yellow('Usage:'));
                console.log(chalk.green('  infc search <item|recipe>'));
            } else {
                switch (args[1]) {
                    case 'item':
                        if (args.length === 2) {
                            console.log(chalk.yellow('Usage:'));
                            console.log(chalk.green('  infc search item <name>'));
                        } else {
                            const name = args.slice(2).join(' ');
                            const item = everything.elements.filter(item => item.text.toLowerCase().includes(name.toLowerCase()));

                            if (item.length) {
                                for (let i = 0; i < item.length; i++) {
                                    console.log(chalk.white(`  ${item[i].emoji} ${item[i].text}`));
                                }
                            } else {
                                console.log(chalk.red('No item found'));
                            }
                        }
                        break;
                    case 'recipe':
                        if (args.length === 2) {
                            console.log(chalk.yellow('Usage:'));
                            console.log(chalk.green('  infc search recipe <name>'));
                        } else {
                            const name = args.slice(2).join(' ');
                            const target = everything.elements.find(item => item.text === name);
                            const recipe = Object.entries(everything.recipe).filter(([key, value]) => value === name);
                            if (recipe.length) {
                                console.log(chalk.green('Recipes:'));
                                recipe.forEach(([key, value]) => {
                                    const [f, s] = key.split(' + ');
                                    const first = everything.elements.find(item => item.text === f);
                                    const second = everything.elements.find(item => item.text === s);
                                    console.log(chalk.white(`  ${first.emoji} ${first.text} + ${second.emoji} ${second.text} = ${target.emoji} ${target.text}`));
                                });
                            } else {
                                console.log(chalk.red('Recipe not found'));
                            }
                        }
                        break;
                    default:
                        console.log(chalk.red('Unknown search type'));
                        break;
                }
            }
            break;
        case 'pair-all-for':
            if (args.length === 1) {
                console.log(chalk.yellow('Usage:'));
                console.log(chalk.green('  infc pair-all-for <item>'));
            } else {
                const name = args.slice(1).join(' ');
                const item = everything.elements.find(item => item.text === name);
                if (item) {
                    const start = Date.now();
                    console.log(chalk.cyan('Now pairing all items with:'));
                    console.log(chalk.white(`  ${item.emoji} ${item.text}`));
                    console.log();

                    const status = {
                        totalPairs: 0,
                        newItemFound: 0,
                        newDiscoveryFound: 0,
                        newRecipeFound: 0
                    }

                    const allPromises = [];

                    for (const otherItemIdx in everything.elements) {

                        const otherItem = everything.elements[otherItemIdx];

                        if (everything.recipe[`${item.id} + ${otherItem.id}`] || everything.recipe[`${otherItem.id} + ${item.id}`]) {
                            continue;
                        }

                        const promise = pairItems(item, otherItem, status, otherItemIdx);
                        allPromises.push(promise);
                    }

                    Promise.all(allPromises).then(() => {
                        fs.writeFileSync('./data.json', JSON.stringify(everything, null, 2));
                        const timeTaken = Date.now() - start;
                        logSummary(status, timeTaken);
                    })
                } else {
                    console.log(chalk.red('Item not found'));
                }
            }
            break;

        case 'random-pair':
            if (args.length === 1) {
                console.log(chalk.yellow('Usage:'));
                console.log(chalk.green('  infc random-pair <times>'));
            } else {
                const times = parseInt(args[1]);
                if (isNaN(times)) {
                    console.log(chalk.red('Invalid number'));
                } else {
                    console.log(chalk.cyan(`Randomly pairing ${times} times: `));

                    const start = Date.now();

                    const status = {
                        totalPairs: 0,
                        newItemFound: 0,
                        newDiscoveryFound: 0,
                        newRecipeFound: 0
                    }

                    const allPromises = [];

                    for (let i = 0; i < times; i++) {
                        const elements = everything.elements.slice(0, 500)
                        const first = elements[Math.floor(Math.random() * elements.length)];
                        const second = elements[Math.floor(Math.random() * elements.length)];

                        const promise = pairItems(first, second, status, i);
                        allPromises.push(promise);
                    }

                    Promise.all(allPromises).then(() => {
                        fs.writeFileSync('./data.json', JSON.stringify(everything, null, 2));
                        const timeTaken = Date.now() - start;
                        logSummary(status, timeTaken);
                    })
                }
            }
            break;
        default:
            console.log(chalk.red('Unknown command'));
            break;

    }
}