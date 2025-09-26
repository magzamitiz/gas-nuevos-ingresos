/**
 * AUDITOR DE PESO DE HOJA
 * Identifica elementos que hacen lento el appendRow
 * @version 1.0.0
 */

// =================================================================
// AUDITOR PRINCIPAL
// =================================================================
function auditarPesoHoja() {
  console.log('🔍 AUDITANDO PESO DE LA HOJA DE INGRESOS...\n');
  
  const startTime = Date.now();
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.INGRESOS);
  
  if (!sheet) {
    console.log('❌ Hoja de Ingresos no encontrada');
    return null;
  }
  
  const audit = {
    sheet: CONFIG.SHEETS.INGRESOS,
    timestamp: new Date().toISOString(),
    performance: {},
    issues: [],
    recommendations: []
  };
  
  try {
    // 1. Información básica
    console.log('📊 INFORMACIÓN BÁSICA:');
    audit.basic = auditBasicInfo(sheet);
    logBasicInfo(audit.basic);
    
    // 2. Auditar fórmulas
    console.log('\n🧮 FÓRMULAS:');
    audit.formulas = auditFormulas(sheet);
    logFormulaIssues(sheet, audit.formulas, audit.issues, audit.recommendations);
    
    // 3. Auditar formato condicional
    console.log('\n🎨 FORMATO CONDICIONAL:');
    audit.conditionalFormatting = auditConditionalFormatting(sheet);
    logConditionalFormattingIssues(audit.conditionalFormatting, audit.issues, audit.recommendations);
    
    // 4. Auditar validaciones de datos
    console.log('\n✅ VALIDACIONES DE DATOS:');
    audit.dataValidations = auditDataValidations(sheet);
    logDataValidationIssues(audit.dataValidations, audit.issues, audit.recommendations);
    
    // 5. Auditar rangos protegidos
    console.log('\n🔒 RANGOS PROTEGIDOS:');
    audit.protectedRanges = auditProtectedRanges(sheet);
    logProtectedRangeIssues(audit.protectedRanges, audit.issues, audit.recommendations);
    
    // 6. Auditar filtros
    console.log('\n🔍 FILTROS:');
    audit.filters = auditFilters(sheet);
    logFilterIssues(audit.filters, audit.issues, audit.recommendations);
    
    // 7. Resumen final
    const duration = Date.now() - startTime;
    audit.performance.auditDuration = duration;
    
    console.log('\n' + '='.repeat(50));
    console.log('📋 RESUMEN DEL AUDITORÍA:');
    console.log('='.repeat(50));
    console.log(`⏱️  Duración del audit: ${duration}ms`);
    console.log(`🚨 Issues encontrados: ${audit.issues.length}`);
    console.log(`💡 Recomendaciones: ${audit.recommendations.length}`);
    
    if (audit.issues.length > 0) {
      console.log('\n🚨 ISSUES CRÍTICOS:');
      audit.issues.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue}`);
      });
    }
    
    if (audit.recommendations.length > 0) {
      console.log('\n💡 RECOMENDACIONES:');
      audit.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
    }
    
    // 8. Generar script de optimización
    if (audit.issues.length > 0) {
      console.log('\n🔧 Para aplicar optimizaciones automáticamente, ejecuta:');
      console.log('aplicarOptimizacionesAutomaticas()');
    }
    
    return audit;
    
  } catch (error) {
    console.error('❌ Error durante auditoría:', error);
    return null;
  }
}

// =================================================================
// FUNCIONES DE AUDITORÍA ESPECÍFICAS
// =================================================================

function auditBasicInfo(sheet) {
  return {
    name: sheet.getName(),
    lastRow: sheet.getLastRow(),
    lastColumn: sheet.getLastColumn(),
    maxRows: sheet.getMaxRows(),
    maxColumns: sheet.getMaxColumns(),
    frozen: {
      rows: sheet.getFrozenRows(),
      columns: sheet.getFrozenColumns()
    }
  };
}

function auditFormulas(sheet) {
  const formulas = {
    ranges: [],
    volatileFunctions: [],
    arrayFormulas: [],
    fullColumnFormulas: []
  };
  
  try {
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    if (lastRow > 1 && lastCol > 0) {
      const formulaRange = sheet.getRange(1, 1, lastRow, lastCol);
      const formulas2D = formulaRange.getFormulas();
      
      formulas2D.forEach((row, rowIndex) => {
        row.forEach((formula, colIndex) => {
          if (formula && formula.startsWith('=')) {
            const cellAddress = sheet.getRange(rowIndex + 1, colIndex + 1).getA1Notation();
            
            // Detectar fórmulas volátiles
            const volatilePattern = /(NOW\(|TODAY\(|INDIRECT\(|OFFSET\(|RAND\(|RANDBETWEEN\()/i;
            if (volatilePattern.test(formula)) {
              formulas.volatileFunctions.push({
                cell: cellAddress,
                formula: formula
              });
            }
            
            // Detectar fórmulas de columna completa
            const fullColumnPattern = /[A-Z]+:[A-Z]+|[A-Z]+\d+:[A-Z]+$/;
            if (fullColumnPattern.test(formula)) {
              formulas.fullColumnFormulas.push({
                cell: cellAddress,
                formula: formula
              });
            }
            
            // Detectar ARRAYFORMULA
            if (formula.toUpperCase().includes('ARRAYFORMULA')) {
              formulas.arrayFormulas.push({
                cell: cellAddress,
                formula: formula
              });
            }
            
            formulas.ranges.push({
              cell: cellAddress,
              formula: formula.substring(0, 100) + (formula.length > 100 ? '...' : '')
            });
          }
        });
      });
    }
  } catch (error) {
    console.error('Error auditando fórmulas:', error);
  }
  
  return formulas;
}

function auditConditionalFormatting(sheet) {
  const formatting = {
    rules: [],
    fullColumnRules: []
  };
  
  try {
    const conditionalFormatRules = sheet.getConditionalFormatRules();
    
    conditionalFormatRules.forEach((rule, index) => {
      const ranges = rule.getRanges();
      ranges.forEach(range => {
        const rangeNotation = range.getA1Notation();
        
        const ruleInfo = {
          index: index,
          range: rangeNotation,
          type: 'unknown'
        };
        
        // Detectar rangos de columna completa
        if (rangeNotation.includes(':') && !rangeNotation.match(/\d/)) {
          formatting.fullColumnRules.push(ruleInfo);
        }
        
        formatting.rules.push(ruleInfo);
      });
    });
  } catch (error) {
    console.error('Error auditando formato condicional:', error);
  }
  
  return formatting;
}

function auditDataValidations(sheet) {
  const validations = {
    ranges: [],
    fullColumnValidations: []
  };
  
  try {
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    // Solo auditar si hay datos
    if (lastRow > 1 && lastCol > 0) {
      const range = sheet.getRange(1, 1, Math.min(lastRow + 100, sheet.getMaxRows()), lastCol);
      const validationRules = range.getDataValidations();
      
      validationRules.forEach((row, rowIndex) => {
        row.forEach((validation, colIndex) => {
          if (validation) {
            const cellAddress = sheet.getRange(rowIndex + 1, colIndex + 1).getA1Notation();
            validations.ranges.push({
              cell: cellAddress,
              hasValidation: true
            });
          }
        });
      });
    }
  } catch (error) {
    console.error('Error auditando validaciones:', error);
  }
  
  return validations;
}

function auditProtectedRanges(sheet) {
  const protection = {
    ranges: []
  };
  
  try {
    const protectedRanges = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    
    protectedRanges.forEach(protectedRange => {
      protection.ranges.push({
        range: protectedRange.getRange().getA1Notation(),
        description: protectedRange.getDescription()
      });
    });
  } catch (error) {
    console.error('Error auditando rangos protegidos:', error);
  }
  
  return protection;
}

function auditFilters(sheet) {
  const filters = {
    hasFilter: false,
    filterRange: null
  };
  
  try {
    const filter = sheet.getFilter();
    if (filter) {
      filters.hasFilter = true;
      filters.filterRange = filter.getRange().getA1Notation();
    }
  } catch (error) {
    console.error('Error auditando filtros:', error);
  }
  
  return filters;
}

// =================================================================
// FUNCIONES DE LOGGING
// =================================================================

function logBasicInfo(basic) {
  console.log(`📋 Hoja: ${basic.name}`);
  console.log(`📊 Datos: ${basic.lastRow} filas x ${basic.lastColumn} columnas`);
  console.log(`📏 Tamaño máximo: ${basic.maxRows} x ${basic.maxColumns}`);
  console.log(`❄️  Filas/columnas congeladas: ${basic.frozen.rows}/${basic.frozen.columns}`);
}

function logFormulaIssues(sheet, formulas, issues, recommendations) {
  console.log(`📊 Total fórmulas: ${formulas.ranges.length}`);
  console.log(`⚠️  Funciones volátiles: ${formulas.volatileFunctions.length}`);
  console.log(`📋 ARRAYFORMULA: ${formulas.arrayFormulas.length}`);
  console.log(`⚠️  Fórmulas de columna completa: ${formulas.fullColumnFormulas.length}`);
  
  if (formulas.volatileFunctions.length > 0) {
    issues.push(`${formulas.volatileFunctions.length} funciones volátiles (NOW, TODAY, etc.) causan recálculo constante`);
    recommendations.push('Reemplazar funciones volátiles por valores calculados en Apps Script');
  }
  
  if (formulas.fullColumnFormulas.length > 0) {
    issues.push(`${formulas.fullColumnFormulas.length} fórmulas de columna completa (A:A, etc.) procesan miles de filas vacías`);
    recommendations.push('Limitar fórmulas a rangos específicos como A2:A' + (sheet.getLastRow() + 10));
  }
}

function logConditionalFormattingIssues(formatting, issues, recommendations) {
  console.log(`🎨 Reglas de formato: ${formatting.rules.length}`);
  console.log(`⚠️  Reglas de columna completa: ${formatting.fullColumnRules.length}`);
  
  if (formatting.fullColumnRules.length > 0) {
    issues.push(`${formatting.fullColumnRules.length} reglas de formato condicional en columnas completas`);
    recommendations.push('Limitar formato condicional a rangos específicos');
  }
}

function logDataValidationIssues(validations, issues, recommendations) {
  console.log(`✅ Celdas con validación: ${validations.ranges.length}`);
  console.log(`⚠️  Validaciones de columna completa: ${validations.fullColumnValidations.length}`);
  
  if (validations.fullColumnValidations.length > 0) {
    issues.push(`${validations.fullColumnValidations.length} validaciones en columnas completas`);
    recommendations.push('Limitar validaciones a rangos específicos');
  }
}

function logProtectedRangeIssues(protection, issues, recommendations) {
  console.log(`🔒 Rangos protegidos: ${protection.ranges.length}`);
}

function logFilterIssues(filters, issues, recommendations) {
  console.log(`🔍 Filtro activo: ${filters.hasFilter ? 'Sí' : 'No'}`);
  if (filters.hasFilter) {
    console.log(`📍 Rango filtrado: ${filters.filterRange}`);
  }
}

// =================================================================
// APLICAR OPTIMIZACIONES AUTOMÁTICAS
// =================================================================

function aplicarOptimizacionesAutomaticas() {
  console.log('🔧 APLICANDO OPTIMIZACIONES AUTOMÁTICAS...\n');
  
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.INGRESOS);
  
  if (!sheet) {
    console.log('❌ Hoja de Ingresos no encontrada');
    return false;
  }
  
  let optimizationsApplied = 0;
  
  try {
    // 1. CRÍTICO: Limpiar fórmulas de columna completa
    console.log('🧮 Limpiando fórmulas de columna completa...');
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    // Identificar y limpiar fórmulas problemáticas
    if (lastRow > 1 && lastCol > 0) {
      const formulaRange = sheet.getRange(1, 1, lastRow, lastCol);
      const formulas = formulaRange.getFormulas();
      
      let formulasRemoved = 0;
      
      for (let row = 0; row < formulas.length; row++) {
        for (let col = 0; col < formulas[row].length; col++) {
          const formula = formulas[row][col];
          
          if (formula && formula.startsWith('=')) {
            // Detectar fórmulas de columna completa problemáticas
            const hasFullColumnRef = /[A-Z]+:[A-Z]+/.test(formula);
            const hasArrayFormula = formula.toUpperCase().includes('ARRAYFORMULA');
            
            if (hasFullColumnRef || hasArrayFormula) {
              // Limpiar la fórmula problemática
              sheet.getRange(row + 1, col + 1).clearContent();
              formulasRemoved++;
              
              console.log(`🗑️ Removida fórmula en ${sheet.getRange(row + 1, col + 1).getA1Notation()}: ${formula.substring(0, 50)}...`);
              
              // Evitar timeout procesando demasiadas
              if (formulasRemoved >= 50) {
                console.log('⚠️ Límite de limpieza alcanzado, continúa manualmente si es necesario');
                break;
              }
            }
          }
        }
        if (formulasRemoved >= 50) break;
      }
      
      if (formulasRemoved > 0) {
        optimizationsApplied++;
        console.log(`✅ Removidas ${formulasRemoved} fórmulas de columna completa`);
      }
    }
    
    // 2. Limpiar formato condicional de columnas completas
    console.log('🧹 Limpiando formato condicional...');
    const conditionalRules = sheet.getConditionalFormatRules();
    const filteredRules = conditionalRules.filter(rule => {
      const ranges = rule.getRanges();
      return !ranges.some(range => {
        const notation = range.getA1Notation();
        return notation.includes(':') && !notation.match(/\d/);
      });
    });
    
    if (filteredRules.length < conditionalRules.length) {
      sheet.setConditionalFormatRules(filteredRules);
      optimizationsApplied++;
      console.log(`✅ Removidas ${conditionalRules.length - filteredRules.length} reglas de formato de columna completa`);
    }
    
    // 3. Remover filtros si están activos
    console.log('🔍 Revisando filtros...');
    const filter = sheet.getFilter();
    if (filter) {
      filter.remove();
      optimizationsApplied++;
      console.log('✅ Filtro removido');
    }
    
    console.log(`\n🎉 Optimizaciones aplicadas: ${optimizationsApplied}`);
    
    if (optimizationsApplied > 0) {
      console.log('🚀 Recomendación: Ejecutar el test de velocidad nuevamente para ver mejoras');
    }
    
    return optimizationsApplied > 0;
    
  } catch (error) {
    console.error('❌ Error aplicando optimizaciones:', error);
    return false;
  }
}

// =================================================================
// FUNCIÓN DE PRUEBA DE RENDIMIENTO
// =================================================================

function testearVelocidadAppend() {
  console.log('🧪 TESTEANDO VELOCIDAD DE APPEND...\n');
  
  const testRecord = [
    'TEST-SPEED-001',
    new Date().toISOString(),
    'PRUEBA VELOCIDAD',
    'Cancún',
    'LCF-TEST',
    'LIDER PRUEBA',
    'LM-TEST',
    'LM PRUEBA',
    'LD-TEST',
    'LD PRUEBA',
    'Prueba',
    '',
    '',
    'Test',
    'Velocidad',
    '9999999999',
    'Dirección Prueba',
    'Masculino',
    'Adulto (25-34)',
    'Sí',
    'Sí',
    'Prueba de velocidad',
    'Sí',
    '9999999999',
    'hashtest',
    'PRUEBA',
    '',
    'PRUEBA',
    'test|velocidad'
  ];
  
  // Test con fastAppend (API avanzada)
  console.log('⚡ Testeando fastAppend (API avanzada)...');
  const start1 = Date.now();
  try {
    const row1 = fastAppend(testRecord);
    const time1 = Date.now() - start1;
    console.log(`✅ fastAppend: ${time1}ms - Fila: ${row1}`);
    
    // Limpiar el registro de prueba
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.INGRESOS);
    sheet.deleteRow(row1);
    
  } catch (error) {
    const time1 = Date.now() - start1;
    console.log(`❌ fastAppend falló: ${time1}ms - Error: ${error.message}`);
  }
  
  // Test con appendRow tradicional
  console.log('\n🐌 Testeando appendRow tradicional...');
  const start2 = Date.now();
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.INGRESOS);
    sheet.appendRow(testRecord);
    const row2 = sheet.getLastRow();
    const time2 = Date.now() - start2;
    console.log(`✅ appendRow: ${time2}ms - Fila: ${row2}`);
    
    // Limpiar el registro de prueba
    sheet.deleteRow(row2);
    
  } catch (error) {
    const time2 = Date.now() - start2;
    console.log(`❌ appendRow falló: ${time2}ms - Error: ${error.message}`);
  }
  
  console.log('\n✅ Prueba de velocidad completada');
}
