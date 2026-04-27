"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const node_module = require("node:module");
const node_url = require("node:url");
const path = require("node:path");
const require$$0$1 = require("tty");
const require$$1 = require("util");
const fs = require("node:fs");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
function getAugmentedNamespace(n) {
  if (Object.prototype.hasOwnProperty.call(n, "__esModule")) return n;
  var f = n.default;
  if (typeof f == "function") {
    var a = function a2() {
      if (this instanceof a2) {
        return Reflect.construct(f, arguments, this.constructor);
      }
      return f.apply(this, arguments);
    };
    a.prototype = f.prototype;
  } else a = {};
  Object.defineProperty(a, "__esModule", { value: true });
  Object.keys(n).forEach(function(k) {
    var d = Object.getOwnPropertyDescriptor(n, k);
    Object.defineProperty(a, k, d.get ? d : {
      enumerable: true,
      get: function() {
        return n[k];
      }
    });
  });
  return a;
}
var src = { exports: {} };
var browser = { exports: {} };
var ms;
var hasRequiredMs;
function requireMs() {
  if (hasRequiredMs) return ms;
  hasRequiredMs = 1;
  var s = 1e3;
  var m = s * 60;
  var h = m * 60;
  var d = h * 24;
  var w = d * 7;
  var y = d * 365.25;
  ms = function(val, options) {
    options = options || {};
    var type = typeof val;
    if (type === "string" && val.length > 0) {
      return parse(val);
    } else if (type === "number" && isFinite(val)) {
      return options.long ? fmtLong(val) : fmtShort(val);
    }
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
    );
  };
  function parse(str) {
    str = String(str);
    if (str.length > 100) {
      return;
    }
    var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
      str
    );
    if (!match) {
      return;
    }
    var n = parseFloat(match[1]);
    var type = (match[2] || "ms").toLowerCase();
    switch (type) {
      case "years":
      case "year":
      case "yrs":
      case "yr":
      case "y":
        return n * y;
      case "weeks":
      case "week":
      case "w":
        return n * w;
      case "days":
      case "day":
      case "d":
        return n * d;
      case "hours":
      case "hour":
      case "hrs":
      case "hr":
      case "h":
        return n * h;
      case "minutes":
      case "minute":
      case "mins":
      case "min":
      case "m":
        return n * m;
      case "seconds":
      case "second":
      case "secs":
      case "sec":
      case "s":
        return n * s;
      case "milliseconds":
      case "millisecond":
      case "msecs":
      case "msec":
      case "ms":
        return n;
      default:
        return void 0;
    }
  }
  function fmtShort(ms2) {
    var msAbs = Math.abs(ms2);
    if (msAbs >= d) {
      return Math.round(ms2 / d) + "d";
    }
    if (msAbs >= h) {
      return Math.round(ms2 / h) + "h";
    }
    if (msAbs >= m) {
      return Math.round(ms2 / m) + "m";
    }
    if (msAbs >= s) {
      return Math.round(ms2 / s) + "s";
    }
    return ms2 + "ms";
  }
  function fmtLong(ms2) {
    var msAbs = Math.abs(ms2);
    if (msAbs >= d) {
      return plural(ms2, msAbs, d, "day");
    }
    if (msAbs >= h) {
      return plural(ms2, msAbs, h, "hour");
    }
    if (msAbs >= m) {
      return plural(ms2, msAbs, m, "minute");
    }
    if (msAbs >= s) {
      return plural(ms2, msAbs, s, "second");
    }
    return ms2 + " ms";
  }
  function plural(ms2, msAbs, n, name) {
    var isPlural = msAbs >= n * 1.5;
    return Math.round(ms2 / n) + " " + name + (isPlural ? "s" : "");
  }
  return ms;
}
var common;
var hasRequiredCommon;
function requireCommon() {
  if (hasRequiredCommon) return common;
  hasRequiredCommon = 1;
  function setup(env) {
    createDebug.debug = createDebug;
    createDebug.default = createDebug;
    createDebug.coerce = coerce;
    createDebug.disable = disable;
    createDebug.enable = enable;
    createDebug.enabled = enabled;
    createDebug.humanize = requireMs();
    createDebug.destroy = destroy;
    Object.keys(env).forEach((key) => {
      createDebug[key] = env[key];
    });
    createDebug.names = [];
    createDebug.skips = [];
    createDebug.formatters = {};
    function selectColor(namespace) {
      let hash = 0;
      for (let i = 0; i < namespace.length; i++) {
        hash = (hash << 5) - hash + namespace.charCodeAt(i);
        hash |= 0;
      }
      return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
    }
    createDebug.selectColor = selectColor;
    function createDebug(namespace) {
      let prevTime;
      let enableOverride = null;
      let namespacesCache;
      let enabledCache;
      function debug2(...args) {
        if (!debug2.enabled) {
          return;
        }
        const self = debug2;
        const curr = Number(/* @__PURE__ */ new Date());
        const ms2 = curr - (prevTime || curr);
        self.diff = ms2;
        self.prev = prevTime;
        self.curr = curr;
        prevTime = curr;
        args[0] = createDebug.coerce(args[0]);
        if (typeof args[0] !== "string") {
          args.unshift("%O");
        }
        let index = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
          if (match === "%%") {
            return "%";
          }
          index++;
          const formatter = createDebug.formatters[format];
          if (typeof formatter === "function") {
            const val = args[index];
            match = formatter.call(self, val);
            args.splice(index, 1);
            index--;
          }
          return match;
        });
        createDebug.formatArgs.call(self, args);
        const logFn = self.log || createDebug.log;
        logFn.apply(self, args);
      }
      debug2.namespace = namespace;
      debug2.useColors = createDebug.useColors();
      debug2.color = createDebug.selectColor(namespace);
      debug2.extend = extend;
      debug2.destroy = createDebug.destroy;
      Object.defineProperty(debug2, "enabled", {
        enumerable: true,
        configurable: false,
        get: () => {
          if (enableOverride !== null) {
            return enableOverride;
          }
          if (namespacesCache !== createDebug.namespaces) {
            namespacesCache = createDebug.namespaces;
            enabledCache = createDebug.enabled(namespace);
          }
          return enabledCache;
        },
        set: (v) => {
          enableOverride = v;
        }
      });
      if (typeof createDebug.init === "function") {
        createDebug.init(debug2);
      }
      return debug2;
    }
    function extend(namespace, delimiter) {
      const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
      newDebug.log = this.log;
      return newDebug;
    }
    function enable(namespaces) {
      createDebug.save(namespaces);
      createDebug.namespaces = namespaces;
      createDebug.names = [];
      createDebug.skips = [];
      const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const ns of split) {
        if (ns[0] === "-") {
          createDebug.skips.push(ns.slice(1));
        } else {
          createDebug.names.push(ns);
        }
      }
    }
    function matchesTemplate(search, template) {
      let searchIndex = 0;
      let templateIndex = 0;
      let starIndex = -1;
      let matchIndex = 0;
      while (searchIndex < search.length) {
        if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
          if (template[templateIndex] === "*") {
            starIndex = templateIndex;
            matchIndex = searchIndex;
            templateIndex++;
          } else {
            searchIndex++;
            templateIndex++;
          }
        } else if (starIndex !== -1) {
          templateIndex = starIndex + 1;
          matchIndex++;
          searchIndex = matchIndex;
        } else {
          return false;
        }
      }
      while (templateIndex < template.length && template[templateIndex] === "*") {
        templateIndex++;
      }
      return templateIndex === template.length;
    }
    function disable() {
      const namespaces = [
        ...createDebug.names,
        ...createDebug.skips.map((namespace) => "-" + namespace)
      ].join(",");
      createDebug.enable("");
      return namespaces;
    }
    function enabled(name) {
      for (const skip of createDebug.skips) {
        if (matchesTemplate(name, skip)) {
          return false;
        }
      }
      for (const ns of createDebug.names) {
        if (matchesTemplate(name, ns)) {
          return true;
        }
      }
      return false;
    }
    function coerce(val) {
      if (val instanceof Error) {
        return val.stack || val.message;
      }
      return val;
    }
    function destroy() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    createDebug.enable(createDebug.load());
    return createDebug;
  }
  common = setup;
  return common;
}
var hasRequiredBrowser;
function requireBrowser() {
  if (hasRequiredBrowser) return browser.exports;
  hasRequiredBrowser = 1;
  (function(module2, exports$1) {
    exports$1.formatArgs = formatArgs;
    exports$1.save = save;
    exports$1.load = load;
    exports$1.useColors = useColors;
    exports$1.storage = localstorage();
    exports$1.destroy = /* @__PURE__ */ (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports$1.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      let m;
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module2.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index++;
        if (match === "%c") {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports$1.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports$1.storage.setItem("debug", namespaces);
        } else {
          exports$1.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load() {
      let r;
      try {
        r = exports$1.storage.getItem("debug") || exports$1.storage.getItem("DEBUG");
      } catch (error) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module2.exports = requireCommon()(exports$1);
    const { formatters } = module2.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  })(browser, browser.exports);
  return browser.exports;
}
var node = { exports: {} };
var hasRequiredNode;
function requireNode() {
  if (hasRequiredNode) return node.exports;
  hasRequiredNode = 1;
  (function(module2, exports$1) {
    const tty = require$$0$1;
    const util = require$$1;
    exports$1.init = init;
    exports$1.log = log;
    exports$1.formatArgs = formatArgs;
    exports$1.save = save;
    exports$1.load = load;
    exports$1.useColors = useColors;
    exports$1.destroy = util.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports$1.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = require("supports-color");
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports$1.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports$1.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports$1.inspectOpts ? Boolean(exports$1.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module2.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports$1.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util.formatWithOptions(exports$1.inspectOpts, ...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init(debug2) {
      debug2.inspectOpts = {};
      const keys = Object.keys(exports$1.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug2.inspectOpts[keys[i]] = exports$1.inspectOpts[keys[i]];
      }
    }
    module2.exports = requireCommon()(exports$1);
    const { formatters } = module2.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts);
    };
  })(node, node.exports);
  return node.exports;
}
var hasRequiredSrc;
function requireSrc() {
  if (hasRequiredSrc) return src.exports;
  hasRequiredSrc = 1;
  if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
    src.exports = requireBrowser();
  } else {
    src.exports = requireNode();
  }
  return src.exports;
}
var srcExports = requireSrc();
const debug$3 = /* @__PURE__ */ getDefaultExportFromCjs(srcExports);
/*!
 * playwright-extra v4.3.5 by berstend
 * https://github.com/berstend/puppeteer-extra/tree/master/packages/playwright-extra#readme
 * @license MIT
 */
class Loader {
  constructor(moduleName, packageNames) {
    this.moduleName = moduleName;
    this.packageNames = packageNames;
  }
  /**
   * Lazy load a top level export from another module by wrapping it in a JS proxy.
   *
   * This allows us to re-export e.g. `devices` from `playwright` while redirecting direct calls
   * to it to the module version the user has installed, rather than shipping with a hardcoded version.
   *
   * If we don't do this and the user doesn't have the target module installed we'd throw immediately when our code is imported.
   *
   * We use a "super" Proxy defining all traps, so calls like `Object.keys(playwright.devices).length` will return the correct value.
   */
  lazyloadExportOrDie(exportName) {
    const that = this;
    const trapHandler = Object.fromEntries(Object.getOwnPropertyNames(Reflect).map((name) => [
      name,
      function(target, ...args) {
        const moduleExport = that.loadModuleOrDie()[exportName];
        const customTarget = moduleExport;
        const result = Reflect[name](customTarget || target, ...args);
        return result;
      }
    ]));
    return new Proxy({}, trapHandler);
  }
  /** Load the module if possible */
  loadModule() {
    return requirePackages(this.packageNames);
  }
  /** Load the module if possible or throw */
  loadModuleOrDie() {
    const module2 = requirePackages(this.packageNames);
    if (module2) {
      return module2;
    }
    throw this.requireError;
  }
  get requireError() {
    const moduleNamePretty = this.moduleName.charAt(0).toUpperCase() + this.moduleName.slice(1);
    return new Error(`
  ${moduleNamePretty} is missing. :-)

  I've tried loading ${this.packageNames.map((p) => `"${p}"`).join(", ")} - no luck.

  Make sure you install one of those packages or use the named 'addExtra' export,
  to patch a specific (and maybe non-standard) implementation of ${moduleNamePretty}.

  To get the latest stable version of ${moduleNamePretty} run:
  'yarn add ${this.moduleName}' or 'npm i ${this.moduleName}'
  `);
  }
}
function requirePackages(packageNames) {
  for (const name of packageNames) {
    try {
      return require(name);
    } catch (_) {
      continue;
    }
  }
  return;
}
const playwrightLoader = new Loader("playwright", [
  "playwright-core",
  "playwright"
]);
const debug = debug$3("playwright-extra:puppeteer-compat");
const isPlaywrightPage = (obj) => {
  return "unroute" in obj;
};
const isPlaywrightFrame = (obj) => {
  return ["parentFrame", "frameLocator"].every((x) => x in obj);
};
const isPlaywrightBrowser = (obj) => {
  return "newContext" in obj;
};
const isPuppeteerCompat = (obj) => {
  return !!obj && typeof obj === "object" && !!obj.isCompatShim;
};
const cache = {
  objectToShim: /* @__PURE__ */ new Map(),
  cdpSession: {
    page: /* @__PURE__ */ new Map(),
    browser: /* @__PURE__ */ new Map()
  }
};
function addPuppeteerCompat(object) {
  if (!object || typeof object !== "object") {
    return object;
  }
  if (cache.objectToShim.has(object)) {
    return cache.objectToShim.get(object);
  }
  if (isPuppeteerCompat(object)) {
    return object;
  }
  debug("addPuppeteerCompat", cache.objectToShim.size);
  if (isPlaywrightPage(object) || isPlaywrightFrame(object)) {
    const shim = createPageShim(object);
    cache.objectToShim.set(object, shim);
    return shim;
  }
  if (isPlaywrightBrowser(object)) {
    const shim = createBrowserShim(object);
    cache.objectToShim.set(object, shim);
    return shim;
  }
  debug("Received unknown object:", Reflect.ownKeys(object));
  return object;
}
const dummyCDPClient = {
  send: async (...args) => {
    debug("dummy CDP client called", "send", args);
  },
  on: (...args) => {
    debug("dummy CDP client called", "on", args);
  }
};
async function getPageCDPSession(page) {
  let session = cache.cdpSession.page.get(page);
  if (session) {
    debug("getPageCDPSession: use existing");
    return session;
  }
  debug("getPageCDPSession: use new");
  const context = isPlaywrightFrame(page) ? page.page().context() : page.context();
  try {
    session = await context.newCDPSession(page);
    cache.cdpSession.page.set(page, session);
    return session;
  } catch (err) {
    debug("getPageCDPSession: error while creating session:", err.message);
    debug("getPageCDPSession: Unable create CDP session (most likely a different browser than chromium) - returning a dummy");
  }
  return dummyCDPClient;
}
async function getBrowserCDPSession(browser2) {
  let session = cache.cdpSession.browser.get(browser2);
  if (session) {
    debug("getBrowserCDPSession: use existing");
    return session;
  }
  debug("getBrowserCDPSession: use new");
  try {
    session = await browser2.newBrowserCDPSession();
    cache.cdpSession.browser.set(browser2, session);
    return session;
  } catch (err) {
    debug("getBrowserCDPSession: error while creating session:", err.message);
    debug("getBrowserCDPSession: Unable create CDP session (most likely a different browser than chromium) - returning a dummy");
  }
  return dummyCDPClient;
}
function createPageShim(page) {
  const objId = Math.random().toString(36).substring(2, 7);
  const shim = new Proxy(page, {
    get(target, prop) {
      if (prop === "isCompatShim" || prop === "isPlaywright") {
        return true;
      }
      debug("page - get", objId, prop);
      if (prop === "_client") {
        return () => ({
          send: async (method, params) => {
            const session = await getPageCDPSession(page);
            return await session.send(method, params);
          },
          on: (event, listener) => {
            getPageCDPSession(page).then((session) => {
              session.on(event, listener);
            });
          }
        });
      }
      if (prop === "setBypassCSP") {
        return async (enabled) => {
          const session = await getPageCDPSession(page);
          return await session.send("Page.setBypassCSP", {
            enabled
          });
        };
      }
      if (prop === "setUserAgent") {
        return async (userAgent, userAgentMetadata) => {
          const session = await getPageCDPSession(page);
          return await session.send("Emulation.setUserAgentOverride", {
            userAgent,
            userAgentMetadata
          });
        };
      }
      if (prop === "browser") {
        if (isPlaywrightPage(page)) {
          return () => {
            let browser2 = page.context().browser();
            if (!browser2) {
              debug("page.browser() - not available, most likely due to launchPersistentContext");
              browser2 = page;
            }
            return addPuppeteerCompat(browser2);
          };
        }
      }
      if (prop === "evaluateOnNewDocument") {
        if (isPlaywrightPage(page)) {
          return async function(pageFunction, ...args) {
            return await page.addInitScript(pageFunction, args[0]);
          };
        }
      }
      if (prop === "userAgent") {
        return async (enabled) => {
          const session = await getPageCDPSession(page);
          const data = await session.send("Browser.getVersion");
          return data.userAgent;
        };
      }
      return Reflect.get(target, prop);
    }
  });
  return shim;
}
function createBrowserShim(browser2) {
  const objId = Math.random().toString(36).substring(2, 7);
  const shim = new Proxy(browser2, {
    get(target, prop) {
      if (prop === "isCompatShim" || prop === "isPlaywright") {
        return true;
      }
      debug("browser - get", objId, prop);
      if (prop === "pages") {
        return () => browser2.contexts().flatMap((c) => c.pages().map((page) => addPuppeteerCompat(page)));
      }
      if (prop === "userAgent") {
        return async () => {
          const session = await getBrowserCDPSession(browser2);
          const data = await session.send("Browser.getVersion");
          return data.userAgent;
        };
      }
      return Reflect.get(target, prop);
    }
  });
  return shim;
}
const debug$1 = debug$3("playwright-extra:plugins");
class PluginList {
  constructor() {
    this._plugins = [];
    this._dependencyDefaults = /* @__PURE__ */ new Map();
    this._dependencyResolution = /* @__PURE__ */ new Map();
  }
  /**
   * Get a list of all registered plugins.
   */
  get list() {
    return this._plugins;
  }
  /**
   * Get the names of all registered plugins.
   */
  get names() {
    return this._plugins.map((p) => p.name);
  }
  /**
   * Add a new plugin to the list (after checking if it's well-formed).
   *
   * @param plugin
   * @internal
   */
  add(plugin) {
    var _a;
    if (!this.isValidPluginInstance(plugin)) {
      return false;
    }
    if (!!plugin.onPluginRegistered) {
      plugin.onPluginRegistered({ framework: "playwright" });
    }
    if (!!plugin._registerChildClassMembers) {
      plugin._registerChildClassMembers(Object.getPrototypeOf(plugin));
    }
    if ((_a = plugin.requirements) === null || _a === void 0 ? void 0 : _a.has("dataFromPlugins")) {
      plugin.getDataFromPlugins = this.getData.bind(this);
    }
    this._plugins.push(plugin);
    return true;
  }
  /** Check if the shape of a plugin is correct or warn */
  isValidPluginInstance(plugin) {
    if (!plugin || typeof plugin !== "object" || !plugin._isPuppeteerExtraPlugin) {
      console.error(`Warning: Plugin is not derived from PuppeteerExtraPlugin, ignoring.`, plugin);
      return false;
    }
    if (!plugin.name) {
      console.error(`Warning: Plugin with no name registering, ignoring.`, plugin);
      return false;
    }
    return true;
  }
  /** Error callback in case calling a plugin method throws an error. Can be overwritten. */
  onPluginError(plugin, method, err) {
    console.warn(`An error occured while executing "${method}" in plugin "${plugin.name}":`, err);
  }
  /**
   * Define default values for plugins implicitly required through the `dependencies` plugin stanza.
   *
   * @param dependencyPath - The string by which the dependency is listed (not the plugin name)
   *
   * @example
   * chromium.use(stealth)
   * chromium.plugins.setDependencyDefaults('stealth/evasions/webgl.vendor', { vendor: 'Bob', renderer: 'Alice' })
   */
  setDependencyDefaults(dependencyPath, opts) {
    this._dependencyDefaults.set(dependencyPath, opts);
    return this;
  }
  /**
   * Define custom plugin modules for plugins implicitly required through the `dependencies` plugin stanza.
   *
   * Using this will prevent dynamic imports from being used, which JS bundlers often have issues with.
   *
   * @example
   * chromium.use(stealth)
   * chromium.plugins.setDependencyResolution('stealth/evasions/webgl.vendor', VendorPlugin)
   */
  setDependencyResolution(dependencyPath, pluginModule) {
    this._dependencyResolution.set(dependencyPath, pluginModule);
    return this;
  }
  /**
   * Prepare plugins to be used (resolve dependencies, ordering)
   * @internal
   */
  prepare() {
    this.resolveDependencies();
    this.order();
  }
  /** Return all plugins using the supplied method */
  filterByMethod(methodName) {
    return this._plugins.filter((plugin) => {
      if (!!plugin._childClassMembers && Array.isArray(plugin._childClassMembers)) {
        return plugin._childClassMembers.includes(methodName);
      }
      return methodName in plugin;
    });
  }
  /** Conditionally add puppeteer compatibility to values provided to the plugins */
  _addPuppeteerCompatIfNeeded(plugin, method, args) {
    const canUseShim = plugin._isPuppeteerExtraPlugin && !plugin.noPuppeteerShim;
    const methodWhitelist = [
      "onBrowser",
      "onPageCreated",
      "onPageClose",
      "afterConnect",
      "afterLaunch"
    ];
    const shouldUseShim = methodWhitelist.includes(method);
    if (!canUseShim || !shouldUseShim) {
      return args;
    }
    debug$1("add puppeteer compatibility", plugin.name, method);
    return [...args.map((arg) => addPuppeteerCompat(arg))];
  }
  /**
   * Dispatch plugin lifecycle events in a typesafe way.
   * Only Plugins that expose the supplied property will be called.
   *
   * Will not await results to dispatch events as fast as possible to all plugins.
   *
   * @param method - The lifecycle method name
   * @param args - Optional: Any arguments to be supplied to the plugin methods
   * @internal
   */
  dispatch(method, ...args) {
    var _a, _b;
    const plugins = this.filterByMethod(method);
    debug$1("dispatch", method, {
      all: this._plugins.length,
      filteredByMethod: plugins.length
    });
    for (const plugin of plugins) {
      try {
        args = this._addPuppeteerCompatIfNeeded.bind(this)(plugin, method, args);
        const fnType = (_b = (_a = plugin[method]) === null || _a === void 0 ? void 0 : _a.constructor) === null || _b === void 0 ? void 0 : _b.name;
        debug$1("dispatch to plugin", {
          plugin: plugin.name,
          method,
          fnType
        });
        if (fnType === "AsyncFunction") {
          ;
          plugin[method](...args).catch((err) => this.onPluginError(plugin, method, err));
        } else {
          ;
          plugin[method](...args);
        }
      } catch (err) {
        this.onPluginError(plugin, method, err);
      }
    }
  }
  /**
   * Dispatch plugin lifecycle events in a typesafe way.
   * Only Plugins that expose the supplied property will be called.
   *
   * Can also be used to get a definite return value after passing it to plugins:
   * Calls plugins sequentially and passes on a value (waterfall style).
   *
   * The plugins can either modify the value or return an updated one.
   * Will return the latest, updated value which ran through all plugins.
   *
   * By convention only the first argument will be used as the updated value.
   *
   * @param method - The lifecycle method name
   * @param args - Optional: Any arguments to be supplied to the plugin methods
   * @internal
   */
  async dispatchBlocking(method, ...args) {
    const plugins = this.filterByMethod(method);
    debug$1("dispatchBlocking", method, {
      all: this._plugins.length,
      filteredByMethod: plugins.length
    });
    let retValue = null;
    for (const plugin of plugins) {
      try {
        args = this._addPuppeteerCompatIfNeeded.bind(this)(plugin, method, args);
        retValue = await plugin[method](...args);
        if (retValue !== void 0) {
          args[0] = retValue;
        }
      } catch (err) {
        this.onPluginError(plugin, method, err);
        return retValue;
      }
    }
    return retValue;
  }
  /**
   * Order plugins that have expressed a special placement requirement.
   *
   * This is useful/necessary for e.g. plugins that depend on the data from other plugins.
   *
   * @private
   */
  order() {
    debug$1("order:before", this.names);
    const runLast = this._plugins.filter((p) => {
      var _a;
      return (_a = p.requirements) === null || _a === void 0 ? void 0 : _a.has("runLast");
    }).map((p) => p.name);
    for (const name of runLast) {
      const index = this._plugins.findIndex((p) => p.name === name);
      this._plugins.push(this._plugins.splice(index, 1)[0]);
    }
    debug$1("order:after", this.names);
  }
  /**
   * Collects the exposed `data` property of all registered plugins.
   * Will be reduced/flattened to a single array.
   *
   * Can be accessed by plugins that listed the `dataFromPlugins` requirement.
   *
   * Implemented mainly for plugins that need data from other plugins (e.g. `user-preferences`).
   *
   * @see [PuppeteerExtraPlugin]/data
   * @param name - Filter data by optional name
   *
   * @private
   */
  getData(name) {
    const data = this._plugins.filter((p) => !!p.data).map((p) => Array.isArray(p.data) ? p.data : [p.data]).reduce((acc, arr) => [...acc, ...arr], []);
    return name ? data.filter((d) => d.name === name) : data;
  }
  /**
   * Handle `plugins` stanza (already instantiated plugins that don't require dynamic imports)
   */
  resolvePluginsStanza() {
    debug$1("resolvePluginsStanza");
    const pluginNames = new Set(this.names);
    this._plugins.filter((p) => !!p.plugins && p.plugins.length).filter((p) => !pluginNames.has(p.name)).forEach((parent) => {
      (parent.plugins || []).forEach((p) => {
        debug$1(parent.name, "adding missing plugin", p.name);
        this.add(p);
      });
    });
  }
  /**
   * Handle `dependencies` stanza (which requires dynamic imports)
   *
   * Plugins can define `dependencies` as a Set or Array of dependency paths, or a Map with additional opts
   *
   * @note
   * - The default opts for implicit dependencies can be defined using `setDependencyDefaults()`
   * - Dynamic imports can be avoided by providing plugin modules with `setDependencyResolution()`
   */
  resolveDependenciesStanza() {
    debug$1("resolveDependenciesStanza");
    const requireDependencyOrDie = (parentName, dependencyPath) => {
      if (this._dependencyResolution.has(dependencyPath)) {
        return this._dependencyResolution.get(dependencyPath);
      }
      const possiblePrefixes = ["puppeteer-extra-plugin-"];
      const isAlreadyPrefixed = possiblePrefixes.some((prefix) => dependencyPath.startsWith(prefix));
      const packagePaths = [];
      if (!isAlreadyPrefixed) {
        packagePaths.push(...possiblePrefixes.map((prefix) => prefix + dependencyPath));
      }
      packagePaths.push(dependencyPath);
      const pluginModule = requirePackages(packagePaths);
      if (pluginModule) {
        return pluginModule;
      }
      const explanation = `
The plugin '${parentName}' listed '${dependencyPath}' as dependency,
which could not be found. Please install it:

${packagePaths.map((packagePath) => `yarn add ${packagePath.split("/")[0]}`).join(`
 or:
`)}

Note: You don't need to require the plugin yourself,
unless you want to modify it's default settings.

If your bundler has issues with dynamic imports take a look at '.plugins.setDependencyResolution()'.
      `;
      console.warn(explanation);
      throw new Error("Plugin dependency not found");
    };
    const existingPluginNames = new Set(this.names);
    const recursivelyLoadMissingDependencies = ({ name: parentName, dependencies }) => {
      if (!dependencies) {
        return;
      }
      const processDependency = (dependencyPath, opts) => {
        const pluginModule = requireDependencyOrDie(parentName, dependencyPath);
        opts = opts || this._dependencyDefaults.get(dependencyPath) || {};
        const plugin = pluginModule(opts);
        if (existingPluginNames.has(plugin.name)) {
          debug$1(parentName, "=> dependency already exists:", plugin.name);
          return;
        }
        existingPluginNames.add(plugin.name);
        debug$1(parentName, "=> adding new dependency:", plugin.name, opts);
        this.add(plugin);
        return recursivelyLoadMissingDependencies(plugin);
      };
      if (dependencies instanceof Set || Array.isArray(dependencies)) {
        return [...dependencies].forEach((dependencyPath) => processDependency(dependencyPath));
      }
      if (dependencies instanceof Map) {
        return dependencies.forEach((v, k) => processDependency(k, v));
      }
    };
    this.list.forEach(recursivelyLoadMissingDependencies);
  }
  /**
   * Lightweight plugin dependency management to require plugins and code mods on demand.
   * @private
   */
  resolveDependencies() {
    debug$1("resolveDependencies");
    this.resolvePluginsStanza();
    this.resolveDependenciesStanza();
  }
}
const debug$2 = debug$3("playwright-extra");
class PlaywrightExtraClass {
  constructor(_launcher) {
    this._launcher = _launcher;
    this.plugins = new PluginList();
  }
  /**
   * The **main interface** to register plugins.
   *
   * Can be called multiple times to enable multiple plugins.
   *
   * Plugins derived from `PuppeteerExtraPlugin` will be used with a compatiblity layer.
   *
   * @example
   * chromium.use(plugin1).use(plugin2)
   * firefox.use(plugin1).use(plugin2)
   *
   * @see [PuppeteerExtraPlugin]
   *
   * @return The same `PlaywrightExtra` instance (for optional chaining)
   */
  use(plugin) {
    const isValid = plugin && "name" in plugin;
    if (!isValid) {
      throw new Error("A plugin must be provided to .use()");
    }
    if (this.plugins.add(plugin)) {
      debug$2("Plugin registered", plugin.name);
    }
    return this;
  }
  /**
   * In order to support a default export which will require vanilla playwright automatically,
   * as well as `addExtra` to patch a provided launcher, we need to so some gymnastics here.
   *
   * Otherwise this would throw immediately, even when only using the `addExtra` export with an arbitrary compatible launcher.
   *
   * The solution is to make the vanilla launcher optional and only throw once we try to effectively use and can't find it.
   *
   * @internal
   */
  get launcher() {
    if (!this._launcher) {
      throw playwrightLoader.requireError;
    }
    return this._launcher;
  }
  async launch(...args) {
    if (!this.launcher.launch) {
      throw new Error('Launcher does not support "launch"');
    }
    let [options] = args;
    options = Object.assign({ args: [] }, options || {});
    debug$2("launch", options);
    this.plugins.prepare();
    options = await this.plugins.dispatchBlocking("beforeLaunch", options) || options;
    debug$2("launch with options", options);
    if ("userDataDir" in options) {
      debug$2("A plugin defined userDataDir during .launch, which isn't supported by playwright - ignoring");
      delete options.userDataDir;
    }
    const browser2 = await this.launcher["launch"](options);
    await this.plugins.dispatchBlocking("onBrowser", browser2);
    await this._bindBrowserEvents(browser2);
    await this.plugins.dispatchBlocking("afterLaunch", browser2);
    return browser2;
  }
  async launchPersistentContext(...args) {
    if (!this.launcher.launchPersistentContext) {
      throw new Error('Launcher does not support "launchPersistentContext"');
    }
    let [userDataDir, options] = args;
    options = Object.assign({ args: [] }, options || {});
    debug$2("launchPersistentContext", options);
    this.plugins.prepare();
    options = await this.plugins.dispatchBlocking("beforeLaunch", options) || options;
    const context = await this.launcher["launchPersistentContext"](userDataDir, options);
    await this.plugins.dispatchBlocking("afterLaunch", context);
    this._bindBrowserContextEvents(context);
    return context;
  }
  async connect(wsEndpointOrOptions, wsOptions = {}) {
    if (!this.launcher.connect) {
      throw new Error('Launcher does not support "connect"');
    }
    this.plugins.prepare();
    let options = {};
    let wsEndpointAsString = false;
    if (typeof wsEndpointOrOptions === "object") {
      options = Object.assign(Object.assign({}, wsEndpointOrOptions), wsOptions);
    } else {
      wsEndpointAsString = true;
      options = Object.assign({ wsEndpoint: wsEndpointOrOptions }, wsOptions);
    }
    debug$2("connect", options);
    options = await this.plugins.dispatchBlocking("beforeConnect", options) || options;
    const args = [];
    const wsEndpoint = options.wsEndpoint;
    if (wsEndpointAsString) {
      delete options.wsEndpoint;
      args.push(wsEndpoint, options);
    } else {
      args.push(options);
    }
    const browser2 = await this.launcher["connect"](...args);
    await this.plugins.dispatchBlocking("onBrowser", browser2);
    await this._bindBrowserEvents(browser2);
    await this.plugins.dispatchBlocking("afterConnect", browser2);
    return browser2;
  }
  async connectOverCDP(wsEndpointOrOptions, wsOptions = {}) {
    if (!this.launcher.connectOverCDP) {
      throw new Error(`Launcher does not implement 'connectOverCDP'`);
    }
    this.plugins.prepare();
    let options = {};
    let wsEndpointAsString = false;
    if (typeof wsEndpointOrOptions === "object") {
      options = Object.assign(Object.assign({}, wsEndpointOrOptions), wsOptions);
    } else {
      wsEndpointAsString = true;
      options = Object.assign({ endpointURL: wsEndpointOrOptions }, wsOptions);
    }
    debug$2("connectOverCDP");
    options = await this.plugins.dispatchBlocking("beforeConnect", options) || options;
    const args = [];
    const endpointURL = options.endpointURL;
    if (wsEndpointAsString) {
      delete options.endpointURL;
      args.push(endpointURL, options);
    } else {
      args.push(options);
    }
    const browser2 = await this.launcher["connectOverCDP"](...args);
    await this.plugins.dispatchBlocking("onBrowser", browser2);
    await this._bindBrowserEvents(browser2);
    await this.plugins.dispatchBlocking("afterConnect", browser2);
    return browser2;
  }
  async _bindBrowserContextEvents(context, contextOptions) {
    debug$2("_bindBrowserContextEvents");
    this.plugins.dispatch("onContextCreated", context, contextOptions);
    context.newPage = /* @__PURE__ */ ((originalMethod, ctx) => {
      return async () => {
        const page = await originalMethod.call(ctx);
        await page.goto("about:blank");
        return page;
      };
    })(context.newPage, context);
    context.on("close", () => {
      if (!context.browser()) {
        this.plugins.dispatch("onDisconnected");
      }
    });
    context.on("page", (page) => {
      this.plugins.dispatch("onPageCreated", page);
      page.on("close", () => {
        this.plugins.dispatch("onPageClose", page);
      });
    });
  }
  async _bindBrowserEvents(browser2) {
    debug$2("_bindPlaywrightBrowserEvents");
    browser2.on("disconnected", () => {
      this.plugins.dispatch("onDisconnected", browser2);
    });
    browser2.newContext = /* @__PURE__ */ ((originalMethod, ctx) => {
      return async (options = {}) => {
        const contextOptions = await this.plugins.dispatchBlocking("beforeContext", options, browser2) || options;
        const context = await originalMethod.call(ctx, contextOptions);
        this._bindBrowserContextEvents(context, contextOptions);
        return context;
      };
    })(browser2.newContext, browser2);
  }
}
const PlaywrightExtra = new Proxy(PlaywrightExtraClass, {
  construct(classTarget, args) {
    debug$2(`create instance of ${classTarget.name}`);
    const result = Reflect.construct(classTarget, args);
    return new Proxy(result, {
      get(target, prop) {
        if (prop in target) {
          return Reflect.get(target, prop);
        }
        debug$2("proxying property to original launcher: ", prop);
        return Reflect.get(target.launcher, prop);
      }
    });
  }
});
const addExtra = (launcher) => new PlaywrightExtra(launcher);
const chromium = addExtra((playwrightLoader.loadModule() || {}).chromium);
addExtra((playwrightLoader.loadModule() || {}).firefox);
addExtra((playwrightLoader.loadModule() || {}).webkit);
playwrightLoader.lazyloadExportOrDie("_android");
playwrightLoader.lazyloadExportOrDie("_electron");
playwrightLoader.lazyloadExportOrDie("request");
playwrightLoader.lazyloadExportOrDie("selectors");
playwrightLoader.lazyloadExportOrDie("devices");
playwrightLoader.lazyloadExportOrDie("errors");
/*!
 * puppeteer-extra-plugin v3.2.2 by berstend
 * https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin
 * @license MIT
 */
const merge = require("merge-deep");
class PuppeteerExtraPlugin {
  constructor(opts) {
    this._debugBase = debug$3(`puppeteer-extra-plugin:base:${this.name}`);
    this._childClassMembers = [];
    this._opts = merge(this.defaults, opts || {});
    this._debugBase("Initialized.");
  }
  /**
   * Plugin name (required).
   *
   * Convention:
   * - Package: `puppeteer-extra-plugin-anonymize-ua`
   * - Name: `anonymize-ua`
   *
   * @example
   * get name () { return 'anonymize-ua' }
   */
  get name() {
    throw new Error('Plugin must override "name"');
  }
  /**
   * Plugin defaults (optional).
   *
   * If defined will be ([deep-](https://github.com/jonschlinkert/merge-deep))merged with the (optional) user supplied options (supplied during plugin instantiation).
   *
   * The result of merging defaults with user supplied options can be accessed through `this.opts`.
   *
   * @see [[opts]]
   *
   * @example
   * get defaults () {
   *   return {
   *     stripHeadless: true,
   *     makeWindows: true,
   *     customFn: null
   *   }
   * }
   *
   * // Users can overwrite plugin defaults during instantiation:
   * puppeteer.use(require('puppeteer-extra-plugin-foobar')({ makeWindows: false }))
   */
  get defaults() {
    return {};
  }
  /**
   * Plugin requirements (optional).
   *
   * Signal certain plugin requirements to the base class and the user.
   *
   * Currently supported:
   * - `launch`
   *   - If the plugin only supports locally created browser instances (no `puppeteer.connect()`),
   *     will output a warning to the user.
   * - `headful`
   *   - If the plugin doesn't work in `headless: true` mode,
   *     will output a warning to the user.
   * - `dataFromPlugins`
   *   - In case the plugin requires data from other plugins.
   *     will enable usage of `this.getDataFromPlugins()`.
   * - `runLast`
   *   - In case the plugin prefers to run after the others.
   *     Useful when the plugin needs data from others.
   *
   * @example
   * get requirements () {
   *   return new Set(['runLast', 'dataFromPlugins'])
   * }
   */
  get requirements() {
    return /* @__PURE__ */ new Set([]);
  }
  /**
   * Plugin dependencies (optional).
   *
   * Missing plugins will be required() by puppeteer-extra.
   *
   * @example
   * get dependencies () {
   *   return new Set(['user-preferences'])
   * }
   * // Will ensure the 'puppeteer-extra-plugin-user-preferences' plugin is loaded.
   */
  get dependencies() {
    return /* @__PURE__ */ new Set([]);
  }
  /**
   * Plugin data (optional).
   *
   * Plugins can expose data (an array of objects), which in turn can be consumed by other plugins,
   * that list the `dataFromPlugins` requirement (by using `this.getDataFromPlugins()`).
   *
   * Convention: `[ {name: 'Any name', value: 'Any value'} ]`
   *
   * @see [[getDataFromPlugins]]
   *
   * @example
   * // plugin1.js
   * get data () {
   *   return [
   *     {
   *       name: 'userPreferences',
   *       value: { foo: 'bar' }
   *     },
   *     {
   *       name: 'userPreferences',
   *       value: { hello: 'world' }
   *     }
   *   ]
   *
   * // plugin2.js
   * get requirements () { return new Set(['dataFromPlugins']) }
   *
   * async beforeLaunch () {
   *   const prefs = this.getDataFromPlugins('userPreferences').map(d => d.value)
   *   this.debug(prefs) // => [ { foo: 'bar' }, { hello: 'world' } ]
   * }
   */
  get data() {
    return [];
  }
  /**
   * Access the plugin options (usually the `defaults` merged with user defined options)
   *
   * To skip the auto-merging of defaults with user supplied opts don't define a `defaults`
   * property and set the `this._opts` Object in your plugin constructor directly.
   *
   * @see [[defaults]]
   *
   * @example
   * get defaults () { return { foo: "bar" } }
   *
   * async onPageCreated (page) {
   *   this.debug(this.opts.foo) // => bar
   * }
   */
  get opts() {
    return this._opts;
  }
  /**
   *  Convenience debug logger based on the [debug] module.
   *  Will automatically namespace the logging output to the plugin package name.
   *  [debug]: https://www.npmjs.com/package/debug
   *
   *  ```bash
   *  # toggle output using environment variables
   *  DEBUG=puppeteer-extra-plugin:<plugin_name> node foo.js
   *  # to debug all the things:
   *  DEBUG=puppeteer-extra,puppeteer-extra-plugin:* node foo.js
   *  ```
   *
   * @example
   * this.debug('hello world')
   * // will output e.g. 'puppeteer-extra-plugin:anonymize-ua hello world'
   */
  get debug() {
    return debug$3(`puppeteer-extra-plugin:${this.name}`);
  }
  /**
   * Before a new browser instance is created/launched.
   *
   * Can be used to modify the puppeteer launch options by modifying or returning them.
   *
   * Plugins using this method will be called in sequence to each
   * be able to update the launch options.
   *
   * @example
   * async beforeLaunch (options) {
   *   if (this.opts.flashPluginPath) {
   *     options.args.push(`--ppapi-flash-path=${this.opts.flashPluginPath}`)
   *   }
   * }
   *
   * @param options - Puppeteer launch options
   */
  async beforeLaunch(options) {
  }
  /**
   * After the browser has launched.
   *
   * Note: Don't assume that there will only be a single browser instance during the lifecycle of a plugin.
   * It's possible that `pupeeteer.launch` will be  called multiple times and more than one browser created.
   * In order to make the plugins as stateless as possible don't store a reference to the browser instance
   * in the plugin but rather consider alternatives.
   *
   * E.g. when using `onPageCreated` you can get a browser reference by using `page.browser()`.
   *
   * Alternatively you could expose a class method that takes a browser instance as a parameter to work with:
   *
   * ```es6
   * const fancyPlugin = require('puppeteer-extra-plugin-fancy')()
   * puppeteer.use(fancyPlugin)
   * const browser = await puppeteer.launch()
   * await fancyPlugin.killBrowser(browser)
   * ```
   *
   * @param  browser - The `puppeteer` browser instance.
   * @param  opts.options - Puppeteer launch options used.
   *
   * @example
   * async afterLaunch (browser, opts) {
   *   this.debug('browser has been launched', opts.options)
   * }
   */
  async afterLaunch(browser2, opts = { options: {} }) {
  }
  /**
   * Before connecting to an existing browser instance.
   *
   * Can be used to modify the puppeteer connect options by modifying or returning them.
   *
   * Plugins using this method will be called in sequence to each
   * be able to update the launch options.
   *
   * @param  {Object} options - Puppeteer connect options
   * @return {Object=}
   */
  async beforeConnect(options) {
  }
  /**
   * After connecting to an existing browser instance.
   *
   * > Note: Don't assume that there will only be a single browser instance during the lifecycle of a plugin.
   *
   * @param browser - The `puppeteer` browser instance.
   * @param  {Object} opts
   * @param  {Object} opts.options - Puppeteer connect options used.
   *
   */
  async afterConnect(browser2, opts = {}) {
  }
  /**
   * Called when a browser instance is available.
   *
   * This applies to both `puppeteer.launch()` and `puppeteer.connect()`.
   *
   * Convenience method created for plugins that need access to a browser instance
   * and don't mind if it has been created through `launch` or `connect`.
   *
   * > Note: Don't assume that there will only be a single browser instance during the lifecycle of a plugin.
   *
   * @param browser - The `puppeteer` browser instance.
   */
  async onBrowser(browser2, opts) {
  }
  /**
   * Called when a target is created, for example when a new page is opened by window.open or browser.newPage.
   *
   * > Note: This includes target creations in incognito browser contexts.
   *
   * > Note: This includes browser instances created through `.launch()` as well as `.connect()`.
   *
   * @param  {Puppeteer.Target} target
   */
  async onTargetCreated(target) {
  }
  /**
   * Same as `onTargetCreated` but prefiltered to only contain Pages, for convenience.
   *
   * > Note: This includes page creations in incognito browser contexts.
   *
   * > Note: This includes browser instances created through `.launch()` as well as `.connect()`.
   *
   * @param  {Puppeteer.Target} target
   *
   * @example
   * async onPageCreated (page) {
   *   let ua = await page.browser().userAgent()
   *   if (this.opts.stripHeadless) {
   *     ua = ua.replace('HeadlessChrome/', 'Chrome/')
   *   }
   *   this.debug('new ua', ua)
   *   await page.setUserAgent(ua)
   * }
   */
  async onPageCreated(page) {
  }
  /**
   * Called when the url of a target changes.
   *
   * > Note: This includes target changes in incognito browser contexts.
   *
   * > Note: This includes browser instances created through `.launch()` as well as `.connect()`.
   *
   * @param  {Puppeteer.Target} target
   */
  async onTargetChanged(target) {
  }
  /**
   * Called when a target is destroyed, for example when a page is closed.
   *
   * > Note: This includes target destructions in incognito browser contexts.
   *
   * > Note: This includes browser instances created through `.launch()` as well as `.connect()`.
   *
   * @param  {Puppeteer.Target} target
   */
  async onTargetDestroyed(target) {
  }
  /**
   * Called when Puppeteer gets disconnected from the Chromium instance.
   *
   * This might happen because of one of the following:
   * - Chromium is closed or crashed
   * - The `browser.disconnect` method was called
   */
  async onDisconnected() {
  }
  /**
   * **Deprecated:** Since puppeteer v1.6.0 `onDisconnected` has been improved
   * and should be used instead of `onClose`.
   *
   * In puppeteer < v1.6.0 `onDisconnected` was not catching all exit scenarios.
   * In order for plugins to clean up properly (e.g. deleting temporary files)
   * the `onClose` method had been introduced.
   *
   * > Note: Might be called multiple times on exit.
   *
   * > Note: This only includes browser instances created through `.launch()`.
   */
  async onClose() {
  }
  /**
   * After the plugin has been registered in `puppeteer-extra`.
   *
   * Normally right after `puppeteer.use(plugin)` is called
   */
  async onPluginRegistered() {
  }
  /**
   * Helper method to retrieve `data` objects from other plugins.
   *
   * A plugin needs to state the `dataFromPlugins` requirement
   * in order to use this method. Will be mapped to `puppeteer.getPluginData`.
   *
   * @param name - Filter data by `name` property
   *
   * @see [data]
   * @see [requirements]
   */
  getDataFromPlugins(name) {
    return [];
  }
  /**
   * Will match plugin dependencies against all currently registered plugins.
   * Is being called by `puppeteer-extra` and used to require missing dependencies.
   *
   * @param  {Array<Object>} plugins
   * @return {Set} - list of missing plugin names
   *
   * @private
   */
  _getMissingDependencies(plugins) {
    const pluginNames = new Set(plugins.map((p) => p.name));
    const missing = new Set(Array.from(this.dependencies.values()).filter((x) => !pluginNames.has(x)));
    return missing;
  }
  /**
   * Conditionally bind browser/process events to class members.
   * The idea is to reduce event binding boilerplate in plugins.
   *
   * For efficiency we make sure the plugin is using the respective event
   * by checking the child class members before registering the listener.
   *
   * @param  {<Puppeteer.Browser>} browser
   * @param  {Object} opts - Options
   * @param  {string} opts.context - Puppeteer context (launch/connect)
   * @param  {Object} [opts.options] - Puppeteer launch or connect options
   * @param  {Array<string>} [opts.defaultArgs] - The default flags that Chromium will be launched with
   *
   * @private
   */
  async _bindBrowserEvents(browser2, opts = {}) {
    if (this._hasChildClassMember("onTargetCreated") || this._hasChildClassMember("onPageCreated")) {
      browser2.on("targetcreated", this._onTargetCreated.bind(this));
    }
    if (this._hasChildClassMember("onTargetChanged") && this.onTargetChanged) {
      browser2.on("targetchanged", this.onTargetChanged.bind(this));
    }
    if (this._hasChildClassMember("onTargetDestroyed") && this.onTargetDestroyed) {
      browser2.on("targetdestroyed", this.onTargetDestroyed.bind(this));
    }
    if (this._hasChildClassMember("onDisconnected") && this.onDisconnected) {
      browser2.on("disconnected", this.onDisconnected.bind(this));
    }
    if (opts.context === "launch" && this._hasChildClassMember("onClose")) {
      if (this.onClose) {
        process.on("exit", this.onClose.bind(this));
        browser2.on("disconnected", this.onClose.bind(this));
        if (opts.options.handleSIGINT !== false) {
          process.on("SIGINT", this.onClose.bind(this));
        }
        if (opts.options.handleSIGTERM !== false) {
          process.on("SIGTERM", this.onClose.bind(this));
        }
        if (opts.options.handleSIGHUP !== false) {
          process.on("SIGHUP", this.onClose.bind(this));
        }
      }
    }
    if (opts.context === "launch" && this.afterLaunch) {
      await this.afterLaunch(browser2, opts);
    }
    if (opts.context === "connect" && this.afterConnect) {
      await this.afterConnect(browser2, opts);
    }
    if (this.onBrowser)
      await this.onBrowser(browser2, opts);
  }
  /**
   * @private
   */
  async _onTargetCreated(target) {
    if (this.onTargetCreated)
      await this.onTargetCreated(target);
    if (target.type() === "page") {
      try {
        const page = await target.page();
        if (!page) {
          return;
        }
        const validPage = "isClosed" in page && !page.isClosed();
        if (this.onPageCreated && validPage) {
          await this.onPageCreated(page);
        }
      } catch (err) {
        console.error(err);
      }
    }
  }
  /**
   * @private
   */
  _register(prototype) {
    this._registerChildClassMembers(prototype);
    if (this.onPluginRegistered)
      this.onPluginRegistered();
  }
  /**
   * @private
   */
  _registerChildClassMembers(prototype) {
    this._childClassMembers = Object.getOwnPropertyNames(prototype);
  }
  /**
   * @private
   */
  _hasChildClassMember(name) {
    return !!this._childClassMembers.includes(name);
  }
  /**
   * @private
   */
  get _isPuppeteerExtraPlugin() {
    return true;
  }
}
const index_esm = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  PuppeteerExtraPlugin
}, Symbol.toStringTag, { value: "Module" }));
const require$$0 = /* @__PURE__ */ getAugmentedNamespace(index_esm);
var puppeteerExtraPluginStealth;
var hasRequiredPuppeteerExtraPluginStealth;
function requirePuppeteerExtraPluginStealth() {
  if (hasRequiredPuppeteerExtraPluginStealth) return puppeteerExtraPluginStealth;
  hasRequiredPuppeteerExtraPluginStealth = 1;
  const { PuppeteerExtraPlugin: PuppeteerExtraPlugin2 } = require$$0;
  class StealthPlugin extends PuppeteerExtraPlugin2 {
    constructor(opts = {}) {
      super(opts);
    }
    get name() {
      return "stealth";
    }
    get defaults() {
      const availableEvasions = /* @__PURE__ */ new Set([
        "chrome.app",
        "chrome.csi",
        "chrome.loadTimes",
        "chrome.runtime",
        "defaultArgs",
        "iframe.contentWindow",
        "media.codecs",
        "navigator.hardwareConcurrency",
        "navigator.languages",
        "navigator.permissions",
        "navigator.plugins",
        "navigator.webdriver",
        "sourceurl",
        "user-agent-override",
        "webgl.vendor",
        "window.outerdimensions"
      ]);
      return {
        availableEvasions,
        // Enable all available evasions by default
        enabledEvasions: /* @__PURE__ */ new Set([...availableEvasions])
      };
    }
    /**
     * Requires evasion techniques dynamically based on configuration.
     *
     * @private
     */
    get dependencies() {
      return new Set(
        [...this.opts.enabledEvasions].map((e) => `${this.name}/evasions/${e}`)
      );
    }
    /**
     * Get all available evasions.
     *
     * Please look into the [evasions directory](./evasions/) for an up to date list.
     *
     * @type {Set<string>} - A Set of all available evasions.
     *
     * @example
     * const pluginStealth = require('puppeteer-extra-plugin-stealth')()
     * console.log(pluginStealth.availableEvasions) // => Set { 'user-agent', 'console.debug' }
     * puppeteer.use(pluginStealth)
     */
    get availableEvasions() {
      return this.defaults.availableEvasions;
    }
    /**
     * Get all enabled evasions.
     *
     * Enabled evasions can be configured either through `opts` or by modifying this property.
     *
     * @type {Set<string>} - A Set of all enabled evasions.
     *
     * @example
     * // Remove specific evasion from enabled ones dynamically
     * const pluginStealth = require('puppeteer-extra-plugin-stealth')()
     * pluginStealth.enabledEvasions.delete('console.debug')
     * puppeteer.use(pluginStealth)
     */
    get enabledEvasions() {
      return this.opts.enabledEvasions;
    }
    /**
     * @private
     */
    set enabledEvasions(evasions) {
      this.opts.enabledEvasions = evasions;
    }
    async onBrowser(browser2) {
      if (browser2 && browser2.setMaxListeners) {
        browser2.setMaxListeners(30);
      }
    }
  }
  const defaultExport = (opts) => new StealthPlugin(opts);
  puppeteerExtraPluginStealth = defaultExport;
  return puppeteerExtraPluginStealth;
}
var puppeteerExtraPluginStealthExports = requirePuppeteerExtraPluginStealth();
const stealth = /* @__PURE__ */ getDefaultExportFromCjs(puppeteerExtraPluginStealthExports);
chromium.use(stealth());
async function runSubmission(data, sendProgress) {
  const { paper, venue, credentials } = data;
  sendProgress({ step: "init", message: "Launching stealth Chromium browser..." });
  try {
    const potentialPaths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
    ];
    let execPath = void 0;
    for (const p of potentialPaths) {
      if (fs.existsSync(p)) {
        execPath = p;
        break;
      }
    }
    const bounds = data.absoluteBounds || { x: 50, y: 50, width: 400, height: 650 };
    const startSize = `--window-size=${bounds.width},${bounds.height}`;
    const startPos = `--window-position=${bounds.x},${bounds.y}`;
    const browser2 = await chromium.launch({
      headless: false,
      // User can see what's happening
      executablePath: execPath,
      args: [
        "--app=data:,",
        startSize,
        startPos,
        "--no-sandbox",
        "--disable-infobars",
        "--hide-scrollbars"
      ]
    });
    const context = await browser2.newContext({ viewport: null });
    const page = await context.newPage();
    const portalUrl = (credentials == null ? void 0 : credentials.portal_url) || venue.submission_url || `https://submit.example.com`;
    sendProgress({ step: "navigate", message: `Navigating to ${portalUrl} in micro-browser...` });
    await page.goto(portalUrl, { waitUntil: "domcontentloaded", timeout: 3e4 }).catch(() => {
    });
    sendProgress({ step: "login", message: "Ready for login..." });
    await page.waitForTimeout(3e3);
    sendProgress({ step: "form_fill", message: `Human intervention required! Zooming browser...` });
    await page.evaluate(() => window.resizeTo(1200, 800));
    await page.evaluate(() => window.moveTo(
      window.screen.availWidth / 2 - 600,
      window.screen.availHeight / 2 - 400
    ));
    sendProgress({ step: "form_fill", message: `Please solve the challenge or verify inputs within the expanded window...` });
    await page.waitForTimeout(1e4);
    sendProgress({ step: "form_fill", message: `Action complete. Returning micro web view to bounds.` });
    await page.evaluate((b) => window.resizeTo(b.width, b.height), bounds);
    await page.evaluate((b) => window.moveTo(b.x, b.y), bounds);
    return { success: true, url: portalUrl };
  } catch (error) {
    sendProgress({ step: "error", message: `Browser error: ${error.message}` });
    return { success: false, error: error.message };
  }
}
node_module.createRequire(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href);
const __dirname$1 = path.dirname(node_url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href));
process.env.APP_ROOT = path.join(__dirname$1, "..");
electron.app.disableHardwareAcceleration();
electron.app.commandLine.appendSwitch("disable-gpu");
electron.app.commandLine.appendSwitch("disable-software-rasterizer");
electron.app.commandLine.appendSwitch("disable-gpu-compositing");
electron.app.commandLine.appendSwitch("disable-gpu-rasterization");
electron.app.commandLine.appendSwitch("disable-gpu-sandbox");
electron.app.commandLine.appendSwitch("no-sandbox");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
let embeddedView = null;
function createWindow() {
  win = new electron.BrowserWindow({
    width: 1280,
    height: 800,
    title: "PublishKaro",
    icon: path.join(process.env.VITE_PUBLIC || "", "favicon.ico"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
    win = null;
  }
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
electron.app.whenReady().then(() => {
  createWindow();
  electron.ipcMain.on("start-submission", async (event, data) => {
    var _a;
    console.log("[Main] Received start-submission request:", (_a = data.paper) == null ? void 0 : _a.title);
    const mainWindow = electron.BrowserWindow.fromWebContents(event.sender);
    const contentBounds = (mainWindow == null ? void 0 : mainWindow.getContentBounds()) || { x: 0, y: 0 };
    if (data.bounds) {
      data.absoluteBounds = {
        x: Math.round(contentBounds.x + data.bounds.x),
        y: Math.round(contentBounds.y + data.bounds.y),
        width: Math.round(data.bounds.width),
        height: Math.round(data.bounds.height)
      };
    }
    await runSubmission(data, (progressMsg) => {
      event.sender.send("submission-progress", progressMsg);
    });
  });
  electron.ipcMain.on("embed-webcontents", (event, payload) => {
    const mainWindow = electron.BrowserWindow.fromWebContents(event.sender);
    if (!mainWindow) return;
    if (embeddedView) {
      mainWindow.contentView.removeChildView(embeddedView);
      embeddedView.webContents.close();
      embeddedView = null;
    }
    mainWindow.getContentBounds();
    const { url, bounds } = payload;
    const absoluteBounds = {
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height)
    };
    console.log(`[Main] Embedding WebContentsView at`, absoluteBounds, "loading:", url);
    embeddedView = new electron.WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    mainWindow.contentView.addChildView(embeddedView);
    embeddedView.setBounds(absoluteBounds);
    embeddedView.webContents.loadURL(url);
    embeddedView.webContents.on("did-finish-load", () => {
      event.sender.send("webcontents-status", { status: "loaded", url: embeddedView == null ? void 0 : embeddedView.webContents.getURL() });
    });
    embeddedView.webContents.on("did-fail-load", (_e, code, desc) => {
      event.sender.send("webcontents-status", { status: "error", error: desc });
    });
  });
  electron.ipcMain.on("destroy-webcontents", (event) => {
    const mainWindow = electron.BrowserWindow.fromWebContents(event.sender);
    if (!mainWindow || !embeddedView) return;
    mainWindow.contentView.removeChildView(embeddedView);
    embeddedView.webContents.close();
    embeddedView = null;
    console.log("[Main] WebContentsView destroyed");
    event.sender.send("webcontents-status", { status: "destroyed" });
  });
  electron.ipcMain.on("resize-webcontents", (_event, bounds) => {
    if (embeddedView) {
      embeddedView.setBounds({
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height)
      });
    }
  });
});
exports.MAIN_DIST = MAIN_DIST;
exports.RENDERER_DIST = RENDERER_DIST;
exports.VITE_DEV_SERVER_URL = VITE_DEV_SERVER_URL;
