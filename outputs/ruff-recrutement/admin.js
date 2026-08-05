const supabaseClient = window.supabase.createClient(
  window.RUFF_CONFIG.supabaseUrl,
  window.RUFF_CONFIG.supabaseKey
);

const samples = [
  {
    id: "RUFF-DEMO1", submittedAt: new Date(Date.now() - 86400000).toISOString(), status: "pending", emailStatus: "not_sent",
    answers: { name: "Maya Wilson", age: "27", location: "Lisbon, Portugal", whatsapp: "+351 912 345 678", languages: "English, Portuguese, French", role: "Website Designer", websiteRate: "3200", portfolio: "https://behance.net/mayawilson" }
  },
  {
    id: "RUFF-DEMO2", submittedAt: new Date(Date.now() - 172800000).toISOString(), status: "pending", emailStatus: "not_sent",
    answers: { name: "Niko Petrov", age: "31", location: "Kyiv, Ukraine", whatsapp: "+380 67 123 4567", languages: "English, Ukrainian", role: "I can do both", websiteRate: "2800", brandingRate: "2100", portfolio: "https://drive.google.com/niko" }
  },
  {
    id: "RUFF-DEMO3", submittedAt: new Date(Date.now() - 259200000).toISOString(), status: "accepted", emailStatus: "sent",
    answers: { name: "Lina Costa", age: "24", location: "Porto, Portugal", whatsapp: "+351 934 222 111", languages: "English, Portuguese", role: "Brand Designer", brandingRate: "1900", portfolio: "https://behance.net/linacosta" }
  }
];

let applications = [];
let activeId = null;
let activities = [];
let metrics = { starts: 0, completions: 0, emailsOpened: 0, emailsSent: 0 };

const deck = document.querySelector("#deck");
const rejectDialog = document.querySelector("#rejectDialog");

