var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../.wrangler/tmp/bundle-qCMFCo/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// ../node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// ../node_modules/hono/dist/http-exception.js
var HTTPException = class extends Error {
  static {
    __name(this, "HTTPException");
  }
  res;
  status;
  /**
   * Creates an instance of `HTTPException`.
   * @param status - HTTP status code for the exception. Defaults to 500.
   * @param options - Additional options for the exception.
   */
  constructor(status = 500, options) {
    super(options?.message, { cause: options?.cause });
    this.res = options?.res;
    this.status = status;
  }
  /**
   * Returns the response object associated with the exception.
   * If a response object is not provided, a new response is created with the error message and status code.
   * @returns The response object.
   */
  getResponse() {
    if (this.res) {
      const newResponse = new Response(this.res.body, {
        status: this.status,
        headers: this.res.headers
      });
      return newResponse;
    }
    return new Response(this.message, {
      status: this.status
    });
  }
};

// ../node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// ../node_modules/hono/dist/utils/buffer.js
var bufferToFormData = /* @__PURE__ */ __name((arrayBuffer, contentType) => {
  const response = new Response(arrayBuffer, {
    headers: {
      // Normalize the media type (case-insensitive) while keeping parameters like the boundary
      "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase())
    }
  });
  return response.formData();
}, "bufferToFormData");

