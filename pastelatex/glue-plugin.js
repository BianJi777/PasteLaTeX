__MATHML2TEX__

var DEBUG = false;
var LOG = 'C:/Users/34132/.typora/paste-math.log';

function fsx() { try { return window.reqnode ? window.reqnode('fs') : null; } catch (e) { return null; } }
function log(s) {
  if (!DEBUG) return;
  try { var f = fsx(); if (f) f.appendFileSync(LOG, s + '\n'); } catch (e) {}
}

function sourceText(el) {
  var tex = (el.getAttribute('data-math-source') || '').trim();
  return tex || null;
}

function convertHtml(html) {
  var doc = new DOMParser().parseFromString(html, 'text/html');
  var n = 0;

  var sources = Array.prototype.slice.call(doc.querySelectorAll('[data-math-source]'));
  for (var s = 0; s < sources.length; s++) {
    var el0 = sources[s];
    var tex0 = sourceText(el0);
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
    var nv = wrapBareCommands(normalizeDelimiters(v));
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
    if (types.indexOf('text/markhtml') >= 0) { log('skip markhtml'); return; }

    var html = '', plain = '';
    try { html = cd.getData('text/html') || ''; } catch (e) {}
    try { plain = cd.getData('text/plain') || ''; } catch (e) {}

    var hasNodes = !!html && (html.indexOf('katex') >= 0 || html.indexOf('<math') >= 0);
    var hasSources = !!html && html.indexOf('data-math-source') >= 0;
    var hasTable = !!html && html.indexOf('<table') >= 0;
    var hasDelims = /\\[([\[]/.test(html) || /\\[([\[]/.test(plain);
    var hasBare = /\\(frac|dfrac|tfrac|binom|sqrt)\s*[[{]/.test(html) || /\\(frac|dfrac|tfrac|binom|sqrt)\s*[[{]/.test(plain);

    if (!hasNodes && !hasSources && !hasDelims && !hasBare) { log('skip no-math'); return; }

    // Tables and other rich structures: keep the HTML, only swap math in place.
    if (html && (hasTable || hasSources || (!hasNodes && (hasDelims || hasBare)))) {
      var fixed = (hasNodes || hasSources) ? convertHtml(html) : fixHtmlText(html);
      log('html path count=' + fixed.count + ' len=' + html.length);
      if (!fixed.count) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      try { ed.UserOp.pasteHandler(ed, fixed.html, false); }
      catch (e1) { log('html insert ERR ' + e1.message); }
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
      md = wrapBareCommands(normalizeDelimiters(md));
      md = md.replace(/\$\$([\s\S]*?)\$\$/g, function (_, body) {
        return '\n\n$$\n' + body.trim() + '\n$$\n\n';
      });
      try { ed.UserOp.pasteHandler(ed, md, true); }
      catch (e3) { try { ed.UserOp.pasteHandler(ed, out.html, false); } catch (e4) { log('md ERR2 ' + e4.message); } }
      return;
    }

    if (!plain) return;
    var pmd = wrapBareCommands(normalizeDelimiters(plain));
    if (pmd === plain) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    try { ed.UserOp.pasteHandler(ed, pmd, true); } catch (e5) { log('plain ERR ' + e5.message); }
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
    this._handler = function (ev) { handlePaste(ev); };
    document.addEventListener('paste', this._handler, true);
  }
  onunload() {
    if (this._handler) { document.removeEventListener('paste', this._handler, true); this._handler = null; }
  }
}