function initials(name = "Candidate") {
  return name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

function money(value) {
  if (!value) return "—";
  return `$${value} USD`;
}

function rateSummary(answers) {
  return [answers.brandingRate && `Brand ${money(answers.brandingRate)}`, answers.websiteRate && `Web ${money(answers.websiteRate)}`].filter(Boolean).join(" · ") || "—";
}

function pendingApplications() { return applications.filter(app => app.status === "pending"); }

function renderAll() {
  renderMetrics();
  renderDeck();
  renderTable();
  renderActivity();
  renderAnalytics();
}

function rowToApplication(row) {
  return {
    id: row.id,
    submittedAt: row.submitted_at,
    status: row.status,
    emailStatus: row.email_status,
    rejectionReason: row.rejection_reason,
    answers: {
      name: row.full_name,
      age: String(row.age),
      location: row.location,
      whatsapp: row.whatsapp,
      languages: row.languages,
      role: row.role,
      brandingRate: row.branding_rate,
      websiteRate: row.website_rate,
      portfolio: row.portfolio_url
    }
  };
}

async function loadRemoteData() {
  const [{ data: rows, error: applicationsError }, { data: events, error: eventsError }] = await Promise.all([
    supabaseClient.from("applications").select("*").order("submitted_at", { ascending: false }),
    supabaseClient.from("application_events").select("event_type,occurred_at").order("occurred_at", { ascending: false })
  ]);
  if (applicationsError) throw applicationsError;
  if (eventsError) throw eventsError;
  applications = rows.map(rowToApplication);
  activities = applications
    .filter(app => app.status !== "pending")
    .map(app => ({ at: app.submittedAt, text: `${app.answers.name} ${app.status}` }));
  metrics = {
    starts: events.filter(event => event.event_type === "form_started").length,
    completions: events.filter(event => event.event_type === "form_completed").length,
    emailsSent: events.filter(event => event.event_type === "email_sent").length,
    emailsOpened: events.filter(event => event.event_type === "email_opened").length
  };
  renderAll();
}

function renderMetrics() {
  const pending = pendingApplications().length;
  document.querySelector("#totalMetric").textContent = applications.length;
  document.querySelector("#pendingMetric").textContent = pending;
  document.querySelector("#completionMetric").textContent = `${metrics.starts ? Math.round((Math.max(metrics.completions, applications.length) / Math.max(metrics.starts, applications.length)) * 100) : 0}%`;
  document.querySelector("#openMetric").textContent = metrics.emailsSent ? `${Math.round(metrics.emailsOpened / metrics.emailsSent * 100)}%` : "—";
}

function cardMarkup(app) {
  const a = app.answers;
  return `<article class="candidate-card" data-id="${app.id}">
    <div class="candidate-top"><div class="avatar">${initials(a.name)}</div><div><h3>${a.name || "Unnamed candidate"}</h3><p>${a.role || "Designer"} · ${a.location || "Location unknown"}</p></div><span class="status">${app.status}</span></div>
    <div class="candidate-details">
      <div class="detail"><span>Age</span><strong>${a.age || "—"}</strong></div>
      <div class="detail"><span>WhatsApp</span><strong>${a.whatsapp || "—"}</strong></div>
      <div class="detail"><span>Languages</span><strong>${a.languages || "—"}</strong></div>
      <div class="detail"><span>Project rate</span><strong>${rateSummary(a)}</strong></div>
    </div>
    <a class="portfolio-link" href="${a.portfolio || "#"}" target="_blank" rel="noopener">View portfolio · ${a.portfolio || "No link"}</a>
  </article>`;
}

function renderDeck() {
  const pending = pendingApplications();
  activeId = pending.some(app => app.id === activeId) ? activeId : pending[0]?.id || null;
  const ordered = activeId ? [...pending.filter(app => app.id !== activeId).slice(0, 2).reverse(), pending.find(app => app.id === activeId)] : [];
  deck.innerHTML = ordered.length ? ordered.map(cardMarkup).join("") : `<div class="empty"><div><strong>Inbox zero</strong><p>No application is waiting for review.</p></div></div>`;
  document.querySelector("#deckCounter").textContent = `${pending.length} waiting`;
  document.querySelector("#acceptButton").disabled = !activeId;
  document.querySelector("#rejectButton").disabled = !activeId;
}

function renderTable(filter = "") {
  const rows = applications.filter(app => `${app.answers.name} ${app.answers.role} ${app.answers.location}`.toLowerCase().includes(filter.toLowerCase()));
  document.querySelector("#talentTable").innerHTML = rows.map(app => `<tr>
    <td><strong>${app.answers.name || "Unnamed"}</strong><small>${app.answers.whatsapp || ""}</small></td>
    <td>${app.answers.role || "—"}</td><td>${app.answers.location || "—"}</td><td>${rateSummary(app.answers)}</td>
    <td><span class="pill ${app.status}">${app.status}</span></td><td>${new Date(app.submittedAt).toLocaleDateString()}</td>
  </tr>`).join("") || `<tr><td colspan="6">No matching candidate.</td></tr>`;
}

function renderActivity() {
  document.querySelector("#activityList").innerHTML = activities.length ? activities.slice(0, 8).map(item => `<div class="activity-item"><strong>${item.text}</strong><span>${new Date(item.at).toLocaleString()}</span></div>`).join("") : `<div class="empty">No decision yet.</div>`;
}

function renderAnalytics() {
  const starts = Math.max(metrics.starts, applications.length);
  const completions = Math.max(metrics.completions, applications.length);
  document.querySelector("#funnelChart").innerHTML = [
    ["Formulaire ouvert", starts], ["Candidature terminée", completions], ["Candidats acceptés", applications.filter(a => a.status === "accepted").length]
  ].map(([label, value]) => `<div class="funnel-row"><div class="funnel-label"><span>${label}</span><strong>${value}</strong></div><div class="bar"><span style="width:${starts ? value / starts * 100 : 0}%"></span></div></div>`).join("");
  const roles = ["Brand Designer", "Website Designer", "I can do both"];
  document.querySelector("#roleChart").innerHTML = roles.map((role, i) => `<div class="role-row"><span class="role-dot" style="opacity:${1 - i * .22}"></span><span>${role}</span><strong>${applications.filter(a => a.answers.role === role).length}</strong></div>`).join("");
}

async function recordDecision(id, status, reason = "") {
  const app = applications.find(item => item.id === id);
  if (!app) return;
  const { error } = await supabaseClient.from("applications").update({
    status,
    rejection_reason: reason || null,
    decided_at: new Date().toISOString(),
    email_status: status === "rejected" ? "queued" : "not_sent"
  }).eq("id", id);
  if (error) throw error;
  app.status = status;
  app.decidedAt = new Date().toISOString();
  app.rejectionReason = reason;
  app.emailStatus = status === "rejected" ? "queued" : "not_sent";
  activities.unshift({ at: new Date().toISOString(), text: `${app.answers.name || "Candidate"} ${status}${status === "rejected" ? " · email queued" : ""}` });
  activeId = null;
}

function animateDecision(direction, callback) {
  const card = deck.querySelector(`[data-id="${activeId}"]`);
  if (!card) return callback();
  card.classList.add(direction === "right" ? "swipe-right" : "swipe-left");
  setTimeout(callback, 380);
}

document.querySelector("#acceptButton").addEventListener("click", () => {
  const id = activeId;
  animateDecision("right", async () => {
    try { await recordDecision(id, "accepted"); renderAll(); }
    catch (error) { alert(`Decision failed: ${error.message}`); await loadRemoteData(); }
  });
});
document.querySelector("#rejectButton").addEventListener("click", () => {
  const app = applications.find(item => item.id === activeId);
  if (!app) return;
  document.querySelector("#rejectCandidateText").textContent = `You’re about to reject ${app.answers.name || "this candidate"}. Hold the final button to prevent accidental decisions.`;
  rejectDialog.showModal();
});

let holdTimer;
const holdButton = document.querySelector("#holdReject");
function startHold(event) {
  event.preventDefault();
  holdButton.classList.add("holding");
  holdTimer = setTimeout(() => {
    const reason = document.querySelector("#rejectReason").value.trim();
    rejectDialog.close();
    const id = activeId;
    animateDecision("left", async () => {
      try { await recordDecision(id, "rejected", reason); renderAll(); }
      catch (error) { alert(`Decision failed: ${error.message}`); await loadRemoteData(); }
    });
    holdButton.classList.remove("holding");
    document.querySelector("#rejectReason").value = "";
  }, 1500);
}
function cancelHold() { clearTimeout(holdTimer); holdButton.classList.remove("holding"); }
holdButton.addEventListener("pointerdown", startHold);
["pointerup", "pointerleave", "pointercancel"].forEach(name => holdButton.addEventListener(name, cancelHold));

document.addEventListener("keydown", event => {
  if (rejectDialog.open || !activeId) return;
  if (event.key === "ArrowRight") document.querySelector("#acceptButton").click();
  if (event.key === "ArrowLeft") document.querySelector("#rejectButton").click();
});

document.querySelector("#searchInput").addEventListener("input", event => renderTable(event.target.value));
document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".nav-item, .view").forEach(node => node.classList.remove("active"));
  button.classList.add("active");
  document.querySelector(`#${button.dataset.view}View`).classList.add("active");
  document.querySelector("#viewTitle").textContent = { review: "Review applications", talent: "Talent pool", analytics: "Analytique" }[button.dataset.view];
}));

document.querySelector("#authForm").addEventListener("submit", async event => {
  event.preventDefault();
  const message = document.querySelector("#authMessage");
  message.textContent = "Sending secure link…";
  const email = document.querySelector("#adminEmail").value.trim();
  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/admin` }
  });
  message.textContent = error ? error.message : "Check your inbox and open the secure link.";
});

document.querySelector("#logoutButton").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  location.reload();
});

async function initializeAdmin() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    document.querySelector("#authScreen").hidden = false;
    return;
  }
  document.querySelector("#authScreen").hidden = true;
  try {
    await loadRemoteData();
  } catch (error) {
    document.querySelector("#deck").innerHTML = `<div class="empty">Could not load applications: ${error.message}</div>`;
  }
}

initializeAdmin();
