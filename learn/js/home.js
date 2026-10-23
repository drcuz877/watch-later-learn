(function () {
  const D = window.Digest;
  const $ = (id) => document.getElementById(id);
  const grid = $("grid"), empty = $("empty"), countLabel = $("count-label");
  const search = $("search"), worth = $("worth"), activeBar = $("active");
  const side = $("side"), scrim = $("scrim"), filtersBtn = $("filters-btn");

  let all = [];
  let query = "";
  let worthOnly = false;
  const filters = { tool: null, topic: null, playlist: null };
  const LABEL = { tool: "Tool", topic: "Topic", playlist: "Playlist" };

  function readHash() {
    const h = new URLSearchParams(location.hash.replace(/^#/, ""));
    Object.keys(filters).forEach((k) => (filters[k] = h.get(k)));
  }
  function writeHash() {
    const h = new URLSearchParams();
    Object.keys(filters).forEach((k) => filters[k] && h.set(k, filters[k]));
    const s = h.toString();
    history.replaceState(null, "", s ? "#" + s : location.pathname + location.search);
  }

  function fieldOf(kind, v) {
    if (kind === "tool") return D.splitTags(v.tools);
    if (kind === "topic") return D.splitTags(v.topics);
    return [String(v.source_playlist || "All Things AI").trim()];
  }
  function matches(v) {
    if (!D.matchesFilters(v, query, worthOnly)) return false;
    return Object.keys(filters).every((k) => !filters[k] || fieldOf(k, v).includes(filters[k]));
  }

  function counts(kind) {
    const c = {};
    all.forEach((v) => fieldOf(kind, v).forEach((t) => (c[t] = (c[t] || 0) + 1)));
    return c;
  }

  function fbtn(kind, name, n) {
    const on = filters[kind] === name;
    const b = D.el("button", {
      type: "button",
      class: "f" + (on ? " on" : "") + (n ? "" : " zero") + " k-" + kind,
      "aria-pressed": on ? "true" : "false",
      disabled: n ? null : "disabled",
    }, [D.el("span", { class: "fl", text: name }), D.el("span", { class: "n", text: String(n) })]);
    b.addEventListener("click", () => {
      filters[kind] = on ? null : name;
      writeHash();
      update();
      if (mobileQuery.matches) closeSide();
    });
    return b;
  }

  function buildMenu() {
    const tc = counts("tool");
    const tools = Object.keys(tc).filter((t) => t !== "General AI")
      .sort((a, b) => tc[b] - tc[a] || a.localeCompare(b));
    const main = tools.filter((t) => tc[t] >= 2);
    const more = tools.filter((t) => tc[t] < 2);
    if (tc["General AI"]) main.push("General AI");
    $("f-tools").replaceChildren(...main.map((t) => fbtn("tool", t, tc[t])));
    $("f-tools-more").replaceChildren(...more.map((t) => fbtn("tool", t, tc[t])));
    $("more-tools").querySelector("summary").textContent = "More tools (" + more.length + ")";
    if (more.includes(filters.tool)) $("more-tools").open = true;

    const pc = counts("topic");
    $("f-topics").replaceChildren(...D.MAIN_TOPICS.filter((t) => t !== "Course" || pc[t])
      .map((t) => fbtn("topic", t, pc[t] || 0)));
    $("f-topics-more").replaceChildren(...D.MORE_TOPICS.map((t) => fbtn("topic", t, pc[t] || 0)));

    const lc = counts("playlist");
    const pls = D.PLAYLISTS.concat(Object.keys(lc).filter((p) => !D.PLAYLISTS.includes(p)));
    $("f-playlists").replaceChildren(...pls.map((p) => {
      const b = fbtn("playlist", p, lc[p] || 0);
      if (!D.OWN_PLAYLISTS.includes(p)) b.querySelector(".fl").append(D.el("span", { class: "ext-dot", text: "outside" }));
      return b;
    }));
    $("n-all").textContent = String(all.length);
    $("f-all").classList.toggle("on", !filters.tool && !filters.topic && !filters.playlist);
  }

  function card(video, index) {
    const length = D.shortLength(video.length);
    const thumb = D.el("div", { class: "thumb" }, [
      D.pill(video.verdict),
      D.el("span", { class: "dur", text: length }),
    ]);
    {
      const img = D.el("img", { src: video.thumbnail_url, alt: "", loading: index < 6 ? "eager" : "lazy", decoding: "async" });
      img.addEventListener("load", () => {
        if (img.naturalWidth <= 120 && !img.dataset.fb && /maxresdefault/.test(img.src)) { img.dataset.fb = "1"; img.src = img.src.replace("maxresdefault", "hqdefault"); }
      });
      img.addEventListener("error", () => {
        if (!img.dataset.fb && /maxresdefault/.test(img.src)) { img.dataset.fb = "1"; img.src = img.src.replace("maxresdefault", "hqdefault"); }
        else img.remove();
      });
      thumb.prepend(img);
    }
    const src = D.sourceBadge(video);
    const body = D.el("div", { class: "body" }, [
      src,
      D.el("div", { class: "title", text: video.title }),
      D.tagChips(video, false),
      D.el("div", { class: "meta" }, [
        D.el("span", { class: "ch", text: video.channel }),
        D.el("span", {}, ["⏱ " + length, D.el("b", { text: "·" }), video.date_added]),
      ]),
    ]);
    return D.el("a", { class: "card", href: "video.html?id=" + encodeURIComponent(video.video_id) }, [thumb, body]);
  }

  function renderActive() {
    const keys = Object.keys(filters).filter((k) => filters[k]);
    activeBar.hidden = !keys.length;
    activeBar.replaceChildren(
      D.el("span", { class: "a-lab", text: "Showing" }),
      ...keys.map((k) => {
        const b = D.el("button", { type: "button", class: "a-chip k-" + k }, [LABEL[k] + ": " + filters[k] + "  ✕"]);
        b.addEventListener("click", () => { filters[k] = null; writeHash(); update(); });
        return b;
      })
    );
  }

  function render() {
    const visible = all.filter(matches);
    grid.replaceChildren();
    const fragment = document.createDocumentFragment();
    visible.forEach((v, i) => fragment.append(card(v, i)));
    grid.append(fragment);
    const n = visible.length;
    countLabel.textContent = "🎬 " + n + " " + (n === 1 ? "digest" : "digests");
    empty.hidden = n !== 0;
    if (!n) empty.textContent = all.length ? "No digests match." : "No digests yet. The nightly update will add them to the list.";
  }

  function update() { buildMenu(); renderActive(); render(); }

  // Mobile drawer. While it is open the page behind is locked with the iOS-safe
  // position:fixed body technique (scroll position saved and restored on close).
  const mobileQuery = window.matchMedia("(max-width: 900px)");
  let savedY = 0;
  let locked = false;
  function lockPage() {
    if (locked) return;
    savedY = window.scrollY || window.pageYOffset || 0;
    document.body.style.top = -savedY + "px";
    document.documentElement.classList.add("menu-lock");
    locked = true;
  }
  function unlockPage() {
    if (!locked) return;
    document.documentElement.classList.remove("menu-lock");
    document.body.style.top = "";
    window.scrollTo(0, savedY);
    locked = false;
  }
  function openSide() {
    side.classList.add("open");
    scrim.hidden = false;
    filtersBtn.setAttribute("aria-expanded", "true");
    if (mobileQuery.matches) lockPage();
  }
  function closeSide() {
    side.classList.remove("open");
    scrim.hidden = true;
    filtersBtn.setAttribute("aria-expanded", "false");
    unlockPage();
  }
  // Swipes on the dimmed overlay must not scroll the page behind it.
  // (Only the overlay gets this handler; the drawer itself is never blocked.)
  scrim.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false });
  const onQueryChange = () => { if (!mobileQuery.matches) closeSide(); };
  if (mobileQuery.addEventListener) mobileQuery.addEventListener("change", onQueryChange);
  else if (mobileQuery.addListener) mobileQuery.addListener(onQueryChange);
  filtersBtn.addEventListener("click", openSide);
  $("side-close").addEventListener("click", closeSide);
  scrim.addEventListener("click", closeSide);
  $("f-all").addEventListener("click", () => {
    Object.keys(filters).forEach((k) => (filters[k] = null));
    writeHash(); update();
  });

  search.addEventListener("input", () => { query = search.value; render(); });
  worth.addEventListener("click", () => {
    worthOnly = !worthOnly;
    worth.setAttribute("aria-pressed", worthOnly ? "true" : "false");
    render();
  });
  window.addEventListener("hashchange", () => { readHash(); update(); });

  readHash();
  D.loadDigests()
    .then((rows) => { all = rows; update(); })
    .catch((err) => {
      countLabel.textContent = "🎬 0 digests";
      empty.hidden = false;
      empty.textContent = err && err.message === "file"
        ? "Open this page from a web server so it can read the digest file."
        : "The digest list could not be loaded.";
    });
})();
