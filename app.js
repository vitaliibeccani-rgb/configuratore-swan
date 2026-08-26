// ==========================================
// STATO GLOBALE DELL'APPLICAZIONE
// ==========================================
let appData = {
  config_id: '',
  info: { azienda: '', nome: '', compilatore: '', email: '' },
  aziendaData: {},
  modulesData: {},
  usa_erp_globale: false,
  erp_sistema_nome: ''
};

// Struttura Dinamica per il foglio AZIENDA (inizialmente vuota, pronta per dati esterni/Excel)
let aziendaStructure = [];

// Struttura Moduli SWAN
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
// 1. NAVIGAZIONE SBLOCCATA (TUTTI I TASTI FUNZIONANO)
// ==========================================
function navTo(pageId) {
  // Nasconde tutte le pagine
  document.querySelectorAll('.page').forEach(p => p.classList.remove('page-visible'));

  // Mostra solo la pagina richiesta
  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add('page-visible');
  } else {
    console.warn("Pagina non trovata:", pageId);
    return;
  }

  // Gestione Dock Bar
  const dock = document.getElementById('main-dock-bar');
  if (dock) {
    dock.style.display = (['landing-page', 'hub-page', 'success-page'].includes(pageId)) ? 'none' : 'flex';
  }

  // Inizializza i contenuti se necessario
  if (pageId === 'azienda-page') renderAziendaBuilder();
  if (pageId === 'modules-page') renderModulesBuilder();
  if (pageId === 'hub-page') updateHubCardsStatus();

  window.scrollTo(0, 0);
}

// ==========================================
// 2. RECUPERO E NUOVA CONFIGURAZIONE
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

  // Pulizia input testo
  ['azienda', 'nome', 'compilatore', 'email', 'input-recupera-codice', 'codice_recupero'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  renderAziendaBuilder();
  renderModulesBuilder();
  navTo('hub-page');
}

function recuperaConfigurazione() {
  const codeInput = document.getElementById('input-recupera-codice') || document.getElementById('codice_recupero');
  const code = codeInput ? codeInput.value.trim().toUpperCase() : '';

  if (!code) {
    alert("Inserisci un codice di configurazione valido!");
    return;
  }

  const saved = localStorage.getItem('SWAN_CONFIG_' + code);
  if (!saved) {
    alert("Nessuna configurazione trovata con il codice: " + code);
    return;
  }

  try {
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

    alert("Configurazione " + code + " recuperata!");
    navTo('hub-page');
  } catch (e) {
    console.error("Errore recupero dati:", e);
    alert("Errore nel caricamento dei dati salvati.");
  }
}

// ==========================================
// 3. CAMPI CLIENTE RIGIDAMENTE OBBLIGATORI
// ==========================================
function validateClientInfo() {
  const az = document.getElementById('azienda')?.value.trim() || '';
  const nom = document.getElementById('nome')?.value.trim() || '';
  const comp = document.getElementById('compilatore')?.value.trim() || '';
  const em = document.getElementById('email')?.value.trim() || '';

  if (!az || !nom || !comp || !em) {
    alert("ATTENZIONE: Tutti i campi dell'Anagrafica Cliente (Azienda, Referente, Compilatore, Email) sono OBBLIGATORI prima di proseguire!");
    return false;
  }
  
  appData.info = { azienda: az, nome: nom, compilatore: comp, email: em };
  return true;
}

function saveConfiguration() {
  // Blocco di sicurezza sui campi anagrafici
  if (!validateClientInfo()) {
    navTo('hub-page');
    return;
  }

  localStorage.setItem('SWAN_CONFIG_' + appData.config_id, JSON.stringify(appData));
  localStorage.removeItem('SWAN_DRAFT');

  const finalIdEl = document.getElementById('final-id');
  if (finalIdEl) finalIdEl.innerText = appData.config_id;

  navTo('success-page');
}

// ==========================================
// 4. ANAGRAFICA AZIENDA (DINAMICA PER N DOMANDE)
// ==========================================
function setAziendaDataFromExcel(datiCaricati) {
  aziendaStructure = datiCaricati;
  renderAziendaBuilder();
}

