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
      locationInfo = `<div class="text-xs" style="margin-left: 22px; color: #6b21a8;">Tab: ${grid.tab.label || grid.tab.name}</div>`;
    } else {
      const popup = data.popups.find((p) => p.grids.includes(grid.name));
      if (popup) {
        locationInfo = `<div class="text-xs" style="margin-left: 22px; color: #c2410c;">Popup: ${popup.name}</div>`;
      }
    }

    // Aggiungi voce alla sidebar
    sidebarHtml += `<li><a href="#grid-${grid.name}"><div>📄 ${grid.name} ${grid.label ? `<span class="text-xs text-gray">(${grid.label})</span>` : ''}</div>${locationInfo}</a></li>`;

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
