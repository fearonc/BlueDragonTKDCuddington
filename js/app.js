// ===========================================================
// Riverside Sports Club — booking calendar logic
// Requires: config.js, PapaParse, EmailJS (loaded in booking.html)
// ===========================================================

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const PX_PER_MIN = 2; // pixels per minute of class time — taller than real-time-scale so text fits inside the block
const MIN_BLOCK_HEIGHT = 72; // guarantees room for age/time/availability text even on very short classes

let allClasses = [];      // parsed rows from the spreadsheet
let selectedClass = null; // the class currently open in the modal
let refreshTimer = null;
let urlAgeFilterApplied = false; // only auto-apply the ?age= link param once

const calendarEl = document.getElementById("calendar");
const ageFilterEl = document.getElementById("ageFilter");
const statusEl = document.getElementById("statusLine");
const refreshBtn = document.getElementById("refreshBtn");

document.addEventListener("DOMContentLoaded", () => {
  try {
    emailjs.init({ publicKey: CONFIG.EMAILJS_PUBLIC_KEY });
  } catch (err) {
    console.error("EmailJS failed to initialise:", err);
  }

  // Always wire up the filter, refresh button, and modal first, so the
  // page stays usable even if the spreadsheet fails to load below.
  refreshBtn.addEventListener("click", () => loadClassData());
  ageFilterEl.addEventListener("change", () => renderCalendar());
  setupModal();

  if (CONFIG.REFRESH_MINUTES > 0) {
    refreshTimer = setInterval(loadClassData, CONFIG.REFRESH_MINUTES * 60 * 1000);
  }

  loadClassData();
});

// ---------- Data loading ----------

function loadClassData() {
  setStatus("Checking latest availability…", false);

  if (typeof Papa === "undefined") {
    setStatus("A required script (PapaParse) failed to load — try refreshing the page.", true);
    return;
  }

  Papa.parse(CONFIG.CSV_URL, {
    download: true,
    header: false,
    skipEmptyLines: true,
    complete: (results) => {
      try {
        allClasses = parseRows(results.data);
        populateAgeFilter(allClasses);
        renderCalendar();
        const now = new Date();
        setStatus(`Availability updated ${now.toLocaleTimeString()}`, false);
      } catch (err) {
        console.error(err);
        setStatus("Could not read the spreadsheet data. Check CSV_URL in config.js.", true);
      }
    },
    error: (err) => {
      console.error(err);
      setStatus("Could not reach the spreadsheet. Check your connection or CSV_URL.", true);
    }
  });
}

function parseRows(rows) {
  // Expected columns: AgeRange, Weekday, StartTime, EndTime, MaxCapacity, Signups
  // Skip a header row if present (first cell isn't a real age-range value is hard to detect,
  // so instead we skip a row if column 3 doesn't look like a time value).
  const timePattern = /^\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?$/i;

  return rows
    .filter(r => r.length >= 6 && timePattern.test((r[2] || "").toString().trim()))
    .map(r => {
      const max = parseInt(r[4], 10) || 0;
      const signups = parseInt(r[5], 10) || 0;
      return {
        ageRange: (r[0] || "").toString().trim(),
        weekday: normalizeWeekday((r[1] || "").toString().trim()),
        startTime: (r[2] || "").toString().trim(),
        endTime: (r[3] || "").toString().trim(),
        maxCapacity: max,
        signups: signups,
        spacesLeft: Math.max(max - signups, 0),
      };
    })
    .filter(c => DAYS.includes(c.weekday));
}

function normalizeWeekday(value) {
  const found = DAYS.find(d => d.toLowerCase() === value.toLowerCase());
  return found || value;
}

// ---------- Filter dropdown ----------

function populateAgeFilter(classes) {
  const current = ageFilterEl.value;
  const found = [...new Set(classes.map(c => c.ageRange))];
  const orderList = CONFIG.AGE_GROUP_ORDER || [];

  const ranked = found.filter(a => orderList.includes(a))
    .sort((a, b) => orderList.indexOf(a) - orderList.indexOf(b));
  const unranked = found.filter(a => !orderList.includes(a)).sort();
  const ages = [...ranked, ...unranked];

  ageFilterEl.innerHTML = '<option value="all">All age groups</option>' +
    ages.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join("");

  if (!urlAgeFilterApplied) {
    urlAgeFilterApplied = true;
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("age");
    if (requested) {
      const match = ages.find(a => a.trim().toLowerCase() === requested.trim().toLowerCase());
      if (match) {
        ageFilterEl.value = match;
        return;
      }
    }
  }

  if (ages.includes(current)) ageFilterEl.value = current;
}

