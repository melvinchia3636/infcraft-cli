const fs = require("fs");

const data = JSON.parse(fs.readFileSync("data.json", "utf8"));

const final = {
  elements: data.map((e) => ({
    text: e.text,
    icon: e.icon,
  })),
  recipes: Object.fromEntries(
    data.flatMap((e, i) => e.recipes.map((r) => [r, i]))
  ),
};

fs.writeFileSync("nice.json", JSON.stringify(final, null, 2));