function renderCampoDynamic(q, fieldId) {
  const tipo = (q.colonnaD_tipo || 'text').toLowerCase();
  const opzioni = q.colonnaC_opzioni || [];

  switch (tipo) {
    case 'checkbox':
      return `
        <div class="az-options-group-horizontal" style="display:flex; flex-wrap:wrap; gap:12px 20px;">
          ${opzioni.map(opt => `
            <label style="display:flex; align-items:center; gap:6px;">
              <input type="checkbox" name="${fieldId}" value="${opt}" onchange="saveAziendaInputs(); autoSave(); checkAziendaCompletion();">
              <span>${opt}</span>
            </label>
          `).join('')}
          ${q.haCampoAltro ? `
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:0.8rem; font-weight:700;">Altro:</span>
              <input type="text" id="${fieldId}_altro" style="width:140px; padding:4px;" oninput="saveAziendaInputs(); autoSave(); checkAziendaCompletion();">
            </div>
          ` : ''}
        </div>`;

    case 'radio':
      return `
        <div class="az-options-group-horizontal" style="display:flex; flex-wrap:wrap; gap:12px 20px;">
          ${opzioni.map(opt => `
            <label style="display:flex; align-items:center; gap:6px;">
              <input type="radio" name="${fieldId}" value="${opt}" onchange="saveAziendaInputs(); autoSave(); checkAziendaCompletion();">
              <span>${opt}</span>
            </label>
          `).join('')}
        </div>`;

    case 'text':
    default:
      return `<input type="text" id="${fieldId}" placeholder="Inserisci risposta..." oninput="saveAziendaInputs(); autoSave(); checkAziendaCompletion();">`;
  }
}

function renderAziendaBuilder() {
  const container = document.getElementById('azienda-builder-container');
  if (!container) return;

  if (aziendaStructure.length === 0) {
    container.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted);">Nessun foglio risposte caricato. Carica la configurazione o il file Excel.</div>`;
    return;
  }

  container.innerHTML = aziendaStructure.map((sec, secIdx) => `
    <div class="light-card" id="card-azienda-sec-${secIdx}">
      <div class="light-card-header" style="margin-bottom:12px; font-weight:bold;">${sec.colonnaA_sezione}</div>
      <div>
        ${sec.domande.map((q, qIdx) => {
          const reqStar = q.colonnaE_obbligatorio ? ' <span style="color:#ef4444;">*</span>' : '';
          const fieldId = `q_${secIdx}_${qIdx}`;
          return `
            <div class="form-group" style="margin-bottom:15px;">
              <label style="display:block; margin-bottom:5px;">${q.colonnaB_domanda}${reqStar}</label>
              ${renderCampoDynamic(q, fieldId)}
            </div>`;
        }).join('')}
      </div>
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
      if (savedVal !== undefined && savedVal !== null) {
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
// 5. GESTIONE MODULI ED ERP
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
    <div style="margin-top:15px; margin-bottom:10px; font-weight:800; font-size:0.85rem; color:var(--text-muted);">${cat.category}</div>
    ${cat.modules.map(mod => `
      <div class="func-row-wrapper" id="row-${mod.id}" onclick="toggleModuleSelection('${mod.id}')">
        <div class="func-row-header">
          <div class="func-title-group">
            <div class="custom-check" id="check-${mod.id}">✓</div>
            <span>${mod.title}</span>
          </div>
        </div>
        <div class="func-sub-controls" onclick="event.stopPropagation();">
          <div style="display:flex; gap:8px; align-items:center;">
            <button type="button" class="btn-note" id="btn-note-${mod.id}" onclick="toggleNoteBox('${mod.id}')">+ Note</button>
            <select class="select-level" id="level-${mod.id}" onchange="saveModulesInputs(); autoSave();">
              <option value="VIEW">VIEW</option>
              <option value="EDIT">EDIT</option>
            </select>
          </div>
          <div class="erp-module-control" style="display:none; align-items:center; gap:8px;">
            <span style="font-size:0.75rem; font-weight:700; color:var(--primary);">ERP</span>
            <label class="switch">
              <input type="checkbox" id="erp-switch-${mod.id}" onchange="saveModulesInputs(); autoSave();">
              <span class="slider"></span>
            </label>
          </div>
        </div>
        <div class="note-container" id="notebox-${mod.id}">
          <textarea id="note-${mod.id}" rows="2" placeholder="Note per ${mod.title}..." oninput="handleNoteText('${mod.id}'); saveModulesInputs(); autoSave();"></textarea>
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

function toggleNoteBox(modId) {
  const box = document.getElementById(`notebox-${modId}`);
  if (box) box.style.display = (box.style.display === 'block') ? 'none' : 'block';
}

function handleNoteText(modId) {
  const txt = document.getElementById(`note-${modId}`);
  const btn = document.getElementById(`btn-note-${modId}`);
  if (txt && btn) {
    btn.classList.toggle('has-note', txt.value.trim().length > 0);
  }
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

    const note = document.getElementById(`note-${modId}`);
    if (note && mod.note) {
      note.value = mod.note;
      handleNoteText(modId);
    }
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
// AVVIO APPLICAZIONE AUTOMATICO
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  navTo('landing-page');
});