// ---------- Calendar rendering ----------

function renderCalendar() {
  const filter = ageFilterEl.value;
  const visible = filter === "all" ? allClasses : allClasses.filter(c => c.ageRange === filter);

  const startHour = CONFIG.CALENDAR_START_HOUR;
  const endHour = CONFIG.CALENDAR_END_HOUR;
  const totalMinutes = (endHour - startHour) * 60;
  const bodyHeight = totalMinutes * PX_PER_MIN;

  calendarEl.innerHTML = "";

  if (allClasses.length === 0) {
    calendarEl.innerHTML = `<div class="empty-note" style="grid-column:1/-1;">
      No class data loaded yet. Check the spreadsheet link in config.js.</div>`;
    return;
  }

  // Header row
  calendarEl.appendChild(headerCell("Time", true));
  DAYS.forEach(day => calendarEl.appendChild(headerCell(day.slice(0, 3), false)));

  // Time column
  const timeCol = document.createElement("div");
  timeCol.className = "time-col";
  timeCol.style.height = bodyHeight + "px";
  for (let h = startHour; h <= endHour; h++) {
    const label = document.createElement("div");
    label.className = "time-label";
    label.style.top = ((h - startHour) * 60 * PX_PER_MIN) + "px";
    label.textContent = formatHour(h);
    timeCol.appendChild(label);
  }
  calendarEl.appendChild(timeCol);

  // Day columns
  DAYS.forEach((day, dayIndex) => {
    const col = document.createElement("div");
    col.className = "day-col";
    col.style.height = bodyHeight + "px";

    const dayClasses = visible.filter(c => c.weekday === day);
    dayClasses.forEach(cls => {
      const block = buildClassBlock(cls, startHour);
      if (block) col.appendChild(block);
    });

    calendarEl.appendChild(col);
  });
}

function headerCell(text, isTimeCol) {
  const el = document.createElement("div");
  el.className = "cal-header" + (isTimeCol ? " time-col-header" : "");
  el.textContent = text;
  return el;
}

function buildClassBlock(cls, startHour) {
  const startMin = timeToMinutes(cls.startTime);
  const endMin = timeToMinutes(cls.endTime);
  if (startMin === null || endMin === null || endMin <= startMin) return null;

  const calStartMin = startHour * 60;
  const top = (startMin - calStartMin) * PX_PER_MIN;
  const height = (endMin - startMin) * PX_PER_MIN;

  const isFull = cls.spacesLeft <= 0;
  const isLow = !isFull && cls.spacesLeft <= CONFIG.LOW_AVAILABILITY_THRESHOLD;
  const availLabel = isFull
    ? "JOIN WAITLIST"
    : isLow
      ? `Only ${cls.spacesLeft} left`
      : "Open";

  const block = document.createElement("button");
  block.type = "button";
  block.className = "class-block" + (isFull ? " full" : "") + (isLow ? " low" : "");
  block.style.top = top + "px";
  block.style.height = Math.max(height, MIN_BLOCK_HEIGHT) + "px";
  block.innerHTML = `
    <div class="cb-age">${escapeHtml(cls.ageRange)}</div>
    <div class="cb-time">${formatTime(cls.startTime)}–${formatTime(cls.endTime)}</div>
    <span class="cb-avail">${availLabel}</span>
  `;

  block.addEventListener("click", () => {
    openModal(cls);
  });

  return block;
}

// ---------- Time helpers ----------

function timeToMinutes(value) {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i.exec((value || "").toString().trim());
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  const period = m[3] ? m[3].toUpperCase() : null;
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + mins;
}

