__MDTABLE__

__PIPES__

__MATHML2TEX__

var DEFAULTS = { convertKatex: true, convertDelims: true, wrapBare: true, escapePipes: true, preferMarkdownTable: true, debug: false };
var SETTINGS = DEFAULTS;
var LOG = 'C:/Users/34132/.typora/paste-math.log';

function fsx() { try { return window.reqnode ? window.reqnode('fs') : null; } catch (e) { return null; } }
function log(s) {
  if (!SETTINGS.debug) return;
  try { var f = fsx(); if (f) f.appendFileSync(LOG, s + '\n'); } catch (e) {}
}
function notify(msg) {
  try {
    var ed = window.editor;
    if (ed && ed.EditHelper && ed.EditHelper.showNotification) {
      ed.EditHelper.showNotification('PasteLaTeX: ' + msg);
    }
  } catch (e) {}
}
function caretInTable() {
  try {
    var sel = document.getSelection();
    if (!sel || !sel.anchorNode) return false;
    var node = sel.anchorNode;
    var el = node.nodeType === 1 ? node : node.parentElement;
    if (!el || !el.closest) return false;
    return !!el.closest('td, th');
  } catch (e) { return false; }
}

function loadSettings(dir) {
  try {
    var fs = fsx();
    var pathMod = window.reqnode('path');
    var p = pathMod.join(dir, 'settings.json');
    if (fs.existsSync(p)) {
      var j = JSON.parse(fs.readFileSync(p, 'utf8'));
      var merged = {};
      for (var k in DEFAULTS) merged[k] = (typeof j[k] === 'boolean') ? j[k] : DEFAULTS[k];
      return merged;
    }
    fs.writeFileSync(p, JSON.stringify(DEFAULTS, null, 2));
  } catch (e) {}
  return DEFAULTS;
}
function fixText(v) {
  var nv = v;
  if (SETTINGS.convertDelims) nv = normalizeDelimiters(nv);
  if (SETTINGS.wrapBare) nv = wrapBareCommands(nv);
  return nv;
}

function convertHtml(html) {
  var doc = new DOMParser().parseFromString(html, 'text/html');
  var n = 0;
  var sources = Array.prototype.slice.call(doc.querySelectorAll('[data-math-source]'));
  for (var s = 0; s < sources.length; s++) {
    var el0 = sources[s];
    var tex0 = (el0.getAttribute('data-math-source') || '').trim();
    if (!tex0) continue;
    var disp0 = el0.getAttribute('data-math-display') === 'true';
    el0.replaceWith(doc.createTextNode(disp0 ? ('$$' + tex0 + '$$') : ('$' + tex0 + '$')));
    n++;
  }
  var els = Array.prototype.slice.call(doc.querySelectorAll('.katex-display, .katex'));
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    if (!el.parentNode) continue;
    var ann = el.querySelector('annotation[encoding="application/x-tex"]');
    var tex = ann ? ann.textContent.trim() : '';
    if (!tex) {
      var m = el.querySelector('math');
      if (m) tex = mathmlToTex(m.outerHTML || m.toString());
    }
    if (!tex) continue;
    var display = el.classList.contains('katex-display') || !!el.closest('.katex-display');
    el.replaceWith(doc.createTextNode(display ? ('$$' + tex + '$$') : ('$' + tex + '$')));
    n++;
  }
  return { html: doc.body.innerHTML, count: n };
}

function fixHtmlText(html) {
  var doc = new DOMParser().parseFromString(html, 'text/html');
  var n = 0;
  var walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
  var nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    var parent = node.parentElement;
    if (parent && parent.closest('pre, code')) continue;
    var v = node.nodeValue;
    if (!v) continue;
    if (v.indexOf('\\(') < 0 && v.indexOf('\\[') < 0 && !/\\(frac|dfrac|tfrac|binom|sqrt)/.test(v)) continue;
    var nv = fixText(v);
    if (nv !== v) { node.nodeValue = nv; n++; }
  }
  return { html: doc.body.innerHTML, count: n };
}

