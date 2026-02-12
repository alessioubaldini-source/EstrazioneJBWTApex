let expandedSections = {};
let progressData = {};
let lastProgressPercent = 0;

function showCustomConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.maxWidth = '400px';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.gap = '20px';

    const title = document.createElement('h3');
    title.className = 'modal-title';
    title.textContent = 'Conferma';

    const text = document.createElement('p');
    text.textContent = message;
    text.style.color = '#374151';

    const actions = document.createElement('div');
    actions.className = 'form-actions';
    actions.style.marginTop = '0';

    const btnNo = document.createElement('button');
    btnNo.className = 'btn-secondary';
    btnNo.textContent = 'NO';
    btnNo.onclick = () => {
      document.body.removeChild(overlay);
      resolve(false);
    };

    const btnYes = document.createElement('button');
    btnYes.className = 'btn-primary';
    btnYes.textContent = 'SÌ';
    btnYes.onclick = () => {
      document.body.removeChild(overlay);
      resolve(true);
    };

    actions.appendChild(btnNo);
    actions.appendChild(btnYes);

    modal.appendChild(title);
    modal.appendChild(text);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  });
}

function toggleSection(key) {
  expandedSections[key] = !expandedSections[key];
  const content = document.querySelector(`[data-section="${key}"]`);
  const icon = document.querySelector(`[data-icon="${key}"]`);
  if (content) {
    content.classList.toggle('open');
    icon.textContent = expandedSections[key] ? '▼' : '▶';
  }
}

async function copyToClipboard(btn, id) {
  try {
    const wrapper = btn.closest('.code-block-wrapper');
    const code = wrapper.querySelector('.code-block').textContent;
    await navigator.clipboard.writeText(code);

    btn.innerHTML = COPIED_ICON;
    btn.classList.add('copied');
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = COPY_ICON;
    }, 2000);
  } catch (err) {
    console.error('Errore nella copia:', err);
  }
}

async function copyAllScripts(btn) {
  try {
    const container = btn.closest('.scripts-group');

    // Check if there are groovy scripts
    const hasGroovy = container.querySelector('.language-groovy');
    let shouldConvert = false;

    if (hasGroovy) {
      shouldConvert = await showCustomConfirm('Vuoi convertire gli script Groovy in PL/SQL?');
    }

    const blocks = container.querySelectorAll('.code-block');
    let text = '';
    blocks.forEach((b) => {
      const wrapper = b.closest('.code-block-wrapper');
      if (wrapper && wrapper.parentElement) {
        const failMsg = wrapper.parentElement.querySelector('.text-red');
        if (failMsg) {
          text += failMsg.textContent.trim() + '\n';
        }
      }

      let content = b.textContent;
      if (shouldConvert && b.classList.contains('language-groovy')) {
        content = convertGroovyToPlSql(content);
      }

      text += content + '\n\n';
    });
    await navigator.clipboard.writeText(text);

    const originalText = btn.textContent;
    btn.textContent = '✅ Copiato!';
    setTimeout(() => (btn.textContent = originalText), 2000);
  } catch (err) {
    console.error('Errore nella copia massiva:', err);
  }
}

function triggerConfetti() {
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1001 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    // since particles fall down, start a bit higher than random
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
  }, 250);
}

function updateProgressBar() {
  if (!currentData || !currentData.grids) return;

  const container = document.getElementById('wizardProgressContainer');
  const fill = document.getElementById('progressBarFill');
  const text = document.getElementById('progressText');

  const total = currentData.grids.length;
  if (total === 0) {
    if (container) container.classList.add('hidden');
    return;
  }

  let completed = 0;
  currentData.grids.forEach((g) => {
    if (progressData[`grid-done-${g.name}`]) {
      completed++;
    }
  });

  const remaining = total - completed;
  const percent = Math.round((completed / total) * 100);

  if (container) {
    container.classList.remove('hidden');
    container.title = `${remaining} grid mancanti al completamento.`;
  }
  if (fill) fill.style.width = `${percent}%`;
  if (text) text.textContent = `${percent}%`;

  // Trigger confetti when 100% is reached for the first time
  if (percent === 100 && lastProgressPercent < 100) {
    triggerConfetti();
  }
  lastProgressPercent = percent; // Update last known percentage
}

