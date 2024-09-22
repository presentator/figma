<script>
    import { createEventDispatcher } from "svelte";
    import client from "@/utils/client";
    import plugin from "@/utils/plugin";

    export let projectId;

    const dispatch = createEventDispatcher();

    const defaultSizes = {
        // width: height
        1024: 1366,
        768: 1024,
        412: 824,
        375: 812,
        360: 740,
        324: 394,
    };

    let titleInput;
    let title = "";
    let type = "desktop";
    let width = 0;
    let height = 0;
    let isCreating = false;

    $: canCreate =
        !isCreating && projectId && title.length > 0 && (type === "desktop" || (width > 0 && height > 0));

    reset();

    async function reset() {
        title = "";

        // set the first node dimensions as default
        const nodes = await plugin.getNodes();
        if (nodes.length) {
            width = nodes[0].width << 0;

            // we first try to set the node height from a default devices list
            // because sometimes the designs are "longer" than the node viewport
            if (defaultSizes[width]) {
                height = defaultSizes[width];
            } else {
                height = nodes[0].height << 0;
            }
        }

        if (width > 0 && width <= 1024) {
            type = "mobile";
        }

        titleInput?.focus();
    }

    async function create() {
        if (!canCreate) {
            return;
        }

        isCreating = true;

        try {
            let size = type === "mobile" ? `${width}x${height}` : "";

            const item = await client.createPrototype(projectId, title, size);

            isCreating = false;

            reset();

            dispatch("create", item);
        } catch (err) {
            if (!err?.isAbort) {
                client.error(err);
                isCreating = false;
            }
        }
    }

    function keydownHandler(e) {
        if (e.code == "Enter" && canCreate) {
            create();
        }
    }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="prototype-create-row" on:keydown={keydownHandler}>
    <div class="input prototype-title-field">
        <input
            bind:this={titleInput}
            type="text"
            class="input__field prototype-title-field"
            placeholder="Prototype title"
            title="Prototype title"
            bind:value={title}
        />
    </div>

    <select title="Prototype Type" class="prototype-type-field" bind:value={type}>
        <option value="mobile">Mobile</option>
        <option value="desktop">Desktop</option>
    </select>

    {#if type === "mobile"}
        <div class="input">
            <input
                type="number"
                class="input__field prototype-size-field"
                placeholder="Width"
                title="Prototype width"
                min="1"
                bind:value={width}
            />
        </div>

        <div class="input">
            <input
                type="number"
                class="input__field prototype-size-field"
                placeholder="Height"
                title="Prototype height"
                min="1"
                bind:value={height}
            />
        </div>
    {/if}

    <button
        type="button"
        class="button button--primary"
        disabled={!canCreate}
        on:click|preventDefault={create}
    >
        Create prototype
    </button>
</div>

<style lang="scss">
    .prototype-create-row {
        background: var(--grey);
        display: flex;
        align-items: stretch;
        padding: 5px;
        gap: 5px;
        border-radius: var(--border-radius-small);
        .button {
            padding-left: 5px;
            padding-right: 5px;
            height: 30px;
        }
        input,
        select {
            border: transparent !important;
            outline: 0 !important;
            margin: 0 !important;
        }
        .prototype-title-field {
            flex-grow: 1;
        }
        .prototype-type-field {
            width: 110px;
        }
        .prototype-size-field {
            width: 50px;
            flex-shrink: 0;
        }
    }
</style>
