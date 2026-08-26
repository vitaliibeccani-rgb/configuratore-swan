// --- STATO GLOBALE DELL'APPLICAZIONE ---
let appData = {
  config_id: '',
  info: { azienda: '', nome: '', compilatore: '', email: '' },
  aziendaData: {},
  modulesData: {},
  usa_erp_globale: false,
  erp_sistema_nome: ''
};

// --- MAPPATURA EXCEL: COLONNE A, B, C, D, E ---
const aziendaStructure = [
  {
    colonnaA_sezione: "ANAGRAFICA AZIENDA",
    domande: [
      {
        colonnaB_domanda: "RAGIONE SOCIALE / NOME AZIENDA",
        colonnaC_opzioni: [], // Vuoto -> Campo di testo (Colonna D)
        colonnaD_tipo: "text",
        obbligatorio: true  // Colonna E
      },
      {
        colonnaB_domanda: "SETTORE DI ATTIVITÀ",
        colonnaC_opzioni: ["Manifatturiero", "Distribuzione / Retail", "Servizi", "Automotive"],
        colonnaD_tipo: "checkbox",
        obbligatorio: false // Colonna E
      }
    ]
  },
  {
    colonnaA_sezione: "DEFINIZIONE DELL'AZIENDA",
    domande: [
      {
        colonnaB_domanda: "TIPOLOGIA DELL'AZIENDA",
        colonnaC_opzioni: ["Produzione", "Commerciale", "Servizi / Assistenza", "B2B", "B2C"],
        colonnaD_tipo: "checkbox",
        haAltroD: true,     // Se presente l'opzione "Altro / Specificare"
        obbligatorio: true  // Colonna E (aggiunge * e attiva il controllo verde)
      }
    ]
  },
  {
    colonnaA_sezione: "PRODOTTI",
    domande: [
      {
        colonnaB_domanda: "CATEGORIE PRODOTTI COMMERCIALIZZATI",
        colonnaC_opzioni: ["Macchinari", "Elettronica", "Impianti", "Componentistica"],
        colonnaD_tipo: "checkbox",
        haAltroD: true,
        obbligatorio: true  // Colonna E
      },
      {
        colonnaB_domanda: "REQUISITI SPECIFICI PRODOTTI",
        colonnaC_opzioni: [], // Vuoto -> Campo di testo (Colonna D)
        colonnaD_tipo: "text",
        obbligatorio: false // Colonna E
      }
    ]
  }
];

// --- STRUTTURA MODULI SWAN ---
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

// --- 1. NAVIGAZIONE ---
function navTo(pageId) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('page-visible');
  });

  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add('page-visible');
  }

  const dock = document.getElementById('main-dock-bar');
  if (dock) {
    if (pageId === 'landing-page' || pageId === 'hub-page' || pageId === 'success-page') {
      dock.style.display = 'none';
    } else {
      dock.style.display = 'flex';
    }
  }

  if (pageId === 'hub-page') {
    updateHubCardsStatus();
  }

  window.scrollTo(0, 0);
}

// --- 2. AZIONI LANDING PAGE ---
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

  const chkErp = document.getElementById('usa_erp_globale');
  if (chkErp) chkErp.checked = false;
  handleGlobalERP();

  renderAziendaBuilder();
  renderModulesBuilder();
  
  navTo('hub-page');
}

function toggleRecallBox() {
  const box = document.getElementById('recall-box');
  if (box) {
    const isHidden = box.style.display === 'none' || getComputedStyle(box).display === 'none';
    box.style.display = isHidden ? 'block' : 'none';
  }
}

function doRecall() {
  const inputEl = document.getElementById('recall-input');
  if (!inputEl) return;
  
  const code = inputEl.value.trim().toUpperCase();
  if (!code) {
    alert('Inserisci un codice valido!');
    return;
  }

  const saved = localStorage.getItem('SWAN_CONFIG_' + code);
  if (saved) {
    appData = JSON.parse(saved);
    restoreStateToUI();
    navTo('hub-page');
  } else {
    alert('Nessuna configurazione trovata per il codice: ' + code);
  }
}

function checkDraft() {
  const draft = localStorage.getItem('SWAN_DRAFT');
  const btn = document.getElementById('btn-resume-draft');
  if (draft && btn) {
    btn.style.display = 'inline-block';
  }
}

function resumeDraft() {
  const draft = localStorage.getItem('SWAN_DRAFT');
  if (draft) {
    appData = JSON.parse(draft);
    restoreStateToUI();
    navTo('hub-page');
  }
}

function autoSave() {
  if (document.getElementById('azienda')) appData.info.azienda = document.getElementById('azienda').value;
  if (document.getElementById('nome')) appData.info.nome = document.getElementById('nome').value;
  if (document.getElementById('compilatore')) appData.info.compilatore = document.getElementById('compilatore').value;
  if (document.getElementById('email')) appData.info.email = document.getElementById('email').value;
  if (document.getElementById('erp_sistema_nome')) appData.erp_sistema_nome = document.getElementById('erp_sistema_nome').value;

  localStorage.setItem('SWAN_DRAFT', JSON.stringify(appData));
}

