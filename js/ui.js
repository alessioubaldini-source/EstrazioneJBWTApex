let expandedSections = {};
let progressData = {};

function toggleSection(key) {
  expandedSections[key] = !expandedSections[key];
  const content = document.querySelector(`[data-section="${key}"]`);
  const icon = document.querySelector(`[data-icon="${key}"]`);
  if (content) {
    content.classList.toggle('open');
    icon.textContent = expandedSections[key] ? '▼' : '▶';
  }
}

async function copyToClipboard(btn, id) {
  try {
    const wrapper = btn.closest('.code-block-wrapper');
    const code = wrapper.querySelector('.code-block').textContent;
    await navigator.clipboard.writeText(code);

    btn.innerHTML = COPIED_ICON;
    btn.classList.add('copied');
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = COPY_ICON;
    }, 2000);
  } catch (err) {
    console.error('Errore nella copia:', err);
  }
}

async function copyAllScripts(btn) {
  try {
    const container = btn.closest('.scripts-group');
    const blocks = container.querySelectorAll('.code-block');
    let text = '';
    blocks.forEach((b) => {
      const wrapper = b.closest('.code-block-wrapper');
      if (wrapper && wrapper.parentElement) {
        const failMsg = wrapper.parentElement.querySelector('.text-red');
        if (failMsg) {
          text += failMsg.textContent.trim() + '\n';
        }
      }
      text += b.textContent + '\n\n';
    });
    await navigator.clipboard.writeText(text);

    const originalText = btn.textContent;
    btn.textContent = '✅ Copiato!';
    setTimeout(() => (btn.textContent = originalText), 2000);
  } catch (err) {
    console.error('Errore nella copia massiva:', err);
  }
}

window.toggleGridDone = function (event, gridName) {
  event.stopPropagation();
  const isChecked = event.target.checked;
  progressData[`grid-done-${gridName}`] = isChecked;

  const storageKey = `JBWT_PROGRESS_${currentFilename}`;
  localStorage.setItem(storageKey, JSON.stringify(progressData));

  const gridCard = document.getElementById(`grid-${gridName}`);
  const sidebarLi = document.querySelector(`.sidebar li[data-grid-name="${gridName}"]`);

  if (gridCard) {
    if (isChecked) {
      gridCard.classList.add('grid-done', 'collapsed');
    } else {
      gridCard.classList.remove('grid-done', 'collapsed');
    }
  }

  if (sidebarLi) {
    if (isChecked) {
      sidebarLi.classList.add('grid-done');
    } else {
      sidebarLi.classList.remove('grid-done');
    }
  }
};

function toggleGridSections(btn) {
  const card = btn.closest('.grid-card');
  const sections = card.querySelectorAll('.section-content');
  const icons = card.querySelectorAll('[data-icon]');

  // Determina lo stato: se la prima è aperta, chiudi tutto. Altrimenti apri tutto.
  const isFirstOpen = sections[0] && sections[0].classList.contains('open');
  const newState = !isFirstOpen;

  sections.forEach((sec) => {
    if (newState) sec.classList.add('open');
    else sec.classList.remove('open');
  });

  icons.forEach((icon) => {
    icon.textContent = newState ? '▼' : '▶';
  });

  btn.textContent = newState ? '📂 Collassa tutto' : '📂 Espandi tutto';
}

function loadProgress() {
  if (!currentFilename) return;
  const storageKey = `JBWT_PROGRESS_${currentFilename}`;
  try {
    const data = localStorage.getItem(storageKey);
    progressData = data ? JSON.parse(data) : {};
  } catch (e) {
    console.error('Errore caricamento progressi:', e);
    progressData = {};
  }
}

window.toggleDone = function (event, key) {
  event.stopPropagation();
  const isChecked = event.target.checked;
  progressData[key] = isChecked;

  const storageKey = `JBWT_PROGRESS_${currentFilename}`;
  localStorage.setItem(storageKey, JSON.stringify(progressData));

  const section = event.target.closest('.section');
  if (section) {
    if (isChecked) section.classList.add('section-done');
    else section.classList.remove('section-done');
  }
};

window.onscroll = function () {
  const btn = document.getElementById('backToTop');
  if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
    btn.classList.add('visible');
  } else {
    btn.classList.remove('visible');
  }
};

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.togglePlSql = function (btn, id) {
  const codeBlock = document.getElementById(`${id}-code`);
  const rawTextarea = document.getElementById(`${id}-raw`);
  const isConverted = btn.classList.contains('active');

  if (!isConverted) {
    const groovyCode = rawTextarea.value;
    const plsqlCode = convertGroovyToPlSql(groovyCode);
    codeBlock.innerHTML = `<code class="language-sql">${escapeHtml(plsqlCode)}</code>`;
    btn.classList.add('active');
    btn.style.backgroundColor = '#dbeafe'; // Highlight button
  } else {
    codeBlock.innerHTML = `<code class="language-groovy">${escapeHtml(rawTextarea.value)}</code>`;
    btn.classList.remove('active');
    btn.style.backgroundColor = ''; // Reset button
  }

  // Rilancia Prism per evidenziare la sintassi
  if (window.Prism) {
    Prism.highlightElement(codeBlock.querySelector('code'));
  }
};
