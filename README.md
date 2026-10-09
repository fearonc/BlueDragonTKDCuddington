# Blue Dragon TaeKwon-Do — Booking Site

A two-page, no-backend booking site for GitHub Pages:

- `index.html` — home page describing your classes, with a **Book Now** button
- `booking.html` — age-range filter + weekly calendar with live spaces, and a
  sign-up popup that emails you the booking details
- `css/style.css` — all styling
- `js/config.js` — **the only file you need to edit** to connect your spreadsheet and email
- `js/app.js` — calendar + booking logic (no editing needed)
- `images/BD_Anniversary.jpg` — the club emblem, shown top-left in the nav on both pages

There is no server involved. Two free third-party services do the two jobs a
static site can't do on its own:

| Job | Service |
|---|---|
| Read live spreadsheet data | A OneDrive share link, converted to direct-download |
| Send the sign-up email | **EmailJS** (free tier: 200 emails/month) |

---

## 1. Set up your spreadsheet

Your OneDrive Excel file needs **exactly these six columns, in this order**,
starting from row 1 (a header row is fine — the site ignores any row where
column 3 isn't a time):

| Age Range | Weekday | Start Time | End Time | Max Capacity | Signups |
|---|---|---|---|---|---|
| Mini Dragons (Under 7s) | Monday | 16:00 | 16:45 | 12 | 7 |
| 8–12 years | Tuesday | 17:00 | 18:00 | 14 | 14 |
| Adults | Friday | 19:00 | 20:30 | 20 | 3 |

Notes:
- **Times must be 24-hour `HH:MM`** (e.g. `16:00`, not `4pm`).
- Your original 4-column plan didn't include a time — I added **Start Time**
  and **End Time** as columns 3 and 4 (shifting Max Capacity and Signups to
  5 and 6), since the calendar needs a time to place each class in the grid.
- One row = one weekly class slot. A class that runs twice a week (e.g.
  Under 8s on both Monday and Wednesday) needs two rows.

### Get a live link to the file (works entirely from the OneDrive mobile app)

1. In the OneDrive app, open the file's **•••** menu → **Share**, set it to
   **Anyone with the link** (view only), and **Copy Link**.
2. Add `?download=1` to the end of that link (or `&download=1` if it already
   has a `?` in it). This turns the normal "open in viewer" link into a
   direct-download link.
3. Paste that link into `js/config.js` as `DATA_URL`.

This avoids Excel Online's **Publish to the web** feature entirely, which is
awkward to reach from a phone browser since it's normally a desktop-ribbon
option.

**A caveat worth knowing:** a link that downloads fine when you paste it into
your phone's browser isn't a guaranteed sign it'll work from the *website* —
the site fetches the file in the background (a "cross-site" request), which
OneDrive doesn't always allow the same way it allows a direct visit. Test the
live booking page once this is deployed; if the calendar shows a "Could not
reach the spreadsheet" message, that's what's happening. The fallback in that
case is Excel Online's **Publish to the web** (File → Share → Publish to
web → choose the sheet → format: **Comma Separated Values (.csv)**), which
*is* built for exactly this kind of embedding and reliably allows it — you'd
just need a one-off desktop session (or your phone browser's "Desktop site"
toggle) to reach that menu, then never need to touch it again as the sheet
updates automatically.

**Updating availability:** when you get the "New Class Sign Up" email, open
the spreadsheet and increase the **Signups** number for that class as usual.
The site re-checks the link every 5 minutes (configurable via
`REFRESH_MINUTES`), or instantly if a visitor clicks **Refresh availability**.

---

## 2. Set up EmailJS (sends the booking email)

1. Create a free account at [emailjs.com](https://www.emailjs.com).
2. **Email Services → Add New Service** and connect the inbox you want
   bookings sent to (Gmail, Outlook, etc.). Note the **Service ID**.
3. **Email Templates → Create New Template**. Set:
   - **Subject:** `{{subject}}` (this will render as "New Class Sign Up")
   - **Content**, using these variable names (they match what `app.js` sends):

     ```
     New booking request

     From: {{booker_name}} ({{email_address}} {{email_address_preferred}}, {{contact_number}} {{contact_number_preferred}})
     Participant: {{participant_name}}

     Class: {{class_age_range}} — {{class_day}}, {{class_time}}
     Spaces left at time of booking: {{spaces_left_at_booking}}

     Note: {{note}}
     ```
   - The two `*_preferred` variables render as `(Preferred)` when the
     corresponding checkbox is selected, and otherwise render nothing.
   - Set the **To email** field to your own booking inbox address.
   - Note the **Template ID**.
4. **Account → General** and copy your **Public Key**.
5. Paste all three values into `js/config.js`:
   `EMAILJS_PUBLIC_KEY`, `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`.

Test it by submitting a booking on `booking.html` yourself once it's live.

---

## 3. Deploy to GitHub Pages

1. Create a new GitHub repository and add all these files, keeping the
   folder structure (`css/`, `js/` as subfolders).
2. Go to the repo's **Settings → Pages**.
3. Under **Source**, choose the branch (usually `main`) and root folder,
   then **Save**.
4. GitHub gives you a URL like `https://yourusername.github.io/reponame/`
   — that's your live site. `index.html` loads by default.

---

## Things worth knowing

- **This isn't fully automatic end-to-end.** The email tells you a booking
  happened; you still update the Signups column yourself, exactly as you
  described. If you'd rather have signups counted automatically, that would
  need a small backend (e.g. a serverless function) since GitHub Pages alone
  can't write back to Excel.
- **No double-booking protection.** Two people could both submit for the last
  space before you update the sheet. For a small club this is usually fine to
  handle manually (first email wins); flag it if you'd like a stronger
  safeguard later.
- **Editing the home page:** the class list on `index.html` is written by
  hand in the HTML, not pulled from the spreadsheet — update it whenever your
  weekly schedule changes.
- **Calendar hours:** adjust `CALENDAR_START_HOUR` / `CALENDAR_END_HOUR` in
  `config.js` if your classes run outside the current 8am–9pm window.
