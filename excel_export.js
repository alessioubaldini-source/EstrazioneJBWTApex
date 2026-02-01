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
  if (currentData.whenNewFormInstance.length > 0 || (currentData.formParams && currentData.formParams.length > 0)) {
    const wnfiRows = [];
    if (currentData.moduleInfo) {
      wnfiRows.push(['MODULE INFO']);
      wnfiRows.push([`Range Modulo ${currentData.moduleInfo.module}`, currentData.moduleInfo.range]);
      wnfiRows.push([]);
    }

    if (currentData.description) {
      wnfiRows.push(['DESCRIPTION']);
      const docTitle = currentFilename.replace(/\.xml$/i, '');
      wnfiRows.push([`${docTitle} - ${currentData.description}`]);
      wnfiRows.push([]);
    }

    if (currentData.formParams && currentData.formParams.length > 0) {
      wnfiRows.push(['FORM PARAMETERS']);
      wnfiRows.push(['Name', 'Java Type', 'Value']);
      currentData.formParams.forEach((p) => {
        wnfiRows.push([p.name, p.javaType, p.value]);
      });
      wnfiRows.push([]);
    }

    if (currentData.whenNewFormInstance.length > 0) {
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
            } else if (item.type === 'paramsList') {
              const paramsText = (item.params || []).map((p) => `${p.name}=${p.alias}`).join('\n');
              wnfiRows.push([action.actionName, 'Params List', item.className, '', paramsText]);
            }
          });
        });
      }
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

    // FIELDS
    if (grid.fields && grid.fields.length > 0) {
      rows.push(['FIELDS']);
      rows.push(['Name', 'Label', 'Type', 'Length', 'Mandatory', 'Editable', 'Hidden', 'Regex', 'Regex Msg']);
      grid.fields.forEach((f) => {
        const regex = f.validRegex ? f.validRegex.regex : '';
        const regexMsg = f.validRegex ? f.validRegex.message : '';
        rows.push([f.name, f.label, f.tag, f.length, f.isMandatory, f.isEditable, f.isHidden, regex, regexMsg]);
      });
      rows.push([]);
    }

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
                if (item.type === 'paramsList') {
                  const paramsText = (item.params || []).map((p) => `${p.name}=${p.alias}`).join('; ');
                  return `[Params] ${paramsText}`;
                }
                return '';
              })
              .join('\n'),
          )
          .join('\n---\n');
        const nameWithContext = evt.name + (evt.context ? ` (${evt.context})` : '');
        rows.push([nameWithContext, evt.waitingWindow, evt.actionRefs.join(', '), scripts]);
      });
      rows.push([]);
    }

    // Top Toolbar Buttons
    if (grid.topToolbarButtons && grid.topToolbarButtons.length > 0) {
      rows.push(['TOP TOOLBAR BUTTONS']);
      rows.push(['Type', 'Name', 'Label', 'CallForm', 'Params', 'Action Refs', 'Scripts']);
      grid.topToolbarButtons.forEach((btn) => {
        const scripts = btn.groovyScripts
          .map((action) =>
            action.classes
              .map((item) => {
                if (item.type === 'groovy') return `[Groovy] ${item.script}`;
                if (item.type === 'sql') return `[SQL] ${item.sql}`;
                if (item.type === 'paramsList') {
                  const paramsText = (item.params || []).map((p) => `${p.name}=${p.alias}`).join('; ');
                  return `[Params] ${paramsText}`;
                }
                return '';
              })
              .join('\n'),
          )
          .join('\n---\n');
        const params = (btn.params || []).map((p) => `${p.name || ''}${p.alias ? ` (${p.alias})` : ''}`).join('\n');
        rows.push([btn.type, btn.name, btn.label, btn.callFormName, params, btn.actionRef.join(', '), scripts]);
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
                if (item.type === 'paramsList') {
                  const paramsText = (item.params || []).map((p) => `${p.name}=${p.alias}`).join('; ');
                  return `[Params] ${paramsText}`;
                }
                return '';
              })
              .join('\n'),
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
    let sheetName = grid.name.replace(/[\[\]\*\/\\?]/g, '');
    if (sheetName.length > 31) sheetName = sheetName.substring(0, 31);

    if (wb.SheetNames.includes(sheetName)) {
      let counter = 1;
      while (wb.SheetNames.includes(`${sheetName.substring(0, 28)}_`)) {
        counter++;
      }
      sheetName = `${sheetName.substring(0, 28)}_`;
    }

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const docTitle = currentFilename.replace(/\.xml$/i, '');
  XLSX.writeFile(wb, `${docTitle}.xlsx`);
}

