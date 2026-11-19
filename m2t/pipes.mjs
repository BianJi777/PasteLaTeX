function isEscaped(s, i) {
  var n = 0, j = i - 1;
  while (j >= 0 && s[j] === '\\') { n++; j--; }
  return n % 2 === 1;
}

function findInlineMathEnd(s, i) {
  if (s[i] !== '$') return -1;
  if (i + 1 >= s.length) return -1;
  if (/\s/.test(s[i + 1])) return -1;
  var j = i + 1;
  while (j < s.length) {
    if (s[j] === '\n') return -1;
    if (s[j] === '$' && !isEscaped(s, j)) {
      if (j === i + 1) return -1;
      if (/\s/.test(s[j - 1])) return -1;
      return j;
    }
    j++;
  }
  return -1;
}

export function protectedSpans(src) {
  var spans = [], i = 0;
  while (i < src.length) {
    if (src.startsWith('```', i)) {
      var j = src.indexOf('```', i + 3);
      if (j < 0) break;
      spans.push(src.slice(i, j + 3)); i = j + 3; continue;
    }
    if (src[i] === '`') {
      var run = /^`+/.exec(src.slice(i))[0];
      var k = src.indexOf(run, i + run.length);
      if (k < 0) { i += run.length; continue; }
      spans.push(src.slice(i, k + run.length)); i = k + run.length; continue;
    }
    if (src.startsWith('$$', i)) {
      var m = src.indexOf('$$', i + 2);
      if (m < 0) { i += 2; continue; }
      spans.push(src.slice(i, m + 2)); i = m + 2; continue;
    }
    if (src.startsWith('\\(', i) || src.startsWith('\\[', i)) {
      var close = src[i + 1] === '(' ? '\\)' : '\\]';
      var p = src.indexOf(close, i + 2);
      if (p < 0) { i += 2; continue; }
      spans.push(src.slice(i, p + 2)); i = p + 2; continue;
    }
    if (src[i] === '$') {
      var q = findInlineMathEnd(src, i);
      if (q > 0) { spans.push(src.slice(i, q + 1)); i = q + 1; continue; }
    }
    i++;
  }
  return spans;
}

export function escapePipes(src) {
  var out = '', i = 0;
  while (i < src.length) {
    if (src.startsWith('```', i)) {
      var j = src.indexOf('```', i + 3);
      if (j < 0) { out += src.slice(i); break; }
      out += src.slice(i, j + 3); i = j + 3; continue;
    }
    if (src[i] === '`') {
      var run = /^`+/.exec(src.slice(i))[0];
      var k = src.indexOf(run, i + run.length);
      if (k < 0) { out += run; i += run.length; continue; }
      out += src.slice(i, k + run.length); i = k + run.length; continue;
    }
    if (src.startsWith('$$', i)) {
      var m = src.indexOf('$$', i + 2);
      if (m < 0) { out += '$$'; i += 2; continue; }
      out += src.slice(i, m + 2); i = m + 2; continue;
    }
    if (src.startsWith('\\(', i) || src.startsWith('\\[', i)) {
      var close = src[i + 1] === '(' ? '\\)' : '\\]';
      var p = src.indexOf(close, i + 2);
      if (p < 0) { out += src[i]; i++; continue; }
      out += src.slice(i, p + 2); i = p + 2; continue;
    }
    if (src[i] === '$') {
      var q = findInlineMathEnd(src, i);
      if (q > 0) { out += src.slice(i, q + 1); i = q + 1; continue; }
    }
    if (src[i] === '|' && !isEscaped(src, i)) { out += '\\|'; i++; continue; }
    out += src[i]; i++;
  }
  return out;
}

export function sameSpans(a, b) {
  var sa = protectedSpans(a), sb = protectedSpans(b);
  if (sa.length !== sb.length) return false;
  for (var i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return false;
  return true;
}
