const API_URL = "https://script.google.com/macros/s/AKfycbzBE_7yPlPqJSk99lxTGAjWs52_lGdTj4-xlVwMN7cYSOS4eq0YVfFqLzuF16TRNjg/exec"; 

let configStructure = [];
let aziendaStructure = [];
let isDataLoaded = false;
let calcoloGiorniGlobale = "0.0";

window.onload = () => {
  checkDraft();
  loadStructureFromCache();
  loadAllStructures();
};

function loadAllStructures() {
  Promise.all([
    fetch(`${API_URL}?action=getStructure`).then(r => r.json()),
    fetch(`${API_URL}?action=getAziendaStructure`).then(r => r.json()).catch(() => [])
  ])
  .then(([structRes, azRes]) => {
    if (Array.isArray(structRes) && structRes.length > 0) {
      configStructure = structRes;
      if (Array.isArray(azRes)) aziendaStructure = azRes;
      isDataLoaded = true;
      localStorage.setItem('swan_structure_cache', JSON.stringify(structRes));
      localStorage.setItem('swan_azienda_cache', JSON.stringify(azRes));
      buildAziendaUI();
    }
  })
  .catch(() => loadStructureFromCache());
}

function loadStructureFromCache() {
  const cachedStruct = localStorage.getItem('swan_structure_cache');
  const cachedAz = localStorage.getItem('swan_azienda_cache');
  if (cachedStruct) {
    configStructure = JSON.parse(cachedStruct);
    if (cachedAz) aziendaStructure = JSON.parse(cachedAz);
    if (configStructure.length > 0) isDataLoaded = true;
  }
}

function checkDraft() {
  if (localStorage.getItem('swan_draft')) {
    document.getElementById('btn-resume-draft').style.display = 'block';
  }
}

function autoSave() {
  const formData = {};
  document.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.name || el.id) {
      formData[el.name || el.id] = (el.type === 'checkbox') ? el.checked : el.value;
    }
  });
  localStorage.setItem('swan_draft', JSON.stringify(formData));
  checkAziendaCompletion();
  ricalcolaTagliaProgetto();
}

function applyDataToForm(data) {
  for (let key in data) {
    const el = document.getElementsByName(key)[0] || document.getElementById(key);
    if (el) {
      if (el.type === 'checkbox') {
        el.checked = data[key];
        if (key.startsWith('f_')) {
          const card = el.closest('.func-row-wrapper');
          if(card) card.classList.toggle('is-selected', el.checked);
        }
      } else {
        el.value = data[key];
      }
    }
  }
  handleGlobalERP();
  checkAziendaCompletion();
  ricalcolaTagliaProgetto();

  document.querySelectorAll('.note-container textarea').forEach(ta => checkNoteText(ta));
}

function resumeDraft() {
  const draft = JSON.parse(localStorage.getItem('swan_draft'));
  startNewConfig();
  setTimeout(() => applyDataToForm(draft), 300);
}

function startNewConfig() {
  if (!isDataLoaded) loadStructureFromCache();
  navTo('hub-page');
  buildAziendaUI();
  buildUI(); 
  updateTagliaUI('S', '0.0');
}

function toggleRecallBox() {
  const box = document.getElementById('recall-box');
  box.style.display = (box.style.display === 'none') ? 'block' : 'none';
}

function openAziendaSection() {
  buildAziendaUI();
  navTo('azienda-app');
}

function openConfigSection() {
  if(!document.getElementById('nome').value || !document.getElementById('azienda').value) {
    alert("Compila prima i dati obbligatori (Cliente e Referente) nell'Hub.");
    return;
  }
  navTo('config-app');
}

function resetAndHome() {
  localStorage.removeItem('swan_draft');
  document.getElementById('swanForm').reset();
  document.getElementById('aziendaForm').reset();
  document.getElementById('config_id').value = "";
  document.getElementById('nome').value = "";
  document.getElementById('azienda').value = "";
  document.getElementById('email').value = "";
  document.getElementById('compilatore').value = "";
  document.getElementById('btn-resume-draft').style.display = 'none';
  navTo('landing-page');
}

function navTo(targetId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('page-visible'));
  document.getElementById(targetId).classList.add('page-visible');
  window.scrollTo(0, 0);

  const dock = document.getElementById('main-dock-bar');
  if (targetId === 'config-app') {
    dock.style.display = 'flex';
  } else {
    dock.style.display = 'none';
  }
}

