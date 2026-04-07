function parseXML(xmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  if (xmlDoc.querySelector('parsererror')) {
    throw new Error('Errore nel parsing XML');
  }

  const excludeFilter = document.getElementById('excludeFilterFields') ? document.getElementById('excludeFilterFields').checked : false;

  const globalActionsMap = extractActions(xmlDoc, (node) => !node.closest('grid'));
  const result = {
    grids: [],
    popups: [],
    description: null,
    whenNewFormInstance: [],
    whenNewFormInstanceGroovy: [],
    globalActions: [],
    moduleInfo: getModuleRange(currentFilename),
    formParams: [],
  };

  const commentMatch = xmlText.match(/<!--[\s\S]*?Descrizione\.+:\s*(.+?)\s*-->/);
  if (commentMatch && commentMatch[1]) {
    result.description = decodeJBWTMessage(commentMatch[1].trim());
  }

  // Populate globalActions
  Object.keys(globalActionsMap).forEach((key) => {
    result.globalActions.push({
      actionName: key,
      ...globalActionsMap[key],
    });
  });

  const formParamNodes = xmlDoc.querySelectorAll('form > params > param, form > param');
  formParamNodes.forEach((p) => {
    result.formParams.push({
      name: p.getAttribute('name'),
      javaType: p.getAttribute('javaType'),
      value: p.textContent.trim(),
    });
  });

  const formWhenNew = xmlDoc.querySelector('form > events > whenNewFormInstance');
  if (formWhenNew) {
    const actionRef = formWhenNew.getAttribute('actionRef');
    if (actionRef) {
      result.whenNewFormInstance = actionRef.split(',').map((a) => a.trim());
      result.whenNewFormInstanceGroovy = concatenateGroovyScripts(result.whenNewFormInstance, globalActionsMap);
    }
  }

  const popups = xmlDoc.querySelectorAll('form > popups > popup');
  popups.forEach((popup) => {
    let callFormName = null;
    const params = [];

    const callFormPopup = popup.getElementsByTagName('callFormPopup')[0];
    if (callFormPopup) {
      const nameNode = callFormPopup.getElementsByTagName('callFormName')[0];
      if (nameNode) callFormName = nameNode.textContent.trim();

      const paramsList = callFormPopup.getElementsByTagName('paramsList')[0];
      if (paramsList) {
        const paramNodes = paramsList.querySelectorAll('param');
        paramNodes.forEach((p) => {
          params.push({
            name: p.getAttribute('name'),
            alias: p.getAttribute('alias'),
          });
        });
      }
    }

    const popupData = {
      name: popup.getAttribute('name'),
      title: decodeJBWTMessage(popup.getAttribute('title')),
      width: popup.getAttribute('width'),
      height: popup.getAttribute('height'),
      callFormName: callFormName,
      params: params,
      grids: [],
    };
    const popupGrids = popup.querySelectorAll('grids > grid');
    popupGrids.forEach((g) => {
      popupData.grids.push(g.getAttribute('name'));
    });
    result.popups.push(popupData);
  });

  const grids = xmlDoc.querySelectorAll('grid');
  grids.forEach((grid) => {
    const insertAttr = grid.getAttribute('insertAllowed');
    const updateAttr = grid.getAttribute('updateAllowed');
    const deleteAttr = grid.getAttribute('deleteAllowed');

    const gridLocalActions = extractActions(grid);
    const gridActionsMap = { ...globalActionsMap, ...gridLocalActions };

    let parsedCheckAndSaveData = null;
    const checkAndSave = grid.querySelector('action[name="save"] class[class="CheckAndSaveData"]');
    if (checkAndSave) {
      parsedCheckAndSaveData = { insert: [], update: [], delete: [] };
      ['insert', 'update', 'delete'].forEach((op) => {
        const lists = checkAndSave.querySelectorAll(`list[name="${op}"] > value`);
        lists.forEach((val) => {
          parsedCheckAndSaveData[op].push(val.textContent.trim());
        });
      });
    }

    const gridData = {
      name: grid.getAttribute('name'),
      label: decodeJBWTMessage(grid.getAttribute('label')),
      type: grid.getAttribute('type'),
      ref: grid.getAttribute('ref'),
      order: grid.getAttribute('order'),
      insertAllowed: insertAttr !== null ? insertAttr : parsedCheckAndSaveData && parsedCheckAndSaveData.insert.length > 0 ? 'true' : 'false',
      updateAllowed: updateAttr !== null ? updateAttr : parsedCheckAndSaveData && parsedCheckAndSaveData.update.length > 0 ? 'true' : 'false',
      deleteAllowed: deleteAttr !== null ? deleteAttr : parsedCheckAndSaveData && parsedCheckAndSaveData.delete.length > 0 ? 'true' : 'false',
      tab: findParentTab(grid),
      masterRegion: grid.getAttribute('masterRegion'),
      rpcExpand: null,
      rpcExpandInitOrderBy: null,
      rpcExpandInit: null,
      listOfValues: [],
      comboboxes: [],
      checkAndSaveData: parsedCheckAndSaveData,
      beforeCommitValidation: [],
      events: [],
      topToolbarButtons: [],
      bottomToolbarButtons: [],
      fields: [],
      templates: {},
    };

    const filterNode = getDirectChild(grid, 'filter');
    if (filterNode) {
      const templatesNode = getDirectChild(filterNode, 'templates');
      if (templatesNode) {
        Array.from(templatesNode.children).forEach((t) => {
          if (t.nodeName === 'template') {
            const tName = t.getAttribute('name');
            if (tName) gridData.templates[tName] = t.textContent.trim();
          }
        });
      }
    }
    const directTemplates = getDirectChild(grid, 'templates');
    if (directTemplates) {
      Array.from(directTemplates.children).forEach((t) => {
        if (t.nodeName === 'template') {
          const tName = t.getAttribute('name');
          if (tName) gridData.templates[tName] = t.textContent.trim();
        }
      });
    }

    const rpcExpandTag = getDirectChild(grid, 'rpcExpand');
    if (rpcExpandTag) {
      const rpcExpandValue = rpcExpandTag.querySelector('paginatedExpand > value') || rpcExpandTag.querySelector('expand > value') || rpcExpandTag.querySelector('value');

      if (rpcExpandValue) {
        gridData.rpcExpand = rpcExpandValue.textContent.trim();
      }

      const initOrderBy = rpcExpandTag.querySelector('paginatedExpand > initOrderBy');
      if (initOrderBy) {
        gridData.rpcExpandInitOrderBy = initOrderBy.textContent.trim();
      }
    }

    const rpcExpandInitTag = getDirectChild(grid, 'rpcExpandInit');
    if (rpcExpandInitTag) {
      const rpcExpandInitValue = rpcExpandInitTag.querySelector('expand > value');
      if (rpcExpandInitValue) {
        gridData.rpcExpandInit = rpcExpandInitValue.textContent.trim();
      }
    }

    // Estrazione Eventi Grid
    gridData.events = extractEventsFromNode(grid, gridActionsMap);

    // Estrazione Eventi Fields (es. whenFinishEditValue)
    const allFields = grid.querySelectorAll('fields > *');
    allFields.forEach((field) => {
      const fName = field.getAttribute('name');
      if (excludeFilter && fName && fName.endsWith('Filter')) return;

      const validRegexNode = getDirectChild(field, 'validRegex');
      let validRegex = null;
      if (validRegexNode) {
        const regexNode = validRegexNode.querySelector('regex');
        const messageNode = validRegexNode.querySelector('message');
        if (regexNode) {
          validRegex = {
            regex: regexNode.textContent.trim(),
            match: regexNode.getAttribute('match'),
            message: messageNode ? decodeJBWTMessage(messageNode.textContent.trim()) : null,
          };
        }
      }

      gridData.fields.push({
        tag: field.tagName,
        name: fName,
        label: decodeJBWTMessage(field.getAttribute('label')),
        hint: decodeJBWTMessage(field.getAttribute('hint')),
        length: field.getAttribute('length'),
        isMandatory: field.getAttribute('ismandatory'),
        isEditable: field.getAttribute('iseditable'),
        updateAllowed: field.getAttribute('updateAllowed'),
        isHidden: field.getAttribute('ishidden'),
        order: field.getAttribute('order'),
        horder: field.getAttribute('horder'),
        validRegex: validRegex,
      });

      const fEvents = extractEventsFromNode(field, gridActionsMap, fName);
      gridData.events.push(...fEvents);
    });

    const lovs = grid.querySelectorAll('fields > listOfValue');
    lovs.forEach((lov) => {
      const name = lov.getAttribute('name');
      if (excludeFilter && name && name.endsWith('Filter')) return;
      const lovData = {
        name: name,
        label: decodeJBWTMessage(lov.getAttribute('label')),
        value: null,
        initOrderBy: null,
      };
      const lovValue = lov.querySelector('rpcExpand > paginatedExpand > value, rpcExpand > expand > value');
      if (lovValue) {
        lovData.value = lovValue.textContent.trim();
      }
      const lovInitOrderBy = lov.querySelector('rpcExpand > paginatedExpand > initOrderBy');
      if (lovInitOrderBy) {
        lovData.initOrderBy = lovInitOrderBy.textContent.trim();
      }
      gridData.listOfValues.push(lovData);
    });

    const combos = grid.querySelectorAll('fields > combobox, filter > fields > combobox');
    combos.forEach((combo) => {
      const name = combo.getAttribute('name');
      if (excludeFilter && name && name.endsWith('Filter')) return;
      const comboData = {
        name: name,
        label: decodeJBWTMessage(combo.getAttribute('label')),
        rows: [],
        sqlValue: null,
      };

      const rows = combo.querySelectorAll('rpcExpand > resultset > row');
      if (rows.length > 0) {
        rows.forEach((row) => {
          const id = row.querySelector('id')?.textContent || '';
          const label = decodeJBWTMessage(row.querySelector('label')?.textContent || '');
          comboData.rows.push({ id, label });
        });
      }

      const sqlValue = combo.querySelector('rpcExpand > expand > value');
      if (sqlValue) {
        comboData.sqlValue = sqlValue.textContent.trim();
      }

      gridData.comboboxes.push(comboData);
    });

    const beforeCommit = grid.querySelectorAll('beforeCommitValidation');
    beforeCommit.forEach((bc) => {
      gridData.beforeCommitValidation.push({
        name: bc.getAttribute('name'),
        sql: bc.querySelector('param[name="sql"]')?.textContent.trim() || '',
        function: bc.querySelector('param[name="function"]')?.textContent.trim() || '',
        failMessage: decodeJBWTMessage(bc.querySelector('param[name="failMessage"]')?.textContent.trim() || ''),
      });
    });

    const topToolbar = getDirectChild(grid, 'topToolbar');
    if (topToolbar) {
      const buttons = topToolbar.querySelectorAll('button, callFormButton');
      const excludedButtons = ['save', 'insert', 'delete', 'reload', 'excel', 'filter'];
      buttons.forEach((btn) => {
        const name = btn.getAttribute('name');
        if (excludedButtons.includes(name)) return;

        let actionRefs = [];
        const whenPressed = btn.querySelector('events > whenButtonPressed');
        if (whenPressed) {
          const actionRefAttr = whenPressed.getAttribute('actionRef');
          if (actionRefAttr) {
            actionRefs = actionRefAttr.split(',').map((a) => a.trim());
          }
        }

        let type = btn.tagName;
        let callFormName = '';
        if (type === 'callFormButton') {
          const callFormNode = btn.querySelector('callFormName');
          if (callFormNode) callFormName = callFormNode.textContent;
        }

        const params = [];
        const paramsList = btn.querySelector('paramsList');
        if (paramsList) {
          const paramNodes = paramsList.querySelectorAll('param');
          paramNodes.forEach((p) => {
            params.push({
              name: p.getAttribute('name'),
              alias: p.getAttribute('alias'),
            });
          });
        }

        gridData.topToolbarButtons.push({
          type: type,
          name: name,
          label: decodeJBWTMessage(btn.getAttribute('label') || btn.getAttribute('hint')),
          order: btn.getAttribute('order'),
          callFormName: callFormName,
          actionRef: actionRefs,
          params: params,
          groovyScripts: concatenateGroovyScripts(actionRefs, gridActionsMap),
        });
      });
    }

    const bottomToolbar = getDirectChild(grid, 'bottomToolbar');
    if (bottomToolbar) {
      const buttons = bottomToolbar.querySelectorAll('button, callFormButton');
      buttons.forEach((btn) => {
        let actionRefs = [];
        const whenPressed = btn.querySelector('events > whenButtonPressed');
        if (whenPressed) {
          const actionRefAttr = whenPressed.getAttribute('actionRef');
          if (actionRefAttr) {
            actionRefs = actionRefAttr.split(',').map((a) => a.trim());
          }
        }

        let type = btn.tagName;
        let callFormName = '';
        if (type === 'callFormButton') {
          const callFormNode = btn.querySelector('callFormName');
          if (callFormNode) callFormName = callFormNode.textContent;
        }

        const params = [];
        const paramsList = btn.querySelector('paramsList');
        if (paramsList) {
          const paramNodes = paramsList.querySelectorAll('param');
          paramNodes.forEach((p) => {
            params.push({
              name: p.getAttribute('name'),
              alias: p.getAttribute('alias'),
            });
          });
        }

        gridData.bottomToolbarButtons.push({
          type: type,
          name: btn.getAttribute('name'),
          label: decodeJBWTMessage(btn.getAttribute('label') || btn.getAttribute('hint')),
          order: btn.getAttribute('order'),
          callFormName: callFormName,
          actionRef: actionRefs,
          params: params,
          groovyScripts: concatenateGroovyScripts(actionRefs, gridActionsMap),
        });
      });
    }

    result.grids.push(gridData);
  });

  return result;
}

