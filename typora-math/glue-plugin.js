__MATHML2TEX__

var DEBUG = false;
var LOG = 'C:/Users/34132/.typora/paste-math.log';

function fsx() { try { return window.reqnode ? window.reqnode('fs') : null; } catch (e) { return null; } }
function log(s) {
  if (!DEBUG) return;
  try { var f = fsx(); if (f) f.appendFileSync(LOG, s + '\n'); } catch (e) {}
}

function convertHtml(html) {
  var doc = new DOMParser().parseFromString(html, 'text/html');
  var els = Array.prototype.slice.call(doc.querySelectorAll('.katex-display, .katex'));
  var n = 0;
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
    var text = display ? ('$$' + tex + '$$') : ('$' + tex + '$');
    el.replaceWith(doc.createTextNode(text));
    n++;
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
    if (!html || (html.indexOf('katex') < 0 && html.indexOf('<math') < 0)) { log('skip no-math'); return; }
    var out = convertHtml(html);
    log('convert count=' + out.count + ' len=' + html.length + '->' + out.html.length);
    if (!out.count) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    var md = null;
    try { md = ed.UserOp.getMarkdownSourceFrom(out.html); } catch (e0) { log('md ERR ' + e0.message); }
    if (md) {
      log('md head: ' + JSON.stringify(md.slice(0, 300)));
      md = md.replace(/\$\$([\s\S]*?)\$\$/g, function (_, body) {
        return '\n\n$$\n' + body.trim() + '\n$$\n\n';
      });
      try {
        ed.UserOp.pasteHandler(ed, md, true);
        log('inserted markdown len=' + md.length);
      } catch (e1) {
        log('md insert ERR ' + e1.message);
        try { ed.UserOp.pasteHandler(ed, out.html, false); log('html fallback ok'); }
        catch (e2) { log('html fallback ERR ' + e2.message); }
      }
    } else {
      try { ed.UserOp.pasteHandler(ed, out.html, false); log('pasteHandler html ok'); }
      catch (e1) { log('pasteHandler ERR ' + e1.message); }
    }
  } catch (e) { log('ERR ' + e.message); }
}

export default class TyporaMathPlugin {
  constructor(app, manifest) {
    this.app = app;
    this.manifest = manifest;
    this._handler = null;
  }
  load() { this.onload(); }
  unload() { this.onunload(); }
  onload() {
    var self = this;
    this._handler = function (ev) { handlePaste(ev); };
    document.addEventListener('paste', this._handler, true);
    log('=== plugin loaded ' + new Date().toISOString());
  }
  onunload() {
    if (this._handler) { document.removeEventListener('paste', this._handler, true); this._handler = null; }
    log('=== plugin unloaded ' + new Date().toISOString());
  }
}