// Funzione Export Test Cases
function downloadTestCases() {
  if (!currentData) return;

  const wb = XLSX.utils.book_new();
  const rows = [];

  // Intestazioni
  const headers = ['ID', 'Area/Grid', 'Oggetto', 'Tipo Test', 'Descrizione Scenario', 'Risultato Atteso', 'Priorità', 'Codice Riferimento', 'Esito (OK/KO)'];
  rows.push(headers);

  let testId = 1;

  // Helper per aggiungere righe
  const addTest = (area, oggetto, tipo, scenario, atteso, priorita = 'Media', codice = '') => {
    rows.push([testId++, area, oggetto, tipo, scenario, atteso, priorita, codice, '']);
  };

  // 1. Test Globali (When New Form Instance)
  if (currentData.whenNewFormInstance && currentData.whenNewFormInstance.length > 0) {
    let codeRef = '';
    if (currentData.whenNewFormInstanceGroovy && currentData.whenNewFormInstanceGroovy.length > 0) {
      codeRef = currentData.whenNewFormInstanceGroovy
        .map((action) =>
          action.classes
            .map((c) => {
              if (c.type === 'paramsList') return `[Params] ${(c.params || []).map((p) => `${p.name}=${p.alias}`).join('; ')}`;
              return `[${c.type}] ${c.script || c.sql}`;
            })
            .join('\n'),
        )
        .join('\n---\n');
    }
    addTest('Global', 'Form Load', 'Inizializzazione', 'Aprire la form e verificare il caricamento iniziale', 'La form si apre senza errori e vengono eseguiti gli script di avvio: ' + currentData.whenNewFormInstance.join(', '), 'Alta', codeRef);
  }

  // 2. Iterazione su Grids
  currentData.grids.forEach((grid) => {
    let labelInfo = grid.label;
    if (!labelInfo && grid.tab && grid.tab.label) {
      labelInfo = `Tab: ${grid.tab.label}`;
    }
    const gridName = labelInfo ? `${grid.name} (${labelInfo})` : grid.name;

    // A. Permessi CRUD
    if (grid.insertAllowed === 'true') {
      addTest(gridName, 'Grid', 'Permessi', 'Provare a inserire un nuovo record', 'Inserimento consentito', 'Alta');
    } else {
      addTest(gridName, 'Grid', 'Permessi', 'Verificare assenza funzionalità inserimento', 'Inserimento NON consentito (tasto disabilitato o assente)', 'Bassa');
    }

    if (grid.updateAllowed === 'true') {
      addTest(gridName, 'Grid', 'Permessi', 'Modificare un record esistente e salvare', 'Salvataggio avvenuto con successo', 'Alta');
    } else {
      addTest(gridName, 'Grid', 'Permessi', 'Provare a modificare un record', 'Modifica NON consentita (campi read-only)', 'Bassa');
    }

    if (grid.deleteAllowed === 'true') {
      addTest(gridName, 'Grid', 'Permessi', 'Cancellare un record esistente', 'Cancellazione avvenuta con successo', 'Media');
    }

    // B. Campi (Validazioni UI)
    grid.fields.forEach((field) => {
      const fieldName = field.label || field.name;

      // Obbligatorietà
      if (field.isMandatory === 'true') {
        addTest(gridName, `Campo: ${fieldName}`, 'Validazione', `Lasciare vuoto il campo "${fieldName}" e tentare il salvataggio`, 'Il sistema deve bloccare il salvataggio e mostrare errore di campo obbligatorio', 'Alta');
      }

      // Lunghezza
      if (field.length && parseInt(field.length) > 0) {
        addTest(gridName, `Campo: ${fieldName}`, 'Input', `Inserire più di ${field.length} caratteri nel campo`, `Il sistema non deve permettere l'inserimento o troncare a ${field.length} caratteri`, 'Bassa');
      }

      // Editabilità
      if (field.isEditable === 'false') {
        addTest(gridName, `Campo: ${fieldName}`, 'UI', `Verificare che il campo "${fieldName}" non sia modificabile`, 'Campo in sola lettura (grigio/disabilitato)', 'Media');
      }

      // ValidRegex
      if (field.validRegex) {
        addTest(gridName, `Campo: ${fieldName}`, 'Validazione Regex', `Inserire valore non conforme alla regex: ${field.validRegex.regex}`, `Errore atteso: ${field.validRegex.message || 'Errore validazione'}`, 'Alta');
      }
    });

    // C. Validazioni Logiche (Before Commit)
    grid.beforeCommitValidation.forEach((bc) => {
      addTest(gridName, `Validazione: ${bc.name}`, 'Business Logic', `Creare condizione per far fallire: ${bc.function || 'SQL Check'}`, `Il salvataggio fallisce con messaggio: "${bc.failMessage}"`, 'Alta', bc.sql || '');
    });

    // C.2 Eventi con Fail Message (Controlli)
    grid.events.forEach((evt) => {
      if (evt.groovyScripts && evt.groovyScripts.length > 0) {
        evt.groovyScripts.forEach((action) => {
          if (action.classes && action.classes.length > 0) {
            action.classes.forEach((cls) => {
              if (cls.failMessage) {
                const contextMsg = evt.context ? ` sul campo "${evt.context}"` : '';
                addTest(gridName, `Controllo: ${evt.name}`, 'Validazione', `Scatenare l'evento ${evt.name}${contextMsg} con dati non validi`, `Errore atteso: ${cls.failMessage}`, 'Alta', cls.script || cls.sql || '');
              }
            });
          }
        });
      }
    });

    // D. Bottoni (Toolbar)
    const allButtons = [...grid.topToolbarButtons, ...grid.bottomToolbarButtons];
    allButtons.forEach((btn) => {
      const btnLabel = btn.label || btn.name;
      let actionDesc = 'Esecuzione azione';
      if (btn.callFormName) actionDesc = `Apertura form/popup: ${btn.callFormName}`;
      else if (btn.actionRef.length > 0) actionDesc = `Esecuzione logica: ${btn.actionRef.join(', ')}`;

      let codeRef = '';
      if (btn.groovyScripts && btn.groovyScripts.length > 0) {
        codeRef = btn.groovyScripts
          .map((action) =>
            action.classes
              .map((c) => {
                if (c.type === 'paramsList') return `[Params] ${(c.params || []).map((p) => `${p.name}=${p.alias}`).join('; ')}`;
                return `[${c.type}] ${c.script || c.sql}`;
              })
              .join('\n'),
          )
          .join('\n---\n');
      }

      addTest(gridName, `Bottone: ${btnLabel}`, 'Funzionalità', `Cliccare sul bottone "${btnLabel}"`, `Risultato atteso: ${actionDesc}`, 'Media', codeRef);
    });

    // E. LOV e Combobox
    grid.listOfValues.forEach((lov) => {
      addTest(gridName, `LOV: ${lov.name}`, 'UI/Dati', `Aprire la lista valori per ${lov.label || lov.name}`, 'La lista appare popolata con i dati corretti', 'Media', lov.value || '');
    });

    grid.comboboxes.forEach((combo) => {
      addTest(gridName, `Combo: ${combo.name}`, 'UI/Dati', `Verificare le opzioni della tendina ${combo.label || combo.name}`, 'Le opzioni sono selezionabili correttamente', 'Media', combo.sqlValue || '');
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Formattazione larghezza colonne
  ws['!cols'] = [
    { wch: 5 }, // ID
    { wch: 25 }, // Area
    { wch: 30 }, // Oggetto
    { wch: 15 }, // Tipo
    { wch: 50 }, // Scenario
    { wch: 50 }, // Atteso
    { wch: 10 }, // Priorità
    { wch: 50 }, // Codice Riferimento
    { wch: 10 }, // Esito
  ];

  // Applica grassetto all'header
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[cellRef].s) ws[cellRef].s = {};
    ws[cellRef].s.font = { bold: true };
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Test Plan');
  const docTitle = currentFilename.replace(/\.xml$/i, '');
  XLSX.writeFile(wb, `${docTitle}_TestCases.xlsx`);
}
