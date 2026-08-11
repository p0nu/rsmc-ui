// ---------------------------------------------------------------------------
// A small, safe, dependency-free Markdown renderer that produces React elements
// (never dangerouslySetInnerHTML). Supports a pragmatic chat-oriented subset:
//   - **bold**, *italic* / _italic_, ~~strike~~, `inline code`
//   - ``` fenced code blocks ```
//   - > blockquotes
//   - - / * bullet lists and 1. numbered lists
//   - auto-linked http(s) URLs
//   - @mention highlighting
// Anything it doesn't recognize is rendered as plain text, so untrusted input
// can only ever become text or one of these known elements.
// ---------------------------------------------------------------------------

import { Fragment } from "react";

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,:;!?)\]}"'])/g;
const MENTION_RE = /(^|\s)(@[a-zA-Z0-9_.-]{2,})/g;

// ---- inline parsing --------------------------------------------------------

// Split a string on a delimiter pair (e.g. ** ) and wrap the inside with `wrap`.
// Falls back to plain text if the delimiters aren't balanced.
function splitDelim(text, delim, wrap, keyPrefix) {
  const parts = [];
  let rest = text;
  let i = 0;
  const dl = delim.length;
  while (true) {
    const start = rest.indexOf(delim);
    if (start === -1) {
      if (rest) parts.push(rest);
      break;
    }
    const end = rest.indexOf(delim, start + dl);
    if (end === -1) {
      // Unbalanced - emit the remainder verbatim.
      parts.push(rest);
      break;
    }
    if (start > 0) parts.push(rest.slice(0, start));
    const inner = rest.slice(start + dl, end);
    parts.push(wrap(inner, `${keyPrefix}-${i++}`));
    rest = rest.slice(end + dl);
  }
  return parts;
}

// Apply inline transforms in priority order. Each transform runs over string
// pieces only, leaving already-produced elements untouched.
function inline(text, keyBase = "i") {
  // 1. inline code first (its contents are literal - no further formatting).
  let nodes = splitDelim(
    text,
    "`",
    (inner, k) => (
      <code key={k} className="md-code-inline">
        {inner}
      </code>
    ),
    `${keyBase}-code`
  );

  // Helper to run a transform over the current string pieces.
  const mapStrings = (fn) => {
    const out = [];
    nodes.forEach((n, idx) => {
      if (typeof n !== "string") {
        out.push(n);
        return;
      }
      const produced = fn(n, `${keyBase}-${idx}`);
      if (Array.isArray(produced)) out.push(...produced);
      else out.push(produced);
    });
    nodes = out;
  };

  // 2. bold, 3. strike, 4. italic (two markers).
  mapStrings((s, k) =>
    splitDelim(s, "**", (inner, kk) => <strong key={kk}>{inlineLeaf(inner, kk)}</strong>, `${k}-b`)
  );
  mapStrings((s, k) =>
    splitDelim(s, "~~", (inner, kk) => <del key={kk}>{inlineLeaf(inner, kk)}</del>, `${k}-s`)
  );
  mapStrings((s, k) =>
    splitDelim(s, "*", (inner, kk) => <em key={kk}>{inlineLeaf(inner, kk)}</em>, `${k}-i`)
  );
  mapStrings((s, k) =>
    splitDelim(s, "_", (inner, kk) => <em key={kk}>{inlineLeaf(inner, kk)}</em>, `${k}-u`)
  );

  // 5. links + mentions over remaining strings.
  mapStrings((s, k) => linkifyAndMention(s, k));

  return nodes;
}

// Leaf inline: everything except the delimiter that produced it. Used inside
// bold/italic so we still linkify and highlight mentions there.
function inlineLeaf(text, k) {
  return linkifyAndMention(text, `${k}-leaf`);
}

function linkifyAndMention(text, keyBase) {
  // First split out URLs, then handle mentions within the non-URL pieces.
  const out = [];
  let last = 0;
  let m;
  URL_RE.lastIndex = 0;
  let idx = 0;
  while ((m = URL_RE.exec(text)) !== null) {
    if (m.index > last) {
      out.push(...mentionize(text.slice(last, m.index), `${keyBase}-t${idx}`));
    }
    const href = m[0];
    out.push(
      <a key={`${keyBase}-a${idx}`} href={href} target="_blank" rel="noopener noreferrer" className="md-link">
        {href}
      </a>
    );
    last = m.index + m[0].length;
    idx++;
  }
  if (last < text.length) {
    out.push(...mentionize(text.slice(last), `${keyBase}-t${idx}`));
  }
  return out;
}

function mentionize(text, keyBase) {
  const out = [];
  let last = 0;
  let m;
  MENTION_RE.lastIndex = 0;
  let idx = 0;
  while ((m = MENTION_RE.exec(text)) !== null) {
    const lead = m[1]; // preserved leading whitespace/boundary
    const handle = m[2];
    const start = m.index + lead.length;
    if (start > last) out.push(text.slice(last, start));
    out.push(
      <span key={`${keyBase}-m${idx}`} className="mention md-mention">
        {handle}
      </span>
    );
    last = start + handle.length;
    idx++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length ? out : [text];
}

// ---- block parsing ---------------------------------------------------------

export default function Markdown({ content }) {
  if (!content) return null;
  const blocks = parseBlocks(String(content));
  return (
    <div className="md">
      {blocks.map((b, i) => (
        <Fragment key={i}>{renderBlock(b, i)}</Fragment>
      ))}
    </div>
  );
}

function parseBlocks(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block.
    if (line.trimStart().startsWith("```")) {
      const fenceIndent = line.length - line.trimStart().length;
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i].slice(fenceIndent));
        i++;
      }
      i++; // consume closing fence (if present)
      blocks.push({ type: "code", text: codeLines.join("\n") });
      continue;
    }

    // Blockquote (consecutive > lines).
    if (/^\s*>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", text: quote.join("\n") });
      continue;
    }

    // Lists (bullet or ordered).
    if (/^\s*([-*])\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items = [];
      const itemRe = ordered ? /^\s*\d+\.\s+/ : /^\s*([-*])\s+/;
      while (
        i < lines.length &&
        (ordered ? /^\s*\d+\.\s+/.test(lines[i]) : /^\s*([-*])\s+/.test(lines[i]))
      ) {
        items.push(lines[i].replace(itemRe, ""));
        i++;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    // Blank line → separator.
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Otherwise: a paragraph (consecutive non-blank, non-special lines).
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trimStart().startsWith("```") &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^\s*([-*])\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ type: "para", text: para.join("\n") });
  }

  return blocks;
}

function renderBlock(b, key) {
  switch (b.type) {
    case "code":
      return (
        <pre className="md-code-block">
          <code>{b.text}</code>
        </pre>
      );
    case "quote":
      return <blockquote className="md-quote">{inline(b.text, `q${key}`)}</blockquote>;
    case "list":
      return b.ordered ? (
        <ol className="md-list md-list-ol">
          {b.items.map((it, j) => (
            <li key={j}>{inline(it, `li${key}-${j}`)}</li>
          ))}
        </ol>
      ) : (
        <ul className="md-list md-list-ul">
          {b.items.map((it, j) => (
            <li key={j}>{inline(it, `li${key}-${j}`)}</li>
          ))}
        </ul>
      );
    case "para":
    default: {
      // Preserve single newlines within a paragraph as <br/>.
      const parts = b.text.split("\n");
      return (
        <p className="md-p">
          {parts.map((line, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              {inline(line, `p${key}-${j}`)}
            </Fragment>
          ))}
        </p>
      );
    }
  }
}
