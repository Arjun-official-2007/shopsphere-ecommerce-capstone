// auth.js - SIMULATED authentication (for learning only, not real security)
import { db } from "./store.js";

const hash = (s) => btoa(unescape(encodeURIComponent(s)));

function users() {
  const list = db.get("ss_users", null);
  if (list) return list;
  const seed = [{ id: 1, name: "Admin", email: "admin@shopsphere.dev", pass: hash("admin123"), role: "admin" }];
  db.set("ss_users", seed);
  return seed;
}

export const currentUser = () => db.get("ss_session", null);

export function register(name, email, password) {
  const list = users();
  if (list.some((u) => u.email === email.toLowerCase())) throw new Error("Email already registered.");
  const user = { id: Date.now(), name, email: email.toLowerCase(), pass: hash(password), role: "user" };
  db.set("ss_users", [...list, user]);
  return startSession(user);
}

export function login(email, password) {
  const user = users().find((u) => u.email === email.toLowerCase() && u.pass === hash(password));
  if (!user) throw new Error("Wrong email or password.");
  return startSession(user);
}

function startSession(u) {
  const session = { id: u.id, name: u.name, email: u.email, role: u.role };
  db.set("ss_session", session);
  return session;
}

export const logout = () => db.remove("ss_session");
