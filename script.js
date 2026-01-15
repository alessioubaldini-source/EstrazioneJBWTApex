let expandedSections = {};
let currentData = null; // Variabile globale per memorizzare i dati per l'export

// Icona SVG per "copia" (due fogli)
const COPY_ICON = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
  `;

// Icona SVG per "copiato" (check)
const COPIED_ICON = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
  `;

function getDirectChild(element, tagName) {
  return Array.from(element.children).find((el) => el.nodeName === tagName);
}

async function loadDefaultXML() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');

  try {
    loadingEl.classList.remove('hidden');
    if (window.fs && window.fs.readFile) {
      try {
        const response = await window.fs.readFile('AUTG0006.xml', { encoding: 'utf8' });
        const data = parseXML(response);
        renderData(data);
      } catch (e) {
        console.log('File di default non trovato, attesa upload utente');
      }
    }
    loadingEl.classList.add('hidden');
  } catch (err) {
    loadingEl.classList.add('hidden');
  }
}

document.getElementById('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const errorEl = document.getElementById('error');
  errorEl.classList.add('hidden');

  try {
    const text = await file.text();
    const data = parseXML(text);
    renderData(data);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  }
});

function parseXML(xmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  if (xmlDoc.querySelector('parsererror')) {
    throw new Error('Errore nel parsing XML');
  }

  const actionsMap = extractAllActions(xmlDoc);
  const result = {
    grids: [],
    popups: [],
    description: null,
    whenNewFormInstance: [],
    whenNewFormInstanceGroovy: [],
  };

  const commentMatch = xmlText.match(/<!--[\s\S]*?Descrizione\.+:\s*(.+?)\s*-->/);
  if (commentMatch && commentMatch[1]) {
    result.description = commentMatch[1].trim();
  }

  const formWhenNew = xmlDoc.querySelector('form > events > whenNewFormInstance');
  if (formWhenNew) {
    const actionRef = formWhenNew.getAttribute('actionRef');
    if (actionRef) {
      result.whenNewFormInstance = actionRef.split(',').map((a) => a.trim());
      result.whenNewFormInstanceGroovy = concatenateGroovyScripts(result.whenNewFormInstance, actionsMap);
    }
  }

  const popups = xmlDoc.querySelectorAll('form > popups > popup');
  popups.forEach((popup) => {
    let callFormName = null;
    const params = [];

    const callFormPopup = popup.getElementsByTagName('callFormPopup')[0];
    if (callFormPopup) {
      const nameNode = callFormPopup.getElementsByTagName('callFormName')[0];
      if (nameNode) callFormName = nameNode.textContent.trim();

      const paramsList = callFormPopup.getElementsByTagName('paramsList')[0];
      if (paramsList) {
        const paramNodes = paramsList.querySelectorAll('param');
        paramNodes.forEach((p) => {
          params.push({
            name: p.getAttribute('name'),
            alias: p.getAttribute('alias'),
          });
        });
      }
    }

    const popupData = {
      name: popup.getAttribute('name'),
      title: popup.getAttribute('title'),
      width: popup.getAttribute('width'),
      height: popup.getAttribute('height'),
      callFormName: callFormName,
      params: params,
      grids: [],
    };
    const popupGrids = popup.querySelectorAll('grids > grid');
    popupGrids.forEach((g) => {
      popupData.grids.push(g.getAttribute('name'));
    });
    result.popups.push(popupData);
  });

  const grids = xmlDoc.querySelectorAll('grid');
  grids.forEach((grid) => {
    const insertAttr = grid.getAttribute('insertAllowed');
    const updateAttr = grid.getAttribute('updateAllowed');
    const deleteAttr = grid.getAttribute('deleteAllowed');

    let parsedCheckAndSaveData = null;
    const checkAndSave = grid.querySelector('action[name="save"] class[class="CheckAndSaveData"]');
    if (checkAndSave) {
      parsedCheckAndSaveData = { insert: [], update: [], delete: [] };
      ['insert', 'update', 'delete'].forEach((op) => {
        const lists = checkAndSave.querySelectorAll(`list[name="${op}"] > value`);
        lists.forEach((val) => {
          parsedCheckAndSaveData[op].push(val.textContent.trim());
        });
      });
    }

    const gridData = {
      name: grid.getAttribute('name'),
      label: grid.getAttribute('label'),
      type: grid.getAttribute('type'),
      ref: grid.getAttribute('ref'),
      insertAllowed: insertAttr !== null ? insertAttr : parsedCheckAndSaveData && parsedCheckAndSaveData.insert.length > 0 ? 'true' : 'false',
      updateAllowed: updateAttr !== null ? updateAttr : parsedCheckAndSaveData && parsedCheckAndSaveData.update.length > 0 ? 'true' : 'false',
      deleteAllowed: deleteAttr !== null ? deleteAttr : parsedCheckAndSaveData && parsedCheckAndSaveData.delete.length > 0 ? 'true' : 'false',
      tab: findParentTab(grid),
      rpcExpand: null,
      rpcExpandInitOrderBy: null,
      rpcExpandInit: null,
      listOfValues: [],
      comboboxes: [],
      checkAndSaveData: parsedCheckAndSaveData,
      beforeCommitValidation: [],
      events: [],
      bottomToolbarButtons: [],
      templates: {},
    };

    const filterNode = getDirectChild(grid, 'filter');
    if (filterNode) {
      const templatesNode = getDirectChild(filterNode, 'templates');
      if (templatesNode) {
        Array.from(templatesNode.children).forEach((t) => {
          if (t.nodeName === 'template') {
            const tName = t.getAttribute('name');
            if (tName) gridData.templates[tName] = t.textContent.trim();
          }
        });
      }
    }
    const directTemplates = getDirectChild(grid, 'templates');
    if (directTemplates) {
      Array.from(directTemplates.children).forEach((t) => {
        if (t.nodeName === 'template') {
          const tName = t.getAttribute('name');
          if (tName) gridData.templates[tName] = t.textContent.trim();
        }
      });
    }

    const rpcExpandTag = getDirectChild(grid, 'rpcExpand');
    if (rpcExpandTag) {
      const rpcExpandValue = rpcExpandTag.querySelector('paginatedExpand > value') || rpcExpandTag.querySelector('expand > value') || rpcExpandTag.querySelector('value');

      if (rpcExpandValue) {
        gridData.rpcExpand = rpcExpandValue.textContent.trim();
      }

      const initOrderBy = rpcExpandTag.querySelector('paginatedExpand > initOrderBy');
      if (initOrderBy) {
        gridData.rpcExpandInitOrderBy = initOrderBy.textContent.trim();
      }
    }

    const rpcExpandInitTag = getDirectChild(grid, 'rpcExpandInit');
    if (rpcExpandInitTag) {
      const rpcExpandInitValue = rpcExpandInitTag.querySelector('expand > value');
      if (rpcExpandInitValue) {
        gridData.rpcExpandInit = rpcExpandInitValue.textContent.trim();
      }
    }

    // Estrazione Eventi Grid
    gridData.events = extractEventsFromNode(grid, actionsMap);

    // Estrazione Eventi Fields (es. whenFinishEditValue)
    const allFields = grid.querySelectorAll('fields > *');
    allFields.forEach((field) => {
      const fName = field.getAttribute('name');
      const fEvents = extractEventsFromNode(field, actionsMap, fName);
      gridData.events.push(...fEvents);
    });

    const lovs = grid.querySelectorAll('fields > listOfValue');
    lovs.forEach((lov) => {
      const lovData = {
        name: lov.getAttribute('name'),
        label: lov.getAttribute('label'),
        value: null,
        initOrderBy: null,
      };
      const lovValue = lov.querySelector('rpcExpand > paginatedExpand > value, rpcExpand > expand > value');
      if (lovValue) {
        lovData.value = lovValue.textContent.trim();
      }
      const lovInitOrderBy = lov.querySelector('rpcExpand > paginatedExpand > initOrderBy');
      if (lovInitOrderBy) {
        lovData.initOrderBy = lovInitOrderBy.textContent.trim();
      }
      gridData.listOfValues.push(lovData);
    });

    const combos = grid.querySelectorAll('fields > combobox, filter > fields > combobox');
    combos.forEach((combo) => {
      const comboData = {
        name: combo.getAttribute('name'),
        label: combo.getAttribute('label'),
        rows: [],
        sqlValue: null,
      };

      const rows = combo.querySelectorAll('rpcExpand > resultset > row');
      if (rows.length > 0) {
        rows.forEach((row) => {
          const id = row.querySelector('id')?.textContent || '';
          const label = row.querySelector('label')?.textContent || '';
          comboData.rows.push({ id, label });
        });
      }

      const sqlValue = combo.querySelector('rpcExpand > expand > value');
      if (sqlValue) {
        comboData.sqlValue = sqlValue.textContent.trim();
      }

      gridData.comboboxes.push(comboData);
    });

    const beforeCommit = grid.querySelectorAll('beforeCommitValidation');
    beforeCommit.forEach((bc) => {
      gridData.beforeCommitValidation.push({
        name: bc.getAttribute('name'),
        sql: bc.querySelector('param[name="sql"]')?.textContent.trim() || '',
        function: bc.querySelector('param[name="function"]')?.textContent.trim() || '',
        failMessage: bc.querySelector('param[name="failMessage"]')?.textContent.trim() || '',
      });
    });

    const bottomToolbar = getDirectChild(grid, 'bottomToolbar');
    if (bottomToolbar) {
      const buttons = bottomToolbar.querySelectorAll('button, callFormButton');
      buttons.forEach((btn) => {
        let actionRefs = [];
        const whenPressed = btn.querySelector('events > whenButtonPressed');
        if (whenPressed) {
          const actionRefAttr = whenPressed.getAttribute('actionRef');
          if (actionRefAttr) {
            actionRefs = actionRefAttr.split(',').map((a) => a.trim());
          }
        }

        let type = btn.tagName;
        let callFormName = '';
        if (type === 'callFormButton') {
          const callFormNode = btn.querySelector('callFormName');
          if (callFormNode) callFormName = callFormNode.textContent;
        }

        const params = [];
        const paramsList = btn.querySelector('paramsList');
        if (paramsList) {
          const paramNodes = paramsList.querySelectorAll('param');
          paramNodes.forEach((p) => {
            params.push({
              name: p.getAttribute('name'),
              alias: p.getAttribute('alias'),
            });
          });
        }

        gridData.bottomToolbarButtons.push({
          type: type,
          name: btn.getAttribute('name'),
          label: btn.getAttribute('label') || btn.getAttribute('hint'),
          order: btn.getAttribute('order'),
          callFormName: callFormName,
          actionRef: actionRefs,
          params: params,
          groovyScripts: concatenateGroovyScripts(actionRefs, actionsMap),
        });
      });
    }

    result.grids.push(gridData);
  });

  return result;
}