function setGridDoneStatus(gridName, isDone) {
  progressData[`grid-done-${gridName}`] = isDone;

  const storageKey = `JBWT_PROGRESS_${currentFilename}`;
  localStorage.setItem(storageKey, JSON.stringify(progressData));

  const gridCard = document.getElementById(`grid-${gridName}`);
  const sidebarLi = document.querySelector(`.sidebar li[data-grid-name="${gridName}"]`);

  if (gridCard) {
    if (isDone) {
      gridCard.classList.add('grid-done', 'collapsed');
    } else {
      gridCard.classList.remove('grid-done', 'collapsed');
    }
    const checkbox = gridCard.querySelector('.grid-header input[type="checkbox"]');
    if (checkbox) {
      checkbox.checked = isDone;
    }
  }

  if (sidebarLi) {
    if (isDone) {
      sidebarLi.classList.add('grid-done');
    } else {
      sidebarLi.classList.remove('grid-done');
    }
  }

  updateProgressBar();
}

function completeAndGoToNext(currentGridName) {
  // 1. Mark current grid as complete
  setGridDoneStatus(currentGridName, true);

  // 2. Find the next incomplete grid
  const allGridNames = currentData.grids.map((g) => g.name);
  const currentIndex = allGridNames.indexOf(currentGridName);

  let nextGridName = null;

  // Search from current position to the end
  for (let i = currentIndex + 1; i < allGridNames.length; i++) {
    if (!progressData[`grid-done-${allGridNames[i]}`]) {
      nextGridName = allGridNames[i];
      break;
    }
  }

  // If not found, search from the beginning to the current position
  if (!nextGridName) {
    for (let i = 0; i < currentIndex; i++) {
      if (!progressData[`grid-done-${allGridNames[i]}`]) {
        nextGridName = allGridNames[i];
        break;
      }
    }
  }

  // 3. Switch to the next grid
  if (nextGridName) {
    selectGrid(nextGridName);
  } else {
    // All grids are complete
    alert('Complimenti! Hai completato tutte le grid.');
    toggleWizardMode();
  }
}

window.toggleGridDone = function (event, gridName) {
  event.stopPropagation();
  const isChecked = event.target.checked;
  setGridDoneStatus(gridName, isChecked);
};

function toggleGridSections(btn) {
  const card = btn.closest('.grid-card');
  const sections = card.querySelectorAll('.section-content');
  const icons = card.querySelectorAll('[data-icon]');

  // Determina lo stato: se la prima è aperta, chiudi tutto. Altrimenti apri tutto.
  const isFirstOpen = sections[0] && sections[0].classList.contains('open');
  const newState = !isFirstOpen;

  sections.forEach((sec) => {
    if (newState) sec.classList.add('open');
    else sec.classList.remove('open');
  });

  icons.forEach((icon) => {
    icon.textContent = newState ? '▼' : '▶';
  });

  btn.textContent = newState ? '📂 Collassa tutto' : '📂 Espandi tutto';
}

function loadProgress() {
  if (!currentFilename) return;
  lastProgressPercent = 0; // Reset for new file
  const storageKey = `JBWT_PROGRESS_${currentFilename}`;
  try {
    const data = localStorage.getItem(storageKey);
    progressData = data ? JSON.parse(data) : {};
  } catch (e) {
    console.error('Errore caricamento progressi:', e);
    progressData = {};
  }
}

window.toggleDone = function (event, key) {
  event.stopPropagation();
  const isChecked = event.target.checked;
  progressData[key] = isChecked;

  const storageKey = `JBWT_PROGRESS_${currentFilename}`;
  localStorage.setItem(storageKey, JSON.stringify(progressData));

  const section = event.target.closest('.section');
  if (section) {
    if (isChecked) section.classList.add('section-done');
    else section.classList.remove('section-done');
  }
};

window.toggleChecklist = function (event, key) {
  event.stopPropagation();
  const isChecked = event.target.checked;
  progressData[key] = isChecked;

  const storageKey = `JBWT_PROGRESS_${currentFilename}`;
  localStorage.setItem(storageKey, JSON.stringify(progressData));
};

