<script>
    import { replace } from "svelte-spa-router";
    import client from "@/utils/client";

    if (client.token) {
        replace("/export");
    } else {
        replace("/auth");
    }
</script>
