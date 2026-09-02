const API_URL = "https://script.google.com/macros/s/AKfycbxNFuhBMPBn9g1ZhVLybwrTEjHMCMqHFuBbjyaz1NLnB9UDmH_YsblQ26l4aFcVXy4/exec";
    // ⚠️ Sostituisci con il tuo Client ID creato su Google Cloud Console (Credenziali > OAuth Client ID > Web application)
    const GOOGLE_CLIENT_ID = "502671012765-qupbn2bnhhovfsjlb375c6mlhhalbpcf.apps.googleusercontent.com";
    let globalStructure = [], meAziendaStructure = [], currentConfigId = null, isConfigLoadedLocked = false;
    let googleIdToken = null;
    let configOrigin = "scratch"; // "scratch" | "preset_S" | "preset_M" | "preset_L"
    let presetInitialFunctions = []; // istantanea delle funzioni spuntate al momento dell'applicazione del preset

    document.addEventListener("DOMContentLoaded", () => {
      const savedToken = sessionStorage.getItem("swan_google_token");
      if (savedToken) {
        // Sessione già attiva in questa scheda: riparte senza richiedere di nuovo l'accesso.
        // La verifica vera avviene comunque ad ogni chiamata reale sul backend.
        googleIdToken = savedToken;
        enterApp();
      } else {
        initGoogleSignIn();
      }
    });

    function initGoogleSignIn() {
      if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
        setTimeout(initGoogleSignIn, 300); // la libreria di Google potrebbe non essere ancora pronta
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
      enterApp();
    }

    function enterApp() {
      document.getElementById("auth-gate").classList.add("hidden");
      document.getElementById("landing-screen").classList.remove("hidden");
      loadInitialData();
      checkDraftButton();
    }

    // Se il backend rifiuta il token (scaduto, non autorizzato, ecc.) si torna alla schermata di accesso
    function handleAuthRejection(message) {
      sessionStorage.removeItem("swan_google_token");
      googleIdToken = null;
      document.getElementById("landing-screen").classList.add("hidden");
      document.getElementById("dashboard-screen").classList.add("hidden");
      document.getElementById("azienda-screen").classList.add("hidden");
      document.getElementById("config-screen").classList.add("hidden");
      document.getElementById("success-screen").classList.add("hidden");
      document.getElementById("floating-dock").classList.add("hidden");
      const errEl = document.getElementById("auth-error-msg");
      if (errEl) { errEl.textContent = message || "Accesso non autorizzato. Riprova con un account abilitato."; errEl.classList.remove("hidden"); }
      document.getElementById("auth-gate").classList.remove("hidden");
      initGoogleSignIn();
    }

    function checkDraftButton() {
      const draft = localStorage.getItem("swan_draft");
      const btn = document.getElementById("btn-resume-draft");
      if (btn) btn.classList.toggle("hidden", !draft);
    }

    function resumeDraft() {
      showDashboard();
      restoreDraft();
    }

    function loadInitialData() {
      const cached = localStorage.getItem("swan_structure_cache");
      if (cached) {
        try {
          const p = JSON.parse(cached);
          if (p.moduli) globalStructure = p.moduli;
          if (p.azienda) meAziendaStructure = p.azienda;
          renderAll();
        } catch(e) {}
      }

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.withSuccessHandler(d => { globalStructure = d; updateCache(); renderSwanModules(); restoreDraft(); }).getStructure();
        google.script.run.withSuccessHandler(d => { meAziendaStructure = d; updateCache(); renderAziendaAccordion(); restoreDraft(); }).getAziendaStructure();
      } else {
        fetch(API_URL + "?action=getStructure&id_token=" + encodeURIComponent(googleIdToken || "")).then(r=>r.json()).then(d=>{
          if (d.status === "error" && /autorizzat/i.test(d.message || "")) { handleAuthRejection(d.message); return; }
          if(d.moduli) globalStructure = d.moduli;
          if(d.azienda) meAziendaStructure = d.azienda;
          updateCache(); renderAll();
        }).catch(e=>console.warn("Offline fallback"));
      }
    }

    function updateCache() { localStorage.setItem("swan_structure_cache", JSON.stringify({ moduli: globalStructure, azienda: meAziendaStructure })); }
    function renderAll() { renderAziendaAccordion(); renderSwanModules(); restoreDraft(); }

    function startNewConfig() {
      isConfigLoadedLocked = false;
      currentConfigId = null;
      configOrigin = "scratch";
      presetInitialFunctions = [];
      ['input-azienda','input-referente','input-compilatore','input-email'].forEach(id => {
        const el = document.getElementById(id);
        el.disabled = false;
        el.value = "";
      });
      document.getElementById("loaded-code-tag").classList.add("hidden");
      removeClientLogo();
      showDashboard();
    }

    function togglePresetChoices() {
      document.getElementById("preset-choices").classList.toggle("hidden");
    }

    function startPresetConfig(tier) {
      startNewConfig();
      applyPreset(tier);
    }

    // Pre-seleziona le funzioni marcate per la taglia scelta nel foglio "Struttura"
    // (colonne In_Preset_S / In_Preset_M / In_Preset_L). Resta sempre modificabile liberamente:
    // è un punto di partenza, non un vincolo — la taglia reale si ricalcola dalle funzioni spuntate.
    function applyPreset(tier) {
      const field = tier === 'S' ? 'presetS' : (tier === 'M' ? 'presetM' : 'presetL');
      const checkedFunctions = [];
      globalStructure.forEach(item => {
        const cb = document.getElementById('f_' + item.funzione);
        if (!cb) return;
        const shouldCheck = !!item[field];
        cb.checked = shouldCheck;
        if (shouldCheck) checkedFunctions.push(item.funzione);
        const card = document.getElementById('card_f_' + item.funzione);
        if (card) {
          card.classList.toggle('is-selected', shouldCheck);
          card.setAttribute('aria-checked', shouldCheck ? 'true' : 'false');
        }
      });
      configOrigin = "preset_" + tier;
      presetInitialFunctions = checkedFunctions;
      recalculateTaglia();
      saveDraftState();
    }

    // Deseleziona tutte le funzioni (es. dopo aver applicato un preset per sbaglio)
    function clearAllFunctions() {
      if (!confirm("Vuoi deselezionare tutte le funzioni scelte finora? Potrai ripartire da zero.")) return;
      globalStructure.forEach(item => {
        const cb = document.getElementById('f_' + item.funzione);
        if (cb) cb.checked = false;
        const eb = document.getElementById('e_' + item.funzione);
        if (eb) eb.checked = false;
        const card = document.getElementById('card_f_' + item.funzione);
        if (card) { card.classList.remove('is-selected'); card.setAttribute('aria-checked', 'false'); }
      });
      configOrigin = "scratch";
      presetInitialFunctions = [];
      recalculateTaglia();
      saveDraftState();
    }

    /* 1. DETTAGLI AZIENDA CON GESTIONE CASSA TESTO "ALTRO" */
    let clientLogoDataUrl = null;

    function handleLogoUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) { alert("Seleziona un file immagine valido (PNG o JPG)."); return; }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxW = 300;
          const scale = Math.min(1, maxW / img.width);
          const canvas = document.createElement("canvas");
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          clientLogoDataUrl = canvas.toDataURL("image/png", 0.9);
          applyClientLogoPreview();
          saveDraftState();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    function applyClientLogoPreview() {
      if (!clientLogoDataUrl) return;
      document.getElementById("client-logo-preview").src = clientLogoDataUrl;
      document.getElementById("client-logo-preview").classList.remove("hidden");
      document.getElementById("logo-upload-placeholder").classList.add("hidden");
      document.getElementById("logo-remove-btn").classList.remove("hidden");

      const headerLogo = document.getElementById("header-client-logo");
      headerLogo.src = clientLogoDataUrl;
      headerLogo.classList.remove("hidden");
    }

    function removeClientLogo(event) {
      if (event) event.stopPropagation();
      clientLogoDataUrl = null;
      document.getElementById("client-logo-preview").classList.add("hidden");
      document.getElementById("logo-upload-placeholder").classList.remove("hidden");
      document.getElementById("logo-remove-btn").classList.add("hidden");
      document.getElementById("header-client-logo").classList.add("hidden");
      document.getElementById("client-logo-input").value = "";
      saveDraftState();
    }

    function escAttr(str) {
      return String(str || "").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
    }

    function renderAziendaAccordion() {
      const root = document.getElementById("azienda-accordion-root");
      if (!root || !meAziendaStructure.length) return;

      const grouped = {};
      meAziendaStructure.forEach(item => {
        const arg = item.argomento || "Generale";
        if (!grouped[arg]) grouped[arg] = {};
        const dom = item.domanda || "Informazioni";
        if (!grouped[arg][dom]) grouped[arg][dom] = [];
        grouped[arg][dom].push(item);
      });

      let html = "";
      Object.keys(grouped).forEach((arg, idx) => {
        const argId = `arg-${idx}`;
        html += `<div class="accordion-item" id="${argId}">
          <div class="accordion-header" onclick="toggleAccordion('${argId}')">
            <span>📂 ${arg}</span><span class="status-icon">Incompleto</span>
          </div>
          <div class="accordion-content-wrap"><div class="accordion-content">`;

        Object.keys(grouped[arg]).forEach((dom, dIdx) => {
          const items = grouped[arg][dom];
          const isReq = items.some(i => i.obbligatorio === "SI");
          const inputType = items[0].tipo || "text";

          html += `<div style="margin-top:15px;"><div style="font-weight:600; font-size:0.9rem;">${dom} ${isReq?'<span class="badge-req">Obbligatorio</span>':''}</div>`;

          const argAttr = escAttr(arg);
          const domAttr = escAttr(dom);

          if (inputType === "checkbox" || inputType === "radio" || inputType === "multi choice") {
            html += `<div class="az-options-grid">`;
            items.forEach((opt, oIdx) => {
              const inpId = `az_${idx}_${dIdx}_${oIdx}`;
              const fieldName = `az_${arg}_${dom}`.replace(/\s+/g, '_');
              const isAltro = opt.opzione.toLowerCase().includes("altro");

              html += `<div>
                <label class="az-option-label">
                  <input type="${inputType === 'checkbox' ? 'checkbox' : 'radio'}" name="${fieldName}" id="${inpId}" value="${opt.opzione}" data-argomento="${argAttr}" data-domanda="${domAttr}" onchange="toggleAltroText('${inpId}_txt', this.checked); validateAzProgress(); saveDraftState();">
                  <span>${opt.opzione}</span>
                </label>
                ${isAltro ? `<input type="text" id="${inpId}_txt" class="az-altro-input hidden" placeholder="Specificare..." oninput="saveDraftState()">` : ''}
              </div>`;
            });
            html += `</div>`;
          } else {
            html += `<input type="text" id="az_${idx}_${dIdx}_text" class="form-control" data-argomento="${argAttr}" data-domanda="${domAttr}" style="margin-top:5px;" oninput="validateAzProgress(); saveDraftState();">`;
          }
          html += `</div>`;
        });
        html += `</div></div></div>`;
      });
      root.innerHTML = html;
      validateAzProgress();
    }

    function toggleAltroText(txtId, checked) {
      const el = document.getElementById(txtId);
      if (el) {
        if (checked) el.classList.remove("hidden");
        else { el.classList.add("hidden"); el.value = ""; }
      }
    }

    function toggleAccordion(id) { document.getElementById(id)?.classList.toggle("open"); }

    function validateAzProgress() {
      const items = document.querySelectorAll("#azienda-accordion-root .accordion-item");
      let comp = 0, tot = items.length;
      items.forEach(item => {
        let isFilled = Array.from(item.querySelectorAll("input")).some(i => (i.type==='text' && i.value.trim()!=='') || ((i.type==='checkbox'||i.type==='radio') && i.checked));
        if (isFilled) { item.classList.add("is-completed"); item.querySelector(".status-icon").innerText = "✓ Completo"; comp++; }
        else { item.classList.remove("is-completed"); item.querySelector(".status-icon").innerText = "Incompleto"; }
      });
      const ba = document.getElementById("badge-azienda");
      if (ba) { ba.innerText = (comp===tot && tot>0) ? "✓ Completato" : `${comp}/${tot} Compilati`; ba.className = "hub-badge " + (comp===tot && tot>0 ? "complete" : "pending"); }
    }

    /* 2. CONFIGURATORE SWAN GERARCHICO CON NOTE E PERMESSI VIEW/CHECK/FULL */
    function renderSwanModules() {
      const root = document.getElementById("swan-modules-root");
      if (!root || !globalStructure.length) return;

      const grouped = {};
      globalStructure.forEach(item => {
        const area = item.area || "Generale";
        const menu = item.menu || "Generale";
        if (!grouped[area]) grouped[area] = {};
        if (!grouped[area][menu]) grouped[area][menu] = [];
        grouped[area][menu].push(item);
      });

      let html = "";
      Object.keys(grouped).forEach((area, aIdx) => {
        const areaId = `area-${aIdx}`;
        html += `
          <div class="area-accordion open" id="${areaId}">
            <div class="area-header" onclick="toggleArea('${areaId}')">
              <span>📍 Area: ${area}</span>
              <div style="display:flex; align-items:center; gap:8px;">
                <div onclick="event.stopPropagation();" style="display:flex; gap:6px;">
                  <button class="btn btn-xs btn-secondary" onclick="toggleSelectGroup('area', '${areaId}', true)">Seleziona Tutto</button>
                  <button class="btn btn-xs btn-secondary" onclick="toggleSelectGroup('area', '${areaId}', false)">Deseleziona</button>
                </div>
                <span class="area-chevron">▼</span>
              </div>
            </div>
            <div class="area-content-wrap"><div class="area-content">`;

        Object.keys(grouped[area]).forEach((menu, mIdx) => {
          const menuId = `${areaId}-m-${mIdx}`;
          html += `
            <div class="menu-block" id="${menuId}">
              <div class="menu-header">
                <span>📁 Menu: ${menu}</span>
                <div>
                  <button class="btn btn-xs btn-secondary" onclick="toggleSelectGroup('menu', '${menuId}', true)">Tutto</button>
                  <button class="btn btn-xs btn-secondary" onclick="toggleSelectGroup('menu', '${menuId}', false)">Nessuno</button>
                </div>
              </div>`;

          grouped[area][menu].forEach(item => {
            const fKey = item.funzione;
            html += `
              <div class="funzione-card" id="card_f_${fKey}" tabindex="0" role="checkbox" aria-checked="false"
                   onclick="toggleFuncCard(this, 'f_${fKey}')"
                   onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); toggleFuncCard(this, 'f_${fKey}');}">
                <div class="funzione-row">
                  <div class="func-title-group">
                    <div class="custom-check">✓</div>
                    <input type="checkbox" id="f_${fKey}" class="chk-funzione" tabindex="-1">
                    <div>
                      <span class="func-name">${fKey}</span>
                      ${item.sottomenu ? `<span class="func-submenu">${item.sottomenu}</span>` : ''}
                    </div>
                  </div>

                  <div class="funzione-controls" onclick="event.stopPropagation()">
                    <button type="button" id="btn_note_${fKey}" class="btn-note" onclick="toggleNoteField('${fKey}')">📝 Nota</button>

                    <select id="l_${fKey}" class="permesso-select" onchange="saveDraftState()">
                      <option value="VIEW">VIEW</option>
                      <option value="CHECK">CHECK</option>
                      <option value="FULL">FULL</option>
                    </select>

                    <label class="erp-switch-wrap hidden">
                      <span class="erp-switch-label">ERP</span>
                      <span class="switch">
                        <input type="checkbox" id="e_${fKey}" class="chk-erp" onchange="recalculateTaglia(); saveDraftState();">
                        <span class="slider"></span>
                      </span>
                    </label>
                  </div>
                </div>

                <div id="note_wrap_${fKey}" class="note-input-wrap" onclick="event.stopPropagation()">
                  <textarea id="n_${fKey}" class="note-textarea" placeholder="Inserisci note relative a questa funzione..." oninput="updateNoteBadge('${fKey}'); saveDraftState();"></textarea>
                </div>
              </div>`;
          });
          html += `</div>`;
        });
        html += `</div></div></div>`;
      });

      root.innerHTML = html;
      recalculateTaglia();
    }

    function toggleFuncCard(card, checkboxId) {
      const cb = document.getElementById(checkboxId);
      if (!cb) return;
      cb.checked = !cb.checked;
      card.classList.toggle('is-selected', cb.checked);
      card.setAttribute('aria-checked', cb.checked ? 'true' : 'false');
      recalculateTaglia();
      saveDraftState();
    }

    function toggleArea(id) { document.getElementById(id)?.classList.toggle("open"); }

    function toggleSelectGroup(type, containerId, check) {
      const container = document.getElementById(containerId);
      if (!container) return;
      const chks = container.querySelectorAll(".chk-funzione");
      chks.forEach(c => {
        c.checked = check;
        c.closest('.funzione-card')?.classList.toggle('is-selected', check);
        c.closest('.funzione-card')?.setAttribute('aria-checked', check ? 'true' : 'false');
      });
      recalculateTaglia(); saveDraftState();
    }

    function toggleNoteField(fKey) {
      const wrap = document.getElementById(`note_wrap_${fKey}`);
      if (wrap) wrap.classList.toggle("open");
    }

    function updateNoteBadge(fKey) {
      const txt = document.getElementById(`n_${fKey}`)?.value.trim();
      const btn = document.getElementById(`btn_note_${fKey}`);
      if (btn) {
        if (txt) btn.classList.add("has-note");
        else btn.classList.remove("has-note");
      }
    }

    function toggleErpMasterMaster(checked) {
      const nameInput = document.getElementById("erp-master-name");
      nameInput.disabled = !checked;
      if (!checked) nameInput.value = "";

      const erpWraps = document.querySelectorAll(".erp-switch-wrap");
      erpWraps.forEach(w => {
        if (checked) w.classList.remove("hidden");
        else {
          w.classList.add("hidden");
          const chk = w.querySelector("input");
          if(chk) chk.checked = false;
        }
      });
      recalculateTaglia(); saveDraftState();
    }

    function recalculateTaglia() {
      let sviluppo = 0, dati = 0, test = 0, erpCount = 0;
      const isGlobalErp = document.getElementById("erp-global-toggle").checked;

      globalStructure.forEach(item => {
        const checkF = document.getElementById('f_' + item.funzione);
        if (checkF && checkF.checked) {
          sviluppo += (Number(item.sviluppo) || 0);
          dati += (Number(item.dati) || 0);
          test += (Number(item.test) || 0);

          const checkE = document.getElementById('e_' + item.funzione);
          if (isGlobalErp && checkE && checkE.checked) erpCount++;
        }
      });

      let tempoTotale = (sviluppo + dati + test) + (erpCount * 1.0);
      let taglia = tempoTotale > 25 ? "L" : (tempoTotale > 10 ? "M" : "S");

      const tagliaBadge = document.getElementById("dock-taglia-badge");
      if (tagliaBadge) { tagliaBadge.textContent = `TAGLIA ${taglia}`; tagliaBadge.className = `dock-taglia taglia-${taglia}`; }

      const daysText = document.getElementById("dock-days-text");
      if (daysText) daysText.textContent = `${tempoTotale.toFixed(1)} Giorni Uomo`;

      const badgeConfig = document.getElementById("badge-config");
      if (badgeConfig) { badgeConfig.textContent = `Taglia ${taglia} (${tempoTotale.toFixed(1)} gg)`; badgeConfig.className = "hub-badge complete"; }
    }

    /* 3. CARICAMENTO DATI ESISTENTI E BLOCCO CAMPI */
    function onConfigLoaded(data) {
      if (!data || data.status === "error") { alert("Codice non trovato!"); return; }
      closeLoadModal();

      currentConfigId = data.config_id || data.id || null;
      isConfigLoadedLocked = true;

      ['input-azienda','input-referente','input-compilatore','input-email'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.disabled = true;
      });

      const tag = document.getElementById("loaded-code-tag");
      if(tag) { tag.textContent = `🔒 CODE: ${currentConfigId}`; tag.classList.remove("hidden"); }

      localStorage.setItem("swan_draft", JSON.stringify(data));
      showDashboard();
      restoreDraft();
    }

    function restoreDraft() {
      const draft = localStorage.getItem("swan_draft");
      if (!draft) return;
      try {
        const data = JSON.parse(draft);
        if (data.config_origin) configOrigin = data.config_origin;
        if (Array.isArray(data.preset_initial_functions_snapshot)) presetInitialFunctions = data.preset_initial_functions_snapshot;
        if (data.azienda) document.getElementById("input-azienda").value = data.azienda;
        if (data.referente) document.getElementById("input-referente").value = data.referente;
        if (data.compilatore) document.getElementById("input-compilatore").value = data.compilatore;
        if (data.email) document.getElementById("input-email").value = data.email;

        if (data.dettagli_azienda) {
          document.querySelectorAll("#azienda-accordion-root input[data-domanda]").forEach(inp => {
            const argomento = inp.dataset.argomento || "Generale";
            const domanda = inp.dataset.domanda;
            const argData = data.dettagli_azienda[argomento];
            if (!argData || !(domanda in argData)) return;
            const storedParts = String(argData[domanda]).split(", ");

            if (inp.type === "checkbox" || inp.type === "radio") {
              const match = storedParts.find(p => p === inp.value || p.indexOf(inp.value + ":") === 0);
              if (match) {
                inp.checked = true;
                if (match.indexOf(":") !== -1) {
                  const txt = document.getElementById(`${inp.id}_txt`);
                  if (txt) { txt.classList.remove("hidden"); txt.value = match.split(":").slice(1).join(":").trim(); }
                }
              }
            } else {
              inp.value = argData[domanda];
            }
          });
        }

        if (data.logo_cliente_base64) {
          clientLogoDataUrl = data.logo_cliente_base64;
          applyClientLogoPreview();
        }

        if (data.usa_erp_globale) {
          const toggle = document.getElementById("erp-global-toggle");
          if(toggle) { toggle.checked = true; toggleErpMasterMaster(true); document.getElementById("erp-master-name").value = data.nome_erp_master || ""; }
        }

        globalStructure.forEach(item => {
          const fKey = item.funzione;
          if (data['f_' + fKey]) {
            const f = document.getElementById('f_' + fKey);
            if (f) {
              f.checked = true;
              const card = document.getElementById('card_f_' + fKey);
              if (card) { card.classList.add('is-selected'); card.setAttribute('aria-checked', 'true'); }
            }
          }
          if (data['e_' + fKey]) { const e = document.getElementById('e_' + fKey); if (e) e.checked = true; }
          if (data['l_' + fKey]) { const l = document.getElementById('l_' + fKey); if (l) l.value = data['l_' + fKey]; }
          if (data['n_' + fKey]) {
            const n = document.getElementById('n_' + fKey);
            if (n) { n.value = data['n_' + fKey]; updateNoteBadge(fKey); }
          }
        });

        recalculateTaglia();
        validateAzProgress();
      } catch(e) {}
    }

    function collectFormData() {
      const data = {
        config_id: currentConfigId,
        id_token: googleIdToken || "",
        azienda: document.getElementById("input-azienda")?.value.trim() || "",
        referente: document.getElementById("input-referente")?.value.trim() || "",
        compilatore: document.getElementById("input-compilatore")?.value.trim() || "",
        email: document.getElementById("input-email")?.value.trim() || "",
        usa_erp_globale: document.getElementById("erp-global-toggle")?.checked || false,
        nome_erp_master: document.getElementById("erp-master-name")?.value.trim() || "",
        logo_cliente_base64: clientLogoDataUrl || "",
        dettagli_azienda: {}
      };

      const azMap = {};
      document.querySelectorAll("#azienda-accordion-root input[data-domanda]").forEach(inp => {
        const argomento = inp.dataset.argomento || "Generale";
        const domanda = inp.dataset.domanda;
        if (!azMap[argomento]) azMap[argomento] = {};

        if (inp.type === "checkbox" || inp.type === "radio") {
          if (inp.checked) {
            let val = inp.value;
            const txt = document.getElementById(`${inp.id}_txt`);
            if (txt && txt.value.trim() !== "") val += `: ${txt.value.trim()}`;
            (azMap[argomento][domanda] = azMap[argomento][domanda] || []).push(val);
          }
        } else if (inp.value.trim() !== "") {
          azMap[argomento][domanda] = [inp.value.trim()];
        }
      });
      Object.keys(azMap).forEach(arg => {
        data.dettagli_azienda[arg] = {};
        Object.keys(azMap[arg]).forEach(dom => {
          data.dettagli_azienda[arg][dom] = azMap[arg][dom].join(", ");
        });
      });

      globalStructure.forEach(item => {
        const fKey = item.funzione;
        const checkF = document.getElementById('f_' + fKey);
        const checkE = document.getElementById('e_' + fKey);
        const selectL = document.getElementById('l_' + fKey);
        const noteN = document.getElementById('n_' + fKey);

        if (checkF && checkF.checked) {
          data['f_' + fKey] = true;
          data['e_' + fKey] = checkE ? checkE.checked : false;
          data['l_' + fKey] = selectL ? selectL.value : "VIEW";
          if (noteN && noteN.value.trim() !== "") data['n_' + fKey] = noteN.value.trim();
        }
      });

      // Tracciamento origine configurazione: da zero o partita da un preset S/M/L,
      // e in tal caso cosa è stato aggiunto/tolto rispetto al pacchetto di partenza.
      data.config_origin = configOrigin;
      data.preset_initial_functions_snapshot = presetInitialFunctions;
      if (configOrigin !== "scratch") {
        const finalFunctions = [];
        globalStructure.forEach(item => {
          const cb = document.getElementById('f_' + item.funzione);
          if (cb && cb.checked) finalFunctions.push(item.funzione);
        });
        data.funzioni_aggiunte_vs_preset = finalFunctions.filter(f => !presetInitialFunctions.includes(f)).join(", ");
        data.funzioni_rimosse_vs_preset = presetInitialFunctions.filter(f => !finalFunctions.includes(f)).join(", ");
      } else {
        data.funzioni_aggiunte_vs_preset = "";
        data.funzioni_rimosse_vs_preset = "";
      }

      return data;
    }

    /* 4. NAVIGAZIONE E INVIO FINALE CON SUCCESS PAGE */
    function showDashboard() {
      ['landing-screen','azienda-screen','config-screen','success-screen'].forEach(id=>document.getElementById(id).classList.add("hidden"));
      document.getElementById("dashboard-screen").classList.remove("hidden");
      document.getElementById("floating-dock").classList.remove("hidden");
    }

    function showFocusPage(pageId) {
      document.getElementById("dashboard-screen").classList.add("hidden");
      document.getElementById(pageId).classList.remove("hidden");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function resetToHome() {
      localStorage.removeItem("swan_draft");
      location.reload();
    }

    function submitFinalForm() {
      if (!document.getElementById("input-azienda").value.trim()) { alert("Compila i dati anagrafici prima di proseguire."); showDashboard(); return; }
      openSummaryModal();
    }

    function openSummaryModal() {
      const data = collectFormData();
      const taglia = document.getElementById("dock-taglia-badge")?.textContent || "TAGLIA S";
      const giorni = document.getElementById("dock-days-text")?.textContent || "0.0 Giorni Uomo";
      document.getElementById("summary-content-body").innerHTML = `
        <div class="stat-grid">
          <div class="stat-item"><span>Azienda</span><strong>${escapeHtml(data.azienda) || '-'}</strong></div>
          <div class="stat-item"><span>Referente</span><strong>${escapeHtml(data.referente) || '-'}</strong></div>
          <div class="stat-item"><span>Stima Taglia</span><strong>${taglia}</strong></div>
          <div class="stat-item"><span>Sforzo</span><strong>${giorni}</strong></div>
        </div>
      `;
      document.getElementById("summary-modal").classList.add("active");
    }

    function escapeHtml(str) {
      const d = document.createElement('div');
      d.textContent = str || '';
      return d.innerHTML;
    }

    function closeSummaryModal() { document.getElementById("summary-modal").classList.remove("active"); }

    async function executeFinalSubmit() {
      closeSummaryModal();
      const payload = collectFormData();
      showLoadingOverlay();

      try {
        if (typeof google !== 'undefined' && google.script && google.script.run) {
          google.script.run.withSuccessHandler(onSavedSuccess).withFailureHandler(onSaveFailed).processForm(payload);
        } else {
          const res = await fetch(API_URL, { method: "POST", body: JSON.stringify(payload) });
          const result = await res.json();
          onSavedSuccess(result);
        }
      } catch (err) { onSaveFailed(err); }
    }

    function showLoadingOverlay() { document.getElementById("loading-overlay").classList.remove("hidden"); }
    function hideLoadingOverlay() { document.getElementById("loading-overlay").classList.add("hidden"); }

    function onSaveFailed(err) {
      hideLoadingOverlay();
      alert("Errore invio: " + err.toString());
    }

    function onSavedSuccess(res) {
      hideLoadingOverlay();
      if (res && res.status === "error" && /autorizzat/i.test(res.message || "")) { handleAuthRejection(res.message); return; }
      if (res && res.status === "success") {
        localStorage.removeItem("swan_draft");
        document.getElementById("success-code-display").textContent = res.id || "SWAN-COMPLETED";
        ['landing-screen','dashboard-screen','azienda-screen','config-screen','floating-dock'].forEach(id=>document.getElementById(id).classList.add("hidden"));
        document.getElementById("success-screen").classList.remove("hidden");
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else alert("Errore nel salvataggio dei dati.");
    }

    function saveDraftState() { localStorage.setItem("swan_draft", JSON.stringify(collectFormData())); checkDraftButton(); }
    function showLoadModal() { document.getElementById("load-modal").classList.add("active"); }
    function closeLoadModal() { document.getElementById("load-modal").classList.remove("active"); }

    async function fetchConfigByCode() {
      const code = document.getElementById("load-code-input").value.trim();
      if (!code) return;
      try {
        if (typeof google !== 'undefined' && google.script && google.script.run) {
          google.script.run.withSuccessHandler(onConfigLoaded).loadConfigByCode(code);
        } else {
          const res = await fetch(`${API_URL}?action=loadConfigByCode&code=${encodeURIComponent(code)}&id_token=${encodeURIComponent(googleIdToken || "")}`);
          const data = await res.json();
          if (data.status === "error" && /autorizzat/i.test(data.message || "")) { handleAuthRejection(data.message); return; }
          onConfigLoaded(data);
        }
      } catch(e) { alert("Errore nel recupero della configurazione."); }
    }
