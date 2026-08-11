// --- LOOKUP CENTRALIZZATA TEST STRINGS ---
const TEST_TEMPLATES = {
  GLOBAL: {
    FORM_LOAD: {
      OBJ: 'Caricamento Form',
      TYPE: 'Inizializzazione',
      SCENARIO:
        'Aprire la form e verificare il completamento del caricamento iniziale: assenza di errori JS, esecuzione degli script WNFI e popolamento dei campi/grid iniziali',
      EXPECTED:
        'La form si carica correttamente: nessun errore in console, tutti gli script WNFI sono eseguiti, i campi con valori di default risultano già valorizzati e le grid iniziali sono popolate',
      PRIO: 'Programmatore e Analista',
    },
    PARAM_RESET: {
      OBJ: 'Parametri Form',
      TYPE: 'Stato',
      SCENARIO:
        'Verificare il ripristino/stato iniziale, premendo il Reset dei Filtri (se presenti) e il reimposta dei grid',
      EXPECTED:
        'I parametri assumono i valori di default previsti e si comportano correttamente come in fase di apertura',
      PRIO: 'Programmatore',
    },
    PAGE_NAME: {
      OBJ: 'Nome Pagina (Tab)',
      TYPE: 'UI / Standard',
      SCENARIO:
        'Verificare che il titolo della pagina visualizzato nel tab del browser sia corretto',
      EXPECTED: 'Il titolo corrisponde alla descrizione della maschera ed è conforme agli standard',
      PRIO: 'Programmatore',
    },
    MASK_ALIAS: {
      OBJ: 'Alias Maschera: {0}',
      TYPE: 'Configurazione / jBWT',
      SCENARIO:
        "Verificare che l'alias della pagina sia impostato correttamente per permettere la chiamata da jBWT",
      EXPECTED: 'L\'alias "{0}" è configurato; la maschera è raggiungibile',
      PRIO: 'Programmatore',
    },
  },
  GRID: {
    INSERT_OK: {
      OBJ: 'Grid – Inserimento Record',
      TYPE: 'Permessi / Funzionalità',
      SCENARIO: 'Compilare tutti i campi obbligatori e cliccare Salva per inserire un nuovo record',
      EXPECTED:
        'Il record viene salvato correttamente; la riga appare nella grid con i dati inseriti; nessun messaggio di errore',
      PRIO: 'Programmatore',
    },
    INSERT_KO: {
      OBJ: 'Grid – Inserimento Bloccato',
      TYPE: 'Permessi',
      SCENARIO:
        'Verificare che il pulsante di inserimento non sia presente o sia disabilitato nella toolbar della grid',
      EXPECTED: `Il pulsante di inserimento è assente; non è possibile aggiungere nuovi record dall'utente corrente`,
      PRIO: 'Programmatore',
    },
    UPDATE_OK: {
      OBJ: 'Grid – Modifica Record',
      TYPE: 'Permessi / Funzionalità',
      SCENARIO: 'Selezionare un record esistente, modificare almeno un campo editabile e salvare',
      EXPECTED:
        'La modifica viene salvata correttamente; i valori aggiornati sono visibili nella grid; nessun errore di validazione o di permesso',
      PRIO: 'Programmatore',
    },
    UPDATE_KO: {
      OBJ: 'Grid – Modifica Bloccata',
      TYPE: 'Permessi',
      SCENARIO:
        'Tentare di modificare un campo nella grid; verificare che tutti i campi risultino in sola lettura',
      EXPECTED:
        'I campi sono non modificabili; il pulsante Salva è assente o disabilitato; nessuna modifica può essere apportata',
      PRIO: 'Programmatore',
    },
    DELETE_OK: {
      OBJ: 'Grid – Cancellazione Record',
      TYPE: 'Permessi / Funzionalità',
      SCENARIO:
        'Selezionare un record non referenziato da altri dati e procedere con la cancellazione',
      EXPECTED:
        'Il record viene eliminato; scompare dalla grid dopo il salvataggio; nessun errore di integrità referenziale',
      PRIO: 'Programmatore',
    },
    DELETE_KO: {
      OBJ: 'Grid – Cancellazione Bloccata',
      TYPE: 'Permessi',
      SCENARIO:
        'Verificare che il pulsante di cancellazione non sia presente o sia disabilitato nella toolbar della grid',
      EXPECTED: 'Il pulsante di cancellazione è assente; non è possibile eliminare record',
      PRIO: 'Programmatore',
    },
    FIELD_MANDATORY: {
      OBJ: 'Campo obbligatorio: {0}',
      TYPE: 'Validazione',
      SCENARIO:
        'Lasciare vuoto il campo "{0}", compilare tutti gli altri campi obbligatori e tentare il salvataggio',
      EXPECTED:
        'Il sistema blocca il salvataggio e segnala con errore che il campo "{0}" è obbligatorio',
      PRIO: 'Programmatore',
    },
    FIELD_LENGTH: {
      OBJ: 'Lunghezza max: {0}',
      TYPE: 'Input / Validazione',
      SCENARIO: 'Nel campo "{0}" inserire una stringa maggiore di {1} caratteri',
      EXPECTED: `Il sistema impedisce il salvataggio`,
      PRIO: 'Programmatore',
    },
    FIELD_READONLY: {
      OBJ: 'Campo sola lettura: {0}',
      TYPE: 'UI / Permessi',
      SCENARIO: 'Tentare di modificare il valore del campo "{0}" in modalità edit della grid',
      EXPECTED:
        'Il campo "{0}" risulta non modificabile (read-only o disabilitato); nessuna modifica viene accettata',
      PRIO: 'Programmatore',
    },
    FIELD_REGEX: {
      OBJ: 'Regex campo: {0}',
      TYPE: 'Validazione Formato',
      SCENARIO:
        'Inserire nel campo "{0}" un valore non conforme alla regex ({1}) — es. caratteri non ammessi o formato errato',
      EXPECTED: `Il sistema mostra l'errore di validazione: "{2}"; il salvataggio è bloccato finché il valore non è corretto`,
      PRIO: 'Alta',
    },
    LOGIC_BEFORE_COMMIT: {
      OBJ: 'Controlli al Salvataggio',
      TYPE: 'Business Logic',
      SCENARIO: 'Creare le condizioni di dati che violano la regola e procedere al salvataggio',
      EXPECTED:
        'Il salvataggio viene bloccato e viene mostrato il messaggio: "{2}"; i dati non vengono salvati',
      PRIO: 'Programmatore',
    },
    LOGIC_WECR: {
      OBJ: 'Controllo validazione riga',
      TYPE: 'Validazione (WECR)',
      SCENARIO:
        'Modificare i valori della riga in modo da violare il controllo "{2}" e navigare alla riga successiva o salvare',
      EXPECTED:
        'Il sistema blocca la navigazione/salvataggio e mostra il messaggio a video evidenziando i campi da correggere',
      PRIO: 'Alta',
    },
    LOGIC_WFEV: {
      OBJ: 'Validazione campo: {1}',
      TYPE: 'Validazione (WFEV)',
      SCENARIO:
        'Nel campo "{1}" inserire un valore in modo da violare il controllo "{2}" e uscire dal record',
      EXPECTED: `Il sistema segnala l'errore e il campo viene evidenziato`,
      PRIO: 'Alta',
    },
    LOGIC_WCV: {
      OBJ: 'Validazione alla modifica: {1}',
      TYPE: 'Validazione (WCV)',
      SCENARIO:
        'Modificare il valore del campo "{1}" in modo da violare il controllo "{2}" e uscire dal record',
      EXPECTED: `Il sistema reagisce alla modifica eseguendo i controlli o ricalcoli previsti; in caso di errore mostra l'errore e il campo viene evidenziato`,
      PRIO: 'Programmatore',
    },
    LOGIC_WAF: {
      OBJ: 'Filtro: {0}',
      TYPE: 'Filtro / Ricerca',
      SCENARIO: `Modificare i filtri sulla grid in modo da violare il controllo "{2}" ed eseguire l'applica filtro`,
      EXPECTED: `Il sistema segnala l'errore e non esegue la ricerca`,
      PRIO: 'Programmatore',
    },
    LOGIC_GENERIC: {
      OBJ: 'Controllo logica: {0}',
      TYPE: 'Validazione Business',
      SCENARIO: `Eseguire l'azione "{0}"{1} in condizioni non valide o con dati volutamente errati`,
      EXPECTED: `Il sistema mostra il messaggio di errore atteso: "{2}" e impedisce il completamento dell'operazione`,
      PRIO: 'Alta',
    },
    BUTTON_ACTION: {
      OBJ: 'Pulsante: {0}',
      TYPE: 'Funzionalità',
      SCENARIO: 'Cliccare il pulsante "{0}" nelle condizioni standard di utilizzo',
      EXPECTED: `{1}; l'interfaccia si aggiorna coerentemente e non si verificano errori`,
      PRIO: 'Programmatore',
    },
    LOV_LOAD: {
      OBJ: 'LOV: {0}',
      TYPE: 'UI / Dati',
      SCENARIO: 'Aprire la lista valori "{1}" tramite il relativo campo o pulsante di ricerca',
      EXPECTED:
        'La lista si apre correttamente, è popolata con i valori attesi e permette la selezione; la voce scelta viene riportata nel campo',
      PRIO: 'Programmatore',
    },
    COMBO_LOAD: {
      OBJ: 'Combobox: {0}',
      TYPE: 'UI / Dati',
      SCENARIO: 'Espandere la tendina "{1}" e verificare le opzioni disponibili',
      EXPECTED:
        'Tutte le opzioni previste sono presenti e selezionabili; la selezione aggiorna correttamente il valore del campo',
      PRIO: 'Programmatore',
    },
    LOV_CONFIG: {
      OBJ: 'Configurazione LOV: {0}',
      TYPE: 'UI / UX',
      SCENARIO:
        'Verificare impostazioni: "Search as you type" disabilitato, presenza della lente di ricerca, "Display Null Value" attivo con carattere "-"',
      EXPECTED:
        'La ricerca non parte in automatico; la lente è visibile; i valori nulli sono rappresentati correttamente',
      PRIO: 'Programmatore',
    },
    STD_TEMPLATE: {
      OBJ: 'Template Standard',
      TYPE: 'UI / Uniformità',
      SCENARIO: 'Verificare che la Grid utilizzi il template "Standard"',
      EXPECTED: "La region ha un aspetto uniforme alle altre maschere dell'applicazione",
      PRIO: 'Programmatore',
    },
    PK_CHECK: {
      OBJ: 'Verifica Primary Key',
      TYPE: 'DML / Integrità',
      SCENARIO:
        'Controllare che nella configurazione della Grid sia definita almeno una colonna come Primary Key',
      EXPECTED:
        'PK presente; il posizionamento del record e le operazioni di salvataggio funzionano correttamente',
      PRIO: 'Programmatore',
    },
    EXPORT_CHECK: {
      OBJ: 'Export Excel/PDF',
      TYPE: 'Funzionalità',
      SCENARIO:
        "Eseguire un'estrazione dati e verificare che il foglio/file riporti l'alias corretto",
      EXPECTED: "L'export avviene con successo e il file prodotto è nominato correttamente",
      PRIO: 'Programmatore',
    },
    LAYOUT_CONFIG: {
      OBJ: 'Layout e Report Primario',
      TYPE: 'Configurazione UI',
      SCENARIO:
        'Aggiustare larghezze, ordinamento e filtri di default; salvare la configurazione come Report Primario',
      EXPECTED:
        "Al caricamento della pagina, la Grid si presenta con il layout e l'ordinamento predefinito desiderato",
      PRIO: 'Programmatore',
    },
    FIELD_UPPER: {
      OBJ: 'Text Case UPPER: {0}',
      TYPE: 'UI / Standard',
      SCENARIO: 'Inserire testo in minuscolo nel campo "{0}" e verificare la conversione',
      EXPECTED: 'Il sistema converte automaticamente il testo in MAIUSCOLO',
      PRIO: 'Programmatore',
    },
    FILTER_LOGIC: {
      OBJ: 'Filtraggio Grid',
      TYPE: 'Funzionalità / Query',
      SCENARIO:
        'Impostare filtri su uno o più criteri disponibili nella grid ed eseguire la ricerca; ripetere con combinazioni di filtri',
      EXPECTED:
        'I risultati visualizzati corrispondono esattamente ai criteri impostati; la query applica correttamente tutti i filtri e la grid non mostra record estranei alla selezione',
      PRIO: 'Programmatore',
    },
  },
  ADVICE: {
    TITLE: 'CONSIGLI SU RISOLUZIONE DI PROBLEMI',
    HEADERS: ['Problema', 'Soluzione/Consiglio'],
    ITEMS: [
      [
        'Session State Protection',
        'Verificare che i Page Item hidden non abbiano "Value Protected" su Yes ',
      ],
      [
        'Grid non salva',
        'Controllare che la colonna Primary Key sia impostata come "Primary Key" nella Grid.',
      ],
      [
        'Non mostra dati (lov, combo, grid vuota)',
        'Verificare query e assicurarsi di aver inserito i Page Item in "Page Items to Submit".',
      ],
    ],
  },
};

