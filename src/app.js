import storage from "@/utils/storage"
import client  from "@/utils/client"
import types   from "@/utils/types"
import App     from "./App.svelte"

let app;

function initApp() {
    const target = document.getElementById('app');
    if (!target) {
        return;
    }

    // destroy previous app instantiations to cleanup any remaining listeners.
    app?.$destroy();

    // clear any content left (eg. initial loading text)
    target.innerHTML = "";

    app = new App({ target });
}

if (import.meta.env.MODE === "development") {
    // vite dev server
    initApp();
} else {
    // figma app
    window.addEventListener("message", async (event) => {
        if (!event?.data?.pluginMessage) {
            return;
        }

        const message = event.data.pluginMessage;

        if (message.type != types.MESSAGE_INIT_APP || app) {
            return // not a init message or app already inited
        }

        storage.load(message.data);

        try {
            client.token && await client.authRefresh();
        } catch (err) {
            client.error(err);
        }

        initApp();
    });
}
