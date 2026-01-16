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
