const API_URL = "https://script.google.com/macros/s/AKfycbxNFuhBMPBn9g1ZhVLybwrTEjHMCMqHFuBbjyaz1NLnB9UDmH_YsblQ26l4aFcVXy4/exec";
// ⚠️ Deve essere IDENTICO al Client ID usato in app.js e Code.gs.
const GOOGLE_CLIENT_ID = "502671012765-qupbn2bnhhovfsjlb375c6mlhhalbpcf.apps.googleusercontent.com";

let googleIdToken = null;
let originChart = null;

document.addEventListener("DOMContentLoaded", () => {
  const savedToken = sessionStorage.getItem("swan_google_token");
  if (savedToken) {
    googleIdToken = savedToken;
    enterDashboard();
  } else {
    initGoogleSignIn();
  }
});

function initGoogleSignIn() {
  if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
    setTimeout(initGoogleSignIn, 300);
    return;
  }
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleSignIn
  });
  google.accounts.id.renderButton(
    document.getElementById("google-signin-button"),
    { theme: "outline", size: "large", text: "signin_with", locale: "it" }
  );
}

function handleGoogleSignIn(response) {
  googleIdToken = response.credential;
  sessionStorage.setItem("swan_google_token", googleIdToken);
  enterDashboard();
}

function enterDashboard() {
  document.getElementById("auth-gate").classList.add("hidden");
  document.getElementById("dashboard-content").classList.remove("hidden");
  applyDateFilter('week', document.querySelector('.dash-filter-btn[data-range="week"]'));
}

function handleAuthRejection(message) {
  sessionStorage.removeItem("swan_google_token");
  googleIdToken = null;
  document.getElementById("dashboard-content").classList.add("hidden");
  const errEl = document.getElementById("auth-error-msg");
  if (errEl) { errEl.textContent = message || "Accesso non autorizzato. Riprova con un account abilitato."; errEl.classList.remove("hidden"); }
  document.getElementById("auth-gate").classList.remove("hidden");
  initGoogleSignIn();
}

// ==========================================
// FILTRI DATA
// ==========================================
function formatDateISO(d) {
  return d.toISOString().split("T")[0];
}

function applyDateFilter(range, btnEl) {
  document.querySelectorAll(".dash-filter-btn").forEach(b => b.classList.remove("active"));
  if (btnEl) btnEl.classList.add("active");

  const today = new Date();
  let start = null, end = formatDateISO(today);

  if (range === "week") {
    const d = new Date(today);
    const day = d.getDay(); // 0=domenica
    const diffToMonday = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diffToMonday);
    start = formatDateISO(d);
  } else if (range === "month") {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    start = formatDateISO(d);
  } else if (range === "4months") {
    const d = new Date(today);
    d.setMonth(d.getMonth() - 4);
    start = formatDateISO(d);
  } else if (range === "all") {
    start = null;
    end = null;
  }

  document.getElementById("filter-start").value = start || "";
  document.getElementById("filter-end").value = end || "";

  fetchStats(start, end);
}

function applyCustomRange() {
  document.querySelectorAll(".dash-filter-btn").forEach(b => b.classList.remove("active"));
  const start = document.getElementById("filter-start").value || null;
  const end = document.getElementById("filter-end").value || null;
  fetchStats(start, end);
}

// ==========================================
// RECUPERO E RENDERING DATI
// ==========================================
async function fetchStats(start, end) {
  document.getElementById("dash-loading").classList.remove("hidden");
  document.getElementById("dash-body").classList.add("hidden");

  try {
    let url = `${API_URL}?action=getDashboardStats&id_token=${encodeURIComponent(googleIdToken || "")}`;
    if (start) url += `&start=${encodeURIComponent(start)}`;
    if (end) url += `&end=${encodeURIComponent(end)}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status === "error" && /autorizzat/i.test(data.message || "")) {
      handleAuthRejection(data.message);
      return;
    }

    renderStats(data);
  } catch (err) {
    alert("Errore nel caricamento delle statistiche: " + err.toString());
  } finally {
    document.getElementById("dash-loading").classList.add("hidden");
    document.getElementById("dash-body").classList.remove("hidden");
  }
}

function renderStats(data) {
  const perOrigine = data.perOrigine || {};
  const scratch = perOrigine.scratch || 0;
  const presetS = perOrigine.preset_S || 0;
  const presetM = perOrigine.preset_M || 0;
  const presetL = perOrigine.preset_L || 0;

  document.getElementById("stat-totale").textContent = data.totale || 0;
  document.getElementById("stat-scratch").textContent = scratch;
  document.getElementById("stat-preset-s").textContent = presetS;
  document.getElementById("stat-preset-m").textContent = presetM;
  document.getElementById("stat-preset-l").textContent = presetL;

  renderOriginChart(scratch, presetS, presetM, presetL);
  renderRankList("list-aggiunte", data.funzioniPiuAggiunte || [], "added");
  renderRankList("list-rimosse", data.funzioniPiuRimosse || [], "removed");
}

function renderOriginChart(scratch, presetS, presetM, presetL) {
  const total = scratch + presetS + presetM + presetL;
  const canvas = document.getElementById("origin-chart");
  const emptyMsg = document.getElementById("chart-empty-msg");

  if (total === 0) {
    canvas.classList.add("hidden");
    emptyMsg.classList.remove("hidden");
    if (originChart) { originChart.destroy(); originChart = null; }
    return;
  }
  canvas.classList.remove("hidden");
  emptyMsg.classList.add("hidden");

  const ctx = canvas.getContext("2d");
  const chartData = {
    labels: ["Da Zero", "Preset S", "Preset M", "Preset L"],
    datasets: [{
      data: [scratch, presetS, presetM, presetL],
      backgroundColor: ["#94A3B8", "#10B981", "#F59E0B", "#EF4444"],
      borderWidth: 2,
      borderColor: "#ffffff"
    }]
  };

  if (originChart) {
    originChart.data = chartData;
    originChart.update();
  } else {
    originChart = new Chart(ctx, {
      type: "doughnut",
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { font: { family: "Inter" }, padding: 14 } }
        }
      }
    });
  }
}

function renderRankList(containerId, items, variant) {
  const container = document.getElementById(containerId);
  if (!items || items.length === 0) {
    container.innerHTML = `<p class="dash-rank-empty">Nessun dato nel periodo selezionato.</p>`;
    return;
  }

  const maxCount = Math.max(...items.map(i => i.conteggio));
  let html = "";
  items.forEach(item => {
    const pct = maxCount > 0 ? Math.round((item.conteggio / maxCount) * 100) : 0;
    html += `
      <div class="dash-rank-row">
        <span class="dash-rank-name" title="${escapeHtml(item.funzione)}">${escapeHtml(item.funzione)}</span>
        <div class="dash-rank-bar-wrap"><div class="dash-rank-bar ${variant}" style="width:${pct}%;"></div></div>
        <span class="dash-rank-count">${item.conteggio}</span>
      </div>
    `;
  });
  container.innerHTML = html;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}
