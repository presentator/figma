<script>
    import client from "@/utils/client";
    import storage from "@/utils/storage";
    import PrototypeCreate from "./PrototypeCreate.svelte";

    export let projectId;
    export let prototypeId;

    let prototypes = [];
    let isLoading = false;

    $: if (projectId) {
        load();
    }

    async function load() {
        if (!projectId) {
            return;
        }

        prototypes = [];
        isLoading = true;

        try {
            prototypes = await client.getPrototypes(projectId);

            prototypeId = "";
            if (prototypes.length) {
                const lastSelected = storage.getItem("prototypeId");
                if (prototypes.find((p) => p.id == lastSelected)) {
                    prototypeId = lastSelected;
                } else {
                    // fallback to the latest available prototype
                    prototypeId = prototypes[prototypes.length - 1].id;
                }
            }

            isLoading = false;
        } catch (err) {
            if (!err?.isAbort) {
                client.error(err);
                isLoading = false;
            }
        }
    }
</script>

<div class="form-field">
    <label for="prototype_select" class="section-title">Prototype</label>

    <select id="prototype_select" disabled={!projectId || isLoading} bind:value={prototypeId}>
        {#if isLoading}
            <option>Loading...</option>
        {:else if !projectId}
            <option>First select a project to load its prototypes</option>
        {:else}
            {#each prototypes as prototype}
                <option value={prototype.id}>{prototype.title}</option>
            {/each}
            <option value="">+ New prototype</option>
        {/if}
    </select>

    {#if projectId && !isLoading && prototypeId == ""}
        <PrototypeCreate
            {projectId}
            on:create={(e) => {
                if (e.detail) {
                    prototypes.push(e.detail);
                    prototypes = prototypes;
                    prototypeId = e.detail.id;
                }
            }}
        />
    {/if}
</div>
