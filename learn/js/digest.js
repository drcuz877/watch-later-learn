/* Shared digest loading, sorting, and small DOM helpers. */
(function (root) {
  const DIGEST_URL = "data/digest.csv";

  function norm(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[\u2018\u2019\u201B]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\s+/g, " ")
      .trim();
  }

  function isWorth(verdict) {
    return norm(verdict) === "yes";
  }

  function verdictLabel(verdict) {
    return isWorth(verdict) ? "worth watching" : "skim";
  }

  // Newest YouTube publish date first. Rows without a valid published_date go last,
  // in the previous order (date_added newest first, then playlist position).
  function validDate(value) {
    const v = String(value || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "";
  }

  function sortDigests(rows) {
    return rows.slice().sort((a, b) => {
      const pa0 = validDate(a.published_date);
      const pb0 = validDate(b.published_date);
      if (pa0 && !pb0) return -1;
      if (!pa0 && pb0) return 1;
      if (pa0 !== pb0) return pa0 < pb0 ? 1 : -1;
      const da = a.date_added || "";
      const db = b.date_added || "";
      if (da !== db) return da < db ? 1 : -1;
      const pa = Number(a.playlist_position);
      const pb = Number(b.playlist_position);
      const na = Number.isFinite(pa) ? pa : Number.MAX_SAFE_INTEGER;
      const nb = Number.isFinite(pb) ? pb : Number.MAX_SAFE_INTEGER;
      return na - nb;
    });
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // "2026-06-27" -> "Jun 27, 2026" (parsed by hand so time zones never shift the day).
  function formatPublished(value) {
    const v = validDate(value);
    if (!v) return "";
    const [y, m, d] = v.split("-").map((n) => parseInt(n, 10));
    if (!(m >= 1 && m <= 12)) return "";
    return MONTHS[m - 1] + " " + d + ", " + y;
  }

  function shortLength(length) {
    const parts = String(length || "").trim().split(":");
    if (parts.length === 3) {
      const h = parseInt(parts[0], 10) || 0;
      const m = parts[1];
      const s = parts[2];
      if (h > 0) return h + ":" + m + ":" + s;
      return String(parseInt(m, 10)) + ":" + s;
    }
    if (parts.length === 2) {
      return String(parseInt(parts[0], 10) || 0) + ":" + parts[1];
    }
    return String(length || "");
  }

  function formatSeconds(total) {
    let sec = Math.max(0, Math.round(Number(total) || 0));
    const h = Math.floor(sec / 3600);
    sec -= h * 3600;
    const m = Math.floor(sec / 60);
    const s = sec - m * 60;
    const pad = (n) => String(n).padStart(2, "0");
    if (h > 0) return h + ":" + pad(m) + ":" + pad(s);
    return m + ":" + pad(s);
  }

  function timeToSeconds(time) {
    const parts = String(time || "")
      .trim()
      .split(":")
      .map((part) => parseInt(part, 10));
    if (!parts.length || parts.some((n) => !Number.isFinite(n))) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0];
  }

  function parseJsonArray(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw == null || String(raw).trim() === "") return [];
    try {
      const value = JSON.parse(raw);
      return Array.isArray(value) ? value : [];
    } catch (err) {
      return [];
    }
  }

  function summaryBullets(summary) {
    return String(summary || "")
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*[•\u2022\-\*·]+\s*/, "").trim())
      .filter(Boolean);
  }

  function keyPoints(raw) {
    return parseJsonArray(raw).filter((point) => point && (point.text || point.time));
  }

  function quizItems(raw) {
    return parseJsonArray(raw).filter((item) => item && (item.q || item.a));
  }

  function momentSeconds(point) {
    if (point && point.seconds != null && point.seconds !== "" && Number.isFinite(Number(point.seconds))) {
      return Math.max(0, Math.round(Number(point.seconds)));
    }
    return timeToSeconds(point && point.time);
  }

  function momentLabel(point) {
    if (point && point.time) return String(point.time);
    return formatSeconds(momentSeconds(point));
  }

  function timestampUrl(videoId, seconds) {
    const s = Math.max(0, Math.round(Number(seconds) || 0));
    return "https://www.youtube.com/watch?v=" + encodeURIComponent(videoId) + "&t=" + s + "s";
  }

  function watchUrl(video) {
    if (video && video.url) return video.url;
    return "https://www.youtube.com/watch?v=" + encodeURIComponent(video.video_id);
  }

  const PLAYLISTS = ["All Things AI", "Claude", "The AI Edge", "Claude For Finance", "Stanford LLMs"];
  const OWN_PLAYLISTS = ["All Things AI", "Claude"];
  const EXTERNAL = ["The AI Edge", "Claude For Finance", "Stanford LLMs"];
  const MAIN_TOPICS = [
    "Agents", "Prompting", "Automation", "Setup guides", "Comparisons", "Second brain and notes",
    "Coding and building apps", "Finance and data", "Productivity and workflows",
    "Local and open models", "Images and video", "How AI works", "AI news and trends", "Course",
  ];
  const MORE_TOPICS = ["Research", "Content and writing"];

  function splitTags(raw) {
    return String(raw || "").split(";").map((t) => t.trim()).filter(Boolean);
  }

  function isExternal(video) {
    const src = String((video && video.source_playlist) || "").trim();
    return Boolean(src) && !OWN_PLAYLISTS.includes(src);
  }

  function sourceBadge(video) {
    if (!isExternal(video)) return null;
    return el("span", { class: "src", text: "From " + video.source_playlist });
  }

  function tagChips(video, linked) {
    const wrap = el("div", { class: "tags" });
    splitTags(video.tools).forEach((t) => {
      const props = { class: "tc tool", text: t };
      if (linked) props.href = "index.html#tool=" + encodeURIComponent(t);
      wrap.append(el(linked ? "a" : "span", props));
    });
    splitTags(video.topics).forEach((t) => {
      const props = { class: "tc topic", text: t };
      if (linked) props.href = "index.html#topic=" + encodeURIComponent(t);
      wrap.append(el(linked ? "a" : "span", props));
    });
    return wrap;
  }

  function matchesQuery(video, query) {
    const q = norm(query);
    if (!q) return true;
    const hay = norm(
      [video.title, video.channel, video.verdict, video.verdict_reason, verdictLabel(video.verdict),
        video.tools, video.topics, video.source_playlist].join("\n")
    );
    return hay.includes(q);
  }

  function matchesFilters(video, query, worthOnly) {
    if (worthOnly && !isWorth(video.verdict)) return false;
    return matchesQuery(video, query);
  }

  function loadDigests() {
    if (location.protocol === "file:") {
      return Promise.reject(new Error("file"));
    }
    const parse = root.csvToObjects;
    return fetch(DIGEST_URL, { cache: "no-cache" }).then((res) => {
      if (!res.ok) throw new Error("status " + res.status);
      return res.text();
    }).then((text) => sortDigests(parse(text).filter((row) => row.video_id)));
  }

  function el(tag, props, children) {
    const node = document.createElement(tag);
    const attrs = props || {};
    Object.keys(attrs).forEach((key) => {
      const value = attrs[key];
      if (value == null || value === false) return;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else node.setAttribute(key, value);
    });
    (children || []).forEach((child) => {
      if (child == null || child === false) return;
      node.append(child.nodeType ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  function icon(markup) {
    const tpl = document.createElement("template");
    tpl.innerHTML = markup.trim();
    return tpl.content.firstElementChild;
  }

  const ICONS = {
    search:
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    play:
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  };

  function pill(verdict) {
    const yes = isWorth(verdict);
    return el("span", {
      class: "pill " + (yes ? "yes" : "skim"),
      text: yes ? "✓ Worth watching" : "⚡ Skim",
    });
  }

  root.Digest = {
    norm,
    isWorth,
    verdictLabel,
    sortDigests,
    formatPublished,
    shortLength,
    formatSeconds,
    summaryBullets,
    keyPoints,
    quizItems,
    momentSeconds,
    momentLabel,
    timestampUrl,
    watchUrl,
    matchesQuery,
    matchesFilters,
    loadDigests,
    el,
    icon,
    ICONS,
    pill,
    PLAYLISTS,
    EXTERNAL,
    OWN_PLAYLISTS,
    MAIN_TOPICS,
    MORE_TOPICS,
    splitTags,
    isExternal,
    sourceBadge,
    tagChips,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = root.Digest;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
