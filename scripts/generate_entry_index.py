from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ENTRY_DIR = ROOT / "entries"
INDEX_FILE = ENTRY_DIR / "index.json"
DATED_ENTRY = re.compile(r"^(?P<date>\d{4}-\d{2}-\d{2})(?:[-_ ](?P<title>.+))?\.md$", re.IGNORECASE)


def main() -> int:
    entries = []

    for path in sorted(ENTRY_DIR.glob("*.md")):
        match = DATED_ENTRY.match(path.name)

        if not match:
            print(f"Skipping {path.name}: filename must start with YYYY-MM-DD", file=sys.stderr)
            continue

        markdown = read_markdown(path)
        date = match.group("date")
        title = find_title(markdown) or title_from_filename(match.group("title")) or date
        summary = find_summary(markdown)

        entry = {
            "title": title,
            "date": date,
            "summary": summary,
            "file": path.relative_to(ROOT).as_posix(),
            "tags": [],
        }

        entries.append(entry)

    entries.sort(key=lambda entry: (entry["date"], entry["file"]), reverse=True)
    INDEX_FILE.write_text(json.dumps(entries, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {INDEX_FILE.relative_to(ROOT)} with {len(entries)} entries")

    return 0


def read_markdown(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        return path.read_text(encoding="cp1252")


def find_title(markdown: str) -> str:
    for line in markdown.splitlines():
        stripped = line.strip()

        if stripped.startswith("# "):
            return stripped[2:].strip()

    return ""


def title_from_filename(value: str | None) -> str:
    if not value:
        return ""

    title = re.sub(r"[-_]+", " ", value)
    title = re.sub(r"\s+", " ", title).strip()
    return title[:1].upper() + title[1:]


def find_summary(markdown: str) -> str:
    for line in markdown.splitlines():
        stripped = line.strip()

        if not stripped:
            continue

        if stripped.startswith(("#", "!", "-", "*", ">", "`")):
            continue

        summary = re.sub(r"\s+", " ", stripped)
        return truncate(summary, 150)

    return ""


def truncate(value: str, limit: int) -> str:
    if len(value) <= limit:
        return value

    return value[: limit - 1].rstrip() + "..."


if __name__ == "__main__":
    raise SystemExit(main())
