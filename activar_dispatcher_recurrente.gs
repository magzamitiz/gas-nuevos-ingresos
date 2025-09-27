/**
 * ACTIVAR DISPATCHER RECURRENTE
 * Crea un trigger recurrente para dispatcher_v3 que se ejecute cada 5 minutos
 */

function activarDispatcherRecurrente() {
  console.log('🚀 ACTIVANDO DISPATCHER RECURRENTE...');
  
  try {
    // 1. Limpiar triggers existentes del dispatcher
    console.log('1️⃣ Limpiando triggers existentes del dispatcher...');
    const triggers = ScriptApp.getProjectTriggers();
    let cleaned = 0;
    
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'dispatcher_v3') {
        ScriptApp.deleteTrigger(trigger);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      console.log(`🧹 Limpiados ${cleaned} triggers existentes del dispatcher`);
    }
    
    // 2. Crear trigger recurrente cada 5 minutos
    console.log('2️⃣ Creando trigger recurrente cada 5 minutos...');
    const trigger = ScriptApp.newTrigger('dispatcher_v3')
      .timeBased()
      .everyMinutes(5)
      .create();
    
    console.log(`✅ Dispatcher recurrente creado exitosamente:`);
    console.log(`   - ID único: ${trigger.getUniqueId()}`);
    console.log(`   - Función: dispatcher_v3`);
    console.log(`   - Frecuencia: Cada 5 minutos`);
    console.log(`   - Tipo: CLOCK`);
    
    // 3. Limpiar propiedades obsoletas
    console.log('3️⃣ Limpiando propiedades obsoletas...');
    const props = PropertiesService.getScriptProperties();
    props.deleteProperty('DISPATCHER_TRIGGER_V3');
    props.deleteProperty('DISPATCHER_TRIGGER_ID_V3');
    console.log('🧹 Propiedades obsoletas limpiadas');
    
    // 4. Verificar estado final
    console.log('4️⃣ Verificando estado final...');
    const finalTriggers = ScriptApp.getProjectTriggers();
    const dispatcherTriggers = finalTriggers.filter(t => t.getHandlerFunction() === 'dispatcher_v3');
    console.log(`Triggers dispatcher_v3 activos: ${dispatcherTriggers.length}`);
    
    if (dispatcherTriggers.length === 1) {
      console.log('✅ DISPATCHER RECURRENTE ACTIVADO CORRECTAMENTE');
      console.log('🎯 El dispatcher se ejecutará automáticamente cada 5 minutos');
    } else {
      console.log('❌ Error: No se pudo crear el trigger recurrente');
    }
    
  } catch (error) {
    console.error('❌ Error activando dispatcher recurrente:', error);
    ErrorHandler.logError('activarDispatcherRecurrente', error);
  }
}

/**
 * VERIFICAR ESTADO DEL DISPATCHER
 * Muestra el estado actual de todos los triggers del dispatcher
 */
function verificarEstadoDispatcher() {
  console.log('🔍 VERIFICANDO ESTADO DEL DISPATCHER...');
  
  try {
    const triggers = ScriptApp.getProjectTriggers();
    const dispatcherTriggers = triggers.filter(t => t.getHandlerFunction() === 'dispatcher_v3');
    
    console.log(`\n📊 Triggers dispatcher_v3 encontrados: ${dispatcherTriggers.length}`);
    
    if (dispatcherTriggers.length === 0) {
      console.log('⚠️ No hay triggers activos para dispatcher_v3');
      console.log('💡 Ejecuta activarDispatcherRecurrente() para activarlo');
    } else {
      dispatcherTriggers.forEach((trigger, index) => {
        console.log(`\nTrigger ${index + 1}:`);
        console.log(`  - ID único: ${trigger.getUniqueId()}`);
        console.log(`  - Función: ${trigger.getHandlerFunction()}`);
        console.log(`  - Tipo: ${trigger.getEventType()}`);
        console.log(`  - Fuente: ${trigger.getTriggerSource()}`);
        
        // Verificar si es recurrente
        if (trigger.getEventType() === ScriptApp.EventType.CLOCK) {
          console.log(`  - Frecuencia: Recurrente`);
        }
      });
    }
    
    // Verificar cola de trabajos
    console.log('\n📋 Estado de la cola de trabajos:');
    const queue = PropertiesService.getScriptProperties();
    const currentQueue = queue.getProperty('JOB_QUEUE_V3') || '[]';
    const jobs = JSON.parse(currentQueue);
    const pendingJobs = jobs.filter(job => job.status === 'PENDING');
    
    console.log(`  - Total de trabajos: ${jobs.length}`);
    console.log(`  - Trabajos pendientes: ${pendingJobs.length}`);
    console.log(`  - Trabajos completados: ${jobs.filter(j => j.status === 'COMPLETED').length}`);
    console.log(`  - Trabajos fallidos: ${jobs.filter(j => j.status === 'FAILED').length}`);
    
  } catch (error) {
    console.error('❌ Error verificando estado del dispatcher:', error);
    ErrorHandler.logError('verificarEstadoDispatcher', error);
  }
}

