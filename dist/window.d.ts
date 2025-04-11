import { S as Stream } from './stream-01468154.js';
import { G as GetDataType, D as Destination, c as GetReturnType, O as OnMessageCallback, E as Endpoint } from './types-78f4e175.js';
import * as type_fest from 'type-fest';

declare function setNamespace(nsps: string): void;
declare const sendMessage: <ReturnType_1 extends type_fest.JsonValue, K extends string = string>(messageID: K, data: GetDataType<K, type_fest.JsonValue>, destination?: Destination) => Promise<GetReturnType<K, ReturnType_1>>;
declare const onMessage: <Data extends type_fest.JsonValue, K extends string = string>(messageID: K, callback: OnMessageCallback<GetDataType<K, Data>, GetReturnType<K, any>>) => () => void;
declare const openStream: (channel: string, destination: string | Endpoint) => Promise<Stream>;
declare const onOpenStreamChannel: (channel: string, callback: (stream: Stream) => void) => void;

export { onMessage, onOpenStreamChannel, openStream, sendMessage, setNamespace };
