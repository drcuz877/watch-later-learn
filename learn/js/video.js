(function () {
  const D = window.Digest;
  const app = document.getElementById("app");

  function backLink() {
    return D.el("a", { class: "back", href: "index.html" }, ["← All digests"]);
  }

  function showMessage(title, body) {
    document.title = "Learn · Video digests";
    app.replaceChildren(
      backLink(),
      D.el("h1", { text: title }),
      D.el("p", { class: "sub", text: body })
    );
  }

  function fitFlipCards() {
    const cards = app.querySelectorAll(".fc");
    const floor = window.matchMedia("(max-width: 640px)").matches ? 150 : 210;
    cards.forEach((card) => {
      const width = card.getBoundingClientRect().width;
      if (!width) return;
      let height = floor;
      card.querySelectorAll(".face").forEach((face) => {
        const clone = face.cloneNode(true);
        clone.style.position = "absolute";
        clone.style.visibility = "hidden";
        clone.style.pointerEvents = "none";
        clone.style.left = "0";
        clone.style.top = "0";
        clone.style.width = width + "px";
        clone.style.height = "auto";
        clone.style.minHeight = "0";
        clone.style.maxHeight = "none";
        clone.style.transform = "none";
        clone.style.gridArea = "auto";
        document.body.appendChild(clone);
        height = Math.max(height, clone.offsetHeight);
        clone.remove();
      });
      const next = Math.ceil(height) + "px";
      card.querySelectorAll(".face").forEach((face) => {
        if (face.style.minHeight !== next) face.style.minHeight = next;
      });
    });
  }

  function render(video) {
    document.title = video.title;
    const length = D.shortLength(video.length);
    const bullets = D.summaryBullets(video.summary);
    const points = D.keyPoints(video.key_points_json);
    const quiz = D.quizItems(video.quiz_json);
    const watch = D.watchUrl(video);

    const summaryList = D.el("ul", { class: "sum" });
    bullets.forEach((bullet, index) => {
      summaryList.append(
        D.el("li", {}, [D.el("i", { text: String(index + 1) }), D.el("span", { text: bullet })])
      );
    });

    const moments = D.el("div", { class: "kps" });
    points.forEach((point) => {
      const seconds = D.momentSeconds(point);
      moments.append(
        D.el(
          "a",
          {
            class: "kp",
            href: D.timestampUrl(video.video_id, seconds),
            target: "_blank",
            rel: "noopener noreferrer",
          },
          [
            D.el("span", { class: "chip", text: "▶ " + D.momentLabel(point) }),
            D.el("span", { text: point.text || "" }),
            D.el("span", { class: "ext", text: "↗", "aria-hidden": "true" }),
          ]
        )
      );
    });

    const quizTag = D.el("span", { class: "tag" });
    const quizGrid = D.el("div", { class: "quiz" });

    function flippedCount() {
      return quizGrid.querySelectorAll(".fc.flip").length;
    }

    function updateQuizTag() {
      const total = quiz.length;
      const noun = total === 1 ? "question" : "questions";
      quizTag.textContent = total + " " + noun + " · " + flippedCount() + " of " + total + " flipped";
    }

    function toggleCard(card) {
      const on = card.classList.toggle("flip");
      card.setAttribute("aria-pressed", on ? "true" : "false");
      const question = card.getAttribute("data-q") || "";
      const answer = card.getAttribute("data-a") || "";
      card.setAttribute(
        "aria-label",
        on ? "Answer. " + answer + ". Activate to flip back." : "Question. " + question + ". Activate to flip."
      );
      const front = card.querySelector(".front");
      const back = card.querySelector(".backf");
      if (front) front.setAttribute("aria-hidden", on ? "true" : "false");
      if (back) back.setAttribute("aria-hidden", on ? "false" : "true");
      updateQuizTag();
    }

    quiz.forEach((item, index) => {
      const question = item.q || "";
      const answer = item.a || "";
      const n = index + 1;
      const card = D.el("div", {
        class: "fc",
        tabindex: "0",
        role: "button",
        "aria-pressed": "false",
        "data-q": question,
        "data-a": answer,
        "aria-label": "Question. " + question + ". Activate to flip.",
      });
      const front = D.el("div", { class: "face front" }, [
        D.el("div", { class: "lab", text: "Question " + n + " of " + quiz.length }),
        D.el("div", { class: "q", text: question }),
        D.el("div", { class: "hint", text: "👆 Tap to flip" }),
      ]);
      const back = D.el("div", { class: "face backf", "aria-hidden": "true" }, [
        D.el("div", { class: "lab", text: "✓ Answer " + n }),
        D.el("div", { class: "qs", text: question }),
        D.el("div", { class: "a", text: answer }),
        D.el("div", { class: "hint" }, [D.el("span", { text: "↺ Tap to flip back" })]),
      ]);
      card.append(D.el("div", { class: "in" }, [front, back]));
      card.addEventListener("click", () => toggleCard(card));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleCard(card);
        }
      });
      quizGrid.append(card);
    });
    updateQuizTag();

    const thumb = D.el(
      "a",
      { class: "thumb", href: watch, target: "_blank", rel: "noopener noreferrer" },
      [
        D.el("img", { src: video.thumbnail_url, alt: "" }),
        D.el("div", { class: "play" }, [D.el("span", {}, [D.icon(D.ICONS.play)])]),
      ]
    );
    thumb.querySelector("img").addEventListener("error", function () {
      this.remove();
    });

    const hero = D.el("div", { class: "hero" }, [
      thumb,
      D.el("div", {}, [
        D.el("div", { class: "eyebrow", text: "✦ Learn · Digest" }),
        D.el("h1", { text: video.title }),
        D.el("div", { class: "metaRow" }, [
          D.el("span", { class: "ch", text: video.channel }),
          D.el("span", { text: "·" }),
          D.el("span", { text: length }),
          D.el("span", { text: "·" }),
          D.el("span", { text: "Added " + (video.date_added || "") }),
          D.pill(video.verdict),
        ]),
        D.el(
          "a",
          { class: "btn", href: watch, target: "_blank", rel: "noopener noreferrer" },
          ["▶ Watch on YouTube"]
        ),
      ]),
    ]);

    const summaryPanel = D.el("div", { class: "panel" }, [
      D.el("div", { class: "eyebrow", text: "📝 Summary" }),
      D.el("h2", { text: "The five-bullet version" }),
      summaryList,
    ]);

    const actionPanel = D.el("div", { class: "panel action" }, [
      D.el("div", { class: "eyebrow", text: "🎯 Do this one thing" }),
      D.el("h2", { text: "Your action item" }),
      D.el("p", { text: video.action_item || "" }),
    ]);

    const verdictPanel = D.el("div", { class: "panel verdict" }, [
      D.el("div", { class: "eyebrow", text: "⭐ Verdict" }),
      D.el("h2", { text: "Worth watching in full?" }),
      D.pill(video.verdict),
      D.el("p", { text: video.verdict_reason || "" }),
    ]);

    const momentNoun = points.length === 1 ? "moment" : "moments";
    const parts = [
      backLink(),
      hero,
      D.el("div", { class: "two" }, [summaryPanel, D.el("div", { class: "stack" }, [actionPanel, verdictPanel])]),
    ];

    if (points.length) {
      parts.push(
        D.el("section", { class: "sec" }, [
          D.el("div", { class: "eyebrow", text: "⏱️ Key moments" }),
          D.el("h2", {}, [
            "Jump straight to the moment ",
            D.el("span", { class: "tag", text: points.length + " " + momentNoun + " · tap to play" }),
          ]),
          moments,
        ])
      );
    }

    if (quiz.length) {
      parts.push(
        D.el("section", { class: "sec", id: "quiz" }, [
          D.el("div", { class: "eyebrow", text: "🧠 Quiz" }),
          D.el("h2", {}, ["Test yourself ", quizTag]),
          quizGrid,
        ])
      );
    }

    parts.push(D.el("footer", { text: "Digest generated from the video transcript" }));
    app.replaceChildren(...parts);

    fitFlipCards();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitFlipCards);
    window.addEventListener("resize", fitFlipCards);
    const quizEl = document.getElementById("quiz");
    if (quizEl && "ResizeObserver" in window) {
      let fitting = false;
      const observer = new ResizeObserver(() => {
        if (fitting) return;
        fitting = true;
        fitFlipCards();
        fitting = false;
      });
      observer.observe(quizEl);
    }
  }

  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    showMessage("Pick a digest from the list.", "Each video opens from its card on the home page.");
    return;
  }

  D.loadDigests()
    .then((rows) => {
      const video = rows.find((row) => row.video_id === id);
      if (!video) {
        showMessage("No digest matches that link.", "Head back to the list and open a video from there.");
        return;
      }
      render(video);
    })
    .catch((err) => {
      const file = err && err.message === "file";
      showMessage(
        file ? "Open this page from a web server." : "The digest could not be loaded.",
        file
          ? "The page reads learn/data/digest.csv with fetch, which needs a local server."
          : "Refresh the page once the file is available."
      );
    });
})();
