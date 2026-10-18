# Video digests

A static site for personal viewing. It turns YouTube study notes into a phone-friendly set of digests: a five-bullet summary, timestamped moments, one action, a verdict, and a flip-card quiz. Plain HTML, CSS, and JavaScript. No build step and no backend.

Open `learn/`. The repository root redirects there.

GitHub Pages: deploy from the `main` branch, folder `/` (root).

## Nightly data

`learn/data/digest.csv` is the only file the nightly update changes. The pages read that CSV in the browser and render every row, so new videos show up with no code change.

Preview locally with `python3 -m http.server` from the repository root, then open `http://localhost:8000/learn/`.