// --- 3. BUILDER ANAGRAFICA AZIENDA (Mappa Colonne A, B, C, D, E) ---
function renderAziendaBuilder() {
  const container = document.getElementById('azienda-builder-container');
  if (!container) return;

  container.innerHTML = aziendaStructure.map((sec, secIdx) => `
    <div class="light-card" id="card-azienda-sec-${secIdx}">
      <div class="light-card-header" style="margin-bottom:12px;">
        <span>${sec.colonnaA_sezione}</span>
      </div>
      <div>
        ${sec.domande.map(q => {
          const haOpzioni = q.colonnaC_opzioni && q.colonnaC_opzioni.length > 0;
          const labelTesto = q.colonnaB_domanda + (q.obbligatorio ? ' <span style="color:#ef4444;">*</span>' : '');
          
          return `
            <div class="form-group">
              <label>${labelTesto}</label>
              ${haOpzioni ? `
                <div class="az-options-group-horizontal">
                  ${q.colonnaC_opzioni.map(opt => `
                    <label class="az-option-item-horiz">
                      <input type="checkbox" data-qid="${q.colonnaB_domanda}" value="${opt}" onchange="saveAziendaInputs(); autoSave(); checkAziendaCompletion();">
                      <span>${opt}</span>
                    </label>
                  `).join('')}
                  ${q.haAltroD ? `
                    <div class="az-option-item-horiz" style="margin-left:auto;">
                      <span style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">Specificare:</span>
                      <input type="text" id="${q.colonnaB_domanda}_other" placeholder="Altro..." style="width:160px; padding:4px 8px; font-size:0.85rem;" oninput="saveAziendaInputs(); autoSave(); checkAziendaCompletion();">
                    </div>
                  ` : ''}
                </div>
              ` : `
                <input type="text" id="${q.colonnaB_domanda}" placeholder="Inserisci valore..." oninput="saveAziendaInputs(); autoSave(); checkAziendaCompletion();">
              `}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');

  checkAziendaCompletion();
}

function saveAziendaInputs() {
  aziendaStructure.forEach(sec => {
    sec.domande.forEach(q => {
      if (q.colonnaC_opzioni && q.colonnaC_opzioni.length > 0) {
        const checked = Array.from(document.querySelectorAll(`input[data-qid="${q.colonnaB_domanda}"]:checked`)).map(cb => cb.value);
        const otherVal = document.getElementById(`${q.colonnaB_domanda}_other`)?.value || '';
        appData.aziendaData[q.colonnaB_domanda] = { selected: checked, other: otherVal };
      } else {
        const val = document.getElementById(q.colonnaB_domanda)?.value || '';
        appData.aziendaData[q.colonnaB_domanda] = val;
      }
    });
  });
}

// LOGICA SCHEDA VERDE: Controlla se le domande (specie quelle con Colonna E obbligatoria) sono compilate
function checkAziendaCompletion() {
  aziendaStructure.forEach((sec, secIdx) => {
    const card = document.getElementById(`card-azienda-sec-${secIdx}`);
    if (!card) return;

    let isComplete = true;

    sec.domande.forEach(q => {
      // Consideriamo principalmente i campi marcati obbligatori (Colonna E), o tutti se non specificato
      if (q.obbligatorio) {
        if (q.colonnaC_opzioni && q.colonnaC_opzioni.length > 0) {
          const checked = document.querySelectorAll(`input[data-qid="${q.colonnaB_domanda}"]:checked`);
          const otherVal = document.getElementById(`${q.colonnaB_domanda}_other`)?.value.trim();
          if (checked.length === 0 && (!otherVal || otherVal.length === 0)) {
            isComplete = false;
          }
        } else {
          const txtVal = document.getElementById(q.colonnaB_domanda)?.value.trim();
          if (!txtVal || txtVal.length === 0) {
            isComplete = false;
          }
        }
      }
    });

    if (isComplete) {
      card.classList.add('azienda-completed');
    } else {
      card.classList.remove('azienda-completed');
    }
  });
}

// --- 4. BUILDER MODULI ---
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

          <div style="display:flex; align-items:center; gap:8px;">
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
  if (box) {
    box.style.display = (box.style.display === 'block') ? 'none' : 'block';
  }
}

function handleNoteText(modId) {
  const txt = document.getElementById(`note-${modId}`);
  const btn = document.getElementById(`btn-note-${modId}`);
  if (txt && btn) {
    if (txt.value.trim().length > 0) {
      btn.classList.add('has-note');
    } else {
      btn.classList.remove('has-note');
    }
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

      appData.modulesData[mod.id] = {
        active: isSelected,
        level: level,
        erp: erpActive,
        note: note
      };
    });
  });

  calculateMetrics();
}

