const CONTENT_KEY = "edilizia-trieste-content-v1";
const CONTENT_MAP = {
  homeKicker: "home-kicker",
  homeTitle: "home-title",
  homeText: "home-text",
  homeC1t: "home-c1t",
  homeC1p: "home-c1p",
  homeC2t: "home-c2t",
  homeC2p: "home-c2p",
  homeC3t: "home-c3t",
  homeC3p: "home-c3p",
};

function toast(msg, ms = 2400) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.style.display = "none";
  }, ms);
}

function getContent() {
  try {
    return JSON.parse(localStorage.getItem(CONTENT_KEY) || "{}");
  } catch {
    return {};
  }
}

function applyContent() {
  const c = getContent();
  Object.entries(CONTENT_MAP).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el && c[key] != null) el.textContent = c[key];
  });
}

function fillContentForm() {
  const form = document.getElementById("content-form");
  if (!form) return;
  const c = getContent();
  Object.entries(CONTENT_MAP).forEach(([key, id]) => {
    const input = form.elements[key];
    if (!input) return;
    input.value =
      c[key] != null
        ? c[key]
        : (document.getElementById(id)?.textContent || "").replace(/\s+/g, " ").trim();
  });
}

function showPanel(id) {
  if (id === "admin" && !isAdmin()) {
    document.getElementById("login-modal").classList.add("open");
    id = "home";
  }
  document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === id));
  document.querySelectorAll(".tabs button[data-tab]").forEach((b) => {
    b.setAttribute("aria-selected", b.dataset.tab === id ? "true" : "false");
  });
  history.replaceState(null, "", "#" + id);
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (id === "galleria") renderGalleria();
  if (id === "admin") {
    fillContentForm();
    renderCandidature();
    renderMessaggi();
    renderGalleria();
    renderAdminGallery();
  }
}

