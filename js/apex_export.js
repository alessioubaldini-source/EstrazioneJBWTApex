function getColumnsFromQuery(query) {
  const selectFromMatch = query.match(/select\s+(.*?)\s+from/is);
  if (!selectFromMatch) return [];

  // Naive split by comma. Limitation: doesn't handle commas inside function calls like DECODE(a,b,c,d).
  const columnDefs = selectFromMatch[1].split(',').map((s) => s.trim());

  return columnDefs.map((def) => {
    // Match `... as "ALIAS"` or `... ALIAS` at the end of the string.
    const aliasMatch = def.match(/(?:\s+as)?\s+("?[\w$#]+"?)$/i);

    if (aliasMatch) {
      const expression = def.substring(0, aliasMatch.index).trim();
      // Make sure it's not just a single word, which would be a column name, not an expression with an alias
      if (expression && expression.split(/\s+/).length > 0) {
        return aliasMatch[1].replace(/"/g, '');
      }
    }

    // If no alias, it's a simple column name like `my_col` or `table.my_col`
    const lastDotIndex = def.lastIndexOf('.');
    if (lastDotIndex > -1) {
      return def.substring(lastDotIndex + 1).trim();
    }
    return def.trim(); // Fallback for simple `column`
  });
}

function downloadApexSharedComponents() {
  if (!currentData) return;

  const docTitle = currentFilename.replace(/\.xml$/i, '');
  let scriptBody = '';
  let lovCount = 0;
  const allBindVariables = new Set();

  // Get APEX settings with defaults
  const apexSettings = appSettings.apex || {};
  const appId = apexSettings.appId || '100';
  const workspaceId = apexSettings.workspaceId || '1400409653939251';
  const schema = apexSettings.schema || 'CMS';
  const apiVersion = apexSettings.apiVersion || '2024.05.31';
  const release = apexSettings.release || '24.1.3';

  // --- First pass to generate body and collect binds ---
  currentData.grids.forEach((grid) => {
    const processLovOrCombo = (item, type) => {
      let query = '';
      const itemName = item.name;
      const itemLabel = item.label || itemName;
      // Sanitize name for prompt
      const sanitizedItemName = (itemName || 'lov')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .substring(0, 50);
      // Create a more descriptive LOV name for APEX UI
      const lovName = `${docTitle} - ${grid.name} - ${itemLabel}`.substring(0, 255).replace(/'/g, "''");

      if (type === 'combo') {
        if (item.sqlValue) {
          query = item.sqlValue;
        } else if (item.rows && item.rows.length > 0) {
          query = item.rows
            .map((row) => {
              const label = (row.label || '').replace(/'/g, "''");
              const id = (row.id || '').replace(/'/g, "''");
              return `select '${label}' as display_value, '${id}' as return_value from dual`;
            })
            .join('\nunion all\n');
        }
      } else {
        // lov
        if (item.value) {
          query = item.value;
        }
      }

      if (query) {
        // Find bind variables
        const binds = query.match(/:[A-Za-z0-9_]+/g);
        if (binds) {
          binds.forEach((bind) => allBindVariables.add(bind));
        }

        // Remove ORDER BY clause
        const cleanQuery = query.replace(/\s+order\s+by\s+[\s\S]*$/i, '');

        // Extract columns from query
        const columns = getColumnsFromQuery(cleanQuery);
        if (columns.length === 0) {
          return; // Skip if no columns found
        }

        // Determine return, display, and sort columns
        const upperCols = columns.map((c) => c.toUpperCase());
        let returnCol = 'ID';
        if (!upperCols.includes('ID')) {
          returnCol = 'RETURN_VALUE';
          if (!upperCols.includes('RETURN_VALUE')) {
            returnCol = columns[0];
          }
        }

        let displayCol = 'DISPLAY';
        if (!upperCols.includes('DISPLAY')) {
          displayCol = 'DISPLAY_VALUE';
          if (!upperCols.includes('DISPLAY_VALUE')) {
            displayCol = 'LABEL';
            if (!upperCols.includes('LABEL')) {
              displayCol = columns.length > 1 ? columns[1] : columns[0];
            }
          }
        }

        const sortCol = returnCol;

        // The q'[]' syntax is great, but we need to escape any ']' inside the query.
        const sanitizedQuery = cleanQuery.replace(/]/g, ']]');

        scriptBody += `prompt --application/shared_components/user_interface/lovs/${sanitizedItemName}\n`;
        scriptBody += `begin\n`;
        scriptBody += `wwv_flow_imp_shared.create_list_of_values(\n`;
        scriptBody += ` p_id=>wwv_flow_imp.id(your_schema.your_sequence.nextval) -- TODO: Replace with a real sequence call or a unique static ID\n`;
        scriptBody += `,p_lov_name=>'${lovName}'\n`;
        scriptBody += `,p_lov_query=>q'[${sanitizedQuery}]'\n`;
        scriptBody += `,p_source_type=>'SQL'\n`;
        scriptBody += `,p_location=>'LOCAL'\n`;
        scriptBody += `,p_return_column_name=>'${returnCol}'\n`;
        scriptBody += `,p_display_column_name=>'${displayCol}'\n`;
        scriptBody += `,p_group_sort_direction=>'ASC'\n`;
        scriptBody += `,p_default_sort_column_name=>'${sortCol}'\n`;
        scriptBody += `,p_default_sort_direction=>'ASC'\n`;
        scriptBody += `);\n`;

        columns.forEach((col, index) => {
          const heading = col.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
          scriptBody += `wwv_flow_imp_shared.create_list_of_values_cols(\n`;
          scriptBody += ` p_id=>wwv_flow_imp.id(your_schema.your_sequence.nextval) -- TODO: Use another unique ID\n`;
          scriptBody += `,p_query_column_name=>'${col}'\n`;
          scriptBody += `,p_heading=>'${heading}'\n`;
          scriptBody += `,p_display_sequence=>${(index + 1) * 10}\n`;
          scriptBody += `,p_data_type=>'VARCHAR2' -- TODO: Adjust data type if needed\n`;
          scriptBody += `);\n`;
        });

        scriptBody += `end;\n`;
        scriptBody += `/\n\n`;
        lovCount++;
      }
    };

    if (grid.listOfValues && grid.listOfValues.length > 0) {
      grid.listOfValues.forEach((lov) => processLovOrCombo(lov, 'lov'));
    }

    if (grid.comboboxes && grid.comboboxes.length > 0) {
      grid.comboboxes.forEach((combo) => processLovOrCombo(combo, 'combo'));
    }
  });

  if (lovCount === 0) {
    alert('Nessuna List of Values o Combobox trovata da esportare.');
    return;
  }

  let scriptContent = '';

  // --- BIND VARIABLES COMMENT ---
  if (allBindVariables.size > 0) {
    scriptContent += `prompt -- Bind variables used in this script\n`;
    Array.from(allBindVariables)
      .sort()
      .forEach((bind) => {
        scriptContent += `prompt -- ${bind}\n`;
      });
    scriptContent += `--------------------------------------------------------------------------------\n`;
  }

  // --- HEADER ---
  scriptContent += `prompt --application/set_environment\n`;
  scriptContent += `set define off verify off feedback off\n`;
  scriptContent += `whenever sqlerror exit sql.sqlcode rollback\n`;
  scriptContent += `--------------------------------------------------------------------------------\n`;
  scriptContent += `--\n-- Oracle APEX export file\n`;
  scriptContent += `-- Generated by EstrazioneJBWTApex on: ${new Date().toISOString()}\n`;
  scriptContent += `--\n-- NOTE: Please review and adjust IDs, names, and queries before running this script.\n`;
  scriptContent += `--------------------------------------------------------------------------------\n`;
  scriptContent += `begin\n`;
  scriptContent += `wwv_flow_imp.import_begin (\n`;
  scriptContent += ` p_version_yyyy_mm_dd=>'${apiVersion}'\n`;
  scriptContent += `,p_release=>'${release}'\n`;
  scriptContent += `,p_default_workspace_id=>${workspaceId}\n`;
  scriptContent += `,p_default_application_id=>${appId}\n`;
  scriptContent += `,p_default_id_offset=>0\n`;
  scriptContent += `,p_default_owner=>'${schema}'\n`;
  scriptContent += `);\n`;
  scriptContent += `end;\n`;
  scriptContent += `/\n\n`;

  scriptContent += `begin\n`;
  scriptContent += `  -- replace components\n`;
  scriptContent += `  wwv_flow_imp.g_mode := 'REPLACE';\n`;
  scriptContent += `end;\n`;
  scriptContent += `/\n\n`;

  scriptContent += scriptBody;

  // --- FOOTER ---
  scriptContent += `prompt --application/end_environment\n`;
  scriptContent += `begin\n`;
  scriptContent += `    wwv_flow_imp.import_end(p_auto_install_sup_obj => nvl(wwv_flow_application_install.get_auto_install_sup_obj, false));\n`;
  scriptContent += `    commit;\n`;
  scriptContent += `end;\n`;
  scriptContent += `/\n`;
  scriptContent += `set verify on feedback on define on\n`;
  scriptContent += `prompt  ...done\n`;

  // --- DOWNLOAD ---
  const blob = new Blob([scriptContent], { type: 'application/sql;charset=utf-8' });
  saveAs(blob, `${docTitle}_apex_shared_components.sql`);
}
