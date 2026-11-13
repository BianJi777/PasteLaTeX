
const FUNCS = new Set("sin cos tan cot sec csc sinh cosh tanh log ln lg exp lim max min det gcd arg deg dim ker Pr sup inf sum prod int iint iiint oint".split(" "));
const BIG = new Set(["\\sum", "\\prod", "\\int", "\\iint", "\\iiint", "\\lim", "\\max", "\\min"]);
const OP = {
  "−": "-", "–": "-", "—": "-", "×": "\\times", "·": "\\cdot", "⋅": "\\cdot", "÷": "\\div",
  "≤": "\\le", "≥": "\\ge", "≠": "\\ne", "≈": "\\approx", "≡": "\\equiv", "∼": "\\sim",
  "±": "\\pm", "∓": "\\mp", "∞": "\\infty", "→": "\\to", "←": "\\leftarrow", "↔": "\\leftrightarrow",
  "⇒": "\\Rightarrow", "⇐": "\\Leftarrow", "∈": "\\in", "∉": "\\notin", "⊂": "\\subset", "⊆": "\\subseteq",
  "∪": "\\cup", "∩": "\\cap", "∑": "\\sum", "∏": "\\prod", "∫": "\\int", "∬": "\\iint", "∭": "\\iiint",
  "∂": "\\partial", "∇": "\\nabla", "∀": "\\forall", "∃": "\\exists", "…": "\\dots", "⋯": "\\cdots",
  "∣": "|", "∥": "\\|", "⟨": "\\langle", "⟩": "\\rangle", "⌈": "\\lceil", "⌉": "\\rceil",
  "⌊": "\\lfloor", "⌋": "\\rfloor", "∗": "*", "∘": "\\circ", "⊕": "\\oplus", "⊗": "\\otimes", "∝": "\\propto",
};
const ESC = { "{": "\\{", "}": "\\}", "%": "\\%", "#": "\\#", "_": "\\_", "&": "\\&", "$": "\\$" };
const ACCENT = { "^": "hat", "ˆ": "hat", "~": "tilde", "˜": "tilde", "¯": "bar", "‾": "bar", "→": "vec", "⃗": "vec", "ˉ": "bar", "˘": "breve", "ˇ": "check", "˙": "dot", "¨": "ddot" };
const INVISIBLE = /[\u2061-\u2064\u200b\ufeff]/g;
const ENTITIES = {
  nbsp: " ", thinsp: " ", ensp: " ", emsp: " ", mdash: "—", ndash: "–", hellip: "…",
  middot: "·", times: "×", divide: "÷", plusmn: "±", le: "≤", ge: "≥", ne: "≠", infin: "∞",
  isin: "∈", rarr: "→", larr: "←", harr: "↔", minus: "−", deg: "°", ang: "∠", there4: "∴",
  asymp: "≈", equiv: "≡", prop: "∝", cap: "∩", cup: "∪", sub: "⊂", sube: "⊆", empty: "∅", radic: "√",
};

function decode(s) {
  let out = s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
  out = out.replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, name) => (ENTITIES[name] !== undefined ? ENTITIES[name] : m));
  return out.replace(/&amp;/g, "&");
}

function parse(xml) {
  const root = { tag: "#root", attrs: "", children: [] };
  const stack = [root];
  const re = /<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^"'>])*?)(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(xml))) {
    if (m[5] !== undefined) { stack[stack.length - 1].children.push({ tag: "#text", attrs: "", children: [], text: m[5] }); continue; }
    if (m[1] === "/") { if (stack.length > 1) stack.pop(); continue; }
    const node = { tag: m[2], attrs: m[3] || "", children: [] };
    stack[stack.length - 1].children.push(node);
    if (m[4] !== "/") stack.push(node);
  }
  return root;
}

const attr = (n, name) => { const m = new RegExp(name + '="([^"]*)"').exec(n.attrs || ""); return m ? m[1] : ""; };
const clean = (s) => s.replace(/\s+/g, "").trim();
const textOf = (n) => n.children.map(c => (c.tag === "#text" ? c.text : textOf(c))).join("");
const wrap = (s) => (s.length > 1 && !/^\\[A-Za-z]+$/.test(s) ? "{" + s + "}" : s);

