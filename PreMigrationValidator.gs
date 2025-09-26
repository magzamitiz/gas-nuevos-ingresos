/**
 * VALIDADOR PRE-MIGRACIÓN
 * Verifica que el sistema actual esté en estado óptimo antes de migrar
 * @version 1.0.0
 */

// =================================================================
// PRE-MIGRATION VALIDATOR
// =================================================================
class PreMigrationValidator {
  
  /**
   * Ejecuta validación completa del sistema antes de migración
   */
  static validateSystemReadiness() {
    console.log('🔍 Iniciando validación pre-migración...');
    const startTime = Date.now();
    
    const validation = {
      timestamp: new Date().toISOString(),
      overall: { ready: false, score: 0 },
      categories: {}
    };
    
    try {
      // 1. Validar funcionalidad básica
      validation.categories.functionality = this.validateFunctionality();
      
      // 2. Validar datos y estructura
      validation.categories.data = this.validateDataIntegrity();
      
      // 3. Validar performance
      validation.categories.performance = this.validatePerformance();
      
      // 4. Validar configuración
      validation.categories.configuration = this.validateConfiguration();
      
      // 5. Validar cachés
      validation.categories.caches = this.validateCaches();
      
      // Calcular score general
      const categories = Object.values(validation.categories);
      const totalScore = categories.reduce((sum, cat) => sum + cat.score, 0);
      const maxScore = categories.length * 100;
      
      validation.overall.score = Math.round((totalScore / maxScore) * 100);
      validation.overall.ready = validation.overall.score >= 80; // Mínimo 80%
      validation.overall.duration = Date.now() - startTime;
      
      console.log(`✅ Validación completada. Score: ${validation.overall.score}%`);
      return validation;
      
    } catch (error) {
      console.error('❌ Error en validación:', error);
      validation.overall.error = error.message;
      return validation;
    }
  }
  
  /**
   * Valida funcionalidad básica del sistema
   */
  static validateFunctionality() {
    console.log('🔧 Validando funcionalidad básica...');
    const result = { score: 0, checks: [], warnings: [], errors: [] };
    
    try {
      // Test 1: Función principal processForm existe
      if (typeof processForm === 'function') {
        result.checks.push('✅ processForm() existe');
        result.score += 20;
      } else {
        result.errors.push('❌ processForm() no encontrada');
      }
      
      // Test 2: Funciones de catálogo funcionan
      try {
        const congregaciones = getCongregaciones();
        if (Array.isArray(congregaciones) && congregaciones.length > 0) {
          result.checks.push(`✅ getCongregaciones() funciona (${congregaciones.length} congregaciones)`);
          result.score += 20;
          
          // Test 3: Obtener líderes de primera congregación
          const lideres = getLideresPorCongregacion(congregaciones[0]);
          if (Array.isArray(lideres)) {
            result.checks.push(`✅ getLideresPorCongregacion() funciona (${lideres.length} líderes)`);
            result.score += 20;
            
            // Test 4: Obtener células si hay líderes
            if (lideres.length > 0) {
              const celulas = getCelulasPorLider(lideres[0].id);
              if (Array.isArray(celulas)) {
                result.checks.push(`✅ getCelulasPorLider() funciona (${celulas.length} células)`);
                result.score += 20;
              } else {
                result.warnings.push('⚠️ getCelulasPorLider() no retorna array');
              }
            }
          } else {
            result.errors.push('❌ getLideresPorCongregacion() no retorna array');
          }
        } else {
          result.errors.push('❌ getCongregaciones() no retorna datos válidos');
        }
      } catch (e) {
        result.errors.push(`❌ Error en funciones de catálogo: ${e.message}`);
      }
      
      // Test 5: Sistema de verificación funciona
      try {
        const sysInfo = verificarSistema();
        if (sysInfo && typeof sysInfo === 'object') {
          result.checks.push('✅ verificarSistema() funciona');
          result.score += 20;
        }
      } catch (e) {
        result.warnings.push(`⚠️ verificarSistema() tiene problemas: ${e.message}`);
      }
      
    } catch (error) {
      result.errors.push(`❌ Error general en validación de funcionalidad: ${error.message}`);
    }
    
    return result;
  }
  