function extractEventsFromNode(node, actionsMap, context = null) {
  const events = [];
  const eventsNode = getDirectChild(node, 'events');
  if (eventsNode) {
    Array.from(eventsNode.children).forEach((evt) => {
      const evtName = evt.nodeName;
      const actionRefAttr = evt.getAttribute('actionRef');
      const waitingWindow = evt.getAttribute('waitingWindow');

      let actionRefs = [];
      if (actionRefAttr) {
        actionRefs = actionRefAttr.split(',').map((a) => a.trim());
      }

      events.push({
        name: evtName,
        waitingWindow: waitingWindow,
        actionRefs: actionRefs,
        groovyScripts: concatenateGroovyScripts(actionRefs, actionsMap),
        context: context, // Nome del campo se è un evento di campo
      });
    });
  }
  return events;
}

function extractAllActions(xmlDoc) {
  const actionsMap = {};
  const actions = xmlDoc.querySelectorAll('action');

  actions.forEach((action) => {
    const actionName = action.getAttribute('name');
    if (!actionName) return;

    const actionData = { classes: [] };
    const groovyClasses = action.querySelectorAll('classes > class');

    groovyClasses.forEach((groovyClass) => {
      const className = groovyClass.getAttribute('name');
      const classType = groovyClass.getAttribute('class');
      const failMessage = groovyClass.querySelector('param[name="failMessage"]')?.textContent.trim() || null;

      const groovyParam = groovyClass.querySelector('param[name="groovy"]');
      if (groovyParam) {
        actionData.classes.push({
          type: 'groovy',
          className: className,
          classType: classType,
          failMessage: failMessage,
          script: groovyParam.textContent.trim(),
        });
      }

      const sqlParam = groovyClass.querySelector('param[name="sql"]');
      if (sqlParam) {
        actionData.classes.push({
          type: 'sql',
          className: className,
          classType: classType,
          failMessage: failMessage,
          sql: sqlParam.textContent.trim(),
          function: groovyClass.querySelector('param[name="function"]')?.textContent.trim() || '',
        });
      }
    });

    if (actionData.classes.length > 0) {
      actionsMap[actionName] = actionData;
    }
  });
  return actionsMap;
}

function replaceTemplates(code, templatesMap) {
  if (!code || !templatesMap) return code;
  let result = code;
  const placeholders = code.match(/@([^@]+)@/g);
  if (placeholders) {
    placeholders.forEach((placeholder) => {
      const templateName = placeholder.replace(/@/g, '');
      if (templatesMap[templateName]) {
        result = result.replace(placeholder, `\n/* Template: ${templateName} */\n${templatesMap[templateName]}\n/* End Template */\n`);
      }
    });
  }
  return result;
}

function findParentTab(gridElement) {
  let parent = gridElement.parentElement;
  while (parent && parent.nodeName !== 'form') {
    if (parent.nodeName === 'tab') {
      return {
        name: parent.getAttribute('name'),
        label: parent.getAttribute('label'),
        order: parent.getAttribute('order'),
      };
    }
    parent = parent.parentElement;
  }
  return null;
}