function checkAziendaCompletion() {
  const azCards = document.querySelectorAll('.light-card[id^="az_card_"]');
  let allCompleted = azCards.length > 0;

  azCards.forEach(card => {
    const reqGroups = card.querySelectorAll('.form-group[data-required="true"]');
    let cardValid = true;

    reqGroups.forEach(grp => {
      const inputs = grp.querySelectorAll('input');
      let answered = false;
      inputs.forEach(i => {
        if ((i.type === 'checkbox' && i.checked) || (i.type === 'text' && i.value.trim() !== "")) {
          answered = true;
        }
      });
      if (!answered) cardValid = false;
    });

    if (cardValid && reqGroups.length > 0) {
      card.classList.add('azienda-completed');
    } else {
      card.classList.remove('azienda-completed');
      allCompleted = false;
    }
  });

  const hubCardAz = document.getElementById('hub-card-azienda');
  if (hubCardAz) {
    if (allCompleted) hubCardAz.classList.add('completed');
    else hubCardAz.classList.remove('completed');
  }
}

function ricalcolaTagliaProgetto() {
  if (!configStructure.length) return;
  let giorniTotali = 0;
  const erpGlobaleAttivo = document.getElementById('usa_erp_globale').checked;

  configStructure.forEach(item => {
    const chkFunzione = document.querySelector(`input[name="f_${item.funzione}"]`);
    if (chkFunzione && chkFunzione.checked) {
      let tempoSviluppo = Number(item.sviluppo || 0);
      let tempoDati = Number(item.dati || 0);
      let tempoTest = Number(item.test || 0);

      const chkErp = document.querySelector(`input[name="e_${item.funzione}"]`);
      if (erpGlobaleAttivo && chkErp && chkErp.checked) {
        tempoSviluppo += 1.5; 
      }

      giorniTotali += Math.max(tempoSviluppo, tempoDati) + tempoTest;
    }
  });

  calcoloGiorniGlobale = giorniTotali.toFixed(1);

  let taglia = "S";
  if (giorniTotali > 10 && giorniTotali <= 25) taglia = "M";
  else if (giorniTotali > 25) taglia = "L";

  updateTagliaUI(taglia, calcoloGiorniGlobale);
}

function updateTagliaUI(taglia, sforzo) {
  document.getElementById('dock-taglia-val').innerText = 'Taglia ' + taglia;
  document.getElementById('dock-sforzo-val').innerText = sforzo + ' gg';
  
  const badge = document.getElementById('dock-taglia-val');
  if (taglia === 'M') badge.style.background = '#f59e0b'; 
  else if (taglia === 'L') badge.style.background = '#ef4444'; 
  else badge.style.background = '#10b981'; 
}

function buildAziendaUI() {
  const container = document.getElementById('azienda-builder-container');
  if (!container) return;
  container.innerHTML = "";

  if (!aziendaStructure || aziendaStructure.length === 0) {
    container.innerHTML = "<div class='light-card'><p style='text-align:center;'>Nessuna domanda trovata.</p></div>";
    return;
  }

  const getValue = (row, keys) => {
    for (let k of keys) {
      if (row[k] !== undefined && row[k] !== null) return row[k];
      let foundKey = Object.keys(row).find(rk => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, ''));
      if (foundKey && row[foundKey] !== undefined) return row[foundKey];
    }
    return "";
  };

  const argsMap = {};
  aziendaStructure.forEach(row => {
    const arg = getValue(row, ['argomentoPrincipale', 'argomento', 'categoria']) || "DEFINIZIONE DELL'AZIENDA";
    if (!argsMap[arg]) argsMap[arg] = [];
    argsMap[arg].push(row);
  });

  let html = '';
  Object.keys(argsMap).forEach((argName, cardIdx) => {
    const cardId = `az_card_${cardIdx}`;
    html += `
      <div class="light-card" id="${cardId}">
        <div class="light-card-header" onclick="toggleAzCard('${cardId}')">
          <span>${argName}</span>
          <span class="az-icon" style="color:var(--primary)">+</span>
        </div>
        <div class="az-card-body" style="display:none; margin-top:12px;">`;

    const questionsMap = {};
    argsMap[argName].forEach(row => {
      const quest = getValue(row, ['sottoArgomento', 'domanda', 'quesito', 'titolo']) || "Generale";
      if (!questionsMap[quest]) questionsMap[quest] = [];
      questionsMap[quest].push(row);
    });

    Object.keys(questionsMap).forEach((qTitle, qIdx) => {
      const rowsGroup = questionsMap[qTitle];
      const firstRow = rowsGroup[0];
      const obblig = String(getValue(firstRow, ['obbligatorio', 'req'])).toLowerCase();
      const isReq = (obblig === 'true' || obblig === 'si' || obblig === '1' || obblig === 'sì');
      const reqStar = isReq ? `<span style="color:#ef4444;">*</span>` : '';

      html += `<div class="form-group" data-required="${isReq}">
                <label style="color:var(--text-main);">${qTitle} ${reqStar}</label>`;

      if (rowsGroup.length === 1 && String(getValue(firstRow, ['tipoInput', 'tipo'])).toLowerCase() === 'text') {
        const fieldId = `az_${cardIdx}_${qIdx}_0`;
        html += `<input type="text" id="${fieldId}" name="${fieldId}" oninput="autoSave()">`;
      } else {
        html += `<div class="az-options-group-horizontal">`;
        rowsGroup.forEach((optionRow, optIdx) => {
          const optionLabel = getValue(optionRow, ['rispostePossibili', 'opzione', 'risposta', 'valore']) || `Opzione ${optIdx+1}`;
          const typeInput = String(getValue(optionRow, ['tipoInput', 'tipo'])).toLowerCase();
          const fieldId = `az_${cardIdx}_${qIdx}_${optIdx}`;

          if (typeInput === 'checkbox' || typeInput === '') {
            html += `
              <label class="az-option-item-horiz">
                <input type="checkbox" id="${fieldId}" name="${fieldId}" onchange="autoSave()">
                <span>${optionLabel}</span>
              </label>`;
          } else if (typeInput === 'text') {
            html += `
              <div class="az-option-item-horiz">
                <span>${optionLabel}:</span>
                <input type="text" id="${fieldId}" name="${fieldId}" placeholder="Specificare..." oninput="autoSave()">
              </div>`;
          }
        });
        html += `</div>`;
      }
      html += `</div>`;
    });
    html += `</div></div>`;
  });

  container.innerHTML = html;
  checkAziendaCompletion();
}

