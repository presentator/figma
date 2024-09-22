<script>
    import client from "@/utils/client";
    import { replace } from "svelte-spa-router";

    export let providers = [];

    let missingImages = {};
    let isAuthenticating = false;

    function oauth2(providerName) {
        if (isAuthenticating) {
            return;
        }

        isAuthenticating = true;

        client
            .authWithOAuth2(providerName)
            .then(() => {
                replace("/export");
            })
            .catch((err) => {
                client.error(err);
            });

        isAuthenticating = false;
    }
</script>

<div class="centered m-t-sm">
    <p class="centered section-title">Authorize with</p>

    <nav class="auth-providers-list">
        {#each providers as provider}
            <button
                type="button"
                class="auth-provider"
                class:disabled={isAuthenticating}
                title={provider.displayName}
                on:click={() => oauth2(provider.name)}
            >
                {#if missingImages[provider.name]}
                    <span class="icon icon--key" />
                {:else}
                    <img
                        src="{client.baseUrl}/_/images/oauth2/{provider.name}.svg"
                        alt="{provider.displayName} logo"
                        on:error={() => {
                            missingImages[provider.name] = true;
                        }}
                        on:load={() => {
                            delete missingImages[provider.name];
                        }}
                    />
                {/if}
            </button>
        {/each}
    </nav>
</div>

<style lang="scss">
    .auth-providers-list {
        display: flex;
        flex-wrap: wrap;
        width: 100%;
        align-items: center;
        justify-content: center;
        gap: 16px;
    }
    .auth-provider {
        --providerSize: 36px;

        display: inline-flex;
        flex-shrink: 0;
        cursor: pointer;
        align-items: center;
        justify-content: center;
        width: var(--providerSize);
        height: var(--providerSize);
        text-decoration: none;
        font-size: 1.4rem;
        outline: 0;
        background: none;
        border: 0;
        img {
            width: auto;
            height: auto;
            max-width: 100%;
            max-height: 100%;
        }
        &.disabled {
            opacity: 0.5;
            pointer-events: none;
        }
    }
</style>
