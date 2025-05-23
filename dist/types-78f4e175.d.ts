import { JsonValue, Jsonify } from 'type-fest';

type RuntimeContext = 'devtools' | 'background' | 'popup' | 'options' | 'content-script' | 'window' | 'sidepanel';
interface Endpoint {
    context: RuntimeContext;
    tabId: number;
    frameId?: number;
}
interface BridgeMessage<T extends JsonValue> {
    sender: Endpoint;
    id: string;
    data: T;
    timestamp: number;
}
type OnMessageCallback<T extends JsonValue, R = void | JsonValue> = (message: BridgeMessage<T>) => R | Promise<R>;
interface InternalMessage {
    origin: Endpoint;
    destination: Endpoint;
    transactionId: string;
    hops: string[];
    messageID: string;
    messageType: 'message' | 'reply';
    err?: JsonValue;
    data?: JsonValue | void;
    timestamp: number;
}
interface StreamInfo {
    streamId: string;
    channel: string;
    endpoint: Endpoint;
}
interface HybridUnsubscriber {
    (): void;
    dispose: () => void;
    close: () => void;
}
type Destination = Endpoint | RuntimeContext | string;
declare const ProtocolWithReturnSymbol: unique symbol;
interface ProtocolWithReturn<Data, Return> {
    data: Jsonify<Data>;
    return: Jsonify<Return>;
    /**
     * Type differentiator only.
     */
    [ProtocolWithReturnSymbol]: true;
}
/**
 * Extendable by user.
 */
interface ProtocolMap {
}
type DataTypeKey = keyof ProtocolMap extends never ? string : keyof ProtocolMap;
type GetDataType<K extends DataTypeKey, Fallback extends JsonValue = undefined> = K extends keyof ProtocolMap ? ProtocolMap[K] extends (...args: infer Args) => any ? Args['length'] extends 0 ? undefined : Args[0] : ProtocolMap[K] extends ProtocolWithReturn<infer Data, any> ? Data : ProtocolMap[K] : Fallback;
type GetReturnType<K extends DataTypeKey, Fallback extends JsonValue = undefined> = K extends keyof ProtocolMap ? ProtocolMap[K] extends (...args: any[]) => infer R ? R : ProtocolMap[K] extends ProtocolWithReturn<any, infer Return> ? Return : void : Fallback;

export { BridgeMessage as B, Destination as D, Endpoint as E, GetDataType as G, HybridUnsubscriber as H, InternalMessage as I, OnMessageCallback as O, ProtocolWithReturn as P, RuntimeContext as R, StreamInfo as S, ProtocolMap as a, DataTypeKey as b, GetReturnType as c };
