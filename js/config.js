// ===========================================================
// CONFIGURATION — edit these values for your own club.
// See README.md for step-by-step setup instructions.
// ===========================================================

const CONFIG = {

  // The CSV export link from Excel Online's "Publish to the web" feature.
  // (A direct OneDrive share link was tried first but blocked by CORS —
  // Publish to the web is specifically built to allow cross-site fetches.)
  // Columns must be, in this exact order:
  // 1) Age Range   2) Weekday   3) Start Time (HH:MM, 24hr)
  // 4) End Time (HH:MM, 24hr)   5) Max Capacity   6) Current Signups
  CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSZdyA16mmB5_rhQkRWTSX3xc2rGZsLU4CCtGMdQVcY2PokcN0kN_Emi1CcAGwjDdc-9o4uLLm8ujbU/pub?gid=1107259915&single=true&output=csv",

  // EmailJS credentials (from emailjs.com — Account > General, and
  // Email Services / Email Templates in your EmailJS dashboard).
  EMAILJS_PUBLIC_KEY: "_Tlc_jjb9fazDuh3q",
  EMAILJS_SERVICE_ID: "service_iwnkwnm",
  EMAILJS_TEMPLATE_ID: "template_fo2s176",

  // How often (in minutes) to automatically re-check the spreadsheet
  // for updated availability while someone has the page open.
  REFRESH_MINUTES: 5,

  // Calendar display window (24hr). Adjust to match your club's hours.
  CALENDAR_START_HOUR: 16,
  CALENDAR_END_HOUR: 21,

  // Once spaces left drops to this number or below, the calendar switches
  // from "Open" to "Only X left" so it reads as urgency rather than a
  // slightly odd-looking countdown from the very first booking.
  LOW_AVAILABILITY_THRESHOLD: 5,


   // Controls the order options appear in the age-group dropdown (top to
  // bottom). "All age groups" always stays first regardless. Any age range
  // found in the spreadsheet but NOT listed here gets added alphabetically
  // at the end. Edit this list any time your class names change.
  AGE_GROUP_ORDER: [
    "Mini Dragons (Ages 2-4)",
    "Mini Dragons (Ages 4-6)",
    "Home Ed Mini Dragons (Ages 4-6)",
    "Home Ed (Ages 6+)",
    "Ages 6+",
    "Ages 9+ and Adults",
  ],
};
