// ==========================================
// STATO GLOBALE
// ==========================================
let appData = {
  config_id: '',
  info: { azienda: '', nome: '', compilatore: '', email: '' },
  aziendaData: {},
  modulesData: {},
  usa_erp_globale: false,
  erp_sistema_nome: ''
};

let aziendaStructure = [];

const modulesStructure = [
  {
    category: "ADMIN / CONSOLE",
    modules: [
      { id: "console_attivazioni", title: "CONSOLE ATTIVAZIONI" },
      { id: "console_garanzie", title: "CONSOLE GARANZIE" },
      { id: "console_ordini", title: "CONSOLE ORDINI" },
      { id: "console_tagliandi", title: "CONSOLE TAGLIANDI" }
    ]
  }
];

// ==========================================
// NAVIGAZIONE
// ==========================================
function navTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('page-visible'));

  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add('page-visible');
  } else {
    console.error("Pagina non trovata:", pageId);
    return;
  }

  const dock = document.getElementById('main-dock-bar');
  if (dock) {
    dock.style.display = (['landing-page', 'hub-page', 'success-page'].includes(pageId)) ? 'none' : 'flex';
  }

  if (pageId === 'azienda-page') renderAziendaBuilder();
  if (pageId === 'modules-page') renderModulesBuilder();
  if (pageId === 'hub-page') updateHubCardsStatus();

  window.scrollTo(0, 0);
}

function resetAndHome() {
  navTo('landing-page');
}

function toggleRecallBox() {
  const box = document.getElementById('recall-box');
  if (box) box.style.display = (box.style.display === 'block') ? 'none' : 'block';
}

// ==========================================
// LETTURA EXCEL DINAMICA (FOGLIO "AZIENDA")
// ==========================================
function leggiFileExcel(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });

    // Cerca il foglio "AZIENDA" (o prende il primo foglio se non lo trova)
    const sheetName = workbook.SheetNames.includes("AZIENDA") ? "AZIENDA" : workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Converte il foglio in dati grezzi
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: "A" });
    
    // Mappa le colonne A, B, C, D, E nella nostra struttura
    aziendaStructure = trasformaExcelInStruttura(rawData);
    
    alert(`Foglio "${sheetName}" caricato con successo con ${aziendaStructure.length} argomenti!`);
    renderAziendaBuilder();
  };
  reader.readAsArrayBuffer(file);
}

function trasformaExcelInStruttura(rawData) {
  const sezioniMap = {};

  rawData.forEach((row, index) => {
    if (index === 0) return; // Salta intestazione (riga 1)

    const colA = row.A ? String(row.A).trim() : 'GENERALE';
    const colB = row.B ? String(row.B).trim() : '';
    const colC = row.C ? String(row.C).split(';').map(o => o.trim()) : [];
    const colD = row.D ? String(row.D).trim().toLowerCase() : 'text';
    const colE = row.E ? (String(row.E).trim().toLowerCase() === 'true' || String(row.E).trim() === '1') : false;

    if (!colB) return;

    if (!sezioniMap[colA]) {
      sezioniMap[colA] = { colonnaA_sezione: colA, domande: [] };
    }

    sezioniMap[colA].domande.push({
      colonnaB_domanda: colB,
      colonnaC_opzioni: colC,
      colonnaD_tipo: colD,
      colonnaE_obbligatorio: colE,
      haCampoAltro: colC.some(opt => opt.toLowerCase() === 'altro')
    });
  });

  return Object.values(sezioniMap);
}