function concatenateGroovyScripts(actionRefs, actionsMap) {
  if (!actionRefs || actionRefs.length === 0) return [];
  const concatenated = [];
  actionRefs.forEach((actionRef) => {
    if (actionsMap[actionRef]) {
      concatenated.push({
        actionName: actionRef,
        classes: actionsMap[actionRef].classes || [],
      });
    }
  });
  return concatenated;
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
      text += b.textContent + '\n\n';
    });
    await navigator.clipboard.writeText(text);

    const originalText = btn.textContent;
    btn.textContent = '✅ Copiato!';
    setTimeout(() => (btn.textContent = originalText), 2000);
  } catch (err) {
    console.error('Errore nella copia massiva:', err);
  }
}

function renderData(data) {
  currentData = data; // Salva i dati globalmente
  document.getElementById('searchInput').disabled = false;
  document.getElementById('downloadBtn').disabled = false;
  document.getElementById('downloadWordBtn').disabled = false;

  const content = document.getElementById('content');
  const sidebar = document.getElementById('sidebar');
  let html = '';

  if (data.description) {
    html += `
              <div class="description-box">
                  <h2>Descrizione Form</h2>
                  <p>${data.description}</p>
              </div>
          `;
  }

  if (data.popups && data.popups.length > 0) {
    html += renderSection(
      'Popups',
      'popups-section',
      data.popups.length,
      `
              <div class="grid-card">
                  ${data.popups
                    .map(
                      (popup) => `
                      <div class="popup-card">
                          <h3 class="info-label text-lg mb-2" style="font-size: 1.125rem; color: #c2410c;">${popup.name}</h3>
                          <p class="text-sm mb-1"><span class="info-label">Title:</span> ${popup.title || 'N/A'}</p>
                          ${popup.callFormName ? `<p class="text-sm mb-1"><span class="info-label">CallForm:</span> ${popup.callFormName}</p>` : ''}
                          ${
                            popup.params && popup.params.length > 0
                              ? `<div class="params-box" style="margin-top: 8px; margin-bottom: 8px;">
                                  <p class="text-sm info-label">Parametri:</p>
                                  <table class="table">
                                      <thead>
                                          <tr>
                                              <th>Name</th>
                                              <th>Alias</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          ${popup.params.map((p) => `<tr><td>${escapeHtml(p.name || '')}</td><td>${escapeHtml(p.alias || '')}</td></tr>`).join('')}
                                      </tbody>
                                  </table>
                               </div>`
                              : ''
                          }
                          <p class="text-sm mb-1"><span class="info-label">Dimensioni:</span> ${popup.width} x ${popup.height}</p>
                          <p class="text-sm mb-1">
                              <span class="info-label">Grids:</span> 
                              ${popup.grids.length > 0 ? popup.grids.map((g) => `<span class="badge badge-orange text-xs">${g}</span>`).join(' ') : 'Nessuno'}
                          </p>
                      </div>
                  `
                    )
                    .join('')}
              </div>
          `
    );
  }

  if (data.whenNewFormInstance.length > 0) {
    html += renderSection(
      'When New Form Instance',
      'form-whenNew',
      data.whenNewFormInstance.length,
      `
              <p class="text-sm mb-2"><span class="info-label">Actions:</span> ${data.whenNewFormInstance.join(', ')}</p>
              ${renderGroovyScripts(data.whenNewFormInstanceGroovy, 'form')}
          `
    );
  }

  // Inizializza HTML Sidebar
  let sidebarHtml = '<h3>📌 Indice Grids</h3><ul>';

  data.grids.forEach((grid, idx) => {
    const hasTemplates = Object.keys(grid.templates).length > 0;

    // Raggruppamento Eventi
    const evAbilitazioni = grid.events.filter((e) => ['whennewforminstance', 'whennewrecordinstance', 'whenrecordfetched'].includes(e.name.toLowerCase()));

    const evControlli = grid.events.filter((e) => ['whenexitchangedrecord', 'whenfinisheditvalue'].includes(e.name.toLowerCase()));

    const evAltri = grid.events.filter((e) => !evAbilitazioni.includes(e) && !evControlli.includes(e));

    // Determina posizione (Tab o Popup)
    let locationInfo = '';
    if (grid.tab) {
      locationInfo = `<div class="sidebar-grid-location is-tab">Tab: ${grid.tab.label || grid.tab.name}</div>`;
    } else {
      const popup = data.popups.find((p) => p.grids.includes(grid.name));
      if (popup) {
        locationInfo = `<div class="sidebar-grid-location is-popup">Popup: ${popup.name}</div>`;
      }
    }

    // Crea badges riepilogativi per la sidebar
    let summaryBadgesHtml = '';
    const summaryItems = [];
    if (evAbilitazioni.length > 0) {
      summaryItems.push(`<span class="summary-badge sb-abil" title="Abilitazioni">Abil (${evAbilitazioni.length})</span>`);
    }
    if (evControlli.length > 0) {
      summaryItems.push(`<span class="summary-badge sb-ctrl" title="Controlli">Ctrl (${evControlli.length})</span>`);
    }
    if (grid.listOfValues.length > 0) {
      summaryItems.push(`<span class="summary-badge sb-lov" title="List Of Values">LOV (${grid.listOfValues.length})</span>`);
    }
    if (grid.comboboxes.length > 0) {
      summaryItems.push(`<span class="summary-badge sb-combo" title="Combobox">Combo (${grid.comboboxes.length})</span>`);
    }

    if (summaryItems.length > 0) {
      summaryBadgesHtml = `<div class="sidebar-summary">${summaryItems.join('')}</div>`;
    }

    // Aggiungi voce alla sidebar
    sidebarHtml += `<li><a href="#grid-${grid.name}"><div>📄 ${grid.name} ${grid.label ? `<span class="text-xs text-gray">(${grid.label})</span>` : ''}</div>${locationInfo}${summaryBadgesHtml}</a></li>`;

    html += `
              <div class="grid-card" id="grid-${grid.name}" data-grid-name="${grid.name.toLowerCase()}">
                  <div class="grid-header">
                      <h2>Grid: ${grid.name}</h2>
                      ${grid.label ? `<p class="text-sm text-gray"><span class="info-label">Label:</span> ${grid.label}</p>` : ''}
                      <div class="badge-container">
                          ${grid.tab ? `<span class="badge badge-purple"><span class="info-label">Tab:</span> ${grid.tab.label} (${grid.tab.name})</span>` : ''}
                          ${grid.type ? `<span class="badge badge-blue"><span class="info-label">Type:</span> ${grid.type}</span>` : ''}
                          ${grid.ref ? `<span class="badge badge-gray"><span class="info-label">Ref:</span> ${grid.ref}</span>` : ''}
                          <span class="badge ${grid.insertAllowed === 'true' ? 'badge-green' : 'badge-red'}"><span class="info-label">Insert:</span> ${grid.insertAllowed}</span>
                          <span class="badge ${grid.updateAllowed === 'true' ? 'badge-green' : 'badge-red'}"><span class="info-label">Update:</span> ${grid.updateAllowed}</span>
                          <span class="badge ${grid.deleteAllowed === 'true' ? 'badge-green' : 'badge-red'}"><span class="info-label">Delete:</span> ${grid.deleteAllowed}</span>
                      </div>
                      <button class="toggle-all-btn" onclick="toggleGridSections(this)">📂 Espandi tutto</button>
                  </div>

                  ${renderSection(
                    'Templates',
                    `tpl-${idx}`,
                    Object.keys(grid.templates).length,
                    hasTemplates
                      ? Object.keys(grid.templates)
                          .map(
                            (tplName, tplIdx) => `
                          <div class="mb-3">
                              <h4 class="info-label text-sm" style="color: #059669;">${tplName}</h4>
                              ${renderCodeBlock(grid.templates[tplName], `tpl-${idx}-${tplIdx}`)}
                          </div>
                      `
                          )
                          .join('')
                      : '<p class="text-gray">Nessun template definito</p>'
                  )}

                  ${renderSection(
                    'RPC Expand',
                    `rpc-${idx}`,
                    grid.rpcExpand ? 1 : 0,
                    grid.rpcExpand
                      ? `
                          ${renderCodeBlock(grid.rpcExpand, `rpc-${idx}`)}
                          ${
                            grid.rpcExpandInitOrderBy
                              ? `
                              <div class="order-by-box">
                                  <p class="text-sm info-label">Init Order By:</p>
                                  <code>${grid.rpcExpandInitOrderBy}</code>
                              </div>
                          `
                              : ''
                          }
                      `
                      : '<p class="text-gray">Non presente</p>'
                  )}

                  ${renderSection('RPC Expand Init', `rpcinit-${idx}`, grid.rpcExpandInit ? 1 : 0, grid.rpcExpandInit ? renderCodeBlock(grid.rpcExpandInit, `rpcinit-${idx}`) : '<p class="text-gray">Non presente</p>')}

                  ${renderSection(
                    'List Of Values',
                    `lov-${idx}`,
                    grid.listOfValues.length,
                    grid.listOfValues.length > 0
                      ? grid.listOfValues
                          .map(
                            (lov, lovIdx) => `
                          <div class="mb-3">
                              <h4 class="info-label">${lov.name}${lov.label ? ` - ${lov.label}` : ''}</h4>
                              ${
                                lov.value
                                  ? `
                                  ${renderCodeBlock(lov.value, `lov-${idx}-${lovIdx}`)}
                                  ${
                                    lov.initOrderBy
                                      ? `
                                      <div class="order-by-box green">
                                          <p class="text-sm info-label">Init Order By:</p>
                                          <code>${lov.initOrderBy}</code>
                                      </div>
                                  `
                                      : ''
                                  }
                              `
                                  : ''
                              }
                          </div>
                      `
                          )
                          .join('')
                      : '<p class="text-gray">Nessuno presente</p>'
                  )}

                  ${renderSection(
                    'Combobox',
                    `combo-${idx}`,
                    grid.comboboxes.length,
                    grid.comboboxes.length > 0
                      ? grid.comboboxes
                          .map(
                            (combo, comboIdx) => `
                          <div class="mb-3">
                              <h4 class="info-label">${combo.name}${combo.label ? ` - ${combo.label}` : ''}</h4>
                              ${
                                combo.rows.length > 0
                                  ? `
                                  <table class="table">
                                      <thead>
                                          <tr>
                                              <th>ID</th>
                                              <th>Label</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          ${combo.rows
                                            .map(
                                              (row) => `
                                              <tr>
                                                  <td>${escapeHtml(row.id)}</td>
                                                  <td>${escapeHtml(row.label)}</td>
                                              </tr>
                                          `
                                            )
                                            .join('')}
                                      </tbody>
                                  </table>
                              `
                                  : ''
                              }
                              ${combo.sqlValue ? renderCodeBlock(combo.sqlValue, `combo-${idx}-${comboIdx}`) : ''}
                          </div>
                      `
                          )
                          .join('')
                      : '<p class="text-gray">Nessuno presente</p>'
                  )}

                  ${renderSection(
                    'CheckAndSaveData',
                    `check-${idx}`,
                    grid.checkAndSaveData ? 1 : 0,
                    grid.checkAndSaveData
                      ? `
                          ${['insert', 'update', 'delete']
                            .map((op) =>
                              grid.checkAndSaveData[op].length > 0
                                ? `
                                  <div class="mb-3">
                                      <h4 class="info-label" style="text-transform: capitalize;">${op}</h4>
                                      ${grid.checkAndSaveData[op].map((sql, sqlIdx) => renderCodeBlock(sql, `check-${idx}-${op}-${sqlIdx}`)).join('')}
                                  </div>
                              `
                                : ''
                            )
                            .join('')}
                      `
                      : '<p class="text-gray">Non presente</p>'
                  )}

                  ${renderSection(
                    'Before Commit Validation',
                    `before-${idx}`,
                    grid.beforeCommitValidation.length,
                    grid.beforeCommitValidation.length > 0
                      ? grid.beforeCommitValidation
                          .map(
                            (bc, bcIdx) => `
                          <div class="mb-3">
                              <h4 class="info-label">${bc.name}</h4>
                              <p class="text-xs mb-1"><span class="info-label">Function:</span> ${bc.function}</p>
                              <p class="text-xs mb-2"><span class="info-label">Fail Message:</span> ${bc.failMessage}</p>
                              ${renderCodeBlock(bc.sql, `before-${idx}-${bcIdx}`)}
                          </div>
                      `
                          )
                          .join('')
                      : '<p class="text-gray">Non presente</p>'
                  )}

                  ${renderSection(
                    'Abilitazioni',
                    `events-abil-${idx}`,
                    evAbilitazioni.length,
                    evAbilitazioni.length > 0 ? evAbilitazioni.map((evt, eIdx) => renderEventBlock(evt, idx, `abil-${eIdx}`)).join('') : '<p class="text-gray">Nessun evento di abilitazione</p>'
                  )}

                  ${renderSection('Controlli', `events-ctrl-${idx}`, evControlli.length, evControlli.length > 0 ? evControlli.map((evt, eIdx) => renderEventBlock(evt, idx, `ctrl-${eIdx}`)).join('') : '<p class="text-gray">Nessun controllo</p>')}

                  ${renderSection('Altri Eventi', `events-other-${idx}`, evAltri.length, evAltri.length > 0 ? evAltri.map((evt, eIdx) => renderEventBlock(evt, idx, `other-${eIdx}`)).join('') : '<p class="text-gray">Nessun altro evento</p>')}

                  ${renderSection(
                    'Bottom Toolbar Buttons',
                    `buttons-${idx}`,
                    grid.bottomToolbarButtons.length,
                    grid.bottomToolbarButtons.length > 0
                      ? grid.bottomToolbarButtons
                          .map(
                            (btn, btnIdx) => `
                          <div class="mb-3" style="border-bottom: 1px solid #e5e7eb; padding-bottom: 12px;">
                              <p class="text-sm mb-1"><span class="badge badge-blue text-xs">${btn.type}</span></p>
                              <p class="text-sm mb-1"><span class="info-label">Name:</span> ${btn.name}</p>
                              <p class="text-sm mb-1"><span class="info-label">Label:</span> ${btn.label}</p>
                              <p class="text-sm mb-1"><span class="info-label">Order:</span> ${btn.order}</p>
                              ${btn.callFormName ? `<p class="text-sm mb-1"><span class="info-label">CallForm:</span> ${btn.callFormName}</p>` : ''}
                              ${
                                btn.params && btn.params.length > 0
                                  ? `<div class="params-box" style="margin-top: 8px; margin-bottom: 8px;">
                                      <p class="text-sm info-label">Parametri:</p>
                                      <table class="table">
                                          <thead>
                                              <tr>
                                                  <th>Name</th>
                                                  <th>Alias</th>
                                              </tr>
                                          </thead>
                                          <tbody>
                                              ${btn.params.map((p) => `<tr><td>${escapeHtml(p.name || '')}</td><td>${escapeHtml(p.alias || '')}</td></tr>`).join('')}
                                          </tbody>
                                      </table>
                                   </div>`
                                  : ''
                              }
                              <p class="text-sm mb-2"><span class="info-label">ActionRef:</span> ${btn.actionRef.join(', ') || 'Nessuno'}</p>
                              
                              ${
                                btn.groovyScripts.length > 0
                                  ? `
                                  <div style="margin-top: 12px;">
                                      <p class="text-sm info-label" style="color: #4f46e5;">Script Actions:</p>
                                      ${renderGroovyScripts(btn.groovyScripts, `btn-groovy-${idx}-${btnIdx}`)}
                                  </div>
                              `
                                  : ''
                              }
                          </div>
                      `
                          )
                          .join('')
                      : '<p class="text-gray">Nessuno presente</p>'
                  )}
              </div>
          `;
  });

  content.innerHTML = html;

  // Render Sidebar
  sidebarHtml += '</ul>';
  sidebar.innerHTML = sidebarHtml;
  sidebar.classList.remove('hidden');

  // Attiva Syntax Highlighting
  if (window.Prism) {
    Prism.highlightAll();
  }
}

