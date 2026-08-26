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
// ESEMPIO DI STRUTTURA DINAMICA EXCEL (COLONNE A, B, C, D, E)
// Puoi aggiungere N sezioni e N domande: il codice leggerà tutto in automatico.
// ==========================================
const aziendaStructure = [
  {
    colonnaA_sezione: "ANAGRAFICA AZIENDA",
    domande: [
      {
        colonnaB_domanda: "RAGIONE SOCIALE / NOME AZIENDA",
        colonnaC_opzioni: [],
        colonnaD_tipo: "text",
        obbligatorio: true
      },
      {
        colonnaB_domanda: "SETTORE DI ATTIVITÀ",
        colonnaC_opzioni: ["MANIFATTURIERO", "DISTRIBUZIONE / RETAIL", "SERVIZI", "AUTOMOTIVE"],
        colonnaD_tipo: "checkbox",
        obbligatorio: false,
        haCampoAltro: false
      }
    ]
  },
  {
    colonnaA_sezione: "DEFINIZIONE DELL'AZIENDA",
    domande: [
      {
        colonnaB_domanda: "TIPOLOGIA DELL'AZIENDA",
        colonnaC_opzioni: ["PRODUZIONE", "COMMERCIALE", "SERVIZI / ASSISTENZA", "B2B"],
        colonnaD_tipo: "checkbox",
        obbligatorio: true,
        haCampoAltro: true // Aggiunge l'opzione testo "Altro / Specificare" affianco
      }
    ]
  },
  {
    colonnaA_sezione: "PRODOTTI",
    domande: [
      {
        colonnaB_domanda: "CATEGORIE PRODOTTI COMMERCIALIZZATI",
        colonnaC_opzioni: ["MACCHINARI", "ELETTRONICA", "IMPIANTI", "COMPONENTISTICA"],
        colonnaD_tipo: "checkbox",
        obbligatorio: true,
        haCampoAltro: true
      },
      {
        colonnaB_domanda: "REQUISITI SPECIFICI PRODOTTI",
        colonnaC_opzioni: [],
        colonnaD_tipo: "text",
        obbligatorio: false
      }
    ]
  }
];

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
// 1. NAVIGAZIONE
// ==========================================
function navTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('page-visible'));

  const target = document.getElementById(pageId);
  if (target) target.classList.add('page-visible');

  const dock = document.getElementById('main-dock-bar');
  if (dock) {
    dock.style.display = (['landing-page', 'hub-page', 'success-page'].includes(pageId)) ? 'none' : 'flex';
  }

  if (pageId === 'hub-page') updateHubCardsStatus();
  window.scrollTo(0, 0);
}

// ==========================================
// 2. GESTIONE ERP GLOBALE & VISIBILITÀ MODULI
// ==========================================
function handleGlobalERP() {
  const chk = document.getElementById('usa_erp_globale');
  const masterBox = document.getElementById('nome_erp_master');
  appData.usa_erp_globale = chk ? chk.checked : false;

  if (masterBox) {
    masterBox.style.display = appData.usa_erp_globale ? 'block' : 'none';
  }

  // Mostra o nasconde i toggle ERP singoli SOLO se quello generale è attivo
  const erpControls = document.querySelectorAll('.erp-module-control');
  erpControls.forEach(ctrl => {
    ctrl.style.display = appData.usa_erp_globale ? 'flex' : 'none';
  });
}

