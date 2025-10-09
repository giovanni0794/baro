console.log("Baro script loaded!");

// ===== HERO ROTATOR + SMART SEARCH + TOPBAR =====
window.initHero = function initHero() {

  /* =========================================================
     Topbar dropdown + auth state (runs on every page)
     ========================================================= */
  (function initTopbar() {
    const profileBtn = document.querySelector('.topbar__profile');
    const menu = document.querySelector('.topbar__menu');
    if (!profileBtn || !menu) return; // no topbar on this page

    const sectionOut = menu.querySelector('[data-when="signed-out"]');
    const sectionIn  = menu.querySelector('[data-when="signed-in"]');

    // open/close menu
    function openMenu(open) {
      profileBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.hidden = !open;
    }
    profileBtn.addEventListener('click', (e) => { e.stopPropagation(); openMenu(menu.hidden); });
    document.addEventListener('click', () => openMenu(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') openMenu(false); });

    // helper: flip signed-in/signed-out sections
    function setMenuState(signedIn) {
      if (sectionOut) sectionOut.hidden = signedIn;
      if (sectionIn)  sectionIn.hidden  = !signedIn;
    }

    // Try Supabase, but never auto-redirect on load
    (async () => {
      try {
        const SUPABASE_URL = window.SUPABASE_URL || 'https://lxplphqfkdvjtphafcyt.supabase.co';
        const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY ||
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4cGxwaHFma2R2anRwaGFmY3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDAxOTQsImV4cCI6MjA3NTQxNjE5NH0.cRm0HrVuhEgALHiyOtlMQWMvDcFXFaBZvBOysshpzjU';
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // initial state
        const { data: { session } } = await supabase.auth.getSession();
        setMenuState(!!session?.user);

        // logout: explicit navigation only here
        const logoutBtn = menu.querySelector('[data-action="logout"]');
        if (logoutBtn) logoutBtn.addEventListener('click', async () => {
          await supabase.auth.signOut();
          window.location.href = 'index.html';
        });

        // keep menu in sync without navigating
        supabase.auth.onAuthStateChange((_event, s) => {
          setMenuState(!!s?.user);
          // No auto-redirects here. Account/admin pages must remain reachable
          // while signed out so users can log in.
        });
      } catch {
        // If Supabase import fails, default to signed-out
        setMenuState(false);
      }
    })();
  })();

  /* =========================================================
     Hero rotator + smart search (runs only if hero exists)
     ========================================================= */
  const nounBtn = document.querySelector(".hero__noun-btn");
  if (!nounBtn) return; // no hero on this page; topbar already initialized

  const MAX_NOUNS_PER_SESSION = 8;
  const ROTATION_MS = 4500;
  const DEFAULT_WINDOW_DAYS = 14;

  // Persist the noun label so all pages sync
  const HERO_STORAGE_KEY = 'baro.hero.currentLabel';
  const saveNoun = (label) => { try { localStorage.setItem(HERO_STORAGE_KEY, label); } catch {} };
  const loadNoun = () => { try { return localStorage.getItem(HERO_STORAGE_KEY) || null; } catch { return null; } };

  const BRAND_MAP = {
    "starlink":           { label: "mobile satellite internet kit", filter: { cat: "connectivity", tag: "mobile-sat-internet" } },
    "satellite internet": { label: "mobile satellite internet kit", filter: { cat: "connectivity", tag: "mobile-sat-internet" } },
    "sat internet":       { label: "mobile satellite internet kit", filter: { cat: "connectivity", tag: "mobile-sat-internet" } },
    "gopro":              { label: "action camera kit", filter: { cat: "cameras", tag: "action-camera" } },
    "go pro":             { label: "action camera kit", filter: { cat: "cameras", tag: "action-camera" } },
    "insta360":           { label: "action camera kit", filter: { cat: "cameras", tag: "action-camera" } },
    "dji":                { label: "drone",            filter: { cat: "cameras", tag: "drone" } },
    "mavic":              { label: "drone",            filter: { cat: "cameras", tag: "drone" } },
    "thule":              { label: "roof box",         filter: { cat: "auto",    tag: "roof-box" } },
    "yakima":             { label: "roof box",         filter: { cat: "auto",    tag: "roof-box" } },
    "yeti":               { label: "hard cooler",      filter: { cat: "outdoors", tag: "cooler" } },
    "rtic":               { label: "hard cooler",      filter: { cat: "outdoors", tag: "cooler" } },
    "e-bike":             { label: "e-bike",           filter: { cat: "bikes",   tag: "ebike" } },
    "ebike":              { label: "e-bike",           filter: { cat: "bikes",   tag: "ebike" } },
    "jetboil":            { label: "camp stove",       filter: { cat: "outdoors", tag: "camp-stove" } },
  };

  const NOUNS = [
    { label: "snowboard",                     filter: { cat: "snow-sports", tag: "snowboard" } },
    { label: "mobile satellite internet kit", filter: { cat: "connectivity", tag: "mobile-sat-internet" } },
    { label: "generator",                     filter: { cat: "power", tag: "generator" } },
    { label: "e-bike",                        filter: { cat: "bikes", tag: "ebike" } },
    { label: "roof box",                      filter: { cat: "auto", tag: "roof-box" } },
    { label: "cooler",                        filter: { cat: "outdoors", tag: "cooler" } },
    { label: "camping kit",                   filter: { cat: "outdoors", tag: "camping-kit" } },
    { label: "backpacking kit",               filter: { cat: "outdoors", tag: "backpacking-kit" } },
    { label: "pair of trekking poles",        filter: { cat: "outdoors", tag: "trekking-poles" } },
    { label: "action camera kit",             filter: { cat: "cameras", tag: "action-camera" } },
    { label: "drone",                         filter: { cat: "cameras", tag: "drone" } },
  ];

  const root = document;
  const $ = (sel) => root.querySelector(sel);

  const nounArticle  = $(".hero__noun-article");
  const nounLabel    = $(".hero__noun-label");
  const input        = $("#hero-search-input");
  const clearBtn     = $(".hero__clear");
  const form         = $(".hero__search");
  const note         = $("#hero-converted-note");

  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function computeArticle(label) {
    const l = (label || "").toLowerCase().trim();
    if (l.startsWith("pair of ")) return "a";
    if (l.startsWith("e-") || l.startsWith("e ")) return "an";
    return "aeiou".includes(l[0]) ? "an" : "a";
  }

  function dateISO(d) { return d.toISOString().slice(0,10); }
  function defaultDates(days = DEFAULT_WINDOW_DAYS) {
    const s = new Date(), e = new Date(); e.setDate(s.getDate() + days);
    return { from: dateISO(s), to: dateISO(e) };
  }
  function buildResultsUrl(filter, dates) {
    const p = new URLSearchParams();
    if (filter?.cat) p.set("cat", filter.cat);
    if (filter?.tag) p.set("tag", filter.tag);
    if (filter?.q)   p.set("q", filter.q);
    if (dates?.from && dates?.to) { p.set("from", dates.from); p.set("to", dates.to); }
    else p.set("flex", DEFAULT_WINDOW_DAYS + "d");
    return "/browse?" + p.toString();
  }

  function normalize(text) {
    const raw = (text || "").trim();
    if (!raw) return null;
    const key = raw.toLowerCase();

    if (BRAND_MAP[key]) return { ...BRAND_MAP[key], mappedFrom: raw };
    for (const token in BRAND_MAP) {
      if (key.includes(token)) return { ...BRAND_MAP[token], mappedFrom: raw };
    }
    const seed = NOUNS.find(n => n.label.toLowerCase() === key);
    if (seed) return { ...seed, mappedFrom: null };

    if (/(ebike|e-bike)/.test(key)) return { label: "e-bike", filter: { cat: "bikes", tag: "ebike" }, mappedFrom: raw };
    if (/\b(roof box|cargo box|thule|yakima)\b/.test(key)) return { label: "roof box", filter: { cat: "auto", tag: "roof-box" }, mappedFrom: raw };
    if (/\b(paddle ?board|sup)\b/.test(key)) return { label: "paddle board", filter: { cat: "water", tag: "paddle-board" }, mappedFrom: raw };
    if (/\b(gopro|action cam|action camera)\b/.test(key)) return { label: "action camera kit", filter: { cat: "cameras", tag: "action-camera" }, mappedFrom: raw };

    return { label: raw, filter: { q: raw }, mappedFrom: null };
  }

  let idx = 0, shown = 0, paused = prefersReducedMotion, timer = null;

  const findIndexByLabel = (label) => NOUNS.findIndex(n => n.label.toLowerCase() === (label || '').toLowerCase());

  function setCurrent(noun) {
    nounArticle.textContent = computeArticle(noun.label);
    nounLabel.textContent   = noun.label;
    input.placeholder       = noun.label;
  }
  function start() {
    if (prefersReducedMotion || paused || shown >= MAX_NOUNS_PER_SESSION) return;
    stop();
    timer = setInterval(() => {
      idx = (idx + 1) % NOUNS.length;
      shown = Math.min(MAX_NOUNS_PER_SESSION, shown + 1);
      setCurrent(NOUNS[idx]);
      saveNoun(NOUNS[idx].label);
    }, ROTATION_MS);
  }
  function stop() { if (timer) clearInterval(timer); timer = null; }

  // Initialize noun from storage if available
  const stored = loadNoun();
  if (stored) {
    const j = findIndexByLabel(stored);
    if (j >= 0) idx = j;
  }
  setCurrent(NOUNS[idx]);
  saveNoun(NOUNS[idx].label);
  start();

  nounBtn.addEventListener("click", () => {
    paused = true; stop();
    input.value = nounLabel.textContent;
    saveNoun(nounLabel.textContent);
    input.focus();
  });
  nounBtn.addEventListener("mouseenter", () => { paused = true; stop(); });
  nounBtn.addEventListener("mouseleave", () => { if (!input.value && !prefersReducedMotion) { paused = false; start(); } });

  input.addEventListener("focus", () => { paused = true; stop(); });
  input.addEventListener("blur",  () => { if (!input.value && !prefersReducedMotion) { paused = false; start(); } });
  input.addEventListener("keydown", (e) => { if (e.key === "Escape") clearBtn.click(); });

  clearBtn.addEventListener("click", () => { input.value = ""; note.hidden = true; if (!prefersReducedMotion) { paused = false; start(); } });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const dates = defaultDates(DEFAULT_WINDOW_DAYS);
    const typed = input.value.trim();

    let normalized = typed
      ? normalize(typed)
      : { label: NOUNS[idx].label, filter: NOUNS[idx].filter, mappedFrom: null };

    if (normalized?.mappedFrom && normalized.mappedFrom.toLowerCase() !== normalized.label.toLowerCase()) {
      note.textContent = `Converted “${normalized.mappedFrom}” to “${normalized.label}”.`;
      note.hidden = false;
      setTimeout(() => { note.hidden = true; }, 3500);
    }
    saveNoun(normalized.label);
    window.location.assign(buildResultsUrl(normalized.filter, dates));
  });
};