// Funzione di ricerca
document.getElementById('searchInput').addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  const grids = document.querySelectorAll('.grid-card[data-grid-name]');

  grids.forEach((card) => {
    const name = card.getAttribute('data-grid-name');
    if (name.includes(term)) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
});

// Funzione Toggle Sezioni Grid
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

// Funzione Export Excel
function downloadExcel() {
  if (!currentData) return;

  const wb = XLSX.utils.book_new();

  // Helper per applicare lo stile bold (funziona se la libreria supporta lo styling)
  const setBoldHeaders = (ws, data) => {
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      // Applica bold se la riga sembra un header (tutto maiuscolo o prima riga di sezione)
      const firstCell = ws[XLSX.utils.encode_cell({ r: R, c: 0 })];
      if (firstCell && firstCell.v && typeof firstCell.v === 'string' && (firstCell.v === firstCell.v.toUpperCase() || data[R][0] === 'Name' || data[R][0] === 'Type')) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellRef]) continue;
          if (!ws[cellRef].s) ws[cellRef].s = {};
          ws[cellRef].s.font = { bold: true };
        }
      }
    }
  };

  // 1. Foglio WNFI (When New Form Instance)
  if (currentData.whenNewFormInstance.length > 0) {
    const wnfiRows = [];
    wnfiRows.push(['WHEN NEW FORM INSTANCE']);
    wnfiRows.push(['Action Refs', currentData.whenNewFormInstance.join(', ')]);
    wnfiRows.push([]);

    if (currentData.whenNewFormInstanceGroovy.length > 0) {
      wnfiRows.push(['SCRIPTS']);
      wnfiRows.push(['Action', 'Type', 'Class', 'Fail Msg', 'Code']);
      currentData.whenNewFormInstanceGroovy.forEach((action) => {
        action.classes.forEach((item) => {
          if (item.type === 'groovy') {
            wnfiRows.push([action.actionName, 'Groovy', item.className, item.failMessage || '', item.script]);
          } else if (item.type === 'sql') {
            wnfiRows.push([action.actionName, 'SQL', item.className, item.failMessage || '', item.sql]);
          }
        });
      });
    }

    const wsWNFI = XLSX.utils.aoa_to_sheet(wnfiRows);
    wsWNFI['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 80 }];
    setBoldHeaders(wsWNFI, wnfiRows);
    XLSX.utils.book_append_sheet(wb, wsWNFI, 'WNFI');
  }

  // 2. Fogli per ogni Grid
  currentData.grids.forEach((grid) => {
    const rows = [];

    // Header Info
    rows.push(['GRID INFO']);
    rows.push(['Name', grid.name]);
    rows.push(['Type', grid.type || '']);
    rows.push(['Label', grid.label]);
    rows.push(['Tab', grid.tab ? `${grid.tab.label} (${grid.tab.name})` : '']);
    rows.push(['Permissions', `I:${grid.insertAllowed} U:${grid.updateAllowed} D:${grid.deleteAllowed}`]);
    rows.push([]); // Spacer

    // Templates
    if (Object.keys(grid.templates).length > 0) {
      rows.push(['TEMPLATES']);
      rows.push(['Name', 'Code']);
      Object.entries(grid.templates).forEach(([name, code]) => {
        rows.push([name, code]);
      });
      rows.push([]);
    }

    // RPC Expand
    if (grid.rpcExpand) {
      rows.push(['RPC EXPAND']);
      rows.push(['Code', grid.rpcExpand]);
      if (grid.rpcExpandInitOrderBy) rows.push(['Init Order By', grid.rpcExpandInitOrderBy]);
      rows.push([]);
    }

    // LOVs
    if (grid.listOfValues.length > 0) {
      rows.push(['LIST OF VALUES']);
      rows.push(['Name', 'Label', 'Value (SQL)', 'Init Order By']);
      grid.listOfValues.forEach((lov) => {
        rows.push([lov.name, lov.label, lov.value, lov.initOrderBy]);
      });
      rows.push([]);
    }

    // Combos
    if (grid.comboboxes.length > 0) {
      rows.push(['COMBOBOXES']);
      rows.push(['Name', 'Label', 'SQL/Rows']);
      grid.comboboxes.forEach((combo) => {
        const val = combo.sqlValue || combo.rows.map((r) => `${r.id}:${r.label}`).join('; ');
        rows.push([combo.name, combo.label, val]);
      });
      rows.push([]);
    }

    // CheckAndSaveData
    if (grid.checkAndSaveData) {
      const ops = ['insert', 'update', 'delete'];
      const hasData = ops.some((op) => grid.checkAndSaveData[op].length > 0);

      if (hasData) {
        rows.push(['CHECK AND SAVE DATA']);
        rows.push(['Operation', 'SQL']);
        ops.forEach((op) => {
          grid.checkAndSaveData[op].forEach((sql) => {
            rows.push([op.toUpperCase(), sql]);
          });
        });
        rows.push([]);
      }
    }

    // Before Commit Validation
    if (grid.beforeCommitValidation.length > 0) {
      rows.push(['BEFORE COMMIT VALIDATION']);
      rows.push(['Name', 'Function', 'Fail Message', 'SQL']);
      grid.beforeCommitValidation.forEach((bc) => {
        rows.push([bc.name, bc.function, bc.failMessage, bc.sql]);
      });
      rows.push([]);
    }

    // Events
    if (grid.events.length > 0) {
      rows.push(['EVENTS']);
      rows.push(['Event Name', 'Waiting Window', 'Action Refs', 'Scripts']);
      grid.events.forEach((evt) => {
        const scripts = evt.groovyScripts
          .map((action) =>
            action.classes
              .map((item) => {
                if (item.type === 'groovy') return `[Groovy] ${item.script}`;
                if (item.type === 'sql') return `[SQL] ${item.sql}`;
                return '';
              })
              .join('\n')
          )
          .join('\n---\n');
        const nameWithContext = evt.name + (evt.context ? ` (${evt.context})` : '');
        rows.push([nameWithContext, evt.waitingWindow, evt.actionRefs.join(', '), scripts]);
      });
      rows.push([]);
    }

    // Buttons
    if (grid.bottomToolbarButtons.length > 0) {
      rows.push(['BUTTONS']);
      rows.push(['Type', 'Name', 'Label', 'CallForm', 'Params', 'Action Refs', 'Scripts']);
      grid.bottomToolbarButtons.forEach((btn) => {
        const scripts = btn.groovyScripts
          .map((action) =>
            action.classes
              .map((item) => {
                if (item.type === 'groovy') return `[Groovy] ${item.script}`;
                if (item.type === 'sql') return `[SQL] ${item.sql}`;
                return '';
              })
              .join('\n')
          )
          .join('\n---\n');
        const params = (btn.params || []).map((p) => `${p.name || ''}${p.alias ? ` (${p.alias})` : ''}`).join('\n');
        rows.push([btn.type, btn.name, btn.label, btn.callFormName, params, btn.actionRef.join(', '), scripts]);
      });
      rows.push([]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);

    setBoldHeaders(ws, rows); // Imposta larghezza colonne
    ws['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 50 }, { wch: 30 }, { wch: 40 }, { wch: 30 }, { wch: 50 }];

    // Nome foglio (max 31 caratteri e univoco)
    let sheetName = grid.name.replace(/[\[\]\*\/\\\?]/g, '');
    if (sheetName.length > 31) sheetName = sheetName.substring(0, 31);

    if (wb.SheetNames.includes(sheetName)) {
      let counter = 1;
      while (wb.SheetNames.includes(`${sheetName.substring(0, 28)}_${counter}`)) {
        counter++;
      }
      sheetName = `${sheetName.substring(0, 28)}_${counter}`;
    }

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, 'JBWT_Detailed_Export.xlsx');
}

// Funzione Export Word
async function downloadWord() {
  if (!currentData || !window.docx) return;

  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, ShadingType, TableOfContents, PageBreak } = window.docx;

  // --- HELPERS STILE ---

  // Helper generico per celle
  const createCell = (text, opts = {}) => {
    const { bold = false, width = null, bg = null, color = '000000', size = 22 } = opts;
    return new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({ text: text || '', bold: bold, size: size, color: color })],
          spacing: { before: 60, after: 60 }, // Padding verticale
        }),
      ],
      width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
      shading: bg ? { fill: bg, type: ShadingType.CLEAR } : undefined,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      },
      margins: { top: 80, bottom: 80, left: 80, right: 80 },
    });
  };

  // Cella per Etichette (es. "Nome:", "Tipo:") - Sfondo grigio chiaro, testo scuro
  const createLabelCell = (text, width = null) => createCell(text, { bold: true, width, bg: 'F3F4F6', color: '374151' });

  // Cella per Valori - Sfondo bianco
  const createValueCell = (text, width = null) => createCell(text, { width, color: '111827' });

  // Cella per Intestazioni Tabelle (es. "ID", "Label") - Sfondo più scuro
  const createHeaderCell = (text, width = null) => createCell(text, { bold: true, width, bg: 'E5E7EB', color: '000000' });

  // Helper per blocchi di codice
  const createCodeBlock = (code, type = 'sql') => {
    if (!code) return new Paragraph('');

    let fillColor = 'F9FAFB'; // Default Gray
    if (type === 'groovy') fillColor = 'FFF7ED'; // Light Orange
    else if (type === 'sql') fillColor = 'EFF6FF'; // Light Blue

    return new Paragraph({
      children: [
        new TextRun({
          text: code,
          font: 'Courier New',
          size: 18, // 9pt
          color: '1F2937',
        }),
      ],
      spacing: { before: 120, after: 120 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
      },
      shading: { fill: fillColor, type: ShadingType.CLEAR },
      indent: { left: 100, right: 100 },
    });
  };

  const docChildren = [];

  // --- TITOLO ---
  docChildren.push(
    new Paragraph({
      text: 'Estrazione XML JBWT',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }, // Spazio gestito dallo stile globale, ma questo è extra
    })
  );

  // --- INDICE ---
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: 'Indice', bold: true, size: 24 })],
      spacing: { after: 200 },
    })
  );
  docChildren.push(
    new TableOfContents('Sommario', {
      hyperlink: true,
      headingStyleRange: '1-3',
    })
  );
  docChildren.push(new Paragraph({ children: [new PageBreak()] }));

  if (currentData.description) {
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Descrizione: ', bold: true, size: 24 }), new TextRun({ text: currentData.description, size: 24 })],
        spacing: { after: 400 },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: '2563EB' } }, // Bordo blu a sinistra
        indent: { left: 200 },
      })
    );
  }

  // --- POPUPS ---
  if (currentData.popups && currentData.popups.length > 0) {
    docChildren.push(new Paragraph({ text: 'Popups', heading: HeadingLevel.HEADING_1 }));

    currentData.popups.forEach((popup) => {
      docChildren.push(new Paragraph({ text: popup.name, heading: HeadingLevel.HEADING_2 }));

      const rows = [
        new TableRow({ children: [createLabelCell('Title', 30), createValueCell(popup.title || 'N/A', 70)] }),
        new TableRow({ children: [createLabelCell('CallForm', 30), createValueCell(popup.callFormName || 'N/A', 70)] }),
        new TableRow({ children: [createLabelCell('Dimensions', 30), createValueCell(`${popup.width} x ${popup.height}`, 70)] }),
        new TableRow({ children: [createLabelCell('Grids', 30), createValueCell(popup.grids.join(', ') || 'None', 70)] }),
      ];

      docChildren.push(new Table({ rows: rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      docChildren.push(new Paragraph({ text: '', spacing: { after: 400 } }));
    });
  }

  // --- WHEN NEW FORM INSTANCE ---
  if (currentData.whenNewFormInstance.length > 0) {
    docChildren.push(new Paragraph({ text: 'When New Form Instance', heading: HeadingLevel.HEADING_1 }));
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Action Refs: ', bold: true }), new TextRun(currentData.whenNewFormInstance.join(', '))],
        spacing: { after: 200 },
      })
    );

    if (currentData.whenNewFormInstanceGroovy.length > 0) {
      currentData.whenNewFormInstanceGroovy.forEach((action) => {
        action.classes.forEach((cls) => {
          docChildren.push(new Paragraph({ text: `Action: ${action.actionName} (${cls.type})`, heading: HeadingLevel.HEADING_3 }));
          if (cls.failMessage) docChildren.push(new Paragraph({ text: `Fail Msg: ${cls.failMessage}`, color: '991B1B' }));
          docChildren.push(createCodeBlock(cls.script || cls.sql, cls.type));
        });
      });
    }
  }

  // --- GRIDS ---
  if (currentData.grids.length > 0) {
    docChildren.push(new Paragraph({ text: 'Grids', heading: HeadingLevel.HEADING_1 }));

    currentData.grids.forEach((grid) => {
      // Grid Header
      docChildren.push(new Paragraph({ text: `Grid: ${grid.name}`, heading: HeadingLevel.HEADING_2 }));

      // Grid Info Table
      const infoRows = [
        new TableRow({ children: [createLabelCell('Label', 20), createValueCell(grid.label || '', 30), createLabelCell('Type', 20), createValueCell(grid.type || '', 30)] }),
        new TableRow({ children: [createLabelCell('Tab', 20), createValueCell(grid.tab ? grid.tab.label : '', 30), createLabelCell('Ref', 20), createValueCell(grid.ref || '', 30)] }),
        new TableRow({ children: [createLabelCell('Permissions', 20), createValueCell(`I:${grid.insertAllowed} U:${grid.updateAllowed} D:${grid.deleteAllowed}`, 80)] }),
      ];
      docChildren.push(new Table({ rows: infoRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      docChildren.push(new Paragraph({ text: '', spacing: { after: 240 } }));

      // Templates
      const tplKeys = Object.keys(grid.templates);
      if (tplKeys.length > 0) {
        docChildren.push(new Paragraph({ text: 'Templates', heading: HeadingLevel.HEADING_3 }));
        tplKeys.forEach((key) => {
          docChildren.push(new Paragraph({ text: key, bold: true, spacing: { before: 200 } }));
          docChildren.push(createCodeBlock(grid.templates[key], 'sql'));
        });
      }

      // RPC Expand
      if (grid.rpcExpand) {
        docChildren.push(new Paragraph({ text: 'RPC Expand', heading: HeadingLevel.HEADING_3 }));
        docChildren.push(createCodeBlock(grid.rpcExpand, 'sql'));
        if (grid.rpcExpandInitOrderBy) {
          docChildren.push(new Paragraph({ text: `Init Order By: ${grid.rpcExpandInitOrderBy}`, spacing: { before: 100 } }));
        }
      }

      // LOVs
      if (grid.listOfValues.length > 0) {
        docChildren.push(new Paragraph({ text: 'List Of Values', heading: HeadingLevel.HEADING_3 }));
        grid.listOfValues.forEach((lov) => {
          docChildren.push(new Paragraph({ text: `${lov.name} ${lov.label ? `(${lov.label})` : ''}`, bold: true, spacing: { before: 200 } }));
          if (lov.value) docChildren.push(createCodeBlock(lov.value, 'sql'));
          if (lov.initOrderBy) docChildren.push(new Paragraph({ text: `Order By: ${lov.initOrderBy}` }));
        });
      }

      // Comboboxes
      if (grid.comboboxes.length > 0) {
        docChildren.push(new Paragraph({ text: 'Comboboxes', heading: HeadingLevel.HEADING_3 }));
        grid.comboboxes.forEach((combo) => {
          docChildren.push(new Paragraph({ text: `${combo.name} ${combo.label ? `(${combo.label})` : ''}`, bold: true, spacing: { before: 200 } }));
          if (combo.sqlValue) {
            docChildren.push(createCodeBlock(combo.sqlValue, 'sql'));
          } else if (combo.rows.length > 0) {
            const comboRows = [new TableRow({ children: [createHeaderCell('ID'), createHeaderCell('Label')] })];
            combo.rows.forEach((r) => comboRows.push(new TableRow({ children: [createValueCell(r.id), createValueCell(r.label)] })));
            docChildren.push(new Table({ rows: comboRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
          }
        });
      }

      // CheckAndSaveData
      if (grid.checkAndSaveData) {
        const ops = ['insert', 'update', 'delete'];
        const hasData = ops.some((op) => grid.checkAndSaveData[op].length > 0);

        if (hasData) {
          docChildren.push(new Paragraph({ text: 'CheckAndSaveData', heading: HeadingLevel.HEADING_3 }));
          ops.forEach((op) => {
            if (grid.checkAndSaveData[op].length > 0) {
              docChildren.push(new Paragraph({ text: op.charAt(0).toUpperCase() + op.slice(1), bold: true, spacing: { before: 200 } }));
              grid.checkAndSaveData[op].forEach((sql) => {
                docChildren.push(createCodeBlock(sql, 'sql'));
              });
            }
          });
        }
      }

      // Before Commit Validation
      if (grid.beforeCommitValidation.length > 0) {
        docChildren.push(new Paragraph({ text: 'Before Commit Validation', heading: HeadingLevel.HEADING_3 }));
        grid.beforeCommitValidation.forEach((bc) => {
          docChildren.push(new Paragraph({ text: bc.name, bold: true, spacing: { before: 200 } }));
          if (bc.function) docChildren.push(new Paragraph({ text: `Function: ${bc.function}` }));
          if (bc.failMessage) docChildren.push(new Paragraph({ text: `Fail Message: ${bc.failMessage}`, color: '991B1B' }));
          docChildren.push(createCodeBlock(bc.sql, 'sql'));
        });
      }

      // Events
      if (grid.events.length > 0) {
        docChildren.push(new Paragraph({ text: 'Events', heading: HeadingLevel.HEADING_3 }));
        const sortedEvents = [...grid.events].sort((a, b) => {
          const getPriority = (name) => {
            const n = name.toLowerCase();
            if (n.includes('whenexitchangedrecord')) return 1;
            if (n.includes('whenfinishedit')) return 2;
            if (n.includes('whenchangevalue')) return 3;
            return 4;
          };
          return getPriority(a.name) - getPriority(b.name);
        });

        sortedEvents.forEach((evt) => {
          const evtTitle = `${evt.name}${evt.context ? ` (Field: ${evt.context})` : ''}`;
          docChildren.push(
            new Paragraph({
              children: [new TextRun({ text: evtTitle }), new TextRun({ text: evt.waitingWindow ? ' [Waiting Window]' : '', color: 'D97706', size: 20 })],
              heading: HeadingLevel.HEADING_4,
            })
          );

          if (evt.actionRefs.length > 0) {
            docChildren.push(new Paragraph({ text: `Action Refs: ${evt.actionRefs.join(', ')}`, size: 20 }));
          }

          if (evt.groovyScripts.length > 0) {
            evt.groovyScripts.forEach((action) => {
              action.classes.forEach((cls) => {
                docChildren.push(new Paragraph({ text: `>> ${cls.type} (${cls.className})`, size: 18, color: '6B7280', italics: true }));
                docChildren.push(createCodeBlock(cls.script || cls.sql, cls.type));
              });
            });
          }
        });
      }

      // Buttons
      if (grid.bottomToolbarButtons.length > 0) {
        docChildren.push(new Paragraph({ text: 'Buttons', heading: HeadingLevel.HEADING_3 }));
        grid.bottomToolbarButtons.forEach((btn) => {
          docChildren.push(new Paragraph({ text: `[${btn.type}] ${btn.name} - ${btn.label}`, bold: true, spacing: { before: 200 } }));
          if (btn.callFormName) docChildren.push(new Paragraph({ text: `CallForm: ${btn.callFormName}` }));

          if (btn.params && btn.params.length > 0) {
            const paramText = btn.params.map((p) => `${p.name}=${p.alias}`).join(', ');
            docChildren.push(new Paragraph({ text: `Params: ${paramText}`, size: 20 }));
          }

          if (btn.groovyScripts.length > 0) {
            btn.groovyScripts.forEach((action) => {
              action.classes.forEach((cls) => {
                docChildren.push(new Paragraph({ text: `>> ${cls.type} (${cls.className})`, size: 18, color: '6B7280', italics: true }));
                docChildren.push(createCodeBlock(cls.script || cls.sql, cls.type));
              });
            });
          }
        });
      }

      // Separatore Grid
      docChildren.push(
        new Paragraph({
          text: '',
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E5E7EB' } },
          spacing: { after: 480 },
        })
      );
    });
  }

  // Creazione Documento
  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 32, bold: true, color: '1E40AF', font: 'Segoe UI' }, // 16pt Blue
          paragraph: { spacing: { before: 400, after: 300 } },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 28, bold: true, color: '374151', font: 'Segoe UI' }, // 14pt Gray
          paragraph: { spacing: { before: 300, after: 200 } },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 24, bold: true, color: '4B5563', font: 'Segoe UI' }, // 12pt Gray
          paragraph: { spacing: { before: 240, after: 120 } },
        },
        {
          id: 'Heading4',
          name: 'Heading 4',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 22, bold: true, color: '4F46E5', font: 'Segoe UI' }, // 11pt Indigo
          paragraph: { spacing: { before: 200, after: 100 } },
        },
      ],
    },
    sections: [
      {
        properties: {},
        children: docChildren,
      },
    ],
  });

  // Generazione e Download
  try {
    const blob = await Packer.toBlob(doc);
    saveAs(blob, 'JBWT_Export.docx');
  } catch (err) {
    console.error('Errore durante la generazione del Word:', err);
    alert('Errore durante la generazione del documento Word.');
  }
}

