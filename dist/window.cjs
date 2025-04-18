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

// src/window.ts
var window_exports = {};
__export(window_exports, {
  onMessage: () => onMessage,
  onOpenStreamChannel: () => onOpenStreamChannel,
  openStream: () => openStream,
  sendMessage: () => sendMessage,
  setNamespace: () => setNamespace
});
module.exports = __toCommonJS(window_exports);

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

// src/window.ts
var win = usePostMessaging("window");
var endpointRuntime = createEndpointRuntime(
  "window",
  (message) => win.postMessage(message)
);
win.onMessage((msg) => {
  if ("type" in msg && "transactionID" in msg)
    endpointRuntime.endTransaction(msg.transactionID);
  else
    endpointRuntime.handleMessage(msg);
});
function setNamespace(nsps) {
  win.setNamespace(nsps);
  win.enable();
}
var { sendMessage, onMessage } = endpointRuntime;
var { openStream, onOpenStreamChannel } = createStreamWirings(endpointRuntime);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  onMessage,
  onOpenStreamChannel,
  openStream,
  sendMessage,
  setNamespace
});
