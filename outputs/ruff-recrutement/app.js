const slides = [
  {
    kind: "fields",
    intro: true,
    title: "Join a design agency and get paid $2k–$5k/month",
    introCopy: "Hi everyone,<br><br>At Ruff.agency, we're hiring a brand designer and a website designer for a long-term freelance or full-time position.",
    hint: "",
    button: "Apply now",
    roles: [
      {
        title: "Brand Designer",
        bullets: ["Build bold, distinctive brand identities", "Create visual systems, guidelines and campaign assets", "Turn strategy into memorable creative directions"]
      },
      {
        title: "Website Designer",
        bullets: ["Design responsive experiences in Figma", "Create high-converting landing pages", "Design complete, polished multi-page websites"]
      }
    ],
    fields: [
      { key: "role", label: "Which position fits you best?", type: "choice", options: ["Brand Designer", "Website Designer", "I can do both"], full: true }
    ]
  },
  {
    kind: "fields",
    title: "A little about you",
    hint: "Tell us where you’re based and how we can reach you.",
    fields: [
      { key: "name", label: "Full name", type: "text", placeholder: "Alex Martin", autocomplete: "name" },
      { key: "email", label: "Email address", type: "email", placeholder: "alex@email.com", autocomplete: "email" },
      { key: "age", label: "How old are you?", type: "number", placeholder: "Age" },
      { key: "location", label: "Where do you live?", type: "text", placeholder: "Ukraine", autocomplete: "country-name" },
      { key: "whatsapp", label: "WhatsApp number", type: "tel", placeholder: "+33 6 12 34 56 78", autocomplete: "tel" },
      { key: "languages", label: "Which languages do you speak?", type: "text", placeholder: "English — conversational…", full: true }
    ]
  },
  {
    kind: "fields",
    pricing: true,
    title: "Your project rate",
    hint: "Tell us your usual design fee. We only need the price for the work you’re strongest at.",
    fields: []
  },
  {
    kind: "fields",
    title: "Show us your work",
    hint: "Share the strongest work you have created.",
    submit: true,
    fields: [
      {
        key: "portfolio",
        label: "Give us your portfolio link. (Google Drive, Behance...)",
        note: "(The more relevant projects you include, the better your chance of standing out and moving ahead of other applicants.)",
        type: "url",
        placeholder: "https://",
        full: true
      }
    ]
  }
];

const state = { current: 0, answers: {} };
const supabaseClient = window.supabase.createClient(
  window.RUFF_CONFIG.supabaseUrl,
  window.RUFF_CONFIG.supabaseKey
);
const form = document.querySelector("#applicationForm");
const fieldContainer = document.querySelector("#fieldContainer");
const questionContent = document.querySelector("#questionContent");
const errorMessage = document.querySelector("#errorMessage");
const backButton = document.querySelector("#backButton");
const forwardButton = document.querySelector("#forwardButton");
const successScreen = document.querySelector("#successScreen");
const nextButton = document.querySelector("#nextButton");

document.querySelector("#totalSteps").textContent = slides.length;
document.querySelector(".progress-track").setAttribute("aria-valuemax", slides.length);

function inputMarkup(field) {
  const common = `data-key="${field.key}" ${field.optional ? "" : "required"}`;
  if (field.type === "choice") {
    return `<div class="choices">${field.options.map(option => `
      <label class="choice"><input type="radio" name="${field.key}" value="${option}" ${common}><span>${option}</span></label>
    `).join("")}</div>`;
  }
  if (field.type === "select") {
    return `<select class="select-field" ${common}>
      <option value="" disabled selected>Select an answer</option>
      ${field.options.map(option => `<option value="${option}">${option}</option>`).join("")}
    </select>`;
  }
  if (field.type === "textarea") {
    return `<textarea class="textarea-field" placeholder="${field.placeholder}" ${common}></textarea>`;
  }
  if (field.currency) {
    return `<div class="currency-field"><input class="field" type="text" inputmode="decimal" placeholder="${field.placeholder}" ${common}><span>USD</span></div>`;
  }
  return `<input class="field" type="${field.type}" placeholder="${field.placeholder}" autocomplete="${field.autocomplete || "off"}" ${common}>`;
}

