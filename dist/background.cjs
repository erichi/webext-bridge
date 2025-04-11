var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/background.ts
var background_exports = {};
__export(background_exports, {
  onMessage: () => onMessage,
  onOpenStreamChannel: () => onOpenStreamChannel,
  openStream: () => openStream,
  sendMessage: () => sendMessage
});
module.exports = __toCommonJS(background_exports);
var import_webextension_polyfill = __toESM(require("webextension-polyfill"), 1);

// src/internal/endpoint-runtime.ts
var import_tiny_uid = __toESM(require("tiny-uid"), 1);
var import_serialize_error = require("serialize-error");

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
var formatEndpoint = ({ context, tabId, frameId }) => {
  if (["background", "popup", "options", "sidepanel"].includes(context))
    return context;
  return `${context}@${tabId}${frameId ? `.${frameId}` : ""}`;
};

// src/internal/endpoint-runtime.ts
var createEndpointRuntime = (thisContext, routeMessage, localMessage) => {
  const runtimeId = (0, import_tiny_uid.default)();
  const openTransactions = /* @__PURE__ */ new Map();
  const onMessageListeners = /* @__PURE__ */ new Map();
  const handleMessage = (message) => {
    if (message.destination.context === thisContext && !message.destination.frameId && !message.destination.tabId) {
      localMessage == null ? void 0 : localMessage(message);
      const { transactionId, messageID, messageType } = message;
      const handleReply = () => {
        const transactionP = openTransactions.get(transactionId);
        if (transactionP) {
          const { err, data } = message;
          if (err) {
            const dehydratedErr = err;
            const errCtr = self[dehydratedErr.name];
            const hydratedErr = new (typeof errCtr === "function" ? errCtr : Error)(dehydratedErr.message);
            for (const prop in dehydratedErr)
              hydratedErr[prop] = dehydratedErr[prop];
            transactionP.reject(hydratedErr);
          } else {
            transactionP.resolve(data);
          }
          openTransactions.delete(transactionId);
        }
      };
      const handleNewMessage = async () => {
        let reply;
        let err;
        let noHandlerFoundError = false;
        try {
          const cb = onMessageListeners.get(messageID);
          if (typeof cb === "function") {
            reply = await cb({
              sender: message.origin,
              id: messageID,
              data: message.data,
              timestamp: message.timestamp
            });
          } else {
            noHandlerFoundError = true;
            throw new Error(
              `[webext-bridge] No handler registered in '${thisContext}' to accept messages with id '${messageID}'`
            );
          }
        } catch (error) {
          err = error;
        } finally {
          if (err)
            message.err = (0, import_serialize_error.serializeError)(err);
          handleMessage({
            ...message,
            messageType: "reply",
            data: reply,
            origin: { context: thisContext, tabId: null },
            destination: message.origin,
            hops: []
          });
          if (err && !noHandlerFoundError)
            throw reply;
        }
      };
      switch (messageType) {
        case "reply":
          return handleReply();
        case "message":
          return handleNewMessage();
      }
    }
    message.hops.push(`${thisContext}::${runtimeId}`);
    return routeMessage(message);
  };
  return {
    handleMessage,
    endTransaction: (transactionID) => {
      const transactionP = openTransactions.get(transactionID);
      transactionP == null ? void 0 : transactionP.reject("Transaction was ended before it could complete");
      openTransactions.delete(transactionID);
    },
    sendMessage: (messageID, data, destination = "background") => {
      const endpoint = typeof destination === "string" ? parseEndpoint(destination) : destination;
      const errFn = "Bridge#sendMessage ->";
      if (!endpoint.context) {
        throw new TypeError(
          `${errFn} Destination must be any one of known destinations`
        );
      }
      return new Promise((resolve, reject) => {
        const payload = {
          messageID,
          data,
          destination: endpoint,
          messageType: "message",
          transactionId: (0, import_tiny_uid.default)(),
          origin: { context: thisContext, tabId: null },
          hops: [],
          timestamp: Date.now()
        };
        openTransactions.set(payload.transactionId, { resolve, reject });
        try {
          handleMessage(payload);
        } catch (error) {
          openTransactions.delete(payload.transactionId);
          reject(error);
        }
      });
    },
    onMessage: (messageID, callback) => {
      onMessageListeners.set(messageID, callback);
      return () => onMessageListeners.delete(messageID);
    }
  };
};