function joinParts(parts) {
  let out = "";
  for (const part of parts) {
    if (!part) continue;
    if (/\\[A-Za-z]+$/.test(out) && /^[A-Za-z]/.test(part)) out += " ";
    out += part;
  }
  return out;
}

function renderTable(n, env) {
  let e = env;
  if (env === "matrix") {
    const ca = attr(n, "columnalign") || "";
    if (/right/.test(ca) && /left/.test(ca)) e = "aligned";
  }
  const rows = n.children.filter(c => c.tag === "mtr" || c.tag === "mlabeledtr").map(r =>
    r.children.filter(c => c.tag === "mtd").map(c => render(c)).join(" & ")
  );
  return "\\begin{" + e + "}" + rows.join(" \\\\ ") + "\\end{" + e + "}";
}

function kidsOf(node) {
  const ch = node.children;
  const parts = [];
  for (let i = 0; i < ch.length; i++) {
    const c = ch[i];
    if (c.tag === "mo" && clean(textOf(c)) === "{" && ch[i + 1] && ch[i + 1].tag === "mtable") {
      parts.push(renderTable(ch[i + 1], "cases"));
      i++;
      continue;
    }
    parts.push(render(c));
  }
  return joinParts(parts);
}

function render(n) {
  if (n.tag === "#text") return decode(n.text).replace(INVISIBLE, "");
  if (n.tag === "#root" || n.tag === "math" || n.tag === "mrow" || n.tag === "mstyle" || n.tag === "mpadded" || n.tag === "merror" || n.tag === "mphantom" || n.tag === "menclose")
    return kidsOf(n);
  if (n.tag === "semantics" || n.tag === "annotation-xml") return n.children.length ? render(n.children[0]) : "";
  if (n.tag === "annotation") return "";
  if (n.tag === "mi") {
    const t = clean(kidsOf(n));
    if (!t) return "";
    const v = attr(n, "mathvariant");
    if (v === "double-struck") return "\\mathbb{" + t + "}";
    if (v === "script" || v === "calligraphic") return "\\mathcal{" + t + "}";
    if (v === "fraktur") return "\\mathfrak{" + t + "}";
    if (v === "bold") return "\\mathbf{" + t + "}";
    if (t.length === 1) {
      if (OP[t] !== undefined) return OP[t];
      return ESC[t] !== undefined ? ESC[t] : t;
    }
    const lower = t.toLowerCase();
    return FUNCS.has(lower) ? "\\" + lower : "\\mathrm{" + t + "}";
  }
  if (n.tag === "mn") return clean(kidsOf(n));
  if (n.tag === "mo") {
    const t = clean(kidsOf(n));
    if (!t) return "";
    if (OP[t] !== undefined) return OP[t];
    if (ESC[t] !== undefined) return ESC[t];
    return t;
  }
  if (n.tag === "mtext") { const raw = kidsOf(n); if (/^\\/.test(raw.trim())) return ""; const t = raw; return t.trim() ? "\\text{" + t + "}" : ""; }
  if (n.tag === "mspace") return "\\,";
  if (n.tag === "msubsup") return wrap(render(n.children[0])) + "_{" + render(n.children[1]) + "}^{" + render(n.children[2]) + "}";
  if (n.tag === "msub") return wrap(render(n.children[0])) + "_{" + render(n.children[1]) + "}";
  if (n.tag === "msup") return wrap(render(n.children[0])) + "^{" + render(n.children[1]) + "}";
  if (n.tag === "mfrac") return "\\frac{" + render(n.children[0]) + "}{" + render(n.children[1]) + "}";
  if (n.tag === "msqrt") return "\\sqrt{" + kidsOf(n) + "}";
  if (n.tag === "mroot") return "\\sqrt[" + render(n.children[1]) + "]{" + render(n.children[0]) + "}";
  if (n.tag === "mover") {
    const acc = clean(render(n.children[1]));
    if (clean(textOf(n.children[0])) === "⏞") return "\\overbrace{" + render(n.children[1]) + "}";
    if (/^\\overbrace\{/.test(render(n.children[0]))) return render(n.children[0]) + "^{" + render(n.children[1]) + "}";
    if (ACCENT[acc]) return "\\" + ACCENT[acc] + "{" + render(n.children[0]) + "}";
    return "\\overset{" + render(n.children[1]) + "}{" + render(n.children[0]) + "}";
  }
  if (n.tag === "munder") {
    const base = render(n.children[0]);
    const under = render(n.children[1]);
    if (clean(textOf(n.children[0])) === "⏟") return "\\underbrace{" + under + "}";
    if (/^\\underbrace\{/.test(base)) return base + "_{" + under + "}";
    if (BIG.has(base)) return base + "_{" + under + "}";
    return "\\underset{" + under + "}{" + base + "}";
  }
  if (n.tag === "munderover") {
    const base = render(n.children[0]);
    const under = render(n.children[1]);
    const over = render(n.children[2]);
    if (BIG.has(base)) return base + "_{" + under + "}^{" + over + "}";
    return "\\underset{" + under + "}{\\overset{" + over + "}{" + base + "}}";
  }
  if (n.tag === "mtable") return renderTable(n, "matrix");
  if (n.tag === "mfenced") {
    const open = attr(n, "open") || "(";
    const close = attr(n, "close") || ")";
    return "\\left" + (ESC[open] || OP[open] || open) + kidsOf(n) + "\\right" + (ESC[close] || OP[close] || close);
  }
  return kidsOf(n);
}

export function mathmlToTex(mathml) {
  return render(parse(mathml)).replace(/\s+/g, " ").trim();
}


// Convert \(...\) and \[...\] delimiters (common in AI chat output) into
// Typora-friendly $...$ and $$...$$ blocks. Code fences are left untouched.
export function normalizeDelimiters(md) {
  const parts = md.split(/(```[\s\S]*?```)/g);
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) continue;
    parts[i] = parts[i]
      .replace(/\\\[([\s\S]*?)\\\]/g, (_, body) => "\n\n$$\n" + body.trim() + "\n$$\n\n")
      .replace(/\\\(([\s\S]*?)\\\)/g, (_, body) => "$" + body.trim() + "$");
  }
  return parts.join("");
}


