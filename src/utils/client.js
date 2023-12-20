import { replace } from "svelte-spa-router";
import PocketBase, { BaseAuthStore, ClientResponseError, getTokenPayload } from "pocketbase";
import storage from "@/utils/storage";
import plugin from "@/utils/plugin";

// create a blank temp Store because localStorage is not enabled inside the plugin iframe.
class TempStore extends BaseAuthStore {
}
const tempStore = new TempStore();

/**
 * Client is a thin abstraction that provides unified access over
 * some of the Presentator v2 and v3 web APIs.
 *
 * ```js
 * @import client from '@/utils/client';
 *
 * let isV3 = await client.isV3();
 * ```
 */
class Client {
    constructor() {
        this._isV3 = undefined;
    }

    /**
     * @return {String}
     */
    get baseUrl() {
        const url = storage.getItem("baseUrl") || import.meta.env.PR_DEFAULT_BASE_URL;

        return url.replace(/\/+$/g, '');
    }

    /**
     * @return {String}
     */
    get token() {
        return storage.getItem("token") || "";
    }

    /**
     * Clears the currently stored client auth data and optionally
     * redirect to the login route.
     *
     * @param {Boolean} [redirect]
     */
    async logout(redirect = true) {
        storage.removeItem("token");

        if (redirect) {
            replace("/");
        }
    }

    /**
     * Generic API error handler.
     *
     * @param {Error} err
     */
    error(err) {
        if (!err) {
            return;
        }

        const status = err.status || err.response?.status || 400;
        const msg    = err.response?.message || err.response?.data?.message || err.message || '';

        if (status == 401 || status == 403) {
            this.logout();
        }

        if (msg) {
            plugin.notify(msg);
        }
    }

    /**
     * Checks whether the current client API is for Presentator v2 or v3.
     *
     * @param  {Boolean} [clearCache]
     * @return {Promise<Boolean>}
     */
    async isV3(clearCache = false) {
        if (clearCache || typeof this._isV3 != "boolean") {
            try {
                const pb   = new PocketBase(this.baseUrl, tempStore);
                const data = await pb.health.check();
                this._isV3 = data.code == 200;
            } catch {
                this._isV3 = false;
            }
        }

        return this._isV3;
    }

    /**
     * Returns list with all of the available auth methods and OAuth2 providers.
     *
     * @return {Promise<Object>}
     */
    async listAuthMethods() {
        let result = {
            emailPassword:    false,
            usernamePassword: false,
            authProviders:    [],
        };

        if (await this.isV3()) {
            const pb = new PocketBase(this.baseUrl, tempStore);

            result = await pb.collection("users").listAuthMethods();
        } else {
            const response = await fetch(this.baseUrl + "/api/users/auth-methods")
            const data     = await response.json();

            this._checkForV2ResponseError(response, data);

            result.emailPassword = data.emailPassword;
        }

        return result;
    }

    /**
     * Validates and refreshes the current auth token.
     *
     * @return {Promise<void>}
     */
    async authRefresh() {
        let data = {};

        if (await this.isV3()) {
            const pb = new PocketBase(this.baseUrl, tempStore);

            pb.authStore.save(this.token);

            data = await pb.collection("users").authRefresh();
        } else {
            const response = await fetch(this.baseUrl + "/api/users/refresh", {
                method:  "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + this.token,
                },
            });

            data = await response.json();

            this._checkForV2ResponseError(response, data);
        }