  /**
   * Valida integridad de datos
   */
  static validateDataIntegrity() {
    console.log('📊 Validando integridad de datos...');
    const result = { score: 0, checks: [], warnings: [], errors: [] };
    
    try {
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      
      // Test 1: Hoja Ingresos
      const ingresosSheet = ss.getSheetByName(CONFIG.SHEETS.INGRESOS);
      if (ingresosSheet) {
        const lastRow = ingresosSheet.getLastRow();
        result.checks.push(`✅ Hoja 'Ingresos' existe con ${lastRow} filas`);
        result.score += 25;
        
        if (lastRow < 2) {
          result.warnings.push('⚠️ Hoja Ingresos está vacía');
        }
        
        // Verificar si hay registros atascados en PROCESANDO
        if (lastRow > 1) {
          const headers = ingresosSheet.getRange(1, 1, 1, ingresosSheet.getLastColumn()).getValues()[0];
          const estadoCol = headers.indexOf('Estado') + 1;
          if (estadoCol > 0) {
            const estados = ingresosSheet.getRange(2, estadoCol, lastRow - 1, 1).getValues();
            const procesando = estados.filter(row => row[0] === 'PROCESANDO').length;
            if (procesando > 0) {
              result.warnings.push(`⚠️ ${procesando} registros atascados en PROCESANDO`);
            } else {
              result.checks.push('✅ No hay registros atascados en PROCESANDO');
            }
          }
        }
      } else {
        result.errors.push('❌ Hoja Ingresos no encontrada');
      }
      
      // Test 2: Hoja Líderes
      const lideresSheet = ss.getSheetByName(CONFIG.SHEETS.LIDERES);
      if (lideresSheet && lideresSheet.getLastRow() > 1) {
        result.checks.push(`✅ Hoja 'Directorio de Líderes' existe con ${lideresSheet.getLastRow()} filas`);
        result.score += 25;
      } else {
        result.errors.push('❌ Hoja Directorio de Líderes vacía o no encontrada');
      }
      
      // Test 3: Hoja Células
      const celulasSheet = ss.getSheetByName(CONFIG.SHEETS.CELULAS);
      if (celulasSheet && celulasSheet.getLastRow() > 1) {
        result.checks.push(`✅ Hoja 'Directorio de Células' existe con ${celulasSheet.getLastRow()} filas`);
        result.score += 25;
      } else {
        result.warnings.push('⚠️ Hoja Directorio de Células vacía o no encontrada');
        result.score += 10; // Partial score ya que las células son opcionales
      }
      
      // Test 4: Contador de IDs
      const counter = PropertiesService.getScriptProperties().getProperty('ALMA_COUNTER');
      if (counter && parseInt(counter) > 0) {
        result.checks.push(`✅ Contador de IDs funcional: ${counter}`);
        result.score += 25;
      } else {
        result.errors.push('❌ Contador de IDs no inicializado');
      }
      
    } catch (error) {
      result.errors.push(`❌ Error validando datos: ${error.message}`);
    }
    
    return result;
  }
  
