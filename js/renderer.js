function renderData(data) {
  loadProgress();

  // Ordina le grid per la proprietà "order"
  if (data.grids) {
    currentData = data; // Salva i dati globalmente
  }
  document.getElementById('downloadBtn').disabled = false;
  document.getElementById('downloadWordBtn').disabled = false;
  document.getElementById('downloadTestBtn').disabled = false;
  document.getElementById('downloadApexBtn').disabled = false;
  document.getElementById('wizardModeBtn').disabled = false;

  // Aggiunge il bottone Mappa Layout accanto al bottone Test se non esiste
  const testBtn = document.getElementById('downloadTestBtn');
  if (testBtn && !document.getElementById('btnLayoutMap')) {
    const btn = document.createElement('button');
    btn.id = 'btnLayoutMap';
    btn.className = testBtn.className;
    btn.innerHTML = '🗺️ Mappa';
    btn.onclick = window.showLayoutMapModal;
    testBtn.parentNode.insertBefore(btn, testBtn.nextSibling);
  }

  updateProgressBar();

  const content = document.getElementById('content');
  const sidebar = document.getElementById('sidebar');
  let html = '';

  const xmlCode = currentFilename.replace(/\.xml$/i, '');

  if (data.description) {
    html += `
              <div class="description-box">
                  <h2>${xmlCode} - ${data.description}</h2>
              </div>
          `;
  }

  if (data.moduleInfo) {
    html += `
              <div class="description-box" style="background: #ecfdf5; border-color: #10b981;">
                  <h2 style="color: #047857;">Range Modulo ${data.moduleInfo.module}</h2>
                  <p><strong>Range previsto:</strong> ${data.moduleInfo.range}</p>
              </div>
          `;
  }

  if (data.formParams && data.formParams.length > 0) {
    html += renderSection(
      'Parametri Form',
      'form-params',
      data.formParams.length,
      `
        <table class="table" style="margin-top: 10px;">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Java Type</th>
                    <th>Value</th>
                </tr>
            </thead>
            <tbody>
                ${data.formParams
                  .map(
                    (p) => `
                    <tr>
                        <td>${escapeHtml(p.name || '')}</td>
                        <td>${escapeHtml(p.javaType || '')}</td>
                        <td>${escapeHtml(p.value || '')}</td>
                    </tr>
                `,
                  )
                  .join('')}
            </tbody>
        </table>
      `,
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
          `,
    );
  }

  if (data.globalActions && data.globalActions.length > 0) {
    const usedActions = new Set();

    const markUsed = (scripts) => {
      if (scripts) scripts.forEach((s) => usedActions.add(s.actionName));
    };

    if (data.whenNewFormInstance) data.whenNewFormInstance.forEach((a) => usedActions.add(a));
    markUsed(data.whenNewFormInstanceGroovy);

    if (data.grids) {
      data.grids.forEach((grid) => {
        grid.events.forEach((evt) => markUsed(evt.groovyScripts));
        grid.topToolbarButtons.forEach((btn) => markUsed(btn.groovyScripts));
        grid.bottomToolbarButtons.forEach((btn) => markUsed(btn.groovyScripts));
      });
    }

    const filteredGlobalActions = data.globalActions.filter((action) => !usedActions.has(action.actionName));

    if (filteredGlobalActions.length > 0) {
      html += renderSection('Azioni Globali (Definizioni)', 'form-global-actions', filteredGlobalActions.length, renderGroovyScripts(filteredGlobalActions, 'global'));
    }
  }

  // --- SIDEBAR ---
  let sidebarHtml = `
      <h3>📌 Indice Grids</h3>
      <ul>`;

  const popupGridNames = data.popups ? data.popups.flatMap((p) => p.grids) : [];

  const getOrder = (item) => {
    const order_raw = parseInt(item.order, 10);
    return !isNaN(order_raw) ? order_raw : 9999;
  };

  // 1. Standalone grids
  const standaloneGrids = data.grids.filter((g) => !g.tab && !popupGridNames.includes(g.name)).sort((a, b) => getOrder(a) - getOrder(b));

  // 2. Tab grids
  const tabs = {};
  data.grids
    .filter((g) => g.tab && !popupGridNames.includes(g.name))
    .forEach((g) => {
      if (!tabs[g.tab.name]) {
        tabs[g.tab.name] = {
          ...g.tab,
          grids: [],
        };
      }
      tabs[g.tab.name].grids.push(g);
    });

  const sortedTabs = Object.values(tabs).sort((a, b) => getOrder(a) - getOrder(b));
  const tabGrids = [];
  sortedTabs.forEach((tab) => {
    tab.grids.sort((a, b) => getOrder(a) - getOrder(b));
    tabGrids.push(...tab.grids);
  });

  // 3. Popup grids
  const popupGrids = data.grids.filter((g) => popupGridNames.includes(g.name)).sort((a, b) => getOrder(a) - getOrder(b));

  const sbAllGrids = [...standaloneGrids, ...tabGrids, ...popupGrids];
  sbAllGrids.forEach((grid) => {
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

    const isGridDone = progressData[`grid-done-${grid.name}`] === true;

    // Aggiungi voce alla sidebar
    sidebarHtml += `<li data-grid-name="${grid.name}" class="${isGridDone ? 'grid-done' : ''}">
        <div style="display: flex; align-items: flex-start; gap: 8px;">
            <a href="javascript:void(0)" onclick="selectGrid('${grid.name}')" style="flex: 1;">
                <div>📄 ${grid.name} ${grid.label ? `<span class="text-xs text-gray">(${grid.label})</span>` : ''}</div>
                ${locationInfo}
                ${summaryBadgesHtml}
            </a>
        </div>
    </li>`;
  });

  // --- GRIDS HELPER ---
  const renderGridHtml = (grid, idx) => {
    const hasTemplates = Object.keys(grid.templates).length > 0;
    const evAbilitazioni = grid.events.filter((e) => ['whennewforminstance', 'whennewrecordinstance', 'whenrecordfetched'].includes(e.name.toLowerCase()));
    const evControlli = grid.events.filter((e) => ['whenexitchangedrecord', 'whenfinisheditvalue'].includes(e.name.toLowerCase()));
    const evAltri = grid.events.filter((e) => !evAbilitazioni.includes(e) && !evControlli.includes(e));
    const isGridDone = progressData[`grid-done-${grid.name}`] === true;

    return `
              <div class="grid-card ${isGridDone ? 'grid-done collapsed' : ''}" id="grid-${grid.name}" data-grid-name="${grid.name.toLowerCase()}">
                  <div class="grid-header">
                      <div style="display:flex; align-items:center; gap:10px;">
                        <input type="checkbox" ${isGridDone ? 'checked' : ''} onclick="toggleGridDone(event, '${grid.name}')" title="Segna la grid come completata" style="width:18px; height:18px; cursor:pointer;">
                        <h2>Grid: ${grid.name} ${grid.label ? `<span class="text-sm text-gray" style="font-weight:normal">(${grid.label})</span>` : ''}</h2>
                      </div>
                      <div class="badge-container">
                          ${grid.tab ? `<span class="badge badge-purple"><span class="info-label">Tab:</span> ${grid.tab.label} (${grid.tab.name})</span>` : ''}
                          ${grid.type ? `<span class="badge badge-blue"><span class="info-label">Type:</span> ${grid.type}</span>` : ''}
                          ${grid.ref ? `<span class="badge badge-gray"><span class="info-label">Ref:</span> ${grid.ref}</span>` : ''}
                          <span class="badge ${grid.insertAllowed === 'true' ? 'badge-green' : 'badge-red'}"><span class="info-label">Insert:</span> ${grid.insertAllowed}</span>
                          <span class="badge ${grid.updateAllowed === 'true' ? 'badge-green' : 'badge-red'}"><span class="info-label">Update:</span> ${grid.updateAllowed}</span>
                          <span class="badge ${grid.deleteAllowed === 'true' ? 'badge-green' : 'badge-red'}"><span class="info-label">Delete:</span> ${grid.deleteAllowed}</span>
                      </div>
                  </div>

                  <div class="grid-content">
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
                      `,
                          )
                          .join('')
                      : '<p class="text-gray">Nessun template definito</p>',
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
                      : '<p class="text-gray">Non presente</p>',
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
                      `,
                          )
                          .join('')
                      : '<p class="text-gray">Nessuno presente</p>',
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
                                          `,
                                            )
                                            .join('')}
                                      </tbody>
                                  </table>
                              `
                                  : ''
                              }
                              ${combo.sqlValue ? renderCodeBlock(combo.sqlValue, `combo-${idx}-${comboIdx}`) : ''}
                          </div>
                      `,
                          )
                          .join('')
                      : '<p class="text-gray">Nessuno presente</p>',
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
                                : '',
                            )
                            .join('')}
                      `
                      : '<p class="text-gray">Non presente</p>',
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
                      `,
                          )
                          .join('')
                      : '<p class="text-gray">Non presente</p>',
                  )}

                  ${renderSection(
                    'Abilitazioni',
                    `events-abil-${idx}`,
                    evAbilitazioni.length,
                    evAbilitazioni.length > 0 ? evAbilitazioni.map((evt, eIdx) => renderEventBlock(evt, idx, `abil-${eIdx}`)).join('') : '<p class="text-gray">Nessun evento di abilitazione</p>',
                  )}

                  ${renderSection('Controlli', `events-ctrl-${idx}`, evControlli.length, evControlli.length > 0 ? evControlli.map((evt, eIdx) => renderEventBlock(evt, idx, `ctrl-${eIdx}`)).join('') : '<p class="text-gray">Nessun controllo</p>')}

                  ${renderSection('Altri Eventi', `events-other-${idx}`, evAltri.length, evAltri.length > 0 ? evAltri.map((evt, eIdx) => renderEventBlock(evt, idx, `other-${eIdx}`)).join('') : '<p class="text-gray">Nessun altro evento</p>')}

                  ${renderSection(
                    'Top Toolbar Buttons',
                    `topbuttons-${idx}`,
                    grid.topToolbarButtons.length,
                    grid.topToolbarButtons.length > 0
                      ? grid.topToolbarButtons
                          .map(
                            (btn, btnIdx) => `
                          <div class="mb-3" style="border-bottom: 1px solid #e5e7eb; padding-bottom: 12px;">
                              <p class="text-sm mb-1"><span class="badge badge-blue text-xs">${btn.type}</span></p>
                              <p class="text-sm mb-1"><span class="info-label">Name:</span> ${btn.name} ${btn.label ? `(${btn.label})` : ''}</p>
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
                                      ${renderGroovyScripts(btn.groovyScripts, `topbtn-groovy-${idx}-${btnIdx}`)}
                                  </div>
                              `
                                  : ''
                              }
                          </div>
                      `,
                          )
                          .join('')
                      : '<p class="text-gray">Nessuno presente</p>',
                  )}

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
                              <p class="text-sm mb-1"><span class="info-label">Name:</span> ${btn.name} ${btn.label ? `(${btn.label})` : ''}</p>
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
                      `,
                          )
                          .join('')
                      : '<p class="text-gray">Nessuno presente</p>',
                  )}
                  </div>
              </div>
          `;
  };

  // --- RENDER STANDALONE GRIDS ---

  if (standaloneGrids.length > 0) {
    html += `<h2 style="margin-top: 20px; margin-bottom: 10px; font-size: 1.5rem; color: #111827;">Grids</h2>`;
    standaloneGrids.forEach((grid) => {
      const idx = data.grids.indexOf(grid);
      html += renderGridHtml(grid, idx);
    });
  }

  // --- RENDER TABS ---

  if (sortedTabs.length > 0) {
    html += `<h2 style="margin-top: 40px; margin-bottom: 10px; font-size: 1.5rem; color: #111827;">Tabs</h2>`;
    sortedTabs.forEach((tab) => {
      html += `
        <div class="section">
          <div class="section-header" style="background-color: #fefce8; border-left: 4px solid #a16207;">
             <span style="font-size: 1.1em; font-weight: bold; color: #854d0e;">Tab: ${tab.label || tab.name}</span>
          </div>
          <div class="section-content open" style="padding: 15px;">
             <div class="tab-grids">
                ${tab.grids
                  .sort((a, b) => getOrder(a) - getOrder(b))
                  .map((grid) => renderGridHtml(grid, data.grids.indexOf(grid)))
                  .join('')}
             </div>
          </div>
        </div>
      `;
    });
  }

  // --- RENDER POPUPS ---
  if (data.popups && data.popups.length > 0) {
    html += `<h2 style="margin-top: 40px; margin-bottom: 10px; font-size: 1.5rem; color: #111827;">Popups</h2>`;

    data.popups.forEach((popup) => {
      html += `
        <div class="section">
          <div class="section-header" style="background-color: #fff7ed; border-left: 4px solid #c2410c;">
             <span style="font-size: 1.1em; font-weight: bold; color: #9a3412;">Popup: ${popup.name}</span>
          </div>
          <div class="section-content open" style="padding: 15px;">
             <div class="popup-info mb-4">
                <p class="text-sm mb-1"><span class="info-label">Title:</span> ${popup.title || 'N/A'}</p>
                <p class="text-sm mb-1"><span class="info-label">CallForm:</span> ${popup.callFormName || 'N/A'}</p>
                <p class="text-sm mb-1"><span class="info-label">Dimensioni:</span> ${popup.width} x ${popup.height}</p>
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
             </div>
             
             <div class="popup-grids">
                ${data.grids
                  .filter((g) => popup.grids.includes(g.name))
                  .sort((a, b) => getOrder(a) - getOrder(b))
                  .map((grid) => renderGridHtml(grid, data.grids.indexOf(grid)))
                  .join('')}
             </div>
          </div>
        </div>
      `;
    });
  }

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