function fieldsFor(slide) {
  if (!slide.pricing) return slide.fields;
  const role = state.answers.role;
  const websiteRate = {
    key: "websiteRate",
    label: "Your price for designing a complete website",
    note: "Visual design only — no copywriting, branding or UX structure.",
    type: "text",
    placeholder: "Enter your price",
    currency: true,
    full: true
  };
  const brandingRate = {
    key: "brandingRate",
    label: "Your price for a complete branding project",
    type: "text",
    placeholder: "Enter your price",
    currency: true,
    full: true
  };
  if (role === "Brand Designer") return [brandingRate];
  if (role === "Website Designer") return [websiteRate];
  return [brandingRate, websiteRate];
}

function renderFields(slide) {
  return `<div class="fields-grid ${slide.pricing ? "pricing-fields" : ""}">${fieldsFor(slide).map(field => `
    <div class="field-group ${field.full ? "full" : ""}">
      ${field.label ? `<label class="field-label">${field.label}${field.optional ? "" : '<span class="required-mark">*</span>'}</label>` : ""}
      ${field.note ? `<p class="field-note">${field.note}</p>` : ""}
      ${inputMarkup(field)}
    </div>
  `).join("")}</div>`;
}

function renderQuestion() {
  const slide = slides[state.current];
  questionContent.style.animation = "none";
  void questionContent.offsetWidth;
  questionContent.style.animation = "";
  document.querySelector("#currentStep").textContent = state.current + 1;
  document.querySelector("#question-title").textContent = slide.title;
  document.querySelector("#question-title").className = slide.intro ? "intro-title" : "";
  document.querySelector("#questionHint").style.display = slide.hint ? "" : "none";
  document.querySelector("#questionHint").textContent = slide.hint || "";

  if (slide.intro) {
    fieldContainer.innerHTML = `
      <p class="intro-copy">${slide.introCopy}</p>
      <p class="roles-heading">Here’s what you’ll be working on at RUFF.</p>
      <div class="role-grid">${slide.roles.map(role => `
        <article class="role-card"><h2>${role.title}</h2><ul>${role.bullets.map(item => `<li>${item}</li>`).join("")}</ul></article>
      `).join("")}</div>
      ${renderFields(slide)}`;
    restoreAnswers(slide);
  } else {
    fieldContainer.innerHTML = renderFields(slide);
    restoreAnswers(slide);
  }

  errorMessage.textContent = "";
  nextButton.querySelector("span:first-child").textContent = slide.submit ? "Submit application" : (slide.button || "Next");
  document.querySelector(".progress-fill").style.width = `${((state.current + 1) / slides.length) * 100}%`;
  document.querySelector(".progress-track").setAttribute("aria-valuenow", state.current + 1);
  backButton.disabled = state.current === 0;
  updateForwardArrow();
  window.setTimeout(() => fieldContainer.querySelector("input, select, textarea")?.focus(), 120);
}

function restoreAnswers(slide) {
  fieldsFor(slide).forEach(field => {
    const value = state.answers[field.key];
    if (!value) return;
    if (field.type === "choice") {
      const input = [...fieldContainer.querySelectorAll(`[data-key="${field.key}"]`)].find(node => node.value === value);
      if (input) input.checked = true;
    } else {
      fieldContainer.querySelector(`[data-key="${field.key}"]`).value = value;
    }
  });
}

function valueFor(field) {
  if (field.type === "choice") return fieldContainer.querySelector(`[data-key="${field.key}"]:checked`)?.value || "";
  return fieldContainer.querySelector(`[data-key="${field.key}"]`)?.value.trim() || "";
}

function validateField(field, value) {
  if (!value && !field.optional) return `${field.label || "This answer"} is required.`;
  if (field.key === "age" && value && (Number(value) < 1 || Number(value) > 100)) return "Enter a valid age.";
  if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email address.";
  if (field.type === "tel" && value && value.replace(/\D/g, "").length < 8) return "Enter a valid phone number.";
  if (field.type === "url" && value) {
    try { new URL(value); } catch { return "Enter a complete URL beginning with https://"; }
  }
  if (field.type === "textarea" && value.length < 15) return "Tell us a little more (15 characters minimum).";
  return "";
}

