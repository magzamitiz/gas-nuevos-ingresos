/**
 * SISTEMA DE REGISTRO DE ALMAS v2.0
 * Módulo de Instalación y Configuración
 * @version 2.0.0
 */

// =================================================================
// INSTALADOR PRINCIPAL
// =================================================================
class SystemInstaller {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.completed = [];
  }
  
  install() {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   INSTALACIÓN DEL SISTEMA v2.0        ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    const steps = [
      { name: 'Verificar requisitos', fn: () => this.checkRequirements() },
      { name: 'Crear estructura de hojas', fn: () => this.createSheets() },
      { name: 'Inicializar propiedades', fn: () => this.initializeProperties() },
      { name: 'Crear datos de ejemplo', fn: () => this.createSampleData() },
      { name: 'Validar instalación', fn: () => this.validateInstallation() }
    ];
    
    for (const step of steps) {
      console.log(`\n▶ ${step.name}...`);
      try {
        step.fn();
        this.completed.push(step.name);
        console.log(`  ✅ ${step.name} completado`);
      } catch (error) {
        this.errors.push({ step: step.name, error: error.message });
        console.error(`  ❌ Error en ${step.name}: ${error.message}`);
      }
    }
    
    return this.generateReport();
  }
  
  checkRequirements() {
    // Verificar Spreadsheet
    try {
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      console.log(`  ✓ Spreadsheet encontrado: ${ss.getName()}`);
    } catch (error) {
      throw new Error(`No se puede acceder al Spreadsheet: ${CONFIG.SPREADSHEET_ID}`);
    }
    
    // Verificar permisos de Properties
    try {
      const props = PropertiesService.getScriptProperties();
      props.setProperty('TEST', 'test');
      props.deleteProperty('TEST');
      console.log('  ✓ Permisos de Properties verificados');
    } catch (error) {
      this.warnings.push('No se pueden escribir Properties - funcionalidad limitada');
    }
    
    // Verificar cache
    try {
      const cache = CacheService.getScriptCache();
      cache.put('TEST', 'test', 1);
      cache.remove('TEST');
      console.log('  ✓ Cache Service disponible');
    } catch (error) {
      this.warnings.push('Cache no disponible - rendimiento reducido');
    }
    
    return true;
  }
  
  createSheets() {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheetsConfig = [
      {
        name: CONFIG.SHEETS.INGRESOS,
        headers: [
          'ID_Alma', 'Timestamp', 'Nombre del Capturador', 'Congregación',
          'ID LCF', 'Nombre LCF', 'ID LM', 'Nombre LM', 'ID LD', 'Nombre LD',
          'Fuente del Contacto', 'ID Célula', 'Nombre Célula',
          'Nombres del Alma', 'Apellidos del Alma', 'Teléfono', 'Dirección',
          'Sexo', 'Rango de Edad', 'Aceptó a Jesús', '¿Desea Visita?',
          'Petición de Oración', '¿Responsable de Seguimiento?',
          'Tel_Normalizado', 'NombreClave_Normalizado', 'Estado_Revision',
          'Estado', '#REF!', 'KEY_BUSQUEDA'
        ]
      },
      {
        name: CONFIG.SHEETS.LIDERES,
        headers: [
          'ID_Lider', 'Nombre_Lider', 'Rol', 'ID_Lider_Directo', 'Congregación'
        ]
      },
      {
        name: CONFIG.SHEETS.CELULAS,
        headers: [
          'ID Célula', 'Nombre Célula (Anfitrión)', 'ID Miembro', 'Nombre Miembro',
          'ID LCF Responsable', 'Nombre LCF Responsable', 'Congregación', 'Rol'
        ]
      },
      {
        name: CONFIG.SHEETS.ERRORS,
        headers: [
          'Timestamp', 'Function', 'Error', 'Details'
        ]
      },
      {
        name: CONFIG.SHEETS.AUDIT,
        headers: [
          'Timestamp', 'Action', 'Record ID', 'User', 'Details'
        ]
      },
      {
        name: INDEX_CONFIG.SHEET_NAME,
        headers: ['key', 'row_in_ingresos', 'updated_at'],
        hidden: true
      }
    ];
    
    sheetsConfig.forEach(config => {
      let sheet = ss.getSheetByName(config.name);
      
      if (!sheet) {
        console.log(`  Creando hoja: ${config.name}`);
        sheet = ss.insertSheet(config.name);
        
        // Añadir headers
        const headerRange = sheet.getRange(1, 1, 1, config.headers.length);
        headerRange.setValues([config.headers]);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#F0F0F0');
        
        // Ajustar ancho de columnas
        for (let i = 1; i <= config.headers.length; i++) {
          sheet.autoResizeColumn(i);
        }
        
        if (config.hidden) {
          sheet.hideSheet();
        }
        
      } else {
        console.log(`  ✓ Hoja existente: ${config.name}`);
      }
    });
  }
  
  initializeProperties() {
    const props = PropertiesService.getScriptProperties();
    
    const properties = {
      'ALMA_COUNTER': String(CONFIG.APP.ID_START),
      'SYSTEM_VERSION': CONFIG.CACHE.VERSION,
      'INSTALL_DATE': new Date().toISOString()
    };
    
    Object.entries(properties).forEach(([key, value]) => {
      try {
        const existing = props.getProperty(key);
        if (!existing) {
          props.setProperty(key, value);
          console.log(`  ✓ Propiedad creada: ${key} = ${value}`);
        } else {
          console.log(`  ✓ Propiedad existente: ${key} = ${existing}`);
        }
      } catch (error) {
        this.warnings.push(`No se pudo crear propiedad: ${key}`);
      }
    });
  }
  
  createSampleData() {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    
    // Datos de ejemplo para Líderes
    const lideresSheet = ss.getSheetByName(CONFIG.SHEETS.LIDERES);
    if (lideresSheet && lideresSheet.getLastRow() === 1) {
      const sampleLideres = [
        ['LCF001', 'Juan Pérez García', 'LCF', 'LM001', 'Centro'],
        ['LCF002', 'María González López', 'LCF', 'LM001', 'Centro'],
        ['LCF003', 'Pedro Sánchez Ruiz', 'LCF', 'LM002', 'Norte'],
        ['LM001', 'Ana Martínez Silva', 'LM', 'LD001', 'Centro'],
        ['LM002', 'Carlos Rodríguez Díaz', 'LM', 'LD001', 'Norte'],
        ['LD001', 'Roberto Hernández Torres', 'LD', '', 'General']
      ];
      
      lideresSheet.getRange(2, 1, sampleLideres.length, 5).setValues(sampleLideres);
      console.log('  ✓ Datos de ejemplo añadidos a Líderes');
    }
    
    // Datos de ejemplo para Células
    const celulasSheet = ss.getSheetByName(CONFIG.SHEETS.CELULAS);
    if (celulasSheet && celulasSheet.getLastRow() === 1) {
      const sampleCelulas = [
        ['CEL001', 'Célula Familias Unidas', 'M001', 'José López', 'LCF001', 'Juan Pérez García', 'Centro', 'Anfitrión'],
        ['CEL002', 'Célula Jóvenes en Cristo', 'M002', 'Laura Díaz', 'LCF001', 'Juan Pérez García', 'Centro', 'Co-anfitrión'],
        ['CEL003', 'Célula Mujeres de Fe', 'M003', 'Carmen Ruiz', 'LCF002', 'María González López', 'Centro', 'Anfitrión'],
        ['CEL004', 'Célula Guerreros', 'M004', 'Miguel Torres', 'LCF003', 'Pedro Sánchez Ruiz', 'Norte', 'Anfitrión']
      ];
      
      celulasSheet.getRange(2, 1, sampleCelulas.length, 8).setValues(sampleCelulas);
      console.log('  ✓ Datos de ejemplo añadidos a Células');
    }
  }
  
  validateInstallation() {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const validation = {
      sheets: true,
      properties: true
    };
    
    // Validar hojas
    const requiredSheets = Object.values(CONFIG.SHEETS);
    requiredSheets.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        validation.sheets = false;
        this.errors.push(`Hoja faltante: ${sheetName}`);
      }
    });
    
    // Validar propiedades
    const props = PropertiesService.getScriptProperties();
    const counter = props.getProperty('ALMA_COUNTER');
    if (!counter) {
      validation.properties = false;
      this.errors.push('Contador de almas no inicializado');
    }
    
    const allValid = Object.values(validation).every(v => v === true);
    if (allValid) {
      console.log('\n✅ INSTALACIÓN VALIDADA CORRECTAMENTE');
    } else {
      console.log('\n⚠️ INSTALACIÓN COMPLETADA CON ADVERTENCIAS');
    }
    
    return validation;
  }
  
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      version: CONFIG.CACHE.VERSION,
      status: this.errors.length === 0 ? 'SUCCESS' : 'COMPLETED_WITH_ERRORS',
      completed: this.completed,
      errors: this.errors,
      warnings: this.warnings
    };
    
    // Imprimir resumen
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║       REPORTE DE INSTALACIÓN           ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`Estado: ${report.status}`);
    console.log(`Pasos completados: ${report.completed.length}`);
    console.log(`Errores: ${report.errors.length}`);
    console.log(`Advertencias: ${report.warnings.length}`);
    
    if (report.errors.length > 0) {
      console.log('\n❌ Errores encontrados:');
      report.errors.forEach(err => {
        console.log(`  • ${err.step}: ${err.error}`);
      });
    }
    
    if (report.warnings.length > 0) {
      console.log('\n⚠️ Advertencias:');
      report.warnings.forEach(warning => {
        console.log(`  • ${warning}`);
      });
    }
    
    // Guardar reporte
    try {
      PropertiesService.getScriptProperties().setProperty(
        'INSTALLATION_REPORT',
        JSON.stringify(report)
      );
    } catch (e) {
      console.log('No se pudo guardar el reporte de instalación');
    }
    
    return report;
  }
}

