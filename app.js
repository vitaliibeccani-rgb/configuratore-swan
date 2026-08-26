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
    <div class="card-container">
      <h3>Definizione dell'Azienda</h3>
      <p class="subtitle">Compila i dati dell'azienda per personalizzare la configurazione.</p>
      <form id="form-azienda" onsubmit="event.preventDefault();">
        ${companyQuestions.map(q => {
          if (q.type === 'text') {
            return `
              <div class="form-group">
                <label for="${q.id}">${q.label}</label>
                <input type="text" id="${q.id}" class="input-field" placeholder="${q.placeholder || ''}" value="${appState.company[q.id] || ''}" oninput="updateCompanyData('${q.id}', this.value)">
              </div>`;
          } else if (q.type === 'select') {
            return `
              <div class="form-group">
                <label for="${q.id}">${q.label}</label>
                <select id="${q.id}" class="select-field" onchange="updateCompanyData('${q.id}', this.value)">
                  <option value="">-- Seleziona un'opzione --</option>
                  ${q.options.map(opt => `<option value="${opt}" ${appState.company[q.id] === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
              </div>`;
          } else if (q.type === 'textarea') {
            return `
              <div class="form-group">
                <label for="${q.id}">${q.label}</label>
                <textarea id="${q.id}" class="textarea-field" rows="3" placeholder="${q.placeholder || ''}" oninput="updateCompanyData('${q.id}', this.value)">${appState.company[q.id] || ''}</textarea>
              </div>`;
          }
        }).join('')}
      </form>
    </div>
  `;
}

function updateCompanyData(key, value) {
  appState.company[key] = value;
}

// --- 2. GESTIONE SELEZIONE MODULI & CHECKBOX ---
function toggleCardModule(element, moduleId) {
  const isSelected = !element.classList.contains('selected');
  
  if (isSelected) {
    element.classList.add('selected');
  } else {
    element.classList.remove('selected');
  }

  // Aggiorna lo stato
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
    appState.modules.erp.name = erpNameInput.value;
  }

  // Il tasto compare SOLO SE la spunta ERP è attiva E il nome ERP è inserito
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

// Inizializzazione al caricamento della pagina
document.addEventListener('DOMContentLoaded', () => {
  renderCompanyForm();
  checkErpButtonCondition();
});
