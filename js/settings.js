let appSettings = {
  ranges: [],
  messages: {},
};

function loadSettings() {
  try {
    const saved = localStorage.getItem('JBWT_APP_SETTINGS');
    if (saved) {
      appSettings = JSON.parse(saved);
    }
  } catch (e) {
    console.error('Errore caricamento settings:', e);
  }
}

function openSettings() {
  document.getElementById('settingsRanges').value = JSON.stringify(appSettings.ranges || [], null, 2);
  document.getElementById('settingsMessages').value = JSON.stringify(appSettings.messages || {}, null, 2);
  document.getElementById('settingsApex').value = JSON.stringify(appSettings.apex || {}, null, 2);
  document.getElementById('settingsModal').classList.add('open');
}

function closeSettings() {
  document.getElementById('settingsModal').classList.remove('open');
}

function saveSettings() {
  try {
    const rangesStr = document.getElementById('settingsRanges').value;
    const messagesStr = document.getElementById('settingsMessages').value;
    const apexStr = document.getElementById('settingsApex').value;

    appSettings.ranges = rangesStr ? JSON.parse(rangesStr) : [];
    appSettings.messages = messagesStr ? JSON.parse(messagesStr) : {};
    appSettings.apex = apexStr ? JSON.parse(apexStr) : {};

    localStorage.setItem('JBWT_APP_SETTINGS', JSON.stringify(appSettings));
    closeSettings();

    // Ricarica i dati se c'è un file caricato per applicare le nuove impostazioni
    if (rawXMLText) {
      const data = parseXML(rawXMLText);
      renderData(data);
    }
  } catch (e) {
    alert('Errore nel salvataggio JSON: ' + e.message);
  }
}
