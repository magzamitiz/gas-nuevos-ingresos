/**
 * FAST PATH CORE - NÚCLEO OPTIMIZADO
 * Sistema ultra-rápido para procesamiento de formularios
 * @version 3.0.0
 */

// =================================================================
// FAST PATH CORE
// =================================================================
class FastPathCore {
  
  /**
   * Normaliza el payload del formulario para procesamiento rápido
   * @param {Object} payload - Datos del formulario
   * @returns {Object} - Payload normalizado
   */
  static normalizePayload(payload) {
    console.log('🔄 FastPathCore: Normalizando payload...');
    
    return {
      nombreCapturador: (payload.nombreCapturador || '').trim(),
      congregacion: (payload.congregacion || '').trim(),
      liderCasaDeFeId: (payload.liderCasaDeFeId || '').trim(),
      fuenteContacto: (payload.fuenteContacto || '').trim(),
      celulaId: (payload.celulaId || '').trim(),
      celulaNombre: (payload.celulaNombre || '').trim(),
      almaNombres: (payload.almaNombres || '').trim(),
      almaApellidos: (payload.almaApellidos || '').trim(),
      almaTelefono: String(payload.almaTelefono || '').replace(/\D/g, ''),
      almaDireccion: (payload.almaDireccion || '').trim(),
      almaSexo: (payload.almaSexo || '').trim(),
      almaEdad: (payload.almaEdad || '').trim(),
      aceptoJesus: (payload.aceptoJesus || '').trim(),
      deseaVisita: (payload.deseaVisita || '').trim(),
      peticionOracion: Array.isArray(payload.peticionOracion) ? payload.peticionOracion : [],
      responsableSeguimiento: (payload.responsableSeguimiento || '').trim()
    };
  }
  
  /**
   * Crea clave de búsqueda normalizada para detección rápida de duplicados
   * @param {string} nombres - Nombres del alma
   * @param {string} apellidos - Apellidos del alma
   * @returns {string} - Clave normalizada
   */
  static makeSearchKey(nombres, apellidos) {
    const normalize = s => (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[^\w\s]/g, '')         // Solo letras, números y espacios
      .trim()
      .replace(/\s+/g, ' ');           // Espacios únicos
    
    return `${normalize(nombres)}|${normalize(apellidos)}`;
  }
  
  /**
   * Verificación exacta ultra-rápida O(1) usando caché de índice
   * @param {string} searchKey - Clave de búsqueda
   * @returns {boolean} - true si existe duplicado exacto
   */
  static quickExactCheck(searchKey) {
    const startTime = Date.now();
    
    try {
      // Intentar obtener índice desde caché
      const cache = CacheService.getScriptCache();
      const cacheKey = `exact_index_v3_${CONFIG.CACHE.VERSION}`;
      const indexData = cache.get(cacheKey);
      
      if (indexData) {
        const index = JSON.parse(indexData);
        const exists = index.hasOwnProperty(searchKey);
        console.log(`⚡ Quick exact check: ${exists ? 'DUPLICADO' : 'ÚNICO'} en ${Date.now() - startTime}ms`);
        return exists;
      }
      
      // Si no hay caché, construir índice rápido
      console.log('🔄 Construyendo índice de duplicados...');
      const quickIndex = this.buildQuickIndex();
      
      // Cachear por 5 minutos
      cache.put(cacheKey, JSON.stringify(quickIndex), 300);
      
      const exists = quickIndex.hasOwnProperty(searchKey);
      console.log(`⚡ Quick exact check (con build): ${exists ? 'DUPLICADO' : 'ÚNICO'} en ${Date.now() - startTime}ms`);
      return exists;
      
    } catch (error) {
      console.warn('⚠️ Error en quick exact check:', error.message);
      return false; // No bloquear el proceso si falla
    }
  }
  
  /**
   * Construye índice rápido de registros existentes
   * @returns {Object} - Índice de claves existentes
   */
  static buildQuickIndex() {
    const startTime = Date.now();
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.INGRESOS);
    