// src/internal/stream.ts
var import_nanoevents = require("nanoevents");
var import_tiny_uid2 = __toESM(require("tiny-uid"), 1);
var _Stream = class {
  constructor(endpointRuntime2, streamInfo) {
    this.endpointRuntime = endpointRuntime2;
    this.streamInfo = streamInfo;
    this.emitter = (0, import_nanoevents.createNanoEvents)();
    this.isClosed = false;
    this.handleStreamClose = () => {
      if (!this.isClosed) {
        this.isClosed = true;
        this.emitter.emit("closed", true);
        this.emitter.events = {};
      }
    };
    if (!_Stream.initDone) {
      endpointRuntime2.onMessage("__crx_bridge_stream_transfer__", (msg) => {
        const { streamId, streamTransfer, action } = msg.data;
        const stream = _Stream.openStreams.get(streamId);
        if (stream && !stream.isClosed) {
          if (action === "transfer")
            stream.emitter.emit("message", streamTransfer);
          if (action === "close") {
            _Stream.openStreams.delete(streamId);
            stream.handleStreamClose();
          }
        }
      });
      _Stream.initDone = true;
    }
    _Stream.openStreams.set(this.streamInfo.streamId, this);
  }
  get info() {
    return this.streamInfo;
  }
  send(msg) {
    if (this.isClosed)
      throw new Error("Attempting to send a message over closed stream. Use stream.onClose(<callback>) to keep an eye on stream status");
    this.endpointRuntime.sendMessage("__crx_bridge_stream_transfer__", {
      streamId: this.streamInfo.streamId,
      streamTransfer: msg,
      action: "transfer"
    }, this.streamInfo.endpoint);
  }
  close(msg) {
    if (msg)
      this.send(msg);
    this.handleStreamClose();
    this.endpointRuntime.sendMessage("__crx_bridge_stream_transfer__", {
      streamId: this.streamInfo.streamId,
      streamTransfer: null,
      action: "close"
    }, this.streamInfo.endpoint);
  }
  onMessage(callback) {
    return this.getDisposable("message", callback);
  }
  onClose(callback) {
    return this.getDisposable("closed", callback);
  }
  getDisposable(event, callback) {
    const off = this.emitter.on(event, callback);
    return Object.assign(off, {
      dispose: off,
      close: off
    });
  }
};
var Stream = _Stream;
Stream.initDone = false;
Stream.openStreams = /* @__PURE__ */ new Map();
var createStreamWirings = (endpointRuntime2) => {
  const openStreams = /* @__PURE__ */ new Map();
  const onOpenStreamCallbacks = /* @__PURE__ */ new Map();
  const streamyEmitter = (0, import_nanoevents.createNanoEvents)();
  endpointRuntime2.onMessage("__crx_bridge_stream_open__", (message) => {
    return new Promise((resolve) => {
      const { sender, data } = message;
      const { channel } = data;
      let watching = false;
      let off = () => {
      };
      const readyup = () => {
        const callback = onOpenStreamCallbacks.get(channel);
        if (typeof callback === "function") {
          callback(new Stream(endpointRuntime2, { ...data, endpoint: sender }));
          if (watching)
            off();
          resolve(true);
        } else if (!watching) {
          watching = true;
          off = streamyEmitter.on("did-change-stream-callbacks", readyup);
        }
      };
      readyup();
    });
  });
  async function openStream2(channel, destination) {
    if (openStreams.has(channel))
      throw new Error("webext-bridge: A Stream is already open at this channel");
    const endpoint = typeof destination === "string" ? parseEndpoint(destination) : destination;
    const streamInfo = { streamId: (0, import_tiny_uid2.default)(), channel, endpoint };
    const stream = new Stream(endpointRuntime2, streamInfo);
    stream.onClose(() => openStreams.delete(channel));
    await endpointRuntime2.sendMessage("__crx_bridge_stream_open__", streamInfo, endpoint);
    openStreams.set(channel, stream);
    return stream;
  }
  function onOpenStreamChannel2(channel, callback) {
    if (onOpenStreamCallbacks.has(channel))
      throw new Error("webext-bridge: This channel has already been claimed. Stream allows only one-on-one communication");
    onOpenStreamCallbacks.set(channel, callback);
    streamyEmitter.emit("did-change-stream-callbacks");
  }
  return {
    openStream: openStream2,
    onOpenStreamChannel: onOpenStreamChannel2
  };
};

// src/internal/endpoint-fingerprint.ts
var import_tiny_uid3 = __toESM(require("tiny-uid"), 1);
var createFingerprint = () => `uid::${(0, import_tiny_uid3.default)(7)}`;

// src/internal/connection-args.ts
var isValidConnectionArgs = (args, requiredKeys = ["endpointName", "fingerprint"]) => typeof args === "object" && args !== null && requiredKeys.every((k) => k in args);
var decodeConnectionArgs = (encodedArgs) => {
  try {
    const args = JSON.parse(encodedArgs);
    return isValidConnectionArgs(args) ? args : null;
  } catch (error) {
    return null;
  }
};

// src/internal/delivery-logger.ts
var createDeliveryLogger = () => {
  let logs = [];
  return {
    add: (...receipts) => {
      logs = [...logs, ...receipts];
    },
    remove: (message) => {
      logs = typeof message === "string" ? logs.filter((receipt) => receipt.message.transactionId !== message) : logs.filter((receipt) => !message.includes(receipt));
    },
    entries: () => logs
  };
};

// src/internal/port-message.ts
var PortMessage = class {
  static toBackground(port, message) {
    return port.postMessage(message);
  }
  static toExtensionContext(port, message) {
    return port.postMessage(message);
  }
};

// src/background.ts
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
import_webextension_polyfill.default.runtime.onConnect.addListener((incomingPort) => {
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
    import_webextension_polyfill.default.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  onMessage,
  onOpenStreamChannel,
  openStream,
  sendMessage
});
