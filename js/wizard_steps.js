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
                <p class="text-sm">Per ogni fields che è Read Only impostare la classe "custom-readonly" nell'Appearence CSS Class dell'item.</p>`,
        content: (grid) => {
          let html = `<table class="table"><thead><tr><th>Field</th><th>Type</th><th>Hint (riportare solo se significativa)</th><th>Settings & Notes</th></tr></thead><tbody>`;
          //console.log('Fields da processare:', grid.fields);
          grid.fields.forEach((f) => {
            let notes = [];
            if (f.isMandatory === 'true') notes.push('<span class="badge badge-red">Required</span>');
            if (f.isHidden === 'true') notes.push('<span class="badge badge-gray">Hidden</span>');
            if (f.isEditable === 'false') notes.push('<span class="badge badge-yellow">Read Only</span>');
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
              notes.push('Search As you Type: <strong>SI</strong>');
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
    title: 'Step 3: Button (DA FARE)',
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
        id: 'sub_6_1',
        title: 'Conversione Groovy in PLSQL',
        description: 'Convertire il groovy presente nel WhenNewFormInstance (una tantum), whenNewRecordInstance e whenRecordFetched in PLSQL',
        notaBene: 'Analizzare il <strong>whenRecordFetched</strong> per capire se sono gestite abilitazioni o controlli',
        content: (grid) => {
          const events = grid.events.filter((e) => ['whennewrecordinstance', 'whenRecordFetched'].includes(e.name.toLowerCase()));
          if (events.length === 0) return '<p class="text-gray">Nessun evento di inizializzazione record trovato.</p>';
          let html = 'Seguire gli step definiti nel Wiki della community, capitolo "Gestione Abilitazioni Complesse" per la conversione facilitata del groovy';
          events.forEach((evt, idx) => {
            html += renderEventBlock(evt, 0, `wiz-converts-${grid.name}-${idx}`);
          });
          return html;
        },
      },
      {
        id: 'sub_6_2',
        title: 'Before Header',
        description: 'Gestione WhenNewFormInstance nel Before Header (SOLO SE NON GIA DEFINITO)',
        content: (grid) => {
          let html = `Nel plsql del Before Header dovrà essere richiamata la procedura di WhenNewFormInstance e salvare su un page item il valore dell'abilitazione dell'inserimento SUL GRID MASTER`;
          html += renderCodeBlock(
            `KCxxx_xxx_xxx_APEX.P_WNFI_ABI(v('APP_PAGE_ID'), :Pxxxx_C_VAR, :Pxxxx_P_N_PRG, :Pxxx_C_TIP_GST);
	
:Pxxx_F_ABI_INS_${grid.name}:= KX003_ABI_UTL_APEX.F_ABI_INS_MST(v('APP_PAGE_ID'), :Pxxxx_C_VAR, '${grid.name}');
`,
            `wiz-befhdr-${grid.name}`,
          );
          return html;
        },
      },
      {
        id: 'sub_6_3',
        title: 'Page Load',
        description: 'Gestione abilitazione grid MASTER (SOLO SE GRID MASTER)',
        content: (grid) => {
          let html = `Creare un'azione di tipo javascript per abilitare/disabilitare l'insert sul MASTER`;
          html += renderCodeBlock(
            `let f_abi_ins_${grid.name.toLowerCase()} = $v("Pxxx_F_ABI_INS_${grid.name}") == 'true' ? true : false;

cmsAbiInsert ("${grid.name}", f_abi_ins_${grid.name.toLowerCase()});
`,
            `wiz-pageload-${grid.name}`,
            'javascript',
          );
          return html;
        },
      },
      {
        id: 'sub_6_4',
        title: 'Query',
        description: 'Gestione WhenNewRecordInstance nella Query del grid',
        content: (grid) => {
          let html = `All'interno della query del grid è necessario aggiungere due campi: <strong>ID_ROW_ABI</strong> (necessario per recuperare successivamente le abilitazioni) e <strong>F_ABI_UD</strong> (per calcolare e impostare l'abilitazione di Update/Delete del record)`;
          html += renderCodeBlock(
            `TXXX.COL1||';'||To_Char(TXXX.COL2,'ddmmyyyy') ID_ROW_ABI,

