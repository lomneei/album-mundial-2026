/* =========================================================================
   Álbum 26 — lógica de la app (vanilla JS, sin dependencias salvo Tesseract).
   Estado por lámina: { o: 1 (la tengo), d: N (repetidas extra) }.
   Ausente = "me falta". Todo se guarda en localStorage.
   ========================================================================= */
(() => {
  "use strict";

  const DATA = window.WC26_DATA;
  const STICKERS = DATA.stickers;
  const GROUPS = DATA.groups;
  const TOTAL = DATA.total;
  const STORAGE_KEY = "wc26.state.v1";

  // Índices auxiliares ------------------------------------------------------
  const byCode = new Map(STICKERS.map(s => [s.code, s]));
  const VALID = new Set(STICKERS.map(s => s.code));
  const HEADS = new Set(STICKERS.map(s => s.code.match(/^[A-Z]+/)?.[0]).filter(Boolean));

  // Estado ------------------------------------------------------------------
  let STATE = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }
  let saveTimer = null;
  function saveState() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE)); } catch {}
    }, 150);
  }

  function statusOf(code) {
    const st = STATE[code];
    if (!st || !st.o) return "falta";
    return (st.d || 0) > 0 ? "repe" : "tengo";
  }
  function dupesOf(code) { return (STATE[code] && STATE[code].d) || 0; }

  function setFalta(code) { delete STATE[code]; saveState(); }
  function setTengo(code) { STATE[code] = { o: 1, d: 0 }; saveState(); }
  function toggleOwned(code) { statusOf(code) === "falta" ? setTengo(code) : setFalta(code); }
  function addDupe(code) {
    const st = STATE[code] || { o: 1, d: 0 }; st.o = 1; st.d = (st.d || 0) + 1;
    STATE[code] = st; saveState();
  }
  function subDupe(code) {
    const st = STATE[code]; if (!st) return;
    if ((st.d || 0) > 0) st.d -= 1; else delete STATE[code];
    saveState();
  }

  // Utilidades --------------------------------------------------------------
  const norm = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const numPart = code => code === "00" ? "★" : (code.match(/\d+$/)?.[0] || "");

  // Filtros / UI state ------------------------------------------------------
  let filter = "all";       // all | falta | tengo | repe
  let teamFilter = "all";   // groupCode | all
  let query = "";

  const $ = sel => document.querySelector(sel);
  const grid = $("#grid");

  // ---- Render ------------------------------------------------------------
  const slotEls = new Map();   // code -> element
  const headEls = new Map();   // groupCode -> {prog}

  function passes(s) {
    if (teamFilter !== "all" && s.groupCode !== teamFilter) return false;
    if (filter !== "all" && statusOf(s.code) !== filter) return false;
    if (query) {
      const q = norm(query);
      const codeMatch = s.code.toLowerCase().replace(/\s/g, "").includes(query.toLowerCase().replace(/\s/g, ""));
      const nameMatch = norm(s.name).includes(q);
      const teamMatch = norm(s.teamES).includes(q);
      if (!codeMatch && !nameMatch && !teamMatch) return false;
    }
    return true;
  }

  function render() {
    slotEls.clear(); headEls.clear();
    grid.innerHTML = "";
    let shown = 0;

    for (const g of GROUPS) {
      const items = STICKERS.filter(s => s.groupCode === g.code && passes(s));
      if (!items.length) continue;
      shown += items.length;

      const block = document.createElement("section");
      block.className = "team-block";

      const head = document.createElement("div");
      head.className = "team-head";
      const owned = STICKERS.filter(s => s.groupCode === g.code && statusOf(s.code) !== "falta").length;
      const tot = STICKERS.filter(s => s.groupCode === g.code).length;
      head.innerHTML =
        `<span class="flag">${g.flag}</span><h2>${g.label}</h2>` +
        `<span class="tprog${owned === tot ? " done" : ""}">${owned}/${tot}</span>`;
      block.appendChild(head);
      headEls.set(g.code, { progEl: head.querySelector(".tprog"), tot });

      const gr = document.createElement("div");
      gr.className = "grid";
      for (const s of items) gr.appendChild(buildSlot(s));
      block.appendChild(gr);
      grid.appendChild(block);
    }

    if (!shown) {
      grid.innerHTML =
        `<div class="empty-state"><div class="big">🔍</div>` +
        `<p>No hay láminas que coincidan con este filtro.</p></div>`;
    }
    updateProgress();
  }

  function buildSlot(s) {
    const el = document.createElement("button");
    el.type = "button";
    el.dataset.code = s.code;
    const isText = s.type === "special";
    el.innerHTML =
      `<span class="code">${s.code}</span>` +
      `<span class="num${isText ? " is-text" : ""}">${isText ? s.name : numPart(s.code)}</span>` +
      (isText ? "" : `<span class="pname">${s.name}</span>`) +
      `<span class="dupe-badge"></span>` +
      `<span class="pm"><button class="minus" aria-label="Quitar repetida">−</button>` +
      `<button class="plus" aria-label="Sumar repetida">+</button></span>`;
    applySlotState(el, s.code);
    slotEls.set(s.code, el);

    // Tap en el cuerpo = alternar "la tengo"
    el.addEventListener("click", (ev) => {
      if (ev.target.closest(".pm")) return;        // los +/- se manejan aparte
      toggleOwned(s.code);
      onStickerChanged(s.code);
    });
    el.querySelector(".plus").addEventListener("click", (ev) => {
      ev.stopPropagation(); addDupe(s.code); onStickerChanged(s.code);
    });
    el.querySelector(".minus").addEventListener("click", (ev) => {
      ev.stopPropagation(); subDupe(s.code); onStickerChanged(s.code);
    });
    return el;
  }

  function applySlotState(el, code) {
    const s = byCode.get(code);
    const st = statusOf(code);
    el.className = "slot" + (s.foil ? " foil" : "") + " s-" + st;
    const badge = el.querySelector(".dupe-badge");
    if (badge) badge.textContent = "×" + (dupesOf(code) + 1); // total de copias = 1 + extras
  }

  // Tras cambiar una lámina: actualiza in-place sin re-render completo.
  function onStickerChanged(code) {
    const s = byCode.get(code);
    const el = slotEls.get(code);
    // Si el filtro actual ya no incluye esta lámina, la quitamos de la vista.
    if (el && !passes(s)) { reflowAfterFilterMiss(el, s); }
    else if (el) { applySlotState(el, code); }
    updateProgress();
    updateTeamHead(s.groupCode);
  }

  function reflowAfterFilterMiss(el, s) {
    const block = el.closest(".team-block");
    el.remove();
    // si el bloque quedó vacío, lo removemos
    if (block && !block.querySelector(".slot")) block.remove();
    if (!grid.querySelector(".slot")) {
      grid.innerHTML = `<div class="empty-state"><div class="big">✅</div><p>¡Nada por aquí con este filtro!</p></div>`;
    }
  }

  function updateTeamHead(groupCode) {
    const ref = headEls.get(groupCode);
    if (!ref) return;
    const owned = STICKERS.filter(s => s.groupCode === groupCode && statusOf(s.code) !== "falta").length;
    ref.progEl.textContent = `${owned}/${ref.tot}`;
    ref.progEl.classList.toggle("done", owned === ref.tot);
  }

  function updateProgress() {
    let tengo = 0, repe = 0;
    for (const s of STICKERS) {
      const st = statusOf(s.code);
      if (st === "tengo") tengo++;
      else if (st === "repe") repe++;
    }
    const owned = tengo + repe;
    const falta = TOTAL - owned;
    const pct = Math.round((owned / TOTAL) * 100);
    $("#pct").textContent = pct + "%";
    $("#frac").textContent = `${owned} / ${TOTAL}`;
    $("#barFill").style.width = pct + "%";
    $("#cTengo").textContent = owned;     // "tengo" incluye las que además son repetidas
    $("#cFalta").textContent = falta;
    $("#cRepe").textContent = repe;
  }

  // ---- Controles ---------------------------------------------------------
  // chips de estado
  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", "false"));
      chip.setAttribute("aria-pressed", "true");
      filter = chip.dataset.filter;
      render();
    });
  });

  // selección por equipo
  const teamSelect = $("#teamSelect");
  teamSelect.innerHTML =
    `<option value="all">Todas las selecciones</option>` +
    GROUPS.map(g => `<option value="${g.code}">${g.flag} ${g.label}</option>`).join("");
  teamSelect.addEventListener("change", () => { teamFilter = teamSelect.value; render(); });

  // búsqueda
  const searchInput = $("#search");
  const searchWrap = $("#searchWrap");
  searchInput.addEventListener("input", () => {
    query = searchInput.value.trim();
    searchWrap.classList.toggle("has-text", !!query);
    render();
  });
  $("#searchClear").addEventListener("click", () => {
    searchInput.value = ""; query = ""; searchWrap.classList.remove("has-text"); render(); searchInput.focus();
  });

  // ---- Hojas (sheets) ----------------------------------------------------
  const backdrop = $("#backdrop");
  const menuSheet = $("#menuSheet");
  const scanSheet = $("#scanSheet");
  function openSheet(sheet) { backdrop.classList.add("open"); sheet.classList.add("open"); }
  function closeSheets() {
    backdrop.classList.remove("open");
    menuSheet.classList.remove("open"); scanSheet.classList.remove("open");
    resetScanUI();
  }
  backdrop.addEventListener("click", closeSheets);
  $("#menuBtn").addEventListener("click", () => openSheet(menuSheet));
  $("#scanBtn").addEventListener("click", () => openSheet(scanSheet));

  // ---- Export / Import / Reset ------------------------------------------
  $("#exportBtn").addEventListener("click", () => {
    const payload = { app: "album26", version: 1, exportedAt: new Date().toISOString(), state: STATE };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url; a.download = `album26-${stamp}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Respaldo descargado");
  });

  $("#importFile").addEventListener("change", (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const incoming = data.state || data; // tolera formato directo
        if (typeof incoming !== "object") throw new Error("formato");
        const clean = {};
        let n = 0;
        for (const [code, st] of Object.entries(incoming)) {
          if (VALID.has(code) && st && st.o) { clean[code] = { o: 1, d: Math.max(0, parseInt(st.d) || 0) }; n++; }
        }
        STATE = clean; saveState(); render(); closeSheets();
        toast(`Progreso importado (${n} láminas)`);
      } catch { toast("Archivo inválido"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  $("#resetBtn").addEventListener("click", () => {
    if (confirm("¿Borrar TODO el progreso? Esto no se puede deshacer.")) {
      STATE = {}; saveState(); render(); closeSheets(); toast("Progreso borrado");
    }
  });

  // ---- Reconocimiento por foto (OCR) ------------------------------------
  const ocrStatus = $("#ocrStatus"), ocrMsg = $("#ocrMsg");
  const reviewWrap = $("#reviewWrap"), reviewList = $("#reviewList");

  $("#cameraInput").addEventListener("change", e => handleImage(e.target.files[0]));
  $("#galleryInput").addEventListener("change", e => handleImage(e.target.files[0]));
  $("#bulkBtn").addEventListener("click", () => {
    const tokens = ($("#bulkText").value || "").split(/[\s,;]+/).filter(Boolean);
    const codes = matchTokens(tokens);
    if (!codes.length) { toast("No reconocí ningún código válido"); return; }
    showReview(codes);
  });
  $("#reviewCancel").addEventListener("click", resetScanUI);
  $("#reviewApply").addEventListener("click", applyReview);

  function resetScanUI() {
    reviewWrap.style.display = "none"; reviewList.innerHTML = "";
    ocrStatus.classList.remove("show"); $("#bulkText").value = "";
    $("#cameraInput").value = ""; $("#galleryInput").value = "";
  }

  // Convierte un código OCR ruidoso al código válido más probable, o null.
  const LETTER_FIX = { "0": "O", "1": "I", "5": "S", "8": "B", "6": "G", "2": "Z", "4": "A", "7": "T" };
  const DIGIT_FIX = { "O": "0", "Q": "0", "I": "1", "L": "1", "S": "5", "B": "8", "G": "6", "Z": "2" };
  const fixLetters = s => s.split("").map(c => LETTER_FIX[c] || c).join("");
  const fixDigits = s => s.split("").map(c => DIGIT_FIX[c] || c).join("");

  function matchCode(raw) {
    let t = (raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!t) return null;
    if (t === "00" || t === "OO" || t === "0") return VALID.has("00") ? "00" : null;
    if (VALID.has(t)) return t;
    for (const headLen of [4, 3, 2]) {
      if (t.length <= headLen) continue;
      const head = fixLetters(t.slice(0, headLen));
      if (!HEADS.has(head)) continue;
      const num = parseInt(fixDigits(t.slice(headLen)).replace(/\D/g, ""), 10);
      if (Number.isNaN(num)) continue;
      const cand = head + num;
      if (VALID.has(cand)) return cand;
    }
    return null;
  }

  function matchTokens(tokens) {
    const out = [];
    const seen = new Set();
    for (const tok of tokens) {
      const code = matchCode(tok);
      if (code && !seen.has(code)) { seen.add(code); out.push(code); }
    }
    return out;
  }

  async function handleImage(file) {
    if (!file) return;
    if (typeof Tesseract === "undefined") {
      toast("OCR no disponible sin conexión la 1ª vez. Usa el texto manual."); return;
    }
    reviewWrap.style.display = "none";
    ocrStatus.classList.add("show"); ocrMsg.textContent = "Preparando imagen…";
    try {
      const canvas = await preprocess(file);
      ocrMsg.textContent = "Leyendo números…";
      const worker = await Tesseract.createWorker("eng", 1, {
        logger: m => {
          if (m.status === "recognizing text") ocrMsg.textContent = `Leyendo números… ${Math.round(m.progress * 100)}%`;
        }
      });
      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        tessedit_pageseg_mode: "11" // texto disperso
      });
      const { data } = await worker.recognize(canvas);
      await worker.terminate();

      const tokens = [];
      (data.text || "").split(/\s+/).forEach(t => tokens.push(t));
      (data.words || []).forEach(w => tokens.push(w.text));
      const codes = matchTokens(tokens);
      ocrStatus.classList.remove("show");
      if (!codes.length) { toast("No detecté códigos. Mejora la luz o usa el texto manual."); return; }
      showReview(codes);
    } catch (err) {
      console.error(err);
      ocrStatus.classList.remove("show");
      toast("Error al procesar la imagen");
    }
  }

  // Reduce tamaño + escala de grises + estiramiento de contraste.
  function preprocess(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1500;
        let { width: w, height: h } = img;
        const scale = Math.min(1, MAX / Math.max(w, h));
        w = Math.round(w * scale); h = Math.round(h * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        try {
          const imgData = ctx.getImageData(0, 0, w, h);
          const d = imgData.data;
          let min = 255, max = 0;
          for (let i = 0; i < d.length; i += 4) {
            const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
            d[i] = d[i + 1] = d[i + 2] = g;
            if (g < min) min = g; if (g > max) max = g;
          }
          const range = Math.max(1, max - min);
          for (let i = 0; i < d.length; i += 4) {
            const v = ((d[i] - min) / range) * 255;
            d[i] = d[i + 1] = d[i + 2] = v;
          }
          ctx.putImageData(imgData, 0, 0);
        } catch { /* getImageData puede fallar en algunos navegadores; seguimos con la imagen tal cual */ }
        URL.revokeObjectURL(img.src);
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  function showReview(codes) {
    reviewList.innerHTML = "";
    for (const code of codes) {
      const s = byCode.get(code);
      const st = statusOf(code);
      const willBe = st === "falta"
        ? `<b class="tengo">Marcar: la tengo</b>`
        : `<b class="repe">+1 repetida</b> (ya la tienes)`;
      const row = document.createElement("label");
      row.className = "rev";
      row.innerHTML =
        `<input type="checkbox" checked data-code="${code}" />` +
        `<span class="rcode">${s.flag} ${code}</span>` +
        `<span class="rinfo"><span class="rn">${s.name} · ${s.teamES}</span>` +
        `<span class="ract">${willBe}</span></span>`;
      reviewList.appendChild(row);
    }
    reviewWrap.style.display = "block";
    reviewWrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function applyReview() {
    const checks = reviewList.querySelectorAll('input[type="checkbox"]:checked');
    let nuevas = 0, repes = 0;
    checks.forEach(ch => {
      const code = ch.dataset.code;
      if (statusOf(code) === "falta") { setTengo(code); nuevas++; }
      else { addDupe(code); repes++; }
    });
    render();
    closeSheets();
    const parts = [];
    if (nuevas) parts.push(`${nuevas} nueva${nuevas > 1 ? "s" : ""}`);
    if (repes) parts.push(`${repes} repetida${repes > 1 ? "s" : ""}`);
    toast(parts.length ? "Listo: " + parts.join(" · ") : "Sin cambios");
  }

  // ---- Toast -------------------------------------------------------------
  let toastTimer = null;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg; el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  // ---- Service worker ----------------------------------------------------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  // ---- Inicio ------------------------------------------------------------
  render();
})();