  /**
   * Valida performance actual
   */
  static validatePerformance() {
    console.log('⚡ Validando performance actual...');
    const result = { score: 0, checks: [], warnings: [], errors: [] };
    
    try {
      // Test 1: Tiempo de getCongregaciones
      const start1 = Date.now();
      const congregaciones = getCongregaciones();
      const time1 = Date.now() - start1;
      
      if (time1 < 2000) {
        result.checks.push(`✅ getCongregaciones() en ${time1}ms`);
        result.score += 25;
      } else {
        result.warnings.push(`⚠️ getCongregaciones() lento: ${time1}ms`);
        result.score += 10;
      }
      
      // Test 2: Tiempo de getLideresPorCongregacion
      if (congregaciones.length > 0) {
        const start2 = Date.now();
        const lideres = getLideresPorCongregacion(congregaciones[0]);
        const time2 = Date.now() - start2;
        
        if (time2 < 3000) {
          result.checks.push(`✅ getLideresPorCongregacion() en ${time2}ms`);
          result.score += 25;
        } else {
          result.warnings.push(`⚠️ getLideresPorCongregacion() lento: ${time2}ms`);
          result.score += 10;
        }
        
        // Test 3: Tiempo de getCelulasPorLider
        if (lideres.length > 0) {
          const start3 = Date.now();
          const celulas = getCelulasPorLider(lideres[0].id);
          const time3 = Date.now() - start3;
          
          if (time3 < 3000) {
            result.checks.push(`✅ getCelulasPorLider() en ${time3}ms`);
            result.score += 25;
          } else {
            result.warnings.push(`⚠️ getCelulasPorLider() lento: ${time3}ms`);
            result.score += 10;
          }
        }
      }
      
      // Test 4: Verificar si verificarAlma es rápido (nueva optimización)
      try {
        const start4 = Date.now();
        verificarAlma('TEST', 'USUARIO'); // Esto debería ser rápido con la nueva KEY_BUSQUEDA
        const time4 = Date.now() - start4;
        
        if (time4 < 15000) { // 15 segundos es aceptable vs los 90 anteriores
          result.checks.push(`✅ verificarAlma() mejorado: ${time4}ms`);
          result.score += 25;
        } else {
          result.warnings.push(`⚠️ verificarAlma() aún lento: ${time4}ms`);
          result.score += 5;
        }
      } catch (e) {
        result.warnings.push(`⚠️ No se pudo probar verificarAlma(): ${e.message}`);
      }
      
    } catch (error) {
      result.errors.push(`❌ Error validando performance: ${error.message}`);
    }
    
    return result;
  }
  
  /**
   * Valida configuración del sistema
   */
  static validateConfiguration() {
    console.log('⚙️ Validando configuración...');
    const result = { score: 0, checks: [], warnings: [], errors: [] };
    
    try {
      // Test 1: CONFIG objeto existe y es válido
      if (typeof CONFIG === 'object' && CONFIG.SPREADSHEET_ID) {
        result.checks.push('✅ CONFIG objeto válido');
        result.score += 25;
        
        // Verificar ID de spreadsheet
        if (CONFIG.SPREADSHEET_ID === "1dwuqpyMXWHJvnJHwDHCqFMvgdYhypE2W1giH6bRZMKc") {
          result.checks.push('✅ SPREADSHEET_ID correcto');
          result.score += 25;
        } else {
          result.errors.push('❌ SPREADSHEET_ID incorrecto');
        }
      } else {
        result.errors.push('❌ CONFIG no válido');
      }
      
      // Test 2: Sheets configurados
      if (CONFIG.SHEETS && CONFIG.SHEETS.INGRESOS && CONFIG.SHEETS.LIDERES) {
        result.checks.push('✅ Nombres de hojas configurados');
        result.score += 25;
      } else {
        result.errors.push('❌ Configuración de hojas incompleta');
      }
      
      // Test 3: Configuración de caché
      if (CONFIG.CACHE && CONFIG.CACHE.VERSION) {
        result.checks.push(`✅ Configuración de caché: ${CONFIG.CACHE.VERSION}`);
        result.score += 25;
      } else {
        result.warnings.push('⚠️ Configuración de caché incompleta');
        result.score += 10;
      }
      
    } catch (error) {
      result.errors.push(`❌ Error validando configuración: ${error.message}`);
    }
    
    return result;
  }
  
