// Must match RELAY_API_KEY in api/config.php. This page is staff-only and
// the key is visible in source, so treat the URL as semi-private - it is a
// guard against stray internet traffic, not a login.
window.SESSIONS_CONFIG = {
  apiBase: 'https://antiquewhite-jay-310571.hostingersite.com/booth-api',
  apiKey: 'REPLACE_ME_WITH_THE_SAME_KEY_AS_API_CONFIG_PHP',
};
