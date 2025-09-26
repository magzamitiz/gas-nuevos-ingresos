/**
 * JOB DISPATCHER - PROCESADOR POR LOTES
 * Maneja el procesamiento asíncrono de trabajos encolados
 * @version 3.0.0
 */

// =================================================================
// JOB DISPATCHER
// =================================================================

/**
 * Dispatcher principal que procesa trabajos en lotes
 * Esta función es llamada por triggers automáticos
 */
function dispatcher_v3() {
  console.log('🚀 Dispatcher V3 iniciado...');
  const startTime = Date.now();
  
  // Obtener lock para evitar ejecuciones concurrentes
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(2000)) {
    console.log('⏳ Dispatcher ya está corriendo, saltando ejecución');
    return;
  }
  
  try {
    const stats = processJobBatch();
    const duration = Date.now() - startTime;
    
    console.log(`✅ Dispatcher completado en ${duration}ms`);
    console.log(`📊 Trabajos procesados: ${stats.processed}, Errores: ${stats.errors}`);
    
    // Programar siguiente ejecución si hay más trabajos
    if (stats.remainingJobs > 0) {
      console.log(`⏰ ${stats.remainingJobs} trabajos restantes, reprogramando dispatcher`);
      FastPathCore.ensureDispatcher();
    } else {
      console.log('✅ Cola vacía, dispatcher en standby');
    }
    
  } catch (error) {
    console.error('❌ Error en dispatcher:', error);
    ErrorHandler.logError('dispatcher_v3', error);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Procesa un lote de trabajos de la cola
 * @returns {Object} - Estadísticas del procesamiento
 */
function processJobBatch() {
  const batchSize = 10; // Procesar máximo 10 trabajos por lote
  const stats = { processed: 0, errors: 0, remainingJobs: 0 };
  
  try {
    // Obtener trabajos pendientes
    const queue = PropertiesService.getScriptProperties();
    const currentQueue = queue.getProperty('JOB_QUEUE_V3') || '[]';
    const allJobs = JSON.parse(currentQueue);
    
    if (allJobs.length === 0) {
      console.log('📭 Cola vacía');
      return stats;
    }
    
    // Separar trabajos pendientes de los ya procesados
    const pendingJobs = allJobs.filter(job => job.status === 'PENDING');
    const otherJobs = allJobs.filter(job => job.status !== 'PENDING');
    
    if (pendingJobs.length === 0) {
      console.log('📋 No hay trabajos pendientes');
      stats.remainingJobs = otherJobs.length;
      return stats;
    }
    
    // Tomar lote para procesar
    const batch = pendingJobs.slice(0, batchSize);
    const remainingPending = pendingJobs.slice(batchSize);
    
    console.log(`📦 Procesando lote de ${batch.length} trabajos...`);
    
    // Procesar cada trabajo del lote
    batch.forEach((job, index) => {
      try {
        console.log(`🔄 Procesando trabajo ${index + 1}/${batch.length}: Fila ${job.rowNum}`);
        
        // Marcar como en proceso
        job.status = 'PROCESSING';
        job.processingStartedAt = new Date().toISOString();
        
        // Procesar el trabajo
        const result = processIndividualJob(job);
        
        if (result.success) {
          job.status = 'COMPLETED';
          job.completedAt = new Date().toISOString();
          job.result = result;
          stats.processed++;
          console.log(`✅ Trabajo completado: Fila ${job.rowNum}`);
        } else {
          job.status = 'FAILED';
          job.failedAt = new Date().toISOString();
          job.error = result.error;
          stats.errors++;
          console.log(`❌ Trabajo falló: Fila ${job.rowNum} - ${result.error}`);
        }
        
      } catch (error) {
        job.status = 'FAILED';
        job.failedAt = new Date().toISOString();
        job.error = error.message;
        stats.errors++;
        console.error(`❌ Error procesando trabajo fila ${job.rowNum}:`, error);
      }
    });
    
    // Actualizar cola con trabajos procesados
    const updatedQueue = [...otherJobs, ...batch, ...remainingPending];
    
    // Limpiar trabajos completados antiguos (mantener solo últimos 50)
    const completedJobs = updatedQueue.filter(job => job.status === 'COMPLETED');
    if (completedJobs.length > 50) {
      console.log(`🧹 Limpiando ${completedJobs.length - 50} trabajos completados antiguos`);
      const recentCompleted = completedJobs
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
        .slice(0, 50);
      
      const finalQueue = updatedQueue.filter(job => 
        job.status !== 'COMPLETED' || recentCompleted.includes(job)
      );
      
      queue.setProperty('JOB_QUEUE_V3', JSON.stringify(finalQueue));
      stats.remainingJobs = finalQueue.length;
    } else {
      queue.setProperty('JOB_QUEUE_V3', JSON.stringify(updatedQueue));
      stats.remainingJobs = updatedQueue.length;
    }
    
    return stats;
    
  } catch (error) {
    console.error('❌ Error en processJobBatch:', error);
    throw error;
  }
}

/**
 * Procesa un trabajo individual
 * @param {Object} job - Trabajo a procesar
 * @returns {Object} - Resultado del procesamiento
 */
function processIndividualJob(job) {
  const startTime = Date.now();
  
  try {
    // 1. Obtener jerarquía de líderes
    console.log(`🏗️ Obteniendo jerarquía para líder ${job.payload.liderCasaDeFeId}...`);
    const catalogService = new CatalogService();
    const hierarchy = catalogService.getLeaderHierarchy(job.payload.liderCasaDeFeId);
    
    // 2. Verificación difusa si no hay duplicado exacto
    let fuzzyResult = { hasDuplicates: false, confidence: 0, matches: [] };
    let finalStatus = 'OK';
    
    if (job.maybeDuplicate) {
      finalStatus = 'REVISAR DUPLICADO EXACTO';
      console.log(`⚠️ Duplicado exacto detectado previamente`);
    } else {
      console.log(`🔍 Ejecutando verificación difusa...`);
      try {
        const fuzzyDetector = new FuzzyDuplicateDetector();
        fuzzyResult = fuzzyDetector.findMatches(job.payload);
        
        if (fuzzyResult.hasDuplicates && fuzzyResult.confidence > 0.7) {
          const confidencePercent = Math.round(fuzzyResult.confidence * 100);
          finalStatus = `REVISAR DUPLICADO (DIFUSO ${confidencePercent}%)`;
          if (fuzzyResult.matches && fuzzyResult.matches.length > 0) {
            finalStatus += `: ID ${fuzzyResult.matches[0].id}`;
          }
          console.log(`⚠️ Duplicado difuso detectado: ${confidencePercent}% confianza`);
        } else {
          console.log(`✅ No se detectaron duplicados difusos`);
        }
      } catch (fuzzyError) {
        console.warn(`⚠️ Error en verificación difusa: ${fuzzyError.message}`);
        // Continuar sin bloquear el proceso
      }
    }
    
    // 3. Actualizar registro en la hoja
    console.log(`📝 Actualizando registro en fila ${job.rowNum}...`);
    const updateResult = updateJobResult(job.rowNum, {
      hierarchy: hierarchy,
      status: finalStatus,
      fuzzyResult: fuzzyResult,
      processed: true
    });
    
    if (!updateResult.success) {
      throw new Error(`Error actualizando hoja: ${updateResult.error}`);
    }
    
    // 4. Invalidar caché de índice exacto para próximas búsquedas
    FastPathCore.invalidateExactIndex();
    
    const duration = Date.now() - startTime;
    console.log(`⚡ Trabajo procesado en ${duration}ms`);
    
    return {
      success: true,
      duration: duration,
      hierarchy: hierarchy,
      finalStatus: finalStatus,
      fuzzyResult: fuzzyResult
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error procesando trabajo individual:`, error);
    
    return {
      success: false,
      error: error.message,
      duration: duration
    };
  }
}

/**
 * Actualiza el resultado del trabajo en la hoja
 * @param {number} rowNum - Número de fila a actualizar
 * @param {Object} result - Datos del resultado
 * @returns {Object} - Resultado de la actualización
 */
function updateJobResult(rowNum, result) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.INGRESOS);
    
    if (!sheet) {
      throw new Error(`Hoja ${CONFIG.SHEETS.INGRESOS} no encontrada`);
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Actualizar jerarquía de líderes (columnas F-J: Nombre LCF, ID LM, Nombre LM, ID LD, Nombre LD)
    if (result.hierarchy) {
      const lcfCol = headers.indexOf('Nombre LCF') + 1;
      if (lcfCol > 0) {
        const hierarchyValues = [
          result.hierarchy.lcfNombre || 'PENDIENTE',
          result.hierarchy.lmId || '',
          result.hierarchy.lmNombre || 'PENDIENTE',
          result.hierarchy.ldId || '',
          result.hierarchy.ldNombre || 'PENDIENTE'
        ];
        
        sheet.getRange(rowNum, lcfCol, 1, 5).setValues([hierarchyValues]);
        console.log(`✅ Jerarquía actualizada en fila ${rowNum}`);
      }
    }
    
    // Actualizar estado de revisión (columna AB)
    const revisionCol = headers.indexOf('Estado_Revision') + 1;
    if (revisionCol > 0 && result.status) {
      sheet.getRange(rowNum, revisionCol).setValue(result.status);
      console.log(`✅ Estado de revisión actualizado: ${result.status}`);
    }
    
    // Actualizar columna Estado principal (columna Z - cambiar de PROCESANDO a COMPLETADO)
    const estadoCol = headers.indexOf('Estado') + 1;
    if (estadoCol > 0) {
      sheet.getRange(rowNum, estadoCol).setValue('COMPLETADO');
      console.log(`✅ Estado principal actualizado a COMPLETADO`);
    }
    
    // Si existe columna Único, actualizarla basada en el resultado
    const unicoCol = headers.indexOf('Único') + 1;
    if (unicoCol > 0) {
      const esUnico = !result.status.includes('DUPLICADO');
      sheet.getRange(rowNum, unicoCol).setValue(esUnico ? 'Único' : 'Duplicado');
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error actualizando resultado en hoja:', error);
    return { success: false, error: error.message };
  }
}

// =================================================================
// FUNCIONES PÚBLICAS DEL DISPATCHER
// =================================================================

/**
 * Función pública para procesar cola manualmente
 */
function processQueueManually() {
  console.log('🔧 Procesamiento manual de cola iniciado...');
  return processJobBatch();
}

/**
 * Función pública para obtener estado de la cola
 */
function getQueueStatus() {
  try {
    const queue = PropertiesService.getScriptProperties();
    const currentQueue = queue.getProperty('JOB_QUEUE_V3') || '[]';
    const jobs = JSON.parse(currentQueue);
    
    const status = {
      total: jobs.length,
      byStatus: {},
      oldestJob: null,
      newestJob: null
    };
    
    // Contar por estado
    jobs.forEach(job => {
      status.byStatus[job.status] = (status.byStatus[job.status] || 0) + 1;
    });
    
    // Encontrar trabajos más antiguos y nuevos
    if (jobs.length > 0) {
      const sortedByEnqueue = jobs.sort((a, b) => 
        new Date(a.enqueuedAt) - new Date(b.enqueuedAt)
      );
      status.oldestJob = {
        enqueuedAt: sortedByEnqueue[0].enqueuedAt,
        rowNum: sortedByEnqueue[0].rowNum,
        status: sortedByEnqueue[0].status
      };
      status.newestJob = {
        enqueuedAt: sortedByEnqueue[sortedByEnqueue.length - 1].enqueuedAt,
        rowNum: sortedByEnqueue[sortedByEnqueue.length - 1].rowNum,
        status: sortedByEnqueue[sortedByEnqueue.length - 1].status
      };
    }
    
    return status;
    
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Función pública para limpiar cola completamente
 */
function clearJobQueue() {
  console.log('🧹 Limpiando cola de trabajos...');
  
  try {
    const queue = PropertiesService.getScriptProperties();
    const currentQueue = queue.getProperty('JOB_QUEUE_V3') || '[]';
    const jobs = JSON.parse(currentQueue);
    
    const completedCount = jobs.filter(j => j.status === 'COMPLETED').length;
    const pendingCount = jobs.filter(j => j.status === 'PENDING').length;
    
    // Solo limpiar trabajos completados, mantener pendientes
    const pendingJobs = jobs.filter(j => j.status === 'PENDING');
    queue.setProperty('JOB_QUEUE_V3', JSON.stringify(pendingJobs));
    
    console.log(`✅ Cola limpiada: ${completedCount} completados removidos, ${pendingCount} pendientes conservados`);
    
    return {
      success: true,
      removedCompleted: completedCount,
      remainingPending: pendingCount
    };
    
  } catch (error) {
    console.error('❌ Error limpiando cola:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Función para forzar procesamiento de un trabajo específico
 */
function forceProcessJob(rowNum) {
  console.log(`🔧 Forzando procesamiento de fila ${rowNum}...`);
  
  try {
    const queue = PropertiesService.getScriptProperties();
    const currentQueue = queue.getProperty('JOB_QUEUE_V3') || '[]';
    const jobs = JSON.parse(currentQueue);
    
    const job = jobs.find(j => j.rowNum === rowNum);
    if (!job) {
      return { success: false, error: `Trabajo para fila ${rowNum} no encontrado en cola` };
    }
    
    if (job.status === 'COMPLETED') {
      return { success: false, error: `Trabajo para fila ${rowNum} ya está completado` };
    }
    
    const result = processIndividualJob(job);
    
    if (result.success) {
      job.status = 'COMPLETED';
      job.completedAt = new Date().toISOString();
      job.result = result;
      
      // Actualizar cola
      queue.setProperty('JOB_QUEUE_V3', JSON.stringify(jobs));
      
      console.log(`✅ Trabajo fila ${rowNum} procesado exitosamente`);
      return { success: true, result: result };
    } else {
      job.status = 'FAILED';
      job.failedAt = new Date().toISOString();
      job.error = result.error;
      
      // Actualizar cola
      queue.setProperty('JOB_QUEUE_V3', JSON.stringify(jobs));
      
      console.log(`❌ Trabajo fila ${rowNum} falló: ${result.error}`);
      return { success: false, error: result.error };
    }
    
  } catch (error) {
    console.error(`❌ Error forzando procesamiento de fila ${rowNum}:`, error);
    return { success: false, error: error.message };
  }
}
