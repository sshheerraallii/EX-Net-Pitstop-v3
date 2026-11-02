// Spectator leaderboard. Polls the relay and redraws. No framework - this
// runs unattended on a screen for a whole show day, so the less there is to
// go wrong the better.
(function () {
  var cfg = window.BOARD_CONFIG || {};
  var apiBase = (cfg.apiBase || '').replace(/\/+$/, '');
  var refreshMs = cfg.refreshMs || 8000;

  var rowsEl = document.getElementById('rows');
  var emptyEl = document.getElementById('empty');
  var liveEl = document.getElementById('live-pill');
  var sessionEl = document.getElementById('session-name');

  var currentLeader = null;
  var headerRow = rowsEl.querySelector('.board-row--header');

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

  function poll() {
    fetch(apiBase + '/leaderboard_list.php', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.success) throw new Error('bad payload');
        liveEl.textContent = 'Live';
        liveEl.className = 'board-live';
        render(data);
      })
      .catch(function () {
        // Keep the last good board on screen rather than blanking it; a
        // dropped poll at a trade show is noise, not news.
        liveEl.textContent = 'Reconnecting';
        liveEl.className = 'board-live board-live--error';
      });
  }

  poll();
  setInterval(poll, refreshMs);
})();
