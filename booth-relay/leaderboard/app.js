// Spectator leaderboard. Polls the relay and redraws. No framework - this
// runs unattended on a screen for a whole show day, so the less there is to
// go wrong the better.
//
// The board finds its own API rather than trusting a hand-edited apiBase.
// The first deployment failed because the page loaded fine but every poll
// missed the endpoint, and "Reconnecting" was all it could say - a 404, a
// database error and a dead network looked identical. So: probe a short list
// of likely locations once, lock onto whichever answers, and when none do,
// say on screen which one was tried and what came back.
(function () {
  var cfg = window.BOARD_CONFIG || {};
  var refreshMs = cfg.refreshMs || 8000;

  var rowsEl = document.getElementById('rows');
  var emptyEl = document.getElementById('empty');
  var liveEl = document.getElementById('live-pill');
  var sessionEl = document.getElementById('session-name');

  var currentLeader = null;
  var headerRow = rowsEl.querySelector('.board-row--header');
  var apiBase = null; // resolved on first successful probe

  // Where the api/ folder might have landed, most likely first. The
  // configured value wins when it is set to something real; everything else
  // is derived from the page's own URL so it keeps working if the site moves
  // to the client's own domain.
  function candidates() {
    var list = [];
    var configured = (cfg.apiBase || '').replace(/\/+$/, '');
    if (configured && configured.indexOf('REPLACE_ME') === -1) list.push(configured);

    var origin = window.location.origin;
    // The directory this page sits in, e.g. /leaderboard -> /
    var dir = window.location.pathname.replace(/\/[^/]*$/, '').replace(/\/+$/, '');
    var parent = dir.replace(/\/[^/]*$/, '');

    ['/booth-api', '/api', '/booth-relay/api'].forEach(function (p) {
      list.push(origin + p);
      if (parent) list.push(origin + parent + p);
    });

    // De-duplicate, keeping order.
    var seen = {};
    return list.filter(function (u) {
      if (seen[u]) return false;
      seen[u] = true;
      return true;
    });
  }

  function fetchBoard(base) {
    return fetch(base + '/leaderboard_list.php', { cache: 'no-store' })
      .then(function (r) {
        return r.text().then(function (text) {
          if (!r.ok) {
            throw new Error('HTTP ' + r.status + (r.status === 404 ? ' (not found)' : ''));
          }
          var data;
          try {
            data = JSON.parse(text);
          } catch (e) {
            // A PHP fatal, or an HTML 404 page served with status 200.
            throw new Error('not JSON: ' + text.slice(0, 80).replace(/\s+/g, ' '));
          }
          if (!data || !data.success) {
            throw new Error(data && data.error ? data.error : 'request refused');
          }
          return data;
        });
      });
  }

  // A 404 or an unreachable host only says "nothing here". A 500, a PHP
  // fatal or success:false means the endpoint exists and something behind
  // it is broken - far more useful. Keep one of each and report the
  // interesting one, so the screen names the real cause instead of
  // whichever candidate happened to be tried last.
  var dullFailure = '';
  var realFailure = '';

  function noteFailure(base, err) {
    var msg = base.replace(window.location.origin, '') + ' -> ' + err.message;
    var dull = /HTTP 404|Failed to fetch|NetworkError|ERR_|load failed/i.test(err.message);
    if (dull) {
      if (!dullFailure) dullFailure = msg;
    } else if (!realFailure) {
      realFailure = msg;
    }
  }

  function failureDetail() {
    return realFailure || dullFailure || 'no endpoint responded';
  }

  // Walks the candidate list until one answers properly.
  function discover(i) {
    var list = candidates();
    i = i || 0;
    if (i >= list.length) {
      return Promise.reject(new Error(failureDetail()));
    }
    return fetchBoard(list[i])
      .then(function (data) {
        apiBase = list[i];
        console.log('[board] using API at', apiBase);
        return data;
      })
      .catch(function (err) {
        noteFailure(list[i], err);
        console.warn('[board] no API at', list[i], '-', err.message);
        return discover(i + 1);
      });
  }

  function formatTime(ms) {
    var total = Math.floor(ms / 1000);
    var m = Math.floor(total / 60);
    var s = total % 60;
    return m + 'm ' + String(s).padStart(2, '0') + 's';
  }

  function medal(rank) {
    if (rank > 3) return '<span class="rank-plain">' + rank + '</span>';
    var tier = rank === 1 ? 'gold' : rank === 2 ? 'silver' : 'bronze';
    return '<span class="rank-medal rank-medal--' + tier + '">' + rank + '</span>';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function setStatus(state, text) {
    liveEl.textContent = text;
    liveEl.className = 'board-live' + (state === 'ok' ? '' : ' board-live--error');
  }

  function render(data) {
    var list = data.leaderboard || [];
    sessionEl.textContent = (data.session && data.session.name) || 'Live session';

    if (!list.length) {
      emptyEl.style.display = '';
      emptyEl.textContent = 'No finishers yet. The board fills as players complete their runs.';
      Array.prototype.slice.call(rowsEl.querySelectorAll('.board-row:not(.board-row--header)'))
        .forEach(function (el) { el.remove(); });
      currentLeader = null;
      return;
    }

    emptyEl.style.display = 'none';

    // Identify the leader by run, not by position, so a reshuffle further
    // down the board can't fake a takeover.
    var topId = list[0].run_uid || list[0].name;
    var isTakeover = currentLeader !== null && topId !== currentLeader;
    currentLeader = topId;

    var html = list.map(function (row, i) {
      var cls = 'board-row' + (i < 3 ? ' board-row--podium' : '') +
        (isTakeover && i === 0 ? ' board-row--takeover' : '');
      return '<li class="' + cls + '" style="animation-delay:' + i * 45 + 'ms">' +
        '<span class="c-rank">' + medal(i + 1) + '</span>' +
        '<span class="c-name">' + escapeHtml(row.name) + '</span>' +
        '<span class="c-country">' + (row.country ? escapeHtml(row.country) : '—') + '</span>' +
        '<span class="c-time">' + formatTime(row.time_ms) + '</span>' +
        '</li>';
    }).join('');

    rowsEl.innerHTML = '';
    rowsEl.appendChild(headerRow);
    rowsEl.insertAdjacentHTML('beforeend', html);

    if (isTakeover) {
      document.body.classList.add('is-takeover');
      setTimeout(function () { document.body.classList.remove('is-takeover'); }, 2600);
    }
  }

  function onFailure(err) {
    // Once the board has worked, a dropped poll is noise at a trade show -
    // keep the last good table on screen and say so quietly. Before it has
    // ever worked, the screen is the only place anyone will see why.
    if (apiBase) {
      setStatus('error', 'Reconnecting');
      return;
    }
    setStatus('error', 'No connection');
    emptyEl.style.display = '';
    emptyEl.innerHTML =
      'Cannot reach the results API.<br>' +
      '<span class="board-empty-detail">' + escapeHtml(failureDetail()) + '</span>';
  }

  function poll() {
    if (!apiBase) { dullFailure = ''; realFailure = ''; }
    var attempt = apiBase ? fetchBoard(apiBase) : discover(0);
    attempt
      .then(function (data) {
        setStatus('ok', 'Live');
        render(data);
      })
      .catch(onFailure);
  }

  poll();
  setInterval(poll, refreshMs);
})();
