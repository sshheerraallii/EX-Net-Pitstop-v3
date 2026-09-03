(function () {
  const form = document.getElementById('checkinForm');
  const nameInput = document.getElementById('name');
  const countryInput = document.getElementById('country');
  const messageEl = document.getElementById('formMessage');
  const submitBtn = document.getElementById('submitBtn');
  const submitLabel = document.getElementById('submitLabel');
  const recentList = document.getElementById('recentList');
  const recentItems = document.getElementById('recentItems');

  const KEY = (window.CHECKIN_CONFIG && window.CHECKIN_CONFIG.apiKey) || '';
  const NOT_CONFIGURED = !KEY || KEY.indexOf('REPLACE_ME') !== -1;

  let sentCount = 0;
  let submitting = false;

  function showMessage(text, kind) {
    messageEl.textContent = text;
    messageEl.className = 'form-message ' + (kind || '');
    messageEl.hidden = false;
  }

  function hideMessage() {
    messageEl.hidden = true;
  }

  function addRecent(name, country) {
    sentCount += 1;
    recentList.hidden = false;
    const li = document.createElement('li');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    li.innerHTML =
      '<span class="recent-check">&#10003;</span><span class="recent-name">' +
      escapeHtml(name) +
      (country ? ' <span class="recent-country">(' + escapeHtml(country) + ')</span>' : '') +
      '</span><span class="recent-time">' +
      time +
      '</span>';
    recentItems.insertBefore(li, recentItems.firstChild);
    // Keep the list short so it doesn't grow forever on a long shift.
    while (recentItems.children.length > 8) {
      recentItems.removeChild(recentItems.lastChild);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  if (NOT_CONFIGURED) {
    showMessage(
      'This check-in page is not set up yet — add your API key to config.js first (see README.md).',
      'error'
    );
    submitBtn.disabled = true;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (submitting || NOT_CONFIGURED) return;

    const name = nameInput.value.trim();
    const country = countryInput.value.trim();

    if (!name) {
      showMessage('Please enter a name.', 'error');
      nameInput.focus();
      return;
    }

    submitting = true;
    submitBtn.disabled = true;
    submitLabel.textContent = 'Sending...';
    hideMessage();

    fetch('checkin_submit.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Checkin-Key': KEY,
      },
      body: JSON.stringify({ name, country }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok && result.data.success) {
          addRecent(name, country);
          showMessage('Sent — ' + name + ' will appear on the kiosk shortly.', 'success');
          form.reset();
          nameInput.focus();
        } else {
          showMessage(result.data.error || 'Something went wrong. Please try again.', 'error');
        }
      })
      .catch(function () {
        showMessage('Could not reach the check-in service. Check your connection and try again.', 'error');
      })
      .finally(function () {
        submitting = false;
        submitBtn.disabled = false;
        submitLabel.textContent = 'Send to Kiosk';
      });
  });
})();