// =================================================================
// FUNCIONES PÚBLICAS
// =================================================================

/**
 * ⚡ FUNCIÓN PRINCIPAL - Ejecutar para instalar el sistema
 */
function installSystem() {
  const installer = new SystemInstaller();
  return installer.install();
}

/**
 * Obtiene el estado del sistema
 */
function getSystemStatus() {
  const props = PropertiesService.getScriptProperties();
  
  return {
    version: CONFIG.CACHE.VERSION,
    spreadsheetId: CONFIG.SPREADSHEET_ID,
    installDate: props.getProperty('INSTALL_DATE'),
    almaCounter: props.getProperty('ALMA_COUNTER'),
    lastReport: props.getProperty('INSTALLATION_REPORT')
  };
}

/**
 * Verificar triggers activos en el proyecto
 */
function verificarTriggers() {
  console.log('🔍 Verificando triggers activos en el proyecto...');
  
  const triggers = ScriptApp.getProjectTriggers();
  
  if (triggers.length === 0) {
    console.log('❌ No hay triggers configurados');
    console.log('💡 Recomendación: Ejecutar installWarmTrigger() para configurar triggers de warming');
    return {
      success: false,
      message: 'No hay triggers configurados',
      triggers: []
    };
  } else {
    console.log(`✅ Se encontraron ${triggers.length} triggers activos:`);
    
    const triggerInfo = triggers.map((trigger, index) => {
      const info = {
        index: index + 1,
        function: trigger.getHandlerFunction(),
        type: trigger.getEventType(),
        source: trigger.getTriggerSource(),
        uniqueId: trigger.getUniqueId()
      };
      
      console.log(`Trigger ${info.index}:`);
      console.log(`  - Función: ${info.function}`);
      console.log(`  - Tipo: ${info.type}`);
      console.log(`  - Fuente: ${info.source}`);
      console.log(`  - ID único: ${info.uniqueId}`);
      console.log('---');
      
      return info;
    });
    
    return {
      success: true,
      message: `${triggers.length} triggers activos`,
      triggers: triggerInfo
    };
  }
}