// ../node_modules/hono/dist/utils/body.js
var isRawRequest = /* @__PURE__ */ __name((request) => "headers" in request, "isRawRequest");
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const contentType = headers.get("Content-Type");
  const mediaType = contentType?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) {
    request.bodyCache.formData = formDataPromise;
  }
  const formData = await formDataPromise;
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// ../node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match3, index) => {
    const mark = `@${index}`;
    groups.push([mark, match3]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match3 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match3) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match3[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match3[1], new RegExp(`^${match3[2]}(?=/${next})`)] : [label, match3[1], new RegExp(`^${match3[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match3[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match3) => {
      try {
        return decoder(match3);
      } catch {
        return match3;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// ../node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// ../node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// ../node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name((body, init) => new Response(body, init), "createResponseInstance");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// ../node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// ../node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// ../node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class _Hono {
  static {
    __name(this, "_Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// ../node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match22 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match2");
  this.match = match22;
  return match22(method, path);
}
__name(match, "match");

// ../node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class _Node {
  static {
    __name(this, "_Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// ../node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// ../node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes2) {
  const trie = new Trie();
  const handlerData = [];
  if (routes2.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes2.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes2 = this.#routes;
    if (!middleware || !routes2) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes2].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes2).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes2[m]).forEach(
            (p) => re.test(p) && routes2[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes2).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes2[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes2[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes2 = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes2.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes2.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes2);
    }
  }
};

// ../node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes2 = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes2.length; i2 < len2; i2++) {
          router.add(...routes2[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// ../node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = /* @__PURE__ */ __name((children) => {
  for (const _ in children) {
    return true;
  }
  return false;
}, "hasChildren");
var Node2 = class _Node2 {
  static {
    __name(this, "_Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  node.#params,
                  params
                );
              }
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// ../node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// ../node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// ../node_modules/hono/dist/middleware/cors/index.js
var cors = /* @__PURE__ */ __name((options) => {
  const opts = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: [],
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  }, "cors2");
}, "cors");

// ../node_modules/hono/dist/utils/cookie.js
var algorithm = { name: "HMAC", hash: "SHA-256" };
var getCryptoKey = /* @__PURE__ */ __name(async (secret) => {
  const secretBuf = typeof secret === "string" ? new TextEncoder().encode(secret) : secret;
  return await crypto.subtle.importKey("raw", secretBuf, algorithm, false, ["sign", "verify"]);
}, "getCryptoKey");
var verifySignature = /* @__PURE__ */ __name(async (base64Signature, value, secret) => {
  try {
    const signatureBinStr = atob(base64Signature);
    const signature = new Uint8Array(signatureBinStr.length);
    for (let i = 0, len = signatureBinStr.length; i < len; i++) {
      signature[i] = signatureBinStr.charCodeAt(i);
    }
    return await crypto.subtle.verify(algorithm, secret, signature, new TextEncoder().encode(value));
  } catch {
    return false;
  }
}, "verifySignature");
var validCookieNameRegEx = /^[\w!#$%&'*.^`|~+-]+$/;
var validCookieValueRegEx = /^[ !#-:<-[\]-~]*$/;
var trimCookieWhitespace = /* @__PURE__ */ __name((value) => {
  let start = 0;
  let end = value.length;
  while (start < end) {
    const charCode = value.charCodeAt(start);
    if (charCode !== 32 && charCode !== 9) {
      break;
    }
    start++;
  }
  while (end > start) {
    const charCode = value.charCodeAt(end - 1);
    if (charCode !== 32 && charCode !== 9) {
      break;
    }
    end--;
  }
  return start === 0 && end === value.length ? value : value.slice(start, end);
}, "trimCookieWhitespace");
var parse = /* @__PURE__ */ __name((cookie, name) => {
  if (name && cookie.indexOf(name) === -1) {
    return {};
  }
  const pairs = cookie.split(";");
  const parsedCookie = /* @__PURE__ */ Object.create(null);
  for (const pairStr of pairs) {
    const valueStartPos = pairStr.indexOf("=");
    if (valueStartPos === -1) {
      continue;
    }
    const cookieName = trimCookieWhitespace(pairStr.substring(0, valueStartPos));
    if (name && name !== cookieName || !validCookieNameRegEx.test(cookieName) || cookieName in parsedCookie) {
      continue;
    }
    let cookieValue = trimCookieWhitespace(pairStr.substring(valueStartPos + 1));
    if (cookieValue.startsWith('"') && cookieValue.endsWith('"')) {
      cookieValue = cookieValue.slice(1, -1);
    }
    if (validCookieValueRegEx.test(cookieValue)) {
      parsedCookie[cookieName] = cookieValue.indexOf("%") !== -1 ? tryDecode(cookieValue, decodeURIComponent_) : cookieValue;
      if (name) {
        break;
      }
    }
  }
  return parsedCookie;
}, "parse");
var parseSigned = /* @__PURE__ */ __name(async (cookie, secret, name) => {
  const parsedCookie = /* @__PURE__ */ Object.create(null);
  const secretKey = await getCryptoKey(secret);
  for (const [key, value] of Object.entries(parse(cookie, name))) {
    const signatureStartPos = value.lastIndexOf(".");
    if (signatureStartPos < 1) {
      continue;
    }
    const signedValue = value.substring(0, signatureStartPos);
    const signature = value.substring(signatureStartPos + 1);
    if (signature.length !== 44 || !signature.endsWith("=")) {
      continue;
    }
    const isVerified = await verifySignature(signature, signedValue, secretKey);
    parsedCookie[key] = isVerified ? signedValue : false;
  }
  return parsedCookie;
}, "parseSigned");

// ../node_modules/hono/dist/helper/cookie/index.js
var getCookie = /* @__PURE__ */ __name((c, key, prefix) => {
  const cookie = c.req.raw.headers.get("Cookie");
  if (typeof key === "string") {
    if (!cookie) {
      return void 0;
    }
    let finalKey = key;
    if (prefix === "secure") {
      finalKey = "__Secure-" + key;
    } else if (prefix === "host") {
      finalKey = "__Host-" + key;
    }
    const obj2 = parse(cookie, finalKey);
    return obj2[finalKey];
  }
  if (!cookie) {
    return {};
  }
  const obj = parse(cookie);
  return obj;
}, "getCookie");
var getSignedCookie = /* @__PURE__ */ __name(async (c, secret, key, prefix) => {
  const cookie = c.req.raw.headers.get("Cookie");
  if (typeof key === "string") {
    if (!cookie) {
      return void 0;
    }
    let finalKey = key;
    if (prefix === "secure") {
      finalKey = "__Secure-" + key;
    } else if (prefix === "host") {
      finalKey = "__Host-" + key;
    }
    const obj2 = await parseSigned(cookie, secret, finalKey);
    return obj2[finalKey];
  }
  if (!cookie) {
    return {};
  }
  const obj = await parseSigned(cookie, secret);
  return obj;
}, "getSignedCookie");

// ../node_modules/hono/dist/utils/encode.js
var decodeBase64Url = /* @__PURE__ */ __name((str) => {
  return decodeBase64(str.replace(/_|-/g, (m) => ({ _: "/", "-": "+" })[m] ?? m));
}, "decodeBase64Url");
var encodeBase64Url = /* @__PURE__ */ __name((buf) => encodeBase64(buf).replace(/\/|\+/g, (m) => ({ "/": "_", "+": "-" })[m] ?? m), "encodeBase64Url");
var encodeBase64 = /* @__PURE__ */ __name((buf) => {
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0, len = bytes.length; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}, "encodeBase64");
var decodeBase64 = /* @__PURE__ */ __name((str) => {
  const binary = atob(str);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  const half = binary.length / 2;
  for (let i = 0, j = binary.length - 1; i <= half; i++, j--) {
    bytes[i] = binary.charCodeAt(i);
    bytes[j] = binary.charCodeAt(j);
  }
  return bytes;
}, "decodeBase64");

// ../node_modules/hono/dist/utils/jwt/jwa.js
var AlgorithmTypes = /* @__PURE__ */ ((AlgorithmTypes2) => {
  AlgorithmTypes2["HS256"] = "HS256";
  AlgorithmTypes2["HS384"] = "HS384";
  AlgorithmTypes2["HS512"] = "HS512";
  AlgorithmTypes2["RS256"] = "RS256";
  AlgorithmTypes2["RS384"] = "RS384";
  AlgorithmTypes2["RS512"] = "RS512";
  AlgorithmTypes2["PS256"] = "PS256";
  AlgorithmTypes2["PS384"] = "PS384";
  AlgorithmTypes2["PS512"] = "PS512";
  AlgorithmTypes2["ES256"] = "ES256";
  AlgorithmTypes2["ES384"] = "ES384";
  AlgorithmTypes2["ES512"] = "ES512";
  AlgorithmTypes2["EdDSA"] = "EdDSA";
  return AlgorithmTypes2;
})(AlgorithmTypes || {});

// ../node_modules/hono/dist/helper/adapter/index.js
var knownUserAgents = {
  deno: "Deno",
  bun: "Bun",
  workerd: "Cloudflare-Workers",
  node: "Node.js"
};
var getRuntimeKey = /* @__PURE__ */ __name(() => {
  const global = globalThis;
  const userAgentSupported = typeof navigator !== "undefined" && true;
  if (userAgentSupported) {
    for (const [runtimeKey, userAgent] of Object.entries(knownUserAgents)) {
      if (checkUserAgentEquals(userAgent)) {
        return runtimeKey;
      }
    }
  }
  if (typeof global?.EdgeRuntime === "string") {
    return "edge-light";
  }
  if (global?.fastly !== void 0) {
    return "fastly";
  }
  if (global?.process?.release?.name === "node") {
    return "node";
  }
  return "other";
}, "getRuntimeKey");
var checkUserAgentEquals = /* @__PURE__ */ __name((platform) => {
  const userAgent = "Cloudflare-Workers";
  return userAgent.startsWith(platform);
}, "checkUserAgentEquals");

// ../node_modules/hono/dist/utils/jwt/types.js
var JwtAlgorithmNotImplemented = class extends Error {
  static {
    __name(this, "JwtAlgorithmNotImplemented");
  }
  constructor(alg) {
    super(`${alg} is not an implemented algorithm`);
    this.name = "JwtAlgorithmNotImplemented";
  }
};
var JwtAlgorithmRequired = class extends Error {
  static {
    __name(this, "JwtAlgorithmRequired");
  }
  constructor() {
    super('JWT verification requires "alg" option to be specified');
    this.name = "JwtAlgorithmRequired";
  }
};
var JwtAlgorithmMismatch = class extends Error {
  static {
    __name(this, "JwtAlgorithmMismatch");
  }
  constructor(expected, actual) {
    super(`JWT algorithm mismatch: expected "${expected}", got "${actual}"`);
    this.name = "JwtAlgorithmMismatch";
  }
};
var JwtTokenInvalid = class extends Error {
  static {
    __name(this, "JwtTokenInvalid");
  }
  constructor(token) {
    super(`invalid JWT token: ${token}`);
    this.name = "JwtTokenInvalid";
  }
};
var JwtTokenNotBefore = class extends Error {
  static {
    __name(this, "JwtTokenNotBefore");
  }
  constructor(token) {
    super(`token (${token}) is being used before it's valid`);
    this.name = "JwtTokenNotBefore";
  }
};
var JwtTokenExpired = class extends Error {
  static {
    __name(this, "JwtTokenExpired");
  }
  constructor(token) {
    super(`token (${token}) expired`);
    this.name = "JwtTokenExpired";
  }
};
var JwtTokenIssuedAt = class extends Error {
  static {
    __name(this, "JwtTokenIssuedAt");
  }
  constructor(currentTimestamp, iat) {
    super(
      `Invalid "iat" claim, must be a valid number lower than "${currentTimestamp}" (iat: "${iat}")`
    );
    this.name = "JwtTokenIssuedAt";
  }
};
var JwtTokenIssuer = class extends Error {
  static {
    __name(this, "JwtTokenIssuer");
  }
  constructor(expected, iss) {
    super(`expected issuer "${expected}", got ${iss ? `"${iss}"` : "none"} `);
    this.name = "JwtTokenIssuer";
  }
};
var JwtHeaderInvalid = class extends Error {
  static {
    __name(this, "JwtHeaderInvalid");
  }
  constructor(header) {
    super(`jwt header is invalid: ${JSON.stringify(header)}`);
    this.name = "JwtHeaderInvalid";
  }
};
var JwtHeaderRequiresKid = class extends Error {
  static {
    __name(this, "JwtHeaderRequiresKid");
  }
  constructor(header) {
    super(`required "kid" in jwt header: ${JSON.stringify(header)}`);
    this.name = "JwtHeaderRequiresKid";
  }
};
var JwtSymmetricAlgorithmNotAllowed = class extends Error {
  static {
    __name(this, "JwtSymmetricAlgorithmNotAllowed");
  }
  constructor(alg) {
    super(`symmetric algorithm "${alg}" is not allowed for JWK verification`);
    this.name = "JwtSymmetricAlgorithmNotAllowed";
  }
};
var JwtAlgorithmNotAllowed = class extends Error {
  static {
    __name(this, "JwtAlgorithmNotAllowed");
  }
  constructor(alg, allowedAlgorithms) {
    super(`algorithm "${alg}" is not in the allowed list: [${allowedAlgorithms.join(", ")}]`);
    this.name = "JwtAlgorithmNotAllowed";
  }
};
var JwtTokenSignatureMismatched = class extends Error {
  static {
    __name(this, "JwtTokenSignatureMismatched");
  }
  constructor(token) {
    super(`token(${token}) signature mismatched`);
    this.name = "JwtTokenSignatureMismatched";
  }
};
var JwtPayloadRequiresAud = class extends Error {
  static {
    __name(this, "JwtPayloadRequiresAud");
  }
  constructor(payload) {
    super(`required "aud" in jwt payload: ${JSON.stringify(payload)}`);
    this.name = "JwtPayloadRequiresAud";
  }
};
var JwtTokenAudience = class extends Error {
  static {
    __name(this, "JwtTokenAudience");
  }
  constructor(expected, aud) {
    super(
      `expected audience "${Array.isArray(expected) ? expected.join(", ") : expected}", got "${aud}"`
    );
    this.name = "JwtTokenAudience";
  }
};
var CryptoKeyUsage = /* @__PURE__ */ ((CryptoKeyUsage2) => {
  CryptoKeyUsage2["Encrypt"] = "encrypt";
  CryptoKeyUsage2["Decrypt"] = "decrypt";
  CryptoKeyUsage2["Sign"] = "sign";
  CryptoKeyUsage2["Verify"] = "verify";
  CryptoKeyUsage2["DeriveKey"] = "deriveKey";
  CryptoKeyUsage2["DeriveBits"] = "deriveBits";
  CryptoKeyUsage2["WrapKey"] = "wrapKey";
  CryptoKeyUsage2["UnwrapKey"] = "unwrapKey";
  return CryptoKeyUsage2;
})(CryptoKeyUsage || {});

// ../node_modules/hono/dist/utils/jwt/utf8.js
var utf8Encoder = new TextEncoder();
var utf8Decoder = new TextDecoder();

// ../node_modules/hono/dist/utils/jwt/jws.js
async function signing(privateKey, alg, data) {
  const algorithm2 = getKeyAlgorithm(alg);
  const cryptoKey = await importPrivateKey(privateKey, algorithm2);
  return await crypto.subtle.sign(algorithm2, cryptoKey, data);
}
__name(signing, "signing");
async function verifying(publicKey, alg, signature, data) {
  const algorithm2 = getKeyAlgorithm(alg);
  const cryptoKey = await importPublicKey(publicKey, algorithm2);
  return await crypto.subtle.verify(algorithm2, cryptoKey, signature, data);
}
__name(verifying, "verifying");
function pemToBinary(pem) {
  return decodeBase64(pem.replace(/-+(BEGIN|END).*?-+/g, "").replace(/\s/g, ""));
}
__name(pemToBinary, "pemToBinary");
async function importPrivateKey(key, alg) {
  if (!crypto.subtle || !crypto.subtle.importKey) {
    throw new Error("`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.");
  }
  if (isCryptoKey(key)) {
    if (key.type !== "private" && key.type !== "secret") {
      throw new Error(
        `unexpected key type: CryptoKey.type is ${key.type}, expected private or secret`
      );
    }
    return key;
  }
  const usages = [CryptoKeyUsage.Sign];
  if (typeof key === "object") {
    return await crypto.subtle.importKey("jwk", key, alg, false, usages);
  }
  if (key.includes("PRIVATE")) {
    return await crypto.subtle.importKey("pkcs8", pemToBinary(key), alg, false, usages);
  }
  return await crypto.subtle.importKey("raw", utf8Encoder.encode(key), alg, false, usages);
}
__name(importPrivateKey, "importPrivateKey");
async function importPublicKey(key, alg) {
  if (!crypto.subtle || !crypto.subtle.importKey) {
    throw new Error("`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.");
  }
  if (isCryptoKey(key)) {
    if (key.type === "public" || key.type === "secret") {
      return key;
    }
    key = await exportPublicJwkFrom(key);
  }
  if (typeof key === "string" && key.includes("PRIVATE")) {
    const privateKey = await crypto.subtle.importKey("pkcs8", pemToBinary(key), alg, true, [
      CryptoKeyUsage.Sign
    ]);
    key = await exportPublicJwkFrom(privateKey);
  }
  const usages = [CryptoKeyUsage.Verify];
  if (typeof key === "object") {
    return await crypto.subtle.importKey("jwk", key, alg, false, usages);
  }
  if (key.includes("PUBLIC")) {
    return await crypto.subtle.importKey("spki", pemToBinary(key), alg, false, usages);
  }
  return await crypto.subtle.importKey("raw", utf8Encoder.encode(key), alg, false, usages);
}
__name(importPublicKey, "importPublicKey");
async function exportPublicJwkFrom(privateKey) {
  if (privateKey.type !== "private") {
    throw new Error(`unexpected key type: ${privateKey.type}`);
  }
  if (!privateKey.extractable) {
    throw new Error("unexpected private key is unextractable");
  }
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
  const { kty } = jwk;
  const { alg, e, n } = jwk;
  const { crv, x, y } = jwk;
  return { kty, alg, e, n, crv, x, y, key_ops: [CryptoKeyUsage.Verify] };
}
__name(exportPublicJwkFrom, "exportPublicJwkFrom");
function getKeyAlgorithm(name) {
  switch (name) {
    case "HS256":
      return {
        name: "HMAC",
        hash: {
          name: "SHA-256"
        }
      };
    case "HS384":
      return {
        name: "HMAC",
        hash: {
          name: "SHA-384"
        }
      };
    case "HS512":
      return {
        name: "HMAC",
        hash: {
          name: "SHA-512"
        }
      };
    case "RS256":
      return {
        name: "RSASSA-PKCS1-v1_5",
        hash: {
          name: "SHA-256"
        }
      };
    case "RS384":
      return {
        name: "RSASSA-PKCS1-v1_5",
        hash: {
          name: "SHA-384"
        }
      };
    case "RS512":
      return {
        name: "RSASSA-PKCS1-v1_5",
        hash: {
          name: "SHA-512"
        }
      };
    case "PS256":
      return {
        name: "RSA-PSS",
        hash: {
          name: "SHA-256"
        },
        saltLength: 32
        // 256 >> 3
      };
    case "PS384":
      return {
        name: "RSA-PSS",
        hash: {
          name: "SHA-384"
        },
        saltLength: 48
        // 384 >> 3
      };
    case "PS512":
      return {
        name: "RSA-PSS",
        hash: {
          name: "SHA-512"
        },
        saltLength: 64
        // 512 >> 3,
      };
    case "ES256":
      return {
        name: "ECDSA",
        hash: {
          name: "SHA-256"
        },
        namedCurve: "P-256"
      };
    case "ES384":
      return {
        name: "ECDSA",
        hash: {
          name: "SHA-384"
        },
        namedCurve: "P-384"
      };
    case "ES512":
      return {
        name: "ECDSA",
        hash: {
          name: "SHA-512"
        },
        namedCurve: "P-521"
      };
    case "EdDSA":
      return {
        name: "Ed25519",
        namedCurve: "Ed25519"
      };
    default:
      throw new JwtAlgorithmNotImplemented(name);
  }
}
__name(getKeyAlgorithm, "getKeyAlgorithm");
function isCryptoKey(key) {
  const runtime = getRuntimeKey();
  if (runtime === "node" && !!crypto.webcrypto) {
    return key instanceof crypto.webcrypto.CryptoKey;
  }
  return key instanceof CryptoKey;
}
__name(isCryptoKey, "isCryptoKey");

// ../node_modules/hono/dist/utils/jwt/jwt.js
var encodeJwtPart = /* @__PURE__ */ __name((part) => encodeBase64Url(utf8Encoder.encode(JSON.stringify(part)).buffer).replace(/=/g, ""), "encodeJwtPart");
var encodeSignaturePart = /* @__PURE__ */ __name((buf) => encodeBase64Url(buf).replace(/=/g, ""), "encodeSignaturePart");
var decodeJwtPart = /* @__PURE__ */ __name((part) => JSON.parse(utf8Decoder.decode(decodeBase64Url(part))), "decodeJwtPart");
function isTokenHeader(obj) {
  if (typeof obj === "object" && obj !== null) {
    const objWithAlg = obj;
    return "alg" in objWithAlg && Object.values(AlgorithmTypes).includes(objWithAlg.alg) && (!("typ" in objWithAlg) || objWithAlg.typ === "JWT");
  }
  return false;
}
__name(isTokenHeader, "isTokenHeader");
var sign = /* @__PURE__ */ __name(async (payload, privateKey, alg = "HS256") => {
  const encodedPayload = encodeJwtPart(payload);
  let encodedHeader;
  if (typeof privateKey === "object" && "alg" in privateKey) {
    alg = privateKey.alg;
    encodedHeader = encodeJwtPart({ alg, typ: "JWT", kid: privateKey.kid });
  } else {
    encodedHeader = encodeJwtPart({ alg, typ: "JWT" });
  }
  const partialToken = `${encodedHeader}.${encodedPayload}`;
  const signaturePart = await signing(privateKey, alg, utf8Encoder.encode(partialToken));
  const signature = encodeSignaturePart(signaturePart);
  return `${partialToken}.${signature}`;
}, "sign");
var verify = /* @__PURE__ */ __name(async (token, publicKey, algOrOptions) => {
  if (!algOrOptions) {
    throw new JwtAlgorithmRequired();
  }
  const {
    alg,
    iss,
    nbf = true,
    exp = true,
    iat = true,
    aud
  } = typeof algOrOptions === "string" ? { alg: algOrOptions } : algOrOptions;
  if (!alg) {
    throw new JwtAlgorithmRequired();
  }
  const tokenParts = token.split(".");
  if (tokenParts.length !== 3) {
    throw new JwtTokenInvalid(token);
  }
  const { header, payload } = decode(token);
  if (!isTokenHeader(header)) {
    throw new JwtHeaderInvalid(header);
  }
  if (header.alg !== alg) {
    throw new JwtAlgorithmMismatch(alg, header.alg);
  }
  const now = Math.floor(Date.now() / 1e3);
  if (nbf && payload.nbf !== void 0) {
    if (typeof payload.nbf !== "number" || !Number.isFinite(payload.nbf) || payload.nbf > now) {
      throw new JwtTokenNotBefore(token);
    }
  }
  if (exp && payload.exp !== void 0) {
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp) || payload.exp <= now) {
      throw new JwtTokenExpired(token);
    }
  }
  if (iat && payload.iat !== void 0) {
    if (typeof payload.iat !== "number" || !Number.isFinite(payload.iat) || now < payload.iat) {
      throw new JwtTokenIssuedAt(now, payload.iat);
    }
  }
  if (iss) {
    if (!payload.iss) {
      throw new JwtTokenIssuer(iss, null);
    }
    if (typeof iss === "string" && payload.iss !== iss) {
      throw new JwtTokenIssuer(iss, payload.iss);
    }
    if (iss instanceof RegExp && !iss.test(payload.iss)) {
      throw new JwtTokenIssuer(iss, payload.iss);
    }
  }
  if (aud) {
    if (!payload.aud) {
      throw new JwtPayloadRequiresAud(payload);
    }
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    const matched = audiences.some(
      (payloadAud) => aud instanceof RegExp ? aud.test(payloadAud) : typeof aud === "string" ? payloadAud === aud : Array.isArray(aud) && aud.includes(payloadAud)
    );
    if (!matched) {
      throw new JwtTokenAudience(aud, payload.aud);
    }
  }
  const headerPayload = token.substring(0, token.lastIndexOf("."));
  const verified = await verifying(
    publicKey,
    alg,
    decodeBase64Url(tokenParts[2]),
    utf8Encoder.encode(headerPayload)
  );
  if (!verified) {
    throw new JwtTokenSignatureMismatched(token);
  }
  return payload;
}, "verify");
var symmetricAlgorithms = [
  AlgorithmTypes.HS256,
  AlgorithmTypes.HS384,
  AlgorithmTypes.HS512
];
var verifyWithJwks = /* @__PURE__ */ __name(async (token, options, init) => {
  const verifyOpts = options.verification || {};
  const header = decodeHeader(token);
  if (!isTokenHeader(header)) {
    throw new JwtHeaderInvalid(header);
  }
  if (!header.kid) {
    throw new JwtHeaderRequiresKid(header);
  }
  if (symmetricAlgorithms.includes(header.alg)) {
    throw new JwtSymmetricAlgorithmNotAllowed(header.alg);
  }
  if (!options.allowedAlgorithms.includes(header.alg)) {
    throw new JwtAlgorithmNotAllowed(header.alg, options.allowedAlgorithms);
  }
  let verifyKeys = options.keys ? [...options.keys] : void 0;
  if (options.jwks_uri) {
    const response = await fetch(options.jwks_uri, init);
    if (!response.ok) {
      throw new Error(`failed to fetch JWKS from ${options.jwks_uri}`);
    }
    const data = await response.json();
    if (!data.keys) {
      throw new Error('invalid JWKS response. "keys" field is missing');
    }
    if (!Array.isArray(data.keys)) {
      throw new Error('invalid JWKS response. "keys" field is not an array');
    }
    verifyKeys ??= [];
    verifyKeys.push(...data.keys);
  } else if (!verifyKeys) {
    throw new Error('verifyWithJwks requires options for either "keys" or "jwks_uri" or both');
  }
  const matchingKey = verifyKeys.find((key) => key.kid === header.kid);
  if (!matchingKey) {
    throw new JwtTokenInvalid(token);
  }
  if (matchingKey.alg && matchingKey.alg !== header.alg) {
    throw new JwtAlgorithmMismatch(matchingKey.alg, header.alg);
  }
  return await verify(token, matchingKey, {
    alg: header.alg,
    ...verifyOpts
  });
}, "verifyWithJwks");
var decode = /* @__PURE__ */ __name((token) => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new JwtTokenInvalid(token);
  }
  try {
    const header = decodeJwtPart(parts[0]);
    const payload = decodeJwtPart(parts[1]);
    return {
      header,
      payload
    };
  } catch {
    throw new JwtTokenInvalid(token);
  }
}, "decode");
var decodeHeader = /* @__PURE__ */ __name((token) => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new JwtTokenInvalid(token);
  }
  try {
    return decodeJwtPart(parts[0]);
  } catch {
    throw new JwtTokenInvalid(token);
  }
}, "decodeHeader");

