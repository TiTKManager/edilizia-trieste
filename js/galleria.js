const DB_NAME = "edilizia-trieste";
const STORE = "foto";
const CAND_KEY = "edilizia-trieste-candidature";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbOp(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const st = tx.objectStore(STORE);
        const req = fn(st);
        tx.oncomplete = () => resolve(req?.result);
        tx.onerror = () => reject(tx.error);
      })
  );
}

function saveFoto(foto) {
  return idbOp("readwrite", (st) => st.put(foto));
}

function deleteFoto(id) {
  return idbOp("readwrite", (st) => st.delete(id));
}

function allFotoLocali() {
  return idbOp("readonly", (st) => st.getAll()).then((r) => r || []);
}

async function fotoDaManifest() {
  try {
    const res = await fetch("galleria/manifest.json", { cache: "no-store" });
    const list = await res.json();
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function resizeImage(file, maxW = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("blob"))),
        "image/jpeg",
        0.86
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
}

function getCandidature() {
  try {
    return JSON.parse(localStorage.getItem(CAND_KEY) || "[]");
  } catch {
    return [];
  }
}

function addCandidatura(data) {
  const list = getCandidature();
  list.unshift({ ...data, id: crypto.randomUUID(), data: new Date().toISOString() });
  localStorage.setItem(CAND_KEY, JSON.stringify(list));
}

const MSG_KEY = "edilizia-trieste-messaggi";

function getMessaggi() {
  try {
    return JSON.parse(localStorage.getItem(MSG_KEY) || "[]");
  } catch {
    return [];
  }
}

function addMessaggio(data) {
  const list = getMessaggi();
  list.unshift({ ...data, id: crypto.randomUUID(), data: new Date().toISOString() });
  localStorage.setItem(MSG_KEY, JSON.stringify(list));
}
