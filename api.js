const express = require("express");
const cors = require("cors");
const fs = require("fs");

const data = JSON.parse(fs.readFileSync("./data.json"));

const app = express();
app.use(cors());

app.get("/list/:page", (req, res) => {
  const page = req.params.page;
  const perPage = 100;
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const elements = data.elements.slice(start, end);
  const freq = Object.values(data.recipes).reduce((acc, curr) => {
    acc[curr] = (acc[curr] || 0) + 1;
    return acc;
  }, {});

  elements.forEach((element) => {
    const idx = data.elements.findIndex((e) => e.text === element.text);
    element.recipeCount = freq[idx] || 0;
  });

  res.json({
    elements,
    totalPage: Math.ceil(data.elements.length / perPage),
  });
});

app.get("/item/:name", (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const item = data.elements.find((item) => item.text === name);
  res.json(item);
});

app.get("/recipes/:name", (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const id = data.elements.findIndex((item) => item.text === name);

  const recipe = Object.entries(data.recipes)
    .filter(([key, value]) => value === id)
    .map(([item]) => item.split("-").map((i) => data.elements[+i]));

  res.json(recipe);
});

app.get("/search", (req, res) => {
  const query = decodeURIComponent(req.query.q);
  const results = data.filter((item) =>
    item.text.toLowerCase().includes(query.toLowerCase())
  );
  res.json(results);
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
