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

// src/content-script.ts
var content_script_exports = {};
__export(content_script_exports, {
  allowWindowMessaging: () => allowWindowMessaging,
  onMessage: () => onMessage,
  onOpenStreamChannel: () => onOpenStreamChannel,
  openStream: () => openStream,
  sendMessage: () => sendMessage
});
module.exports = __toCommonJS(content_script_exports);

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

// src/internal/message-port.ts
var promise;
var getMessagePort = (thisContext, namespace, onMessage2) => promise != null ? promise : promise = new Promise((resolve) => {
  const acceptMessagingPort = (event) => {
    const { data: { cmd, scope, context }, ports } = event;
    if (cmd === "webext-port-offer" && scope === namespace && context !== thisContext) {
      window.removeEventListener("message", acceptMessagingPort);
      ports[0].onmessage = onMessage2;
      ports[0].postMessage("port-accepted");
      return resolve(ports[0]);
    }
  };
  const offerMessagingPort = () => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      if (event.data === "port-accepted") {
        window.removeEventListener("message", acceptMessagingPort);
        return resolve(channel.port1);
      }
      onMessage2 == null ? void 0 : onMessage2(event);
    };
    window.postMessage({
      cmd: "webext-port-offer",
      scope: namespace,
      context: thisContext
    }, "*", [channel.port2]);
  };
  window.addEventListener("message", acceptMessagingPort);
  if (thisContext === "window")
    setTimeout(offerMessagingPort, 0);
  else
    offerMessagingPort();
});

// src/internal/post-message.ts
var usePostMessaging = (thisContext) => {
  let allocatedNamespace;
  let messagingEnabled = false;
  let onMessageCallback;
  let portP;
  return {
    enable: () => messagingEnabled = true,
    onMessage: (cb) => onMessageCallback = cb,
    postMessage: async (msg) => {
      if (thisContext !== "content-script" && thisContext !== "window")
        throw new Error("Endpoint does not use postMessage");
      if (!messagingEnabled)
        throw new Error("Communication with window has not been allowed");
      ensureNamespaceSet(allocatedNamespace);
      return (await portP).postMessage(msg);
    },
    setNamespace: (nsps) => {
      if (allocatedNamespace)
        throw new Error("Namespace once set cannot be changed");
      allocatedNamespace = nsps;
      portP = getMessagePort(
        thisContext,
        nsps,
        ({ data }) => onMessageCallback == null ? void 0 : onMessageCallback(data)
      );
    }
  };
};
function ensureNamespaceSet(namespace) {
  if (typeof namespace !== "string" || namespace.trim().length === 0) {
    throw new Error(
      `webext-bridge uses window.postMessage to talk with other "window"(s) for message routingwhich is global/conflicting operation in case there are other scripts using webext-bridge. Call Bridge#setNamespace(nsps) to isolate your app. Example: setNamespace('com.facebook.react-devtools'). Make sure to use same namespace across all your scripts whereever window.postMessage is likely to be used\``
    );
  }
}

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

// src/internal/persistent-port.ts
var import_webextension_polyfill = __toESM(require("webextension-polyfill"), 1);

// src/internal/endpoint-fingerprint.ts
var import_tiny_uid3 = __toESM(require("tiny-uid"), 1);
var createFingerprint = () => `uid::${(0, import_tiny_uid3.default)(7)}`;

// src/internal/connection-args.ts
var isValidConnectionArgs = (args, requiredKeys = ["endpointName", "fingerprint"]) => typeof args === "object" && args !== null && requiredKeys.every((k) => k in args);
var encodeConnectionArgs = (args) => {
  if (!isValidConnectionArgs(args))
    throw new TypeError("Invalid connection args");
  return JSON.stringify(args);
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
  static toBackground(port2, message) {
    return port2.postMessage(message);
  }
  static toExtensionContext(port2, message) {
    return port2.postMessage(message);
  }
};

// src/internal/persistent-port.ts
var createPersistentPort = (name = "") => {
  const fingerprint = createFingerprint();
  let port2;
  let undeliveredQueue = [];
  const pendingResponses = createDeliveryLogger();
  const onMessageListeners = /* @__PURE__ */ new Set();
  const onFailureListeners = /* @__PURE__ */ new Set();
  const handleMessage = (msg, port3) => {
    switch (msg.status) {
      case "undeliverable":
        if (!undeliveredQueue.some(
          (m) => m.message.messageID === msg.message.messageID
        )) {
          undeliveredQueue = [
            ...undeliveredQueue,
            {
              message: msg.message,
              resolvedDestination: msg.resolvedDestination
            }
          ];
        }
        return;
      case "deliverable":
        undeliveredQueue = undeliveredQueue.reduce((acc, queuedMsg) => {
          if (queuedMsg.resolvedDestination === msg.deliverableTo) {
            PortMessage.toBackground(port3, {
              type: "deliver",
              message: queuedMsg.message
            });
            return acc;
          }
          return [...acc, queuedMsg];
        }, []);
        return;
      case "delivered":
        if (msg.receipt.message.messageType === "message")
          pendingResponses.add(msg.receipt);
        return;
      case "incoming":
        if (msg.message.messageType === "reply")
          pendingResponses.remove(msg.message.messageID);
        onMessageListeners.forEach((cb) => cb(msg.message, port3));
        return;
      case "terminated": {
        const rogueMsgs = pendingResponses.entries().filter((receipt) => msg.fingerprint === receipt.to);
        pendingResponses.remove(rogueMsgs);
        rogueMsgs.forEach(
          ({ message }) => onFailureListeners.forEach((cb) => cb(message))
        );
      }
    }
  };
  const connect = () => {
    port2 = import_webextension_polyfill.default.runtime.connect({
      name: encodeConnectionArgs({
        endpointName: name,
        fingerprint
      })
    });
    port2.onMessage.addListener(handleMessage);
    port2.onDisconnect.addListener(connect);
    PortMessage.toBackground(port2, {
      type: "sync",
      pendingResponses: pendingResponses.entries(),
      pendingDeliveries: [
        ...new Set(
          undeliveredQueue.map(({ resolvedDestination }) => resolvedDestination)
        )
      ]
    });
  };
  connect();
  return {
    onFailure(cb) {
      onFailureListeners.add(cb);
    },
    onMessage(cb) {
      onMessageListeners.add(cb);
    },
    postMessage(message) {
      PortMessage.toBackground(port2, {
        type: "deliver",
        message
      });
    }
  };
};

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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  allowWindowMessaging,
  onMessage,
  onOpenStreamChannel,
  openStream,
  sendMessage
});
