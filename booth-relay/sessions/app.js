(function () {
  var cfg = window.SESSIONS_CONFIG || {};
  var apiKey = cfg.apiKey || '';

  // Same endpoint discovery as the public board: trust the configured value
  // when it is real, otherwise work it out from this page's own URL. A
  // hand-edited apiBase was the thing that broke the first deployment.
  var apiBase = null;

  function candidates() {
    var list = [];
    var configured = (cfg.apiBase || '').replace(/\/+$/, '');
    if (configured && configured.indexOf('REPLACE_ME') === -1) list.push(configured);

    var origin = window.location.origin;
    var dir = window.location.pathname.replace(/\/[^/]*$/, '').replace(/\/+$/, '');
    var parent = dir.replace(/\/[^/]*$/, '');

    ['/booth-api', '/api', '/booth-relay/api'].forEach(function (p) {
      list.push(origin + p);
      if (parent) list.push(origin + parent + p);
    });

    var seen = {};
    return list.filter(function (u) {
      if (seen[u]) return false;
      seen[u] = true;
      return true;
    });
  }

  function callPending(base) {
    return fetch(base + '/session_pending.php', { headers: headers(), cache: 'no-store' })
      .then(function (r) {
        return r.text().then(function (text) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          var data;
          try {
            data = JSON.parse(text);
          } catch (e) {
            throw new Error('not JSON: ' + text.slice(0, 70).replace(/\s+/g, ' '));
          }
          if (!data || !data.success) throw new Error(data && data.error ? data.error : 'refused');
          return data;
        });
      });
  }

  var lastError = '';

  function resolveAndCall(i) {
    if (apiBase) return callPending(apiBase);
    var list = candidates();
    i = i || 0;
    if (i >= list.length) return Promise.reject(new Error(lastError || 'no endpoint responded'));
    return callPending(list[i])
      .then(function (data) {
        apiBase = list[i];
        console.log('[sessions] using API at', apiBase);
        return data;
      })
      .catch(function (err) {
        if (!lastError || /HTTP 404|Failed to fetch/i.test(lastError)) {
          lastError = list[i].replace(window.location.origin, '') + ' -> ' + err.message;
        }
        return resolveAndCall(i + 1);
      });
  }

  var currentEl = document.getElementById('current');
  var ackEl = document.getElementById('ack');
  var statusEl = document.getElementById('status');
  var nameEl = document.getElementById('name');
  var startEl = document.getElementById('start');

  function headers() {
    return { 'Content-Type': 'application/json', 'X-Relay-Key': apiKey };
  }

  function refresh() {
    lastError = '';
    resolveAndCall(0)
      .then(function (data) {
        if (!data.session) {
          currentEl.textContent = 'No active session.';
          ackEl.textContent = '';
          return;
        }
        currentEl.textContent = data.session.name + '  (id ' + data.session.id + ')';
        // Until the kiosk acknowledges, the booth machine is still showing
        // the old board. Staff need to see that, or they will assume the
        // reset silently failed.
        ackEl.textContent = data.reset_requested
          ? 'Waiting for the kiosk to pick up the reset…'
          : 'Kiosk is in sync.';
        ackEl.className = 'ack' + (data.reset_requested ? ' ack--waiting' : ' ack--ok');
      })
      .catch(function (err) {
        // Name the endpoint and the server's own words - a bare "could not
        // reach" sent the first deployment hunting blind.
        currentEl.textContent = 'Could not reach the relay.';
        ackEl.textContent = lastError || err.message;
        ackEl.className = 'ack ack--waiting';
      });
  }

  startEl.addEventListener('click', function () {
    if (!window.confirm('Start a new session? This clears the public leaderboard.')) return;
    startEl.disabled = true;
    statusEl.textContent = 'Starting…';
    statusEl.className = 'status';

    fetch((apiBase || candidates()[0]) + '/session_create.php', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ name: nameEl.value.trim() }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.success) throw new Error(data && data.error ? data.error : 'failed');
        statusEl.textContent = 'New session started. The kiosk will reset on its next check.';
        statusEl.className = 'status status--ok';
        nameEl.value = '';
        refresh();
      })
      .catch(function (err) {
        statusEl.textContent = 'Failed: ' + err.message;
        statusEl.className = 'status status--error';
      })
      .finally(function () { startEl.disabled = false; });
  });

  refresh();
  setInterval(refresh, 6000);
})();
