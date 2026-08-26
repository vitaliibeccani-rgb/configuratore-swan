// --- STATO DELL'APPLICAZIONE ---
const appState = {
  company: {},
  modules: {}
};

// --- 1. DATI STRUTTURATI DA EXCEL (Colonna B: Domanda, Colonna C: Opzioni) ---
const companySections = [
  {
    title: "DEFINIZIONE DELL'AZIENDA",
    questions: [
      {
        id: "tipologiaAzienda",
        label: "TIPOLOGIA DELL'AZIENDA *",
        // Colonna C: opzioni definite. Se vuota (es. []), renderizza il campo text.
        options: ["Produzione", "Distribuzione", "Retail", "Servizi", "B2B"],
        allowCustomText: true // Per consentire il campo "Specificare..."
      }
    ]
  },
  {
    title: "PRODOTTI",
    questions: [
      {
        id: "categorieProdotti",
        label: "CATEGORIE PRODOTTI COMMERCIALIZZATI *",
        options: ["Elettronica", "Meccanica", "Abbigliamento"],
        allowCustomText: true
      },
      {
        id: "noteSpecifiche",
        label: "NOTE O REQUISITI SPECIFICI",
        options: [], // Nessuna opzione in Colonna C -> Genera campo di testo per Colonna D
        allowCustomText: false
      }
    ]
  }
];

// Dati Moduli Console
const consoleModules = [
  { id: 'attivazioni', title: 'CONSOLE ATTIVAZIONI' },
  { id: 'garanzie', title: 'CONSOLE GARANZIE' },
  { id: 'ordini', title: 'CONSOLE ORDINI' },
  { id: 'tagliandi', title: 'CONSOLE TAGLIANDI' }
];

// --- 2. RENDER SEZIONE ANAGRAFICA AZIENDA ---
function renderCompanyForm() {
  const container = document.getElementById('company-section');
  if (!container) return;

  container.innerHTML = companySections.map(sec => `
    <div class="light-card">
      <div class="light-card-header">
        <span>${sec.title}</span>
      </div>
      <div style="margin-top: 15px;">
        ${sec.questions.map(q => renderQuestionField(q)).join('')}
      </div>
    </div>
  `).join('');
}

function renderQuestionField(q) {
  const hasOptions = q.options && q.options.length > 0;

  return `
    <div class="form-group" style="margin-bottom: 18px;">
      <label>${q.label}</label>
      
      ${hasOptions ? `
        <!-- Se la Colonna C contiene opzioni -->
        <div class="az-options-group-horizontal">
          ${q.options.map((opt, idx) => `
            <label class="az-option-item-horiz">
              <input type="checkbox" name="${q.id}" value="${opt}" onchange="updateCompanyData('${q.id}')">
              <span>${opt}</span>
            </label>
          `).join('')}
          
          ${q.allowCustomText ? `
            <div class="az-option-item-horiz" style="margin-left: 10px;">
              <span style="font-size: 0.8rem; color: var(--text-muted);">Altro / Specificare:</span>
              <input type="text" class="input-field" style="width: 160px; padding: 4px 8px;" placeholder="Specificare..." oninput="updateCompanyData('${q.id}_custom', this.value)">
            </div>
          ` : ''}
        </div>
      ` : `
        <!-- Se la Colonna C è VUOTA -> Genera campo di testo (Colonna D) -->
        <input type="text" class="input-field" placeholder="Inserisci valore..." oninput="updateCompanyData('${q.id}', this.value)">
      `}
    </div>
  `;
}

function updateCompanyData(key) {
  // Aggiorna lo stato in base alle opzioni selezionate
  const checkboxes = document.querySelectorAll(`input[name="${key}"]:checked`);
  if (checkboxes.length > 0) {
    appState.company[key] = Array.from(checkboxes).map(cb => cb.value);
  }
}

// --- 3. RENDER CONFIGURAZIONE MODULI (CON CUSTOM CHECKBOX) ---
function renderModulesConfig() {
  const container = document.getElementById('modules-container');
  if (!container) return;

  container.innerHTML = consoleModules.map(mod => `
    <div class="func-row-wrapper" id="row-${mod.id}" onclick="toggleModuleRow('${mod.id}')">
      <div class="func-row-header">
        <div class="func-title-group">
          <!-- Quadratino Check Personalizzato (CSS style) -->
          <div class="custom-check" id="check-${mod.id}">✓</div>
          <span style="font-size: 0.95rem; font-weight: 700;">${mod.title}</span>
        </div>
      </div>
      
      <div class="func-sub-controls" onclick="event.stopPropagation();">
        <div style="display: flex; gap: 8px; align-items: center;">
          <button type="button" class="btn-note" onclick="toggleNote(this)">+ Note</button>
          <select class="select-level">
            <option value="VIEW">VIEW</option>
            <option value="EDIT">EDIT</option>
          </select>
        </div>
        
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 0.75rem; font-weight: 700; color: var(--primary);">ERP</span>
          <label class="switch">
            <input type="checkbox" onchange="toggleErpSwitch('${mod.id}', this.checked)">
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <div class="note-container">
        <textarea placeholder="Inserisci note per ${mod.title}..." oninput="handleNoteInput(this)"></textarea>
      </div>
    </div>
  `).join('');
}

// Alterna la selezione della riga del modulo
function toggleModuleRow(modId) {
  const row = document.getElementById(`row-${modId}`);
  if (!row) return;

  const isSelected = row.classList.toggle('is-selected');
  appState.modules[modId] = isSelected;
}

// Toggle pannello Note
function toggleNote(btn) {
  const parent = btn.closest('.func-row-wrapper');
  if (!parent) return;
  const noteContainer = parent.querySelector('.note-container');
  if (noteContainer) {
    const isVisible = noteContainer.style.display === 'block';
    noteContainer.style.display = isVisible ? 'none' : 'block';
  }
}

// Gestione evidenziazione tasto nota
function handleNoteInput(textarea) {
  const btnNote = textarea.closest('.func-row-wrapper')?.querySelector('.btn-note');
  if (btnNote) {
    if (textarea.value.trim().length > 0) {
      btnNote.classList.add('has-note');
    } else {
      btnNote.classList.remove('has-note');
    }
  }
}

function toggleErpSwitch(modId, isChecked) {
  if (!appState.modules[modId]) appState.modules[modId] = {};
  appState.modules[modId].erp = isChecked;
}

// Inizializzazione al caricamento
document.addEventListener('DOMContentLoaded', () => {
  renderCompanyForm();
  renderModulesConfig();
});
