/* Mini-Laufzeit für die Vorschau: rendert die Vorlagen der Canvas-Seiten (Schleifen, Bedingungen, Klicks). */
(function () {
  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (patch) {
    var p = typeof patch === 'function' ? patch(this.state) : patch;
    for (var k in p) this.state[k] = p[k];
    if (this.__render) this.__render();
  };
  window.DCLogic = DCLogic;

  function lookup(expr, scope) {
    expr = expr.trim();
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);
    var parts = expr.split('.'), v = scope;
    for (var i = 0; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  var RE = /\{\{([^}]*)\}\}/g;
  function interp(str, scope) {
    return str.replace(RE, function (_, e) { var v = lookup(e, scope); return v == null ? '' : String(v); });
  }
  function single(str) { var m = /^\s*\{\{([^}]*)\}\}\s*$/.exec(str); return m ? m[1] : null; }

  function render(node, scope, out) {
    if (node.nodeType === 3) { out.appendChild(document.createTextNode(interp(node.nodeValue, scope))); return; }
    if (node.nodeType !== 1) return;
    if (node.tagName === 'TEMPLATE' && node.hasAttribute('data-for')) {
      var list = lookup(single(node.getAttribute('data-for')) || '', scope) || [];
      var as = node.getAttribute('data-as');
      for (var i = 0; i < list.length; i++) {
        var s = Object.create(scope); s[as] = list[i];
        node.content.childNodes.forEach(function (c) { render(c, s, out); });
      }
      return;
    }
    if (node.tagName === 'TEMPLATE' && node.hasAttribute('data-if')) {
      if (lookup(single(node.getAttribute('data-if')) || '', scope)) node.content.childNodes.forEach(function (c) { render(c, scope, out); });
      return;
    }
    var el = node.cloneNode(false);
    for (var a = 0; a < node.attributes.length; a++) {
      var at = node.attributes[a];
      if (at.value.indexOf('{{') < 0) continue;
      var ex = single(at.value);
      if (/^on/.test(at.name) && ex) {
        el.removeAttribute(at.name);
        var fn = lookup(ex, scope);
        if (typeof fn === 'function') el.addEventListener(at.name.slice(2), (function (f) { return function (ev) { f(ev); }; })(fn));
      } else el.setAttribute(at.name, interp(at.value, scope));
    }
    var src = node.tagName === 'TEMPLATE' ? node.content : node;
    src.childNodes.forEach(function (c) { render(c, scope, el); });
    out.appendChild(el);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('dc-root'), tpl = document.getElementById('dc-tpl'), code = document.getElementById('dc-code');
    if (!root || !tpl || !code) return;
    var Component = new Function('DCLogic', code.textContent + '\nreturn Component;')(DCLogic);
    var comp = new Component({});
    comp.__render = function () {
      var y = window.scrollY, frag = document.createDocumentFragment();
      var vals = comp.renderVals ? comp.renderVals() : {};
      tpl.content.childNodes.forEach(function (c) { render(c, vals, frag); });
      root.innerHTML = ''; root.appendChild(frag); window.scrollTo(0, y);
    };
    comp.__render();
    root.removeAttribute('hidden');
  });
})();
