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

// ==========================================
// ESEMPIO STRUTTURA DINAMICA EXCEL (COLONNE A, B, C, D, E)
// Questo array verrà sovrascritto direttamente dal tuo parser Excel/JSON.
// Gestisce N Argomenti/Sezioni (Col A) e N Domande (Col B) senza limiti.
// ==========================================
// 1. Inizializzazione VUOTA: non si inventa nessuna sezione o domanda.
// Questo array verrà popolato interamente dal tuo parser Excel (es. via SheetJS o JSON).
let aziendaStructure = [];

// 2. Esempio di funzione che riceve i dati letti dal tuo Excel e li inietta nel sistema:
function caricaDatiDaExcel(datiDaExcel) {
  /* datiDaExcel deve essere una struttura formattata così:
  [
    {
      colonnaA_sezione: "NOME_SEZIONE_EXCEL",
      domande: [
        {
          colonnaB_domanda: "TESTO_DOMANDA_EXCEL",
          colonnaC_opzioni: ["OPZ1", "OPZ2"], // o [] per testo
          colonnaD_tipo: "checkbox",           // "text", "checkbox", "radio", ecc.
          colonnaE_obbligatorio: true,        // true / false
          haCampoAltro: true                  // true / false
        }
      ]
    }
  ]
  */
  
  aziendaStructure = datiDaExcel;
  renderAziendaBuilder(); // Genera l'HTML in automatico per qualsiasi numero di righe
}
// ==========================================
// STRUTTURA MODULI SWAN
// ==========================================
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
// 1. NAVIGAZIONE E APERTURA PAGINE
// ==========================================
function navTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('page-visible'));

  const target = document.getElementById(pageId);
  if (target) target.classList.add('page-visible');

  const dock = document.getElementById('main-dock-bar');
  if (dock) {
    dock.style.display = (['landing-page', 'hub-page', 'success-page'].includes(pageId)) ? 'none' : 'flex';
  }

  if (pageId === 'azienda-page') renderAziendaBuilder();
  if (pageId === 'modules-page') renderModulesBuilder();
  if (pageId === 'hub-page') updateHubCardsStatus();

  window.scrollTo(0, 0);
}

// ==========================================
// 2. RECUPERO E CARICAMENTO CONFIGURAZIONE
// ==========================================
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

    alert("Configurazione " + code + " recuperata con successo!");
    navTo('hub-page');
  } catch (e) {
    console.error(e);
    alert("Errore nel caricamento della configurazione.");
  }
}

