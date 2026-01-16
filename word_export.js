// Funzione Export Word
async function downloadWord() {
  if (!currentData || !window.docx) return;

  const docTitle = currentFilename.replace(/\.xml$/i, '');

  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, ShadingType, TableOfContents, PageBreak } = window.docx;

  // --- HELPERS STILE ---

  // Helper generico per celle
  const createCell = (text, opts = {}) => {
    const { bold = false, width = null, bg = null, color = '000000', size = 22 } = opts;
    return new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({ text: text || '', bold: bold, size: size, color: color })],
          spacing: { before: 60, after: 60 }, // Padding verticale
        }),
      ],
      width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
      shading: bg ? { fill: bg, type: ShadingType.CLEAR } : undefined,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      },
      margins: { top: 80, bottom: 80, left: 80, right: 80 },
    });
  };

  // Cella per Etichette (es. "Nome:", "Tipo:") - Sfondo grigio chiaro, testo scuro
  const createLabelCell = (text, width = null) => createCell(text, { bold: true, width, bg: 'F3F4F6', color: '374151' });

  // Cella per Valori - Sfondo bianco
  const createValueCell = (text, width = null) => createCell(text, { width, color: '111827' });

  // Cella per Intestazioni Tabelle (es. "ID", "Label") - Sfondo più scuro
  const createHeaderCell = (text, width = null) => createCell(text, { bold: true, width, bg: 'E5E7EB', color: '000000' });

  // Helper per blocchi di codice
  const createCodeBlock = (code, type = 'sql') => {
    if (!code) return new Paragraph('');

    let fillColor = 'F9FAFB'; // Default Gray
    if (type === 'groovy') fillColor = 'FFF7ED'; // Light Orange
    else if (type === 'sql') fillColor = 'EFF6FF'; // Light Blue

    return new Paragraph({
      children: [
        new TextRun({
          text: code,
          font: 'Courier New',
          size: 18, // 9pt
          color: '1F2937',
        }),
      ],
      spacing: { before: 120, after: 120 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
      },
      shading: { fill: fillColor, type: ShadingType.CLEAR },
      indent: { left: 100, right: 100 },
    });
  };

  const docChildren = [];

  // --- TITOLO ---
  docChildren.push(
    new Paragraph({
      text: docTitle,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }, // Spazio gestito dallo stile globale, ma questo è extra
    })
  );

  // --- INDICE ---
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: 'Indice', bold: true, size: 24 })],
      spacing: { after: 200 },
    })
  );
  docChildren.push(
    new TableOfContents('Sommario', {
      hyperlink: true,
      headingStyleRange: '1-3',
    })
  );
  docChildren.push(new Paragraph({ children: [new PageBreak()] }));

  if (currentData.description) {
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Descrizione: ', bold: true, size: 24 }), new TextRun({ text: currentData.description, size: 24 })],
        spacing: { after: 400 },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: '2563EB' } }, // Bordo blu a sinistra
        indent: { left: 200 },
      })
    );
  }

  // --- POPUPS ---
  if (currentData.popups && currentData.popups.length > 0) {
    docChildren.push(new Paragraph({ text: 'Popups', heading: HeadingLevel.HEADING_1 }));

    currentData.popups.forEach((popup) => {
      docChildren.push(new Paragraph({ text: popup.name, heading: HeadingLevel.HEADING_2 }));

      const rows = [
        new TableRow({ children: [createLabelCell('Title', 30), createValueCell(popup.title || 'N/A', 70)] }),
        new TableRow({ children: [createLabelCell('CallForm', 30), createValueCell(popup.callFormName || 'N/A', 70)] }),
        new TableRow({ children: [createLabelCell('Dimensions', 30), createValueCell(`${popup.width} x ${popup.height}`, 70)] }),
        new TableRow({ children: [createLabelCell('Grids', 30), createValueCell(popup.grids.join(', ') || 'None', 70)] }),
      ];

      docChildren.push(new Table({ rows: rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      docChildren.push(new Paragraph({ text: '', spacing: { after: 400 } }));
    });
  }

  // --- WHEN NEW FORM INSTANCE ---
  if (currentData.whenNewFormInstance.length > 0) {
    docChildren.push(new Paragraph({ text: 'When New Form Instance', heading: HeadingLevel.HEADING_1 }));
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'Action Refs: ', bold: true }), new TextRun(currentData.whenNewFormInstance.join(', '))],
        spacing: { after: 200 },
      })
    );

    if (currentData.whenNewFormInstanceGroovy.length > 0) {
      currentData.whenNewFormInstanceGroovy.forEach((action) => {
        action.classes.forEach((cls) => {
          docChildren.push(new Paragraph({ text: `Action: ${action.actionName} (${cls.type})`, heading: HeadingLevel.HEADING_3 }));
          if (cls.failMessage) docChildren.push(new Paragraph({ text: `Fail Msg: ${cls.failMessage}`, color: '991B1B' }));
          docChildren.push(createCodeBlock(cls.script || cls.sql, cls.type));
        });
      });
    }
  }

  // --- GRIDS ---
  if (currentData.grids.length > 0) {
    docChildren.push(new Paragraph({ text: 'Grids', heading: HeadingLevel.HEADING_1 }));

    currentData.grids.forEach((grid) => {
      // Grid Header
      docChildren.push(new Paragraph({ text: `Grid: ${grid.name}`, heading: HeadingLevel.HEADING_2 }));

      // Helper per permessi colorati
      const createPermRun = (label, val) => {
        const isTrue = String(val) === 'true';
        return [new TextRun({ text: `${label}: `, size: 22, color: '111827' }), new TextRun({ text: String(val), bold: true, size: 22, color: isTrue ? '166534' : '991B1B' }), new TextRun({ text: '  ', size: 22 })];
      };

      const permCell = new TableCell({
        children: [
          new Paragraph({
            children: [...createPermRun('I', grid.insertAllowed), ...createPermRun('U', grid.updateAllowed), ...createPermRun('D', grid.deleteAllowed)],
            spacing: { before: 60, after: 60 },
          }),
        ],
        width: { size: 80, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
        },
        margins: { top: 80, bottom: 80, left: 80, right: 80 },
      });

      // Grid Info Table
      const infoRows = [
        new TableRow({ children: [createLabelCell('Label', 20), createValueCell(grid.label || '', 30), createLabelCell('Type', 20), createValueCell(grid.type || '', 30)] }),
        new TableRow({ children: [createLabelCell('Tab', 20), createValueCell(grid.tab ? grid.tab.label : '', 30), createLabelCell('Ref', 20), createValueCell(grid.ref || '', 30)] }),
        new TableRow({ children: [createLabelCell('Permissions', 20), permCell] }),
      ];
      docChildren.push(new Table({ rows: infoRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      docChildren.push(new Paragraph({ text: '', spacing: { after: 240 } }));

      // Templates
      const tplKeys = Object.keys(grid.templates);
      if (tplKeys.length > 0) {
        docChildren.push(new Paragraph({ text: 'Templates', heading: HeadingLevel.HEADING_3 }));
        tplKeys.forEach((key) => {
          docChildren.push(new Paragraph({ text: key, bold: true, spacing: { before: 200 } }));
          docChildren.push(createCodeBlock(grid.templates[key], 'sql'));
        });
      }

      // RPC Expand
      if (grid.rpcExpand) {
        docChildren.push(new Paragraph({ text: 'RPC Expand', heading: HeadingLevel.HEADING_3 }));
        docChildren.push(createCodeBlock(grid.rpcExpand, 'sql'));
        if (grid.rpcExpandInitOrderBy) {
          docChildren.push(new Paragraph({ text: `Init Order By: ${grid.rpcExpandInitOrderBy}`, spacing: { before: 100 } }));
        }
      }

      // Fields
      if (grid.fields && grid.fields.length > 0) {
        docChildren.push(new Paragraph({ text: 'Fields', heading: HeadingLevel.HEADING_3 }));

        const fieldHeader = new TableRow({
          children: [
            createHeaderCell('Type', 10),
            createHeaderCell('Name', 20),
            createHeaderCell('Label', 20),
            createHeaderCell('Hint', 15),
            createHeaderCell('Len', 5),
            createHeaderCell('Mand', 10),
            createHeaderCell('Edit', 10),
            createHeaderCell('Hide', 10),
          ],
        });

        const fieldRows = [fieldHeader];
        grid.fields.forEach((f) => {
          fieldRows.push(
            new TableRow({
              children: [
                createValueCell(f.tag || '', 10),
                createValueCell(f.name || '', 20),
                createValueCell(f.label || '', 20),
                createValueCell(f.hint || '', 15),
                createValueCell(f.length || '', 5),
                createValueCell(f.isMandatory || '', 10),
                createValueCell(f.isEditable || '', 10),
                createValueCell(f.isHidden || '', 10),
              ],
            })
          );
        });

        docChildren.push(new Table({ rows: fieldRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
        docChildren.push(new Paragraph({ text: '', spacing: { after: 240 } }));
      }

      // LOVs
      if (grid.listOfValues.length > 0) {
        docChildren.push(new Paragraph({ text: 'List Of Values', heading: HeadingLevel.HEADING_3 }));
        grid.listOfValues.forEach((lov) => {
          docChildren.push(new Paragraph({ text: `${lov.name} ${lov.label ? `(${lov.label})` : ''}`, bold: true, spacing: { before: 200 } }));
          if (lov.value) docChildren.push(createCodeBlock(lov.value, 'sql'));
          if (lov.initOrderBy) docChildren.push(new Paragraph({ text: `Order By: ${lov.initOrderBy}` }));
        });
      }

      // Comboboxes
      if (grid.comboboxes.length > 0) {
        docChildren.push(new Paragraph({ text: 'Comboboxes', heading: HeadingLevel.HEADING_3 }));
        grid.comboboxes.forEach((combo) => {
          docChildren.push(new Paragraph({ text: `${combo.name} ${combo.label ? `(${combo.label})` : ''}`, bold: true, spacing: { before: 200 } }));
          if (combo.sqlValue) {
            docChildren.push(createCodeBlock(combo.sqlValue, 'sql'));
          } else if (combo.rows.length > 0) {
            const comboRows = [new TableRow({ children: [createHeaderCell('ID'), createHeaderCell('Label')] })];
            combo.rows.forEach((r) => comboRows.push(new TableRow({ children: [createValueCell(r.id), createValueCell(r.label)] })));
            docChildren.push(new Table({ rows: comboRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
          }
        });
      }

      // CheckAndSaveData
      if (grid.checkAndSaveData) {
        const ops = ['insert', 'update', 'delete'];
        const hasData = ops.some((op) => grid.checkAndSaveData[op].length > 0);

        if (hasData) {
          docChildren.push(new Paragraph({ text: 'CheckAndSaveData', heading: HeadingLevel.HEADING_3 }));
          ops.forEach((op) => {
            if (grid.checkAndSaveData[op].length > 0) {
              docChildren.push(new Paragraph({ text: op.charAt(0).toUpperCase() + op.slice(1), bold: true, spacing: { before: 200 } }));
              grid.checkAndSaveData[op].forEach((sql) => {
                docChildren.push(createCodeBlock(sql, 'sql'));
              });
            }
          });
        }
      }

      // Before Commit Validation
      if (grid.beforeCommitValidation.length > 0) {
        docChildren.push(new Paragraph({ text: 'Before Commit Validation', heading: HeadingLevel.HEADING_3 }));
        grid.beforeCommitValidation.forEach((bc) => {
          docChildren.push(new Paragraph({ text: bc.name, bold: true, spacing: { before: 200 } }));
          if (bc.function) docChildren.push(new Paragraph({ text: `Function: ${bc.function}` }));
          if (bc.failMessage) docChildren.push(new Paragraph({ text: `Fail Message: ${bc.failMessage}`, color: '991B1B' }));
          docChildren.push(createCodeBlock(bc.sql, 'sql'));
        });
      }

      // Events
      if (grid.events.length > 0) {
        docChildren.push(new Paragraph({ text: 'Events', heading: HeadingLevel.HEADING_3 }));
        const sortedEvents = [...grid.events].sort((a, b) => {
          const getPriority = (name) => {
            const n = name.toLowerCase();
            if (n.includes('whenexitchangedrecord')) return 1;
            if (n.includes('whenfinishedit')) return 2;
            if (n.includes('whenchangevalue')) return 3;
            return 4;
          };
          return getPriority(a.name) - getPriority(b.name);
        });

        sortedEvents.forEach((evt) => {
          const evtTitle = `${evt.name}${evt.context ? ` (Field: ${evt.context})` : ''}`;
          docChildren.push(
            new Paragraph({
              children: [new TextRun({ text: evtTitle }), new TextRun({ text: evt.waitingWindow ? ' [Waiting Window]' : '', color: 'D97706', size: 20 })],
              heading: HeadingLevel.HEADING_4,
            })
          );

          if (evt.actionRefs.length > 0) {
            docChildren.push(new Paragraph({ text: `Action Refs: ${evt.actionRefs.join(', ')}`, size: 20 }));
          }

          if (evt.groovyScripts.length > 0) {
            evt.groovyScripts.forEach((action) => {
              action.classes.forEach((cls) => {
                docChildren.push(
                  new Paragraph({
                    children: [new TextRun({ text: `>> ${cls.type} (${cls.className})`, size: 20, color: '111827', bold: true, font: 'Aptos' })],
                  })
                );
                docChildren.push(createCodeBlock(cls.script || cls.sql, cls.type));
              });
            });
          }
        });
      }

      // Top Toolbar Buttons
      if (grid.topToolbarButtons && grid.topToolbarButtons.length > 0) {
        docChildren.push(new Paragraph({ text: 'Top Toolbar Buttons', heading: HeadingLevel.HEADING_3 }));
        grid.topToolbarButtons.forEach((btn) => {
          docChildren.push(new Paragraph({ text: `[${btn.type}] ${btn.name} - ${btn.label}`, bold: true, spacing: { before: 200 } }));
          if (btn.callFormName) docChildren.push(new Paragraph({ text: `CallForm: ${btn.callFormName}` }));

          if (btn.params && btn.params.length > 0) {
            const paramText = btn.params.map((p) => `${p.name}=${p.alias}`).join(', ');
            docChildren.push(new Paragraph({ text: `Params: `, size: 20 }));
          }

          if (btn.groovyScripts.length > 0) {
            btn.groovyScripts.forEach((action) => {
              action.classes.forEach((cls) => {
                docChildren.push(
                  new Paragraph({
                    children: [new TextRun({ text: `>> ${cls.type} (${cls.className})`, size: 20, color: '111827', bold: true, font: 'Aptos' })],
                  })
                );
                docChildren.push(createCodeBlock(cls.script || cls.sql, cls.type));
              });
            });
          }
        });
      }

      // Buttons
      if (grid.bottomToolbarButtons.length > 0) {
        docChildren.push(new Paragraph({ text: 'Buttons', heading: HeadingLevel.HEADING_3 }));
        grid.bottomToolbarButtons.forEach((btn) => {
          docChildren.push(new Paragraph({ text: `[${btn.type}] ${btn.name} - ${btn.label}`, bold: true, spacing: { before: 200 } }));
          if (btn.callFormName) docChildren.push(new Paragraph({ text: `CallForm: ${btn.callFormName}` }));

          if (btn.params && btn.params.length > 0) {
            const paramText = btn.params.map((p) => `${p.name}=${p.alias}`).join(', ');
            docChildren.push(new Paragraph({ text: `Params: `, size: 20 }));
          }

          if (btn.groovyScripts.length > 0) {
            btn.groovyScripts.forEach((action) => {
              action.classes.forEach((cls) => {
                docChildren.push(
                  new Paragraph({
                    children: [new TextRun({ text: `>> ${cls.type} (${cls.className})`, size: 20, color: '111827', bold: true, font: 'Aptos' })],
                  })
                );
                docChildren.push(createCodeBlock(cls.script || cls.sql, cls.type));
              });
            });
          }
        });
      }

      // Separatore Grid
      docChildren.push(
        new Paragraph({
          text: '',
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E5E7EB' } },
          spacing: { after: 480 },
        })
      );
    });
  }

  // Creazione Documento
  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 32, bold: true, color: '1E40AF', font: 'Segoe UI' }, // 16pt Blue
          paragraph: { spacing: { before: 400, after: 300 } },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 28, bold: true, color: '374151', font: 'Segoe UI' }, // 14pt Gray
          paragraph: { spacing: { before: 300, after: 200 } },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 24, bold: true, color: '4B5563', font: 'Segoe UI' }, // 12pt Gray
          paragraph: { spacing: { before: 240, after: 120 } },
        },
        {
          id: 'Heading4',
          name: 'Heading 4',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 22, bold: true, color: '4F46E5', font: 'Segoe UI' }, // 11pt Indigo
          paragraph: { spacing: { before: 200, after: 100 } },
        },
      ],
    },
    sections: [
      {
        properties: {},
        children: docChildren,
      },
    ],
  });

  // Generazione e Download
  try {
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${docTitle}.docx`);
  } catch (err) {
    console.error('Errore durante la generazione del Word:', err);
    alert('Errore durante la generazione del documento Word.');
  }
}
