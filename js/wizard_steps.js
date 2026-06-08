const wizardSteps = [
  {
    id: 'step_1',
    title: 'Step 1: Grid',
    substeps: [
      {
        id: 'sub_1_1',
        title: 'Creazione',
        description: 'Crea un Interactive Grid con la seguente query',
        notaBene: `<h4 style="color: #b45309; font-weight:bold; margin-bottom:8px;">Bind Variables</h4>
                <p class="text-sm">Per ogni bind variable presente nella query (es. :P_ID), definire un Page Item in APEX con le seguenti caratteristiche:</p>
                <ul style="margin-left: 20px; margin-top: 5px;" class="text-sm">
                    <li><strong>Type:</strong> Hidden</li>
                    <li><strong>Value Protected:</strong> No</li>
                    <li><strong>Session State:</strong> Per Request (Memory Only) o come appropriato</li>
                </ul>
                <p class="text-sm" style="margin-top: 5px;">Passare questi item nella sezione <strong>"Page Items to Submit"</strong> della region Interactive Grid.</p>
                <h4 style="color: #b45309; font-weight:bold; margin-bottom:8px;">Primary Key</h4>
                <p class="text-sm">Assicurarsi di impostare la colonna Primary Key nella Grid</p>`,
        content: (grid) => {
          let html = '';
          if (grid.rpcExpand) {
            html += `<h4 class="info-label mb-2">Query Principale (RPC Expand)</h4>`;
            html += renderCodeBlock(grid.rpcExpand, `wiz-step1-rpc-${grid.name}`);
          }
          if (grid.templates && Object.keys(grid.templates).length > 0) {
            html += `<h4 class="info-label mb-2 mt-4">Templates</h4>`;
            Object.keys(grid.templates).forEach((k, idx) => {
              html += `<h5 class="text-sm font-bold mt-2">${k}</h5>`;
              html += renderCodeBlock(grid.templates[k], `wiz-step1-tpl-${grid.name}-${idx}`);
            });
          }

          return html;
        },
      },
      {
        id: 'sub_1_2',
        title: 'Caratteristiche e Posizionamento',
        description: "Definisci le caratteristiche standard e verifica dove la grid è posizionata all'interno dell'applicazione (in un tab o in un popup).",
        content: (grid, allData) => {
          let html = '<ul class="list-disc pl-5 space-y-2">';
          html += `<li><strong>Static ID:</strong> <code>${grid.name.toUpperCase()}</code></li>`;
          html += `<li><strong>Template:</strong> Standard</li>`;

          // Positioning
          let pos = 'Non determinato';
          if (grid.tab) pos = `Tab "${grid.tab.label}" (${grid.tab.name})`;
          else {
            const popup = allData.popups.find((p) => p.grids.includes(grid.name));
            if (popup) pos = `Popup "${popup.name}"`;
          }
          html += `<li><strong>Posizionamento:</strong> ${pos}</li>`;

          // Editability
          const isEditable = grid.insertAllowed === 'true' || grid.updateAllowed === 'true' || grid.deleteAllowed === 'true';
          if (isEditable) {
            html += `<li><strong>Editabilità:</strong> La grid è modificabile.
                    <ul class="list-circle pl-5 mt-1" style="margin-left: 20px;">
                        <li>Abilitare "Edit" nelle impostazioni della Grid.</li>
                        <li>Configurare "Allowed Operations": 
                            ${grid.insertAllowed === 'true' ? 'Add Row, ' : ''}
                            ${grid.updateAllowed === 'true' ? 'Update Row, ' : ''}
                            ${grid.deleteAllowed === 'true' ? 'Delete Row' : ''}
                        </li>
                        <li>Togliere flag Add Row if Empty</li>
                        <li>Aggiungere plugin Toolbar in Page Load</li>
                    </ul>
                </li>`;
          } else {
            html += `<li><strong>Editabilità:</strong> Read Only. Disabilitare le operazioni di modifica.</li>`;
          }
          html += '</ul>';
          return html;
        },
      },
      {
        id: 'sub_1_3',
        title: 'Statement',
        description: 'Gestisci le operazioni DML attraverso il relativo processo DML',
        content: (grid) => {
          if (!grid.checkAndSaveData) return '<p class="text-gray">Nessuna logica DML personalizzata rilevata (CheckAndSaveData).</p>';
          let html = '';
          ['insert', 'update', 'delete'].forEach((op) => {
            if (grid.checkAndSaveData[op] && grid.checkAndSaveData[op].length > 0) {
              html += `<h4 class="info-label mb-2 mt-3" style="text-transform:uppercase;">${op}</h4>`;
              grid.checkAndSaveData[op].forEach((sql, idx) => {
                html += renderCodeBlock(sql, `wiz-step1-dml-${grid.name}-${op}-${idx}`);
              });
            }
          });
          return html || '<p class="text-gray">Nessuna logica DML specifica trovata.</p>';
        },
      },
    ],
  },
  {
    id: 'step_2',
    title: 'Step 2: Fields',
    substeps: [
      {
        id: 'sub_2_1',
        title: 'Tipologia e Impostazioni',
        description: 'Applica la tipologia corretta per ogni fields',
        notaBene: `<h4 style="color: #b45309; font-weight:bold; margin-bottom:8px;">Read Only</h4>
                <p class="text-sm">Per ogni fields che è Read Only impostare la classe <strong>"custom-readonly"</strong> nell'Appearence CSS Class dell'item.</p>`,
        content: (grid) => {
          let html = `<table class="table"><thead><tr><th>Field</th><th>Type</th><th>Hint (riportare solo se significativa)</th><th>Settings & Notes</th></tr></thead><tbody>`;
          //console.log('Fields da processare:', grid.fields);
          grid.fields.forEach((f) => {
            let notes = [];
            if (f.isMandatory === 'true') notes.push('<span class="badge badge-red">Required</span>');
            if (f.isHidden === 'true') {
              notes.push('<span class="badge badge-gray">Hidden</span>');
            } else {
              if (f.isEditable === 'false') notes.push('<span class="badge badge-yellow">custom-readonly</span>');
            }

            if (f.length) notes.push(`Max Length: <strong>${f.length}</strong>`);

            if (f.tag === 'checkbox') {
              notes.push('Type: <strong>Checkbox</strong>');
              notes.push('Value Required:<strong>NO</strong>');
              notes.push('Default Value:<strong>N</strong>');
            }

            const lov = grid.listOfValues.find((l) => l.name === f.name);
            if (lov) {
              const safeGridName = grid.name.replace(/'/g, "\\'");
              const safeLovName = lov.name.replace(/'/g, "\\'");
              notes.push(`LOV: <a href="javascript:void(0)" onclick="window.showLovDetails('${safeGridName}', '${safeLovName}', 'lov')" style="color: #2563eb; text-decoration: underline; font-weight: bold;">${lov.name}</a>`);
              notes.push('Display as: <strong>Modal Dialog</strong>');
              notes.push('Search As you Type: <strong>NO</strong>');
              notes.push('Title: <strong>Plurale del nome del LOV</strong>');
              notes.push('Display Extra Values: <strong>SI</strong>');
              notes.push('Display null Values: <strong>SI</strong>');
              notes.push('Null Display Values: <strong>"-"</strong>');
            }

            const combo = grid.comboboxes.find((c) => c.name === f.name);
            if (combo) {
              const safeGridName = grid.name.replace(/'/g, "\\'");
              const safeComboName = combo.name.replace(/'/g, "\\'");
              notes.push(`Combobox: <a href="javascript:void(0)" onclick="window.showLovDetails('${safeGridName}', '${safeComboName}', 'combo')" style="color: #2563eb; text-decoration: underline; font-weight: bold;">${combo.name}</a>`);
            }

            html += `<tr>
                    <td><strong>${f.name}</strong><br><span class="text-xs text-gray">${f.label || ''}</span></td>
                    <td>${f.tag}</td>
                    <td>${f.hint || ''}</td>
                    <td>${notes.join('<br>')}</td>
                </tr>`;
          });
          html += `</tbody></table>`;

          return html;
        },
      },
    ],
  },
  {
    id: 'step_3',
    title: 'Step 3: Button',
    substeps: [
      {
        id: 'sub_3_1',
        title: 'Button',
        description: 'Configura i pulsanti della toolbar.',
        content: (grid) => {
          const buttons = [...grid.topToolbarButtons, ...grid.bottomToolbarButtons];
          if (buttons.length === 0) return '<p class="text-gray">Nessun bottone definito.</p>';
          let html = '';
          buttons.forEach((btn, idx) => {
            html += `<div class="mb-4 p-4 border border-gray-200 rounded bg-white">`;
            html += `<div class="flex items-center gap-2 mb-2"><span class="badge badge-blue">${btn.type}</span> <h4 class="font-bold">${btn.label || btn.name}</h4></div>`;
            if (btn.callFormName) html += `<p class="text-sm mb-2"><strong>CallForm:</strong> ${btn.callFormName}</p>`;

            if (btn.type === 'callFormButton') html += renderCallFormHint(btn.callFormName);

            if (btn.params && btn.params.length > 0) {
              html += `<div class="text-sm mb-2"><strong>Params:</strong> ${btn.params.map((p) => `${p.name}=${p.alias}`).join(', ')}</div>`;
            }

            if (btn.groovyScripts && btn.groovyScripts.length > 0) {
              html += `<div class="mt-2"><p class="text-sm font-bold text-indigo-600 mb-1">Scripts:</p>`;
              html += renderGroovyScripts(btn.groovyScripts, `wiz-btn-${grid.name}-${idx}`);
              html += `</div>`;
            }
            html += `</div>`;
          });
          return html;
        },
      },
      {
        id: 'sub_3_2',
        title: 'Dipendenze Maschere',
        description: 'Verifica se la maschera corrente deve essere richiamata da altre maschere configurate.',
        content: (grid) => {
          const currentForm = currentFilename.replace(/\.xml$/i, '').toUpperCase();
          const deps = appSettings.dependencies || {};
          const callers = [];

          for (const [caller, calledList] of Object.entries(deps)) {
            const isCalled = Array.isArray(calledList) && calledList.some((f) => f.toUpperCase() === currentForm);

            if (isCalled) {
              callers.push(caller);
            }
          }

          if (callers.length === 0) {
            return '<p class="text-gray">Nessuna maschera chiamante configurata per questo modulo nelle impostazioni.</p>';
          }

          let html = '<div class="description-box" style="background: #f0fdf4; border-color: #22c55e;">';
          html += `<h4 style="color: #166534; font-weight:bold; margin-bottom:8px;">⚠️ Azione su Maschera Chiamante</h4>`;
          html += `<p class="text-sm">La maschera corrente (<strong>${currentForm}</strong>) risulta essere richiamata dalle seguenti maschere:</p>`;
          html += '<ul style="margin-left: 20px; margin-top: 10px;" class="text-sm">';
          callers.forEach((c) => (html += `<li><strong>${c}</strong></li>`));
          html += '</ul>';
          html += '<p class="text-sm" style="margin-top: 12px;"><strong>Istruzioni:</strong> Ricordati di aggiungere il pulsante o il link di apertura su APEX nelle maschere sopra elencate.</p>';
          html += '</div>';
          return html;
        },
      },
    ],
  },
  {
    id: 'step_4',
    title: 'Step 4: Controlli al salvataggio',
    substeps: [
      {
        id: 'sub_4_1',
        title: 'BeforeCommitValidation',
        description: 'Validazioni da eseguire prima del salvataggio (PL/SQL).',
        notaBene: `<p class="text-sm">Nel processo oncommit si effettua il raise per visualizzare il messaggio nell'Error Message del processo, impostare <strong>#SQLERRM_TEXT#</strong></p>`,
        content: (grid) => {
          if (grid.beforeCommitValidation.length === 0) return '<p class="text-gray">Nessuna validazione Before Commit.</p>';
          let html = '';
          grid.beforeCommitValidation.forEach((bc, idx) => {
            html += `<div class="mb-4"><h4 class="info-label mb-1">${bc.name}</h4>`;
            if (bc.failMessage) html += `<p class="text-red-600 text-sm mb-2"><strong>Fail Message:</strong> ${bc.failMessage}</p>`;
            html += renderCodeBlock(bc.sql, `wiz-bc-${grid.name}-${idx}`);
            html += `</div>`;
          });
          return html;
        },
      },
    ],
  },
  {
    id: 'step_5',
    title: 'Step 5: Controlli al WECR',
    substeps: [
      {
        id: 'sub_5_1',
        title: 'When Exit Changed Record',
        description: 'Attivazione della logica WhenExitChangedRecord-Plugin',
        content: (grid) => {
          let html = '';
          html += `<ul style="margin-left: 20px; margin-top: 5px;" class="text-sm">
                    <li>Nel <strong>Page Load</strong> creare una dynamic action con nome ad esempio WhenExitChangedRecord</li>
                    <li>Creare un azione true di tipo <strong>WhenExitChangedRecord [Plug-In]</strong></li>
                    <li>Impostare <strong>Selection Type: Region</strong></li>
                    <li>Impostare <strong>Region: ${grid.name}</strong></li>
                </ul>`;
          return html;
        },
      },
      {
        id: 'sub_5_2',
        title: 'Ajax callback per il WECR',
        description: 'Creazione di una Ajax Callback per gestire la logica di validazione al WhenExitChangedRecord, con comunicazione tra JavaScript e PL/SQL',
        content: (grid) => {
          let html = '';
          html += `<ul style="margin-left: 20px; margin-top: 5px;" class="text-sm">
                    <li>Nei Processing della pagina, posizionarsi su Ajax Callback e creare un nuovo processo con le seguenti proprietà:
                        <ul class="list-disc pl-5 mt-1" style="margin-left: 20px;">
                            <li><strong>Name:</strong> CTR_WECR_LIM_ORG</li>
                            <li><strong>Type:</strong> Execute Code</li>
                            <li><strong>Editable Region:</strong> null (in quanto sarà richiamato direttamente da javascript)</li>
                            <li><strong>Language:</strong> PL/SQL</li>
                        </ul>
                    </li>`;
          html += `<li>Definizione PLSQL (Nel caso in cui il codice risulti troppo lungo, è necessario creare una procedura/funzioni su DB)</li>`;
          html += renderCodeBlock(
            `declare
			-- variabili per messaggio di errore ed elenco dei campi da evidenziare 
			V_T_ELE_ITM VARCHAR2(1000) := NULL;
			V_T_MSG     VARCHAR2(3200) := NULL; 

			-- variabili per recuperare i parametri passati all'ajax + variabili generiche per controlli
			V_C_SOC             TO001_SOC.C_SOC%TYPE;
			V_C_TIP_LIM         TC019_LIM_ORG.C_TIP_LIM%TYPE;
			V_D_INI_VAL_TC017   date;

			V_T_ERR             VARCHAR2(3200);
		BEGIN        
			-- si apre il json, per recuperare i parametri in input e per valorizzare i parametri di output
			APEX_JSON.OPEN_OBJECT;
		   
			-- si mappa i parametri passati in input alle variabili
			V_C_SOC := apex_application.g_x01;
			V_C_TIP_LIM := apex_application.g_x02;
			V_D_INI_VAL_TC017 := apex_application.g_x03; 
		 
			-- si effettuano i controlli
			if (DEFINIZIONE CONTROLLI) then
				
			   -- in questo caso, valorizzo le variabili che saranno mandate in output nel seguente modo:
			   -- V_T_ELE_ITM: con la concatenazione delle colonne (col nome di come sono estrarre su IG) e separate da ,
			   -- V_T_MSG: con il messaggio di errore
			   
			   V_T_ELE_ITM := '${grid.name}_C_SOC,${grid.name}_C_CLU_GRC_PDV,${grid.name}_N_PRG_ENT_PDV,${grid.name}_N_PRG_ENT_MGZ,${grid.name}_C_TIP_CNS';
         -- recuperare messaggio di errore da tabella dei messaggi, esempio:
			   V_T_MSG := '04079 - '||KS002_STD.F_MSG('04079');
			end if;

			-- scrivo in output l'elenco dei campi e il messaggio di errore
			-- cosi che il javascript li possa conoscere in tEleItm e tMsg
			
			APEX_JSON.WRITE( p_name  => 'v_t_ele_itm'
						, p_value => v_t_ele_itm
						);
			APEX_JSON.WRITE( p_name  => 'v_t_msg'
						, p_value => v_t_msg
						);
			-- Close the Object instance
			APEX_JSON.CLOSE_OBJECT;
		end;`,
            `wiz-wecr-vars-5_2_1`,
          );
          html += `<li>Questi i controlli attuali</li>`;
          const validationEvents = grid.events.filter((e) => ['whenexitchangedrecord', 'whenvalidateitem', 'whenfinisheditvalue', 'whenchangevalue'].includes(e.name.toLowerCase()));
          if (validationEvents.length === 0) {
            html += '<p class="text-gray">Nessun evento di validazione UI trovato.</p>';
          } else {
            validationEvents.forEach((evt, idx) => {
              html += renderEventBlock(evt, 0, `wiz-val-${grid.name}-${idx}`);
            });
          }
          html += `</ul>`;
          return html;
        },
      },
      {
        id: 'sub_5_3',
        title: 'Configurazione ',
        description: 'Configurazione del "Function and Global Variable Declaration" della pagina per gestire il WhenExitChangedRecord',
        content: (grid) => {
          let html = '';
          html += `<ul style="margin-left: 20px; margin-top: 5px;" class="text-sm">
                    <li>Creare le seguenti variabili</li>`;
          html += renderCodeBlock(
            `// sono variabili necessarie per visualizzare il messaggio di errore sui campi controllati
          let tMsg;
            let tItem;`,
            `wiz-wecr-vars-5_3_1`,
          );
          html += `<li>Creare una variabile per ogni campo che si vuole controllare, esempio:</li>`;
          html += renderCodeBlock(
            `// sono variabili necessarie per visualizzare il messaggio di errore sui campi controllati
          let idx_${grid.name.toLowerCase()}cSoc;
			let idx_${grid.name.toLowerCase()}cTipLim;
			let idx_${grid.name.toLowerCase()}cTipCns;`,
            `wiz-wecr-vars-5_3_2`,
          );
          html += `<li>Definire un array con l'elenco delle colonne che si vogliono controllare, esempio:</li>`;
          html += renderCodeBlock(
            `let itemsLimitazioniOrganizzative= ['${grid.name}_C_TIP_LIM',
                                    '${grid.name}_C_SOC',
                                    '${grid.name}_C_TIP_CNS'];`,
            `wiz-wecr-vars-5_3_3`,
          );
          html += `<li>creare una funzione, esempio "controlliLimitazioniOrganizzative" (il nome per la funzione è libero, è buona norma dare un riferimento sulla region che si controlla)</li>`;
          html += renderCodeBlock(
            `function controlliLimitazioniOrganizzative(record,itemsChanged) {             
              // si richiama l'ajax callback dove si effettuano i controlli PLSQL
              apex.server.process(                              
              'CTR_WECR_LIM_ORG', // nome dell'ajax        
              {                           
                // parametri di ingresso del plsql   
                // in questo modo si usa gli indici creati sopra per recupare il valore
                // nel caso in cui la colonna sia una select list oppure una popup lov si concatena .v (altrimenti viene passato l'object [null,null]
                x01: record.record[idx_${grid.name.toLowerCase()}cSoc].v,  
                x02: record.record[idx_${grid.name.toLowerCase()}cTipLim].v,  
                x03: apex.item("Pxxxx_D_INI").getValue()
              },                                              
              {                                               
                dataType: 'json',                             
                async: false,                                 
                success: function (pData) {                   
                console.log('success');                     
                // si valorizza le variabili tMsg e tItem con i parametri di output dell'ajax
                tMsg = pData.v_t_msg;                       
                tItem = pData.v_t_ele_itm;                  
                }                                             
              }                                               
              );                                                
            }`,
            `wiz-wecr-vars-5_3_4`,
          );
          html += `<li>Creare la funzione necessaria per comunicare con il plugin (<strong>SOLO SE NON GIA' DEFINITA</strong>)</li>`;
          html += renderCodeBlock(
            `function controlliWECR(region, view, record, itemsChanged) {
			  
			  // la funzione in input prenderà la region, dobbiamo creare un if sullo static ID per verificare che la region in modifica
			  
			  if (region === '${grid.name}') {
			  
				// per ogni variabile idx_... si recupera l'indice delle colonne che si vuole controllare nel WECR
				
				//recupero degli indici dei campi utilizzati nel controlli del WhenExitChangedRecord
				idx_${grid.name.toLowerCase()}cSoc = view.grid.model.getFieldKey('${grid.name}_C_SOC');
				idx_${grid.name.toLowerCase()}cTipLim = view.grid.model.getFieldKey('${grid.name}_C_TIP_LIM');
				idx_${grid.name.toLowerCase()}cTipCns = view.grid.model.getFieldKey('${grid.name}_C_TIP_CNS');
										
				// si richiama WhenExitChangedRecord.fSearchItem passando in input itemsChanged che sono tutti i campi modificati dall'utente e
				// itemsLimitazioniOrganizzative che sono i campi che ci interessano per i controlli
				// se tra i campi modificati dall'utente ce n'è almeno uno di quelli di interesse, si richiama la funzione javascript controlliLimitazioniOrganizzative
				// altrimenti si va avanti

				
				if (WhenExitChangedRecord.fSearchItem(itemsChanged, itemsLimitazioniOrganizzative)) {
				  // richiamiamo la funzione java per effettuare i controlli
				  controlliLimitazioniOrganizzative(record,itemsChanged);
				}
			  }
			
		    // GESTIONE ALTRE REGION...

			  // se le funzioni di controllo hanno restituito un messaggio di errore tMsg sarà valorizzato insieme all'elenco dei campi da evidenziare 
			  
			  // return messaggio errore
			  if (tMsg) {
				// messaggio di errore, campi da evidenziare in rosso
				return [tMsg, tItem.split(',')];
			  } else {
				return '';
			  }
			}`,
            `wiz-wecr-vars-5_3_5`,
          );
          html += `</ul>`;
          return html;
        },
      },
    ],
  },
  {
    id: 'step_6',
    title: 'Step 6: Abilitazioni',
    substeps: [
      {
        id: 'sub_6_intro',
        title: 'Conversione Logica',
        description: 'Converti la logica Groovy in PL/SQL come primo passo per tutti gli scenari.',
        notaBene: 'Analizzare il <strong>whenRecordFetched</strong> per capire se sono gestite abilitazioni o controlli',
        content: (grid) => {
          const events = grid.events.filter((e) => ['whennewrecordinstance', 'whenRecordFetched'].includes(e.name.toLowerCase()));
          if (events.length === 0) return '<p class="text-gray">Nessun evento di inizializzazione record trovato.</p>';
          let html = 'Seguire gli step definiti nel Wiki della community, capitolo "Gestione Abilitazioni Complesse" per la conversione facilitata del groovy. Qui sotto gli script da analizzare:';
          events.forEach((evt, idx) => {
            html += renderEventBlock(evt, 0, `wiz-converts-${grid.name}-${idx}`);
          });
          return html;
        },
      },
      {
        id: 'sub_6_master',
        title: 'Scenario: Grid Master',
        description: 'Implementazione per una grid che funge da master e non ha dipendenze.',
        content: (grid) => {
          let html = `
                    <h4>Passo 1: Before Header</h4>
                    <p>Nel PL/SQL del Before Header, richiama la procedura di WNFI e salva l'abilitazione per l'inserimento su un Page Item. <strong>(SOLO SE NON GIÀ DEFINITO)</strong></p>
                    ${renderCodeBlock(`KCxxx_xxx_xxx_APEX.P_WNFI_ABI(v('APP_PAGE_ID'), :Pxxxx_C_VAR, :Pxxxx_P_N_PRG, :Pxxx_C_TIP_GST);\n\n:Pxxx_F_ABI_INS_${grid.name}:= KX003_ABI_UTL_APEX.F_ABI_INS_MST(v('APP_PAGE_ID'), :Pxxxx_C_VAR, '${grid.name}');`, `wiz-master-bh-${grid.name}`)}

                    <h4>Passo 2: Page Load</h4>
                    <p>Crea un'azione JavaScript per abilitare/disabilitare l'inserimento sul master in base al Page Item valorizzato prima.</p>
                    ${renderCodeBlock(`let f_abi_ins_${grid.name.toLowerCase()} = $v("Pxxx_F_ABI_INS_${grid.name}") == 'true' ? true : false;\n\nApexUtils.toggleIgInsert ("${grid.name}", f_abi_ins_${grid.name.toLowerCase()});`, `wiz-master-pl-${grid.name}`, 'javascript')}

                    <h4>Passo 3: Query della Grid</h4>
                    <p>Aggiungi alla query della grid la colonna <code>ID_ROW_ABI</code> per identificare univocamente la riga.</p>
                    ${renderCodeBlock(`TXXX.COL1||';'||To_Char(TXXX.COL2,'ddmmyyyy') ID_ROW_ABI`, `wiz-master-query-${grid.name}`)}

                    <h4>Passo 4: Plugin Abilitazioni</h4>
                    <p>Nel Page Load, aggiungi una Dynamic Action che esegue il plugin "IG Lazy Permission".</p>
                    <ul>
                        <li><strong>Selection Type:</strong> Region</li>
                        <li><strong>Region:</strong> ${grid.name}</li>
                        <li><strong>PL/SQL Logic:</strong> Vedi sotto </li>
                        <li><strong>ID Abilitazione:</strong> ID_ROW_ABI</li>
                        <li><strong>Items to Submit:</strong> Inserisci i Page Item necessari (es. Pxxxx_C_VAR).</li>
                        <li><strong>Gestione Record:</strong> SI, nel caso in cui sono calcolate, altrimenti NO se gestite tramite le Allowed Operations </li>
                        <li><strong>Mater Region:</strong> (lasciare vuoto)</li>
                    </ul>
                    ${renderCodeBlock(
                      `DECLARE
    v_t_upd        varchar2(2);
    v_pk_val       varchar2(4000) := :PK_VALUE; -- verrà sostituito dal plugin con la colonna ID_ROW_ABI
    v_detail varchar2(100):=''; -- TODO: Inserire gli static ID delle grid detail separati da virgola
    v_reg varchar2(100):=:REGION_STATIC_ID; -- Static ID della region, verrà sostituito dal plugin
BEGIN
    v_t_upd := KX003_ABI_UTL_APEX.F_GET_ABI(v('APP_PAGE_ID'),v('Pxxxx_C_VAR'),'WNRI', v_pk_val ,v_reg,null,'UD');
    :PERMS_JSON := KX003_ABI_UTL_APEX.F_GET_ABI_JSON(v('APP_PAGE_ID'),v('Pxxxx_C_VAR'),
                    v_reg||','||v_detail, -- Elenco delle region per cui deve essere gestite le abilitazioni di cella
                    v_t_upd, 
                    v_pk_val,
                    v_detail -- Elenco delle region detail per cui deve essere gestito l'insert Allowed
                    );
END;`,
                      `wiz-master-plugin-${grid.name}`,
                    )}

                    <h4>Passo 5: Impostazioni Finali</h4>
                    <p>Nei campi che richiedono abilitazione dinamica, imposta la classe CSS <code>abi-NOME_ABILITAZIONE</code> nell'<strong>Appearence CSS Class</strong> (es. <code>abi-${grid.name}cTipLim</code>).</p>
                `;
          return html;
        },
      },
      {
        id: 'sub_6_detail_inherited',
        title: 'Scenario: Detail (Ereditato)',
        description: 'Grid di dettaglio le cui abilitazioni sono interamente gestite dal master.',
        content: (grid) => {
          let html = `
                    <p>Questo scenario si applica quando le azioni di Inserimento, Modifica e Cancellazione sulla grid di dettaglio sono permesse o negate in base alla riga selezionata nella grid master.</p>
                    <h4>Passo 1: Query della Grid</h4>
                    <p>Aggiungi alla query della grid la colonna <code>ID_ROW_ABI</code> per identificare univocamente l'abilitazione riga.</p>
                    ${renderCodeBlock(`:Pxxxx_ID_ROW_ABI_MASTER ID_ROW_ABI`, `wiz-master-query-${grid.name}`)}

                    <h4>Passo 2: Plugin Abilitazioni</h4>
                    <p>Nel Page Load, aggiungi una Dynamic Action che esegue il plugin "IG Lazy Permission".</p>
                    <ul>
                        <li><strong>Selection Type:</strong> Region</li>
                        <li><strong>Region:</strong> ${grid.name}</li>
                        <li><strong>PL/SQL Logic:</strong> (lasciare vuoto)</li>
                        <li><strong>ID Abilitazione:</strong> ID_ROW_ABI</li>
                        <li><strong>Items to Submit:</strong> (lasciare vuoto)</li>
                        <li><strong>Gestione Record:</strong> NO</li>
                        <li><strong>Mater Region:</strong> static_ID del Master</li>
                    </ul>
                    <p><strong>Nota:</strong> Questo funziona se il plugin della grid master (vedi Scenario 1) popola correttamente le abilitazioni. Assicurarsi di aver aggiunto nel master la gestione di questo detail.</p>

                    <h4>Passo 3: Impostazioni Finali</h4>
                    <p>Nei campi che richiedono abilitazione dinamica, imposta la classe CSS <code>abi-NOME_ABILITAZIONE</code> nell'<strong>Appearence CSS Class</strong> (es. <code>abi-${grid.name}cTipLim</code>).</p>
                `;
          return html;
        },
      },
      {
        id: 'sub_6_detail_calculated',
        title: 'Scenario: Detail (Calcolato)',
        description: 'Grid di dettaglio con abilitazioni autonome.',
        content: (grid) => {
          let html = `
                    <p>Questo scenario è per grid di dettaglio che hanno una logica di abilitazione derivante anche da condizioni del detail</p>
                    <h4>Passo 1: Query della Grid</h4>
                    <p>Aggiungi alla query della grid la colonna <code>ID_ROW_ABI</code>.</p>
                    ${renderCodeBlock(`TXXX.COL1||';'||To_Char(TXXX.COL2,'ddmmyyyy') ID_ROW_ABI`, `wiz-calc-query-${grid.name}`)}

                    <h4>Passo 2: Plugin Abilitazioni</h4>
                    <p>Configura il plugin "IG Lazy Permission" con una logica PL/SQL personalizzata.</p>
                    <ul>
                        <li><strong>Selection Type:</strong> Region</li>
                        <li><strong>Region:</strong> ${grid.name}</li>
                        <li><strong>PL/SQL Logic:</strong> vedi sotto </li>
                        <li><strong>ID Abilitazione:</strong> ID_ROW_ABI</li>
                        <li><strong>Items to Submit:</strong> Inserisci i Page Item necessari (es. Pxxxx_C_VAR).</li>
                        <li><strong>Gestione Record:</strong> SI, nel caso in cui sono calcolate, altrimenti NO se gestite tramite le Allowed Operations</li>
                        <li><strong>Mater Region:</strong> (lasciare vuoto)</li>
                    </ul>
                    ${renderCodeBlock(
                      `DECLARE
    v_t_upd        varchar2(2);
    v_pk_val       varchar2(4000) := :PK_VALUE; 
    v_detail varchar2(100):=''; --Static ID region Detail da gestire
BEGIN
    v_t_upd := KX003_ABI_UTL_APEX.F_GET_ABI(v('APP_PAGE_ID'),v('Pxxxx_C_VAR'),'WNRI', v_pk_val ,:REGION_STATIC_ID,null,'UD');
    :PERMS_JSON := KX003_ABI_UTL_APEX.F_GET_ABI_JSON(v('APP_PAGE_ID'),v('Pxxxx_C_VAR'),:REGION_STATIC_ID, v_t_upd, v_pk_val,v_detail);
END;`,
                      `wiz-calc-plugin-${grid.name}`,
                    )}

                    <h4>Passo 3: Impostazioni Finali</h4>
                    <p>Nei campi che richiedono abilitazione dinamica, imposta la classe CSS <code>abi-NOME_ABILITAZIONE</code> nell'<strong>Appearence CSS Class</strong> (es. <code>abi-${grid.name}cTipLim</code>).</p>
                `;
          return html;
        },
      },
      {
        id: 'sub_6_final',
        title: 'Censimento e Test',
        description: 'Censisci le nuove procedure e testa le abilitazioni.',
        content: (grid) => {
          let html = `
                    <h4>Passo 1: Censimento Controllo</h4>
                    <p>Censisci ogni nuovo controllo WNRI creato nella tabella <code>TX006_TYP_ABI</code>.</p>
                    ${renderCodeBlock(`insert into TX006_TYP_ABI(page_id, c_reg, c_ctr, t_ctr, t_exe, f_chg_ses, n_min_cache) values(<ID PAGE>, <STATIC ID REGION>, 'WNRI', 'WhenNewRecordInstance', 'KXXX_ABI_XXXXX.P_WNRI_XXXX(@P_N_PAG_ID@,@P_C_VAR@,@P1_V@,@P2_D@,@P3_N@)', 'N', 60);`, `wiz-cens1-${grid.name}`)}
                    
                    <h4>Passo 2: Debug e Test</h4>
                    <p>Per fare debug direttamente da PL/SQL, puoi usare lo script seguente per impostare la sessione APEX e interrogare le tabelle di risultato <code>TX004_ABI_EXE</code> e <code>TX005_ABI</code>.</p>
                    ${renderCodeBlock(
                      `DECLARE
    v_session_id VARCHAR2(100);
BEGIN
    APEX_UTIL.SET_SECURITY_GROUP_ID(p_security_group_id => APEX_UTIL.FIND_SECURITY_GROUP_ID('CMS'));

    APEX_CUSTOM_AUTH.LOGIN(
        p_uname       => 'codice_utente',
        p_session_id  => V('APP_SESSION'),
        p_app_page    => 'APP_ID' || ':' || 'PAGE_ID');

    -- Esegui qui le tue procedure di test...

    -- Interroga il risultato nelle tabelle:
    -- SELECT * FROM TX004_ABI_EXE WHERE ...
    -- SELECT * FROM TX005_ABI WHERE ...
END;`,
                      `wiz-cens2-${grid.name}`,
                    )}
                `;
          return html;
        },
      },
    ],
  },
  {
    id: 'step_7',
    title: 'Step 7: Checklist Sviluppatore',
    substeps: [
      {
        id: 'sub_7_1',
        title: 'Verifica la seguente checklist',
        description: 'Verifica di aver completato tutti i passaggi necessari per lo sviluppo della Grid',
        content: (grid, allData, progressData) => {
          let html = '<div class="space-y-6">';
          checklist.forEach((group) => {
            html += `<div class="checklist-group">
                    <h4 class="font-bold text-md mb-2 text-indigo-700 border-b border-indigo-100 pb-1">${group.title}</h4>
                    <ul class="list-none space-y-2">`;
            group.items.forEach((item) => {
              const key = `chk_${grid.name}_${item.id}`;
              const isChecked = progressData && progressData[key];
              html += `<li class="flex items-center gap-2"><label class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input type="checkbox" onclick="toggleChecklist(event, '${key}')" ${isChecked ? 'checked' : ''} class="accent-indigo-600">
                        <span class="text-sm text-gray-700">${item.name} - ${item.label}</span>
                    </label></li>`;
            });
            html += `</ul></div>`;
          });
          html += '</div>';
          return html;
        },
      },
    ],
  },
  {
    id: 'step_8',
    title: 'Step 8: Test',
    substeps: [
      {
        id: 'sub_8_1',
        title: 'Esegui i test sulla Grid',
        description: 'Esegui ogni singolo test per accertarsi dello sviluppo',
        content: (grid) => {
          let html = '<p class="text-gray">Scarica il file dei test ed esegui quelli relativi alla grid<strong> ' + grid.name + '</strong></p><p class="text-gray"><strong>NOTA BENE:</strong> Al termine dei test commenta TUTTI i log js e PLSQL</p>';
          return html;
        },
      },
    ],
  },
];
