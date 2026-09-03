# Tablet Check-In — Hostinger deployment

This is the "mailbox" between the staff tablet and the kiosk when they're on
two genuinely separate internet connections. Staff enter a player's name and
country on the tablet; it lands here; the kiosk polls this and shows a live,
tappable list. Everything here is plain PHP + MySQL, which works on
Hostinger's basic shared hosting (no Node required).

## What's in this folder

- `schema.sql` — the one database table this needs.
- `config.php` — database connection + the shared API key. **You edit this.**
- `checkin_submit.php` — the tablet POSTs here to check someone in.
- `checkin_list.php` — the kiosk polls here for the live list.
- `checkin_claim.php` — the kiosk POSTs here once it's started a player, so
  they drop off the list.
- `index.html`, `app.js`, `styles.css`, `config.js` — the tablet-facing
  check-in page itself. **You edit `config.js`.**
- `extreme-logo.png` — logo used on the check-in page.

## 1. Create the database

In Hostinger's hPanel: **Databases → MySQL Databases**. Create a new
database and a database user with access to it (Hostinger will show you the
hostname, database name, username, and password — usually the hostname is
`localhost`). Note all four values.

Open **phpMyAdmin** for that database, go to the **SQL** tab, paste in the
contents of `schema.sql`, and run it. You should end up with one table:
`checkins`.

## 2. Upload the files

Using Hostinger's **File Manager** (or an FTP client), create a folder
under your site's `public_html` — for example `public_html/checkin/` — and
upload every file from this `tablet-checkin/` folder into it.

## 3. Configure `config.php`

Open `config.php` (in File Manager's editor, or edit locally and re-upload)
and replace the placeholders:

```php
define('DB_HOST', 'localhost');           // from step 1
define('DB_NAME', 'REPLACE_ME_DB_NAME');  // from step 1
define('DB_USER', 'REPLACE_ME_DB_USER');  // from step 1
define('DB_PASS', 'REPLACE_ME_DB_PASS');  // from step 1
define('CHECKIN_API_KEY', 'REPLACE_ME_WITH_A_LONG_RANDOM_STRING');
```

For `CHECKIN_API_KEY`, make up a long random string (like a password) — it's
the only thing keeping strangers from posting fake check-ins. Anything
unguessable works, e.g. 32+ random letters and numbers.

## 4. Configure `config.js` (the tablet page)

Open `config.js` in the same folder and set the **same** key you just chose:

```js
window.CHECKIN_CONFIG = {
  apiKey: 'the exact same string you put in CHECKIN_API_KEY above',
};
```

## 5. Configure the kiosk app

Back in the main project, open
`real-game/frontend/src/config/tabletCheckin.js` and fill in:

```js
export const TABLET_CHECKIN_API = 'https://yourdomain.com/checkin';
export const TABLET_CHECKIN_KEY = 'the exact same string again';
```

`TABLET_CHECKIN_API` is the URL to the folder you uploaded in step 2 (no
trailing slash) — the kiosk will call `${TABLET_CHECKIN_API}/checkin_list.php`
etc. Rebuild/redeploy the kiosk frontend after this change.

## 6. Test it

- Visit `https://yourdomain.com/checkin/` on the tablet (or any browser) and
  submit a test check-in — you should see a green "Sent" confirmation.
- On the kiosk, open the player entry screen and switch to the
  **Tablet Check-In** tab. Your test entry should appear within a few
  seconds. Tap it to start a run, then confirm it disappears from the list.

If the tablet page shows "not set up yet," `config.js` still has the
placeholder key. If the kiosk tab shows "not set up yet," it's
`tabletCheckin.js`. If the kiosk shows "Can't reach check-in service," double
check `TABLET_CHECKIN_API` and that the key matches in all three places
(`config.php`, `config.js`, `tabletCheckin.js`).

## Notes

- Check-ins older than 3 hours (`CHECKIN_STALE_MINUTES` in `config.php`)
  stop showing in the list automatically, so a slow day doesn't leave stale
  entries piling up. Change that number if you want a different window.
- The manual entry and QR code tabs are untouched — tablet check-in is a
  third option, not a replacement, so staff always have a fallback if the
  tablet or the internet acts up.