function renderSection(title, key, count, content) {
  const displayTitle = count !== undefined ? `${title} (${count})` : title;
  return `
          <div class="section">
              <button class="section-header" onclick="toggleSection('${key}')">
                  <span>${displayTitle}</span>
                  <span data-icon="${key}">▶</span>
              </button>
              <div class="section-content" data-section="${key}">
                  ${content}
              </div>
          </div>
      `;
}

function renderEventBlock(evt, gridIdx, uniqueSuffix) {
  return `
      <div class="mb-3" style="border-left: 3px solid #6366f1; padding-left: 12px;">
          <h4 class="info-label mb-1 text-indigo-700">${evt.name} ${evt.context ? `<span class="text-xs text-gray" style="font-weight:normal;">(Field: ${evt.context})</span>` : ''}</h4>
          ${evt.waitingWindow ? `<span class="badge badge-yellow text-xs mb-2">Waiting Window</span>` : ''}
          <p class="text-xs mb-2 mt-1"><span class="info-label">Action Refs:</span> ${evt.actionRefs.join(', ') || 'Nessuna'}</p>
          ${renderGroovyScripts(evt.groovyScripts, `evt-${gridIdx}-${uniqueSuffix}`)}
      </div>
  `;
}

function renderCodeBlock(code, id, lang = 'sql') {
  // Updated to use the copy SVG icon directly
  return `
          <div class="code-block-wrapper">
              <pre class="code-block language-${lang}"><code class="language-${lang}">${escapeHtml(code)}</code></pre>
              <button class="copy-btn" data-copy="${id}" onclick="copyToClipboard(this, '${id}')">
                  ${COPY_ICON}
              </button>
          </div>
      `;
}