function restoreAziendaInputs() {
  if (!appData.aziendaData) return;

  aziendaStructure.forEach((sec, secIdx) => {
    sec.domande.forEach((q, qIdx) => {
      const fieldId = `q_${secIdx}_${qIdx}`;
      const savedVal = appData.aziendaData[q.colonnaB_domanda];

      if (savedVal !== undefined && savedVal !== null) {
        if (q.colonnaD_tipo === "checkbox" && typeof savedVal === 'object') {
          if (savedVal.selected && Array.isArray(savedVal.selected)) {
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
          const txtInput = document.getElementById(fieldId);
          if (txtInput) txtInput.value = savedVal;
        }
      }
    });
  });

  checkAziendaCompletion();
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

// ==========================================
// 3. GESTIONE ERP GLOBALE
// ==========================================
function handleGlobalERP() {
  const chk = document.getElementById('usa_erp_globale');
  const masterBox = document.getElementById('nome_erp_master');
  appData.usa_erp_globale = chk ? chk.checked : false;

  if (masterBox) {
    masterBox.style.display = appData.usa_erp_globale ? 'block' : 'none';
  }

  const erpControls = document.querySelectorAll('.erp-module-control');
  erpControls.forEach(ctrl => {
    ctrl.style.display = appData.usa_erp_globale ? 'flex' : 'none';
  });
}

// ==========================================
// 4. BUILDER DINAMICO ANAGRAFICA AZIENDA (DINAMICA PER N ARGOMENTI E TIPI IN INPUT)
// ==========================================

// Helper per generare l'HTML in base al tipo in Colonna D
function renderCampoDynamic(q, fieldId) {
  const tipo = (q.colonnaD_tipo || 'text').toLowerCase();
  const opzioni = q.colonnaC_opzioni || [];

  switch (tipo) {
    case 'checkbox':
      return `
        <div class="az-options-group-horizontal" style="display:flex; flex-wrap:wrap; gap:12px 20px; align-items:center;">
          ${opzioni.map(opt => `
            <label class="az-option-item-horiz" style="display:flex; align-items:center; gap:6px;">
              <input type="checkbox" name="${fieldId}" value="${opt}" onchange="saveAziendaInputs(); autoSave(); checkAziendaCompletion();">
              <span>${opt}</span>
            </label>
          `).join('')}

          ${q.haCampoAltro ? `
            <div class="az-option-item-horiz" style="display:flex; align-items:center; gap:6px; margin-left:auto;">
              <span style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">Specificare:</span>
              <input type="text" id="${fieldId}_altro" placeholder="Altro..." style="width:160px; padding:4px 8px; font-size:0.85rem;" oninput="saveAziendaInputs(); autoSave(); checkAziendaCompletion();">
            </div>
          ` : ''}
        </div>
      `;

    case 'radio':
      return `
        <div class="az-options-group-horizontal" style="display:flex; flex-wrap:wrap; gap:12px 20px; align-items:center;">
          ${opzioni.map(opt => `
            <label class="az-option-item-horiz" style="display:flex; align-items:center; gap:6px;">
              <input type="radio" name="${fieldId}" value="${opt}" onchange="saveAziendaInputs(); autoSave(); checkAziendaCompletion();">
              <span>${opt}</span>
            </label>
          `).join('')}
        </div>
      `;

    case 'text':
    default:
      return `
        <input type="text" id="${fieldId}" placeholder="Inserisci valore..." oninput="saveAziendaInputs(); autoSave(); checkAziendaCompletion();">
      `;
  }
}

function renderAziendaBuilder() {
  const container = document.getElementById('azienda-builder-container');
  if (!container) return;

  // Itera su tutti gli N argomenti/sezioni (Colonna A)
  container.innerHTML = aziendaStructure.map((sec, secIdx) => `
    <div class="light-card" id="card-azienda-sec-${secIdx}">
      <div class="light-card-header" style="margin-bottom:12px;">
        <span>${sec.colonnaA_sezione}</span>
      </div>
      <div>
        ${sec.domande.map((q, qIdx) => {
          const reqStar = q.colonnaE_obbligatorio ? ' <span style="color:#ef4444;">*</span>' : '';
          const fieldId = `q_${secIdx}_${qIdx}`;

          return `
            <div class="form-group" style="margin-bottom:15px;">
              <label>${q.colonnaB_domanda}${reqStar}</label>
              ${renderCampoDynamic(q, fieldId)}
            </div>
          `;
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
        const checkedValues = Array.from(
          document.querySelectorAll(`input[name="${fieldId}"]:checked`)
        ).map(cb => cb.value);

        const altroVal = document.getElementById(`${fieldId}_altro`)?.value.trim() || '';

        appData.aziendaData[q.colonnaB_domanda] = {
          selected: checkedValues,
          altro: altroVal
        };
      } else if (tipo === "radio") {
        const checkedRadio = document.querySelector(`input[name="${fieldId}"]:checked`);
        appData.aziendaData[q.colonnaB_domanda] = checkedRadio ? checkedRadio.value : '';
      } else {
        const val = document.getElementById(fieldId)?.value.trim() || '';
        appData.aziendaData[q.colonnaB_domanda] = val;
      }
    });
  });
}

function checkAziendaCompletion() {
  aziendaStructure.forEach((sec, secIdx) => {
    const card = document.getElementById(`card-azienda-sec-${secIdx}`);
    if (!card) return;

    let isSectionComplete = true;

    sec.domande.forEach((q, qIdx) => {
      if (q.colonnaE_obbligatorio) {
        const fieldId = `q_${secIdx}_${qIdx}`;
        const tipo = (q.colonnaD_tipo || 'text').toLowerCase();

        if (tipo === "checkbox") {
          const checked = document.querySelectorAll(`input[name="${fieldId}"]:checked`);
          const altroVal = document.getElementById(`${fieldId}_altro`)?.value.trim();
          if (checked.length === 0 && (!altroVal || altroVal.length === 0)) {
            isSectionComplete = false;
          }
        } else if (tipo === "radio") {
          const checkedRadio = document.querySelector(`input[name="${fieldId}"]:checked`);
          if (!checkedRadio) isSectionComplete = false;
        } else {
          const txtVal = document.getElementById(fieldId)?.value.trim();
          if (!txtVal || txtVal.length === 0) {
            isSectionComplete = false;
          }
        }
      }
    });

    if (isSectionComplete) card.classList.add('azienda-completed');
    else card.classList.remove('azienda-completed');
  });
}

// ==========================================
// 5. BUILDER MODULI
// ==========================================
function renderModulesBuilder() {
  const container = document.getElementById('builder-container');
  if (!container) return;

  container.innerHTML = modulesStructure.map(cat => `
    <div style="margin-top:15px; margin-bottom:10px; font-weight:800; font-size:0.85rem; color:var(--text-muted); text-transform:uppercase;">${cat.category}</div>
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
    if (txt.value.trim().length > 0) btn.classList.add('has-note');
    else btn.classList.remove('has-note');
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

// ==========================================
// 6. SALVATAGGIO CONFIGURAZIONE E NUOVA CONFIG
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

  document.querySelectorAll('input').forEach(i => { 
    if (i.type === 'text' || i.type === 'email') i.value = ''; 
    if (i.type === 'checkbox') i.checked = false;
  });

  renderAziendaBuilder();
  renderModulesBuilder();
  navTo('hub-page');
}

function saveConfiguration() {
  appData.info.azienda = document.getElementById('azienda')?.value.trim() || '';
  appData.info.nome = document.getElementById('nome')?.value.trim() || '';
  appData.info.compilatore = document.getElementById('compilatore')?.value.trim() || '';
  appData.info.email = document.getElementById('email')?.value.trim() || '';

  if (!appData.info.azienda || !appData.info.nome || !appData.info.compilatore || !appData.info.email) {
    alert("ATTENZIONE: I 4 campi principali (Azienda, Referente, Compilatore, Email) sono tutti OBBLIGATORI!");
    navTo('hub-page');
    return;
  }

  localStorage.setItem('SWAN_CONFIG_' + appData.config_id, JSON.stringify(appData));
  localStorage.removeItem('SWAN_DRAFT');

  const finalIdEl = document.getElementById('final-id');
  if (finalIdEl) finalIdEl.innerText = appData.config_id;

  navTo('success-page');
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

  const hasAziendaName = !!appData.info.azienda;
  if (cardAzienda) cardAzienda.classList.toggle('completed', hasAziendaName);

  const hasActiveModules = Object.values(appData.modulesData).some(m => m.active);
  if (cardConfig) cardConfig.classList.toggle('completed', hasActiveModules);
}

// ==========================================
// AVVIO APPLICAZIONE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  navTo('landing-page');
});
