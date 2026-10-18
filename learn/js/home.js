(function () {
  const D = window.Digest;
  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");
  const countLabel = document.getElementById("count-label");
  const search = document.getElementById("search");
  const worth = document.getElementById("worth");

  let all = [];
  let query = "";
  let worthOnly = false;

  function setCount(n) {
    const noun = n === 1 ? "digest" : "digests";
    countLabel.textContent = "🎬 " + n + " " + noun;
  }

  function render() {
    const visible = all.filter((video) => D.matchesFilters(video, query, worthOnly));
    grid.replaceChildren();
    const fragment = document.createDocumentFragment();
    visible.forEach((video, index) => {
      const length = D.shortLength(video.length);
      const img = D.el("img", {
        src: video.thumbnail_url,
        alt: "",
        loading: index < 4 ? "eager" : "lazy",
        decoding: "async",
      });
      img.addEventListener("error", () => img.remove());
      const card = D.el("a", { class: "card", href: "video.html?id=" + encodeURIComponent(video.video_id) }, [
        D.el("div", { class: "thumb" }, [
          img,
          D.pill(video.verdict),
          D.el("span", { class: "dur", text: length }),
        ]),
        D.el("div", { class: "body" }, [
          D.el("div", { class: "title", text: video.title }),
          D.el("div", { class: "meta" }, [
            D.el("span", { class: "ch", text: video.channel }),
            D.el("span", {}, ["⏱ " + length, D.el("b", { text: "·" }), video.date_added]),
          ]),
        ]),
      ]);
      fragment.append(card);
    });
    grid.append(fragment);
    setCount(visible.length);
    empty.hidden = visible.length !== 0;
    if (!visible.length) {
      empty.textContent = all.length
        ? "No digests match."
        : "No digests yet. The nightly update will add them to the list.";
    }
  }

  search.addEventListener("input", () => {
    query = search.value;
    render();
  });

  worth.addEventListener("click", () => {
    worthOnly = !worthOnly;
    worth.setAttribute("aria-pressed", worthOnly ? "true" : "false");
    render();
  });

  D.loadDigests()
    .then((rows) => {
      all = rows;
      render();
    })
    .catch((err) => {
      setCount(0);
      empty.hidden = false;
      empty.textContent =
        err && err.message === "file"
          ? "Open this page from a web server so it can read the digest file."
          : "The digest list could not be loaded.";
    });
})();
