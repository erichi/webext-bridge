import { JsonValue } from 'type-fest';
import { b as DataTypeKey, G as GetDataType, D as Destination, c as GetReturnType, O as OnMessageCallback, I as InternalMessage, S as StreamInfo, H as HybridUnsubscriber } from './types-78f4e175.js';

interface EndpointRuntime {
    sendMessage: <ReturnType extends JsonValue, K extends DataTypeKey = DataTypeKey>(messageID: K, data: GetDataType<K, JsonValue>, destination?: Destination) => Promise<GetReturnType<K, ReturnType>>;
    onMessage: <Data extends JsonValue, K extends DataTypeKey = DataTypeKey>(messageID: K, callback: OnMessageCallback<GetDataType<K, Data>, GetReturnType<K, any>>) => (() => void);
    /**
     * @internal
     */
    handleMessage: (message: InternalMessage) => void;
    endTransaction: (transactionID: string) => void;
}

/**
 * Built on top of Bridge. Nothing much special except that Stream allows
 * you to create a namespaced scope under a channel name of your choice
 * and allows continuous e2e communication, with less possibility of
 * conflicting messageId's, since streams are strictly scoped.
 */
declare class Stream {
    private endpointRuntime;
    private streamInfo;
    private static initDone;
    private static openStreams;
    private emitter;
    private isClosed;
    constructor(endpointRuntime: EndpointRuntime, streamInfo: StreamInfo);
    /**
     * Returns stream info
     */
    get info(): StreamInfo;
    /**
     * Sends a message to other endpoint.
     * Will trigger onMessage on the other side.
     *
     * Warning: Before sending sensitive data, verify the endpoint using `stream.info.endpoint.isInternal()`
     * The other side could be malicious webpage speaking same language as webext-bridge
     * @param msg
     */
    send(msg?: JsonValue): void;
    /**
     * Closes the stream.
     * Will trigger stream.onClose(<callback>) on both endpoints.
     * If needed again, spawn a new Stream, as this instance cannot be re-opened
     * @param msg
     */
    close(msg?: JsonValue): void;
    /**
     * Registers a callback to fire whenever other endpoint sends a message
     * @param callback
     */
    onMessage<T extends JsonValue>(callback: (msg?: T) => void): HybridUnsubscriber;
    /**
     * Registers a callback to fire whenever stream.close() is called on either endpoint
     * @param callback
     */
    onClose<T extends JsonValue>(callback: (msg?: T) => void): HybridUnsubscriber;
    private handleStreamClose;
    private getDisposable;
}

export { Stream as S };
