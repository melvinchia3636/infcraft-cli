import React, { useEffect, useState } from "react";
import Pagination from "./PageNumber";
import { Link, Route, Routes, useParams } from "react-router-dom";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useDebounce } from "@uidotdev/usehooks";

function Home() {
  const [items, setItems] = useState<
    {
      emoji: string;
      text: string;
      recipeCount: number;
    }[]
  >([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const actualSearch = useDebounce(search, 500);

  useEffect(() => {
    if (actualSearch) {
      fetch(
        `http://localhost:3000/search?q=${encodeURIComponent(actualSearch)}`
      )
        .then((res) => res.json())
        .then((data) => {
          setItems(data);
        });
    } else {
      fetch(`http://localhost:3000/list/${page}`)
        .then((res) => res.json())
        .then((data) => {
          setItems(data.elements);
          setTotalPages(data.totalPage);
        });
    }
  }, [page, actualSearch]);

  return (
    <>
      <h1 className="text-3xl font-bold text-center">Infinite Craft Index</h1>
      <search className="flex w-full gap-2 bg-zinc-800 rounded-md items-center px-4 my-6 p-2">
        <Icon icon="uil:search" className="text-zinc-500 size-6" />
        <input
          type="text"
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className=" p-2 w-full bg-transparent focus:outline-none text-zinc-200"
        />
      </search>
      <ul className="divide-y divide-zinc-800">
        {items.map((item) => (
          <li key={item.text}>
            <Link
              to={`/item/${item.text}`}
              className="flex items-center justify-between p-4"
            >
              <div className="space-y-2">
                <span className="text-2xl">{item.emoji}</span>
                <span className="text-xl ml-4">{item.text}</span>
              </div>
              <span className="text-lg text-zinc-500">
                {item.recipeCount.toLocaleString()} recipes
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {!search && (
        <Pagination page={page} totalPages={totalPages} setPage={setPage} />
      )}
    </>
  );
}

function Item() {
  const { id } = useParams();

  const [itemData, setItemData] = useState<{
    id: number;
    emoji: string;
    text: string;
  } | null>(null);
  const [recipes, setRecipes] = useState<
    {
      id: number;
      emoji: string;
      text: string;
    }[][]
  >([]);

  useEffect(() => {
    fetch(`http://localhost:3000/item/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setItemData(data);
      });

    fetch(`http://localhost:3000/recipes/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setRecipes(data);
      });
  }, [id]);

  return (
    <>
      <div className="flex items-center justify-center mb-8 gap-4">
        <h1 className="text-3xl font-bold">{itemData?.emoji}</h1>
        <h1 className="text-3xl font-bold">{itemData?.text}</h1>
      </div>
      <ul className="divide-y divide-zinc-800">
        {recipes.map((recipe, index) => (
          <li key={index} className="p-4 flex items-center gap-5">
            {recipe[0] && (
              <Link
                to={`/item/${recipe[0].id}`}
                className="flex items-center space-x-2"
              >
                <span className="text-2xl">{recipe[0].emoji}</span>
                <span className="text-xl">{recipe[0].text}</span>
              </Link>
            )}
            <Icon icon="uil:plus" className="text-zinc-500 size-5" />
            {recipe[1] && (
              <Link
                to={`/item/${recipe[1].id}`}
                className="flex items-center space-x-2"
              >
                <span className="text-2xl">{recipe[1].emoji}</span>
                <span className="text-xl">{recipe[1].text}</span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function App() {
  return (
    <main className="bg-zinc-900 text-zinc-200 p-32 w-full min-h-dvh">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/item/:id" element={<Item />} />
      </Routes>
    </main>
  );
}

export default App;
