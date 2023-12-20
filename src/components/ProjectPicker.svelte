<script>
    import { createEventDispatcher, onDestroy } from "svelte";
    import client from "@/utils/client";
    import storage from "@/utils/storage";
    import ProjectCreate from "@/components/ProjectCreate.svelte";

    export let projectId;

    const perPage = 23;
    const dispatch = createEventDispatcher();

    let projects = [];
    let search = "";
    let isLoading = false;
    let lastPage = 1;
    let lastFetched = 0;
    let debounceTimeout;
    let lastSearch = "";

    $: canLoadMore = lastFetched >= perPage;

    $: if (lastSearch != search) {
        lastSearch = search;
        debounceLoad();
    }

    load();

    async function debounceLoad() {
        clearTimeout(debounceTimeout);

        isLoading = true;
        debounceTimeout = setTimeout(load, 200);
    }

    async function load(page = 1) {
        isLoading = true;

        lastPage = page;

        if (page <= 1) {
            projects = [];
            lastFetched = 0;
        }

        projectId = ""; // reset

        try {
            const items = await client.getProjects(page, perPage, search);

            lastFetched = items.length;

            projects = projects.concat(items);

            // restore last projectId selection if it exists in the loaded list
            const lastSelectedProjectId = storage.getItem("projectId") || "";
            if (!!projects.find((p) => p.id == lastSelectedProjectId)) {
                projectId = lastSelectedProjectId;
            }

            isLoading = false;

            dispatch("load", projects);
        } catch (err) {
            if (!err?.isAbort) {
                client.error(err);
                isLoading = false;
            }
        }
    }

    function selectProject(project) {
        projectId = project.id;
        storage.setItem("projectId", projectId);
    }

    onDestroy(() => {
        clearTimeout(debounceTimeout);
    });
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="search-bar">
    <div class="section-title">
        Project
        {#if isLoading}
            <span class="icon icon--spinner icon--spin" />
        {:else}
            <span title="Reload" class="icon icon--swap" on:click|preventDefault={() => load()} />
        {/if}
    </div>
    <div class="input input--with-icon m-l-auto">
        <div class="icon icon--search" />
        <input type="search" class="input__field" placeholder="Search projects..." bind:value={search} />
    </div>
</div>

<div class="project-picker">
    {#if search && !projects.length}
        <p class="centered">{isLoading ? "Loading..." : "No projects found"}</p>
    {:else}
        <div class="projects-list m-b-xs" class:fade={isLoading}>
            <ProjectCreate
                on:create={(e) => {
                    projects.unshift(e.detail);
                    projects = projects;
                    selectProject(e.detail);
                    search = "";
                }}
            />

            {#each projects as project}
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    data-project-id={project.id}
                    class="project-item"
                    class:selected={projectId == project.id}
                    on:click|preventDefault={() => selectProject(project)}
                >
                    <div class="thumb">
                        {#if project.featuredScreen}
                            <img src={project.featuredScreen} alt={project.title} />
                        {/if}
                    </div>
                    <div class="content">
                        <span class="title">{project.title} {project.archived ? "(Archived)" : ""}</span>
                    </div>
                </div>
            {/each}
        </div>
    {/if}

    {#if canLoadMore}
        <center>
            <button
                type="button"
                class="button button--secondary"
                disabled={isLoading}
                on:click|preventDefault={() => load(lastPage + 1)}
            >
                Load more
            </button>
        </center>
    {/if}

    {#if search}
        <center>
            <button
                type="button"
                class="button button--tertiary link-fade"
                disabled={isLoading}
                on:click|preventDefault={() => {
                    search = "";
                }}
            >
                Clear filters
            </button>
        </center>
    {/if}
</div>

<style>
    .project-picker {
        overflow: auto;
        max-height: 270px;
        margin-bottom: var(--size-small);
    }
</style>