// ==========================================
// 3. BUILDER DINAMICO ANAGRAFICA AZIENDA
// ==========================================
function renderAziendaBuilder() {
  const container = document.getElementById('azienda-builder-container');
  if (!container) return;

  // Cicla dinamicamente su N sezioni dal foglio
  container.innerHTML = aziendaStructure.map((sec, secIdx) => `
    <div class="light-card" id="card-azienda-sec-${secIdx}">
      <div class="light-card-header" style="margin-bottom:12px;">
        <span>${sec.colonnaA_sezione}</span>
      </div>
      <div>
        ${sec.domande.map((q, qIdx) => {
          const isCheckbox = q.colonnaD_tipo === "checkbox" && q.colonnaC_opzioni && q.colonnaC_opzioni.length > 0;
          const reqStar = q.obbligatorio ? ' <span style="color:#ef4444;">*</span>' : '';
          const fieldId = `q_${secIdx}_${qIdx}`;

          return `
            <div class="form-group" style="margin-bottom:15px;">
              <label>${q.colonnaB_domanda}${reqStar}</label>
              
              ${isCheckbox ? `
                <div class="az-options-group-horizontal" style="display:flex; flex-wrap:wrap; gap:12px 20px; align-items:center;">
                  <!-- Checkbox standard da Colonna C -->
                  ${q.colonnaC_opzioni.map(opt => `
                    <label class="az-option-item-horiz" style="display:flex; align-items:center; gap:6px;">
                      <input type="checkbox" name="${fieldId}" value="${opt}" onchange="saveAziendaInputs(); autoSave(); checkAziendaCompletion();">
                      <span>${opt}</span>
                    </label>
                  `).join('')}

                  <!-- Opzione Altro/Specificare (Campo Testo) -->
                  ${q.haCampoAltro ? `
                    <div class="az-option-item-horiz" style="display:flex; align-items:center; gap:6px; margin-left:auto;">
                      <span style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">Specificare:</span>
                      <input type="text" id="${fieldId}_altro" placeholder="Altro..." style="width:160px; padding:4px 8px; font-size:0.85rem;" oninput="saveAziendaInputs(); autoSave(); checkAziendaCompletion();">
                    </div>
                  ` : ''}
                </div>
              ` : `
                <!-- Input di Testo Libero -->
                <input type="text" id="${fieldId}" placeholder="Inserisci valore..." oninput="saveAziendaInputs(); autoSave(); checkAziendaCompletion();">
              `}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');

  checkAziendaCompletion();
}

// Salvataggio dei dati dinamici dell'azienda
function saveAziendaInputs() {
  aziendaStructure.forEach((sec, secIdx) => {
    sec.domande.forEach((q, qIdx) => {
      const fieldId = `q_${secIdx}_${qIdx}`;

      if (q.colonnaD_tipo === "checkbox") {
        const checkedValues = Array.from(
          document.querySelectorAll(`input[name="${fieldId}"]:checked`)
        ).map(cb => cb.value);

        const altroVal = document.getElementById(`${fieldId}_altro`)?.value.trim() || '';

        appData.aziendaData[q.colonnaB_domanda] = {
          selected: checkedValues,
          altro: altroVal
        };
      } else {
        const val = document.getElementById(fieldId)?.value.trim() || '';
        appData.aziendaData[q.colonnaB_domanda] = val;
      }
    });
  });
}

// Controlla il completamento della sezione per accendere la Scheda Verde
function checkAziendaCompletion() {
  aziendaStructure.forEach((sec, secIdx) => {
    const card = document.getElementById(`card-azienda-sec-${secIdx}`);
    if (!card) return;

    let isSectionComplete = true;

    sec.domande.forEach((q, qIdx) => {
      if (q.obbligatorio) {
        const fieldId = `q_${secIdx}_${qIdx}`;

        if (q.colonnaD_tipo === "checkbox") {
          const checked = document.querySelectorAll(`input[name="${fieldId}"]:checked`);
          const altroVal = document.getElementById(`${fieldId}_altro`)?.value.trim();
          
          if (checked.length === 0 && (!altroVal || altroVal.length === 0)) {
            isSectionComplete = false;
          }
        } else {
          const txtVal = document.getElementById(fieldId)?.value.trim();
          if (!txtVal || txtVal.length === 0) {
            isSectionComplete = false;
          }
        }
      }
    });

    if (isSectionComplete) {
      card.classList.add('azienda-completed');
    } else {
      card.classList.remove('azienda-completed');
    }
  });
}

// ==========================================
// 4. BUILDER MODULI
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

          <!-- TOGGLE ERP NASCOSTO DI DEFAULT -->
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
// 5. VALIDAZIONE & SALVATAGGIO CONFIGURAZIONE
// ==========================================
function saveConfiguration() {
  appData.info.azienda = document.getElementById('azienda')?.value.trim() || '';
  appData.info.nome = document.getElementById('nome')?.value.trim() || '';
  appData.info.compilatore = document.getElementById('compilatore')?.value.trim() || '';
  appData.info.email = document.getElementById('email')?.value.trim() || '';

  // Controllo ferreo dei 4 campi principali obbligatori
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
  renderAziendaBuilder();
  renderModulesBuilder();
});
