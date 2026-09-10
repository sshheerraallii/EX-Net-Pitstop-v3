(function () {
  const form = document.getElementById('checkinForm');
  const nameInput = document.getElementById('name');
  const countrySelect = document.getElementById('country');
  const messageEl = document.getElementById('formMessage');
  const submitBtn = document.getElementById('submitBtn');
  const submitLabel = document.getElementById('submitLabel');
  const countdownPanel = document.getElementById('countdownPanel');
  const countdownName = document.getElementById('countdownName');
  const countdownNum = document.getElementById('countdownNum');

  const KEY = (window.CHECKIN_CONFIG && window.CHECKIN_CONFIG.apiKey) || '';
  const NOT_CONFIGURED = !KEY || KEY.indexOf('REPLACE_ME') !== -1;
  const FALLBACK_COUNTDOWN = 20;

  let submitting = false;
  let countdownTimer = null;

  // --- Country dropdown --------------------------------------------------------
  const COUNTRIES = [
    'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Australia','Austria','Azerbaijan',
    'Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi',
    'Cabo Verde','Cambodia','Cameroon','Canada','Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo','Congo (DRC)','Costa Rica','Côte d’Ivoire','Croatia','Cuba','Cyprus','Czechia',
    'Denmark','Djibouti','Dominica','Dominican Republic',
    'Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia',
    'Fiji','Finland','France',
    'Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana',
    'Haiti','Honduras','Hong Kong','Hungary',
    'Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy',
    'Jamaica','Japan','Jordan',
    'Kazakhstan','Kenya','Kiribati','Kosovo','Kuwait','Kyrgyzstan',
    'Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg',
    'Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar',
    'Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia','Norway',
    'Oman',
    'Pakistan','Palau','Palestine','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal',
    'Qatar',
    'Romania','Russia','Rwanda',
    'Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria',
    'Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Türkiye','Turkmenistan','Tuvalu',
    'Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan',
    'Vanuatu','Vatican City','Venezuela','Vietnam',
    'Yemen',
    'Zambia','Zimbabwe',
  ];
  COUNTRIES.forEach(function (c) {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    countrySelect.appendChild(opt);
  });

  function showMessage(text, kind) {
    messageEl.textContent = text;
    messageEl.className = 'form-message ' + (kind || '');
    messageEl.hidden = false;
  }
  function hideMessage() {
    messageEl.hidden = true;
  }

  // MySQL NOW() on Hostinger is UTC; a timestamp with no zone suffix is UTC.
  function parseServerTime(value) {
    if (!value) return null;
    const iso = value.indexOf('T') !== -1 ? value : value.replace(' ', 'T') + 'Z';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  function stopCountdown() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function resetForNextPlayer() {
    stopCountdown();
    countdownPanel.hidden = true;
    form.hidden = false;
    form.reset();
    submitting = false;
    submitBtn.disabled = false;
    submitLabel.textContent = 'Check In';
    hideMessage();
    nameInput.focus();
  }

  function runCountdown(name, startAt) {
    const target = parseServerTime(startAt) || new Date(Date.now() + FALLBACK_COUNTDOWN * 1000);

    form.hidden = true;
    countdownPanel.hidden = false;
    countdownName.textContent = name;

    const tick = function () {
      const secsLeft = Math.max(0, Math.ceil((target.getTime() - Date.now()) / 1000));
      countdownNum.textContent = String(secsLeft);
      if (secsLeft <= 0) {
        stopCountdown();
        countdownNum.textContent = 'Go!';
        setTimeout(resetForNextPlayer, 2500);
      }
    };

    stopCountdown();
    tick();
    countdownTimer = setInterval(tick, 250);
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
    const country = countrySelect.value.trim();

    if (!name) {
      showMessage('Please enter a name.', 'error');
      nameInput.focus();
      return;
    }

    submitting = true;
    submitBtn.disabled = true;
    submitLabel.textContent = 'Checking in…';
    hideMessage();

    fetch('checkin_submit.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Checkin-Key': KEY,
      },
      body: JSON.stringify({ name: name, country: country }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok && result.data.success) {
          const startAt = result.data.checkin && result.data.checkin.start_at;
          runCountdown(name, startAt);
        } else {
          submitting = false;
          submitBtn.disabled = false;
          submitLabel.textContent = 'Check In';
          showMessage(result.data.error || 'Something went wrong. Please try again.', 'error');
        }
      })
      .catch(function () {
        submitting = false;
        submitBtn.disabled = false;
        submitLabel.textContent = 'Check In';
        showMessage('Could not reach the check-in service. Check your connection and try again.', 'error');
      });
  });
})();