KX003_ABI_UTL_APEX.F_GET_ABI(v('APP_PAGE_ID'),:P_C_VAR,'WNRI',TXXX.COL1||';'||To_Char(TXXX.COL2,'ddmmyyyy'), '${grid.name}',null,'UD') F_ABI_UD`,
            `wiz-wnriqry-${grid.name}`,
          );
          return html;
        },
      },
      {
        id: 'sub_6_5',
        title: 'Impostazioni Abilitazioni',
        description: "Attivazione dell'abilitazione",
        notaBene: `Ricercare abilitazioni per il nome della colonna cosi come era scritta su JBWT, esempio xxxxdIniVal`,
        content: (grid) => {
          let html = `<ul style="margin-left: 20px; margin-top: 5px;" class="text-sm">
                    <li>Nell'impostazioni del grid, definire la colonna F_ABI_${grid.name} in Attributes - Allowed Row Operations Column</li>
                    <li>Abilitazioni fields, nel Read Only di ogni campo impostare:</li>
                    <ul class="list-disc pl-5 mt-1" style="margin-left: 20px;"> 
                            <li><strong>Type:</strong> Expression</li>
                            <li><strong>Language:</strong> PL/SQL</li>
                            <li><strong>PL/SQL Expression:</strong></li>
                        </ul>`;
          html += renderCodeBlock(`KX003_ABI_UTL_APEX.F_ABI_ITM (v('APP_PAGE_ID'),:Pxxx_C_VAR,'${grid.name}','${grid.name}dIniVal','updateallowed',:ID_ROW_ABI ) = 'false'`, `wiz-abiitm1-${grid.name}`);
          html += `<li>Abilitazioni insert detail, nella DA Selection Change del grid: </li>
                    <ul class="list-disc pl-5 mt-1" style="margin-left: 20px;"> 
                            <li>Azione PLSQL per recuperare il valore dell'abilitazione e appoggiarlo su un Page Item:</li>`;
          html += renderCodeBlock(`Pxxx_F_ABI_INS_detail := KX003_ABI_UTL_APEX.F_ABI_REG (v('APP_PAGE_ID'),:Pxxx_C_VAR,'<STATIC ID REGION DETAIL>','insertallowed',:ID_ROW_ABI )`, `wiz-abiitm2-${grid.name}`);
          html += `<li>Azione Javascript per impostare l'abilitazione:</li>`;
          html += renderCodeBlock(
            `let f_abi_ins_detail = $v("Pxxx_F_ABI_INS_detail") == 'true' ? true : false;

cmsAbiInsert ("<STATIC ID REGION DETAIL>", f_abi_ins_detail);
`,
            `wiz-abiitm3-${grid.name}`,
            'javascript',
          );

          html += `</ul></ul>`;
          return html;
        },
      },
      {
        id: 'sub_6_6',
        title: 'Censimento procedure di abilitazione',
        description: 'Censire ogni controllo WNFI e WNRI creato',
        content: (grid) => {
          let html = `<ul style="margin-left: 20px; margin-top: 5px;" class="text-sm">
                    <li>Censimento Controllo</li>
                    `;
          html += renderCodeBlock(
            `insert into TX006_TYP_ABI(page_id, c_reg, c_ctr, t_ctr, t_exe, f_chg_ses, n_min_cache) values(<ID PAGE>, <STATIC ID REGION>, 'WNRI', 'WhenNewRecordInstance', 'KXXX_ABI_XXXXX.P_WNRI_XXXX(@P_N_PAG_ID@,@P_C_VAR@,@P1_V@,@P2_D@,@P3_N@)', 'N', 60);`,
            `wiz-cens1-${grid.name}`,
          );
          html += `<li>Effettuare Test delle abilitazioni, per fare debug direttamente da PLSQL è possibile effettuare il seguente script per autenticarsi su DB, lanciare le singole procedure e interrogare le TX004_ABI_EXE e TX005_ABI per vedere il risultato</li>`;
          html += renderCodeBlock(
            `DECLARE
    v_session_id VARCHAR2(100);

    BEGIN
        APEX_UTIL.SET_SECURITY_GROUP_ID(p_security_group_id => APEX_UTIL.FIND_SECURITY_GROUP_ID('CMS'));

        APEX_CUSTOM_AUTH.LOGIN(
        p_uname       => 'codice_utente',
        p_session_id  => V('APP_SESSION'),
        p_app_page    => '123'||':1234'); -- APP ID + ':PAGE_ID'

        /* INTERROGARE IL RISULTATO DELLE ABILITAZIONI NELLE TABELLE:
        TX004_ABI_EXE
        TX005_ABI
        */
    END ;`,
            `wiz-cens2-${grid.name}`,
          );
          html += `</ul>`;
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
          let html = '<p class="text-gray">Scarica il file dei test ed esegui quelli relativi alla grid<strong> ' + grid.name + '</strong></p>';
          return html;
        },
      },
    ],
  },
];
