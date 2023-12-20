<script>
    import { onMount } from "svelte";
    import { replace } from "svelte-spa-router";
    import client from "@/utils/client";
    import plugin from "@/utils/plugin";
    import storage from "@/utils/storage";

    let url = client.baseUrl;

    async function submit() {
        storage.setItem("baseUrl", url.trim().replace(/\/+$/, "") || import.meta.env.PR_DEFAULT_BASE_URL);

        await client.isV3(true);

        replace("/");
    }

    onMount(() => {
        plugin.resizePluginDialog();
    });
</script>

<div class="panel">
    <header class="panel-header">
        <div class="logo">Presentator</div>
    </header>

    <div class="panel-content">
        <form on:submit|preventDefault={submit}>
            <div class="form-field">
                <label for="url_input" class="section-title">Presentator URL</label>
                <div class="input input--with-icon">
                    <div class="icon icon--link-connected" />
                    <input
                        id="url_input"
                        type="url"
                        class="input__field"
                        placeholder={import.meta.env.PR_DEFAULT_BASE_URL}
                        bind:value={url}
                    />
                </div>
            </div>

            <button type="submit" class="button button--primary block m-t-auto">Save and go back</button>
        </form>
    </div>

    <footer class="panel-footer">
        <button
            type="button"
            class="button button--secondary m-l-auto"
            on:click|preventDefault={() => plugin.closePluginDialog()}
        >
            Close
        </button>
    </footer>
</div>
