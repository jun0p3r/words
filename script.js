const entryList = document.querySelector("#latest");
const menuList = document.querySelector("#entry-menu-list");
const contentPane = document.querySelector(".content-pane");

loadEntries();

async function loadEntries() {
  try {
    const indexResponse = await fetch("entries/index.json", { cache: "no-store" });

    if (!indexResponse.ok) {
      throw new Error(`Could not load entries/index.json (${indexResponse.status})`);
    }

    const entries = await indexResponse.json();
    const sortedEntries = entries
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    renderMenu(sortedEntries);

    const renderedEntries = await Promise.all(sortedEntries.map(renderEntry));
    entryList.innerHTML = renderedEntries.join("");
    setupActiveTimeline();
  } catch (error) {
    const message = `
      <div class="error">
        <strong>Entries could not load.</strong>
        <p>${escapeHtml(error.message)}</p>
        <p>Serve the folder with <code>python -m http.server 8000</code>, then open <code>http://localhost:8000</code>.</p>
      </div>
    `;

    entryList.innerHTML = message;
    menuList.innerHTML = `<p class="muted">No entries yet.</p>`;
  }
}

function renderMenu(entries) {
  if (!entries.length) {
    menuList.innerHTML = `<p class="muted">No entries yet.</p>`;
    return;
  }

  menuList.innerHTML = entries
    .map((entry, index) => {
      const id = entryId(entry);
      return `
        <a class="${index === 0 ? "is-active" : ""}" href="#${id}" data-entry-link="${id}">
          <span>${escapeHtml(entry.title)}</span>
          <time datetime="${escapeAttribute(entry.date)}">${formatDate(entry.date)}</time>
        </a>
      `;
    })
    .join("");
}

function setupActiveTimeline() {
  const entries = Array.from(document.querySelectorAll(".entry"));
  const links = Array.from(menuList.querySelectorAll("[data-entry-link]"));

  if (!entries.length || !links.length || !contentPane) {
    return;
  }

  const linkById = new Map(links.map((link) => [link.dataset.entryLink, link]));
  let activeId = "";
  let ticking = false;

  const setActive = (id, keepVisible = true) => {
    if (!id || id === activeId) {
      return;
    }

    activeId = id;

    links.forEach((link) => {
      link.classList.toggle("is-active", link.dataset.entryLink === id);
    });

    if (keepVisible) {
      linkById.get(id)?.scrollIntoView({ block: "nearest" });
    }
  };

  const updateActiveFromScroll = () => {
    const paneRect = contentPane.getBoundingClientRect();
    const targetY = paneRect.top + paneRect.height * 0.34;
    let closestEntry = entries[0];
    let closestDistance = Number.POSITIVE_INFINITY;

    entries.forEach((entry) => {
      const rect = entry.getBoundingClientRect();
      const distance = Math.abs(rect.top - targetY);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestEntry = entry;
      }
    });

    setActive(closestEntry.id);
  };

  const requestUpdate = () => {
    if (ticking) {
      return;
    }

    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      updateActiveFromScroll();
    });
  };

  links.forEach((link) => {
    link.addEventListener("click", () => {
      setActive(link.dataset.entryLink, false);
    });
  });

  contentPane.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  updateActiveFromScroll();
}

async function renderEntry(entry) {
  const response = await fetch(entry.file, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Could not load ${entry.file} (${response.status})`);
  }

  const markdown = await response.text();
  const tags = Array.isArray(entry.tags) ? entry.tags : [];

  return `
    <article id="${entryId(entry)}" class="entry">
      <header class="entry-header">
        <h2 class="entry-title">${escapeHtml(entry.title)}</h2>
        <div class="entry-meta">
          <time datetime="${escapeAttribute(entry.date)}">${formatDate(entry.date)}</time>
          ${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
        ${entry.summary ? `<p class="entry-summary">${escapeHtml(entry.summary)}</p>` : ""}
      </header>
      <div class="entry-body">
        ${markdownToHtml(markdown, entry.file)}
      </div>
    </article>
  `;
}

function markdownToHtml(markdown, filePath) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  let inList = false;
  let inCode = false;
  let codeLines = [];

  const closeParagraph = () => {
    if (!paragraph.length) {
      return;
    }

    html.push(`<p>${inlineMarkdown(paragraph.join(" "), filePath)}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (!inList) {
      return;
    }

    html.push("</ul>");
    inList = false;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      closeParagraph();
      closeList();

      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        inCode = true;
      }

      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!trimmed) {
      closeParagraph();
      closeList();
      continue;
    }

    const imageMatch = trimmed.match(/^!\[([^\]]*)]\(([^)]+)\)$/);
    if (imageMatch) {
      closeParagraph();
      closeList();
      html.push(renderImage(imageMatch[1], imageMatch[2], filePath));
      continue;
    }

    const headingMatch = trimmed.match(/^(#{2,3})\s+(.+)$/);
    if (headingMatch) {
      closeParagraph();
      closeList();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${inlineMarkdown(headingMatch[2], filePath)}</h${level}>`);
      continue;
    }

    const listMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      closeParagraph();

      if (!inList) {
        html.push("<ul>");
        inList = true;
      }

      html.push(`<li>${inlineMarkdown(listMatch[1], filePath)}</li>`);
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s?(.+)$/);
    if (quoteMatch) {
      closeParagraph();
      closeList();
      html.push(`<blockquote>${inlineMarkdown(quoteMatch[1], filePath)}</blockquote>`);
      continue;
    }

    paragraph.push(trimmed);
  }

  closeParagraph();
  closeList();

  if (inCode) {
    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  }

  return html.join("");
}

function inlineMarkdown(text, filePath) {
  const pattern = /(!?)\[([^\]]*)]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let rendered = "";
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    rendered += escapeHtml(text.slice(lastIndex, match.index));

    if (match[4] !== undefined) {
      rendered += `<code>${escapeHtml(match[4])}</code>`;
    } else if (match[5] !== undefined) {
      rendered += `<strong>${escapeHtml(match[5])}</strong>`;
    } else if (match[6] !== undefined) {
      rendered += `<em>${escapeHtml(match[6])}</em>`;
    } else if (match[1] === "!") {
      rendered += renderInlineImage(match[2], match[3], filePath);
    } else {
      const href = resolveUrl(match[3], filePath);
      const external = /^https?:\/\//i.test(href);
      const target = external ? ` target="_blank" rel="noreferrer"` : "";
      rendered += `<a href="${escapeAttribute(href)}"${target}>${escapeHtml(match[2])}</a>`;
    }

    lastIndex = pattern.lastIndex;
  }

  rendered += escapeHtml(text.slice(lastIndex));

  return rendered;
}

function renderImage(alt, rawUrl, filePath) {
  const src = resolveUrl(rawUrl, filePath);
  const caption = alt ? `<figcaption>${escapeHtml(alt)}</figcaption>` : "";

  return `
    <figure>
      <img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" loading="lazy">
      ${caption}
    </figure>
  `;
}

function renderInlineImage(alt, rawUrl, filePath) {
  const src = resolveUrl(rawUrl, filePath);
  return `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" loading="lazy">`;
}

function resolveUrl(rawUrl, filePath) {
  const url = rawUrl.trim();

  if (/^(https?:|mailto:|#|\/|data:image\/)/i.test(url)) {
    return url;
  }

  const base = filePath.split("/").slice(0, -1).join("/");
  return base ? `${base}/${url}` : url;
}

function entryId(entry) {
  return `entry-${slugify(`${entry.date}-${entry.title}`)}`;
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