/**
 * DESACTIVAR DISPATCHER RECURRENTE
 * Elimina todos los triggers del dispatcher (para mantenimiento)
 */
function desactivarDispatcherRecurrente() {
  console.log('🛑 DESACTIVANDO DISPATCHER RECURRENTE...');
  
  try {
    const triggers = ScriptApp.getProjectTriggers();
    let cleaned = 0;
    
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'dispatcher_v3') {
        ScriptApp.deleteTrigger(trigger);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      console.log(`✅ Desactivados ${cleaned} triggers del dispatcher`);
    } else {
      console.log('ℹ️ No había triggers activos del dispatcher');
    }
    
    // Limpiar propiedades
    const props = PropertiesService.getScriptProperties();
    props.deleteProperty('DISPATCHER_TRIGGER_V3');
    props.deleteProperty('DISPATCHER_TRIGGER_ID_V3');
    console.log('🧹 Propiedades limpiadas');
    
  } catch (error) {
    console.error('❌ Error desactivando dispatcher:', error);
    ErrorHandler.logError('desactivarDispatcherRecurrente', error);
  }
}

/**
 * LIMPIAR COLA DE TRABAJOS
 * Elimina trabajos completados y fallidos de la cola para mejorar rendimiento
 */
function limpiarColaTrabajos() {
  console.log('🧹 LIMPIANDO COLA DE TRABAJOS...');
  
  try {
    const queue = PropertiesService.getScriptProperties();
    const currentQueue = queue.getProperty('JOB_QUEUE_V3') || '[]';
    const jobs = JSON.parse(currentQueue);
    
    console.log(`📊 Estado inicial de la cola:`);
    console.log(`  - Total de trabajos: ${jobs.length}`);
    console.log(`  - Trabajos pendientes: ${jobs.filter(j => j.status === 'PENDING').length}`);
    console.log(`  - Trabajos completados: ${jobs.filter(j => j.status === 'COMPLETED').length}`);
    console.log(`  - Trabajos fallidos: ${jobs.filter(j => j.status === 'FAILED').length}`);
    
    // Mantener solo trabajos pendientes y en proceso
    const cleanedJobs = jobs.filter(job => 
      job.status === 'PENDING' || job.status === 'PROCESSING'
    );
    
    const removedCount = jobs.length - cleanedJobs.length;
    
    if (removedCount > 0) {
      queue.setProperty('JOB_QUEUE_V3', JSON.stringify(cleanedJobs));
      console.log(`✅ Limpieza completada:`);
      console.log(`  - Trabajos eliminados: ${removedCount}`);
      console.log(`  - Trabajos restantes: ${cleanedJobs.length}`);
    } else {
      console.log('ℹ️ No había trabajos para limpiar');
    }
    
  } catch (error) {
    console.error('❌ Error limpiando cola de trabajos:', error);
    ErrorHandler.logError('limpiarColaTrabajos', error);
  }
}