// Conservative bare-TeX recovery: only commands that REQUIRE braced arguments
// (\frac{}{}, \sqrt{}, \binom{}{}) are wrapped, and only when their groups
// parse. Symbol-only commands like \alpha or \sum are left alone to avoid
// false positives in prose.
const ARG_COMMANDS = { frac: 2, dfrac: 2, tfrac: 2, binom: 2, sqrt: 1 };

function matchBrace(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "\\") { i++; continue; }
    if (s[i] === "{") depth++;
    else if (s[i] === "}") { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function wrapSegment(seg) {
  let out = "", last = 0;
  const re = /\\([A-Za-z]+)/g;
  let m;
  while ((m = re.exec(seg))) {
    const start = m.index;
    const need = ARG_COMMANDS[m[1]];
    if (!need) continue;
    let pos = start + m[0].length;
    let ok = true;
    for (let k = 0; k < need; k++) {
      if (m[1] === "sqrt" && k === 0) {
        const opt = /^[ \t]*\[/.exec(seg.slice(pos));
        if (opt) {
          const close = seg.indexOf("]", pos);
          if (close < 0) { ok = false; break; }
          pos = close + 1;
        }
      }
      const ws = /^[ \t]*/.exec(seg.slice(pos))[0].length;
      if (seg[pos + ws] !== "{") { ok = false; break; }
      const close = matchBrace(seg, pos + ws);
      if (close < 0) { ok = false; break; }
      pos = close + 1;
    }
    if (!ok) continue;
    out += seg.slice(last, start) + "$" + seg.slice(start, pos) + "$";
    last = pos;
    re.lastIndex = pos;
  }
  return out + seg.slice(last);
}

export function wrapBareCommands(md) {
  const parts = md.split(/(```[\s\S]*?```|`[^`\n]*`|\$\$[\s\S]*?\$\$|\$[^\$\n]+\$)/g);
  for (let i = 0; i < parts.length; i += 2) parts[i] = wrapSegment(parts[i]);
  return parts.join("");
}
