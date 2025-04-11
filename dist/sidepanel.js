import {
  createPersistentPort
} from "./chunk-ODNERRIQ.js";
import "./chunk-G7AOUSAZ.js";
import {
  createEndpointRuntime,
  createStreamWirings
} from "./chunk-HNWCZ2OL.js";
import "./chunk-QWRR7GAC.js";

// src/sidepanel.ts
var port = createPersistentPort("sidepanel");
var endpointRuntime = createEndpointRuntime(
  "sidepanel",
  (message) => port.postMessage(message)
);
port.onMessage(endpointRuntime.handleMessage);
function setupSidepanel(options = {}) {
  if (typeof chrome !== "undefined" && chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    if (options.defaultPath) {
      chrome.sidePanel.setOptions({ path: options.defaultPath });
    }
  }
}
function onSidepanelShown(callback) {
  if (typeof chrome !== "undefined" && chrome.sidePanel && chrome.sidePanel.onShown) {
    chrome.sidePanel.onShown.addListener(callback);
    return () => chrome.sidePanel.onShown.removeListener(callback);
  }
  return () => {
  };
}
function onSidepanelHidden(callback) {
  if (typeof chrome !== "undefined" && chrome.sidePanel && chrome.sidePanel.onHidden) {
    chrome.sidePanel.onHidden.addListener(callback);
    return () => chrome.sidePanel.onHidden.removeListener(callback);
  }
  return () => {
  };
}
function isSidepanelSupported() {
  return !!chrome.sidePanel;
}
var { sendMessage, onMessage } = endpointRuntime;
var { openStream, onOpenStreamChannel } = createStreamWirings(endpointRuntime);
export {
  isSidepanelSupported,
  onMessage,
  onOpenStreamChannel,
  onSidepanelHidden,
  onSidepanelShown,
  openStream,
  sendMessage,
  setupSidepanel
};