  /**
   * Valida estado de cachés
   */
  static validateCaches() {
    console.log('🗄️ Validando cachés...');
    const result = { score: 0, checks: [], warnings: [], errors: [] };
    
    try {
      const cache = CacheService.getScriptCache();
      
      // Test 1: Caché de congregaciones
      const congCache = cache.get(`congregaciones_${CONFIG.CACHE.VERSION}`);
      if (congCache) {
        result.checks.push('✅ Caché de congregaciones activo');
        result.score += 20;
      } else {
        result.warnings.push('⚠️ Caché de congregaciones frío');
      }
      
      // Test 2: Caché de leader map
      const leaderCache = cache.get(`leader_map_${CONFIG.CACHE.VERSION}`);
      if (leaderCache) {
        result.checks.push('✅ Caché de leader map activo');
        result.score += 20;
      } else {
        result.warnings.push('⚠️ Caché de leader map frío');
      }
      
      // Test 3: Caché de cell map
      const cellCache = cache.get(`cell_map_${CONFIG.CACHE.VERSION}`);
      if (cellCache) {
        result.checks.push('✅ Caché de cell map activo');
        result.score += 20;
      } else {
        result.warnings.push('⚠️ Caché de cell map frío');
      }
      
      // Test 4: Warm up si es necesario
      const warmedCaches = (congCache ? 1 : 0) + (leaderCache ? 1 : 0) + (cellCache ? 1 : 0);
      if (warmedCaches >= 2) {
        result.checks.push(`✅ ${warmedCaches}/3 cachés importantes están calientes`);
        result.score += 20;
      } else {
        result.warnings.push(`⚠️ Solo ${warmedCaches}/3 cachés están calientes`);
        
        // Intentar warming automático
        try {
          if (!congCache) getCongregaciones(); // Esto debería calentar el caché
          if (!leaderCache) warmLeaderMapCache();
          if (!cellCache) warmCellMapCache();
          result.checks.push('✅ Warming automático ejecutado');
          result.score += 15;
        } catch (e) {
          result.warnings.push(`⚠️ Error en warming automático: ${e.message}`);
          result.score += 5;
        }
      }
      
      // Test 5: Sistema de warming automático
      const triggers = ScriptApp.getProjectTriggers();
      const hasWarmTrigger = triggers.some(t => t.getHandlerFunction().includes('warm'));
      if (hasWarmTrigger) {
        result.checks.push('✅ Trigger de warming automático configurado');
        result.score += 20;
      } else {
        result.warnings.push('⚠️ No hay trigger de warming automático');
        result.score += 10;
      }
      
    } catch (error) {
      result.errors.push(`❌ Error validando cachés: ${error.message}`);
    }
    
    return result;
  }
}

// =================================================================
// FUNCIONES PÚBLICAS DE VALIDACIÓN
// =================================================================

/**
 * Función pública para validar estado del sistema
 */
function validateSystemForMigration() {
  return PreMigrationValidator.validateSystemReadiness();
}

/**
 * Función rápida para verificar si el sistema está listo
 */
function quickSystemCheck() {
  console.log('🚀 Verificación rápida del sistema...');
  
  const checks = {
    processForm: typeof processForm === 'function',
    congregaciones: false,
    hojaIngresos: false,
    contadorIDs: false
  };
  
  try {
    // Test congregaciones
    const cong = getCongregaciones();
    checks.congregaciones = Array.isArray(cong) && cong.length > 0;
    
    // Test hoja ingresos
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEETS.INGRESOS);
    checks.hojaIngresos = !!sheet;
    
    // Test contador
    const counter = PropertiesService.getScriptProperties().getProperty('ALMA_COUNTER');
    checks.contadorIDs = !!counter && parseInt(counter) > 0;
    
  } catch (e) {
    console.error('Error en verificación rápida:', e);
  }
  
  const passedChecks = Object.values(checks).filter(Boolean).length;
  const ready = passedChecks >= 3; // Al menos 3 de 4 checks deben pasar
  
  console.log(`✅ Verificación rápida: ${passedChecks}/4 checks pasaron. Ready: ${ready}`);
  
  return {
    ready: ready,
    score: Math.round((passedChecks / 4) * 100),
    checks: checks
  };
}
