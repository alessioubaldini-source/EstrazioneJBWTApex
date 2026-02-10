const checklist = [
  {
    title: 'IMPOSTAZIONI DELLA PAGINA',
    items: [
      { id: 'A1', name: 'Numero Pagina', label: 'Riprendere dal file degli standard' },
      { id: 'A2', name: 'Name', label: 'il nome della maschera deve essere da ORGG0033 - Abbinamento Cluster (versione jbwt) deve diventare ORGGX033 - Abbinamento Cluster' },
      { id: 'A3', name: 'Alias', label: 'il codice della maschera: orggx033' },
      { id: 'A4', name: 'Title', label: 'la descrizione della maschera: Abbinamento Cluster' },
      { id: 'A5', name: 'Page Mode', label: 'nel caso in cui sia una maschera normale (non aperta versione popup): Normal altrimenti Modal Dialog' },
      { id: 'A6', name: 'Page Template', label: 'Theme Default' },
    ],
  },
  {
    title: 'PAGE ITEM DA CREARE',
    items: [
      {
        id: 'B1',
        name: 'PXXXX_C_VAR',
        label: `Creare page item per settare la variante
Proprietà
NOME: PXXX_C_VAR
HIDDEN
VALUE PROTECTED
PER REQUEST (MEMORY)
CON DEFAULT "01"`,
      },
      {
        id: 'B2',
        name: 'PXXXX_C_VAR_RTN',
        label: `Creare page item per settare la variante di ritorno in chiamata
NOME: PXXX_C_VAR_RTN
HIDDEN
VALUE PROTECTED
PER REQUEST (MEMORY)`,
      },
    ],
  },
  {
    title: 'EVENTI CHE SCATTANO NEL WNFI',
    items: [
      { id: 'C1', name: 'Before Header', label: 'in questo evento creare i processi per effettuare i popolamenti / query che scattano nel WNFI' },
      { id: 'C2', name: 'Page Load', label: 'Utilizzare il page load per richiamare le azioni java per abilitare/disabilitare le insert sulle region / richiamare i plugin Custom Toolbar e When Exit Changed Record' },
    ],
  },
  {
    title: 'PAGE ITEM NASCOSTI (AD ESEMPIO PARAMETRI OPPURE VARIABILI DI APPOGGIO)',
    items: [
      { id: 'D1', name: 'Name', label: 'il nome dovrà essere composto da P seguito dal numero pagina, seguito a sua volta dalla tripletta del campo ad esempio P1039_C_TIP_CLU' },
      { id: 'D2', name: 'Type', label: 'Hidden' },
      { id: 'D3', name: 'Value Protected', label: 'impostare NO' },
      { id: 'D4', name: 'Storage', label: 'si consiglia di impostare: Per Request Memory Only (se il parametro avrà sempre un valore fisso si puo mettere anche per Session (Persistent))' },
      { id: 'D5', name: 'Default - Type', label: 'Nel caso in cui sia necessario impostare un valore di default selezionare SQL Query (return single value) e riportare la query per la valorizzazione' },
    ],
  },
  {
    title: 'IMPOSTAZIONI DELLA REGION - TAB REGION',
    items: [
      { id: 'E1', name: 'Name', label: 'Riportare il nome del grid ad esempio Tipo Cluster' },
      { id: 'E2', name: 'Type', label: 'Sia per grid multi in gestione sia per quelli in visualizzazione impostare Interactive Grid, per quelli in visualizzazione si disabilitano gli statement' },
      { id: 'E3', name: 'Source - Type', label: 'Impostare SEMPRE SQL Query. Cercare di ridurre la query in modo che la FROM sia basata su una sola tabella. Recuperare il ROWID da impostare come chiave' },
      { id: 'E4', name: 'Page Item to Submit', label: 'Selezionare tutti gli item che si usano nella query che quelli che si utilizzano nei controlli' },
      { id: 'E5', name: 'Tempate', label: 'Standard' },
      { id: 'E6', name: 'Master Region', label: 'Da valorizzare se presente il legame master-detail' },
      { id: 'E7', name: 'Static ID', label: 'Impostare SEMPRE lo static ID con le iniziali della tabella principale, ad esempio TO046' },
      { id: 'E8', name: 'Server-side Condition', label: 'da impostare se vogliamo nascondere la region a runtime' },
    ],
  },
  {
    title: 'IMPOSTAZIONI DELLA REGION - TAB ATTRIBUTES (REGION)',
    items: [
      { id: 'F1', name: 'Enabled', label: 'Da impostare NO se grid in sola visualizzazione, altrimenti SI' },
      { id: 'F2', name: 'Allowed Row Operation', label: 'Impostare la colonna che pilota le abilitazioni (sarà un campo calcolato tramite una funzione, ad esempio F_ABI_UD_TO046 )' },
      { id: 'F3', name: 'Add Row If Empty', label: 'Impostare NO' },
      { id: 'F4', name: 'Lazy Loading', label: 'nel caso in cui le maschere devono estrarre un numero molto elevato di record impostare a SI altrimenti NO' },
      { id: 'F5', name: 'Pagination - Type', label: 'Page' },
    ],
  },
  { title: 'IMPOSTAZIONI DELLA REGION - TAB PRINTING (REGION)', items: [{ id: 'G1', name: 'Page Header', label: 'Impostare alias della tabella ad esempio TO046' }] },
  {
    title: 'COLONNE',
    items: [
      { id: 'H1', name: 'Column Name', label: 'Sarà il nome della colonna estratta in query' },
      { id: 'H2', name: 'Heading', label: 'Scrivere SEMPRE la descrizione del campo ad esempio Codice oppure Progressivo, in quanto questi campi si possono vedere da Azioni - Colonne' },
      { id: 'H3', name: 'Alignment', label: 'Va sempre bene il default ad eccezione dei flag che dovranno essere allineati al centro' },
      { id: 'H4', name: 'Text Case', label: 'UPPER ( a meno di altre indicazioni)' },
      { id: 'H5', name: 'Column Alignment', label: 'Va sempre bene il default ad eccezione dei flag che dovranno essere allineati al centro' },
      { id: 'H6', name: 'Value Required', label: 'Dovranno essere impostati i campi obbligatori come su maschera originale. FARE ATTENZIONE, le checkbox vengono impostate e reimpostate a SI ad ogni modifica sulla query della region' },
      { id: 'H7', name: 'Maximum Length', label: 'Impostare il massimo numero di caratteri come definito in tabella' },
      { id: 'H8', name: 'Query Only', label: 'questo flag dovrà essere impostato a SI su tutte quelle colonne calcolate in query che non vengono usate per gli statement' },
      { id: 'H9', name: 'Primary Key', label: 'Se possibile sarà S solo sulla colonna ROWID, altrimenti impostare su tutte le colonne che compongono la chiave' },
      { id: 'H10', name: 'Master Column', label: 'Dovrà essere valorizzata con la colonna master, solo se abbiamo impostato Master Region (Attributo TAB REGION)' },
      { id: 'H11', name: 'Column Filter', label: 'Da valorizzare con N se non sarà possibile filtrare su quel campo' },
      { id: 'H12', name: 'Sort', label: 'Da impostare N se non sarà possibile ordinare la region basandosi su quel campo' },
      { id: 'H13', name: 'Hide', label: 'Da valorizzare con N se non sarà possibile nascondere/visualizzare il campo' },
      { id: 'H14', name: 'Static ID', label: 'Impostare SEMPRE lo static ID' },
    ],
  },
  {
    title: 'PARTICOLARITÀ DI POPUP LOV E SELECT LIST',
    items: [
      { id: 'I1', name: 'Title', label: 'Impostare il title della lov (Plurale della label, esempio Label: Tipo Cluster --> Tipi Cluster)' },
      { id: 'I2', name: 'Settings - Search As You Type', label: 'Impostare a S' },
      { id: 'I3', name: 'List of Values - Type', label: 'Nel caso in cui il campo sia una Popup Lov oppure una Select List dovrà essere basata su SHARED COMPONENTS' },
      { id: 'I4', name: 'Display Null Value', label: 'Impostare a S' },
      { id: 'I5', name: 'Null Display Value', label: 'Impostare il carattere - ' },
      { id: 'I6', name: 'Parent Column(s)', label: 'impostare le colonne della region che viene utilizzata per filtrare la query della shared components' },
      {
        id: 'I7',
        name: 'Items to Submit',
        label: 'impostare gli item utilizzati per filtrare la shared. NOTA: questo attributo viene visualizzato solo se presente Parent Columns se non serve la columns mettere comuque una colonna per abilitare il menu',
      },
      { id: 'I8', name: 'Parent Required', label: 'Impostare a S se al variare della Parent Column(s) deve essere ricaricata la shared components e quindi sbiancata la lov' },
    ],
  },
  {
    title: 'CONTROLLI WHEN EXIT CHANGED RECORD / WHEN FINISH EDIT SUL CAMPO',
    items: [{ id: 'L1', name: 'Controlli su Record', label: 'Verificare il corretto funzionamento di tutti i controlli definiti nel WhenExitChangedRecord, campo evidenziato + messaggio' }],
  },
  {
    title: 'Statement',
    items: [
      { id: 'M1', name: 'Insert', label: 'Verificare il funzionamento dell inserimento' },
      { id: 'M2', name: 'Update', label: 'Verificare il funzionamento dell aggiornamento' },
      { id: 'M3', name: 'Delete', label: 'Verificare il funzionamento della delete' },
      { id: 'M4', name: 'OnCommit', label: 'Verificare il corretto funzionamento del controllo OnCommit' },
    ],
  },
  {
    title: 'Layout',
    items: [{ id: 'N1', name: 'Region', label: `(Caso Master - Detail - Detail) Da valutare se nei detail sono presenti region master-detail ed entrambe hanno pochi campi in visualizzazione, provare a metterli uno di fianco all'altro` }],
  },
];
