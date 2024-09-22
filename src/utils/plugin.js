import { tick } from "svelte";
import types from "@/utils/types";

/**
 * Plugin defines various helpers related to the Figma plugin APIs.
 */
class Plugin {
    /**
     * Registers a new global notification/alert.
     *
     * @param {String} message   Notification message
     * @param {Number} [timeout] Auto close timeout in ms (defaults to 3500 ms)
     */
    static notify(message, timeout = 3500) {
        parent.postMessage({
            pluginMessage: {
                type: types.MESSAGE_NOTIFY,
                data: {
                    message: message,
                    timeout: timeout,
                },
            },
        }, '*');
    };

    /**
     * Closes the active `figma.ui` modal dialog.
     */
    static closePluginDialog() {
        parent.postMessage({
            pluginMessage: { type: types.MESSAGE_CLOSE },
        }, '*');
    };

    /**
     * Resizes the active `figma.ui` modal dialog.
     *
     * @param {Number} [width]  New width of the dialog (if not set the default one will be used).
     * @param {Number} [height] New height of the dialog (if not set the default one will be used).
     */
    static resizePluginDialog(width, height) {
        parent.postMessage({
            pluginMessage: {
                type: types.MESSAGE_RESIZE_UI,
                data: {
                    width: width,
                    height: height,
                },
            },
        }, '*');
    }

    /**
     * Autoresizes the active `figma.ui` modal dialog based on the app container height.
     *
     * @param {Number} [extraHeight] Extra offset height to add/subtract from the container height.
     * @param {String} [selector]    App container selector.
     */
    static async autoResizePluginDialog(extraHeight = 30, selector = "#app") {
        const elem = document.querySelector(selector);
        if (!elem) {
            return;
        }

        // wait for the dom changes to be reflected
        await tick();

        elem.classList.add("resizing");
        Plugin.resizePluginDialog(null, elem.offsetHeight + extraHeight);
        elem.classList.remove("resizing");
    }

    /**
     * Returns design nodes.
     *
     * @param  {Boolean} [onlySelected] Whether to return only the selected nodes (`false` by default).
     * @return {Promise}
     */
    static getNodes(onlySelected = false) {
        const state = ('get_nodes_' + Date.now());

        return new Promise(function(resolve, reject) {
            let forceTimeoutId = null;

            let handler = function(event) {
                let message = event.data.pluginMessage || {};

                if (
                    message.state == state && // is the correct response
                    message.type === types.MESSAGE_GET_NODES_RESPONSE
                ) {
                    clearTimeout(forceTimeoutId);

                    window.removeEventListener('message', handler);

                    resolve(message.data || []);
                }
            };

            window.addEventListener('message', handler);

            // force resolve after 10 seconds
            forceTimeoutId = setTimeout(() => {
                window.removeEventListener('message', handler);

                Promise.resolve([]);
            }, 10000);

            // request nodes
            parent.postMessage({
                pluginMessage: {
                    state: state,
                    type: types.MESSAGE_GET_NODES,
                    data: {
                        onlySelected: onlySelected,
                    },
                },
            }, '*');
        });
    }

    /**
     * Exports a single node image data.
     *
     * @param  {String} nodeId     ID of the node to export.
     * @param  {Object} [settings] Additional settings to be passed to the export command.
     * @return {Promise}
     */
    static exportNode(nodeId, settings) {
        const state = ('export_node_' + nodeId + Date.now());

        return new Promise(function(resolve, reject) {
            let forceTimeoutId = null;

            let handler = function(event) {
                let message = event.data.pluginMessage || {};

                if (
                    message.state == state && // is the correct response
                    message.type === types.MESSAGE_EXPORT_NODE_RESPONSE
                ) {
                    clearTimeout(forceTimeoutId);

                    window.removeEventListener('message', handler);

                    resolve(message.data || []);
                }
            };

            window.addEventListener('message', handler);

            // force resolve after 10 seconds
            forceTimeoutId = setTimeout(() => {
                window.removeEventListener('message', handler);
                Promise.resolve([]);
            }, 10000);

            // request nodes
            parent.postMessage({
                pluginMessage: {
                    state: state,
                    type: types.MESSAGE_EXPORT_NODE,
                    data: {
                        id: nodeId,
                        settings: settings,
                    },
                },
            }, '*');
        });
    }
}

export default Plugin;