function renderSection(title, key, count, content) {
  const displayTitle = count !== undefined ? `${title} (${count})` : title;
  const isDone = progressData[key] === true;
  const doneClass = isDone ? 'section-done' : '';

  return `
          <div class="section ${doneClass}">
              <button class="section-header" onclick="toggleSection('${key}')">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <input type="checkbox" ${isDone ? 'checked' : ''} onclick="toggleDone(event, '${key}')" title="Segna come completato" style="width:18px; height:18px; cursor:pointer;">
                    <span>${displayTitle}</span>
                  </div>
                  <span data-icon="${key}">▶</span>
              </button>
              <div class="section-content" data-section="${key}">
                  ${content}
              </div>
          </div>
      `;
}

function renderEventBlock(evt, gridIdx, uniqueSuffix) {
  let noteHtml = '';
  if (evt.name.toLowerCase().includes('whenfinishedit')) {
    noteHtml = `
      <div class="mt-2 p-2 text-xs" style="background-color: #fff7ed; border-left: 3px solid #f97316; color: #9a3412; border-radius: 0 4px 4px 0;">
        <strong>💡 ATTENZIONE:</strong> Questo controllo deve scattare solo alla modifica del field, pertanto deve essere gestito il corrispettivo OLD per verificare la variazione
      </div>`;
  }

  return `
      <div class="mb-3" style="border-left: 3px solid #6366f1; padding-left: 12px;">
          <h4 class="info-label mb-1 text-indigo-700">${evt.name} ${evt.context ? `<span class="text-xs text-gray" style="font-weight:normal;">(Field: ${evt.context})</span>` : ''}</h4>
          ${evt.waitingWindow ? `<span class="badge badge-yellow text-xs mb-2">Waiting Window</span>` : ''}
          <p class="text-xs mb-2 mt-1"><span class="info-label">Action Refs:</span> ${evt.actionRefs.join(', ') || 'Nessuna'}</p>
          ${renderGroovyScripts(evt.groovyScripts, `evt-${gridIdx}-${uniqueSuffix}`)}
          ${noteHtml}
      </div>
  `;
}

