// Icona SVG per "copia" (due fogli)
const COPY_ICON = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
  `;

// Icona SVG per "copiato" (check)
const COPIED_ICON = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
  `;

function getDirectChild(element, tagName) {
  return Array.from(element.children).find((el) => el.nodeName === tagName);
}

function decodeJBWTMessage(text) {
  if (!text) return text;
  return text.replace(/@DB@(\d+)@DB@/g, (match, code) => {
    const msg = appSettings.messages[code];
    return msg ? `${code} - ${msg}` : match;
  });
}

function getModuleRange(filename) {
  if (!filename || !appSettings.ranges) return null;
  const found = appSettings.ranges.find((r) => filename.toUpperCase().startsWith(r.module.toUpperCase()));
  return found ? found : null;
}

function convertGroovyToPlSql(groovyCode) {
  if (!groovyCode) return '';

  const blockStack = [];

  return groovyCode
    .split('\n')
    .map((line) => {
      const indent = line.match(/^\s*/)[0];
      let content = line.trim();

      if (!content) return line;

      // Commenti
      if (content.startsWith('//')) return indent + content.replace('//', '--');

      // Stringhe
      content = content.replace(/"/g, "'");

      // Operatori Logici e Confronto
      content = content.replace(/&&/g, ' AND ').replace(/\|\|/g, ' OR ').replace(/!=/g, ' <> ').replace(/==/g, ' = ');

      // Println -> DBMS_OUTPUT
      if (content.startsWith('println')) {
        content = content.replace(/^println\s*\(?(.*?)\)?(\s*;?)$/, 'DBMS_OUTPUT.PUT_LINE($1);');
      }

      // Assegnazioni (euristica semplice)
      // def var = val -> var := val;
      if (content.startsWith('def ')) {
        content = content.replace(/^def\s+(\w+)\s*=\s*(.*)/, '$1 := $2;');
      } else if (content.match(/^\w+\s*=\s*/) && !content.startsWith('if') && !content.startsWith('while') && !content.startsWith('for')) {
        // var = val -> var := val; (solo se inizia con parola e =)
        content = content.replace(/^(\w+)\s*=\s*(.*)/, '$1 := $2;');
      }

      // Strutture di controllo
      if (content.startsWith('if')) {
        content = content.replace(/^if\s*\((.*)\)\s*\{?$/, 'IF $1 THEN');
        blockStack.push('IF');
      } else if (content.startsWith('while')) {
        content = content.replace(/^while\s*\((.*)\)\s*\{?$/, 'WHILE $1 LOOP');
        blockStack.push('LOOP');
      } else if (content.startsWith('for')) {
        if (content.includes(' in ')) {
          content = content.replace(/^for\s*\((.*)\s+in\s+(.*)\)\s*\{?$/, 'FOR $1 IN $2 LOOP');
        } else {
          content = content.replace(/^for\s*\((.*)\)\s*\{?$/, 'FOR $1 LOOP');
        }
        blockStack.push('LOOP');
      } else if (content.match(/^\}\s*else\s*\{?$/) || content === '} else {') {
        content = 'ELSE';
      } else if (content === '}') {
        const lastBlock = blockStack.pop();
        content = lastBlock === 'LOOP' ? 'END LOOP;' : 'END IF;';
      } else if (content.startsWith('return')) {
        content = content.replace(/^return\s+(.*)/, 'RETURN $1;').replace(/^return;/, 'RETURN;');
      }

      // Aggiunta punto e virgola finale se manca e non è una keyword strutturale
      if (
        !content.endsWith(';') &&
        !content.endsWith('THEN') &&
        !content.endsWith('LOOP') &&
        !content.endsWith('ELSE') &&
        !content.startsWith('--') &&
        !content.startsWith('BEGIN') &&
        !content.startsWith('END') &&
        content !== '{' &&
        content !== '}'
      ) {
        content += ';';
      }

      return indent + content;
    })
    .join('\n')
    .replace(/\{;/g, '')
    .replace(/;;/g, ';');
}

function findParentTab(gridElement) {
  let parent = gridElement.parentElement;
  while (parent && parent.nodeName !== 'form') {
    if (parent.nodeName === 'tab') {
      return {
        name: parent.getAttribute('name'),
        label: parent.getAttribute('label'),
        order: parent.getAttribute('order'),
      };
    }
    parent = parent.parentElement;
  }
  return null;
}

function concatenateGroovyScripts(actionRefs, actionsMap) {
  if (!actionRefs || actionRefs.length === 0) return [];
  const concatenated = [];
  actionRefs.forEach((actionRef) => {
    if (actionsMap[actionRef]) {
      concatenated.push({
        actionName: actionRef,
        classes: actionsMap[actionRef].classes || [],
        openPopup: actionsMap[actionRef].openPopup || null,
      });
    }
  });
  return concatenated;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