function handlePaste(ev) {
  try {
    var ed = window.editor;
    if (!ed || !ed.UserOp || !ed.UserOp.pasteHandler) return;
    var cd = ev.clipboardData;
    if (!cd) return;
    var types = Array.prototype.slice.call(cd.types || []);

    var html = '', plain = '';
    try { html = cd.getData('text/html') || ''; } catch (e) {}
    try { plain = cd.getData('text/plain') || ''; } catch (e) {}

    if (types.indexOf('text/markhtml') >= 0) {
      // Typora internal copy: its plain-text flavor is already correct Markdown.
      // Prefer it when pasting into a table cell, where the native path truncates at "|".
      if (SETTINGS.preferMarkdownTable && caretInTable() && plain && plain.indexOf('|') >= 0) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        try { ed.UserOp.pasteHandler(ed, plain.replace(/^\uFEFF/, ''), true); log('markhtml->plain len=' + plain.length); }
        catch (e0) { log('markhtml ERR ' + e0.message); }
        return;
      }
      log('skip markhtml');
      return;
    }

    var hasNodes = SETTINGS.convertKatex && !!html && (html.indexOf('katex') >= 0 || html.indexOf('<math') >= 0);
    var hasSources = SETTINGS.convertKatex && !!html && html.indexOf('data-math-source') >= 0;
    var hasTable = !!html && html.indexOf('<table') >= 0;
    var hasList = !!html && (html.indexOf('<ul') >= 0 || html.indexOf('<ol') >= 0);
    var hasDelims = SETTINGS.convertDelims && (/\\[([\[]/.test(html) || /\\[([\[]/.test(plain));
    var hasBare = SETTINGS.wrapBare && (/\\(frac|dfrac|tfrac|binom|sqrt)\s*[[{]/.test(html) || /\\(frac|dfrac|tfrac|binom|sqrt)\s*[[{]/.test(plain));

    if (SETTINGS.preferMarkdownTable && plain && looksLikeMarkdownTable(plain)) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      try { ed.UserOp.pasteHandler(ed, plain.replace(/^\uFEFF/, ''), true); log('md-table paste len=' + plain.length); }
      catch (e7) { log('md-table ERR ' + e7.message); }
      return;
    }
    var noMath = !hasNodes && !hasSources && !hasDelims && !hasBare;
    if (SETTINGS.escapePipes && noMath && !hasTable && plain && plain.indexOf('|') >= 0 && caretInTable()) {
      var esc = escapePipes(plain);
      if (esc !== plain && sameSpans(plain, esc)) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        try { ed.UserOp.pasteHandler(ed, esc, true); log('pipe esc len=' + esc.length); }
        catch (e6) { log('pipe esc ERR ' + e6.message); }
        return;
      }
    }
    if (noMath) { log('skip no-math'); return; }

    if (html && (hasTable || hasList || hasSources || (!hasNodes && (hasDelims || hasBare)))) {
      var fixed = (hasNodes || hasSources) ? convertHtml(html) : fixHtmlText(html);
      log('html path count=' + fixed.count + ' len=' + html.length);
      if (!fixed.count) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      try { ed.UserOp.pasteHandler(ed, fixed.html, false); }
      catch (e1) { log('html insert ERR ' + e1.message); notify('表格公式转换失败，已保留原文'); }
      return;
    }

    if (hasNodes) {
      var out = convertHtml(html);
      log('nodes count=' + out.count);
      if (!out.count) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      var md = null;
      try { md = ed.UserOp.getMarkdownSourceFrom(out.html); } catch (e2) { log('md ERR ' + e2.message); }
      if (!md) return;
      md = fixText(md);
      md = md.replace(/\$\$([\s\S]*?)\$\$/g, function (_, body) {
        return '\n\n$$\n' + body.trim() + '\n$$\n\n';
      });
      try { ed.UserOp.pasteHandler(ed, md, true); }
      catch (e3) {
        log('md insert ERR ' + e3.message);
        try { ed.UserOp.pasteHandler(ed, out.html, false); }
        catch (e4) { log('md ERR2 ' + e4.message); notify('公式插入失败，已保留原文'); }
      }
      return;
    }

    if (!plain) return;
    var pmd = fixText(plain);
    if (pmd === plain) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    try { ed.UserOp.pasteHandler(ed, pmd, true); }
    catch (e5) { log('plain ERR ' + e5.message); notify('公式插入失败，已保留原文'); }
  } catch (e) { log('ERR ' + e.message); }
}

export default class PasteLaTeXPlugin {
  constructor(app, manifest) {
    this.app = app;
    this.manifest = manifest;
    this._handler = null;
  }
  load() { this.onload(); }
  unload() { this.onunload(); }
  onload() {
    SETTINGS = loadSettings(this.manifest.dir);
    this._handler = function (ev) { handlePaste(ev); };
    document.addEventListener('paste', this._handler, true);
  }
  onunload() {
    if (this._handler) { document.removeEventListener('paste', this._handler, true); this._handler = null; }
  }
}