// ../node_modules/hono/dist/utils/jwt/index.js
var Jwt = { sign, verify, decode, verifyWithJwks };

// ../node_modules/hono/dist/middleware/jwt/jwt.js
var jwt = /* @__PURE__ */ __name((options) => {
  const verifyOpts = options.verification || {};
  if (!options || !options.secret) {
    throw new Error('JWT auth middleware requires options for "secret"');
  }
  if (!options.alg) {
    throw new Error('JWT auth middleware requires options for "alg"');
  }
  if (!crypto.subtle || !crypto.subtle.importKey) {
    throw new Error("`crypto.subtle.importKey` is undefined. JWT auth middleware requires it.");
  }
  return /* @__PURE__ */ __name(async function jwt2(ctx, next) {
    const headerName = options.headerName || "Authorization";
    const credentials = ctx.req.raw.headers.get(headerName);
    let token;
    if (credentials) {
      const parts = credentials.split(/\s+/);
      if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
        const errDescription = "invalid credentials structure";
        throw new HTTPException(401, {
          message: errDescription,
          res: unauthorizedResponse({
            ctx,
            error: "invalid_request",
            errDescription
          })
        });
      } else {
        token = parts[1];
      }
    } else if (options.cookie) {
      if (typeof options.cookie == "string") {
        token = getCookie(ctx, options.cookie);
      } else if (options.cookie.secret) {
        if (options.cookie.prefixOptions) {
          token = await getSignedCookie(
            ctx,
            options.cookie.secret,
            options.cookie.key,
            options.cookie.prefixOptions
          );
        } else {
          token = await getSignedCookie(ctx, options.cookie.secret, options.cookie.key);
        }
      } else {
        if (options.cookie.prefixOptions) {
          token = getCookie(ctx, options.cookie.key, options.cookie.prefixOptions);
        } else {
          token = getCookie(ctx, options.cookie.key);
        }
      }
    }
    if (!token) {
      const errDescription = "no authorization included in request";
      throw new HTTPException(401, {
        message: errDescription,
        res: unauthorizedResponse({
          ctx,
          error: "invalid_request",
          errDescription
        })
      });
    }
    let payload;
    let cause;
    try {
      payload = await Jwt.verify(token, options.secret, {
        alg: options.alg,
        ...verifyOpts
      });
    } catch (e) {
      cause = e;
    }
    if (!payload) {
      throw new HTTPException(401, {
        message: "Unauthorized",
        res: unauthorizedResponse({
          ctx,
          error: "invalid_token",
          statusText: "Unauthorized",
          errDescription: "token verification failure"
        }),
        cause
      });
    }
    ctx.set("jwtPayload", payload);
    await next();
  }, "jwt2");
}, "jwt");
function unauthorizedResponse(opts) {
  return new Response("Unauthorized", {
    status: 401,
    statusText: opts.statusText,
    headers: {
      "WWW-Authenticate": `Bearer realm="${opts.ctx.req.url}",error="${opts.error}",error_description="${opts.errDescription}"`
    }
  });
}
__name(unauthorizedResponse, "unauthorizedResponse");
var verifyWithJwks2 = Jwt.verifyWithJwks;
var verify2 = Jwt.verify;
var decode2 = Jwt.decode;
var sign2 = Jwt.sign;