    if (!sheet || sheet.getLastRow() < 2) {
      console.log('📝 Índice vacío - no hay registros');
      return {};
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    let keyCol = headers.indexOf('KEY_BUSQUEDA');
    
    // Si no existe KEY_BUSQUEDA, usar nombres y apellidos
    if (keyCol === -1) {
      const nombresCol = headers.indexOf('Nombres del Alma');
      const apellidosCol = headers.indexOf('Apellidos del Alma');
      
      if (nombresCol === -1 || apellidosCol === -1) {
        console.warn('⚠️ No se encontraron columnas de nombres');
        return {};
      }
      
      // Leer nombres y apellidos para generar claves
      const lastRow = sheet.getLastRow();
      const nombresData = sheet.getRange(2, nombresCol + 1, lastRow - 1, 1).getValues();
      const apellidosData = sheet.getRange(2, apellidosCol + 1, lastRow - 1, 1).getValues();
      
      const index = {};
      for (let i = 0; i < nombresData.length; i++) {
        const nombres = String(nombresData[i][0] || '').trim();
        const apellidos = String(apellidosData[i][0] || '').trim();
        if (nombres || apellidos) {
          const key = this.makeSearchKey(nombres, apellidos);
          index[key] = i + 2; // Fila en hoja (1-indexed)
        }
      }
      
      console.log(`🔍 Índice construido desde nombres/apellidos: ${Object.keys(index).length} registros en ${Date.now() - startTime}ms`);
      return index;
    }
    
    // Si existe KEY_BUSQUEDA, usarla directamente
    const lastRow = sheet.getLastRow();
    const keyData = sheet.getRange(2, keyCol + 1, lastRow - 1, 1).getValues();
    
    const index = {};
    keyData.forEach((row, i) => {
      const key = String(row[0] || '').trim();
      if (key) {
        index[key] = i + 2; // Fila en hoja (1-indexed)
      }
    });
    
    console.log(`🔍 Índice construido desde KEY_BUSQUEDA: ${Object.keys(index).length} registros en ${Date.now() - startTime}ms`);
    return index;
  }
  
  /**
   * Encola trabajo para procesamiento posterior
   * @param {Object} job - Trabajo a encolar
   */
  static enqueueJob(job) {
    console.log(`📋 Encolando trabajo para fila ${job.rowNum}...`);
    
    try {
      const queue = PropertiesService.getScriptProperties();
      const currentQueue = queue.getProperty('JOB_QUEUE_V3') || '[]';
      const jobs = JSON.parse(currentQueue);
      
      // Añadir timestamp de encolado
      job.enqueuedAt = new Date().toISOString();
      job.status = 'PENDING';
      
      jobs.push(job);
      
      // Mantener cola limitada (máximo 100 trabajos)
      if (jobs.length > 100) {
        console.warn('⚠️ Cola de trabajos llena, removiendo trabajos antiguos');
        jobs.splice(0, jobs.length - 100);
      }
      
      queue.setProperty('JOB_QUEUE_V3', JSON.stringify(jobs));
      console.log(`✅ Trabajo encolado. Total en cola: ${jobs.length}`);
      
      // Asegurar que el dispatcher esté activo
      this.ensureDispatcher();
      
    } catch (error) {
      console.error('❌ Error encolando trabajo:', error);
      throw error;
    }
  }
  
  /**
   * Asegura que el dispatcher esté programado para ejecutarse
   */
  static ensureDispatcher() {
    try {
      // Verificar si ya existe un trigger activo para dispatcher_v3
      const existingTriggers = ScriptApp.getProjectTriggers();
      const activeDispatcherTrigger = existingTriggers.find(trigger => 
        trigger.getHandlerFunction() === 'dispatcher_v3'
      );
      
      if (activeDispatcherTrigger) {
        console.log('⏰ Dispatcher ya está programado (trigger activo encontrado)');
        return;
      }
      
      // No hay trigger activo, crear uno nuevo
      console.log('🔄 No se encontró trigger activo, creando nuevo dispatcher...');
      
      // Limpiar triggers antiguos del dispatcher primero
      this.cleanupOldDispatcherTriggers();
      
      // Crear nuevo trigger para ejecutarse en 30 segundos
      const trigger = ScriptApp.newTrigger('dispatcher_v3')
        .timeBased()
        .after(30000) // 30 segundos
        .create();
      
      const props = PropertiesService.getScriptProperties();
      const now = Date.now();
      props.setProperty('DISPATCHER_TRIGGER_V3', now.toString());
      props.setProperty('DISPATCHER_TRIGGER_ID_V3', trigger.getUniqueId());
      
      console.log(`⏰ Dispatcher programado: ${trigger.getUniqueId()}`);
      
    } catch (error) {
      console.warn('⚠️ Error programando dispatcher:', error.message);
      // No lanzar error para no bloquear el guardado principal
    }
  }
  
