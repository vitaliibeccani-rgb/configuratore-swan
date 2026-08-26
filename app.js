// --- STATO DELL'APPLICAZIONE ---
const appState = {
  company: {},
  modules: {
    erp: { active: false, name: '' },
    attivazioni: false,
    garanzie: false,
    ordini: false
  }
};

// --- 1. GESTIONE DEFINIZIONE AZIENDA ---
const companyQuestions = [
  { id: 'ragioneSociale', label: 'Ragione Sociale / Nome Azienda', type: 'text', placeholder: 'Es. Acme S.r.l.' },
  { id: 'settore', label: 'Settore Aziendale', type: 'select', options: ['Manifatturiero / Industriale', 'Commercio / Retail', 'Servizi / Consulenza', 'Logistica e Trasporti', 'Altro'] },
  { id: 'dipendenti', label: 'Numero di Dipendenti', type: 'select', options: ['1 - 10', '11 - 50', '51 - 250', 'Oltre 250'] },
  { id: 'modelloBusiness', label: 'Modello di Business', type: 'select', options: ['B2B (Business to Business)', 'B2C (Business to Consumer)', 'Ibrido (B2B + B2C)'] },
  { id: 'noteAzienda', label: 'Obiettivi Principali del Progetto', type: 'textarea', placeholder: 'Inserisci eventuali note o requisiti specifici dell\'azienda...' }
];

function renderCompanyForm() {
  const container = document.getElementById('company-section');
  if (!container) return;

  container.innerHTML = `
    <div class="light-card">
      <div class="light-card-header">
        <span>Definizione dell'Azienda</span>
      </div>
      <p class="setting-desc" style="margin-bottom: 15px;">Compila i dati dell'azienda per personalizzare la configurazione.</p>
      <form id="form-azienda" onsubmit="event.preventDefault();">
        <div class="fields-grid-4">
          ${companyQuestions.map(q => {
            if (q.type === 'text') {
              return `
                <div class="form-group">
                  <label for="${q.id}">${q.label}</label>
                  <input type="text" id="${q.id}" placeholder="${q.placeholder || ''}" value="${appState.company[q.id] || ''}" oninput="updateCompanyData('${q.id}', this.value)">
                </div>`;
            } else if (q.type === 'select') {
              return `
                <div class="form-group">
                  <label for="${q.id}">${q.label}</label>
                  <select id="${q.id}" class="select-level" onchange="updateCompanyData('${q.id}', this.value)">
                    <option value="">-- Seleziona --</option>
                    ${q.options.map(opt => `<option value="${opt}" ${appState.company[q.id] === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                  </select>
                </div>`;
            } else if (q.type === 'textarea') {
              return `
                <div class="form-group" style="grid-column: 1 / -1;">
                  <label for="${q.id}">${q.label}</label>
                  <textarea id="${q.id}" class="note-container" style="display:block; min-height: 80px;" placeholder="${q.placeholder || ''}" oninput="updateCompanyData('${q.id}', this.value)">${appState.company[q.id] || ''}</textarea>
                </div>`;
            }
          }).join('')}
        </div>
      </form>
    </div>
  `;
}

function updateCompanyData(key, value) {
  appState.company[key] = value;
  checkCompanyCompletion();
}

function checkCompanyCompletion() {
  const card = document.querySelector('#company-section .light-card');
  if (!card) return;
  
  // Consideriamo la sezione completata se la ragione sociale è compilata
  if (appState.company.ragioneSociale && appState.company.ragioneSociale.trim() !== '') {
    card.classList.add('azienda-completed');
  } else {
    card.classList.remove('azienda-completed');
  }
}

// --- 2. GESTIONE SELEZIONE MODULI & HUB CARDS ---
function toggleCardModule(element, moduleId) {
  const isSelected = !element.classList.contains('completed');
  
  if (isSelected) {
    element.classList.add('completed');
  } else {
    element.classList.remove('completed');
  }

  if (moduleId === 'erp') {
    appState.modules.erp.active = isSelected;
    checkErpButtonCondition();
  } else {
    appState.modules[moduleId] = isSelected;
  }
}

// --- 3. CONDIZIONE VISIBILITÀ TASTO ERP ---
function checkErpButtonCondition() {
  const erpCheckbox = document.getElementById('erp-checkbox');
  const erpNameInput = document.getElementById('erp-name-input');
  const erpBtn = document.getElementById('btn-erp-config');

  const isChecked = erpCheckbox ? erpCheckbox.checked : appState.modules.erp.active;
  const erpName = erpNameInput ? erpNameInput.value.trim() : appState.modules.erp.name;

  if (erpNameInput) {
    appState.modules.erp.name = erpName;
  }

  if (erpBtn) {
    if (isChecked && erpName.length > 0) {
      erpBtn.style.display = 'inline-flex';
      erpBtn.classList.remove('hidden');
    } else {
      erpBtn.style.display = 'none';
      erpBtn.classList.add('hidden');
    }
  }
}

// --- 4. GESTIONE NOTE DINAMICHE SU RIGHE FUNZIONALITÀ ---
function initNoteButtons() {
  document.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('btn-note')) {
      e.stopPropagation();
      const btn = e.target;
      const parent = btn.closest('.func-row-wrapper') || btn.parentElement;
      if (parent) {
        const noteContainer = parent.querySelector('.note-container');
        if (noteContainer) {
          const isVisible = noteContainer.style.display === 'block';
          noteContainer.style.display = isVisible ? 'none' : 'block';
        }
      }
    }
  });
}

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

// Inizializzazione al caricamento del DOM
document.addEventListener('DOMContentLoaded', () => {
  renderCompanyForm();
  checkErpButtonCondition();
  initNoteButtons();
});
