// הקישור מ-Google Apps Script Deployment
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbz0bHj9cz_Lj6Bpt0tZX7LRW8snG8ygty_S99AsJq3Pu_2lSfCBykgk6Uda0hCV4VNY/exec";

// ambient sparks
const sparkHost = document.getElementById("sparks");
for (let i = 0; i < 22; i++) {
  const s = document.createElement("div");
  s.className = "spark";
  s.style.right = Math.random() * 100 + "%";
  s.style.bottom = Math.random() * 40 + "%";
  s.style.animationDelay = Math.random() * 7 + "s";
  s.style.animationDuration = 5 + Math.random() * 4 + "s";
  sparkHost.appendChild(s);
}

const BUS_CAPACITY = 50;
let attending = null;
let transport = null;

function setAttend(val) {
  attending = val;
  document
    .getElementById("btnYes")
    .classList.toggle("active-yes", val === true);
  document
    .getElementById("btnNo")
    .classList.toggle("active-no", val === false);
  document
    .getElementById("guestsRow")
    .classList.toggle("show", val === true);
  document
    .getElementById("transportRow")
    .classList.toggle("show", val === true);
  if (val !== true) {
    transport = null;
    document.getElementById("btnBus").classList.remove("active-yes");
    document.getElementById("btnOwn").classList.remove("active-yes");
    document.getElementById("seatsNote").textContent = "";
  }
}

async function setTransport(val) {
  transport = val;
  document
    .getElementById("btnBus")
    .classList.toggle("active-yes", val === "bus");
  document
    .getElementById("btnOwn")
    .classList.toggle("active-yes", val === "independent");
  const note = document.getElementById("seatsNote");
  if (val === "bus") {
    note.textContent = "בודק מקומות פנויים...";
    note.className = "seats-note";
    try {
      const used = await getBusSeatsUsed();
      const remaining = BUS_CAPACITY - used;
      const wanted = parseInt(
        document.getElementById("gCount").value || "1",
        10,
      );
      if (remaining <= 0) {
        note.textContent = "לצערנו האוטובוס מלא. אנא בחרו הגעה עצמאית.";
        note.className = "seats-note warn";
      } else if (wanted > remaining) {
        note.textContent = `נותרו ${remaining} מקומות בלבד באוטובוס`;
        note.className = "seats-note warn";
      } else {
        note.textContent = `נותרו ${remaining} מקומות פנויים באוטובוס`;
        note.className = "seats-note";
      }
    } catch (e) {
      note.textContent = "";
    }
  } else {
    note.textContent = "";
  }
}

async function getBusSeatsUsed() {
  if (SCRIPT_URL === "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE") return 0;
  try {
    const res = await fetch(SCRIPT_URL);
    const rows = await res.json();
    let used = 0;
    for (const e of rows) {
      if (e.attending && e.transport === "bus") {
        used += parseInt(e.guests, 10) || 1;
      }
    }
    return used;
  } catch (e) {
    return 0;
  }
}

// On DOM load, pre-fill form if previously submitted
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("rsvp_data");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.name)
        document.getElementById("gName").value = parsed.name;
      if (parsed.note)
        document.getElementById("gNote").value = parsed.note;
      if (typeof parsed.attending === "boolean")
        setAttend(parsed.attending);
      if (parsed.guests)
        document.getElementById("gCount").value = parsed.guests;
      if (parsed.transport) setTransport(parsed.transport);
    } catch (e) {}
  }
});

async function submitRSVP() {
  const name = document.getElementById("gName").value.trim();
  const note = document.getElementById("gNote").value.trim();
  const guests = attending
    ? parseInt(document.getElementById("gCount").value || "1", 10)
    : 0;
  const statusEl = document.getElementById("statusMsg");

  if (!name) {
    statusEl.textContent = "נא למלא שם";
    statusEl.className = "status-msg err";
    return;
  }
  if (attending === null) {
    statusEl.textContent = "נא לבחור אם תגיעו";
    statusEl.className = "status-msg err";
    return;
  }
  if (attending === true && transport === null) {
    statusEl.textContent = "נא לבחור כיצד תגיעו - אוטובוס או עצמאית";
    statusEl.className = "status-msg err";
    return;
  }

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "שולח...";

  const entry = {
    name,
    attending,
    guests,
    note,
    transport: attending ? transport : null,
  };

  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });

    // Save locally to pre-fill on edit
    localStorage.setItem("rsvp_data", JSON.stringify(entry));

    document.getElementById("formView").style.display = "none";
    document.getElementById("thanksView").style.display = "block";
    document.getElementById("thanksText").textContent = attending
      ? "שמחים שתהיו איתנו! נתראה ב-31.8.2026 בכותל."
      : "תודה שעדכנתם אותנו, תתגעגעו!";
  } catch (err) {
    statusEl.textContent = "משהו השתבש, נסו שוב בעוד רגע";
    statusEl.className = "status-msg err";
    btn.disabled = false;
    btn.textContent = "שליחת אישור";
  }
}

const HOST_SECRET = atob("MjNHYWwwOA==");
let hostLoaded = false;
async function loadHostPanel() {
  const panel = document.getElementById("hostPanel");
  panel.classList.add("show");
  if (hostLoaded) return;
  hostLoaded = true;
  const summaryEl = document.getElementById("hostSummary");
  const listEl = document.getElementById("hostList");
  try {
    const res = await fetch(SCRIPT_URL);
    const rows = await res.json();
    let totalGuests = 0,
      confirmed = 0,
      declined = 0,
      busSeats = 0;

    for (const e of rows) {
      if (e.attending) {
        confirmed++;
        totalGuests += parseInt(e.guests, 10) || 1;
        if (e.transport === "bus") {
          busSeats += parseInt(e.guests, 10) || 1;
        }
      } else {
        declined++;
      }
    }

    summaryEl.innerHTML = `${confirmed} משפחות מגיעות (סה"כ ${totalGuests} אורחים) · ${declined} לא מגיעים<br>אוטובוס: ${busSeats}/${BUS_CAPACITY} מקומות תפוסים${busSeats >= BUS_CAPACITY ? " - מלא!" : ""}`;

    listEl.innerHTML =
      rows
        .reverse()
        .map((e) => {
          const way = !e.attending
            ? "לא מגיעים"
            : e.transport === "bus"
              ? "אוטובוס"
              : "עצמאית";
          return `<div class="host-row"><span>${e.name}${e.note ? " - " + e.note : ""}</span><span>${e.attending ? e.guests + " אורחים · " + way : way}</span></div>`;
        })
        .join("") ||
      '<div class="host-row"><span>עדיין אין תשובות</span></div>';
  } catch (err) {
    summaryEl.textContent = "לא הצלחנו לטעון את התשובות";
  }
}

function askForPin() {
  document.getElementById("pinInput").value = "";
  document.getElementById("pinErr").textContent = "";
  document.getElementById("pinOverlay").classList.add("show");
  document.getElementById("pinInput").focus();
}
function closePinModal() {
  document.getElementById("pinOverlay").classList.remove("show");
}
function checkPinInput() {
  const entered = document.getElementById("pinInput").value.trim();
  if (entered === HOST_SECRET) {
    closePinModal();
    loadHostPanel();
  } else {
    document.getElementById("pinErr").textContent = "קוד שגוי";
  }
}
