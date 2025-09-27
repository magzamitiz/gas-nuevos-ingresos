/**
 * VERIFICACIÓN COMPLETA DEL SISTEMA
 * Verifica todos los componentes del sistema de registro de almas
 */

function verificarSistemaCompleto() {
  console.log('🔍 VERIFICACIÓN COMPLETA DEL SISTEMA DE REGISTRO DE ALMAS');
  console.log('================================================');
  
  try {
    // 1. Verificar triggers activos
    console.log('\n1️⃣ VERIFICANDO TRIGGERS ACTIVOS...');
    const triggers = ScriptApp.getProjectTriggers();
    console.log(`Total de triggers activos: ${triggers.length}`);
    
    triggers.forEach((trigger, index) => {
      console.log(`Trigger ${index + 1}:`);
      console.log(`  - Función: ${trigger.getHandlerFunction()}`);
      console.log(`  - Tipo: ${trigger.getEventType()}`);
      console.log(`  - ID: ${trigger.getUniqueId()}`);
    });
    
    // 2. Verificar estado del dispatcher
    console.log('\n2️⃣ VERIFICANDO ESTADO DEL DISPATCHER...');
    const dispatcherTriggers = triggers.filter(t => t.getHandlerFunction() === 'dispatcher_v3');
    console.log(`Triggers dispatcher_v3: ${dispatcherTriggers.length}`);
    
    if (dispatcherTriggers.length === 0) {
      console.log('⚠️ DISPATCHER NO ACTIVO - Ejecuta activarDispatcherRecurrente()');
    } else {
      console.log('✅ Dispatcher activo');
    }
    
    // 3. Verificar cola de trabajos
    console.log('\n3️⃣ VERIFICANDO COLA DE TRABAJOS...');
    const queue = PropertiesService.getScriptProperties();
    const currentQueue = queue.getProperty('JOB_QUEUE_V3') || '[]';
    const jobs = JSON.parse(currentQueue);
    
    console.log(`Total de trabajos en cola: ${jobs.length}`);
    console.log(`Trabajos pendientes: ${jobs.filter(j => j.status === 'PENDING').length}`);
    console.log(`Trabajos completados: ${jobs.filter(j => j.status === 'COMPLETED').length}`);
    console.log(`Trabajos fallidos: ${jobs.filter(j => j.status === 'FAILED').length}`);
    
    // 4. Verificar hojas de cálculo
    console.log('\n4️⃣ VERIFICANDO HOJAS DE CÁLCULO...');
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheetNames = ss.getSheets().map(sheet => sheet.getName());
    console.log(`Hojas disponibles: ${sheetNames.join(', ')}`);
    
    // Verificar hoja de ingresos
    const ingresosSheet = ss.getSheetByName(CONFIG.SHEETS.INGRESOS);
    if (ingresosSheet) {
      const lastRow = ingresosSheet.getLastRow();
      console.log(`✅ Hoja '${CONFIG.SHEETS.INGRESOS}': ${lastRow} filas`);
    } else {
      console.log(`❌ Hoja '${CONFIG.SHEETS.INGRESOS}' no encontrada`);
    }
    
    // 5. Verificar caché
    console.log('\n5️⃣ VERIFICANDO CACHÉ...');
    const cache = CacheService.getScriptCache();
    const cacheKeys = [
      'leaderMap.v2',
      'cellMap.v2',
      'dedupIndex.v2.full_set'
    ];
    
    cacheKeys.forEach(key => {
      const cached = cache.get(key);
      if (cached) {
        console.log(`✅ Caché '${key}': Disponible`);
      } else {
        console.log(`⚠️ Caché '${key}': No disponible`);
      }
    });
    
    // 6. Resumen del estado
    console.log('\n📊 RESUMEN DEL ESTADO DEL SISTEMA:');
    console.log('================================================');
    
    if (dispatcherTriggers.length > 0) {
      console.log('✅ Dispatcher: ACTIVO');
    } else {
      console.log('❌ Dispatcher: INACTIVO');
    }
    
    if (jobs.length === 0) {
      console.log('✅ Cola de trabajos: VACÍA');
    } else {
      console.log(`⚠️ Cola de trabajos: ${jobs.length} trabajos`);
    }
    
    if (ingresosSheet) {
      console.log('✅ Hoja de ingresos: DISPONIBLE');
    } else {
      console.log('❌ Hoja de ingresos: NO DISPONIBLE');
    }
    
    // 7. Recomendaciones
    console.log('\n💡 RECOMENDACIONES:');
    console.log('================================================');
    
    if (dispatcherTriggers.length === 0) {
      console.log('1. 🚀 Ejecuta activarDispatcherRecurrente() para activar el dispatcher');
    }
    
    if (jobs.length > 50) {
      console.log('2. 🧹 Considera limpiar trabajos completados de la cola');
    }
    
    if (ingresosSheet && ingresosSheet.getLastRow() > 5000) {
      console.log('3. ⚡ Considera optimizar fórmulas en la hoja de ingresos');
    }
    
    // Recomendaciones adicionales
    const completedJobs = jobs.filter(j => j.status === 'COMPLETED').length;
    const failedJobs = jobs.filter(j => j.status === 'FAILED').length;
    
    if (completedJobs > 100) {
      console.log('4. 📊 Considera limpiar trabajos completados para mejorar rendimiento');
    }
    
    if (failedJobs > 10) {
      console.log('5. ⚠️ Hay varios trabajos fallidos, revisa los logs de errores');
    }
    
    console.log('\n✅ Verificación completa finalizada');
    
  } catch (error) {
    console.error('❌ Error en verificación del sistema:', error);
    ErrorHandler.logError('verificarSistemaCompleto', error);
  }
}
