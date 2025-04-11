import {
  createPersistentPort
} from "./chunk-ODNERRIQ.js";
import "./chunk-G7AOUSAZ.js";
import {
  createEndpointRuntime,
  createStreamWirings
} from "./chunk-HNWCZ2OL.js";
import "./chunk-QWRR7GAC.js";

// src/devtools.ts
import browser from "webextension-polyfill";
var port = createPersistentPort(`devtools@${browser.devtools.inspectedWindow.tabId}`);
var endpointRuntime = createEndpointRuntime(
  "devtools",
  (message) => port.postMessage(message)
);
port.onMessage(endpointRuntime.handleMessage);
var { sendMessage, onMessage } = endpointRuntime;
var { openStream, onOpenStreamChannel } = createStreamWirings(endpointRuntime);
export {
  onMessage,
  onOpenStreamChannel,
  openStream,
  sendMessage
};