function extractEventsFromNode(node, actionsMap, context = null) {
  const events = [];
  const eventsNode = getDirectChild(node, 'events');
  if (eventsNode) {
    Array.from(eventsNode.children).forEach((evt) => {
      const evtName = evt.nodeName;
      const actionRefAttr = evt.getAttribute('actionRef');
      const waitingWindow = evt.getAttribute('waitingWindow');

      let actionRefs = [];
      if (actionRefAttr) {
        actionRefs = actionRefAttr.split(',').map((a) => a.trim());
      }

      events.push({
        name: evtName,
        waitingWindow: waitingWindow,
        actionRefs: actionRefs,
        groovyScripts: concatenateGroovyScripts(actionRefs, actionsMap),
        context: context, // Nome del campo se è un evento di campo
      });
    });
  }
  return events;
}

function extractActions(rootNode, filterFn = null) {
  const actionsMap = {};
  const actions = rootNode.querySelectorAll('action');

  actions.forEach((action) => {
    if (filterFn && !filterFn(action)) return;
    const actionName = action.getAttribute('name');
    if (!actionName) return;

    const actionData = { classes: [], openPopup: null };

    // Estrazione openPopup
    const openPopupNode = action.querySelector('openPopup');
    if (openPopupNode) {
      actionData.openPopup = {
        name: openPopupNode.getAttribute('name'),
      };
    }

    const groovyClasses = action.querySelectorAll('classes > class');

    groovyClasses.forEach((groovyClass) => {
      const className = groovyClass.getAttribute('name');
      const classType = groovyClass.getAttribute('class');
      const failMessage = groovyClass.querySelector('param[name="failMessage"]')?.textContent.trim() || null;

      const groovyParam = groovyClass.querySelector('param[name="groovy"]');
      const sqlParam = groovyClass.querySelector('param[name="sql"]');
      const callFormParamsList = groovyClass.querySelector('callFormParamsList');

      if (groovyParam) {
        actionData.classes.push({
          type: 'groovy',
          className: className,
          classType: classType,
          failMessage: decodeJBWTMessage(failMessage),
          script: groovyParam.textContent.trim(),
        });
      } else if (sqlParam) {
        actionData.classes.push({
          type: 'sql',
          className: className,
          classType: classType,
          failMessage: decodeJBWTMessage(failMessage),
          sql: sqlParam.textContent.trim(),
          function: groovyClass.querySelector('param[name="function"]')?.textContent.trim() || '',
        });
      } else if (callFormParamsList) {
        const params = [];
        const paramNodes = callFormParamsList.querySelectorAll('param');
        paramNodes.forEach((p) => {
          params.push({
            name: p.getAttribute('name'),
            alias: p.getAttribute('alias'),
          });
        });
        actionData.classes.push({
          type: 'paramsList',
          className: className,
          classType: classType,
          params: params,
        });
      }
    });

    if (actionData.classes.length > 0 || actionData.openPopup) {
      actionsMap[actionName] = actionData;
    }
  });
  return actionsMap;
}