window.onscroll = function () {
  const btn = document.getElementById('backToTop');
  if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
    btn.classList.add('visible');
  } else {
    btn.classList.remove('visible');
  }
};

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.togglePlSql = function (btn, id) {
  const codeBlock = document.getElementById(`${id}-code`);
  const rawTextarea = document.getElementById(`${id}-raw`);
  const isConverted = btn.classList.contains('active');

  if (!isConverted) {
    const groovyCode = rawTextarea.value;
    const plsqlCode = convertGroovyToPlSql(groovyCode);
    codeBlock.innerHTML = `<code class="language-sql">${escapeHtml(plsqlCode)}</code>`;
    btn.classList.add('active');
    btn.style.backgroundColor = '#dbeafe'; // Highlight button
  } else {
    codeBlock.innerHTML = `<code class="language-groovy">${escapeHtml(rawTextarea.value)}</code>`;
    btn.classList.remove('active');
    btn.style.backgroundColor = ''; // Reset button
  }

  // Rilancia Prism per evidenziare la sintassi
  if (window.Prism) {
    Prism.highlightElement(codeBlock.querySelector('code'));
  }
};

function toggleWizardMode() {
  isWizardMode = !isWizardMode;

  const wizardBtn = document.getElementById('wizardModeBtn');
  const content = document.getElementById('content');
  const wizardContent = document.getElementById('wizard-content');
  const sidebar = document.getElementById('sidebar');

  if (isWizardMode) {
    document.body.classList.add('wizard-active');
    wizardBtn.classList.add('active');
    content.classList.add('hidden');
    wizardContent.classList.remove('hidden');

    // Render wizard for the selected grid, or a placeholder
    renderWizard(selectedGridForWizard);
  } else {
    document.body.classList.remove('wizard-active');
    wizardBtn.classList.remove('active');
    content.classList.remove('hidden');
    wizardContent.classList.add('hidden');
    selectedGridForWizard = null; // Reset selected grid on exit
  }
}