/**
 * Utility per rimpiazzare i placeholder {0}, {1} etc nelle stringhe della lookup
 */
function tpl(templateObj, ...args) {
  const res = { ...templateObj };
  const format = (s) => s.replace(/{(\d+)}/g, (m, n) => (args[n] !== undefined ? args[n] : m));
  res.OBJ = format(res.OBJ);
  res.SCENARIO = format(res.SCENARIO);
  res.EXPECTED = format(res.EXPECTED);
  return res;
}

// Helper per applicare lo stile bold (funziona se la libreria supporta lo styling, es. xlsx-js-style)
const setBoldHeaders = (ws) => {
  if (!ws || !ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    const firstCell = ws[XLSX.utils.encode_cell({ r: R, c: 0 })];
    if (!firstCell || !firstCell.v) continue;

    const val = String(firstCell.v);
    // Applica bold se: riga 0 (header tabella), oppure testo tutto maiuscolo (titolo sezione),
    // oppure se inizia con parole chiave di intestazione note.
    if (
      R === 0 ||
      val === val.toUpperCase() ||
      ['Name', 'Type', 'Operation', 'Event Name', 'Problema'].includes(val)
    ) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellRef]) continue;
        if (!ws[cellRef].s) ws[cellRef].s = {};
        ws[cellRef].s.font = { bold: true };
      }
    }
  }
};

