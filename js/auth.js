const AUTH = {
  user: "3ba4ab054be1c1d4508006e327243bb518b0773d0c38ea1ff874a3b6b7a8e2e7",
  pass: "577819d18d3643158c9b0f8f07250d056ed1274887120a038f9fc546ba88aab9",
};

const SESS_KEY = "edilizia-trieste-session-v2";
const LOCK_KEY = "edilizia-trieste-lock";
const MAX_FAILS = 5;
const LOCK_MS = 3 * 60 * 1000;

async function sha256hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function lockState() {
  try {
    return JSON.parse(localStorage.getItem(LOCK_KEY) || '{"fails":0,"until":0}');
  } catch {
    return { fails: 0, until: 0 };
  }
}

function isLocked() {
  return Date.now() < lockState().until;
}

function registerFail() {
  const s = lockState();
  s.fails += 1;
  if (s.fails >= MAX_FAILS) {
    s.until = Date.now() + LOCK_MS;
    s.fails = 0;
  }
  localStorage.setItem(LOCK_KEY, JSON.stringify(s));
  return s;
}

function clearLock() {
  localStorage.removeItem(LOCK_KEY);
}

function isAdmin() {
  return sessionStorage.getItem(SESS_KEY) === "ok";
}

function setAdmin(on) {
  if (on) sessionStorage.setItem(SESS_KEY, "ok");
  else sessionStorage.removeItem(SESS_KEY);
  document.body.classList.toggle("is-admin", on);
}

async function tryLogin(user, pass) {
  if (isLocked()) {
    const left = Math.ceil((lockState().until - Date.now()) / 60000);
    return { ok: false, msg: `Accesso bloccato. Riprova tra ${left} min.` };
  }
  const [hu, hp] = await Promise.all([sha256hex(user.trim()), sha256hex(pass)]);
  if (hu === AUTH.user && hp === AUTH.pass) {
    clearLock();
    setAdmin(true);
    return { ok: true };
  }
  const s = registerFail();
  if (s.until > Date.now()) return { ok: false, msg: "Troppi tentativi. Accesso bloccato per 3 minuti." };
  return { ok: false, msg: `Dati non corretti. Tentativi rimasti: ${MAX_FAILS - s.fails}.` };
}