// ==========================================
// GESTIONE DATI E CONFIGURAZIONE
// ==========================================
function startNewConfig() {
  appData = {
    config_id: 'SW-' + Math.floor(1000 + Math.random() * 9000),
    info: { azienda: '', nome: '', compilatore: '', email: '' },
    aziendaData: {},
    modulesData: {},
    usa_erp_globale: false,
    erp_sistema_nome: ''
  };

  ['azienda', 'nome', 'compilatore', 'email', 'input-recupera-codice'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  navTo('hub-page');
}

function recuperaConfigurazione() {
  const codeInput = document.getElementById('input-recupera-codice');
  const code = codeInput ? codeInput.value.trim().toUpperCase() : '';

  if (!code) {
    alert("Inserisci un codice valido!");
    return;
  }

  const saved = localStorage.getItem('SWAN_CONFIG_' + code);
  if (!saved) {
    alert("Nessuna configurazione trovata per: " + code);
    return;
  }

  appData = JSON.parse(saved);

  if (document.getElementById('azienda')) document.getElementById('azienda').value = appData.info.azienda || '';
  if (document.getElementById('nome')) document.getElementById('nome').value = appData.info.nome || '';
  if (document.getElementById('compilatore')) document.getElementById('compilatore').value = appData.info.compilatore || '';
  if (document.getElementById('email')) document.getElementById('email').value = appData.info.email || '';

  const erpChk = document.getElementById('usa_erp_globale');
  if (erpChk) erpChk.checked = appData.usa_erp_globale || false;
  handleGlobalERP();

  renderAziendaBuilder();
  renderModulesBuilder();

  restoreAziendaInputs();
  restoreModulesInputs();

  alert("Configurazione " + code + " caricata!");
  navTo('hub-page');
}

function saveConfiguration() {
  const az = document.getElementById('azienda')?.value.trim() || '';
  const nom = document.getElementById('nome')?.value.trim() || '';
  const comp = document.getElementById('compilatore')?.value.trim() || '';
  const em = document.getElementById('email')?.value.trim() || '';

  if (!az || !nom || !comp || !em) {
    alert("I 4 campi anagrafici nell'Hub (Cliente, Referente, Compilato da, Email) sono tutti OBBLIGATORI!");
    navTo('hub-page');
    return;
  }

  appData.info = { azienda: az, nome: nom, compilatore: comp, email: em };
  localStorage.setItem('SWAN_CONFIG_' + appData.config_id, JSON.stringify(appData));

  const finalIdEl = document.getElementById('final-id');
  if (finalIdEl) finalIdEl.innerText = appData.config_id;

  navTo('success-page');
}

// ==========================================
// RENDER ANAGRAFICA AZIENDA
// ==========================================
function renderCampoDynamic(q, fieldId) {
  const tipo = (q.colonnaD_tipo || 'text').toLowerCase();
  const opzioni = q.colonnaC_opzioni || [];

  switch (tipo) {
    case 'checkbox':
      return `
        <div style="display:flex; flex-wrap:wrap; gap:12px;">
          ${opzioni.map(opt => `
            <label><input type="checkbox" name="${fieldId}" value="${opt}" onchange="saveAziendaInputs(); autoSave(); checkAziendaCompletion();"> ${opt}</label>
          `).join('')}
          ${q.haCampoAltro ? `<input type="text" id="${fieldId}_altro" placeholder="Altro..." oninput="saveAziendaInputs(); autoSave(); checkAziendaCompletion();">` : ''}
        </div>`;

    case 'radio':
      return `
        <div style="display:flex; flex-wrap:wrap; gap:12px;">
          ${opzioni.map(opt => `
            <label><input type="radio" name="${fieldId}" value="${opt}" onchange="saveAziendaInputs(); autoSave(); checkAziendaCompletion();"> ${opt}</label>
          `).join('')}
        </div>`;

    case 'text':
    default:
      return `<input type="text" id="${fieldId}" placeholder="Risposta..." oninput="saveAziendaInputs(); autoSave(); checkAziendaCompletion();">`;
  }
}

function renderAziendaBuilder() {
  const container = document.getElementById('azienda-builder-container');
  if (!container) return;

  if (aziendaStructure.length === 0) {
    container.innerHTML = `<div style="padding:20px; text-align:center;">Carica prima il foglio Excel nella Home per vedere le domande.</div>`;
    return;
  }

  container.innerHTML = aziendaStructure.map((sec, secIdx) => `
    <div class="light-card" id="card-azienda-sec-${secIdx}" style="margin-bottom:15px;">
      <h3 style="margin-top:0;">${sec.colonnaA_sezione}</h3>
      ${sec.domande.map((q, qIdx) => `
        <div class="form-group" style="margin-bottom:12px;">
          <label>${q.colonnaB_domanda} ${q.colonnaE_obbligatorio ? '<span style="color:red">*</span>' : ''}</label>
          ${renderCampoDynamic(q, `q_${secIdx}_${qIdx}`)}
        </div>
      `).join('')}
    </div>
  `).join('');

  restoreAziendaInputs();
}

function saveAziendaInputs() {
  aziendaStructure.forEach((sec, secIdx) => {
    sec.domande.forEach((q, qIdx) => {
      const fieldId = `q_${secIdx}_${qIdx}`;
      const tipo = (q.colonnaD_tipo || 'text').toLowerCase();

      if (tipo === "checkbox") {
        const checked = Array.from(document.querySelectorAll(`input[name="${fieldId}"]:checked`)).map(cb => cb.value);
        const altroVal = document.getElementById(`${fieldId}_altro`)?.value.trim() || '';
        appData.aziendaData[q.colonnaB_domanda] = { selected: checked, altro: altroVal };
      } else if (tipo === "radio") {
        const checked = document.querySelector(`input[name="${fieldId}"]:checked`);
        appData.aziendaData[q.colonnaB_domanda] = checked ? checked.value : '';
      } else {
        appData.aziendaData[q.colonnaB_domanda] = document.getElementById(fieldId)?.value.trim() || '';
      }
    });
  });
}

function restoreAziendaInputs() {
  if (!appData.aziendaData) return;
  aziendaStructure.forEach((sec, secIdx) => {
    sec.domande.forEach((q, qIdx) => {
      const fieldId = `q_${secIdx}_${qIdx}`;
      const savedVal = appData.aziendaData[q.colonnaB_domanda];
      if (savedVal !== undefined) {
        if (q.colonnaD_tipo === "checkbox" && typeof savedVal === 'object') {
          if (savedVal.selected) {
            savedVal.selected.forEach(val => {
              const cb = document.querySelector(`input[name="${fieldId}"][value="${val}"]`);
              if (cb) cb.checked = true;
            });
          }
          const altroInput = document.getElementById(`${fieldId}_altro`);
          if (altroInput && savedVal.altro) altroInput.value = savedVal.altro;
        } else if (q.colonnaD_tipo === "radio") {
          const rb = document.querySelector(`input[name="${fieldId}"][value="${savedVal}"]`);
          if (rb) rb.checked = true;
        } else {
          const txt = document.getElementById(fieldId);
          if (txt) txt.value = savedVal;
        }
      }
    });
  });
  checkAziendaCompletion();
}

function checkAziendaCompletion() {
  aziendaStructure.forEach((sec, secIdx) => {
    const card = document.getElementById(`card-azienda-sec-${secIdx}`);
    if (!card) return;
    let complete = true;
    sec.domande.forEach((q, qIdx) => {
      if (q.colonnaE_obbligatorio) {
        const fieldId = `q_${secIdx}_${qIdx}`;
        const tipo = (q.colonnaD_tipo || 'text').toLowerCase();
        if (tipo === "checkbox") {
          const checked = document.querySelectorAll(`input[name="${fieldId}"]:checked`);
          const altro = document.getElementById(`${fieldId}_altro`)?.value.trim();
          if (checked.length === 0 && !altro) complete = false;
        } else if (tipo === "radio") {
          if (!document.querySelector(`input[name="${fieldId}"]:checked`)) complete = false;
        } else {
          if (!document.getElementById(fieldId)?.value.trim()) complete = false;
        }
      }
    });
    card.classList.toggle('azienda-completed', complete);
  });
}

// ==========================================
// RENDER MODULI
// ==========================================
function handleGlobalERP() {
  const chk = document.getElementById('usa_erp_globale');
  const masterBox = document.getElementById('nome_erp_master');
  appData.usa_erp_globale = chk ? chk.checked : false;

  if (masterBox) masterBox.style.display = appData.usa_erp_globale ? 'block' : 'none';

  document.querySelectorAll('.erp-module-control').forEach(ctrl => {
    ctrl.style.display = appData.usa_erp_globale ? 'flex' : 'none';
  });
}

function renderModulesBuilder() {
  const container = document.getElementById('builder-container');
  if (!container) return;

  container.innerHTML = modulesStructure.map(cat => `
    <div style="margin-top:15px; font-weight:bold;">${cat.category}</div>
    ${cat.modules.map(mod => `
      <div class="func-row-wrapper" id="row-${mod.id}" onclick="toggleModuleSelection('${mod.id}')">
        <div class="func-row-header">
          <span>${mod.title}</span>
        </div>
        <div class="func-sub-controls" onclick="event.stopPropagation();">
          <select id="level-${mod.id}" onchange="saveModulesInputs(); autoSave();">
            <option value="VIEW">VIEW</option>
            <option value="EDIT">EDIT</option>
          </select>
          <div class="erp-module-control" style="display:none;">
            <span>ERP</span>
            <input type="checkbox" id="erp-switch-${mod.id}" onchange="saveModulesInputs(); autoSave();">
          </div>
        </div>
        <div class="note-container" id="notebox-${mod.id}">
          <textarea id="note-${mod.id}" placeholder="Note..." oninput="saveModulesInputs(); autoSave();"></textarea>
        </div>
      </div>
    `).join('')}
  `).join('');

  handleGlobalERP();
  restoreModulesInputs();
}

function toggleModuleSelection(modId) {
  const row = document.getElementById(`row-${modId}`);
  if (!row) return;
  row.classList.toggle('is-selected');
  saveModulesInputs();
  autoSave();
}

function saveModulesInputs() {
  modulesStructure.forEach(cat => {
    cat.modules.forEach(mod => {
      const row = document.getElementById(`row-${mod.id}`);
      const isSelected = row ? row.classList.contains('is-selected') : false;
      const level = document.getElementById(`level-${mod.id}`)?.value || 'VIEW';
      const erpActive = document.getElementById(`erp-switch-${mod.id}`)?.checked || false;
      const note = document.getElementById(`note-${mod.id}`)?.value || '';

      appData.modulesData[mod.id] = { active: isSelected, level: level, erp: erpActive, note: note };
    });
  });
  calculateMetrics();
}

function restoreModulesInputs() {
  if (!appData.modulesData) return;
  Object.keys(appData.modulesData).forEach(modId => {
    const mod = appData.modulesData[modId];
    const row = document.getElementById(`row-${modId}`);
    if (row && mod.active) row.classList.add('is-selected');

    const level = document.getElementById(`level-${modId}`);
    if (level && mod.level) level.value = mod.level;

    const erpSw = document.getElementById(`erp-switch-${modId}`);
    if (erpSw && mod.erp) erpSw.checked = mod.erp;

    const note = document.getElementById(`note-${mod.id}`);
    if (note && mod.note) note.value = mod.note;
  });
  calculateMetrics();
}

function calculateMetrics() {
  let count = Object.values(appData.modulesData).filter(m => m.active).length;
  let taglia = count > 5 ? 'Taglia L' : count > 2 ? 'Taglia M' : 'Taglia S';
  let sforzo = (count * 0.5).toFixed(1) + ' gg';

  if (document.getElementById('dock-taglia-val')) document.getElementById('dock-taglia-val').innerText = taglia;
  if (document.getElementById('dock-sforzo-val')) document.getElementById('dock-sforzo-val').innerText = sforzo;
}

function autoSave() {
  if (document.getElementById('azienda')) appData.info.azienda = document.getElementById('azienda').value;
  if (document.getElementById('nome')) appData.info.nome = document.getElementById('nome').value;
  if (document.getElementById('compilatore')) appData.info.compilatore = document.getElementById('compilatore').value;
  if (document.getElementById('email')) appData.info.email = document.getElementById('email').value;

  localStorage.setItem('SWAN_DRAFT', JSON.stringify(appData));
}

function updateHubCardsStatus() {
  const cardAzienda = document.getElementById('hub-card-azienda');
  const cardConfig = document.getElementById('hub-card-config');

  const hasAziendaInfo = !!(appData.info.azienda && appData.info.nome && appData.info.compilatore && appData.info.email);
  if (cardAzienda) cardAzienda.classList.toggle('completed', hasAziendaInfo);

  const hasActiveModules = Object.values(appData.modulesData).some(m => m.active);
  if (cardConfig) cardConfig.classList.toggle('completed', hasActiveModules);
}

// ==========================================
// AVVIO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  navTo('landing-page');
});
