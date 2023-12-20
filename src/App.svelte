<script>
    import "./scss/main.scss";

    import Router, { replace } from "svelte-spa-router";
    import routes from "./routes";

    function handleRouteFailure() {
        replace("/");
    }
</script>

<Router {routes} on:conditionsFailed={handleRouteFailure} />