function formatTime(hhmm) {
  const mins = timeToMinutes(hhmm);
  if (mins === null) return hhmm;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatHour(h) {
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${period}`;
}

// ---------- Modal + booking submission ----------

function setupModal() {
  const overlay = document.getElementById("modalOverlay");
  const closeBtn = document.getElementById("modalClose");
  const form = document.getElementById("signupForm");
  const contactNumberPreferred = document.getElementById("contactNumberPreferred");
  const emailAddressPreferred = document.getElementById("emailAddressPreferred");
  const dobDay = document.getElementById("dobDay");
const dobMonth = document.getElementById("dobMonth");
const dobYear = document.getElementById("dobYear");

  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  // The preference is optional, but only one contact method can be selected.
  contactNumberPreferred.addEventListener("change", () => {
    if (contactNumberPreferred.checked) emailAddressPreferred.checked = false;
  });
  emailAddressPreferred.addEventListener("change", () => {
    if (emailAddressPreferred.checked) contactNumberPreferred.checked = false;
  });
if (dobDay && dobMonth && dobYear) {

  dobDay.addEventListener("input", () => {
    dobDay.value = dobDay.value.replace(/\D/g, "");

    if (dobDay.value.length === 2) {
      dobMonth.focus();
    }
  });

  dobMonth.addEventListener("input", () => {
    dobMonth.value = dobMonth.value.replace(/\D/g, "");

    if (dobMonth.value.length === 2) {
      dobYear.focus();
    }
  });

  dobYear.addEventListener("input", () => {
    dobYear.value = dobYear.value.replace(/\D/g, "");
  });

}

  form.addEventListener("submit", handleSubmit);
}

function openModal(cls) {
  selectedClass = cls;
  const isFull = cls.spacesLeft <= 0;

  document.getElementById("modalTitle").textContent = `${cls.ageRange} — ${cls.weekday}`;

  const isLow = !isFull && cls.spacesLeft <= CONFIG.LOW_AVAILABILITY_THRESHOLD;
  const availText = isFull
    ? "Class full — waiting list"
    : isLow
      ? `Only ${cls.spacesLeft} space${cls.spacesLeft === 1 ? "" : "s"} left`
      : "Spaces available";
  document.getElementById("modalSub").textContent =
    `${formatTime(cls.startTime)}–${formatTime(cls.endTime)} · ${availText}`;

  document.getElementById("modalWaitlistNotice").style.display = isFull ? "block" : "none";

  document.getElementById("signupForm").reset();
  document.getElementById("formMsg").textContent = "";
  document.getElementById("formMsg").className = "form-msg";
  document.getElementById("submitBtn").disabled = false;
  document.getElementById("submitBtn").textContent = isFull
    ? "Join waiting list"
    : "Submit booking request";

  document.getElementById("modalOverlay").classList.toggle("waitlist-mode", isFull);
  document.getElementById("modalOverlay").classList.add("open");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  selectedClass = null;
}

function handleSubmit(e) {
  e.preventDefault();
  if (!selectedClass) return;

  const submitBtn = document.getElementById("submitBtn");
  const msgEl = document.getElementById("formMsg");
  const isFull = selectedClass.spacesLeft <= 0;

  const params = {
    subject: isFull ? "New Waiting List Request" : "New Class Sign Up",
    request_type: isFull ? "Waiting list" : "Available Spot",
    booker_name: document.getElementById("yourName").value.trim(),
    participant_name: document.getElementById("participantName").value.trim(),
    participant_dob:
  `${document.getElementById("dobDay").value.trim()}/` +
  `${document.getElementById("dobMonth").value.trim()}/` +
  `${document.getElementById("dobYear").value.trim()}`,
    contact_number: document.getElementById("contactNumber").value.trim(),
    contact_number_preferred: document.getElementById("contactNumberPreferred").checked ? "(Preferred)" : "",
    email_address: document.getElementById("emailAddress").value.trim(),
    email_address_preferred: document.getElementById("emailAddressPreferred").checked ? "(Preferred)" : "",
    note: document.getElementById("note").value.trim() || "—",
    class_age_range: selectedClass.ageRange,
    class_day: selectedClass.weekday,
    class_time: `${formatTime(selectedClass.startTime)}–${formatTime(selectedClass.endTime)}`,
    spaces_left_at_booking: selectedClass.spacesLeft,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending…";
  msgEl.textContent = "";
  msgEl.className = "form-msg";

  emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ID, params)
    .then(() => {
      msgEl.textContent = isFull
        ? "Thank you for signing up! We'll be in touch shortly to confirm your spot on the wait list."
        : "Request sent! We'll confirm your spot shortly. (This does not yet update the live count — the club will update the availability shortly.)";
      msgEl.className = "form-msg success";
      submitBtn.textContent = "Sent ✓";
    })
    .catch((err) => {
      console.error(err);
      msgEl.textContent = "Something went wrong sending your request. Please try again, or contact the club directly.";
      msgEl.className = "form-msg error";
      submitBtn.disabled = false;
      submitBtn.textContent = isFull ? "Join waiting list" : "Submit booking request";
    });
}

// ---------- Utilities ----------

function setStatus(text, isError) {
  statusEl.textContent = text;
  statusEl.className = "status-line" + (isError ? " error" : "");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
