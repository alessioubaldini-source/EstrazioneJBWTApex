let appSettings = {
  ranges: [],
  messages: {},
  dependencies: {},
};

function loadSettings() {
  try {
    const saved = localStorage.getItem('JBWT_APP_SETTINGS');
    if (saved) {
      const parsed = JSON.parse(saved);
      appSettings = { ...appSettings, ...parsed };
    }
  } catch (e) {
    console.error('Errore caricamento settings:', e);
  }
}

function openSettings() {
  const elRanges = document.getElementById('settingsRanges');
  const elMsgs = document.getElementById('settingsMessages');
  const elApex = document.getElementById('settingsApex');
  const elDeps = document.getElementById('settingsDependencies');

  if (elRanges) elRanges.value = JSON.stringify(appSettings.ranges || [], null, 2);
  if (elMsgs) elMsgs.value = JSON.stringify(appSettings.messages || {}, null, 2);
  if (elApex) elApex.value = JSON.stringify(appSettings.apex || {}, null, 2);
  if (elDeps) elDeps.value = JSON.stringify(appSettings.dependencies || {}, null, 2);

  document.getElementById('settingsModal').classList.add('open');
}

function closeSettings() {
  document.getElementById('settingsModal').classList.remove('open');
}

function saveSettings() {
  try {
    const elRanges = document.getElementById('settingsRanges');
    const elMsgs = document.getElementById('settingsMessages');
    const elApex = document.getElementById('settingsApex');
    const elDeps = document.getElementById('settingsDependencies');

    if (elRanges) appSettings.ranges = elRanges.value ? JSON.parse(elRanges.value) : [];
    if (elMsgs) appSettings.messages = elMsgs.value ? JSON.parse(elMsgs.value) : {};
    if (elApex) appSettings.apex = elApex.value ? JSON.parse(elApex.value) : {};
    if (elDeps) appSettings.dependencies = elDeps.value ? JSON.parse(elDeps.value) : {};

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
