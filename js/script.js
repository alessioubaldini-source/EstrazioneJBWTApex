let currentData = null; // Variabile globale per memorizzare i dati per l'export
let currentFilename = 'Estrazione_JBWT.xml';
let rawXMLText = null;
let isWizardMode = false;
let selectedGridForWizard = null;
let wizardProgress = {}; // Traccia i substep visitati: { gridName: Set('sub_1_1', ...) }
let isWizardProgressEnabled = false;

async function loadDefaultXML() {
  loadSettings(); // Carica impostazioni all'avvio
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');

  try {
    loadingEl.classList.remove('hidden');
    if (window.fs && window.fs.readFile) {
      try {
        const response = await window.fs.readFile('AUTG0006.xml', { encoding: 'utf8' });
        currentFilename = 'AUTG0006.xml';
        rawXMLText = response;
        const data = parseXML(response);
        document.getElementById('currentFileNameDisplay').textContent = currentFilename;
        renderData(data); // This will render the normal view
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

  if (isWizardMode) {
    toggleWizardMode();
  }

  currentFilename = file.name;
  const errorEl = document.getElementById('error');
  errorEl.classList.add('hidden');

  try {
    const text = await file.text();
    rawXMLText = text;
    const data = parseXML(text);
    document.getElementById('currentFileNameDisplay').textContent = currentFilename;
    renderData(data);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  }
});

document.getElementById('excludeFilterFields').addEventListener('change', () => {
  if (rawXMLText) {
    try {
      const data = parseXML(rawXMLText);
      renderData(data);
    } catch (err) {
      console.error('Errore nel ricalcolo del filtro:', err);
    }
  }
});

window.addEventListener('load', () => {
  loadDefaultXML();
});
