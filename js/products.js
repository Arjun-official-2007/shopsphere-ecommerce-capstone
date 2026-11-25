// products.js - catalog data + CRUD (persisted in localStorage)
import { db } from "./store.js";

const KEY = "ss_products";
const FALLBACK = [
  { id: 1, title: "Classic Backpack", price: 39.99, category: "bags", image: "" },
  { id: 2, title: "Wireless Earbuds", price: 59.5, category: "electronics", image: "" },
  { id: 3, title: "Cotton T-Shirt", price: 14.99, category: "clothing", image: "" },
];

export async function loadProducts() {
  const saved = db.get(KEY, null);
  if (saved) return saved;
  let list = FALLBACK;
  try {                                   // first run: seed from public API
    const res = await fetch("https://fakestoreapi.com/products");
    if (!res.ok) throw new Error();
    list = await res.json();
  } catch { /* offline: use fallback */ }
  db.set(KEY, list);
  return list;
}

const all = () => db.get(KEY, []);

export function createProduct(data) {          // CREATE
  const item = { ...data, id: Date.now() };
  db.set(KEY, [item, ...all()]);
  return item;
}
export function updateProduct(id, data) {      // UPDATE
  db.set(KEY, all().map((p) => (p.id === id ? { ...p, ...data } : p)));
}
export function deleteProduct(id) {            // DELETE
  db.set(KEY, all().filter((p) => p.id !== id));
}
export const readProducts = all;               // READ
