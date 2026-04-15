# words

A tiny static blog that reads entries from Markdown files and shows the newest
entry first.

## Run it locally

This site loads Markdown with `fetch`, so it should be served from a local web
server instead of opened directly as a `file://` URL.

```powershell
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Add an entry

1. Create a new `.md` file in `entries/`.
2. Add it to `entries/index.json`.
3. Give it a `date` in `YYYY-MM-DD` format.

The page sorts entries by date, newest first, every time it loads.

Markdown images work with local paths or remote URLs:

```md
![Alt text](images/example.jpg)
![Alt text](https://example.com/photo.jpg)
```

## Publish on GitHub Pages

This project can be hosted from GitHub Pages with no build step.

1. Push the repo to GitHub.
2. Open the repo on GitHub.
3. Go to **Settings** -> **Pages**.
4. Set **Source** to **Deploy from a branch**.
5. Choose the `main` branch and the repo root folder.
6. Save.

The `.nojekyll` file keeps GitHub Pages from processing the Markdown entries,
so the browser can load the raw `.md` files.
