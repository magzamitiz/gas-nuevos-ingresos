/**
 * SISTEMA DE REGISTRO DE ALMAS v2.0
 * Módulo de Índice de Deduplicación
 * @version 2.1.1 - CORRECCIÓN DE CACHÉ
 */

// =================================================================
// CONSTANTES Y CONFIGURACIÓN DEL ÍNDICE
// =================================================================
const INDEX_CONFIG = {
  SHEET_NAME: "Index_Dedup",
  KEY_COLUMN: 1,
  ROW_COLUMN: 2,
  TIMESTAMP_COLUMN: 3,
  CACHE_KEY_PREFIX: "dedupIndex.v2.",
  CACHE_TTL_SECONDS: 1800 // 30 minutos
};

// Constante global para Document Properties
const CACHE_KEY = 'index_dedup_set_v4';

// =================================================================
// LÓGICA DE MANEJO DEL ÍNDICE
// =================================================================

class DedupIndexService {
  /**
   * Genera una clave única y normalizada para un registro.
   * @param {object} data - Contiene almaNombres, almaApellidos, almaTelefono.
   * @returns {string} - Una clave hash corta y única.
   */
  static generateKey(data) {
    if (!data.almaTelefono || !data.almaNombres || !data.almaApellidos) {
      console.error("generateKey: Faltan datos para generar la clave (teléfono, nombres, apellidos).");
      return null;
    }

    const normalizedPhone = String(data.almaTelefono).replace(/\D/g, '');
    const normalizedName = Utils.normalizeString(`${data.almaNombres} ${data.almaApellidos}`);
    
    const rawKey = `${normalizedPhone}|${normalizedName}`;
    const hashBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, rawKey);
    return Utilities.base64Encode(hashBytes).substring(0, 22);
  }

  /**
   * NUEVA IMPLEMENTACIÓN: Obtiene el conjunto de todas las claves del índice
   * Usa Document Properties en lugar de CacheService para evitar límite de 100KB
   * @returns {Set<string>} - Un Set con todas las claves de duplicados existentes.
   */
  static getIndexKeySet() {
    const docProps = PropertiesService.getDocumentProperties();
    
    try {
      // Intentar cargar desde Document Properties (chunked)
      const cachedChunks = [];
      let chunkIndex = 0;
      let chunk;
      
      // Leer chunks hasta encontrar null
      while ((chunk = docProps.getProperty(`${CACHE_KEY}_${chunkIndex}`)) !== null) {
        cachedChunks.push(chunk);
        chunkIndex++;
      }
      
      if (cachedChunks.length > 0) {
        const fullData = cachedChunks.join('');
        const keysArray = JSON.parse(fullData);
        console.log(`✅ Caché cargada: ${keysArray.length} keys desde Document Properties`);
        return new Set(keysArray);
      }
    } catch (e) {
      console.warn(`Error al procesar caché de Document Properties: ${e.message}. Se reconstruirá desde la hoja.`);
      // Limpiar caché corrupta
      this.cleanupDocumentPropertiesCache();
    }
    
    // Si no está en caché, lo construimos desde la hoja
    return this.buildAndCacheIndexSet();
  }
  
  /**
   * NUEVA IMPLEMENTACIÓN: Construye el conjunto de claves desde la hoja Index_Dedup
   * Usa procesamiento por batches y guarda en Document Properties por chunks
   * @returns {Set<string>} - Un Set con todas las claves.
   */
  static buildAndCacheIndexSet() {
    console.time('buildIndexSet');
    
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(INDEX_CONFIG.SHEET_NAME);
    
    if (!sheet) {
      console.warn(`La hoja '${INDEX_CONFIG.SHEET_NAME}' no existe. Creándola...`);
      sheet = ss.insertSheet(INDEX_CONFIG.SHEET_NAME);
      sheet.appendRow(['key', 'row_in_ingresos', 'updated_at']);
      sheet.hideSheet();
      console.timeEnd('buildIndexSet');
      return new Set();
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      console.timeEnd('buildIndexSet');
      return new Set();
    }

    // Procesar en batches de 5000 filas para evitar timeout
    const keySet = new Set();
    const BATCH_SIZE = 5000;
    
    for (let startRow = 2; startRow <= lastRow; startRow += BATCH_SIZE) {
      const endRow = Math.min(startRow + BATCH_SIZE - 1, lastRow);
      const range = sheet.getRange(startRow, 1, endRow - startRow + 1, 1);
      const values = range.getValues();
      
      values.forEach(row => {
        if (row[0]) {
          keySet.add(String(row[0]));
        }
      });
      
      console.log(`Procesado: ${endRow}/${lastRow} filas (${keySet.size} claves únicas)`);
    }
    
    // Guardar en Document Properties por chunks de 50000 caracteres
    try {
      const docProps = PropertiesService.getDocumentProperties();
      const keysArray = Array.from(keySet);
      const jsonString = JSON.stringify(keysArray);
      const CHUNK_SIZE = 50000;
      
      // Limpiar caché anterior
      this.cleanupDocumentPropertiesCache();
      
      // Guardar en chunks
      for (let i = 0; i < jsonString.length; i += CHUNK_SIZE) {
        const chunk = jsonString.slice(i, i + CHUNK_SIZE);
        const chunkIndex = i / CHUNK_SIZE;
        docProps.setProperty(`${CACHE_KEY}_${chunkIndex}`, chunk);
      }
      
      console.log(`✅ Caché guardada: ${keysArray.length} keys en ${Math.ceil(jsonString.length / CHUNK_SIZE)} chunks`);
    } catch (e) {
      console.warn(`No se pudo cachear en Document Properties: ${e.message}`);
    }
    
    console.timeEnd('buildIndexSet');
    return keySet;
  }

  /**
   * Limpia la caché antigua de Document Properties
   */
  static cleanupDocumentPropertiesCache() {
    try {
      const docProps = PropertiesService.getDocumentProperties();
      
      // Obtener todas las propiedades y limpiar las del caché
      const allProps = docProps.getProperties();
      Object.keys(allProps).forEach(key => {
        if (key.startsWith(CACHE_KEY)) {
          docProps.deleteProperty(key);
        }
      });
      
      console.log('🧹 Caché antigua de Document Properties limpiada');
    } catch (e) {
      console.warn(`Error limpiando caché antigua: ${e.message}`);
    }
  }

  /**
   * Añade una nueva entrada al índice en la hoja de cálculo 'Index_Dedup'.
   * @param {string} key - La clave hash del nuevo registro.
   * @param {number} rowNum - El número de fila donde se insertó el registro en la hoja 'Ingresos'.
   */
  static appendToIndexSheet(key, rowNum) {
    try {
      // Usar fastAppendToSheet para mantener el flujo optimizado
      const record = [key, rowNum, new Date()];
      
      // CORRECCIÓN: fastAppendToSheet devuelve el NÚMERO de fila, no un objeto
      const newRowNum = fastAppendToSheet(INDEX_CONFIG.SHEET_NAME, record);
      
      // Si devuelve un número válido, fue exitoso
      if (newRowNum && typeof newRowNum === 'number' && newRowNum > 0) {
        console.log(`✅ Índice actualizado rápidamente: ${key} -> fila ${newRowNum}`);
        // Invalidar caché del índice completo
        this.invalidateIndexCache();
        // Invalidar caché de la clave individual
        const cache = CacheService.getScriptCache();
        cache.remove(`dedupIndex.v2.key.${key}`);
        return;
      } else {
        throw new Error(`fastAppendToSheet devolvió valor inválido: ${newRowNum}`);
      }
      
    } catch (error) {
      console.warn(`⚠️ Fallback a appendRow: ${error.message}`);
      
      // Plan de contingencia con appendRow
      try {
        const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        const sheet = ss.getSheetByName(INDEX_CONFIG.SHEET_NAME);
        
        if (!sheet) {
          console.error(`Hoja '${INDEX_CONFIG.SHEET_NAME}' no existe`);
          return;
        }
        
        sheet.appendRow([key, rowNum, new Date()]);
        this.invalidateIndexCache();
        
        // Invalidar caché de la clave individual
        const cache = CacheService.getScriptCache();
        cache.remove(`dedupIndex.v2.key.${key}`);
        
        console.log(`✅ Índice actualizado con fallback: ${key} -> fila ${rowNum}`);
        
      } catch (fallbackError) {
        console.error(`❌ Error crítico actualizando índice: ${fallbackError.message}`);
        // No lanzar error para no bloquear el fast path
      }
    }
  }

  /**
   * Invalida la caché del índice de duplicados (tanto CacheService como Document Properties).
   */
  static invalidateIndexCache() {
    // Limpiar caché antigua de CacheService
    const cache = CacheService.getScriptCache();
    const cacheKey = `${INDEX_CONFIG.CACHE_KEY_PREFIX}full_set`;
    cache.remove(cacheKey);
    
    // Limpiar caché nueva de Document Properties
    this.cleanupDocumentPropertiesCache();
    
    console.log("🧹 Caché del índice de duplicados invalidada (CacheService + Document Properties).");
  }

  /**
   * VERSIÓN OPTIMIZADA: Verifica si una clave específica existe
   * Usa el Set en memoria sin reconstruir innecesariamente
   * @param {string} searchKey - Clave a buscar
   * @returns {boolean} - true si la clave existe
   */
  static checkSingleKey(searchKey) {
    if (!searchKey) return false;
    
    const startTime = Date.now();
    
    // 1. PRIMERO: Verificar caché individual de la clave
    const cache = CacheService.getScriptCache();
    const cacheKey = `dedupIndex.v2.key.${searchKey}`;
    const cached = cache.get(cacheKey);
    if (cached !== null) {
      const exists = cached === 'true';
      console.log(`⚡ Cache hit individual: ${searchKey} = ${exists} (${Date.now() - startTime}ms)`);
      return exists;
    }
    
    // 2. SEGUNDO: Usar el Set de claves que YA está en memoria
    try {
      // Obtener el Set del caché (sin reconstruir si ya existe)
      const keySet = this.getIndexKeySet();
      
      // Si el Set está vacío o null, la clave no existe
      if (!keySet || keySet.size === 0) {
        console.log(`⚡ Set vacío: ${searchKey} = false (${Date.now() - startTime}ms)`);
        cache.put(cacheKey, 'false', 300);
        return false;
      }
      
      // Búsqueda O(1) en el Set
      const exists = keySet.has(searchKey);
      
      // Cachear el resultado individual para próximas consultas
      cache.put(cacheKey, exists.toString(), 300);
      
      console.log(`⚡ Búsqueda en Set caché: ${searchKey} = ${exists} (${Date.now() - startTime}ms)`);
      return exists;
      
    } catch (error) {
      console.warn(`⚠️ Error obteniendo Set de claves: ${error.message}`);
      
      // 3. ÚLTIMO RECURSO: TextFinder solo si todo lo demás falla
      try {
        const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        const sheet = ss.getSheetByName(INDEX_CONFIG.SHEET_NAME);
        
        if (!sheet || sheet.getLastRow() < 2) {
          cache.put(cacheKey, 'false', 300);
          console.log(`⚡ Hoja vacía: ${searchKey} = false (${Date.now() - startTime}ms)`);
          return false;
        }
        
        // TextFinder SOLO como fallback de emergencia
        const finder = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
          .createTextFinder(searchKey)
          .matchEntireCell(true)
          .findNext();
        
        const exists = finder !== null;
        
        // Cachear resultado
        cache.put(cacheKey, exists.toString(), 300);
        
        console.log(`⚠️ FALLBACK TextFinder: ${searchKey} = ${exists} (${Date.now() - startTime}ms)`);
        return exists;
        
      } catch (fallbackError) {
        console.error(`❌ Error en fallback TextFinder: ${fallbackError.message}`);
        // Asumir que no existe para no bloquear
        cache.put(cacheKey, 'false', 60);
        return false;
      }
    }
  }
}

// =================================================================
// FUNCIONES PÚBLICAS PARA WARMING
// =================================================================

/**
 * Fuerza la carga del índice de duplicados en la caché.
 * Ideal para ser llamada por un trigger de tiempo.
 */
function warmDedupIndexCache() {
  try {
    console.log("🔥 Calentando caché del índice de duplicados...");
    // Simplemente llamando a esta función, forzamos la construcción y el cacheo si no existe.
    DedupIndexService.getIndexKeySet();
    console.log("✅ Caché del índice de duplicados calentada.");
  } catch (error) {
    console.error("Error al calentar la caché del índice de duplicados:", error);
  }
}