function validateSlide(save = false) {
  const slide = slides[state.current];
  if (slide.kind !== "fields") return "";
  for (const field of fieldsFor(slide)) {
    const value = valueFor(field);
    const error = validateField(field, value);
    if (error) return error;
    if (save) state.answers[field.key] = value || "Not provided";
  }
  return "";
}

function updateForwardArrow() {
  forwardButton.disabled = state.current === slides.length - 1 || Boolean(validateSlide(false));
}

async function goNext() {
  const error = validateSlide(true);
  if (error) {
    errorMessage.textContent = error;
    fieldContainer.querySelector("input, select, textarea")?.focus();
    return;
  }
  if (state.current < slides.length - 1) {
    state.current += 1;
    renderQuestion();
  } else {
    nextButton.disabled = true;
    nextButton.querySelector("span:first-child").textContent = "Sending…";
    try {
      await saveApplication();
    } catch (submissionError) {
      console.error(submissionError);
      errorMessage.textContent = "We couldn’t send your application. Please check your connection and try again.";
      nextButton.disabled = false;
      nextButton.querySelector("span:first-child").textContent = "Submit application";
      return;
    }
    document.querySelector(".page").hidden = true;
    successScreen.hidden = false;
    launchConfetti();
    console.info("Application ready to connect to a submission service:", state.answers);
  }
}

function numericRate(value) {
  if (!value) return null;
  const parsed = Number(String(value).replace(/[^0-9.,]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

async function saveApplication() {
  const payload = {
    full_name: state.answers.name,
    email: state.answers.email,
    age: Number(state.answers.age),
    location: state.answers.location,
    whatsapp: state.answers.whatsapp,
    languages: state.answers.languages,
    role: state.answers.role,
    branding_rate: numericRate(state.answers.brandingRate),
    website_rate: numericRate(state.answers.websiteRate),
    portfolio_url: state.answers.portfolio
  };
  const { error } = await supabaseClient.from("applications").insert(payload);
  if (error) throw error;
  await supabaseClient.from("application_events").insert({ event_type: "form_completed" });
}

function launchConfetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.querySelector("#confettiCanvas");
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);
  const colors = ["#17191b", "#3698ee", "#ffffff", "#7dd9ef", "#ffd45c"];
  const particles = Array.from({ length: 150 }, () => ({
    x: innerWidth / 2 + (Math.random() - .5) * 120,
    y: innerHeight * .25,
    vx: (Math.random() - .5) * 16,
    vy: -Math.random() * 11 - 5,
    gravity: .22 + Math.random() * .12,
    rotation: Math.random() * Math.PI,
    spin: (Math.random() - .5) * .25,
    size: 5 + Math.random() * 7,
    color: colors[Math.floor(Math.random() * colors.length)]
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    particles.forEach(p => {
      p.x += p.vx; p.vy += p.gravity; p.y += p.vy; p.vx *= .99; p.rotation += p.spin;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation); ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * .66); ctx.restore();
    });
    frame += 1;
    if (frame < 240) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, innerWidth, innerHeight);
  }
  requestAnimationFrame(draw);
}

form.addEventListener("submit", event => { event.preventDefault(); goNext(); });
fieldContainer.addEventListener("input", () => { errorMessage.textContent = ""; updateForwardArrow(); });
fieldContainer.addEventListener("change", () => { errorMessage.textContent = ""; updateForwardArrow(); });
backButton.addEventListener("click", () => {
  if (state.current === 0) return;
  validateSlide(true);
  state.current -= 1;
  renderQuestion();
});
forwardButton.addEventListener("click", goNext);
supabaseClient.from("application_events").insert({ event_type: "form_started" }).then(({ error }) => {
  if (error) console.warn("Could not record form start", error.message);
});
renderQuestion();
