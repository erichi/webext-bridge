import {
  usePostMessaging
} from "./chunk-QYJXY7GZ.js";
import {
  createPersistentPort
} from "./chunk-ODNERRIQ.js";
import "./chunk-G7AOUSAZ.js";
import {
  createEndpointRuntime,
  createStreamWirings
} from "./chunk-HNWCZ2OL.js";
import "./chunk-QWRR7GAC.js";

// src/content-script.ts
var win = usePostMessaging("content-script");
var port = createPersistentPort();
var endpointRuntime = createEndpointRuntime("content-script", (message) => {
  if (message.destination.context === "window")
    win.postMessage(message);
  else
    port.postMessage(message);
});
win.onMessage((message) => {
  endpointRuntime.handleMessage(Object.assign({}, message, { origin: {
    context: "window",
    tabId: null
  } }));
});
port.onMessage(endpointRuntime.handleMessage);
port.onFailure((message) => {
  if (message.origin.context === "window") {
    win.postMessage({
      type: "error",
      transactionID: message.transactionId
    });
    return;
  }
  endpointRuntime.endTransaction(message.transactionId);
});
function allowWindowMessaging(nsps) {
  win.setNamespace(nsps);
  win.enable();
}
var { sendMessage, onMessage } = endpointRuntime;
var { openStream, onOpenStreamChannel } = createStreamWirings(endpointRuntime);
export {
  allowWindowMessaging,
  onMessage,
  onOpenStreamChannel,
  openStream,
  sendMessage
};