function toggleAzCard(cardId) {
  const card = document.getElementById(cardId);
  const body = card.querySelector('.az-card-body');
  const icon = card.querySelector('.az-icon');
  const isOpen = body.style.display === 'block';
  body.style.display = isOpen ? 'none' : 'block';
  if (icon) icon.innerText = isOpen ? "+" : "-";
}

function handleGlobalERP() {
  const isChecked = document.getElementById('usa_erp_globale').checked;
  document.getElementById('nome_erp_master').style.display = isChecked ? 'block' : 'none';
  ricalcolaTagliaProgetto();
}

function buildUI() {
  const container = document.getElementById('builder-container');
  container.innerHTML = ""; 
  const areas = {};
  configStructure.forEach(item => {
    if(!areas[item.area]) areas[item.area] = {};
    if(!areas[item.area][item.menu]) areas[item.area][item.menu] = {};
    const skey = (item.sottomenu && item.sottomenu.trim() !== "") ? item.sottomenu : "_DIRECT_";
    if(!areas[item.area][item.menu][skey]) areas[item.area][item.menu][skey] = [];
    areas[item.area][item.menu][skey].push(item);
  });

  let html = '';
  Object.keys(areas).forEach((aName, aIdx) => {
    const aId = `area_box_${aIdx}`;
    html += `<div class="light-card" id="${aId}">
              <div class="light-card-header" onclick="toggleArea('${aId}')">
                <span>${aName}</span>
                <span class="az-icon" style="color:var(--primary)">+</span>
              </div>
              <div class="area-content" style="display:none; margin-top:12px;">`;
    
    Object.keys(areas[aName]).forEach((mName, mIdx) => {
      const mId = `m_${aIdx}_${mIdx}`;
      const subKeys = Object.keys(areas[aName][mName]);
      const isSingleFuncMenu = subKeys.length === 1 && subKeys[0] === "_DIRECT_" && areas[aName][mName]["_DIRECT_"][0].funzione === mName;

      if(isSingleFuncMenu) {
          const f = areas[aName][mName]["_DIRECT_"][0];
          html += renderFunctionRow(f); 
      } else {
          html += `<div style="margin-bottom:12px;" id="${mId}">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                      <h4 style="font-size:0.9rem;">${mName}</h4>
                      <button type="button" class="btn-nav-back" style="font-size:0.75rem;" onclick="selectAll('${mId}')">SELEZIONA TUTTO</button>
                    </div>`;
          subKeys.forEach((sName, sIdx) => {
            const sId = `s_${aIdx}_${mIdx}_${sIdx}`;
            if(sName !== "_DIRECT_") {
              html += `<div style="margin-left:8px; margin-bottom:8px;" id="${sId}">
                        <div style="font-size:0.8rem; font-weight:bold; color:var(--primary); margin-bottom:4px;">${sName}</div>`;
            } else { html += `<div id="${sId}">`; }
            areas[aName][mName][sName].forEach(f => { html += renderFunctionRow(f); });
            html += `</div>`;
          });
          html += `</div>`;
      }
    });
    html += `</div></div>`;
  });
  container.innerHTML = html;
  handleGlobalERP();
}