function selectGrid(gridName) {
  if (isWizardMode) {
    selectedGridForWizard = gridName;
    renderWizard(gridName);

    // Highlight selected grid in sidebar
    document.querySelectorAll('.sidebar li').forEach((li) => li.classList.remove('active'));
    document.querySelector(`.sidebar li[data-grid-name="${gridName}"]`).classList.add('active');
  } else {
    // Default behavior: scroll to grid
    const gridElement = document.getElementById(`grid-${gridName}`);
    if (gridElement) {
      gridElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

function updateWizardNavigation(gridName) {
  if (!wizardProgress[gridName]) return;
  const visited = wizardProgress[gridName];

  // Appiattisci i substep per determinare l'ordine sequenziale
  const allSubsteps = [];
  wizardSteps.forEach((step) => {
    step.substeps.forEach((sub) => {
      allSubsteps.push({ stepId: step.id, substepId: sub.id });
    });
  });

  let canAccess = true; // Il primo è sempre accessibile

  allSubsteps.forEach((item) => {
    const subEl = document.querySelector(`.wizard-substep[data-substep-id="${item.substepId}"]`);

    // Aggiorna UI Substep
    if (subEl) {
      if (!isWizardProgressEnabled || canAccess || visited.has(item.substepId)) {
        subEl.classList.remove('disabled');
      } else {
        subEl.classList.add('disabled');
      }
    }

    // Aggiorna UI Step (se questo è il primo substep dello step)
    const stepObj = wizardSteps.find((s) => s.id === item.stepId);
    if (stepObj && stepObj.substeps[0].id === item.substepId) {
      const stepEl = document.querySelector(`.wizard-step[data-step-id="${item.stepId}"]`);
      if (stepEl) {
        if (!isWizardProgressEnabled || canAccess || visited.has(item.substepId)) {
          stepEl.classList.remove('disabled');
        } else {
          stepEl.classList.add('disabled');
        }
      }
    }

    // Se il corrente non è visitato, blocca i successivi
    if (isWizardProgressEnabled && !visited.has(item.substepId)) {
      canAccess = false;
    }
  });
}

function renderWizardContent(gridName, stepId, substepId) {
  const contentArea = document.querySelector('.wizard-content-area');
  if (!contentArea) return;

  const grid = currentData.grids.find((g) => g.name === gridName);
  const step = wizardSteps.find((s) => s.id === stepId);
  const substep = substepId ? step.substeps.find((s) => s.id === substepId) : null;

  if (!grid || !step || !substep) {
    contentArea.innerHTML = `<div class="grid-card"><p>Contenuto non disponibile.</p></div>`;
    return;
  }

  // Segna come visitato
  if (!wizardProgress[gridName]) wizardProgress[gridName] = new Set();
  wizardProgress[gridName].add(substepId);
  updateWizardNavigation(gridName);

  const contentHtml = substep.content(grid, currentData, progressData);

  contentArea.innerHTML = `
    <div class="grid-card">
        <div class="section-header" style="background: #fafafa; cursor: default; flex-direction: column; align-items: flex-start; gap: 5px; padding: 15px;">
            <div style="display: flex; gap: 10px; align-items: center; width: 100%;">
                <span style="font-weight: normal; color: #6b7280;">${step.title}</span>
                <span>&rsaquo;</span>
                <span style="font-weight: 600; color: #111827;">${substep.title}</span>
            </div>
            ${substep.description ? `<p class="text-sm text-gray" style="margin: 0; font-weight: normal;">${substep.description}</p>` : ''}
        </div>
        <div class="section-content open">
            ${
              substep.notaBene
                ? `<div class="description-box" style="margin-bottom: 20px; background: #fffbeb; border-color: #f59e0b;">
                    ${substep.notaBene}
                   </div>`
                : ''
            }
            <div class="wizard-substep-content">
                ${contentHtml || '<p class="text-gray">Contenuto da definire per questo sub-step.</p>'}
            </div>
        </div>
    </div>
  `;
  if (window.Prism) {
    Prism.highlightAllUnder(contentArea);
  }
}

function renderWizard(gridName) {
  const wizardContent = document.getElementById('wizard-content');
  if (!gridName || !currentData) {
    wizardContent.innerHTML = `<div class="grid-card"><div class="grid-header"><h2>Modalità Guidata</h2><p>Seleziona una grid dalla barra laterale di sinistra per iniziare l'implementazione guidata.</p></div></div>`;
    return;
  }

  const grid = currentData.grids.find((g) => g.name === gridName);
  if (!grid) {
    wizardContent.innerHTML = `<div class="grid-card"><div class="grid-header"><h2>Errore</h2><p>Grid non trovata: ${gridName}</p></div></div>`;
    return;
  }

  // Inizializza progresso se necessario
  if (!wizardProgress[gridName]) {
    wizardProgress[gridName] = new Set();
  }
  const visited = wizardProgress[gridName];

  // Calcola accessibilità iniziale per rendering HTML
  const allSubstepsIds = [];
  wizardSteps.forEach((s) => s.substeps.forEach((ss) => allSubstepsIds.push(ss.id)));
  const accessibleSubsteps = new Set();
  if (!isWizardProgressEnabled) {
    allSubstepsIds.forEach((id) => accessibleSubsteps.add(id));
  } else {
    accessibleSubsteps.add(allSubstepsIds[0]); // Il primo è sempre accessibile
    for (let i = 0; i < allSubstepsIds.length - 1; i++) {
      if (visited.has(allSubstepsIds[i])) {
        accessibleSubsteps.add(allSubstepsIds[i + 1]);
      }
    }
  }

  // Generate navigation HTML with split lists
  let stepsHtml = `<ul class="wizard-steps-list">`;
  let substepsHtml = ``;

  wizardSteps.forEach((step, stepIndex) => {
    const isActiveStep = stepIndex === 0;
    // Uno step è disabilitato se il suo primo substep non è accessibile
    const isStepDisabled = !accessibleSubsteps.has(step.substeps[0].id) && !visited.has(step.substeps[0].id);

    // Main Step
    stepsHtml += `
      <li class="wizard-step ${isActiveStep ? 'active' : ''} ${isStepDisabled ? 'disabled' : ''}" data-step-id="${step.id}">
        <a href="javascript:void(0)">${step.title}</a>
      </li>
    `;

    // Substeps List
    substepsHtml += `<ul class="wizard-substeps-list ${isActiveStep ? 'active' : ''}" data-parent-step-id="${step.id}">`;
    step.substeps.forEach((substep, substepIndex) => {
      const isSubDisabled = !accessibleSubsteps.has(substep.id) && !visited.has(substep.id);
      substepsHtml += `
          <li class="wizard-substep ${isActiveStep && substepIndex === 0 ? 'active' : ''} ${isSubDisabled ? 'disabled' : ''}" data-substep-id="${substep.id}">
            <a href="javascript:void(0)">${substep.title}</a>
          </li>`;
    });
    substepsHtml += `</ul>`;
  });
  stepsHtml += `</ul>`;

  // Set main wizard structure
  wizardContent.innerHTML = `
    <div class="wizard-container">
      <div class="wizard-header">
        <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h2 style="font-size: 1.5rem; color: #4f46e5; display: flex; align-items: center; gap: 10px; margin: 0 0 4px 0;">
                        <span>🪄</span> ${grid.name} ${grid.label ? `<span style="font-size: 1rem; color: #6b7280; font-weight: normal;">(${grid.label})</span>` : ''}
                    </h2>
                </div>
                <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                    ${grid.tab ? `<span class="badge badge-purple">Tab: ${grid.tab.label}</span>` : ''}
                    <span class="badge ${grid.insertAllowed === 'true' ? 'badge-green' : 'badge-red'}">Insert: ${grid.insertAllowed}</span>
                    <span class="badge ${grid.updateAllowed === 'true' ? 'badge-green' : 'badge-red'}">Update: ${grid.updateAllowed}</span>
                    <span class="badge ${grid.deleteAllowed === 'true' ? 'badge-green' : 'badge-red'}">Delete: ${grid.deleteAllowed}</span>
                    <button class="btn-primary" style="margin-left: 10px;" onclick="completeAndGoToNext('${grid.name}')">Completa e vai al prossimo &rarr;</button>
                </div>
            </div>
        </div>
        <nav class="wizard-main-nav">
            ${stepsHtml}
        </nav>
        <nav class="wizard-sub-nav">
            ${substepsHtml}
        </nav>
      </div>
      <div class="wizard-content-area"></div>
    </div>
  `;

  // Add event listeners
  const wizardHeader = wizardContent.querySelector('.wizard-header');
  if (wizardHeader) {
    wizardHeader.addEventListener('click', (e) => {
      const target = e.target.closest('a');
      if (!target) return;
      e.preventDefault();

      const substepLi = target.closest('.wizard-substep');
      const stepLi = target.closest('.wizard-step');

      if (substepLi) {
        // --- Click on a SUBSTEP ---
        if (substepLi.classList.contains('active')) return;
        if (substepLi.classList.contains('disabled')) return; // Blocco click se disabilitato

        const parentUl = substepLi.closest('.wizard-substeps-list');
        const stepId = parentUl.dataset.parentStepId;
        const substepId = substepLi.dataset.substepId;

        // Update substep classes
        const allSubsteps = Array.from(parentUl.querySelectorAll('.wizard-substep'));
        let activeFound = false;
        allSubsteps.forEach((s) => {
          s.classList.remove('active', 'completed');
          if (s === substepLi) {
            s.classList.add('active');
            activeFound = true;
          } else if (!activeFound) {
            s.classList.add('completed');
          }
        });

        renderWizardContent(gridName, stepId, substepId);
      } else if (stepLi) {
        // --- Click on a main STEP ---
        if (stepLi.classList.contains('active')) return;
        if (stepLi.classList.contains('disabled')) return; // Blocco click se disabilitato
        const stepId = stepLi.dataset.stepId;

        // Update step classes
        const allSteps = Array.from(wizardHeader.querySelectorAll('.wizard-step'));
        let activeFound = false;
        allSteps.forEach((s) => {
          s.classList.remove('active', 'completed');
          if (s === stepLi) {
            s.classList.add('active');
            activeFound = true;
          } else if (!activeFound) {
            s.classList.add('completed');
          }
        });

        // Toggle Substep Lists
        const allSubstepLists = wizardHeader.querySelectorAll('.wizard-substeps-list');
        let activeList = null;
        allSubstepLists.forEach((list) => {
          if (list.dataset.parentStepId === stepId) {
            list.classList.add('active');
            activeList = list;
          } else {
            list.classList.remove('active');
          }
        });

        if (activeList) {
          const firstSubstep = activeList.querySelector('.wizard-substep');
          if (firstSubstep) {
            activeList.querySelectorAll('.wizard-substep').forEach((s) => s.classList.remove('active', 'completed'));
            firstSubstep.classList.add('active');
            renderWizardContent(gridName, stepId, firstSubstep.dataset.substepId);
          } else {
            renderWizardContent(gridName, stepId, null); // No substeps
          }
        }
      }
    });
  }

  // Render initial content
  const firstStep = wizardSteps[0];
  if (firstStep && firstStep.substeps.length > 0) {
    renderWizardContent(gridName, firstStep.id, firstStep.substeps[0].id);
  }
}

function showInfoPopup(title, contentHtml, width = '800px') {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = width;
  modal.style.maxHeight = '90vh';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';

  const header = document.createElement('div');
  header.className = 'modal-header';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';

  const titleEl = document.createElement('h3');
  titleEl.className = 'modal-title';
  titleEl.textContent = title;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-modal';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = () => {
    document.body.removeChild(overlay);
  };

  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'modal-body';
  body.style.overflowY = 'auto';
  body.innerHTML = contentHtml;

  modal.appendChild(header);
  modal.appendChild(body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  if (window.Prism) {
    Prism.highlightAllUnder(body);
  }
}

window.showLovDetails = function (gridName, itemName, type) {
  if (!currentData) return;
  const grid = currentData.grids.find((g) => g.name === gridName);
  if (!grid) return;

  let item = null;
  let content = '';

  const notaBeneHtml = `
    <div class="description-box" style="margin-bottom: 20px; background: #fffbeb; border-color: #f59e0b;">
        <p class="text-sm">Se le LOV sono gestite sia sulla descrizione che sul codice, rioportare un unico campo su Apex in cui mostrare la concatenazione.</p>
        <p class="text-sm">Aggiungere una colonna display con la concatenazione del "codice - descrizione."</p>
        <p class="text-sm">Quando si filtra le lov si deve fare in questo modo:
        <ul style="margin-left: 20px; margin-top: 5px;" class="text-sm">
          <li>se page item --> CODICE = :PAGE_ITEM</li>
          <li>se colonna region --> CODICE = v('COLONNA_IG_CODICE')</li>
        </ul>
        </p>
    </div>`;

  if (type === 'lov') {
    content += notaBeneHtml;
    item = grid.listOfValues.find((l) => l.name === itemName);
    if (item) {
      if (item.value) {
        content += `<h4 class="info-label mb-2">Query</h4>`;
        content += renderCodeBlock(item.value, `popup-lov-${itemName}`, 'sql');
      }
      if (item.initOrderBy) {
        content += `<div class="order-by-box mt-3"><span class="info-label">Order By:</span> <code>${item.initOrderBy}</code></div>`;
      }
    }
  } else if (type === 'combo') {
    item = grid.comboboxes.find((c) => c.name === itemName);
    if (item) {
      if (item.sqlValue) {
        content += `<h4 class="info-label mb-2">Query</h4>`;
        content += renderCodeBlock(item.sqlValue, `popup-combo-${itemName}`, 'sql');
      } else if (item.rows && item.rows.length > 0) {
        content += `<table class="table"><thead><tr><th>ID</th><th>Label</th></tr></thead><tbody>`;
        item.rows.forEach((r) => {
          content += `<tr><td>${r.id}</td><td>${r.label}</td></tr>`;
        });
        content += `</tbody></table>`;
      }
    }
  }

  if (item) {
    showInfoPopup(`${type === 'lov' ? 'LOV' : 'Combobox'}: ${item.name} (${item.label || ''})`, content || '<p>Nessuna informazione disponibile.</p>');
  }
};