async function renderGalleria() {
  const grid = document.getElementById("gallery-grid");
  const empty = document.getElementById("gallery-empty");
  const [remote, local] = await Promise.all([fotoDaManifest(), allFotoLocali()]);
  const items = [
    ...remote.map((f) => ({ ...f, src: f.src, remote: true })),
    ...local.map((f) => ({ ...f, src: f.dataUrl, remote: false })),
  ];
  if (!items.length) {
    grid.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  grid.innerHTML = items
    .map(
      (f) => `<figure>
        <img src="${f.src}" alt="${escapeHtml(f.titolo || "Lavoro edile")}" data-full="${f.src}">
        <figcaption>
          <strong>${escapeHtml(f.titolo || "Cantiere")}</strong>
          <small>${escapeHtml(f.descrizione || "")}</small>
        </figcaption>
      </figure>`
    )
    .join("");
}

async function renderAdminGallery() {
  const grid = document.getElementById("admin-gallery");
  if (!grid) return;
  const local = await allFotoLocali();
  if (!local.length) {
    grid.innerHTML = `<p class="empty">Nessuna foto caricata da questo computer.</p>`;
    return;
  }
  grid.innerHTML = local
    .map(
      (f) => `<figure>
        <img src="${f.dataUrl}" alt="${escapeHtml(f.titolo || "Lavoro edile")}" data-full="${f.dataUrl}">
        <figcaption>
          <strong>${escapeHtml(f.titolo || "Cantiere")}</strong>
          <small>${escapeHtml(f.descrizione || "")}</small>
          <button class="btn ghost" data-del="${f.id}" type="button">Rimuovi</button>
        </figcaption>
      </figure>`
    )
    .join("");
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderCandidature() {
  const box = document.getElementById("candidature-list");
  if (!box) return;
  const list = getCandidature();
  if (!list.length) {
    box.innerHTML = `<p class="empty">Nessuna richiesta per ora.</p>`;
    return;
  }
  box.innerHTML = list
    .map(
      (c) => `<article class="inbox-item">
        <h3>${escapeHtml(c.nome)}</h3>
        <p>${escapeHtml(c.mestiere)} · ${escapeHtml(c.tel)} · ${escapeHtml(c.email)}</p>
        <p>${escapeHtml(c.msg)}</p>
      </article>`
    )
    .join("");
}

function renderMessaggi() {
  const box = document.getElementById("messaggi-list");
  if (!box) return;
  const list = getMessaggi();
  if (!list.length) {
    box.innerHTML = `<p class="empty">Nessun messaggio dal form Contatti.</p>`;
    return;
  }
  box.innerHTML = list
    .map(
      (m) => `<article class="inbox-item">
        <h3>${escapeHtml(m.nome)}</h3>
        <p>${escapeHtml(m.oggetto || "Messaggio")} · ${escapeHtml(m.tel)} · ${escapeHtml(m.email)}</p>
        <p>${escapeHtml(m.msg)}</p>
      </article>`
    )
    .join("");
}

document.addEventListener("DOMContentLoaded", () => {
  setAdmin(isAdmin());
  applyContent();
  const hash = (location.hash || "#home").replace("#", "");
  showPanel(document.getElementById(hash) ? hash : "home");

  document.querySelector(".tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tab]");
    if (btn) showPanel(btn.dataset.tab);
    if (e.target.id === "open-login") {
      if (isAdmin()) showPanel("admin");
      else document.getElementById("login-modal").classList.add("open");
    }
    if (e.target.id === "logout") {
      setAdmin(false);
      toast("Sei uscito dall'area admin");
      showPanel("home");
    }
  });

  document.querySelector(".admin-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-admin]");
    if (!btn) return;
    document.querySelectorAll(".admin-tabs button").forEach((b) => b.classList.toggle("on", b === btn));
    document.querySelectorAll(".admin-section").forEach((s) => {
      s.classList.toggle("on", s.id === "admin-" + btn.dataset.admin);
    });
  });

  document.getElementById("close-login").addEventListener("click", () => {
    document.getElementById("login-modal").classList.remove("open");
  });

  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isLocked()) {
      toast("Accesso temporaneamente bloccato");
      return;
    }
    const fd = new FormData(e.target);
    const res = await tryLogin(fd.get("user"), fd.get("pass"));
    if (res.ok) {
      document.getElementById("login-modal").classList.remove("open");
      e.target.reset();
      toast("Accesso eseguito. Puoi modificare il sito.");
      showPanel("admin");
    } else toast(res.msg, 3500);
  });

  document.getElementById("content-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!isAdmin()) return;
    const fd = new FormData(e.target);
    const next = {};
    Object.keys(CONTENT_MAP).forEach((key) => {
      next[key] = String(fd.get(key) || "").trim();
    });
    localStorage.setItem(CONTENT_KEY, JSON.stringify(next));
    applyContent();
    toast("Testi del sito aggiornati");
  });

  document.getElementById("foto-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!isAdmin()) return;
    const file = document.getElementById("foto-file").files[0];
    if (!file) {
      toast("Scegli una foto");
      return;
    }
    toast("Elaborazione foto...");
    const blob = await resizeImage(file);
    const dataUrl = await blobToDataUrl(blob);
    await saveFoto({
      id: crypto.randomUUID(),
      titolo: document.getElementById("foto-titolo").value.trim(),
      descrizione: document.getElementById("foto-desc").value.trim(),
      dataUrl,
      created: Date.now(),
    });
    e.target.reset();
    toast("Foto aggiunta in galleria");
    renderGalleria();
    renderAdminGallery();
  });

  document.getElementById("gallery-grid").addEventListener("click", (e) => {
    const img = e.target.closest("img[data-full]");
    if (img) {
      document.getElementById("lb-img").src = img.dataset.full;
      document.getElementById("lightbox").classList.add("open");
    }
  });

  document.getElementById("admin-gallery").addEventListener("click", async (e) => {
    const del = e.target.closest("[data-del]");
    if (del) {
      await deleteFoto(del.dataset.del);
      toast("Foto rimossa");
      renderGalleria();
      renderAdminGallery();
      return;
    }
    const img = e.target.closest("img[data-full]");
    if (img) {
      document.getElementById("lb-img").src = img.dataset.full;
      document.getElementById("lightbox").classList.add("open");
    }
  });

  document.getElementById("lightbox").addEventListener("click", () => {
    document.getElementById("lightbox").classList.remove("open");
  });

  document.getElementById("collab-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    addCandidatura({
      nome: fd.get("nome"),
      mestiere: fd.get("mestiere"),
      tel: fd.get("tel"),
      email: fd.get("email"),
      msg: fd.get("msg"),
    });
    e.target.reset();
    toast("Richiesta inviata. Vi contatteremo.");
  });

  document.getElementById("contact-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    addMessaggio({
      nome: fd.get("nome"),
      tel: fd.get("tel"),
      email: fd.get("email"),
      oggetto: fd.get("oggetto"),
      msg: fd.get("msg"),
    });
    e.target.reset();
    toast("Messaggio inviato. Ti ricontattiamo.");
  });

  syncLoginBtn();
  startHeroSlider();
  window.addEventListener("scroll", onParallax, { passive: true });
});

function startHeroSlider() {
  const slides = [...document.querySelectorAll(".hero-slides img")];
  if (slides.length < 2) return;
  let i = 0;
  setInterval(() => {
    slides[i].classList.remove("on");
    i = (i + 1) % slides.length;
    slides[i].classList.add("on");
  }, 4800);
}

function onParallax() {
  const y = window.scrollY * 0.18;
  document.querySelectorAll(".scene .layer").forEach((el, n) => {
    el.style.backgroundPosition = `center ${-y * (0.4 + n * 0.08)}px`;
  });
}

const _setAdmin = setAdmin;
setAdmin = function (on) {
  _setAdmin(on);
  syncLoginBtn();
};

function syncLoginBtn() {
  const login = document.getElementById("open-login");
  const logout = document.getElementById("logout");
  if (!login) return;
  login.textContent = isAdmin() ? "Pannello" : "Area admin";
  logout.style.display = isAdmin() ? "" : "none";
}