// Funzione Export Excel
function downloadExcel() {
  if (!currentData) return;

  const wb = XLSX.utils.book_new();

  // 1. Foglio WNFI (When New Form Instance)
  if (
    currentData.whenNewFormInstance.length > 0 ||
    (currentData.formParams && currentData.formParams.length > 0)
  ) {
    const wnfiRows = [];
    if (currentData.moduleInfo) {
      wnfiRows.push(['MODULE INFO']);
      wnfiRows.push([
        `Range Modulo ${currentData.moduleInfo.module}`,
        currentData.moduleInfo.range,
      ]);
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
          if (action.openPopup && action.openPopup.name) {
            wnfiRows.push([
              action.actionName,
              'Open Popup',
              '',
              '',
              `Name: ${action.openPopup.name}`,
            ]);
          }
          action.classes.forEach((item) => {
            if (item.type === 'groovy') {
              wnfiRows.push([
                action.actionName,
                'Groovy',
                item.className,
                item.failMessage || '',
                item.script,
              ]);
            } else if (item.type === 'sql') {
              wnfiRows.push([
                action.actionName,
                'SQL',
                item.className,
                item.failMessage || '',
                item.sql,
              ]);
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

  // 1.5 Foglio GLOBAL ACTIONS (Filtered)
  if (currentData.globalActions && currentData.globalActions.length > 0) {
    const usedActions = new Set();
    if (currentData.whenNewFormInstance) {
      currentData.whenNewFormInstance.forEach((a) => usedActions.add(a));
    }
    if (currentData.grids) {
      currentData.grids.forEach((grid) => {
        if (grid.events) {
          grid.events.forEach((evt) => {
            if (evt.actionRefs) evt.actionRefs.forEach((a) => usedActions.add(a));
          });
        }
        if (grid.topToolbarButtons) {
          grid.topToolbarButtons.forEach((btn) => {
            if (btn.actionRef) btn.actionRef.forEach((a) => usedActions.add(a));
          });
        }
        if (grid.bottomToolbarButtons) {
          grid.bottomToolbarButtons.forEach((btn) => {
            if (btn.actionRef) btn.actionRef.forEach((a) => usedActions.add(a));
          });
        }
      });
    }

    const filteredGlobalActions = currentData.globalActions.filter(
      (action) => !usedActions.has(action.actionName),
    );

    if (filteredGlobalActions.length > 0) {
      const gaRows = [];
      gaRows.push(['GLOBAL ACTIONS (UNUSED/GENERIC)']);
      gaRows.push(['Action', 'Type', 'Class', 'Fail Msg', 'Code']);

      filteredGlobalActions.forEach((action) => {
        if (action.openPopup && action.openPopup.name) {
          gaRows.push([action.actionName, 'Open Popup', '', '', `Name: ${action.openPopup.name}`]);
        }
        action.classes.forEach((item) => {
          if (item.type === 'groovy') {
            gaRows.push([
              action.actionName,
              'Groovy',
              item.className,
              item.failMessage || '',
              item.script,
            ]);
          } else if (item.type === 'sql') {
            gaRows.push([
              action.actionName,
              'SQL',
              item.className,
              item.failMessage || '',
              item.sql,
            ]);
          } else if (item.type === 'paramsList') {
            const paramsText = (item.params || []).map((p) => `${p.name}=${p.alias}`).join('\n');
            gaRows.push([action.actionName, 'Params List', item.className, '', paramsText]);
          }
        });
      });

      const wsGA = XLSX.utils.aoa_to_sheet(gaRows);
      wsGA['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 80 }];
      setBoldHeaders(wsGA, gaRows);
      XLSX.utils.book_append_sheet(wb, wsGA, 'GLOBAL_ACTIONS');
    }
  }

  // 2. Fogli per ogni Grid
  const getOrder = (item) => {
    const order_raw = parseInt(item.order, 10);
    return !isNaN(order_raw) ? order_raw : 9999;
  };

  const popupGridNames = currentData.popups ? currentData.popups.flatMap((p) => p.grids) : [];

  // 1. Standalone grids
  const standaloneGrids = currentData.grids
    .filter((g) => !g.tab && !popupGridNames.includes(g.name))
    .sort((a, b) => getOrder(a) - getOrder(b));

  // 2. Tab grids
  const tabs = {};
  currentData.grids
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
  const popupGrids = currentData.grids
    .filter((g) => popupGridNames.includes(g.name))
    .sort((a, b) => getOrder(a) - getOrder(b));

  const sortedGrids = [...standaloneGrids, ...tabGrids, ...popupGrids];
  sortedGrids.forEach((grid) => {
    const rows = [];

    // Header Info
    rows.push(['GRID INFO']);
    rows.push(['Name', grid.name]);
    rows.push(['Type', grid.type || '']);
    rows.push(['Label', grid.label]);
    rows.push(['Tab', grid.tab ? `${grid.tab.label} (${grid.tab.name})` : '']);
    rows.push([
      'Permissions',
      `I:${grid.insertAllowed} U:${grid.updateAllowed} D:${grid.deleteAllowed}`,
    ]);
    rows.push([]); // Spacer

    // FIELDS
    if (grid.fields && grid.fields.length > 0) {
      rows.push(['FIELDS']);
      rows.push([
        'Name',
        'Label',
        'Type',
        'Length',
        'Mandatory',
        'Editable',
        'Hidden',
        'Regex',
        'Regex Msg',
      ]);
      grid.fields.forEach((f) => {
        const regex = f.validRegex ? f.validRegex.regex : '';
        const regexMsg = f.validRegex ? f.validRegex.message : '';
        rows.push([
          f.name,
          f.label,
          f.tag,
          f.length,
          f.isMandatory,
          f.isEditable,
          f.isHidden,
          regex,
          regexMsg,
        ]);
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
          .map((action) => {
            const parts = [];
            if (action.openPopup && action.openPopup.name) {
              parts.push(`[Open Popup] Name: ${action.openPopup.name}`);
            }
            action.classes.forEach((item) => {
              if (item.type === 'groovy') parts.push(`[Groovy] ${item.script}`);
              if (item.type === 'sql') parts.push(`[SQL] ${item.sql}`);
              if (item.type === 'paramsList') {
                const paramsText = (item.params || [])
                  .map((p) => `${p.name}=${p.alias}`)
                  .join('; ');
                parts.push(`[Params] ${paramsText}`);
              }
            });
            return parts.join('\n');
          })
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
          .map((action) => {
            const parts = [];
            if (action.openPopup && action.openPopup.name) {
              parts.push(`[Open Popup] Name: ${action.openPopup.name}`);
            }
            action.classes.forEach((item) => {
              if (item.type === 'groovy') parts.push(`[Groovy] ${item.script}`);
              if (item.type === 'sql') parts.push(`[SQL] ${item.sql}`);
              if (item.type === 'paramsList') {
                const paramsText = (item.params || [])
                  .map((p) => `${p.name}=${p.alias}`)
                  .join('; ');
                parts.push(`[Params] ${paramsText}`);
              }
            });
            return parts.join('\n');
          })
          .join('\n---\n');
        const params = (btn.params || [])
          .map((p) => `${p.name || ''}${p.alias ? ` (${p.alias})` : ''}`)
          .join('\n');
        rows.push([
          btn.type,
          btn.name,
          btn.label,
          btn.callFormName,
          params,
          btn.actionRef.join(', '),
          scripts,
        ]);
      });
      rows.push([]);
    }

    // Buttons
    if (grid.bottomToolbarButtons.length > 0) {
      rows.push(['BUTTONS']);
      rows.push(['Type', 'Name', 'Label', 'CallForm', 'Params', 'Action Refs', 'Scripts']);
      grid.bottomToolbarButtons.forEach((btn) => {
        const scripts = btn.groovyScripts
          .map((action) => {
            const parts = [];
            if (action.openPopup && action.openPopup.name) {
              parts.push(`[Open Popup] Name: ${action.openPopup.name}`);
            }
            action.classes.forEach((item) => {
              if (item.type === 'groovy') parts.push(`[Groovy] ${item.script}`);
              if (item.type === 'sql') parts.push(`[SQL] ${item.sql}`);
              if (item.type === 'paramsList') {
                const paramsText = (item.params || [])
                  .map((p) => `${p.name}=${p.alias}`)
                  .join('; ');
                parts.push(`[Params] ${paramsText}`);
              }
            });
            return parts.join('\n');
          })
          .join('\n---\n');
        const params = (btn.params || [])
          .map((p) => `${p.name || ''}${p.alias ? ` (${p.alias})` : ''}`)
          .join('\n');
        rows.push([
          btn.type,
          btn.name,
          btn.label,
          btn.callFormName,
          params,
          btn.actionRef.join(', '),
          scripts,
        ]);
      });
      rows.push([]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);

    setBoldHeaders(ws);
    ws['!cols'] = [
      { wch: 20 },
      { wch: 30 },
      { wch: 50 },
      { wch: 30 },
      { wch: 40 },
      { wch: 30 },
      { wch: 50 },
    ];

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

function downloadJSON() {
  if (!currentData) return;

  // 1. Calcoliamo le "Global Actions" non utilizzate (come nel file Excel)
  const usedActions = new Set();

  if (currentData.whenNewFormInstance) {
    currentData.whenNewFormInstance.forEach((a) => usedActions.add(a));
  }

  if (currentData.grids) {
    currentData.grids.forEach((grid) => {
      if (grid.events) {
        grid.events.forEach((evt) => {
          if (evt.actionRefs) evt.actionRefs.forEach((a) => usedActions.add(a));
        });
      }
      if (grid.topToolbarButtons) {
        grid.topToolbarButtons.forEach((btn) => {
          if (btn.actionRef) btn.actionRef.forEach((a) => usedActions.add(a));
        });
      }
      if (grid.bottomToolbarButtons) {
        grid.bottomToolbarButtons.forEach((btn) => {
          if (btn.actionRef) btn.actionRef.forEach((a) => usedActions.add(a));
        });
      }
    });
  }

  // Creiamo un clone dell'oggetto originale per non sporcare currentData
  const exportData = {
    ...currentData,
    // Aggiungiamo il dato filtrato che prima mettevamo nel foglio Excel dedicato
    unusedGlobalActions: (currentData.globalActions || []).filter(
      (action) => !usedActions.has(action.actionName),
    ),
  };

  // 2. Convertiamo l'oggetto in una stringa JSON formattata (indentazione a 2 spazi)
  const jsonString = JSON.stringify(exportData, null, 2);

  // 3. Creiamo un Blob con il contenuto JSON
  const blob = new Blob([jsonString], { type: 'application/json' });

  // 4. Creiamo un URL temporaneo per il Blob
  const url = URL.createObjectURL(blob);

  // 5. Creiamo un elemento <a> invisibile per innescare il download
  const a = document.createElement('a');
  a.href = url;

  // Otteniamo il nome del file (sostituendo .xml con .json)
  const docTitle = currentFilename ? currentFilename.replace(/\.xml$/i, '') : 'export';
  a.download = `${docTitle}.json`;

  // 6. Aggiungiamo al DOM, clicchiamo e rimuoviamo (pulizia)
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Funzione Export Test Cases
function downloadTestCases() {
  if (!currentData) return;

  const wb = XLSX.utils.book_new();
  const rows = [];

  // Intestazioni
  const headers = [
    'ID',
    'Area/Grid',
    'Oggetto',
    'Tipo Test',
    'Test',
    'Risultato Atteso',
    'Codice Riferimento',
    'Esito (OK/KO)',
    'Note',
    'Esito (OK/KO) post correzione',
  ];
  rows.push(headers);

  let testId = 1;

  // Helper per aggiungere righe
  const addTest = (
    area,
    oggetto,
    tipo,
    scenario,
    atteso,
    priorita = 'Programmatore',
    codice = '',
  ) => {
    rows.push([testId++, area, oggetto, tipo, scenario, atteso, codice, '']);
  };

  // 1. Test Globali (When New Form Instance)
  if (currentData.whenNewFormInstance && currentData.whenNewFormInstance.length > 0) {
    let codeRef = '';
    if (currentData.whenNewFormInstanceGroovy && currentData.whenNewFormInstanceGroovy.length > 0) {
      codeRef = currentData.whenNewFormInstanceGroovy
        .map((action) =>
          action.classes
            .map((c) => {
              if (c.type === 'paramsList')
                return `[Params] ${(c.params || []).map((p) => `${p.name}=${p.alias}`).join('; ')}`;
              return `[${c.type}] ${c.script || c.sql}`;
            })
            .join('\n'),
        )
        .join('\n---\n');
    }
    const g = tpl(TEST_TEMPLATES.GLOBAL.FORM_LOAD, currentData.whenNewFormInstance.join(', '));
    addTest('Global', g.OBJ, g.TYPE, g.SCENARIO, g.EXPECTED, g.PRIO, codeRef);
  }

  // 1.1 Test Parametri (Stato Iniziale)
  if (currentData.formParams && currentData.formParams.length > 0) {
    const paramNames = currentData.formParams.map((p) => p.name).join(', ');
    const p = tpl(TEST_TEMPLATES.GLOBAL.PARAM_RESET, paramNames);
    addTest('Global', p.OBJ, p.TYPE, p.SCENARIO, p.EXPECTED, p.PRIO);
  }

  // 1.2 Nuovi Test Globali (Page Name & Alias)
  const pg = TEST_TEMPLATES.GLOBAL.PAGE_NAME;
  addTest('Global', pg.OBJ, pg.TYPE, pg.SCENARIO, pg.EXPECTED, pg.PRIO);
  const al = tpl(
    TEST_TEMPLATES.GLOBAL.MASK_ALIAS,
    currentFilename.replace(/\.xml$/i, '').toLowerCase(),
  );
  addTest('Global', al.OBJ, al.TYPE, al.SCENARIO, al.EXPECTED, al.PRIO);

  // 2. Iterazione su Grids
  currentData.grids.forEach((grid) => {
    let labelInfo = grid.label;
    if (!labelInfo && grid.tab && grid.tab.label) {
      labelInfo = `Tab: ${grid.tab.label}`;
    }
    const gridName = labelInfo ? `${labelInfo} (${grid.name})` : grid.name;

    // A. Permessi CRUD
    if (grid.insertAllowed === 'true') {
      const p = TEST_TEMPLATES.GRID.INSERT_OK;
      addTest(gridName, p.OBJ, p.TYPE, p.SCENARIO, p.EXPECTED, p.PRIO);
    } else {
      const p = TEST_TEMPLATES.GRID.INSERT_KO;
      addTest(gridName, p.OBJ, p.TYPE, p.SCENARIO, p.EXPECTED, p.PRIO);
    }

    if (grid.updateAllowed === 'true') {
      const p = TEST_TEMPLATES.GRID.UPDATE_OK;
      addTest(gridName, p.OBJ, p.TYPE, p.SCENARIO, p.EXPECTED, p.PRIO);
    } else {
      const p = TEST_TEMPLATES.GRID.UPDATE_KO;
      addTest(gridName, p.OBJ, p.TYPE, p.SCENARIO, p.EXPECTED, p.PRIO);
    }

    if (grid.deleteAllowed === 'true') {
      const p = TEST_TEMPLATES.GRID.DELETE_OK;
      addTest(gridName, p.OBJ, p.TYPE, p.SCENARIO, p.EXPECTED, p.PRIO);
    } else {
      const p = TEST_TEMPLATES.GRID.DELETE_KO;
      addTest(gridName, p.OBJ, p.TYPE, p.SCENARIO, p.EXPECTED, p.PRIO);
    }

    // A.1 Test Configurazione Standard Grid
    const st = TEST_TEMPLATES.GRID.STD_TEMPLATE;
    addTest(gridName, st.OBJ, st.TYPE, st.SCENARIO, st.EXPECTED, st.PRIO);
    const pk = TEST_TEMPLATES.GRID.PK_CHECK;
    addTest(gridName, pk.OBJ, pk.TYPE, pk.SCENARIO, pk.EXPECTED, pk.PRIO);
    const ex = TEST_TEMPLATES.GRID.EXPORT_CHECK;
    addTest(gridName, ex.OBJ, ex.TYPE, ex.SCENARIO, ex.EXPECTED, ex.PRIO);
    const ly = TEST_TEMPLATES.GRID.LAYOUT_CONFIG;
    addTest(gridName, ly.OBJ, ly.TYPE, ly.SCENARIO, ly.EXPECTED, ly.PRIO);

    // B. Test Filtro Dati (se presente logica di query o template)
    if (grid.rpcExpand || (grid.templates && Object.keys(grid.templates).length > 0)) {
      const p = TEST_TEMPLATES.GRID.FILTER_LOGIC;
      addTest(gridName, p.OBJ, p.TYPE, p.SCENARIO, p.EXPECTED, p.PRIO);
    }

    // B. Campi (Validazioni UI)
    grid.fields.forEach((field) => {
      // Esclusione campi hidden
      if (field.isHidden === 'true') return;
      if (field.name && field.name.includes('F_SEL')) return;

      const fieldName = field.label || field.name;

      // Editabilità (testiamo il readonly puntuale solo se la grid in generale permette l'update)
      if (
        grid.updateAllowed === 'true' &&
        (field.isEditable === 'false' || field.updateAllowed === 'false')
      ) {
        const p = tpl(TEST_TEMPLATES.GRID.FIELD_READONLY, fieldName);
        addTest(gridName, p.OBJ, p.TYPE, p.SCENARIO, p.EXPECTED, p.PRIO);
      } else {
        // Test Text Case UPPER per campi editabili
        if (field.isEditable !== 'false') {
          const up = tpl(TEST_TEMPLATES.GRID.FIELD_UPPER, fieldName);
          addTest(gridName, up.OBJ, up.TYPE, up.SCENARIO, up.EXPECTED, up.PRIO);
        }

        // Obbligatorietà
        if (
          field.isEditable !== 'false' &&
          field.isMandatory === 'true' &&
          (grid.insertAllowed === 'true' || grid.updateAllowed === 'true')
        ) {
          const p = tpl(TEST_TEMPLATES.GRID.FIELD_MANDATORY, fieldName);
          addTest(gridName, p.OBJ, p.TYPE, p.SCENARIO, p.EXPECTED, p.PRIO);
        }
        // Lunghezza
        if (
          grid.updateAllowed === 'true' &&
          (field.isEditable === 'true' || field.updateAllowed === 'true') &&
          field.length &&
          parseInt(field.length) > 0
        ) {
          const p = tpl(TEST_TEMPLATES.GRID.FIELD_LENGTH, fieldName, field.length);
          addTest(gridName, p.OBJ, p.TYPE, p.SCENARIO, p.EXPECTED, p.PRIO);
        }

        // ValidRegex
        if (field.isEditable !== 'false' && field.validRegex) {
          const p = tpl(
            TEST_TEMPLATES.GRID.FIELD_REGEX,
            fieldName,
            field.validRegex.regex,
            field.validRegex.message || 'Errore validazione',
          );
          addTest(gridName, p.OBJ, p.TYPE, p.SCENARIO, p.EXPECTED, p.PRIO);
        }
      }
    });

    // C. Validazioni Logiche (Before Commit)
    grid.beforeCommitValidation.forEach((bc) => {
      const p = tpl(
        TEST_TEMPLATES.GRID.LOGIC_BEFORE_COMMIT,
        bc.name,
        bc.function || 'SQL Check',
        bc.failMessage,
      );
      addTest(gridName, p.OBJ, p.TYPE, p.SCENARIO, p.EXPECTED, p.PRIO, bc.sql || '');
    });

    // C.2 Eventi con Fail Message (Controlli)
    grid.events.forEach((evt) => {
      const evtName = evt.name.toLowerCase();
      let template = TEST_TEMPLATES.GRID.LOGIC_GENERIC;
      if (evtName.includes('whenexitchangedrecord')) template = TEST_TEMPLATES.GRID.LOGIC_WECR;
      else if (evtName.includes('whenfinishedit')) template = TEST_TEMPLATES.GRID.LOGIC_WFEV;
      else if (evtName.includes('whenchangevalue')) template = TEST_TEMPLATES.GRID.LOGIC_WCV;
      else if (evtName.includes('whenapplyfilter')) template = TEST_TEMPLATES.GRID.LOGIC_WAF;

      if (evt.groovyScripts && evt.groovyScripts.length > 0) {
        evt.groovyScripts.forEach((action) => {
          if (action.classes && action.classes.length > 0) {
            action.classes.forEach((cls) => {
              if (cls.failMessage) {
                const fieldName = evt.context || '';
                // Recupero la label del campo (se presente) per rendere il test plan più leggibile
                const fieldObj = fieldName ? grid.fields.find((f) => f.name === fieldName) : null;
                const fieldLabel = fieldObj && fieldObj.label ? fieldObj.label : fieldName;

                const contextMsg = fieldLabel ? ` sul campo "${fieldLabel}"` : '';
                const arg1 =
                  template === TEST_TEMPLATES.GRID.LOGIC_GENERIC ? contextMsg : fieldLabel;
                const p = tpl(template, evt.name, arg1, cls.failMessage);
                addTest(
                  gridName,
                  p.OBJ,
                  p.TYPE,
                  p.SCENARIO,
                  p.EXPECTED,
                  p.PRIO,
                  cls.script || cls.sql || '',
                );
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
      if (btnLabel === 'Esegui filtro' || btnLabel === 'Pulisci filtro' || btnLabel === 'Indietro')
        return;

      let actionDesc = 'Esecuzione azione';
      if (btn.callFormName) actionDesc = `Apertura form/popup`;
      else if (btn.actionRef.length > 0)
        actionDesc = `Esecuzione logica: ${btn.actionRef.join(', ')}`;

      let codeRef = '';
      if (btn.groovyScripts && btn.groovyScripts.length > 0) {
        codeRef = btn.groovyScripts
          .map((action) =>
            action.classes
              .map((c) => {
                if (c.type === 'paramsList')
                  return `[Params] ${(c.params || []).map((p) => `${p.name}=${p.alias}`).join('; ')}`;
                return `[${c.type}] ${c.script || c.sql}`;
              })
              .join('\n'),
          )
          .join('\n---\n');
      }
      const p = tpl(TEST_TEMPLATES.GRID.BUTTON_ACTION, btnLabel, actionDesc);
      addTest(gridName, p.OBJ, p.TYPE, p.SCENARIO, p.EXPECTED, p.PRIO, codeRef);
    });

    // E. LOV e Combobox
    grid.listOfValues.forEach((lov) => {
      const p = tpl(TEST_TEMPLATES.GRID.LOV_LOAD, lov.label || lov.name, lov.label || lov.name);
      addTest(gridName, p.OBJ, p.TYPE, p.SCENARIO, p.EXPECTED, p.PRIO, lov.value || '');
      // Test Configurazione UI LOV
      const cf = tpl(TEST_TEMPLATES.GRID.LOV_CONFIG, lov.label || lov.name);
      addTest(gridName, cf.OBJ, cf.TYPE, cf.SCENARIO, cf.EXPECTED, cf.PRIO);
    });

    grid.comboboxes.forEach((combo) => {
      const p = tpl(
        TEST_TEMPLATES.GRID.COMBO_LOAD,
        combo.label || combo.name,
        combo.label || combo.name,
      );
      addTest(gridName, p.OBJ, p.TYPE, p.SCENARIO, p.EXPECTED, p.PRIO, combo.sqlValue || '');
      // Nota: Le combo non hanno ricerca e lente, quindi non aggiungiamo LOV_CONFIG qui
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
  setBoldHeaders(ws);

  XLSX.utils.book_append_sheet(wb, ws, 'Test Plan');

  // Aggiunta foglio "Consigli su risoluzione di problemi"
  const adviceRows = [];
  adviceRows.push([TEST_TEMPLATES.ADVICE.TITLE]);
  adviceRows.push([]);
  adviceRows.push(TEST_TEMPLATES.ADVICE.HEADERS);
  TEST_TEMPLATES.ADVICE.ITEMS.forEach((item) => adviceRows.push(item));

  const wsAdvice = XLSX.utils.aoa_to_sheet(adviceRows);
  wsAdvice['!cols'] = [
    { wch: 40 }, // Problema
    { wch: 70 }, // Soluzione
  ];

  // Applica grassetto all'header
  setBoldHeaders(wsAdvice);

  XLSX.utils.book_append_sheet(wb, wsAdvice, 'Consigli');

  const docTitle = currentFilename.replace(/\.xml$/i, '');
  XLSX.writeFile(wb, `${docTitle}_TestCases.xlsx`);
}
