// app.js - UI + wiring
import { db } from "./store.js";
import * as auth from "./auth.js";
import * as P from "./products.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='160'><rect width='100%' height='100%' fill='%23e5e7eb'/></svg>";

const state = {
  products: [], category: "all", query: "", sort: "default",
  cart: db.get("ss_cart", []), user: auth.currentUser(), view: "catalog", registerMode: false, editId: null,
};

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg; document.body.append(t);
  setTimeout(() => t.remove(), 2000);
}
const saveCart = () => { db.set("ss_cart", state.cart); renderCartCount(); };
const renderCartCount = () => ($("cartCount").textContent = state.cart.reduce((n, i) => n + i.qty, 0));

/* ---------- views ---------- */
function setView(v) {
  if (v === "admin" && state.user?.role !== "admin") v = "catalog";
  state.view = v;
  ["catalog", "cart", "admin"].forEach((n) => $(n + "View").classList.toggle("hidden", n !== v));
  render();
}

function renderHeader() {
  $("authBtn").textContent = state.user ? "Logout" : "Login";
  $("userLabel").textContent = state.user ? `Hi, ${state.user.name}` : "";
  $("adminTab").classList.toggle("hidden", state.user?.role !== "admin");
}

function renderCatalog() {
  const cats = ["all", ...new Set(state.products.map((p) => p.category))];
  $("tabs").innerHTML = cats.map((c) => `<button class="tab ${c === state.category ? "active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
  let list = state.products.filter((p) => (state.category === "all" || p.category === state.category) && p.title.toLowerCase().includes(state.query.toLowerCase()));
  if (state.sort === "low") list.sort((a, b) => a.price - b.price);
  if (state.sort === "high") list.sort((a, b) => b.price - a.price);
  $("products").innerHTML = list.length ? list.map((p) => `
    <article class="card product">
      <img src="${esc(p.image || IMG)}" alt="${esc(p.title)}" loading="lazy">
      <h3>${esc(p.title)}</h3><p class="muted">${esc(p.category)}</p>
      <p class="price">$${Number(p.price).toFixed(2)}</p>
      <button class="btn" data-add="${p.id}">Add to cart</button>
    </article>`).join("") : '<p class="empty muted">No products found.</p>';
}

function renderCart() {
  const rows = state.cart.map((i) => ({ ...i, p: state.products.find((p) => p.id === i.id) })).filter((r) => r.p);
  const total = rows.reduce((s, r) => s + r.p.price * r.qty, 0);
  $("cartView").innerHTML = rows.length ? `
    <div class="card">${rows.map((r) => `
      <div class="cart-item"><strong>${esc(r.p.title)}</strong>
        <span>$${r.p.price.toFixed(2)} × ${r.qty}</span>
        <span class="row"><button class="btn ghost" data-dec="${r.id}">-</button><button class="btn ghost" data-inc="${r.id}">+</button><button class="btn danger" data-del="${r.id}">Remove</button></span>
      </div>`).join("<hr>")}
      <h3>Total: $${total.toFixed(2)}</h3>
      <button class="btn" id="checkout">Checkout</button></div>` : '<p class="empty muted">Your cart is empty.</p>';
}

function renderAdmin() {
  $("adminRows").innerHTML = state.products.map((p) => `
    <tr><td>${esc(p.title)}</td><td>${esc(p.category)}</td><td>$${Number(p.price).toFixed(2)}</td>
    <td class="row"><button class="btn ghost" data-edit="${p.id}">Edit</button><button class="btn danger" data-remove="${p.id}">Delete</button></td></tr>`).join("");
}

function render() {
  renderHeader(); renderCartCount();
  if (state.view === "catalog") renderCatalog();
  if (state.view === "cart") renderCart();
  if (state.view === "admin") renderAdmin();
}
const refreshProducts = () => { state.products = P.readProducts(); render(); };

/* ---------- auth dialog ---------- */
function openAuth() {
  state.registerMode = false; syncAuthForm(); $("authMsg").textContent = ""; $("authDialog").showModal();
}
function syncAuthForm() {
  const r = state.registerMode;
  $("authTitle").textContent = r ? "Register" : "Login";
  $("aName").parentElement.classList.toggle("hidden", !r);
  $("aName").required = r;
  $("switchAuth").textContent = r ? "Have an account? Login" : "Need an account? Register";
}
$("switchAuth").addEventListener("click", () => { state.registerMode = !state.registerMode; syncAuthForm(); });
$("authForm").addEventListener("submit", (e) => {
  try {
    state.user = state.registerMode
      ? auth.register($("aName").value.trim(), $("aEmail").value, $("aPass").value)
      : auth.login($("aEmail").value, $("aPass").value);
    $("authForm").reset(); toast(`Welcome, ${state.user.name}!`); render();
  } catch (err) {
    e.preventDefault(); $("authMsg").textContent = err.message;
  }
});
$("authBtn").addEventListener("click", () => {
  if (state.user) { auth.logout(); state.user = null; setView("catalog"); toast("Logged out"); }
  else openAuth();
});

/* ---------- product dialog (create / update) ---------- */
function openProductDialog(id = null) {
  state.editId = id;
  const p = id ? state.products.find((x) => x.id === id) : { title: "", price: "", category: "", image: "" };
  $("productTitle").textContent = id ? "Edit Product" : "Add Product";
  $("pTitle").value = p.title; $("pPrice").value = p.price; $("pCategory").value = p.category; $("pImage").value = p.image || "";
  $("productDialog").showModal();
}
$("addProductBtn").addEventListener("click", () => openProductDialog());
$("productForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = { title: $("pTitle").value.trim(), price: Number($("pPrice").value), category: $("pCategory").value.trim().toLowerCase(), image: $("pImage").value.trim() };
  state.editId ? P.updateProduct(state.editId, data) : P.createProduct(data);
  $("productDialog").close(); toast("Saved"); refreshProducts();
});
document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));

/* ---------- global click handling ---------- */
document.addEventListener("click", (e) => {
  const t = e.target.closest("button"); if (!t) return;
  const num = (k) => Number(t.dataset[k]);
  if (t.dataset.view) setView(t.dataset.view);
  if (t.dataset.cat) { state.category = t.dataset.cat; render(); }
  if (t.dataset.add) {
    if (!state.user) { toast("Please login first"); return openAuth(); }
    const item = state.cart.find((i) => i.id === num("add")); item ? item.qty++ : state.cart.push({ id: num("add"), qty: 1 });
    saveCart(); toast("Added to cart");
  }
  if (t.dataset.inc) { state.cart.find((i) => i.id === num("inc")).qty++; saveCart(); render(); }
  if (t.dataset.dec) { const i = state.cart.find((x) => x.id === num("dec")); i.qty = Math.max(1, i.qty - 1); saveCart(); render(); }
  if (t.dataset.del) { state.cart = state.cart.filter((i) => i.id !== num("del")); saveCart(); render(); }
  if (t.id === "checkout") { state.cart = []; saveCart(); toast("Order placed (demo)"); render(); }
  if (t.dataset.edit) openProductDialog(num("edit"));
  if (t.dataset.remove && confirm("Delete this product?")) { P.deleteProduct(num("remove")); refreshProducts(); }
});
$("search").addEventListener("input", (e) => { state.query = e.target.value; renderCatalog(); });
$("sort").addEventListener("change", (e) => { state.sort = e.target.value; renderCatalog(); });

/* ---------- start ---------- */
(async function init() {
  try { state.products = await P.loadProducts(); }
  catch { $("errorBox").innerHTML = '<div class="error-banner">Could not load products.</div>'; }
  render();
})();