// --- 5. LOGICA DOCK BAR & STATI ---
function calculateMetrics() {
  let count = 0;
  Object.values(appData.modulesData).forEach(m => {
    if (m.active) count++;
  });

  let taglia = 'Taglia S';
  let sforzo = count * 0.5;

  if (count > 2 && count <= 5) taglia = 'Taglia M';
  else if (count > 5) taglia = 'Taglia L';

  const elTaglia = document.getElementById('dock-taglia-val');
  const elSforzo = document.getElementById('dock-sforzo-val');

  if (elTaglia) elTaglia.innerText = taglia;
  if (elSforzo) elSforzo.innerText = sforzo.toFixed(1) + ' gg';
}

function handleGlobalERP() {
  const chk = document.getElementById('usa_erp_globale');
  const masterBox = document.getElementById('nome_erp_master');
  appData.usa_erp_globale = chk ? chk.checked : false;

  if (masterBox) {
    masterBox.style.display = appData.usa_erp_globale ? 'block' : 'none';
  }
}

function openAziendaSection() {
  navTo('azienda-app');
}

function openConfigSection() {
  navTo('config-app');
}

function updateHubCardsStatus() {
  const cardAzienda = document.getElementById('hub-card-azienda');
  const cardConfig = document.getElementById('hub-card-config');

  const hasAziendaName = appData.info.azienda || (appData.aziendaData["RAGIONE SOCIALE / NOME AZIENDA"] && appData.aziendaData["RAGIONE SOCIALE / NOME AZIENDA"].length > 0);
  if (cardAzienda) {
    if (hasAziendaName) cardAzienda.classList.add('completed');
    else cardAzienda.classList.remove('completed');
  }

  const hasActiveModules = Object.values(appData.modulesData).some(m => m.active);
  if (cardConfig) {
    if (hasActiveModules) cardConfig.classList.add('completed');
    else cardConfig.classList.remove('completed');
  }
}

function saveConfiguration() {
  if (!appData.info.azienda) {
    const nomeInp = prompt("Inserisci il Nome Cliente / Azienda per salvare:", "");
    if (!nomeInp) return alert("Impossibile salvare senza un Nome Azienda.");
    appData.info.azienda = nomeInp;
    if (document.getElementById('azienda')) document.getElementById('azienda').value = nomeInp;
  }

  localStorage.setItem('SWAN_CONFIG_' + appData.config_id, JSON.stringify(appData));
  localStorage.removeItem('SWAN_DRAFT');

  const finalIdEl = document.getElementById('final-id');
  if (finalIdEl) finalIdEl.innerText = appData.config_id;

  const infoBox = document.getElementById('info-success-box');
  if (infoBox) {
    infoBox.innerHTML = `
      <p><strong>Cliente:</strong> ${appData.info.azienda}</p>
      <p><strong>Referente:</strong> ${appData.info.nome || '-'}</p>
      <p><strong>Compilato da:</strong> ${appData.info.compilatore || '-'}</p>
    `;
  }

  navTo('success-page');
}

function restoreStateToUI() {
  if (document.getElementById('azienda')) document.getElementById('azienda').value = appData.info.azienda || '';
  if (document.getElementById('nome')) document.getElementById('nome').value = appData.info.nome || '';
  if (document.getElementById('compilatore')) document.getElementById('compilatore').value = appData.info.compilatore || '';
  if (document.getElementById('email')) document.getElementById('email').value = appData.info.email || '';
  
  const chkErp = document.getElementById('usa_erp_globale');
  if (chkErp) chkErp.checked = appData.usa_erp_globale;
  if (document.getElementById('erp_sistema_nome')) document.getElementById('erp_sistema_nome').value = appData.erp_sistema_nome || '';
  handleGlobalERP();

  renderAziendaBuilder();
  renderModulesBuilder();

  Object.keys(appData.aziendaData).forEach(qid => {
    const val = appData.aziendaData[qid];
    if (typeof val === 'object' && val !== null) {
      if (val.selected) {
        val.selected.forEach(v => {
          const cb = document.querySelector(`input[data-qid="${qid}"][value="${v}"]`);
          if (cb) cb.checked = true;
        });
      }
      const otherInp = document.getElementById(`${qid}_other`);
      if (otherInp) otherInp.value = val.other || '';
    } else {
      const txt = document.getElementById(qid);
      if (txt) txt.value = val;
    }
  });

  Object.keys(appData.modulesData).forEach(modId => {
    const data = appData.modulesData[modId];
    if (data.active) {
      const row = document.getElementById(`row-${modId}`);
      if (row) row.classList.add('is-selected');
    }
    const lvl = document.getElementById(`level-${modId}`);
    if (lvl) lvl.value = data.level || 'VIEW';

    const erp = document.getElementById(`erp-switch-${modId}`);
    if (erp) erp.checked = !!data.erp;

    if (data.note) {
      const noteTxt = document.getElementById(`note-${modId}`);
      if (noteTxt) noteTxt.value = data.note;
      handleNoteText(modId);
    }
  });

  checkAziendaCompletion();
  calculateMetrics();
}

function resetAndHome() {
  navTo('landing-page');
  checkDraft();
}

// --- AVVIO APP ---
document.addEventListener('DOMContentLoaded', () => {
  navTo('landing-page');
  checkDraft();
  renderAziendaBuilder();
  renderModulesBuilder();
});
