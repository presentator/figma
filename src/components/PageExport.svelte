<script>
    import client from "@/utils/client";
    import plugin from "@/utils/plugin";
    import storage from "@/utils/storage";
    import ProjectPicker from "./ProjectPicker.svelte";
    import PrototypePicker from "./PrototypePicker.svelte";

    let projectId;
    let prototypeId;
    let exportFilter = storage.getItem("exportFilter") || "all";
    let exportScale = storage.getItem("exportScale") || "1";
    let isExporting = false;
    let successfullyExported = 0;

    $: if (exportFilter) {
        storage.setItem("exportFilter", exportFilter);
    }

    $: if (exportScale) {
        storage.setItem("exportScale", exportScale);
    }

    $: canExport = !isExporting && projectId && prototypeId;

    $: prototypeViewUrl = `${client.baseUrl}/#/projects/${projectId}/prototypes/${prototypeId}`;

    $: if (prototypeId != -1) {
        plugin.autoResizePluginDialog();
    }

    async function exportFrames() {
        if (isExporting) {
            return;
        }

        if (!projectId || !prototypeId) {
            plugin.notify("Please make sure to select a project and prototype first.");
            return;
        }

        isExporting = true;

        successfullyExported = 0;

        try {
            const frames = await plugin.getFrames(exportFilter === "selection");
            if (!frames.length) {
                throw new Error("No frames to export.");
            }

            // fetch all prototype screens to determine later whether to send create or update (replace) request
            const screens = await client.getScreens(prototypeId);

            const exportSettings = {
                constraint: {
                    type: "SCALE",
                    value: (exportScale || 1) << 0,
                },
            };

            for (let frame of frames) {
                const frameData = await plugin.exportFrame(frame.id, exportSettings);
                if (!frameData) {
                    continue;
                }

                const fileName = (frame.name + frame.id).toLowerCase().replace(/\W+/g, "_");

                const data = {
                    prototype: prototypeId,
                    title: frame.name,
                    file: new File([frameData], fileName + ".png", { type: "image/png" }),
                };

                // use an existing screen if its title matches with the frame name
                let existingScreenId = null;
                for (let j = screens.length - 1; j >= 0; j--) {
                    if (screens[j].file.indexOf(fileName) >= 0) {
                        existingScreenId = screens[j].id;
                        break;
                    }
                }

                // note: executes non-concurrently to ensure the correct screens upload order
                try {
                    await client.upsertScreen(data, existingScreenId);
                    successfullyExported++;
                } catch {}
            }

            if (successfullyExported != frames.length) {
                plugin.notify("Failed to export all of the selected screens.");
            }
        } catch (err) {
            client.error(err);
        }

        isExporting = false;
    }

    function resetExportedState() {
        successfullyExported = 0;
    }
</script>

<div class="panel">
    <div class="panel-content">
        {#if successfullyExported}
            <div class="alert success centered">
                Successfully exported {successfullyExported}
                {successfullyExported == 1 ? "screen" : "screens"}.
                <br />
                <a href={prototypeViewUrl} target="_blank" rel="noopener">
                    <strong>View project in Presentator</strong>
                </a>
            </div>
            <div class="flex centered">
                {#if isExporting}
                    <center>
                        <span class="icon icon--spinner icon--spin" />
                    </center>
                {:else}
                    <button type="button" class="button button--tertiary" on:click={resetExportedState}>
                        Go back
                    </button>
                {/if}
            </div>
        {:else}
            <ProjectPicker
                bind:projectId
                on:load={() => {
                    plugin.autoResizePluginDialog();
                }}
            />

            <PrototypePicker {projectId} bind:prototypeId />

            <div class="flex">
                <div class="form-field m-b-0">
                    <label for="export_screens_select" class="section-title">Screens to export</label>
                    <select id="export_screens_select" class="screens-select" bind:value={exportFilter}>
                        <option value="all">All screens</option>
                        <option value="selection">Only the selected screen(s)</option>
                    </select>
                </div>

                <div class="form-field m-b-0 export-scale-field">
                    <label for="export_scale_select" class="section-title">Export scale</label>
                    <select id="export_scale_select" title="Export scale" bind:value={exportScale}>
                        <option value="1">1x</option>
                        <option value="2">2x</option>
                    </select>
                </div>
            </div>
        {/if}
    </div>

    <footer class="panel-footer">
        <button
            class="button button--tertiary-destructive link-fade m-r-auto"
            disabled={isExporting}
            on:click|preventDefault={() => client.logout()}
        >
            Logout
        </button>

        <button
            class="button button--secondary"
            disabled={isExporting}
            on:click|preventDefault={() => plugin.closePluginDialog()}
        >
            Close
        </button>

        {#if !successfullyExported}
            <button
                class="button button--primary"
                disabled={!canExport}
                on:click|preventDefault={exportFrames}
            >
                {isExporting ? "Exporting..." : "Export"}
            </button>
        {/if}
    </footer>
</div>

<style>
    .export-scale-field {
        width: 150px;
    }
</style>