        storage.setItem("token", data.token || "");
    }

    /**
     * Performs password authentication with the provided credentials.
     *
     * @param  {String} identity Username or email
     * @param  {String} password
     * @return {Promise<void>}
     */
    async authWithPassword(identity, password) {
        let data;
        if (await this.isV3()) {
            const pb = new PocketBase(this.baseUrl, tempStore);

            data = await pb.collection("users").authWithPassword(identity, password);
        } else {
            const response = await fetch(this.baseUrl + "/api/users/login", {
                method:  "POST",
                body:    JSON.stringify({ email: identity, password: password }),
                headers: {"Content-Type": "application/json"},
            })

            data = await response.json();

            this._checkForV2ResponseError(response, data);
        }

        storage.setItem("identity", identity);
        storage.setItem("token", data.token);
    }

    /**
     * Performs OAuth2 authentication with the specified provider.
     *
     * NB! This is supported only in Presentator v3.
     *
     * @param  {String} provider
     * @return {Object}
     */
    async authWithOAuth2(provider) {
        const pb = new PocketBase(this.baseUrl, tempStore);

        return pb.collection("users").authWithOAuth2({
            provider: provider,
        }).then((data) => {
            storage.setItem("token", data.token);
            return data;
        });
    }

    /**
     * Returns paginated projects list.
     *
     * @param  {Number} page
     * @param  {Number} perPage
     * @param  {String} [search]
     * @return {Promise<Array>}
     */
    async getProjects(page = 1, perPage = 30, search = "") {
        let items = [];

        if (await this.isV3()) {
            const pb = new PocketBase(this.baseUrl, tempStore);

            pb.authStore.save(this.token);

            const result = await pb.collection("projectUserPreferences").getList(page, perPage, {
                skipTotal: 1,
                filter:    pb.filter("project.title~{:search}", { search }),
                expand:    "project.prototypes(project).screens(prototype)",
                sort:      "-lastVisited,-favorite,-project.created",
            });

            for (let pref of result.items) {
                if (pref.expand?.project) {
                    items.push(pref.expand.project);
                }
            }
        } else {
            const queryParams = {
                "envelope":      1,
                "page":          page,
                "per-page":      perPage,
                "search[title]": search,
            }

            let query = "";
            for (let key in queryParams) {
                if (query != "") {
                    query += "&"
                }
                query += (encodeURIComponent(key) + "=" + encodeURIComponent(queryParams[key]));
            }

            const response = await fetch(this.baseUrl + "/api/projects?" + query, {
                method:  "GET",
                headers: {
                    "Content-Type":  "application/json",
                    "Authorization": "Bearer " + this.token,
                },
            })

            const data = await response.json();

            this._checkForV2ResponseError(response, data.response);

            // v2 list api will always return the last page result even
            // when requested with nonexisting page and will break the "Load more" pagination
            if (data.headers["x-pagination-total-count"] >= page) {
                items = data.response;
            }
        }

        return items.map((item) => this._normalizeProjectData(item));
    }

    /**
     * Creates a new blank project.
     *
     * @param  {String} title
     * @return {Promise<Object>}
     */
    async createProject(title) {
        let result;

        if (await this.isV3()) {
            const pb = new PocketBase(this.baseUrl, tempStore);

            pb.authStore.save(this.token);

            result = await pb.collection("projects").create({
                title: title,
                users: getTokenPayload(this.token).id,
            });
        } else {
            const response = await fetch(this.baseUrl + "/api/projects", {
                method:  "POST",
                body:    JSON.stringify({ title }),
                headers: {
                    "Content-Type":  "application/json",
                    "Authorization": "Bearer " + this.token,
                },
            })

            result = await response.json();

            this._checkForV2ResponseError(response, result);
        }

        return this._normalizeProjectData(result);
    }

    /**
     * Returns all prototypes for the specified project.
     *
     * @param  {Number|String} projectId
     * @return {Promise<Array>}
     */
    async getPrototypes(projectId) {
        let items = [];

        if (await this.isV3()) {
            const pb = new PocketBase(this.baseUrl, tempStore);

            pb.authStore.save(this.token);

            items = await pb.collection("prototypes").getFullList({
                filter: pb.filter("project={:id}", { id: projectId }),
                sort:   "created",
            });
        } else {
            const response = await fetch(this.baseUrl + "/api/prototypes?page=1&per-page=100&search[projectId]=" + encodeURIComponent(projectId), {
                method:  "GET",
                headers: {
                    "Content-Type":  "application/json",
                    "Authorization": "Bearer " + this.token,
                },
            })

            items = await response.json();

            this._checkForV2ResponseError(response, items);
        }

        return items.map((item) => this._normalizePrototypeData(item));
    }

    /**
     * Creates a new blank prototype.
     *
     * @param  {Number|String} projectId
     * @param  {String}        title
     * @param  {Size}          [size]
     * @return {Promise<Object>}
     */
    async createPrototype(projectId, title, size = "") {
        let result;

        if (await this.isV3()) {
            const pb = new PocketBase(this.baseUrl, tempStore);

            pb.authStore.save(this.token);

            result = await pb.collection("prototypes").create({
                title:   title,
                project: projectId,
                size:    size,
                scale:   !size ? 1 : 0,
            });
        } else {
            const body = {
                projectId: projectId,
                title:     title,
            };

            const sizeParts = size.split("x");
            if (sizeParts.length == 2) {
                body.width  = sizeParts[0] << 0;
                body.height = sizeParts[1] << 0;
                body.type = "mobile";
                body.scaleFactor = 0;
            } else {
                body.type = "desktop";
                body.scaleFactor = 1;

            }

            const response = await fetch(this.baseUrl + "/api/prototypes", {
                method:  "POST",
                body:    JSON.stringify(body),
                headers: {
                    "Content-Type":  "application/json",
                    "Authorization": "Bearer " + this.token,
                },
            })

            result = await response.json();

            this._checkForV2ResponseError(response, result);
        }

        return this._normalizePrototypeData(result);
    }

    /**
     * Returns all screens for the specified prototype.
     *
     * @param  {Number|String} prototypeId
     * @return {Promise<Array>}
     */
    async getScreens(prototypeId) {
        let items = [];

        if (await this.isV3()) {
            const pb = new PocketBase(this.baseUrl, tempStore);

            pb.authStore.save(this.token);

            items = await pb.collection("screens").getFullList({
                filter: pb.filter("prototype={:id}", { id: prototypeId }),
            });
        } else {
            const response = await fetch(this.baseUrl + "/api/screens?page=1&per-page=199&search[prototypeId]=" + encodeURIComponent(prototypeId), {
                method: "GET",
                headers: {
                    "Content-Type":  "application/json",
                    "Authorization": "Bearer " + this.token,
                },
            })

            items = await response.json();

            this._checkForV2ResponseError(response, items);
        }

        return items.map((item) => this._normalizeScreenData(item));
    }

    /**
     * Create or update a screen.
     *
     * The payload is expected to match with the v3 fields name.
     *
     * @param  {FormData} payload
     * @param  {String}   [screenId]
     * @return {Promise<Object>}
     */
    async upsertScreen(payload, screenId = "") {
        let result;

        if (await this.isV3()) {
            const pb = new PocketBase(this.baseUrl, tempStore);
            pb.autoCancellation(false);
            pb.authStore.save(this.token);

            if (screenId) {
                result = await pb.collection("screens").update(screenId, payload);
            } else {
                result = await pb.collection("screens").create(payload);
            }
        } else {
            // normalize payload to the v2 format
            let formData = new FormData();
            const remap = {"prototype": "prototypeId"};
            for (let k in payload) {
                formData.append(remap[k] || k, payload[k]);
            }
            const requestData = {
                method:  screenId ? "PATCH" : "POST",
                body:    formData,
                headers: {
                    "Authorization": "Bearer " + this.token,
                },
            };

            let response;
            if (screenId)  {
                response = await fetch(this.baseUrl + "/api/screens/" + encodeURIComponent(screenId), requestData);
            } else {
                response = await fetch(this.baseUrl + "/api/screens", requestData);
            }

            result = await response.json();

            this._checkForV2ResponseError(response, result);
        }

        return this._normalizeScreenData(result);
    }

    // ---------------------------------------------------------------

    /**
     * Throws ClientResponseError in case a non 20x response is detected.
     *
     * @param  {Object} response
     * @param  {Mixed}  data
     * @throws {ClientResponseError}
     */
    _checkForV2ResponseError(response, data) {
        if (response.status >= 400) {
            throw new ClientResponseError({
                url:    response.url,
                status: response.status,
                data:   data,
            });
        }
    }

    /**
     * Returns a new POJO with normalized project data.
     *
     * @param  {Object} data
     * @return {Object}
     */
    _normalizeProjectData(data) {
        const result = {
            id:             data.id || "",
            title:          data.title,
            archived:       !!data.archived,
            featuredScreen: "",
        }

        if (data.featuredScreen?.medium) {
            result.featuredScreen = data.featuredScreen?.medium;
        } else {
            const lastPrototype = data.expand?.["prototypes(project)"].filter((p) => p.expand?.["screens(prototype)"].length)
                ?.sort(function (a, b) {
                    if (a.created < b.created) {
                        return -1;
                    }
                    if (a.created > b.created) {
                        return 1;
                    }
                    return 0;
                })?.pop();

            let screen = null;

            // try to locate the first screen from the ordered list
            if (lastPrototype?.screensOrder?.[0]) {
                screen = lastPrototype?.expand?.["screens(prototype)"]?.find((screen) => screen.id == lastPrototype.screensOrder?.[0]);
            }

            // fallback to the first in the expands list
            if (!screen) {
                screen = lastPrototype?.expand?.["screens(prototype)"]?.[0];
            }

            if (screen) {
                result.featuredScreen = [
                    this.baseUrl,
                    "api/files",
                    screen.collectionId,
                    screen.id,
                    screen.file
                ].join("/") + "?thumb=100x100t";
            }
        }

        return result
    }

    /**
     * Returns a new POJO with normalized prototype data.
     *
     * @param  {Object} data
     * @return {Object}
     */
    _normalizePrototypeData(data) {
        const result = {
            id:      data.id || "",
            title:   data.title || "",
            project: data.project || data.projectId || "",
            scale:   typeof data.scale != "undefined" ? data.scale : (data.scaleFactor || 1),
        }

        if (data.width && data.height && data.type != "desktop") {
            data.size = "" + data.width + "x" + data.height;
        } else {
            data.size = data.size || "";
        }

        return result;
    }

    /**
     * Returns a new POJO with normalized screen data.
     *
     * @param  {Object} data
     * @return {Object}
     */
    _normalizeScreenData(data) {
        const result = {
            id:         data.id || "",
            title:      data.title || "",
            prototype:  data["prototype"] || data.prototypeId || "",
            background: data.background || "",
            file:       "",
        }

        if (data.file?.medium) {
            result.file = data.file.medium;
        } else if (data.file) {
            result.file = [
                this.baseUrl,
                "api/files",
                data.collectionId,
                data.id,
                data.file
            ].join("/") + "?thumb=100x100t";
        }

        return result;
    }
}

export default new Client();