function renderGroovyScripts(scripts, prefix) {
  if (!scripts || scripts.length === 0) return '';

  const content = scripts
    .map(
      (action, aIdx) => `
          <div class="action-box mb-3">
              <p class="text-sm info-label mb-2">Action: ${action.actionName}</p>
              ${action.classes
                .map((item, cIdx) => {
                  if (item.type === 'groovy') {
                    return `
                      <div class="mb-2">
                          <p class="text-xs text-gray mb-1">Class: ${item.className} ${item.classType ? `(${item.classType})` : ''}</p>
                          <p class="text-xs text-gray mb-1">Type: Groovy Script</p>
                          ${item.failMessage ? `<p class="text-xs text-red mb-1"><span class="info-label">Fail Message:</span> ${item.failMessage}</p>` : ''}
                          ${renderCodeBlock(item.script, `${prefix}-groovy-${aIdx}-${cIdx}`, 'groovy')}
                      </div>
                    `;
                  }
                  if (item.type === 'sql') {
                    return `
                      <div class="mb-2">
                          <p class="text-xs text-gray mb-1">Class: ${item.className} ${item.classType ? `(${item.classType})` : ''}</p>
                          <p class="text-xs text-gray mb-1">Type: SQL ${item.function ? `| Function: ${item.function}` : ''}</p>
                          ${item.failMessage ? `<p class="text-xs text-red mb-1"><span class="info-label">Fail Message:</span> ${item.failMessage}</p>` : ''}
                          ${renderCodeBlock(item.sql, `${prefix}-sql-${aIdx}-${cIdx}`, 'sql')}
                      </div>
                    `;
                  }
                  return '';
                })
                .join('')}
          </div>
      `
    )
    .join('');

  // Calcola il numero totale di blocchi di codice
  const totalBlocks = scripts.reduce((acc, curr) => acc + (curr.classes ? curr.classes.length : 0), 0);

  if (totalBlocks > 1) {
    return `
      <div class="scripts-group">
        <button class="copy-all-btn" onclick="copyAllScripts(this)">Copia tutte le azioni</button>
        ${content}
      </div>`;
  }

  return content;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Back to Top Logic
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

loadDefaultXML();
