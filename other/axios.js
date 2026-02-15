import Axios from "axios";
import Cookies from 'js-cookie';
import qs from "qs";

let dns = null;
let proxyRequired = window.cors || false;

setDns(window.dns);

/* --------- GET REQUEST --------- */
export async function get(url) {
    if (!dns) return null;

    let uri = dns + url;

    if (proxyRequired)
        uri = "/proxy.php?url=" + encodeURIComponent(uri);

    return Axios.get(uri, { timeout: 25000 }).catch(err => err);
}

/* --------- POST REQUEST (Xtream Login) --------- */
export async function post(url, params = {}, useProxy = false) {
    if (!dns) return null;

    let uri = dns + url;

    if (proxyRequired || useProxy)
        uri = "/proxy.php?url=" + encodeURIComponent(uri);

    return Axios.post(
        uri,
        qs.stringify(params),
        {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 25000
        }
    ).catch(err => {
        if (!useProxy && !proxyRequired && !err.response)
            return post(url, params, true);
        return err;
    });
}

/* --------- SET DNS --------- */
export function setDns(data) {
    if (!data) return;

    if (data[data.length - 1] !== "/")
        data += "/";

    dns = data;
    Cookies.set("dns", data, { expires: 365 });
}

/* --------- GET DNS --------- */
export function getDns() {
    return dns;
}

/* --------- GET IPTVEDITOR FLAG (always false) --------- */
export function getIsIptveditor() {
    return false;
}
