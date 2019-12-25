import PresentatorClient from 'presentator-client';
import clientStorage     from '@/utils/ClientStorage';

/**
 * Loads stored api url and token.
 *
 * @return {PresentatorClient}
 */
PresentatorClient.prototype.loadStorageData = function() {
    const apiUrl = clientStorage.getItem('apiUrl') || 'https://app.presentator.io/api';
    const token  = clientStorage.getItem('token')  || '';

    this.setBaseUrl(apiUrl);
    this.setToken(token);

    return this;
};

/**
 * Checks whether the loaded client token is not expired.
 *
 * @param  {Number} expirationThreshold Additional threshold in seconds that will be substracted from the token `exp` value
 *                                      (useful for example if you want to check whether the token will be valid after an hour)
 * @return {PresentatorClient}
 */
PresentatorClient.prototype.hasValidToken = function(expirationThreshold = 0) {
    var payload = {};

    // parse jwt payload
    try {
        const base64 = decodeURIComponent(atob(this.$token.split('.')[1]).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        payload = JSON.parse(base64) || {};
    } catch (e) {}

    // check if is still valid
    if (
        payload.exp &&
        (payload.exp - expirationThreshold) > (Date.now() / 1000)
    ) {
        return true;
    }

    return false;
};

/**
 * Refreshes current stored user token.
 * If `forceRefresh` is set to `false` (default), the refresh will be done
 * only if the current loaded token will expire soon.
 *
 * @param  {Boolean} forceRefresh
 * @return {PresentatorClient}
 */
PresentatorClient.prototype.refreshToken = async function(forceRefresh = false) {
    this.loadStorageData();

    if (
        forceRefresh ||
        // has valid token but it will expire soon
        (this.hasValidToken() && !this.hasValidToken(1850))
    ) {
        let response = await this.Users.refresh();

        if (response && response.data && response.data.token) {
            // store the new token
            clientStorage.setItem('token', response.data.token)

            // reload client settings
            this.loadStorageData();
        }
    }
};

export default new PresentatorClient();
