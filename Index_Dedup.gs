/**
 * SISTEMA DE REGISTRO DE ALMAS v2.0
 * Módulo de Índice de Deduplicación
 * @version 2.1.0
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
  CACHE_TTL_SECONDS: 1800 // 30 minutos, igual que TTL_LIDERES
};

// =================================================================
// LÓGICA DE MANEJO DEL ÍNDICE
// =================================================================

class DedupIndexService {
  /**
   * Genera una clave única y normalizada para un registro.
   * La clave se basa en el teléfono y el nombre completo.
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
    
    // Usamos SHA-256 para un hash robusto y lo codificamos en base64 para hacerlo URL-safe y más corto.
    const hashBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, rawKey);
    return Utilities.base64Encode(hashBytes).substring(0, 22); // Acortamos para eficiencia
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
      // Descomprimir los datos de la caché
      const unzipped = Utilities.ungzip(Utilities.base64Decode(cached));
      const jsonString = unzipped.getDataAsString();
      return new Set(JSON.parse(jsonString));
    }

    // Si no está en caché, lo construimos desde la hoja
    return this.buildIndexKeySetFromSheet();
  }
  
  /**
   * Construye el conjunto de claves directamente desde la hoja de cálculo 'Index_Dedup'.
   * Este método es más lento y solo se debe llamar cuando la caché está fría.
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
      .filter(key => key); // Filtramos por si hay celdas vacías

    const keySet = new Set(keys);
    
    // Guardar la nueva versión en caché (comprimida)
    const jsonString = JSON.stringify(Array.from(keySet));
    const blob = Utilities.newBlob(jsonString, 'application/json');
    const gzippedBlob = Utilities.gzip(blob);
    const payload = Utilities.base64Encode(gzippedBlob.getBytes());
    
    const cache = CacheService.getScriptCache();
    const cacheKey = `${INDEX_CONFIG.CACHE_KEY_PREFIX}full_set`;
    
    // Verificamos si el payload no excede el límite
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
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(INDEX_CONFIG.SHEET_NAME);
    
    if (!sheet) {
      console.error(`No se pudo añadir al índice. La hoja '${INDEX_CONFIG.SHEET_NAME}' no existe.`);
      return;
    }
    
    sheet.appendRow([key, rowNum, new Date()]);

    // Invalidar la caché para que la próxima lectura la reconstruya
    this.invalidateIndexCache();
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