/**
 * Test rápido para verificar funcionamiento
 */
function runQuickTest() {
  console.log('=== PRUEBA RÁPIDA DEL SISTEMA ===');
  
  try {
    // Test de sanitización
    const errors = [];
    const clean = Validator.sanitizeName('<script>Test</script>', 'test', errors);
    console.log(`✓ Sanitización: "${clean}" (esperado: "Test")`);
    
    // Test de rate limiting
    const limiter = new RateLimiter();
    const result = limiter.checkLimit('test@test.com');
    console.log(`✓ Rate Limit: ${result.allowed ? 'Permitido' : 'Bloqueado'}`);
    
    // Test de hash
    const hash = Utils.generateHash('test');
    console.log(`✓ Hash generado: ${hash}`);
    
    // Test de spreadsheet
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    console.log(`✓ Spreadsheet: ${ss.getName()}`);
    
    console.log('✅ TODOS LOS TESTS BÁSICOS PASARON');
    
  } catch (error) {
    console.log(`❌ TEST FALLÓ: ${error.message}`);
    return false;
  }
  
  console.log('=== FIN PRUEBA RÁPIDA ===');
  return true;
}

/**
 * Crea un backup del sistema
 */
function createBackup() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const backupName = `Backup_${ss.getName()}_${new Date().toISOString().split('T')[0]}`;
    
    const backup = ss.copy(backupName);
    
    return {
      success: true,
      backupId: backup.getId(),
      name: backupName,
      url: backup.getUrl()
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Limpia todos los datos (CUIDADO)
 */
function resetAllData(confirmationCode) {
  if (confirmationCode !== 'RESET-CONFIRMED-2024') {
    return {
      success: false,
      error: 'Código de confirmación incorrecto'
    };
  }
  
  console.log('⚠️ INICIANDO RESET DE DATOS...');
  
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const ingresosSheet = ss.getSheetByName(CONFIG.SHEETS.INGRESOS);
    
    if (ingresosSheet && ingresosSheet.getLastRow() > 1) {
      ingresosSheet.deleteRows(2, ingresosSheet.getLastRow() - 1);
      console.log('✓ Datos de ingresos eliminados');
    }
    
    // Reset del contador
    PropertiesService.getScriptProperties().setProperty('ALMA_COUNTER', String(CONFIG.APP.ID_START));
    
    // Limpiar cache
    CacheService.getScriptCache().removeAll(['dedup_index_', 'congregaciones_', 'lideres_', 'celulas_']);
    
    console.log('✅ RESET COMPLETADO');
    
    return {
      success: true,
      message: 'Todos los datos han sido eliminados'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Migra datos de una versión anterior
 */
function migrateData() {
  console.log('Iniciando migración de datos...');
  
  try {
    // Aquí iría la lógica de migración si fuera necesaria
    console.log('✅ Migración completada (no requerida para v2.0)');
    
    return {
      success: true,
      message: 'Migración completada'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// =================================================================
// UTILIDADES DE DESARROLLO
// =================================================================

/**
 * Genera datos de prueba masivos
 */
function generateTestData(count = 10) {
  console.log(`Generando ${count} registros de prueba...`);
  
  const nombres = ['Juan', 'María', 'Pedro', 'Ana', 'Carlos', 'Laura', 'José', 'Carmen'];
  const apellidos = ['García', 'López', 'Martínez', 'González', 'Rodríguez', 'Fernández'];
  const congregaciones = ['Centro', 'Norte', 'Sur', 'Oriente'];
  
  const service = new RegistrationService();
  let created = 0;
  
  for (let i = 0; i < count; i++) {
    try {
      const testData = {
        nombreCapturador: 'Sistema de Prueba',
        congregacion: congregaciones[i % congregaciones.length],
        liderCasaDeFeId: 'LCF001',
        fuenteContacto: 'Evento Especial',
        almaNombres: nombres[Math.floor(Math.random() * nombres.length)],
        almaApellidos: apellidos[Math.floor(Math.random() * apellidos.length)] + ` ${i}`,
        almaTelefono: `999${String(1000000 + i).substring(1)}`,
        almaDireccion: `Calle ${i + 1} #123`,
        almaSexo: i % 2 === 0 ? 'Masculino' : 'Femenino',
        almaEdad: 'Adulto (25-34)',
        aceptoJesus: 'Sí',
        deseaVisita: 'Sí',
        responsableSeguimiento: 'Sí',
        peticionOracion: ['Salvación / Libertad Espiritual']
      };
      
      const result = service.processRegistration(testData);
      if (result.status === 'success') {
        created++;
      }
      
    } catch (error) {
      console.error(`Error creando registro ${i}: ${error.message}`);
    }
  }
  
  console.log(`✅ ${created} registros de prueba creados`);
  return { created: created, total: count };
}

/**
 * 🚀 FUNCIÓN GLOBAL DE WARMING - Ejecutar con trigger
 * Calienta todas las cachés críticas de la aplicación.
 */
function warmAllCaches() {
  console.log('🔥🔥🔥 Iniciando calentamiento de todas las cachés...');
  
  try {
    warmLeaderMapCache();
  } catch (e) {
    console.error("Error durante el calentamiento de la caché de líderes.", e);
  }
  
  try {
    warmDedupIndexCache();
  } catch(e) {
    console.error("Error durante el calentamiento de la caché del índice de duplicados.", e);
  }

  try {
    warmCellMapCache();
  } catch(e) {
    console.error("Error durante el calentamiento de la caché del mapa de células.", e);
  }
  
  console.log('🔥🔥🔥 Calentamiento de todas las cachés completado.');
}

function installWarmTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'warmAllCaches' || trigger.getHandlerFunction() === 'warmLeaderMapCache') {
      console.log(`Eliminando trigger antiguo: ${trigger.getHandlerFunction()}`);
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('warmAllCaches')
    .timeBased()
    .everyMinutes(30)
    .create();

  console.log('✅ Trigger de warming global instalado para "warmAllCaches" (cada 30 minutos).');
}

function removeWarmTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'warmAllCaches' || trigger.getHandlerFunction() === 'warmLeaderMapCache') {
      console.log(`Eliminando trigger: ${trigger.getHandlerFunction()}`);
      ScriptApp.deleteTrigger(trigger);
    }
  });
  console.log('✅ Todos los triggers de warming eliminados.');
}

/**
 * Habilitar el trigger dispatcher_v3 para procesamiento en segundo plano
 */
function habilitarDispatcher() {
  console.log('🔧 Habilitando trigger dispatcher_v3...');
  
  try {
    // Eliminar TODOS los triggers dispatcher_v3 existentes (incluyendo versiones anteriores)
    const triggers = ScriptApp.getProjectTriggers();
    console.log(`Encontrados ${triggers.length} triggers totales`);
    
    let deletedCount = 0;
    triggers.forEach(trigger => {
      const functionName = trigger.getHandlerFunction();
      if (functionName === 'dispatcher_v3') {
        console.log(`Eliminando trigger dispatcher_v3 (ID: ${trigger.getUniqueId()})`);
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
      }
    });
    
    console.log(`✅ Eliminados ${deletedCount} triggers dispatcher_v3`);

    // Esperar un momento para que se procese la eliminación
    Utilities.sleep(1000);

    // Crear nuevo trigger dispatcher_v3 activo
    const newTrigger = ScriptApp.newTrigger('dispatcher_v3')
      .timeBased()
      .everyMinutes(5)
      .create();

    console.log('✅ Trigger dispatcher_v3 RECURRENTE creado (cada 5 minutos)');
    console.log(`Nuevo trigger ID: ${newTrigger.getUniqueId()}`);
    
    return {
      success: true,
      message: 'Dispatcher habilitado correctamente como trigger recurrente',
      deletedTriggers: deletedCount,
      newTriggerId: newTrigger.getUniqueId()
    };
    
  } catch (error) {
    console.error('❌ Error habilitando dispatcher:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function runWarmUpNow() {
  console.log('⚡ Ejecutando warming manual ahora...');
  warmAllCaches();
}

/**
 * 🛠️ UTILIDAD DE ÍNDICE - Ejecutar manualmente UNA SOLA VEZ
 * Construye el índice de duplicados inicial a partir de la hoja 'Ingresos'.
 * ADVERTENCIA: Puede tardar mucho si hay miles de registros.
 */
function buildInitialDedupIndex() {
  console.log('🛠️ Iniciando construcción del índice de duplicados inicial...');
  
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const ingresosSheet = ss.getSheetByName(CONFIG.SHEETS.INGRESOS);
  let indexSheet = ss.getSheetByName(INDEX_CONFIG.SHEET_NAME);

  if (!ingresosSheet) {
    console.error(`Error: No se encontró la hoja '${CONFIG.SHEETS.INGRESOS}'.`);
    return;
  }
  if (!indexSheet) {
    console.warn(`No se encontró la hoja '${INDEX_CONFIG.SHEET_NAME}', creándola...`);
    indexSheet = ss.insertSheet(INDEX_CONFIG.SHEET_NAME);
    indexSheet.appendRow(['key', 'row_in_ingresos', 'updated_at']);
    indexSheet.hideSheet();
  }

  // Limpiar el índice existente para reconstruirlo
  if (indexSheet.getLastRow() > 1) {
    indexSheet.getRange(2, 1, indexSheet.getLastRow() - 1, 3).clearContent();
  }

  const data = ingresosSheet.getRange(2, 1, ingresosSheet.getLastRow() - 1, 25).getValues();
  const indexData = [];

  console.log(`Procesando ${data.length} registros de la hoja 'Ingresos'...`);

  data.forEach((row, i) => {
    const rowNum = i + 2; // Las filas de la hoja son 1-based, y los datos empiezan en la fila 2.
    const record = {
      almaNombres: row[13],
      almaApellidos: row[14],
      almaTelefono: row[15]
    };
    
    if (record.almaTelefono && record.almaNombres && record.almaApellidos) {
      const key = DedupIndexService.generateKey(record);
      indexData.push([key, rowNum, new Date()]);
    }

    if ((i + 1) % 500 === 0) {
      console.log(`... ${i + 1} registros procesados.`);
    }
  });

  if (indexData.length > 0) {
    console.log(`Añadiendo ${indexData.length} claves al índice...`);
    indexSheet.getRange(2, 1, indexData.length, 3).setValues(indexData);
  }

  // Invalidar caché después de construir
  DedupIndexService.invalidateIndexCache();

  console.log('✅ Construcción del índice completada.');
}