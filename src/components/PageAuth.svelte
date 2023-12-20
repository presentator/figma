<script>
    import { replace } from "svelte-spa-router";
    import client from "@/utils/client";
    import plugin from "@/utils/plugin";
    import storage from "@/utils/storage";
    import SocialAuth from "./SocialAuth.svelte";

    let passwordInput;
    let identity = "";
    let password = "";
    let isLoading = false;
    let isSubmitting = false;
    let authMethods = {};

    $: baseUrl = storage.getItem("baseUrl") || import.meta.env.PR_DEFAULT_BASE_URL;

    loadAuthMethods();

    async function loadAuthMethods() {
        isLoading = true;

        try {
            authMethods = await client.listAuthMethods();

            // load default form fields
            password = "";
            identity = storage.getItem("identity") || storage.getItem("email") || "";
            if (identity) {
                setTimeout(() => {
                    passwordInput?.focus();
                }, 0);
            }
        } catch (err) {
            client.error(err);
        }

        isLoading = false;

        plugin.autoResizePluginDialog(50);
    }

    async function submit() {
        if (isSubmitting) {
            return;
        }

        isSubmitting = true;

        try {
            await client.authWithPassword(identity.trim(), password);

            replace("/export");
        } catch (err) {
            client.error(err);
        }

        isSubmitting = false;
    }
</script>

<div class="panel">
    <header class="panel-header">
        <div class="logo">Presentator</div>
        <button
            class="txt-hint link-fade button button--tertiary"
            title="Change Presentator URL"
            on:click|preventDefault={() => replace("/url")}
        >
            {client.baseUrl} (change)
        </button>
    </header>

    <div class="panel-content">
        {#if isLoading}
            <center>
                <span class="icon icon--spinner icon--spin" />
            </center>
        {:else if !authMethods.emailPassword && !authMethods.usernamePassword && !authMethods.authProviders?.length}
            <center>
                <p>No auth methods found.</p>
            </center>
        {:else}
            {#if authMethods.emailPassword || authMethods.usernamePassword}
                <form on:submit|preventDefault={submit}>
                    <div class="form-field">
                        <label for="identity_input" class="section-title">Username or email</label>
                        <div class="input input--with-icon">
                            <span class="icon icon--key" />
                            <input
                                type="text"
                                id="identity_input"
                                class="input__field"
                                placeholder=" "
                                bind:value={identity}
                            />
                        </div>
                    </div>
                    <div class="form-field">
                        <label for="password_input" class="section-title">Password</label>
                        <div class="input input--with-icon">
                            <span class="icon icon--lock-on" />
                            <input
                                bind:this={passwordInput}
                                type="password"
                                id="password_input"
                                class="input__field"
                                placeholder=" "
                                bind:value={password}
                            />
                        </div>
                    </div>

                    <button type="submit" class="button button--primary block" disabled={isSubmitting}>
                        Authorize
                    </button>
                </form>
            {/if}

            {#if authMethods.authProviders?.length}
                <SocialAuth providers={authMethods.authProviders} />
            {/if}
        {/if}
    </div>

    <footer class="panel-footer">
        <a
            href="{baseUrl}/#/register"
            target="_blank"
            rel="noopener"
            class="button button--tertiary m-r-auto"
        >
            Create an account
        </a>
        <button
            type="button"
            class="button button--secondary"
            disabled={isSubmitting}
            on:click|preventDefault={() => plugin.closePluginDialog()}
        >
            Close
        </button>
    </footer>
</div>
