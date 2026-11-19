export function looksLikeMarkdownTable(text) {
  if (!text) return false;
  var t = String(text).replace(/^\uFEFF/, '');
  var lines = t.split(/\r?\n/);
  for (var i = 0; i < Math.min(lines.length, 4); i++) {
    var l = lines[i].trim();
    if (!l) continue;
    if (l.charAt(0) !== '|') return false;
    if (i + 1 < lines.length && /\|\s*:?-{3,}/.test(lines[i + 1])) return true;
  }
  return false;
}
