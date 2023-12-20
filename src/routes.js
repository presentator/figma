import { wrap }      from "svelte-spa-router/wrap";
import client        from "@/utils/client";
import PageIndex     from "@/components/PageIndex.svelte";
import PageAuth      from "@/components/PageAuth.svelte";
import PageUrlChange from "@/components/PageUrlChange.svelte";
import PageExport    from "@/components/PageExport.svelte";

export default {
    "/export": wrap({
        component:  PageExport,
        conditions: [(_) => client.token],
    }),
    "/auth": wrap({
        component:  PageAuth,
        conditions: [(_) => !client.token],
    }),
    "/url": wrap({
        component: PageUrlChange,
    }),
    "*": wrap({
        component: PageIndex,
    }),
};
