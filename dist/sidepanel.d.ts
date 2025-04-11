import { S as Stream } from './stream-01468154.js';
import { G as GetDataType, D as Destination, c as GetReturnType, O as OnMessageCallback, E as Endpoint } from './types-78f4e175.js';
import * as type_fest from 'type-fest';

declare global {
    interface Chrome {
        sidePanel?: {
            setPanelBehavior: (options: {
                openPanelOnActionClick: boolean;
            }) => void;
            setOptions: (options: {
                path?: string;
            }) => void;
            onShown: {
                addListener: (callback: () => void) => void;
                removeListener: (callback: () => void) => void;
                hasListener: (callback: () => void) => boolean;
            };
            onHidden: {
                addListener: (callback: () => void) => void;
                removeListener: (callback: () => void) => void;
                hasListener: (callback: () => void) => boolean;
            };
            getOptions: (options: {
                tabId?: number;
            }) => Promise<{
                path?: string;
            }>;
        };
    }
    var chrome: Chrome | undefined;
}
/**
 * Set up Chrome's sidepanel API for Manifest V3 extensions
 *
 * This function initializes the Chrome sidepanel API and configures its behavior.
 * Use this in your sidepanel entry point to ensure the sidepanel works correctly.
 *
 * Example usage in your sidepanel script:
 *
 * ```ts
 * import { setupSidepanel, sendMessage } from 'webext-bridge/sidepanel'
 *
 * // Initialize the sidepanel
 * setupSidepanel({ defaultPath: 'sidepanel.html' })
 *
 * // Send a message to background
 * sendMessage('get-data', { key: 'value' }, 'background')
 *   .then(response => console.log(response))
 *
 * // Listen for messages from other contexts
 * onMessage('update-sidebar', (message) => {
 *   console.log(message.data)
 *   // Update sidebar UI
 * })
 * ```
 *
 * @param options Configuration options for the sidepanel
 * @param options.defaultPath Default HTML path for the sidepanel
 */
declare function setupSidepanel(options?: {
    defaultPath?: string;
}): void;
/**
 * 注册侧边栏显示事件的回调函数
 * @param callback 当侧边栏显示时要执行的回调函数
 * @returns 用于移除事件监听器的函数
 */
declare function onSidepanelShown(callback: () => void): () => void;
/**
 * 注册侧边栏隐藏事件的回调函数
 * @param callback 当侧边栏隐藏时要执行的回调函数
 * @returns 用于移除事件监听器的函数
 */
declare function onSidepanelHidden(callback: () => void): () => void;
declare function isSidepanelSupported(): boolean;
declare const sendMessage: <ReturnType_1 extends type_fest.JsonValue, K extends string = string>(messageID: K, data: GetDataType<K, type_fest.JsonValue>, destination?: Destination) => Promise<GetReturnType<K, ReturnType_1>>;
declare const onMessage: <Data extends type_fest.JsonValue, K extends string = string>(messageID: K, callback: OnMessageCallback<GetDataType<K, Data>, GetReturnType<K, any>>) => () => void;
declare const openStream: (channel: string, destination: string | Endpoint) => Promise<Stream>;
declare const onOpenStreamChannel: (channel: string, callback: (stream: Stream) => void) => void;

export { isSidepanelSupported, onMessage, onOpenStreamChannel, onSidepanelHidden, onSidepanelShown, openStream, sendMessage, setupSidepanel };
