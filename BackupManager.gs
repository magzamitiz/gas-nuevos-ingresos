/**
 * SISTEMA DE RESPALDO Y ROLLBACK
 * Gestiona respaldos completos antes de la migración
 * @version 1.0.0 
 */

// =================================================================
// BACKUP MANAGER
// =================================================================
class BackupManager {
  
  /**
   * Crea un respaldo completo del estado actual del sistema
   */
  static createFullBackup() {
    console.log('🛡️ Iniciando respaldo completo del sistema...');
    const startTime = Date.now();
    const backupData = {
      timestamp: new Date().toISOString(),
      version: 'pre-migration-v3',
      components: {}
    };
    
    try {
      // 1. Respaldar configuración de Properties
      backupData.components.properties = this.backupProperties();
      
      // 2. Respaldar triggers activos
      backupData.components.triggers = this.backupTriggers();
      
      // 3. Respaldar estructura de hojas
      backupData.components.sheets = this.backupSheetStructure();
      
      // 4. Respaldar configuración de código
      backupData.components.config = this.backupConfiguration();
      
      // 5. Respaldar estado de cachés
      backupData.components.caches = this.backupCacheState();
      
      // 6. Validar integridad del respaldo
      const validation = this.validateBackup(backupData);
      backupData.validation = validation;
      
      // 7. Guardar respaldo
      const backupKey = `BACKUP_${Date.now()}`;
      PropertiesService.getScriptProperties().setProperty(backupKey, JSON.stringify(backupData));
      PropertiesService.getScriptProperties().setProperty('LATEST_BACKUP', backupKey);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Respaldo completo creado en ${duration}ms. Clave: ${backupKey}`);
      
      return {
        success: true,
        backupKey: backupKey,
        timestamp: backupData.timestamp,
        duration: duration,
        validation: validation
      };
      
    } catch (error) {
      console.error('❌ Error creando respaldo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Respalda todas las propiedades del script
   */
  static backupProperties() {
    console.log('📦 Respaldando propiedades del script...');
    const props = PropertiesService.getScriptProperties();
    const allProperties = props.getProperties();
    
    return {
      count: Object.keys(allProperties).length,
      properties: allProperties,
      critical_keys: [
        'ALMA_COUNTER',
        'lastPostSaveContext', 
        'postSaveTriggerId',
        'JOB_QUEUE_V3'
      ].filter(key => allProperties.hasOwnProperty(key))
    };
  }
  
  /**
   * Respalda información de todos los triggers
   */
  static backupTriggers() {
    console.log('⏰ Respaldando triggers activos...');
    const triggers = ScriptApp.getProjectTriggers();
    
    return {
      count: triggers.length,
      triggers: triggers.map(trigger => ({
        id: trigger.getUniqueId(),
        handlerFunction: trigger.getHandlerFunction(),
        triggerSource: trigger.getTriggerSource().toString(),
        triggerType: trigger.getEventType() ? trigger.getEventType().toString() : 'TIME_DRIVEN'
      }))
    };
  }
  
  /**
   * Respalda estructura de hojas principales
   */
  static backupSheetStructure() {
    console.log('📊 Respaldando estructura de hojas...');
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheets = ss.getSheets();
    
    const sheetInfo = sheets.map(sheet => {
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      
      let headers = [];
      if (lastRow > 0 && lastCol > 0) {
        try {
          headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        } catch (e) {
          headers = ['Error reading headers'];
        }
      }
      
      return {
        name: sheet.getName(),
        id: sheet.getSheetId(),
        lastRow: lastRow,
        lastColumn: lastCol,
        headers: headers,
        isProtected: sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).length > 0
      };
    });
    
    return {
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      sheetCount: sheets.length,
      sheets: sheetInfo,
      criticalSheets: [
        CONFIG.SHEETS.INGRESOS,
        CONFIG.SHEETS.LIDERES, 
        CONFIG.SHEETS.CELULAS
      ]
    };
  }
  
  /**
   * Respalda configuración crítica del código
   */
  static backupConfiguration() {
    console.log('⚙️ Respaldando configuración del sistema...');
    
    return {
      CONFIG: CONFIG,
      processFormFunction: this.getFunctionSignature('processForm'),
      criticalFunctions: [
        'processForm',
        'getCongregaciones',
        'getLideresPorCongregacion', 
        'getCelulasPorLider',
        'postSaveJobs'
      ].map(fname => ({
        name: fname,
        exists: this.functionExists(fname),
        signature: this.getFunctionSignature(fname)
      }))
    };
  }
  
  /**
   * Respalda estado actual de cachés
   */
  static backupCacheState() {
    console.log('🗄️ Respaldando estado de cachés...');
    const cache = CacheService.getScriptCache();
    
    const criticalCaches = [
      `congregaciones_${CONFIG.CACHE.VERSION}`,
      `leader_map_${CONFIG.CACHE.VERSION}`,
      `cell_map_${CONFIG.CACHE.VERSION}`,
      `dedup_index_${CONFIG.CACHE.VERSION}`
    ];
    
    const cacheState = {};
    criticalCaches.forEach(key => {
      const value = cache.get(key);
      cacheState[key] = {
        exists: !!value,
        size: value ? value.length : 0,
        hasData: value ? (JSON.parse(value).length > 0 || Object.keys(JSON.parse(value)).length > 0) : false
      };
    });
    
    return {
      criticalCaches: cacheState,
      warmed: Object.values(cacheState).filter(c => c.exists && c.hasData).length
    };
  }
  
  /**
   * Valida la integridad del respaldo
   */
  static validateBackup(backupData) {
    console.log('✅ Validando integridad del respaldo...');
    const validation = {
      isValid: true,
      checks: [],
      warnings: [],
      errors: []
    };
    
    // Check 1: Propiedades críticas
    const criticalProps = backupData.components.properties.critical_keys;
    if (!criticalProps.includes('ALMA_COUNTER')) {
      validation.errors.push('ALMA_COUNTER no encontrado en propiedades');
      validation.isValid = false;
    } else {
      validation.checks.push('ALMA_COUNTER respaldado correctamente');
    }
    
    // Check 2: Hojas críticas
    const sheets = backupData.components.sheets.sheets;
    const criticalSheets = ['Ingresos', 'Directorio de Líderes', 'Directorio de Células'];
    criticalSheets.forEach(sheetName => {
      const sheet = sheets.find(s => s.name === sheetName);
      if (!sheet) {
        validation.errors.push(`Hoja crítica '${sheetName}' no encontrada`);
        validation.isValid = false;
      } else if (sheet.lastRow < 2) {
        validation.warnings.push(`Hoja '${sheetName}' parece estar vacía (${sheet.lastRow} filas)`);
      } else {
        validation.checks.push(`Hoja '${sheetName}' respaldada: ${sheet.lastRow} filas`);
      }
    });
    
    // Check 3: Funciones críticas
    const functions = backupData.components.config.criticalFunctions;
    functions.forEach(func => {
      if (!func.exists) {
        validation.errors.push(`Función crítica '${func.name}' no existe`);
        validation.isValid = false;
      } else {
        validation.checks.push(`Función '${func.name}' encontrada`);
      }
    });
    
    // Check 4: Cachés calientes
    const cacheState = backupData.components.caches;
    if (cacheState.warmed < 2) {
      validation.warnings.push(`Solo ${cacheState.warmed} cachés están calientes. Considera hacer warming.`);
    } else {
      validation.checks.push(`${cacheState.warmed} cachés están calientes`);
    }
    
    return validation;
  }
  
  /**
   * Restaura el sistema desde un respaldo
   */
  static restoreFromBackup(backupKey) {
    console.log(`🔄 Restaurando sistema desde respaldo: ${backupKey}`);
    
    try {
      const backupData = JSON.parse(
        PropertiesService.getScriptProperties().getProperty(backupKey)
      );
      
      if (!backupData) {
        throw new Error(`Respaldo ${backupKey} no encontrado`);
      }
      
      // 1. Restaurar propiedades críticas
      const props = PropertiesService.getScriptProperties();
      const backupProps = backupData.components.properties.properties;
      
      // Solo restaurar propiedades críticas para evitar conflictos
      const criticalKeys = backupData.components.properties.critical_keys;
      criticalKeys.forEach(key => {
        if (backupProps[key]) {
          props.setProperty(key, backupProps[key]);
          console.log(`✅ Restaurada propiedad: ${key}`);
        }
      });
      
      // 2. Limpiar triggers nuevos (si los hay)
      this.cleanupNewTriggers();
      
      console.log('✅ Restauración completada');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error en restauración:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Lista todos los respaldos disponibles
   */
  static listBackups() {
    const props = PropertiesService.getScriptProperties().getProperties();
    const backups = [];
    
    Object.keys(props).forEach(key => {
      if (key.startsWith('BACKUP_')) {
        try {
          const backupData = JSON.parse(props[key]);
          backups.push({
            key: key,
            timestamp: backupData.timestamp,
            version: backupData.version,
            isValid: backupData.validation ? backupData.validation.isValid : false
          });
        } catch (e) {
          // Backup corrupto, ignorar
        }
      }
    });
    
    return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  
  /**
   * Limpia triggers que podrían haber sido creados en migración
   */
  static cleanupNewTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      const functionName = trigger.getHandlerFunction();
      if (functionName.includes('_v3') || functionName.includes('dispatcher_v3')) {
        ScriptApp.deleteTrigger(trigger);
        console.log(`🗑️ Eliminado trigger: ${functionName}`);
      }
    });
  }
  
  // Funciones auxiliares
  static functionExists(functionName) {
    try {
      return typeof eval(functionName) === 'function';
    } catch (e) {
      return false;
    }
  }
  
  static getFunctionSignature(functionName) {
    try {
      const func = eval(functionName);
      return func.toString().split('{')[0] + '{ ... }';
    } catch (e) {
      return 'Function not found';
    }
  }
}

// =================================================================
// FUNCIONES PÚBLICAS DE RESPALDO
// =================================================================

/**
 * Función pública para crear respaldo completo
 */
function createSystemBackup() {
  return BackupManager.createFullBackup();
}

/**
 * Función pública para restaurar desde respaldo
 */
function restoreSystemBackup(backupKey) {
  if (!backupKey) {
    const latest = PropertiesService.getScriptProperties().getProperty('LATEST_BACKUP');
    if (latest) {
      backupKey = latest;
      console.log(`Usando respaldo más reciente: ${backupKey}`);
    } else {
      return { success: false, error: 'No hay respaldos disponibles' };
    }
  }
  
  return BackupManager.restoreFromBackup(backupKey);
}

/**
 * Función pública para listar respaldos
 */
function listSystemBackups() {
  return BackupManager.listBackups();
}

/**
 * Función de emergencia para rollback inmediato
 */
function emergencyRollback() {
  console.log('🚨 ROLLBACK DE EMERGENCIA INICIADO');
  
  // 1. Limpiar propiedades de migración
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('JOB_QUEUE_V3');
  props.deleteProperty('DISPATCHER_TRIGGER_V3');
  props.deleteProperty('USE_FAST_PATH');
  
  // 2. Limpiar triggers nuevos
  BackupManager.cleanupNewTriggers();
  
  // 3. Restaurar desde último respaldo si existe
  const latestBackup = props.getProperty('LATEST_BACKUP');
  if (latestBackup) {
    const result = BackupManager.restoreFromBackup(latestBackup);
    console.log('🔄 Restauración desde respaldo:', result);
  }
  
  console.log('✅ Rollback de emergencia completado');
  return { success: true, message: 'Sistema restaurado a estado pre-migración' };
}
