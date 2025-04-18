import {
  PortMessage,
  createDeliveryLogger,
  createFingerprint,
  decodeConnectionArgs
} from "./chunk-G7AOUSAZ.js";
import {
  createEndpointRuntime,
  createStreamWirings
} from "./chunk-HNWCZ2OL.js";
import {
  formatEndpoint,
  parseEndpoint
} from "./chunk-QWRR7GAC.js";

// src/background.ts
import browser from "webextension-polyfill";
var pendingResponses = createDeliveryLogger();
var connMap = /* @__PURE__ */ new Map();
var oncePortConnectedCbs = /* @__PURE__ */ new Map();
var onceSessionEndCbs = /* @__PURE__ */ new Map();
var oncePortConnected = (endpointName, cb) => {
  oncePortConnectedCbs.set(
    endpointName,
    (oncePortConnectedCbs.get(endpointName) || /* @__PURE__ */ new Set()).add(cb)
  );
  return () => {
    const su = oncePortConnectedCbs.get(endpointName);
    if ((su == null ? void 0 : su.delete(cb)) && (su == null ? void 0 : su.size) === 0)
      oncePortConnectedCbs.delete(endpointName);
  };
};
var onceSessionEnded = (sessionFingerprint, cb) => {
  onceSessionEndCbs.set(
    sessionFingerprint,
    (onceSessionEndCbs.get(sessionFingerprint) || /* @__PURE__ */ new Set()).add(cb)
  );
};
var notifyEndpoint = (endpoint) => ({
  withFingerprint: (fingerprint) => {
    const nextChain = (v) => ({ and: () => v });
    const notifications = {
      aboutIncomingMessage: (message) => {
        const recipient = connMap.get(endpoint);
        PortMessage.toExtensionContext(recipient.port, {
          status: "incoming",
          message
        });
        return nextChain(notifications);
      },
      aboutSuccessfulDelivery: (receipt) => {
        const sender = connMap.get(endpoint);
        PortMessage.toExtensionContext(sender.port, {
          status: "delivered",
          receipt
        });
        return nextChain(notifications);
      },
      aboutMessageUndeliverability: (resolvedDestination, message) => {
        const sender = connMap.get(endpoint);
        if ((sender == null ? void 0 : sender.fingerprint) === fingerprint) {
          PortMessage.toExtensionContext(sender.port, {
            status: "undeliverable",
            resolvedDestination,
            message
          });
        }
        return nextChain(notifications);
      },
      whenDeliverableTo: (targetEndpoint) => {
        const notifyDeliverability = () => {
          const origin = connMap.get(endpoint);
          if ((origin == null ? void 0 : origin.fingerprint) === fingerprint && connMap.has(targetEndpoint)) {
            PortMessage.toExtensionContext(origin.port, {
              status: "deliverable",
              deliverableTo: targetEndpoint
            });
            return true;
          }
        };
        if (!notifyDeliverability()) {
          const unsub = oncePortConnected(targetEndpoint, notifyDeliverability);
          onceSessionEnded(fingerprint, unsub);
        }
        return nextChain(notifications);
      },
      aboutSessionEnded: (endedSessionFingerprint) => {
        const conn = connMap.get(endpoint);
        if ((conn == null ? void 0 : conn.fingerprint) === fingerprint) {
          PortMessage.toExtensionContext(conn.port, {
            status: "terminated",
            fingerprint: endedSessionFingerprint
          });
        }
        return nextChain(notifications);
      }
    };
    return notifications;
  }
});
var sessFingerprint = createFingerprint();
var endpointRuntime = createEndpointRuntime(
  "background",
  (message) => {
    var _a;
    if (message.origin.context === "background" && ["content-script", "devtools "].includes(message.destination.context) && !message.destination.tabId) {
      throw new TypeError(
        "When sending messages from background page, use @tabId syntax to target specific tab"
      );
    }
    const resolvedSender = formatEndpoint({
      ...message.origin,
      ...message.origin.context === "window" && { context: "content-script" }
    });
    const resolvedDestination = formatEndpoint({
      ...message.destination,
      ...message.destination.context === "window" && {
        context: "content-script"
      },
      tabId: message.destination.tabId || message.origin.tabId
    });
    message.destination.tabId = null;
    message.destination.frameId = null;
    const dest = () => connMap.get(resolvedDestination);
    const sender = () => connMap.get(resolvedSender);
    const deliver = () => {
      var _a2;
      notifyEndpoint(resolvedDestination).withFingerprint(dest().fingerprint).aboutIncomingMessage(message);
      const receipt = {
        message,
        to: dest().fingerprint,
        from: {
          endpointId: resolvedSender,
          fingerprint: (_a2 = sender()) == null ? void 0 : _a2.fingerprint
        }
      };
      if (message.messageType === "message")
        pendingResponses.add(receipt);
      if (message.messageType === "reply")
        pendingResponses.remove(message.messageID);
      if (sender()) {
        notifyEndpoint(resolvedSender).withFingerprint(sender().fingerprint).aboutSuccessfulDelivery(receipt);
      }
    };
    if ((_a = dest()) == null ? void 0 : _a.port) {
      deliver();
    } else if (message.messageType === "message") {
      if (message.origin.context === "background") {
        oncePortConnected(resolvedDestination, deliver);
      } else if (sender()) {
        notifyEndpoint(resolvedSender).withFingerprint(sender().fingerprint).aboutMessageUndeliverability(resolvedDestination, message).and().whenDeliverableTo(resolvedDestination);
      }
    }
  },
  (message) => {
    const resolvedSender = formatEndpoint({
      ...message.origin,
      ...message.origin.context === "window" && { context: "content-script" }
    });
    const sender = connMap.get(resolvedSender);
    const receipt = {
      message,
      to: sessFingerprint,
      from: {
        endpointId: resolvedSender,
        fingerprint: sender.fingerprint
      }
    };
    notifyEndpoint(resolvedSender).withFingerprint(sender.fingerprint).aboutSuccessfulDelivery(receipt);
  }
);
browser.runtime.onConnect.addListener((incomingPort) => {
  var _a;
  const connArgs = decodeConnectionArgs(incomingPort.name);
  if (!connArgs)
    return;
  connArgs.endpointName || (connArgs.endpointName = formatEndpoint({
    context: "content-script",
    tabId: incomingPort.sender.tab.id,
    frameId: incomingPort.sender.frameId
  }));
  if (["sidepanel", "popup", "options", "devtools"].includes(parseEndpoint(connArgs.endpointName).context)) {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]) {
        const activeTabId = tabs[0].id;
        if (parseEndpoint(connArgs.endpointName).context === "sidepanel" && parseEndpoint(connArgs.endpointName).tabId == null) {
          connArgs.endpointName = formatEndpoint({
            context: "sidepanel",
            tabId: activeTabId
          });
        }
      }
    });
  }
  const { tabId: linkedTabId, frameId: linkedFrameId } = parseEndpoint(
    connArgs.endpointName
  );
  connMap.set(connArgs.endpointName, {
    fingerprint: connArgs.fingerprint,
    port: incomingPort
  });
  (_a = oncePortConnectedCbs.get(connArgs.endpointName)) == null ? void 0 : _a.forEach((cb) => cb());
  oncePortConnectedCbs.delete(connArgs.endpointName);
  onceSessionEnded(connArgs.fingerprint, () => {
    const rogueMsgs = pendingResponses.entries().filter((pendingMessage) => pendingMessage.to === connArgs.fingerprint);
    pendingResponses.remove(rogueMsgs);
    rogueMsgs.forEach((rogueMessage) => {
      if (rogueMessage.from.endpointId === "background") {
        endpointRuntime.endTransaction(rogueMessage.message.transactionId);
      } else {
        notifyEndpoint(rogueMessage.from.endpointId).withFingerprint(rogueMessage.from.fingerprint).aboutSessionEnded(connArgs.fingerprint);
      }
    });
  });
  incomingPort.onDisconnect.addListener(() => {
    var _a2, _b;
    if (((_a2 = connMap.get(connArgs.endpointName)) == null ? void 0 : _a2.fingerprint) === connArgs.fingerprint)
      connMap.delete(connArgs.endpointName);
    (_b = onceSessionEndCbs.get(connArgs.fingerprint)) == null ? void 0 : _b.forEach((cb) => cb());
    onceSessionEndCbs.delete(connArgs.fingerprint);
  });
  incomingPort.onMessage.addListener((msg) => {
    var _a2, _b;
    if (msg.type === "sync") {
      const allActiveSessions = [...connMap.values()].map(
        (conn) => conn.fingerprint
      );
      const stillPending = msg.pendingResponses.filter(
        (fp) => allActiveSessions.includes(fp.to)
      );
      pendingResponses.add(...stillPending);
      msg.pendingResponses.filter(
        (deliveryReceipt) => !allActiveSessions.includes(deliveryReceipt.to)
      ).forEach(
        (deliveryReceipt) => notifyEndpoint(connArgs.endpointName).withFingerprint(connArgs.fingerprint).aboutSessionEnded(deliveryReceipt.to)
      );
      msg.pendingDeliveries.forEach(
        (intendedDestination) => notifyEndpoint(connArgs.endpointName).withFingerprint(connArgs.fingerprint).whenDeliverableTo(intendedDestination)
      );
      return;
    }
    if (msg.type === "deliver" && ((_b = (_a2 = msg.message) == null ? void 0 : _a2.origin) == null ? void 0 : _b.context)) {
      msg.message.origin.tabId = linkedTabId;
      msg.message.origin.frameId = linkedFrameId;
      endpointRuntime.handleMessage(msg.message);
    }
  });
});
var { sendMessage, onMessage } = endpointRuntime;
var { openStream, onOpenStreamChannel } = createStreamWirings(endpointRuntime);
export {
  onMessage,
  onOpenStreamChannel,
  openStream,
  sendMessage
};
