import {
  parseEndpoint
} from "./chunk-QWRR7GAC.js";

// src/internal/is-internal-endpoint.ts
var internalEndpoints = ["background", "devtools", "content-script", "options", "popup", "sidepanel"];
var isInternalEndpoint = ({ context: ctx }) => internalEndpoints.includes(ctx);
export {
  isInternalEndpoint,
  parseEndpoint
};