  /**
   * Limpia triggers antiguos del dispatcher
   */
  static cleanupOldDispatcherTriggers() {
    try {
      const triggers = ScriptApp.getProjectTriggers();
      let cleaned = 0;
      
      triggers.forEach(trigger => {
        const functionName = trigger.getHandlerFunction();
        if (functionName === 'dispatcher_v3') {
          ScriptApp.deleteTrigger(trigger);
          cleaned++;
        }
      });
      
      if (cleaned > 0) {
        console.log(`🧹 Limpiados ${cleaned} triggers antiguos del dispatcher`);
      }
      
    } catch (error) {
      console.warn('⚠️ Error limpiando triggers:', error.message);
    }
  }
  
  /**
   * Valida datos del formulario de forma rápida
   * @param {Object} payload - Datos a validar
   * @returns {Object} - Resultado de validación
   */
  static fastValidation(payload) {
    const errors = [];
    
    // Validaciones críticas rápidas
    if (!payload.nombreCapturador) errors.push('Nombre del capturador requerido');
    if (!payload.congregacion) errors.push('Congregación requerida');
    if (!payload.liderCasaDeFeId) errors.push('Líder Casa de Fe requerido');
    if (!payload.fuenteContacto) errors.push('Fuente de contacto requerida');
    if (!payload.almaNombres) errors.push('Nombres del alma requeridos');
    if (!payload.almaApellidos) errors.push('Apellidos del alma requeridos');
    if (!payload.almaTelefono) errors.push('Teléfono del alma requerido');
    if (!payload.almaDireccion) errors.push('Dirección del alma requerida');
    if (!payload.almaSexo) errors.push('Sexo del alma requerido');
    if (!payload.almaEdad) errors.push('Edad del alma requerida');
    if (!payload.aceptoJesus) errors.push('Decisión sobre Jesús requerida');
    if (!payload.deseaVisita) errors.push('Preferencia de visita requerida');
    if (!payload.responsableSeguimiento) errors.push('Responsabilidad de seguimiento requerida');
    
    // Validación de teléfono
    const telNormalizado = String(payload.almaTelefono || '').replace(/\D/g, '');
    if (telNormalizado.length < 10 || telNormalizado.length > 15) {
      errors.push('Teléfono debe tener entre 10 y 15 dígitos');
    }
    
    // Validación condicional de célula
    if (payload.fuenteContacto === 'Célula' && !payload.celulaId) {
      errors.push('ID de célula requerido cuando la fuente es Célula');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
  
  /**
   * Genera estadísticas de la cola de trabajos
   * @returns {Object} - Estadísticas de la cola
   */
  static getQueueStats() {
    try {
      const queue = PropertiesService.getScriptProperties();
      const currentQueue = queue.getProperty('JOB_QUEUE_V3') || '[]';
      const jobs = JSON.parse(currentQueue);
      
      const stats = {
        total: jobs.length,
        pending: jobs.filter(j => j.status === 'PENDING').length,
        processing: jobs.filter(j => j.status === 'PROCESSING').length,
        failed: jobs.filter(j => j.status === 'FAILED').length,
        oldest: jobs.length > 0 ? jobs[0].enqueuedAt : null,
        newest: jobs.length > 0 ? jobs[jobs.length - 1].enqueuedAt : null
      };
      
      return stats;
      
    } catch (error) {
      console.error('Error obteniendo estadísticas de cola:', error);
      return { error: error.message };
    }
  }
  
  /**
   * Invalida caché de índice de duplicados
   */
  static invalidateExactIndex() {
    try {
      const cache = CacheService.getScriptCache();
      const cacheKey = `exact_index_v3_${CONFIG.CACHE.VERSION}`;
      cache.remove(cacheKey);
      console.log('🗑️ Caché de índice exacto invalidado');
    } catch (error) {
      console.warn('⚠️ Error invalidando caché:', error.message);
    }
  }
}

// =================================================================
// FUNCIONES PÚBLICAS DE FAST PATH
// =================================================================

/**
 * Función pública para obtener estadísticas de cola
 */
function getJobQueueStats() {
  return FastPathCore.getQueueStats();
}

/**
 * Función pública para invalidar caché de índice
 */
function invalidateExactIndexCache() {
  FastPathCore.invalidateExactIndex();
}

/**
 * Función de utilidad para construir índice manualmente
 */
function buildExactIndex() {
  console.log('🔍 Construyendo índice exacto manualmente...');
  const index = FastPathCore.buildQuickIndex();
  
  // Cachear por 5 minutos
  const cache = CacheService.getScriptCache();
  const cacheKey = `exact_index_v3_${CONFIG.CACHE.VERSION}`;
  cache.put(cacheKey, JSON.stringify(index), 300);
  
  console.log(`✅ Índice construido: ${Object.keys(index).length} registros`);
  return Object.keys(index).length;
}
