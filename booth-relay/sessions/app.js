(function () {
  var cfg = window.SESSIONS_CONFIG || {};
  var apiBase = (cfg.apiBase || '').replace(/\/+$/, '');
  var apiKey = cfg.apiKey || '';

  var currentEl = document.getElementById('current');
  var ackEl = document.getElementById('ack');
  var statusEl = document.getElementById('status');
  var nameEl = document.getElementById('name');
  var startEl = document.getElementById('start');

  function headers() {
    return { 'Content-Type': 'application/json', 'X-Relay-Key': apiKey };
  }

  function refresh() {
    fetch(apiBase + '/session_pending.php', { headers: headers(), cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.success) throw new Error('bad payload');
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
      .catch(function () {
        currentEl.textContent = 'Could not reach the relay.';
        ackEl.textContent = '';
      });
  }

  startEl.addEventListener('click', function () {
    if (!window.confirm('Start a new session? This clears the public leaderboard.')) return;
    startEl.disabled = true;
    statusEl.textContent = 'Starting…';
    statusEl.className = 'status';

    fetch(apiBase + '/session_create.php', {
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
