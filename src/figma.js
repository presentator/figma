import types from '@/utils/types';

const storageKey    = 'presentator_storage';
const defaultWidth  = 450;
const defaultHeight = 390;
const defaultExportSettings = {
    format: 'PNG',
    contentsOnly: true,
    constraint: {
        type: 'SCALE',
        value: 1,
    },
};

// Loads storage data and initializes the plugin UI.
async function initUI() {
    let storageData;
    try {
        storageData = await figma.clientStorage.getAsync(storageKey);
    } catch (e) {
        console.log('Storage init error:', e);
    }

    figma.showUI(__html__, { width: defaultWidth, height: defaultHeight });

    figma.ui.postMessage({
        type: types.MESSAGE_INIT_APP,
        data: storageData || {},
    });
}

// Returns serialized version of the visible nodes.
//
// If fromSelection is not set, it returns only top-level child nodes.
function getSerializedNodes(fromSelection = false) {
    const result = [];
    const nodes  = (fromSelection ? figma.currentPage.selection : figma.currentPage.children) || [];

    for (let i = nodes.length - 1; i >= 0; i--) {
        if (!nodes[i].visible) {
            continue;
        }

        result.push({
            // note: we don't assign directly the node object since
            // since name, width, height, and other props are getters
            // and we won't have access to them once sent over postMessage
            id:     nodes[i].id,
            name:   nodes[i].name,
            width:  nodes[i].width,
            height: nodes[i].height,
        });
    }

    return result;
}

// Returns single node by its id.
//
// The node must be visible AND from a selection or a top level page child.
function findNodeById(id) {
    const nodes = figma.currentPage.selection.concat(figma.currentPage.children);

    for (let i = nodes.length - 1; i >= 0; i--) {
        if (nodes[i].id == id && nodes[i].visible) {
            return nodes[i];
        }
    }

    return null;
}

// Exports single node by its id.
//
// The node must be visible AND from a selection or a top level page child.
async function exportNode(id, additionalSettings) {
    try {
        const node = findNodeById(id);
        if (node) {
            return await node.exportAsync(Object.assign({}, defaultExportSettings, additionalSettings || {}));
        }
    } catch (e) {
        console.log('Export node error:', e);
    }

    return null;
}

initUI();

figma.ui.onmessage = async (message) => {
    if (typeof message !== 'object' || message === null) {
        return;
    }

    switch (message.type) {
        case types.MESSAGE_SAVE_STORAGE:
            return figma.clientStorage.setAsync(storageKey, message.data || {});
        case types.MESSAGE_CLOSE:
            return figma.closePlugin();
        case types.MESSAGE_NOTIFY:
            return figma.notify(message.data.message, {
                timeout: (message.data.timeout || 4000) << 0,
            });
        case types.MESSAGE_RESIZE_UI:
            return figma.ui.resize(
                (message.data.width || defaultWidth) << 0,
                (message.data.height || defaultHeight) << 0,
            );
        case types.MESSAGE_GET_NODES:
            // send the result to the ui
            return figma.ui.postMessage({
                state: message.state,
                type:  types.MESSAGE_GET_NODES_RESPONSE,
                data:  getSerializedNodes(message.data.onlySelected),
            });
        case types.MESSAGE_EXPORT_NODE:
            let data = await exportNode(message.data.id, message.data.settings);

            // send the result to the ui
            return figma.ui.postMessage({
                state: message.state,
                type:  types.MESSAGE_EXPORT_NODE_RESPONSE,
                data:  data,
            });
    }
}
