<script>
    import { tick, createEventDispatcher } from "svelte";
    import client from "@/utils/client";

    const dispatch = createEventDispatcher();

    let titleInput;
    let title = "";
    let isActive = false;
    let isCreating = false;

    $: canCreate = isActive && !isCreating && title.length > 0;

    async function activate() {
        isActive = true;
        title = "";

        await tick();

        titleInput?.focus();
    }

    function deactivate() {
        isActive = false;
    }

    async function create() {
        if (!canCreate) {
            return;
        }

        isCreating = true;

        try {
            const item = await client.createProject(title);

            dispatch("create", item);

            deactivate();
        } catch (err) {
            client.error(err);
        }

        isCreating = false;
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="project-item new" class:active={isActive}>
    {#if isActive}
        <div class="thumb">
            <button
                type="button"
                class="button button--secondary"
                disabled={isCreating}
                on:click|preventDefault={deactivate}
            >
                Cancel
            </button>
            <button
                type="button"
                class="button button--primary"
                disabled={!canCreate}
                on:click|preventDefault={create}
            >
                Create
            </button>
        </div>

        <div class="content">
            <div class="input">
                <input
                    bind:this={titleInput}
                    bind:value={title}
                    type="text"
                    class="input__field"
                    placeholder="Project title"
                />
            </div>
        </div>
    {:else}
        <div class="thumb" on:click|preventDefault={activate}>
            <div class="sign">+</div>
            <div class="txt">New project</div>
        </div>
    {/if}
</div>