// ../node_modules/hono/dist/adapter/cloudflare-pages/handler.js
var handle = /* @__PURE__ */ __name((app2) => (eventContext) => {
  return app2.fetch(
    eventContext.request,
    { ...eventContext.env, eventContext },
    {
      waitUntil: eventContext.waitUntil,
      passThroughOnException: eventContext.passThroughOnException,
      props: {}
    }
  );
}, "handle");

// api/[[route]].ts
var app = new Hono2();
app.use("*", cors());
async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  let salt;
  if (saltHex) {
    salt = new Uint8Array(saltHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
  } else {
    salt = crypto.getRandomValues(new Uint8Array(16));
  }
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 1e5, hash: "SHA-256" },
    keyMaterial,
    256
  );
  const hashHex = Array.from(new Uint8Array(derivedBits)).map((b) => b.toString(16).padStart(2, "0")).join("");
  const currentSaltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${currentSaltHex}:${hashHex}`;
}
__name(hashPassword, "hashPassword");
function requireSuperAdmin(c) {
  const p = c.get("jwtPayload");
  if (p.role !== "superadmin") return c.json({ error: "Unauthorized \u2013 superadmin only" }, 403);
  return null;
}
__name(requireSuperAdmin, "requireSuperAdmin");
app.get("/health", (c) => c.json({ status: "ok", version: "2.0" }));
app.post("/api/login", async (c) => {
  const { username, password } = await c.req.json();
  if (!username || !password) return c.json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" }, 400);
  const userRecord = await c.env.DB.prepare(
    "SELECT id, tenant_id, name, role, max_discount_percent, password FROM users WHERE username = ? AND active = 1"
  ).bind(username).first();
  if (!userRecord) return c.json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629 \u0623\u0648 \u0627\u0644\u062D\u0633\u0627\u0628 \u063A\u064A\u0631 \u0646\u0634\u0637" }, 401);
  const [storedSalt] = (userRecord.password || "").split(":");
  if (!storedSalt) return c.json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" }, 401);
  const hashedAttempt = await hashPassword(password, storedSalt);
  if (hashedAttempt !== userRecord.password) return c.json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" }, 401);
  const user = userRecord;
  if (user.tenant_id) {
    const tenant = await c.env.DB.prepare("SELECT status FROM tenants WHERE id = ?").bind(user.tenant_id).first();
    if (!tenant || tenant.status !== "active")
      return c.json({ error: "\u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u062A\u062C\u0631 \u0645\u0648\u0642\u0648\u0641. \u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0625\u062F\u0627\u0631\u0629." }, 403);
    const sub = await c.env.DB.prepare(
      "SELECT end_date FROM subscriptions WHERE tenant_id = ? ORDER BY end_date DESC LIMIT 1"
    ).bind(user.tenant_id).first();
    if (!sub || new Date(sub.end_date) < /* @__PURE__ */ new Date())
      return c.json({ error: "\u0627\u0646\u062A\u0647\u0649 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643. \u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0644\u0644\u062A\u062C\u062F\u064A\u062F." }, 403);
  }
  if (!c.env.JWT_SECRET) return c.json({ error: "\u062E\u0637\u0623 \u0641\u064A \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062E\u0627\u062F\u0645: JWT_SECRET \u063A\u064A\u0631 \u0645\u064F\u0639\u064A\u064E\u0651\u0646" }, 500);
  const token = await sign2({
    userId: user.id,
    tenantId: user.tenant_id,
    role: user.role,
    maxDiscount: user.max_discount_percent,
    exp: Math.floor(Date.now() / 1e3) + 60 * 60 * 24 * 7
  }, c.env.JWT_SECRET);
  return c.json({ token, user: { id: user.id, name: user.name, role: user.role, tenantId: user.tenant_id, maxDiscount: user.max_discount_percent } });
});
app.use("/api/protected/*", async (c, next) => {
  if (!c.env.JWT_SECRET) return c.json({ error: "Server configuration error" }, 500);
  return jwt({ secret: c.env.JWT_SECRET, alg: "HS256" })(c, next);
});
app.get("/api/protected/auth/me", async (c) => {
  const p = c.get("jwtPayload");
  const user = await c.env.DB.prepare("SELECT id, tenant_id as tenantId, name, role, max_discount_percent as maxDiscount FROM users WHERE id = ? AND active = 1").bind(p.userId).first();
  if (!user) return c.json({ error: "User not found" }, 404);
  return c.json(user);
});
app.get("/api/protected/admin/dashboard", async (c) => {
  const deny = requireSuperAdmin(c);
  if (deny) return deny;
  const [total, active, suspended, users, expiredCount, planDist, monthlyGrowth, expiringSoon, recentTenants] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) as n FROM tenants").first(),
    c.env.DB.prepare("SELECT COUNT(*) as n FROM tenants WHERE status = 'active'").first(),
    c.env.DB.prepare("SELECT COUNT(*) as n FROM tenants WHERE status = 'suspended'").first(),
    c.env.DB.prepare("SELECT COUNT(*) as n FROM users WHERE tenant_id IS NOT NULL").first(),
    c.env.DB.prepare("SELECT COUNT(*) as n FROM tenants t JOIN subscriptions s ON s.tenant_id = t.id WHERE s.end_date < datetime('now') AND t.status = 'active'").first(),
    c.env.DB.prepare("SELECT s.plan_name, COUNT(*) as count FROM subscriptions s JOIN tenants t ON t.id = s.tenant_id WHERE t.status = 'active' GROUP BY s.plan_name").all(),
    c.env.DB.prepare("SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count FROM tenants WHERE created_at >= datetime('now','-6 months') GROUP BY month ORDER BY month ASC").all(),
    c.env.DB.prepare("SELECT t.id, t.store_name, t.owner_name, s.plan_name, s.end_date FROM tenants t JOIN subscriptions s ON s.tenant_id = t.id WHERE s.end_date BETWEEN datetime('now') AND datetime('now','+14 days') AND t.status = 'active' ORDER BY s.end_date ASC LIMIT 10").all(),
    c.env.DB.prepare("SELECT t.id, t.store_name, t.owner_name, t.email, t.status, t.created_at, s.plan_name, s.end_date FROM tenants t LEFT JOIN subscriptions s ON s.tenant_id = t.id ORDER BY t.created_at DESC LIMIT 8").all()
  ]);
  return c.json({
    stats: {
      totalTenants: total?.n || 0,
      activeTenants: active?.n || 0,
      suspendedTenants: suspended?.n || 0,
      totalUsers: users?.n || 0,
      expiredSubscriptions: expiredCount?.n || 0
    },
    planDistribution: planDist.results || [],
    monthlyGrowth: monthlyGrowth.results || [],
    expiringSoon: expiringSoon.results || [],
    recentTenants: recentTenants.results || []
  });
});
app.get("/api/protected/admin/plans", async (c) => {
  const deny = requireSuperAdmin(c);
  if (deny) return deny;
  const plans = await c.env.DB.prepare(`
    SELECT p.*, 
           (SELECT COUNT(*) FROM subscriptions s JOIN tenants t ON t.id = s.tenant_id WHERE s.plan_name = p.name AND t.status = 'active') as subscriber_count
    FROM plans p ORDER BY p.sort_order ASC, p.price_monthly ASC
  `).all();
  return c.json(plans.results || []);
});
app.post("/api/protected/admin/plans", async (c) => {
  const deny = requireSuperAdmin(c);
  if (deny) return deny;
  const b = await c.req.json();
  if (!b.name) return c.json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0628\u0627\u0642\u0629 \u0645\u0637\u0644\u0648\u0628" }, 400);
  const id = `plan-${crypto.randomUUID()}`;
  await c.env.DB.prepare(
    "INSERT INTO plans (id, name, description, price_monthly, max_employees, max_cashiers, max_products, max_sales_per_month, features, color, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(id, b.name, b.description || "", b.price_monthly || 0, b.max_employees || 5, b.max_cashiers || 2, b.max_products || 500, b.max_sales_per_month || 1e3, JSON.stringify(b.features || []), b.color || "#3B82F6", b.sort_order || 0).run();
  return c.json({ success: true, id });
});
app.put("/api/protected/admin/plans/:id", async (c) => {
  const deny = requireSuperAdmin(c);
  if (deny) return deny;
  const b = await c.req.json();
  await c.env.DB.prepare(
    "UPDATE plans SET name=?, description=?, price_monthly=?, max_employees=?, max_cashiers=?, max_products=?, max_sales_per_month=?, features=?, color=?, sort_order=?, is_active=? WHERE id=?"
  ).bind(b.name, b.description || "", b.price_monthly || 0, b.max_employees || 5, b.max_cashiers || 2, b.max_products || 500, b.max_sales_per_month || 1e3, JSON.stringify(b.features || []), b.color || "#3B82F6", b.sort_order || 0, b.is_active !== void 0 ? b.is_active ? 1 : 0 : 1, c.req.param("id")).run();
  return c.json({ success: true });
});
app.delete("/api/protected/admin/plans/:id", async (c) => {
  const deny = requireSuperAdmin(c);
  if (deny) return deny;
  await c.env.DB.prepare("DELETE FROM plans WHERE id = ?").bind(c.req.param("id")).run();
  return c.json({ success: true });
});
app.get("/api/protected/admin/tenants", async (c) => {
  const deny = requireSuperAdmin(c);
  if (deny) return deny;
  const search = c.req.query("search") || "";
  const status = c.req.query("status") || "";
  const plan = c.req.query("plan") || "";
  const expiry = c.req.query("expiry") || "";
  let conds = [];
  if (status) conds.push(`t.status = '${status}'`);
  if (plan) conds.push(`s.plan_name = '${plan}'`);
  if (search) conds.push(`(t.store_name LIKE '%${search}%' OR t.owner_name LIKE '%${search}%' OR t.email LIKE '%${search}%')`);
  if (expiry === "expiring7") conds.push(`s.end_date BETWEEN datetime('now') AND datetime('now','+7 days')`);
  else if (expiry === "expiring30") conds.push(`s.end_date BETWEEN datetime('now') AND datetime('now','+30 days')`);
  else if (expiry === "expired") conds.push(`s.end_date < datetime('now')`);
  const where = conds.length ? "WHERE " + conds.join(" AND ") : "";
  const tenants = await c.env.DB.prepare(`
    SELECT t.*,
           u.username as admin_username,
           s.plan_name, s.end_date, s.start_date as sub_start,
           s.max_employees, s.max_cashiers, s.max_products, s.max_sales_per_month,
           (SELECT COUNT(*) FROM users WHERE tenant_id = t.id AND role != 'admin') as cashier_count,
           (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as user_count,
           (SELECT COUNT(*) FROM products WHERE tenant_id = t.id AND active = 1) as product_count,
           (SELECT COUNT(*) FROM employees WHERE tenant_id = t.id AND active = 1) as employee_count,
           (SELECT COUNT(*) FROM sales WHERE tenant_id = t.id) as sales_count,
           (SELECT COALESCE(SUM(total),0) FROM sales WHERE tenant_id = t.id AND status != 'refunded') as total_revenue
    FROM tenants t
    LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'admin'
    LEFT JOIN subscriptions s ON s.tenant_id = t.id
    ${where}
    ORDER BY t.created_at DESC
  `).all();
  return c.json(tenants.results || []);
});
app.post("/api/protected/admin/tenants", async (c) => {
  const deny = requireSuperAdmin(c);
  if (deny) return deny;
  const b = await c.req.json();
  const { store_name, owner_name, email, admin_username, admin_password, plan_name, months, max_employees, max_cashiers, max_products, max_sales_per_month } = b;
  if (!store_name || !owner_name || !admin_username || !admin_password)
    return c.json({ error: "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0645\u0637\u0644\u0648\u0628\u0629" }, 400);
  const tenantId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const subId = crypto.randomUUID();
  const settingsId = crypto.randomUUID();
  const hashedPass = await hashPassword(admin_password);
  const endDate = /* @__PURE__ */ new Date();
  endDate.setMonth(endDate.getMonth() + parseInt(months || "1"));
  let limits = { max_employees: max_employees || 5, max_cashiers: max_cashiers || 2, max_products: max_products || 500, max_sales_per_month: max_sales_per_month || 1e3 };
  if (plan_name) {
    const plan = await c.env.DB.prepare("SELECT * FROM plans WHERE name = ? AND is_active = 1").bind(plan_name).first();
    if (plan) limits = { max_employees: plan.max_employees, max_cashiers: plan.max_cashiers, max_products: plan.max_products, max_sales_per_month: plan.max_sales_per_month };
  }
  try {
    await c.env.DB.batch([
      c.env.DB.prepare("INSERT INTO tenants (id, store_name, owner_name, email) VALUES (?, ?, ?, ?)").bind(tenantId, store_name, owner_name, email || ""),
      c.env.DB.prepare("INSERT INTO users (id, tenant_id, name, username, password, role) VALUES (?, ?, ?, ?, ?, ?)").bind(userId, tenantId, owner_name, admin_username, hashedPass, "admin"),
      c.env.DB.prepare("INSERT INTO subscriptions (id, tenant_id, plan_name, start_date, end_date, max_employees, max_cashiers, max_products, max_sales_per_month) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(subId, tenantId, plan_name || "Basic", (/* @__PURE__ */ new Date()).toISOString(), endDate.toISOString(), limits.max_employees, limits.max_cashiers, limits.max_products, limits.max_sales_per_month),
      c.env.DB.prepare("INSERT INTO settings (id, tenant_id, store_name) VALUES (?, ?, ?)").bind(settingsId, tenantId, store_name)
    ]);
    return c.json({ success: true, tenant_id: tenantId, admin_username });
  } catch (e) {
    return c.json({ error: "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u062A\u062C\u0631", details: e.message }, 500);
  }
});
app.put("/api/protected/admin/tenants/:id", async (c) => {
  const deny = requireSuperAdmin(c);
  if (deny) return deny;
  const { store_name, owner_name, email } = await c.req.json();
  await c.env.DB.prepare("UPDATE tenants SET store_name=?, owner_name=?, email=? WHERE id=?").bind(store_name, owner_name, email || "", c.req.param("id")).run();
  return c.json({ success: true });
});
app.put("/api/protected/admin/tenants/:id/status", async (c) => {
  const deny = requireSuperAdmin(c);
  if (deny) return deny;
  const { status } = await c.req.json();
  if (!["active", "suspended"].includes(status)) return c.json({ error: "Invalid status" }, 400);
  await c.env.DB.prepare("UPDATE tenants SET status = ? WHERE id = ?").bind(status, c.req.param("id")).run();
  return c.json({ success: true });
});
app.delete("/api/protected/admin/tenants/:id", async (c) => {
  const deny = requireSuperAdmin(c);
  if (deny) return deny;
  await c.env.DB.prepare("DELETE FROM tenants WHERE id = ?").bind(c.req.param("id")).run();
  return c.json({ success: true });
});
app.get("/api/protected/admin/tenants/:id/stats", async (c) => {
  const deny = requireSuperAdmin(c);
  if (deny) return deny;
  const id = c.req.param("id");
  const [tenant, sub, users, products, employees, salesStats, recentSales, monthlySales] = await Promise.all([
    c.env.DB.prepare("SELECT * FROM tenants WHERE id = ?").bind(id).first(),
    c.env.DB.prepare("SELECT * FROM subscriptions WHERE tenant_id = ? ORDER BY end_date DESC LIMIT 1").bind(id).first(),
    c.env.DB.prepare("SELECT id, name, username, role, active, created_at FROM users WHERE tenant_id = ? ORDER BY role ASC, name ASC").bind(id).all(),
    c.env.DB.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN active=1 THEN 1 ELSE 0 END) as active FROM products WHERE tenant_id = ?").bind(id).first(),
    c.env.DB.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN active=1 THEN 1 ELSE 0 END) as active FROM employees WHERE tenant_id = ?").bind(id).first(),
    c.env.DB.prepare("SELECT COUNT(*) as count, COALESCE(SUM(total),0) as revenue FROM sales WHERE tenant_id = ? AND status != 'refunded'").bind(id).first(),
    c.env.DB.prepare("SELECT invoice_number, total, payment_method, status, created_at FROM sales WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 10").bind(id).all(),
    c.env.DB.prepare("SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count, COALESCE(SUM(total),0) as revenue FROM sales WHERE tenant_id = ? AND created_at >= datetime('now','-6 months') GROUP BY month ORDER BY month ASC").bind(id).all()
  ]);
  return c.json({ tenant, subscription: sub, users: users.results || [], products, employees, sales: salesStats, recentSales: recentSales.results || [], monthlySales: monthlySales.results || [] });
});
app.post("/api/protected/admin/tenants/:id/renew", async (c) => {
  const deny = requireSuperAdmin(c);
  if (deny) return deny;
  const b = await c.req.json();
  const { months, plan_name, max_employees, max_cashiers, max_products, max_sales_per_month, notes } = b;
  if (!months || parseInt(months) < 1) return c.json({ error: "\u0639\u062F\u062F \u0627\u0644\u0623\u0634\u0647\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D" }, 400);
  const sub = await c.env.DB.prepare("SELECT * FROM subscriptions WHERE tenant_id = ? ORDER BY end_date DESC LIMIT 1").bind(c.req.param("id")).first();
  const base = sub && new Date(sub.end_date) > /* @__PURE__ */ new Date() ? new Date(sub.end_date) : /* @__PURE__ */ new Date();
  base.setMonth(base.getMonth() + parseInt(months));
  let limits = { max_employees: max_employees || sub?.max_employees || 5, max_cashiers: max_cashiers || sub?.max_cashiers || 2, max_products: max_products || sub?.max_products || 500, max_sales_per_month: max_sales_per_month || sub?.max_sales_per_month || 1e3 };
  const resolvedPlan = plan_name || sub?.plan_name || "Basic";
  if (plan_name) {
    const plan = await c.env.DB.prepare("SELECT * FROM plans WHERE name = ?").bind(plan_name).first();
    if (plan && !max_employees) limits = { max_employees: plan.max_employees, max_cashiers: plan.max_cashiers, max_products: plan.max_products, max_sales_per_month: plan.max_sales_per_month };
  }
  if (sub) {
    await c.env.DB.prepare("UPDATE subscriptions SET end_date=?, plan_name=?, max_employees=?, max_cashiers=?, max_products=?, max_sales_per_month=?, notes=? WHERE id=?").bind(base.toISOString(), resolvedPlan, limits.max_employees, limits.max_cashiers, limits.max_products, limits.max_sales_per_month, notes || "", sub.id).run();
  } else {
    await c.env.DB.prepare("INSERT INTO subscriptions (id, tenant_id, plan_name, start_date, end_date, max_employees, max_cashiers, max_products, max_sales_per_month, notes) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), c.req.param("id"), resolvedPlan, (/* @__PURE__ */ new Date()).toISOString(), base.toISOString(), limits.max_employees, limits.max_cashiers, limits.max_products, limits.max_sales_per_month, notes || "").run();
  }
  return c.json({ success: true, new_end_date: base.toISOString(), plan: resolvedPlan });
});
app.get("/api/protected/settings", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({ store_name: "Super Admin", currency: "\u062C.\u0645" });
  const s = await c.env.DB.prepare("SELECT * FROM settings WHERE tenant_id = ?").bind(p.tenantId).first();
  return c.json(s || {});
});
app.put("/api/protected/settings", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({ error: "No tenant" }, 403);
  const b = await c.req.json();
  await c.env.DB.prepare(
    "UPDATE settings SET store_name=?, store_phone=?, store_address=?, currency=?, tax_rate=?, receipt_footer=?, thermal_width=?, updated_at=datetime('now') WHERE tenant_id=?"
  ).bind(b.store_name || "", b.store_phone || "", b.store_address || "", b.currency || "\u062C.\u0645", b.tax_rate || 0, b.receipt_footer || "", b.thermal_width || 80, p.tenantId).run();
  return c.json({ success: true });
});
app.get("/api/protected/users", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json([], 200);
  const users = await c.env.DB.prepare("SELECT id, name, username, role, active, max_discount_percent, created_at FROM users WHERE tenant_id = ? ORDER BY role ASC, name ASC").bind(p.tenantId).all();
  return c.json(users.results || []);
});
app.post("/api/protected/users", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId || p.role !== "admin") return c.json({ error: "Unauthorized" }, 403);
  const b = await c.req.json();
  if (!b.name || !b.username || !b.password) return c.json({ error: "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0637\u0644\u0648\u0628\u0629" }, 400);
  if (b.role === "superadmin") return c.json({ error: "Unauthorized role" }, 403);
  const id = crypto.randomUUID();
  const hashedPass = await hashPassword(b.password);
  try {
    await c.env.DB.prepare("INSERT INTO users (id, tenant_id, name, username, password, role, active, max_discount_percent) VALUES (?,?,?,?,?,?,?,?)").bind(id, p.tenantId, b.name, b.username, hashedPass, b.role || "cashier", b.active !== void 0 ? b.active : 1, b.max_discount_percent || 0).run();
    return c.json({ success: true, id });
  } catch (e) {
    return c.json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0627\u0644\u0641\u0639\u0644", details: e.message }, 409);
  }
});
app.put("/api/protected/users/:id", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId || p.role !== "admin") return c.json({ error: "Unauthorized" }, 403);
  const b = await c.req.json();
  if (b.role === "superadmin") return c.json({ error: "Unauthorized role" }, 403);
  if (b.password && b.password.trim()) {
    const hashedPass = await hashPassword(b.password);
    await c.env.DB.prepare("UPDATE users SET name=?, username=?, password=?, role=?, active=?, max_discount_percent=? WHERE id=? AND tenant_id=?").bind(b.name, b.username, hashedPass, b.role, b.active, b.max_discount_percent || 0, c.req.param("id"), p.tenantId).run();
  } else {
    await c.env.DB.prepare("UPDATE users SET name=?, username=?, role=?, active=?, max_discount_percent=? WHERE id=? AND tenant_id=?").bind(b.name, b.username, b.role, b.active, b.max_discount_percent || 0, c.req.param("id"), p.tenantId).run();
  }
  return c.json({ success: true });
});
app.delete("/api/protected/users/:id", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId || p.role !== "admin") return c.json({ error: "Unauthorized" }, 403);
  await c.env.DB.prepare("DELETE FROM users WHERE id = ? AND tenant_id = ?").bind(c.req.param("id"), p.tenantId).run();
  return c.json({ success: true });
});
app.get("/api/protected/categories", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json([]);
  const rows = await c.env.DB.prepare("SELECT * FROM categories WHERE tenant_id = ? ORDER BY name ASC").bind(p.tenantId).all();
  return c.json(rows.results || []);
});
app.post("/api/protected/categories", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({ error: "No tenant" }, 403);
  const b = await c.req.json();
  if (!b.name) return c.json({ error: "Name required" }, 400);
  const id = crypto.randomUUID();
  await c.env.DB.prepare("INSERT INTO categories (id, tenant_id, name, description, color) VALUES (?,?,?,?,?)").bind(id, p.tenantId, b.name, b.description || "", b.color || "#3B82F6").run();
  return c.json({ success: true, id });
});
app.put("/api/protected/categories/:id", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({ error: "No tenant" }, 403);
  const b = await c.req.json();
  await c.env.DB.prepare("UPDATE categories SET name=?, description=?, color=? WHERE id=? AND tenant_id=?").bind(b.name, b.description || "", b.color || "#3B82F6", c.req.param("id"), p.tenantId).run();
  return c.json({ success: true });
});
app.delete("/api/protected/categories/:id", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({ error: "No tenant" }, 403);
  await c.env.DB.prepare("DELETE FROM categories WHERE id=? AND tenant_id=?").bind(c.req.param("id"), p.tenantId).run();
  return c.json({ success: true });
});
app.get("/api/protected/products", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json([]);
  const search = c.req.query("search") || "";
  const catId = c.req.query("category_id") || "";
  let q = "SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.tenant_id = ? AND p.active = 1";
  const params = [p.tenantId];
  if (search) {
    q += " AND (p.name LIKE ? OR p.barcode LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (catId) {
    q += " AND p.category_id = ?";
    params.push(catId);
  }
  q += " ORDER BY p.name ASC";
  const rows = await c.env.DB.prepare(q).bind(...params).all();
  return c.json(rows.results || []);
});
app.post("/api/protected/products", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({ error: "No tenant" }, 403);
  const b = await c.req.json();
  if (!b.name) return c.json({ error: "Name required" }, 400);
  const id = crypto.randomUUID();
  await c.env.DB.prepare("INSERT INTO products (id, tenant_id, category_id, name, barcode, description, cost_price, sell_price, stock, min_stock, unit) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(id, p.tenantId, b.category_id || null, b.name, b.barcode || null, b.description || "", b.cost_price || 0, b.sell_price || 0, b.stock || 0, b.min_stock || 0, b.unit || "\u0642\u0637\u0639\u0629").run();
  return c.json({ success: true, id });
});
app.put("/api/protected/products/:id", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({ error: "No tenant" }, 403);
  const b = await c.req.json();
  await c.env.DB.prepare("UPDATE products SET category_id=?, name=?, barcode=?, description=?, cost_price=?, sell_price=?, stock=?, min_stock=?, unit=?, active=?, updated_at=datetime('now') WHERE id=? AND tenant_id=?").bind(b.category_id || null, b.name, b.barcode || null, b.description || "", b.cost_price || 0, b.sell_price || 0, b.stock || 0, b.min_stock || 0, b.unit || "\u0642\u0637\u0639\u0629", b.active !== void 0 ? b.active : 1, c.req.param("id"), p.tenantId).run();
  return c.json({ success: true });
});
app.delete("/api/protected/products/:id", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({ error: "No tenant" }, 403);
  await c.env.DB.prepare("UPDATE products SET active=0 WHERE id=? AND tenant_id=?").bind(c.req.param("id"), p.tenantId).run();
  return c.json({ success: true });
});
app.get("/api/protected/customers", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json([]);
  const rows = await c.env.DB.prepare("SELECT * FROM customers WHERE tenant_id = ? ORDER BY name ASC").bind(p.tenantId).all();
  return c.json(rows.results || []);
});
app.post("/api/protected/customers", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({ error: "No tenant" }, 403);
  const b = await c.req.json();
  if (!b.name) return c.json({ error: "Name required" }, 400);
  const id = crypto.randomUUID();
  await c.env.DB.prepare("INSERT INTO customers (id, tenant_id, name, phone, email, address, notes, balance) VALUES (?,?,?,?,?,?,?,?)").bind(id, p.tenantId, b.name, b.phone || "", b.email || "", b.address || "", b.notes || "", b.balance || 0).run();
  return c.json({ success: true, id });
});
app.put("/api/protected/customers/:id", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({ error: "No tenant" }, 403);
  const b = await c.req.json();
  await c.env.DB.prepare("UPDATE customers SET name=?, phone=?, email=?, address=?, notes=?, balance=? WHERE id=? AND tenant_id=?").bind(b.name, b.phone || "", b.email || "", b.address || "", b.notes || "", b.balance || 0, c.req.param("id"), p.tenantId).run();
  return c.json({ success: true });
});
app.delete("/api/protected/customers/:id", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({ error: "No tenant" }, 403);
  await c.env.DB.prepare("DELETE FROM customers WHERE id=? AND tenant_id=?").bind(c.req.param("id"), p.tenantId).run();
  return c.json({ success: true });
});
app.get("/api/protected/customers/:id/credit", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({}, 403);
  const customerId = c.req.param("id");
  const customer = await c.env.DB.prepare("SELECT balance as totalDebt FROM customers WHERE id = ? AND tenant_id = ?").bind(customerId, p.tenantId).first();
  if (!customer) return c.json({ error: "Not found" }, 404);
  const sales = await c.env.DB.prepare("SELECT * FROM sales WHERE customer_id = ? AND tenant_id = ? AND (payment_method = 'credit' OR remaining > 0) ORDER BY created_at DESC").bind(customerId, p.tenantId).all();
  const saleIds = sales.results?.map((s) => `'${s.id}'`).join(",") || "''";
  let payments = { results: [] };
  if (sales.results?.length > 0) {
    payments = await c.env.DB.prepare(`SELECT * FROM customer_payments WHERE sale_id IN (${saleIds}) AND tenant_id = ? ORDER BY created_at ASC`).bind(p.tenantId).all();
  }
  const salesWithPayments = sales.results?.map((s) => ({
    ...s,
    payments: payments.results?.filter((pmt) => pmt.sale_id === s.id) || []
  }));
  return c.json({ totalDebt: customer.totalDebt || 0, sales: salesWithPayments || [] });
});
app.post("/api/protected/customers/sale/:id/pay", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({ error: "No tenant" }, 403);
  const saleId = c.req.param("id");
  const { amount } = await c.req.json();
  const sale = await c.env.DB.prepare("SELECT * FROM sales WHERE id = ? AND tenant_id = ?").bind(saleId, p.tenantId).first();
  if (!sale) return c.json({ error: "Sale not found" }, 404);
  if (sale.remaining < amount) return c.json({ error: "\u0627\u0644\u0645\u0628\u0644\u063A \u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0645\u062A\u0628\u0642\u064A" }, 400);
  const pmtId = crypto.randomUUID();
  const newRemaining = sale.remaining - amount;
  const newPaid = sale.paid + amount;
  const newStatus = newRemaining <= 0 ? "paid" : sale.status;
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO customer_payments (id, tenant_id, customer_id, sale_id, amount) VALUES (?,?,?,?,?)").bind(pmtId, p.tenantId, sale.customer_id, saleId, amount),
    c.env.DB.prepare("UPDATE sales SET paid = ?, remaining = ?, status = ? WHERE id = ? AND tenant_id = ?").bind(newPaid, newRemaining, newStatus, saleId, p.tenantId),
    c.env.DB.prepare("UPDATE customers SET balance = balance - ? WHERE id = ? AND tenant_id = ?").bind(amount, sale.customer_id, p.tenantId)
  ]);
  return c.json({ success: true });
});
app.get("/api/protected/employees", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json([]);
  const rows = await c.env.DB.prepare("SELECT e.*, u.username FROM employees e LEFT JOIN users u ON u.id = e.user_id WHERE e.tenant_id = ? ORDER BY e.name ASC").bind(p.tenantId).all();
  return c.json(rows.results || []);
});
app.post("/api/protected/employees", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({ error: "No tenant" }, 403);
  const b = await c.req.json();
  if (!b.name) return c.json({ error: "Name required" }, 400);
  const id = crypto.randomUUID();
  await c.env.DB.prepare("INSERT INTO employees (id, tenant_id, user_id, name, phone, email, address, position, salary, hire_date) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(id, p.tenantId, b.user_id || null, b.name, b.phone || "", b.email || "", b.address || "", b.position || "", b.salary || 0, b.hire_date || null).run();
  return c.json({ success: true, id });
});
app.put("/api/protected/employees/:id", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({ error: "No tenant" }, 403);
  const b = await c.req.json();
  await c.env.DB.prepare("UPDATE employees SET user_id=?, name=?, phone=?, email=?, address=?, position=?, salary=?, hire_date=?, active=? WHERE id=? AND tenant_id=?").bind(b.user_id || null, b.name, b.phone || "", b.email || "", b.address || "", b.position || "", b.salary || 0, b.hire_date || null, b.active !== void 0 ? b.active : 1, c.req.param("id"), p.tenantId).run();
  return c.json({ success: true });
});
app.get("/api/protected/attendance", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json([]);
  const date = c.req.query("date") || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const rows = await c.env.DB.prepare("SELECT a.*, e.name as employee_name FROM attendance a JOIN employees e ON e.id = a.employee_id WHERE a.tenant_id = ? AND a.date = ? ORDER BY a.created_at DESC").bind(p.tenantId, date).all();
  return c.json(rows.results || []);
});
app.post("/api/protected/attendance/checkin", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({ error: "No tenant" }, 403);
  const { employee_id } = await c.req.json();
  const emp = await c.env.DB.prepare("SELECT id FROM employees WHERE id = ? AND tenant_id = ?").bind(employee_id, p.tenantId).first();
  if (!emp) return c.json({ error: "\u0627\u0644\u0645\u0648\u0638\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" }, 404);
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const time = (/* @__PURE__ */ new Date()).toTimeString().split(" ")[0].slice(0, 5);
  const id = crypto.randomUUID();
  try {
    await c.env.DB.prepare("INSERT INTO attendance (id, tenant_id, employee_id, date, check_in) VALUES (?,?,?,?,?)").bind(id, p.tenantId, employee_id, today, time).run();
    return c.json({ success: true });
  } catch (_) {
    return c.json({ error: "\u0633\u062C\u0644 \u0627\u0644\u062D\u0636\u0648\u0631 \u0645\u0648\u062C\u0648\u062F \u0645\u0633\u0628\u0642\u0627\u064B \u0644\u0647\u0630\u0627 \u0627\u0644\u064A\u0648\u0645" }, 409);
  }
});
app.post("/api/protected/attendance/checkout", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({ error: "No tenant" }, 403);
  const { employee_id } = await c.req.json();
  const emp = await c.env.DB.prepare("SELECT id FROM employees WHERE id = ? AND tenant_id = ?").bind(employee_id, p.tenantId).first();
  if (!emp) return c.json({ error: "\u0627\u0644\u0645\u0648\u0638\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" }, 404);
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const time = (/* @__PURE__ */ new Date()).toTimeString().split(" ")[0].slice(0, 5);
  await c.env.DB.prepare("UPDATE attendance SET check_out=? WHERE tenant_id=? AND employee_id=? AND date=? AND check_out IS NULL").bind(time, p.tenantId, employee_id, today).run();
  return c.json({ success: true });
});
app.post("/api/protected/attendance", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId || p.role === "cashier") return c.json({ error: "Unauthorized" }, 403);
  const b = await c.req.json();
  const emp = await c.env.DB.prepare("SELECT id FROM employees WHERE id = ? AND tenant_id = ?").bind(b.employee_id, p.tenantId).first();
  if (!emp) return c.json({ error: "\u0627\u0644\u0645\u0648\u0638\u0641 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" }, 404);
  const id = crypto.randomUUID();
  try {
    await c.env.DB.prepare("INSERT OR REPLACE INTO attendance (id, tenant_id, employee_id, date, check_in, check_out, notes) VALUES (?,?,?,?,?,?,?)").bind(id, p.tenantId, b.employee_id, b.date, b.check_in || null, b.check_out || null, b.notes || "").run();
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});
app.delete("/api/protected/attendance/:id", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId || p.role === "cashier") return c.json({ error: "Unauthorized" }, 403);
  await c.env.DB.prepare("DELETE FROM attendance WHERE id=? AND tenant_id=?").bind(c.req.param("id"), p.tenantId).run();
  return c.json({ success: true });
});
app.get("/api/protected/expenses", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json([]);
  const params = [p.tenantId];
  let q = "SELECT e.*, u.name as user_name FROM expenses e LEFT JOIN users u ON u.id = e.user_id WHERE e.tenant_id = ?";
  const df = c.req.query("date_from"), dt = c.req.query("date_to"), cat = c.req.query("category");
  if (df) {
    q += " AND e.date >= ?";
    params.push(df);
  }
  if (dt) {
    q += " AND e.date <= ?";
    params.push(dt);
  }
  if (cat) {
    q += " AND e.category = ?";
    params.push(cat);
  }
  q += " ORDER BY e.date DESC";
  const rows = await c.env.DB.prepare(q).bind(...params).all();
  return c.json(rows.results || []);
});
app.post("/api/protected/expenses", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({ error: "No tenant" }, 403);
  const b = await c.req.json();
  if (!b.amount) return c.json({ error: "Amount required" }, 400);
  const id = crypto.randomUUID();
  await c.env.DB.prepare("INSERT INTO expenses (id, tenant_id, category, amount, description, user_id, date) VALUES (?,?,?,?,?,?,?)").bind(id, p.tenantId, b.category || "\u0639\u0627\u0645", b.amount, b.description || "", p.userId, b.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]).run();
  return c.json({ success: true, id });
});
app.put("/api/protected/expenses/:id", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({ error: "No tenant" }, 403);
  const b = await c.req.json();
  await c.env.DB.prepare("UPDATE expenses SET category=?, amount=?, description=?, date=? WHERE id=? AND tenant_id=?").bind(b.category || "\u0639\u0627\u0645", b.amount, b.description || "", b.date, c.req.param("id"), p.tenantId).run();
  return c.json({ success: true });
});
app.delete("/api/protected/expenses/:id", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({ error: "No tenant" }, 403);
  await c.env.DB.prepare("DELETE FROM expenses WHERE id=? AND tenant_id=?").bind(c.req.param("id"), p.tenantId).run();
  return c.json({ success: true });
});
app.get("/api/protected/sales", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json([]);
  const params = [p.tenantId];
  let q = "SELECT s.*, c.name as customer_name FROM sales s LEFT JOIN customers c ON c.id = s.customer_id WHERE s.tenant_id = ?";
  const df = c.req.query("date_from"), dt = c.req.query("date_to"), status = c.req.query("status");
  if (df) {
    q += " AND date(s.created_at) >= ?";
    params.push(df);
  }
  if (dt) {
    q += " AND date(s.created_at) <= ?";
    params.push(dt);
  }
  if (status) {
    q += " AND s.status = ?";
    params.push(status);
  }
  q += " ORDER BY s.created_at DESC LIMIT 200";
  const rows = await c.env.DB.prepare(q).bind(...params).all();
  return c.json(rows.results || []);
});
app.get("/api/protected/sales/:id", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({}, 403);
  const sale = await c.env.DB.prepare("SELECT s.*, c.name as customer_name, c.phone as customer_phone FROM sales s LEFT JOIN customers c ON c.id = s.customer_id WHERE s.id = ? AND s.tenant_id = ?").bind(c.req.param("id"), p.tenantId).first();
  if (!sale) return c.json({ error: "Not found" }, 404);
  const items = await c.env.DB.prepare("SELECT * FROM sale_items WHERE sale_id = ? AND tenant_id = ?").bind(c.req.param("id"), p.tenantId).all();
  return c.json({ ...sale, items: items.results || [] });
});
app.post("/api/protected/sales", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({ error: "No tenant" }, 403);
  const b = await c.req.json();
  if (!b.items || !b.items.length) return c.json({ error: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0639\u0646\u0627\u0635\u0631 \u0641\u064A \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629" }, 400);
  if (p.role === "cashier" && b.discount > 0) {
    const discountPct = b.discount_type === "percent" ? b.discount : b.discount / b.subtotal * 100;
    const userData = await c.env.DB.prepare("SELECT max_discount_percent FROM users WHERE id = ?").bind(p.userId).first();
    if (userData && discountPct > (userData.max_discount_percent || 0))
      return c.json({ error: `\u0627\u0644\u062E\u0635\u0645 \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0628\u0647 \u0644\u0643 ${userData.max_discount_percent}% \u0641\u0642\u0637` }, 403);
  }
  const saleId = crypto.randomUUID();
  const invoiceNum = `INV-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
  const statements = [
    c.env.DB.prepare("INSERT INTO sales (id, tenant_id, invoice_number, customer_id, user_id, subtotal, discount, discount_type, tax, total, paid, remaining, change_amount, payment_method, status, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(saleId, p.tenantId, invoiceNum, b.customer_id || null, p.userId, b.subtotal || 0, b.discount || 0, b.discount_type || "fixed", b.tax || 0, b.total || 0, b.paid || 0, b.remaining || 0, b.change_amount || 0, b.payment_method || "cash", b.payment_method === "credit" ? "credit" : "completed", b.notes || "")
  ];
  for (const item of b.items) {
    const itemId = crypto.randomUUID();
    statements.push(c.env.DB.prepare("INSERT INTO sale_items (id, tenant_id, sale_id, product_id, product_name, barcode, quantity, cost_price, unit_price, discount, total) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(itemId, p.tenantId, saleId, item.product_id || null, item.name, item.barcode || "", item.quantity, item.cost_price || 0, item.price, item.discount || 0, item.quantity * item.price));
    if (item.product_id) {
      statements.push(c.env.DB.prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND tenant_id = ?").bind(item.quantity, item.product_id, p.tenantId));
    }
  }
  if (b.customer_id && b.remaining > 0) {
    statements.push(c.env.DB.prepare("UPDATE customers SET balance = balance + ? WHERE id = ? AND tenant_id = ?").bind(b.remaining, b.customer_id, p.tenantId));
  }
  await c.env.DB.batch(statements);
  return c.json({ success: true, id: saleId, invoice_number: invoiceNum });
});
app.put("/api/protected/sales/:id/status", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId || p.role === "cashier") return c.json({ error: "Unauthorized" }, 403);
  const { status } = await c.req.json();
  if (status === "refunded") {
    const sale = await c.env.DB.prepare("SELECT status FROM sales WHERE id=? AND tenant_id=?").bind(c.req.param("id"), p.tenantId).first();
    if (sale && sale.status !== "refunded") {
      const items = await c.env.DB.prepare("SELECT product_id, quantity FROM sale_items WHERE sale_id=? AND tenant_id=?").bind(c.req.param("id"), p.tenantId).all();
      const stmts = items.results?.filter((i) => i.product_id).map(
        (i) => c.env.DB.prepare("UPDATE products SET stock = stock + ? WHERE id = ? AND tenant_id = ?").bind(i.quantity, i.product_id, p.tenantId)
      ) || [];
      stmts.push(c.env.DB.prepare("UPDATE sales SET status=? WHERE id=? AND tenant_id=?").bind(status, c.req.param("id"), p.tenantId));
      await c.env.DB.batch(stmts);
      return c.json({ success: true });
    }
  }
  await c.env.DB.prepare("UPDATE sales SET status=? WHERE id=? AND tenant_id=?").bind(status, c.req.param("id"), p.tenantId).run();
  return c.json({ success: true });
});
app.get("/api/protected/suppliers", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json([]);
  const rows = await c.env.DB.prepare("SELECT * FROM suppliers WHERE tenant_id = ? ORDER BY name ASC").bind(p.tenantId).all();
  return c.json(rows.results || []);
});
app.post("/api/protected/suppliers", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({ error: "No tenant" }, 403);
  const b = await c.req.json();
  if (!b.name) return c.json({ error: "Name required" }, 400);
  const id = crypto.randomUUID();
  await c.env.DB.prepare("INSERT INTO suppliers (id, tenant_id, name, phone, email, address, notes, balance) VALUES (?,?,?,?,?,?,?,?)").bind(id, p.tenantId, b.name, b.phone || "", b.email || "", b.address || "", b.notes || "", b.balance || 0).run();
  return c.json({ success: true, id });
});
app.put("/api/protected/suppliers/:id", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({ error: "No tenant" }, 403);
  const b = await c.req.json();
  await c.env.DB.prepare("UPDATE suppliers SET name=?, phone=?, email=?, address=?, notes=?, balance=? WHERE id=? AND tenant_id=?").bind(b.name, b.phone || "", b.email || "", b.address || "", b.notes || "", b.balance || 0, c.req.param("id"), p.tenantId).run();
  return c.json({ success: true });
});
app.delete("/api/protected/suppliers/:id", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({ error: "No tenant" }, 403);
  await c.env.DB.prepare("DELETE FROM suppliers WHERE id=? AND tenant_id=?").bind(c.req.param("id"), p.tenantId).run();
  return c.json({ success: true });
});
app.get("/api/protected/purchases", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json([]);
  const rows = await c.env.DB.prepare("SELECT po.*, s.name as supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON s.id = po.supplier_id WHERE po.tenant_id = ? ORDER BY po.created_at DESC").bind(p.tenantId).all();
  return c.json(rows.results || []);
});
app.post("/api/protected/purchases", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId || p.role === "cashier") return c.json({ error: "Unauthorized" }, 403);
  const b = await c.req.json();
  if (!b.items || !b.items.length) return c.json({ error: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0639\u0646\u0627\u0635\u0631" }, 400);
  const orderId = crypto.randomUUID();
  const orderNum = `PO-${Date.now()}`;
  const stmts = [
    c.env.DB.prepare("INSERT INTO purchase_orders (id, tenant_id, supplier_id, user_id, order_number, subtotal, discount, total, paid, remaining, status, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").bind(orderId, p.tenantId, b.supplier_id || null, p.userId, orderNum, b.subtotal || 0, b.discount || 0, b.total || 0, b.paid || 0, b.remaining || 0, b.status || "received", b.notes || "")
  ];
  for (const item of b.items) {
    stmts.push(c.env.DB.prepare("INSERT INTO purchase_items (id, tenant_id, order_id, product_id, product_name, quantity, cost_price, total) VALUES (?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), p.tenantId, orderId, item.product_id || null, item.product_name, item.quantity, item.cost_price, item.total));
    if (item.product_id && b.status === "received") stmts.push(c.env.DB.prepare("UPDATE products SET stock = stock + ?, cost_price = ? WHERE id = ? AND tenant_id = ?").bind(item.quantity, item.cost_price, item.product_id, p.tenantId));
  }
  if (b.supplier_id && b.remaining > 0) stmts.push(c.env.DB.prepare("UPDATE suppliers SET balance = balance + ? WHERE id = ? AND tenant_id = ?").bind(b.remaining, b.supplier_id, p.tenantId));
  await c.env.DB.batch(stmts);
  return c.json({ success: true, id: orderId, order_number: orderNum });
});
app.get("/api/protected/reports/dashboard", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({});
  const [
    todaySales,
    todayExpenses,
    monthSales,
    productCount,
    lowStockCount,
    customerCount,
    last7DaysData,
    topProductsData
  ] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM sales WHERE tenant_id=? AND date(created_at) = date('now') AND status!='refunded'").bind(p.tenantId).first(),
    c.env.DB.prepare("SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE tenant_id=? AND date(date) = date('now')").bind(p.tenantId).first(),
    c.env.DB.prepare("SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total FROM sales WHERE tenant_id=? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') AND status!='refunded'").bind(p.tenantId).first(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM products WHERE tenant_id=? AND active=1").bind(p.tenantId).first(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM products WHERE tenant_id=? AND active=1 AND stock <= min_stock").bind(p.tenantId).first(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM customers WHERE tenant_id=? AND active=1").bind(p.tenantId).first(),
    c.env.DB.prepare("SELECT date(created_at) as date, COALESCE(SUM(total),0) as total FROM sales WHERE tenant_id=? AND created_at >= date('now', '-6 days') AND status!='refunded' GROUP BY date(created_at) ORDER BY date(created_at) ASC").bind(p.tenantId).all(),
    c.env.DB.prepare("SELECT product_name as name, SUM(quantity) as qty, SUM(total) as total FROM sale_items i JOIN sales s ON i.sale_id = s.id WHERE i.tenant_id=? AND s.status!='refunded' GROUP BY product_name ORDER BY qty DESC LIMIT 5").bind(p.tenantId).all()
  ]);
  return c.json({
    today: {
      sales: { total: todaySales?.total || 0, count: todaySales?.count || 0 },
      expenses: todayExpenses?.total || 0
    },
    month: {
      sales: { total: monthSales?.total || 0, count: monthSales?.count || 0 }
    },
    products: productCount?.count || 0,
    low_stock: lowStockCount?.count || 0,
    customers: customerCount?.count || 0,
    last7Days: last7DaysData.results || [],
    topProducts: topProductsData.results || []
  });
});
app.get("/api/protected/reports/sales", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({});
  const from = c.req.query("date_from") || new Date((/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth(), 1).toISOString().split("T")[0];
  const to = c.req.query("date_to") || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const [summary, rows, methods] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) as invoices, COALESCE(SUM(total),0) as total, COALESCE(SUM(discount),0) as discount FROM sales WHERE tenant_id=? AND date(created_at) BETWEEN ? AND ? AND status!='refunded'").bind(p.tenantId, from, to).first(),
    c.env.DB.prepare("SELECT date(created_at) as period, COALESCE(SUM(total),0) as total, COUNT(*) as count FROM sales WHERE tenant_id=? AND date(created_at) BETWEEN ? AND ? AND status!='refunded' GROUP BY period ORDER BY period").bind(p.tenantId, from, to).all(),
    c.env.DB.prepare("SELECT payment_method, COUNT(*) as count, COALESCE(SUM(total),0) as total FROM sales WHERE tenant_id=? AND date(created_at) BETWEEN ? AND ? AND status!='refunded' GROUP BY payment_method").bind(p.tenantId, from, to).all()
  ]);
  return c.json({ summary, rows: rows.results || [], paymentMethods: methods.results || [] });
});
app.get("/api/protected/reports/profit", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({});
  const from = c.req.query("date_from") || new Date((/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth(), 1).toISOString().split("T")[0];
  const to = c.req.query("date_to") || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const [salesData, costData, expData] = await Promise.all([
    c.env.DB.prepare("SELECT COALESCE(SUM(total),0) as revenue FROM sales WHERE tenant_id=? AND date(created_at) BETWEEN ? AND ? AND status!='refunded'").bind(p.tenantId, from, to).first(),
    c.env.DB.prepare("SELECT COALESCE(SUM(si.quantity * si.cost_price),0) as cost FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE si.tenant_id=? AND date(s.created_at) BETWEEN ? AND ?").bind(p.tenantId, from, to).first(),
    c.env.DB.prepare("SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE tenant_id=? AND date BETWEEN ? AND ?").bind(p.tenantId, from, to).first()
  ]);
  const revenue = salesData?.revenue || 0;
  const cost = costData?.cost || 0;
  const expenses = expData?.total || 0;
  return c.json({ revenue, cost, grossProfit: revenue - cost, expenses, netProfit: revenue - cost - expenses });
});
app.get("/api/protected/reports/inventory", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({});
  const rows = await c.env.DB.prepare("SELECT p.*, c.name as category_name, (p.stock * p.cost_price) as stock_value FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.tenant_id=? AND p.active=1 ORDER BY stock_value DESC").bind(p.tenantId).all();
  const summary = await c.env.DB.prepare("SELECT COUNT(*) as products, COALESCE(SUM(stock),0) as total_units, COALESCE(SUM(stock*cost_price),0) as total_value FROM products WHERE tenant_id=? AND active=1").bind(p.tenantId).first();
  return c.json({ rows: rows.results || [], summary });
});
app.get("/api/protected/reports/attendance", async (c) => {
  const p = c.get("jwtPayload");
  if (!p.tenantId) return c.json({});
  const from = c.req.query("date_from") || new Date((/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth(), 1).toISOString().split("T")[0];
  const to = c.req.query("date_to") || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const rows = await c.env.DB.prepare("SELECT e.id, e.name as employee_name, COUNT(a.id) as present_days, COALESCE(SUM(CASE WHEN a.check_in IS NOT NULL AND a.check_out IS NOT NULL THEN (strftime('%H',a.check_out)*60+strftime('%M',a.check_out)) - (strftime('%H',a.check_in)*60+strftime('%M',a.check_in)) ELSE 0 END) / 60.0, 0) as total_hours FROM employees e LEFT JOIN attendance a ON a.employee_id=e.id AND a.date BETWEEN ? AND ? WHERE e.tenant_id=? GROUP BY e.id ORDER BY e.name").bind(from, to, p.tenantId).all();
  return c.json({ rows: rows.results || [] });
});
var onRequest = handle(app);

// ../.wrangler/tmp/pages-IJCSsQ/functionsRoutes-0.9934585004626609.mjs
var routes = [
  {
    routePath: "/api/:route*",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  }
];

// ../../../../../../.nvm/versions/node/v24.18.0/lib/node_modules/wrangler/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse2(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse2, "parse");
function match2(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match2, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode3 = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode3(value, key);
        });
      } else {
        params[key.name] = decode3(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse2(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../../../../.nvm/versions/node/v24.18.0/lib/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match2(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match2(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match2(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match2(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../../../../../../.nvm/versions/node/v24.18.0/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../../.nvm/versions/node/v24.18.0/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-qCMFCo/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../../../../../../.nvm/versions/node/v24.18.0/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-qCMFCo/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.7737338630435322.mjs.map
