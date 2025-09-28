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
   * Obtiene el conjunto de todas las claves del índice, usando la caché si está disponible.
   * @returns {Set<string>} - Un Set con todas las claves de duplicados existentes.
   */
  static getIndexKeySet() {
    const cache = CacheService.getScriptCache();
    const cacheKey = `${INDEX_CONFIG.CACHE_KEY_PREFIX}full_set`;
    
    const cached = cache.get(cacheKey);
    if (cached) {
      try {
        // --- CORRECCIÓN ROBUSTA PARA DESCOMPRESIÓN ---
        const decodedBytes = Utilities.base64Decode(cached);
        const blob = Utilities.newBlob(decodedBytes, 'application/gzip', 'index.gz');
        const unzipped = Utilities.ungzip(blob);
        const jsonString = unzipped.getDataAsString(Utilities.Charset.UTF_8);
        return new Set(JSON.parse(jsonString));
      } catch(e) {
        console.warn(`Error al procesar la caché del índice: ${e.message}. Se reconstruirá desde la hoja.`);
        // Si la caché está corrupta, la invalidamos y la reconstruimos.
        this.invalidateIndexCache();
        return this.buildIndexKeySetFromSheet();
      }
    }

    // Si no está en caché, lo construimos desde la hoja.
    return this.buildIndexKeySetFromSheet();
  }
  
  /**
   * Construye el conjunto de claves directamente desde la hoja de cálculo 'Index_Dedup'.
   * @returns {Set<string>} - Un Set con todas las claves.
   */
  static buildIndexKeySetFromSheet() {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(INDEX_CONFIG.SHEET_NAME);
    if (!sheet) {
      console.warn(`La hoja '${INDEX_CONFIG.SHEET_NAME}' no existe. Creándola...`);
      sheet = ss.insertSheet(INDEX_CONFIG.SHEET_NAME);
      sheet.appendRow(['key', 'row_in_ingresos', 'updated_at']);
      sheet.hideSheet();
      return new Set();
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return new Set();
    }

    const keys = sheet.getRange(2, INDEX_CONFIG.KEY_COLUMN, lastRow - 1, 1).getValues()
      .flat()
      .filter(key => key);

    const keySet = new Set(keys);
    
    // --- CORRECCIÓN ROBUSTA PARA COMPRESIÓN ---
    const jsonString = JSON.stringify(Array.from(keySet));
    const blob = Utilities.newBlob(jsonString, 'application/json', 'index.json');
    const gzippedBlob = Utilities.gzip(blob);
    const payload = Utilities.base64Encode(gzippedBlob.getBytes());
    
    const cache = CacheService.getScriptCache();
    const cacheKey = `${INDEX_CONFIG.CACHE_KEY_PREFIX}full_set`;

    if (payload.length < 100 * 1024) { // Límite de 100KB de Google Cache
        cache.put(cacheKey, payload, INDEX_CONFIG.CACHE_TTL_SECONDS);
    } else {
        console.warn('El índice de duplicados es demasiado grande para la caché (>100KB). El rendimiento puede verse afectado.');
    }
    
    return keySet;
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
   * Invalida la caché del índice de duplicados.
   */
  static invalidateIndexCache() {
    const cache = CacheService.getScriptCache();
    const cacheKey = `${INDEX_CONFIG.CACHE_KEY_PREFIX}full_set`;
    cache.remove(cacheKey);
    console.log("Caché del índice de duplicados invalidada.");
  }

  /**
   * Verifica si una clave específica existe SIN cargar todo el índice
   * @param {string} searchKey - Clave a buscar
   * @returns {boolean} - true si la clave existe
   */
  static checkSingleKey(searchKey) {
    if (!searchKey) return false;
    
    const startTime = Date.now();
    const cache = CacheService.getScriptCache();
    const cacheKey = `dedupIndex.v2.key.${searchKey}`;
    
    // 1. Verificar caché individual de la clave
    const cached = cache.get(cacheKey);
    if (cached !== null) {
      const exists = cached === 'true';
      console.log(`⚡ Cache hit individual: ${searchKey} = ${exists} (${Date.now() - startTime}ms)`);
      return exists;
    }
    
    // 2. Si no está en caché, buscar con TextFinder (búsqueda puntual)
    try {
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      const sheet = ss.getSheetByName(INDEX_CONFIG.SHEET_NAME);
      
      if (!sheet || sheet.getLastRow() < 2) {
        cache.put(cacheKey, 'false', 300); // Cachear que no existe
        console.log(`⚡ Clave no existe (hoja vacía) - ${Date.now() - startTime}ms`);
        return false;
      }
      
      // Usar TextFinder para buscar SOLO esta clave en la columna 1
      // Verificar que hay datos en la hoja
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        cache.put(cacheKey, 'false', 300);
        console.log(`⚡ Clave no existe (hoja vacía) - ${Date.now() - startTime}ms`);
        return false;
      }
      
      const finder = sheet.getRange(2, 1, lastRow - 1, 1)
        .createTextFinder(searchKey)
        .matchEntireCell(true)
        .findNext();
      
      const exists = finder !== null;
      
      // Cachear el resultado individual por 5 minutos (300 segundos)
      cache.put(cacheKey, exists.toString(), 300);
      
      console.log(`⚡ Búsqueda puntual: ${searchKey} = ${exists} (${Date.now() - startTime}ms)`);
      return exists;
      
    } catch (error) {
      console.error(`Error en checkSingleKey: ${error.message}`);
      // NO usar fallback lento - retornar false para no bloquear el sistema
      console.log(`⚠️ TextFinder falló para ${searchKey}, asumiendo que no existe`);
      // Cachear como no existe para evitar reintentos
      cache.put(cacheKey, 'false', 60); // Cache por 1 minuto
      return false;
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