function renderCodeBlock(code, id, lang = 'sql') {
  const isGroovy = lang === 'groovy';
  const convertBtn = isGroovy
    ? `
    <button class="copy-btn convert-btn" style="right: 40px;" onclick="togglePlSql(this, '${id}')" title="Converti in PL/SQL">
      🔄
    </button>
    <textarea id="${id}-raw" class="hidden">${escapeHtml(code)}</textarea>
  `
    : '';

  return `
          <div class="code-block-wrapper">
              <pre class="code-block language-${lang}" id="${id}-code"><code class="language-${lang}">${escapeHtml(code)}</code></pre>
              ${convertBtn}
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
              ${
                action.openPopup && action.openPopup.name
                  ? `<div class="mb-2">
                          <p class="text-xs text-gray mb-1">Type: Open Popup</p>
                          <p class="text-sm mb-1"><span class="info-label">Popup Name:</span> ${action.openPopup.name}</p>
                      </div>`
                  : ''
              }
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
                  if (item.type === 'paramsList') {
                    let callFormHelp = '';
                    if (item.classType === 'CallFormAction' || item.className === 'CallFormAction') {
                      const popupList = appSettings.popupForms || [];
                      const targetForm = (item.formName || '').toUpperCase();
                      const isPopupTarget = targetForm && popupList.some((pf) => pf.toUpperCase() === targetForm);

                      const snippet1 = `ApexUtils.callForm(PAGE_ID, { Pxx_ID: 10, ... });`;
                      const snippet2 = `ApexUtils.callForm(PAGE_ID, { Pxx_ID: 10, ... }, { mode: 'same' });`;

                      callFormHelp = `
                        <div class="mt-4 p-4" style="background-color: ${isPopupTarget ? '#fff7ed' : '#f0f9ff'}; border-left: 6px solid ${isPopupTarget ? '#f97316' : '#0ea5e9'}; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid ${isPopupTarget ? '#fed7aa' : '#bae6fd'};">
                            <div style="margin-bottom: 12px;">
                                <div>
                                    <p class="text-sm font-bold" style="color: ${isPopupTarget ? '#9a3412' : '#0369a1'}; display: flex; align-items: center; gap: 8px; margin: 0;">
                                        ${isPopupTarget ? '🚨' : '💡'} Suggerimento Chiamata APEX
                                    </p>
                                    <p class="text-xs" style="color: #64748b; margin: 2px 0 0 0;">Target: <strong>${targetForm || 'N.D.'}</strong> ${isPopupTarget ? '(Configurato come Popup)' : '(Navigazione Standard)'}</p>
                                </div>
                            </div>
                            <div style="font-family: 'Fira Code', monospace; font-size: 11px;">
                                <div style="margin-bottom: 8px; padding: 10px; border-radius: 6px; ${!isPopupTarget ? 'background: white; border: 2px solid #0ea5e9; color: #0369a1;' : 'opacity: 0.4; color: #64748b; border: 1px dashed #cbd5e1;'}">
                                    <div class="mb-1" style="font-weight: bold;">// Caso 1: Standard (Target Normal)</div>
                                    <div style="font-weight: ${!isPopupTarget ? '700' : '400'};">${snippet1}</div>
                                </div>
                                <div style="padding: 10px; border-radius: 6px; ${isPopupTarget ? 'background: white; border: 2px solid #f97316; color: #c2410c;' : 'opacity: 0.4; color: #64748b; border: 1px dashed #cbd5e1;'}">
                                    <div class="mb-1" style="font-weight: bold;">// Caso 2: Popup / Modal (Target Modal)</div>
                                    <div style="font-weight: ${isPopupTarget ? '700' : '400'};">${snippet2}</div>
                                </div>
                            </div>
                        </div>
                      `;
                    }
                    return `
                      <div class="mb-2">
                          <p class="text-xs text-gray mb-1">Class: ${item.className} ${item.classType ? `(${item.classType})` : ''}</p>
                          <p class="text-xs text-gray mb-1">Type: Param List</p>
                          ${
                            item.formName
                              ? `
                            <div class="mb-2 p-2 bg-gray-50 rounded border border-gray-200" style="display: flex; gap: 15px; align-items: center;">
                                <span class="text-xs"><strong>Destinazione:</strong> <span class="badge badge-blue" style="font-size: 11px;">${item.formName}</span></span>
                                ${item.formVariant ? `<span class="text-xs"><strong>Variante:</strong> ${item.formVariant}</span>` : ''}
                                ${item.formTarget ? `<span class="text-xs"><strong>Target:</strong> ${item.formTarget}</span>` : ''}
                            </div>`
                              : ''
                          }
                          ${
                            item.params && item.params.length > 0
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
                                              ${item.params.map((p) => `<tr><td>${escapeHtml(p.name || '')}</td><td>${escapeHtml(p.alias || '')}</td></tr>`).join('')}
                                          </tbody>
                                      </table>
                                   </div>`
                              : ''
                          }
                          ${callFormHelp}
                      </div>
                    `;
                  }
                  return '';
                })
                .join('')}
          </div>
      `,
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

window.showLayoutMapModal = function () {
  if (!currentData) return;
  const html = renderLayoutMap(currentData);
  showInfoPopup('Mappa Layout Maschera', html, '90%');
};

function renderLayoutMap(data) {
  const styles = `
    <style>
      .layout-map-container { display: flex; flex-direction: column; gap: 24px; font-family: 'Segoe UI', sans-serif; padding: 10px; }
      .layout-area { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
      .layout-area-title { font-size: 1.1rem; font-weight: 600; color: #334155; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; }
      .layout-flex-row { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; }
      .layout-card { background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; min-width: 280px; flex: 1; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 8px; }
      .layout-card.tab-card { border-top: 4px solid #8b5cf6; }
      .layout-card.popup-card { border-top: 4px solid #f97316; border-style: dashed; }
      .layout-card.standalone-card { border-top: 4px solid #64748b; }
      .card-header { font-weight: 700; font-size: 1rem; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; }
      .grid-item { background: #eff6ff; border: 1px solid #bfdbfe; padding: 10px; border-radius: 4px; font-size: 0.9rem; position: relative; }
      .grid-item.has-master { border-left: 4px solid #10b981; }
      .grid-item-header { font-weight: 600; color: #1d4ed8; display: flex; justify-content: space-between; align-items: center; }
      .grid-item-detail { font-size: 0.8rem; color: #64748b; margin-top: 4px; display: flex; flex-wrap: wrap; gap: 6px; }
      .badge-mini { font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; background: #e2e8f0; color: #475569; font-weight: 600; }
      .master-ref { color: #059669; font-weight: 600; font-size: 0.8rem; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #bbf7d0; display: flex; align-items: center; gap: 4px; }
    </style>
  `;

  const getOrder = (item) => {
    const order_raw = parseInt(item.order, 10);
    return !isNaN(order_raw) ? order_raw : 9999;
  };

  const renderGridItem = (grid) => {
    const isMaster = data.grids.some((g) => g.masterRegion === grid.name);
    const hasMaster = !!grid.masterRegion;

    return `
      <div class="grid-item ${hasMaster ? 'has-master' : ''}">
        <div class="grid-item-header">
          <span>📄 ${grid.name}</span>
          ${isMaster ? '<span class="badge-mini" style="background:#dcfce7; color:#166534;">MASTER</span>' : ''}
        </div>
        <div class="grid-item-detail">
          <span class="badge-mini">${grid.type || 'Grid'}</span>
          ${grid.label ? `<span>${grid.label}</span>` : ''}
        </div>
        ${hasMaster ? `<div class="master-ref">🔗 Detail of: ${grid.masterRegion}</div>` : ''}
      </div>
    `;
  };

  // 1. Prepare Data
  const popupGridNames = data.popups ? data.popups.flatMap((p) => p.grids) : [];

  // Tabs
  const tabs = {};
  data.grids
    .filter((g) => g.tab && !popupGridNames.includes(g.name))
    .forEach((g) => {
      if (!tabs[g.tab.name]) tabs[g.tab.name] = { ...g.tab, grids: [] };
      tabs[g.tab.name].grids.push(g);
    });
  const sortedTabs = Object.values(tabs).sort((a, b) => getOrder(a) - getOrder(b));

  // Popups
  const popups = data.popups.map((p) => ({
    ...p,
    grids: data.grids.filter((g) => p.grids.includes(g.name)).sort((a, b) => getOrder(a) - getOrder(b)),
  }));

  // Standalone
  const standaloneGrids = data.grids.filter((g) => !g.tab && !popupGridNames.includes(g.name)).sort((a, b) => getOrder(a) - getOrder(b));

  // 2. Build HTML
  let html = `<div class="layout-map-container">${styles}`;

  // Section: Standalone
  if (standaloneGrids.length > 0) {
    html += `
      <div class="layout-area">
        <div class="layout-area-title">📄 Standalone Grids</div>
        <div class="layout-flex-row">
          <div class="layout-card standalone-card">
            <div class="card-header">Main Canvas</div>
            ${standaloneGrids.map(renderGridItem).join('')}
          </div>
        </div>
      </div>`;
  }

  // Section: Tabs
  if (sortedTabs.length > 0) {
    html += `
      <div class="layout-area">
        <div class="layout-area-title">📂 Tabs Container</div>
        <div class="layout-flex-row">
          ${sortedTabs
            .map(
              (tab) => `
            <div class="layout-card tab-card">
              <div class="card-header"><span>${tab.label || tab.name}</span> <span class="badge-mini">Tab</span></div>
              ${tab.grids
                .sort((a, b) => getOrder(a) - getOrder(b))
                .map(renderGridItem)
                .join('')}
            </div>
          `,
            )
            .join('')}
        </div>
      </div>`;
  }

  // Section: Popups
  if (popups.length > 0) {
    html += `
      <div class="layout-area">
        <div class="layout-area-title">💬 Popups</div>
        <div class="layout-flex-row">
          ${popups
            .map(
              (popup) => `
            <div class="layout-card popup-card">
              <div class="card-header"><span>${popup.name}</span> <span class="badge-mini">Popup</span></div>
              <div style="font-size:0.8rem; color:#64748b; margin-bottom:5px;">${popup.title || ''} (${popup.width}x${popup.height})</div>
              ${popup.grids.map(renderGridItem).join('')}
            </div>
          `,
            )
            .join('')}
        </div>
      </div>`;
  }

  html += `</div>`;
  return html;
}
