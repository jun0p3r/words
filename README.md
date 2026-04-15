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

Create a new `.md` file in `entries/` with the date at the start of the
filename:

```text
entries/YYYY-MM-DD-title.md
```

Examples:

```text
entries/2026-03-02-America.md
entries/2026-02-26-Hope.md
```

The title comes from the first `# Heading` in the file. If there is no heading,
the title comes from the filename.

The page sorts entries by date, newest first, every time it loads. Locally,
regenerate the entry list after adding or renaming Markdown files:

```powershell
python scripts/generate_entry_index.py
```

On GitHub Pages, the deploy workflow runs that command automatically on every
push to `main`.

Markdown images work with local paths or remote URLs:

```md
![Alt text](images/example.jpg)
![Alt text](https://example.com/photo.jpg)
```

## Publish on GitHub Pages

This project can be hosted from GitHub Pages with the included deploy workflow.

1. Push the repo to GitHub.
2. Open the repo on GitHub.
3. Go to **Settings** -> **Pages**.
4. Set **Source** to **GitHub Actions**.
5. Save.

The `.nojekyll` file keeps GitHub Pages from processing the Markdown entries,
so the browser can load the raw `.md` files.
