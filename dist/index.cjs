var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  isInternalEndpoint: () => isInternalEndpoint,
  parseEndpoint: () => parseEndpoint
});
module.exports = __toCommonJS(src_exports);

// src/internal/is-internal-endpoint.ts
var internalEndpoints = ["background", "devtools", "content-script", "options", "popup", "sidepanel"];
var isInternalEndpoint = ({ context: ctx }) => internalEndpoints.includes(ctx);

// src/internal/endpoint.ts
var ENDPOINT_RE = /^((?:background$)|devtools|popup|options|content-script|window|sidepanel)(?:@(\d+)(?:\.(\d+))?)?$/;
var parseEndpoint = (endpoint) => {
  const [, context, tabId, frameId] = endpoint.match(ENDPOINT_RE) || [];
  return {
    context,
    tabId: +tabId,
    frameId: frameId ? +frameId : void 0
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  isInternalEndpoint,
  parseEndpoint
});