function renderFunctionRow(f) {
  let levelHTML = (f.tipo === "speciale") 
    ? `<select name="l_${f.funzione}" class="select-level" onclick="event.stopPropagation()"><option value="VIEW">VIEW</option><option value="CHECK">CHECK</option><option value="FULL">FULL</option></select>`
    : `<input type="hidden" name="l_${f.funzione}" value="VIEW">`;

  return `
    <div class="func-row-wrapper" onclick="toggleCardSelection(this, 'f_${f.funzione}')">
      <div class="func-row-header">
        <div class="func-title-group">
          <div class="custom-check">✓</div>
          <input type="checkbox" name="f_${f.funzione}" class="func-checkbox" style="display:none;" onchange="autoSave();">
          <span class="func-name">${f.funzione}</span>
        </div>
      </div>

      <div class="func-sub-controls" onclick="event.stopPropagation()">
        <div style="display:flex; gap:8px; align-items:center;">
          <button type="button" class="btn-note" onclick="toggleNote(this)">+ Note</button>
          ${levelHTML}
        </div>

        <div style="display:flex; align-items:center; gap:5px;">
          <span style="font-size:0.75rem; font-weight:700; color:var(--primary)">ERP</span>
          <label class="switch"><input type="checkbox" name="e_${f.funzione}" onchange="autoSave();"><span class="slider"></span></label>
        </div>
      </div>

      <div class="note-container" onclick="event.stopPropagation()">
        <textarea name="n_${f.funzione}" rows="2" placeholder="Aggiungi una nota..." oninput="checkNoteText(this); autoSave();"></textarea>
      </div>
    </div>`;
}

function toggleNote(btn) {
  const wrapper = btn.closest('.func-row-wrapper');
  const nt = wrapper.querySelector('.note-container');
  const isVisible = nt.style.display === "block";
  nt.style.display = isVisible ? "none" : "block";
}

function checkNoteText(textarea) {
  const wrapper = textarea.closest('.func-row-wrapper');
  const btn = wrapper.querySelector('.btn-note');
  if (textarea.value.trim().length > 0) {
    btn.classList.add('has-note');
  } else {
    btn.classList.remove('has-note');
  }
}

function toggleCardSelection(card, inputName) {
  const cb = card.querySelector(`input[name="${inputName}"]`);
  if(cb) {
    cb.checked = !cb.checked;
    card.classList.toggle('is-selected', cb.checked);
    autoSave();
  }
}

function toggleArea(areaId) {
  const card = document.getElementById(areaId);
  const content = card.querySelector('.area-content');
  const icon = card.querySelector('.az-icon');
  const isOpen = content.style.display === 'block';
  content.style.display = isOpen ? 'none' : 'block';
  if (icon) icon.innerText = isOpen ? "+" : "-";
}

function selectAll(id) {
  const container = document.getElementById(id);
  const wrappers = container.querySelectorAll('.func-row-wrapper');
  if(!wrappers.length) return;
  
  const firstCb = wrappers[0].querySelector('.func-checkbox');
  const targetState = !firstCb.checked;

  wrappers.forEach(w => {
    const cb = w.querySelector('.func-checkbox');
    if(cb) {
      cb.checked = targetState;
      w.classList.toggle('is-selected', targetState);
    }
  });
  autoSave();
}

function saveConfiguration() {
  if(!document.getElementById('nome').value || !document.getElementById('azienda').value) { 
    alert("Compila i dati obbligatori (Cliente e Referente)."); 
    return; 
  }
  
  const btnSave = document.getElementById('btn-save');
  btnSave.innerText = "Salvataggio...";
  btnSave.disabled = true;

  const formData = {};
  document.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.name || el.id) {
      formData[el.name || el.id] = (el.type === 'checkbox') ? el.checked : el.value;
    }
  });

  formData['giorni_totali'] = calcoloGiorniGlobale;

  fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(formData)
  })
  .then(res => res.json())
  .then(resObj => {
    localStorage.removeItem('swan_draft');
    document.getElementById('final-id').innerText = resObj.id || "OK";
    
    const sforzoFinale = resObj.sforzo || calcoloGiorniGlobale;
    document.getElementById('info-success-box').innerHTML = `PROGETTO TAGLIA: ${resObj.taglia || 'S'}<br>STIMA: ${sforzoFinale} giorni`;
    
    navTo('success-page');
  })
  .catch(err => {
    alert("Si è verificato un errore durante il salvataggio.");
  })
  .finally(() => {
    btnSave.innerText = "Salva Configurazione";
    btnSave.disabled = false;
  });
}

function doRecall() {
  const code = document.getElementById('recall-input').value.toUpperCase().replace(/\s+/g, '');
  if(!code) return alert("Inserisci un codice valido.");

  fetch(`${API_URL}?action=loadConfigByCode&code=${encodeURIComponent(code)}`)
    .then(res => res.json())
    .then(res => {
      if(!res || res.error) return alert("ID non trovato.");
      navTo('hub-page');
      buildAziendaUI();
      buildUI();
      setTimeout(() => applyDataToForm(res), 300);
    })
    .catch(() => alert("Errore durante il recupero."));
}
