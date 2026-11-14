/**
 * Host half of the session-finish-alert bundle.
 *
 * The bundle exists so the Client module registry can discover the package and
 * serve its `./client` bundle. Nothing on the Host side is needed: running
 * state reaches the browser as the forwarded `api-session/status` event, which
 * `ui-session` already folds into the Session status source this plugin reads.
 */
export function apply() {}
