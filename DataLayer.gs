/**
 * SISTEMA DE REGISTRO DE ALMAS v2.0
 * Módulo de Datos - Data Layer
 * @version 2.0.0
 */

// =================================================================
// SERVICIO DE CATÁLOGOS
// =================================================================
class CatalogService {
  constructor() {
    this.cache = CacheService.getScriptCache();
  }
  
  getCongregaciones() {
    console.log('🔍 getCongregaciones iniciado');
    const cacheKey = `congregaciones_${CONFIG.CACHE.VERSION}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      console.log('📦 Usando cache para congregaciones');
      return JSON.parse(cached);
    }
    
    console.log('📊 Accediendo a spreadsheet:', CONFIG.SPREADSHEET_ID);
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEETS.LIDERES);
    console.log('📋 Hoja líderes:', sheet ? sheet.getName() : 'NO ENCONTRADA');
    
    if (!sheet || sheet.getLastRow() < 2) {
      console.log('❌ Hoja líderes vacía o no encontrada');
      return [];
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    console.log('📊 Headers encontrados:', headers);
    
    const congCol = headers.findIndex(h => 
      h.toLowerCase().includes('congregación') || 
      h.toLowerCase().includes('congregacion')
    ) + 1;
    console.log('🗂️ Columna congregación:', congCol);
    
    if (congCol === 0) {
      console.log('❌ No se encontró columna de congregación');
      return [];
    }
    
    const data = sheet.getRange(2, congCol, sheet.getLastRow() - 1, 1).getValues();
    console.log('📈 Datos obtenidos:', data.length, 'filas');
    
    const uniqueSet = new Set();
    
    data.forEach(row => {
      const value = String(row[0]).trim();
      if (value) uniqueSet.add(value);
    });
    
    const result = Array.from(uniqueSet).sort();
    console.log('✅ Congregaciones encontradas:', result);
    
    this.cache.put(cacheKey, JSON.stringify(result), CONFIG.CACHE.TTL_CONGREGACIONES);
    
    return result;
  }
  
  getLideresPorCongregacion(congregacion) {
    console.log(`🔍 getLideresPorCongregacion iniciado para: ${congregacion}`);
    const cacheKey = `lideres_${congregacion}_${CONFIG.CACHE.VERSION}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      console.log('📦 Usando cache para líderes');
      return JSON.parse(cached);
    }
    
    console.log('🗺️ Obteniendo mapa de líderes...');
    const leaderMap = this.getLeaderMap();
    const result = [];
    
    console.log(`🗺️ Mapa de líderes obtenido. Total líderes: ${Object.keys(leaderMap).length}`);
    
    Object.entries(leaderMap).forEach(([id, data]) => {
      const [nombre, rol, , cong] = data;
      if (rol === 'LCF' && cong === congregacion) {
        result.push({ id, nombre });
      }
    });
    
    console.log(`✅ Líderes encontrados para ${congregacion}: ${result.length}`);
    
    result.sort((a, b) => a.nombre.localeCompare(b.nombre));
    this.cache.put(cacheKey, JSON.stringify(result), CONFIG.CACHE.TTL_LIDERES);
    
    return result;
  }
  
  getCelulasPorLider(liderId) {
    console.log('🔍 getCelulasPorLider interno - liderId:', liderId);
    
    const cacheKey = `celulas_${liderId}_${CONFIG.CACHE.VERSION}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      console.log('📦 Usando cache para células');
      return JSON.parse(cached);
    }

    // En lugar de leer la hoja cada vez, ahora usaremos un mapa pre-calentado.
    const cellMap = this.getCellMap();
    const result = cellMap[liderId] || [];
    
    console.log('✅ Células encontradas desde el mapa:', result.length);
    
    // Guardamos el resultado específico para este líder para accesos futuros más rápidos
    this.cache.put(cacheKey, JSON.stringify(result), CONFIG.CACHE.TTL_CELULAS);
    
    return result;
  }

  /**
   * NUEVA FUNCIÓN: getCellMap
   * Construye y cachea un mapa de todas las células, agrupadas por ID de líder.
   * Esto evita leer el spreadsheet en cada llamada a getCelulasPorLider.
   */
  getCellMap() {
    const cacheKey = `cell_map_${CONFIG.CACHE.VERSION}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const lock = LockService.getScriptLock();
    const startedAt = Date.now();
    let acquired = false;

    try {
      lock.waitLock(10000); // Esperar hasta 10s
      acquired = true;

      // Doble chequeo por si otro proceso ya generó el mapa mientras esperábamos
      const cachedAfterLock = this.cache.get(cacheKey);
      if (cachedAfterLock) {
        return JSON.parse(cachedAfterLock);
      }

      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      const sheet = ss.getSheetByName(CONFIG.SHEETS.CELULAS);

      if (!sheet || sheet.getLastRow() < 2) {
        console.warn('Cell map: hoja de células vacía o no encontrada.');
        return {};
      }

      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const cols = this.mapColumns(headers, {
        id: ['ID Célula', 'ID_Celula', 'ID'],
        nombre: ['Nombre Célula (Anfitrión)', 'Nombre_Celula', 'Nombre'],
        lcf: ['ID LCF Responsable', 'ID_LCF_Responsable', 'LCF_ID'],
        rol: ['Rol']
      });

      if (!cols.id || !cols.nombre || !cols.lcf || !cols.rol) {
        console.error('Cell map: faltan columnas requeridas en "Directorio de Células".');
        console.error('Se requieren: ID Célula, Nombre Célula (Anfitrión), ID LCF Responsable, Rol.');
        return {};
      }

      const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
      const map = {};

      data.forEach(row => {
        const lcfId = String(row[cols.lcf - 1] || '').trim();
        const rol = String(row[cols.rol - 1] || '').trim();

        if (!lcfId || !(rol === 'Anfitrión' || rol === 'Anfitrión y Asistente')) {
          return; // Ignorar si no es un anfitrión con ID
        }

        const celulaId = String(row[cols.id - 1] || '').trim();
        const celulaNombre = String(row[cols.nombre - 1] || '').trim();

        if (!celulaId || !celulaNombre) {
          return; // Ignorar si no hay datos de célula
        }
        
        if (!map[lcfId]) {
          map[lcfId] = [];
        }
        
        // Evitar duplicados de células para el mismo líder
        if (!map[lcfId].some(c => c.id === celulaId)) {
            map[lcfId].push({ id: celulaId, nombre: celulaNombre });
        }
      });
      
      // Ordenar las células por nombre para cada líder
      for (const lider in map) {
        map[lider].sort((a, b) => a.nombre.localeCompare(b.nombre));
      }

      this.cache.put(cacheKey, JSON.stringify(map), CONFIG.CACHE.TTL_LIDERES); // Usamos TTL largo
      console.log(`Mapa de células reconstruido en ${Date.now() - startedAt}ms (${Object.keys(map).length} líderes con células)`);
      return map;

    } catch (error) {
      console.error('Error generando mapa de células:', error);
      return {};
    } finally {
      if (acquired) {
        try {
          lock.releaseLock();
        } catch (releaseError) {
          console.warn('No se pudo liberar lock de cell map:', releaseError);
        }
      }
    }
  }
  
  getLeaderMap() {
    const cacheKey = `leader_map_${CONFIG.CACHE.VERSION}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const lock = LockService.getScriptLock();
    const startedAt = Date.now();
    let acquired = false;

    try {
      lock.waitLock(10000);
      acquired = true;

      const cachedAfterLock = this.cache.get(cacheKey);
      if (cachedAfterLock) {
        return JSON.parse(cachedAfterLock);
      }

      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      const sheet = ss.getSheetByName(CONFIG.SHEETS.LIDERES);

      if (!sheet || sheet.getLastRow() < 2) {
        console.warn('Leader map: hoja vacía o no encontrada');
        return {};
      }

      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const cols = this.mapColumns(headers, {
        id: ['ID_Lider', 'ID Líder', 'ID'],
        nombre: ['Nombre_Lider', 'Nombre Líder', 'Nombre'],
        rol: ['Rol', 'Tipo'],
        jefe: ['ID_Lider_Directo', 'ID Líder Directo', 'Jefe'],
        congregacion: ['Congregación', 'Congregacion']
      });

      if (!cols.id || !cols.nombre || !cols.rol || !cols.congregacion) {
        console.error('Leader map: faltan columnas requeridas en "Directorio de Líderes".');
        console.error('Se requieren: ID_Lider, Nombre_Lider, Rol, Congregación (o variantes equivalentes).');
        return {};
      }

      const maxCol = Math.max(...Object.values(cols).filter(col => col !== null));
      const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, maxCol).getValues();

      const map = {};

      data.forEach(row => {
        const id = String(row[cols.id - 1] || '').trim();
        if (!id) return;

        const nombre = String(row[cols.nombre - 1] || '').trim();
        const rol = this.normalizeRole(String(row[cols.rol - 1] || ''));
        const jefe = cols.jefe ? String(row[cols.jefe - 1] || '').trim() : '';
        const congregacion = String(row[cols.congregacion - 1] || '').trim();

        map[id] = [nombre, rol, jefe, congregacion];
      });

      this.cache.put(cacheKey, JSON.stringify(map), CONFIG.CACHE.TTL_LIDERES);
      console.log(`Leader map reconstruido en ${Date.now() - startedAt}ms (${Object.keys(map).length} líderes)`);
      return map;

    } catch (error) {
      console.error('Error generando leader map:', error);
      return {};
    } finally {
      if (acquired) {
        try {
          lock.releaseLock();
        } catch (releaseError) {
          console.warn('No se pudo liberar lock de leader map:', releaseError);
        }
      }
    }
  }
  
  getLeaderHierarchy(lcfId) {
    const leaderMap = this.getLeaderMap();
    
    const hierarchy = {
      lcfId: lcfId || '',
      lcfNombre: '',
      lmId: '',
      lmNombre: '',
      ldId: '',
      ldNombre: ''
    };
    
    if (!lcfId || !leaderMap[lcfId]) {
      return hierarchy;
    }
    
    const lcf = leaderMap[lcfId];
    hierarchy.lcfNombre = lcf[0];
    
    let currentId = lcfId;
    const visited = new Set([currentId]);
    let maxHops = 10;
    
    while (maxHops-- > 0) {
      const node = leaderMap[currentId];
      if (!node) break;
      
      const nextId = node[2];
      if (!nextId || visited.has(nextId)) break;
      
      const superior = leaderMap[nextId];
      if (!superior) break;
      
      const role = superior[1];
      
      if (role === 'LM' && !hierarchy.lmId) {
        hierarchy.lmId = nextId;
        hierarchy.lmNombre = superior[0];
      } else if (role === 'LD' && !hierarchy.ldId) {
        hierarchy.ldId = nextId;
        hierarchy.ldNombre = superior[0];
      }
      
      currentId = nextId;
      visited.add(currentId);
      
      if (hierarchy.lmId && hierarchy.ldId) break;
    }
    
    return hierarchy;
  }
  
  mapColumns(headers, mapping) {
    const result = {};
    
    for (const [key, candidates] of Object.entries(mapping)) {
      result[key] = null; // Default to null if not found, NOT column 1
      
      for (const candidate of candidates) {
        const index = headers.findIndex(h => 
          h.toLowerCase().trim() === candidate.toLowerCase().trim()
        );
        
        if (index >= 0) {
          result[key] = index + 1;
          break;
        }
      }
    }
    
    return result;
  }
  
  normalizeRole(rol) {
    const normalized = rol.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    
    if (normalized.includes('lcf') || normalized.includes('casa de fe')) {
      return 'LCF';
    }
    if (normalized.includes('lm') || normalized.includes('miembro')) {
      return 'LM';
    }
    if (normalized.includes('ld') || normalized.includes('discip')) {
      return 'LD';
    }
    
    return rol.toUpperCase();
  }

  warmLeaderMapCache() {
    try {
      this.getLeaderMap();
      console.log(`Leader map warmed at ${new Date()}`);
    } catch (error) {
      console.error('Error warming leader map cache:', error);
    }
  }

  warmCellMapCache() {
    try {
      this.getCellMap();
      console.log(`Cell map warmed at ${new Date()}`);
    } catch (error) {
      console.error('Error warming cell map cache:', error);
    }
  }
}

// =================================================================
// SERVICIO DE DEDUPLICACIÓN
// =================================================================
class DeduplicationService {
  constructor() {
    this.cache = CacheService.getScriptCache();
    this.lock = LockService.getScriptLock();
  }
  
  checkDuplicate(data) {
    const nameKey = this.generateNameKey(data.almaNombres, data.almaApellidos);
    
    try {
      const lockAcquired = this.lock.tryLock(5000);
      if (!lockAcquired) {
        throw new Error('No se pudo adquirir lock para deduplicación');
      }
      
      const index = this.getDedupIndex();
      
      // Verificación exacta (comportamiento original)
      if (index.names[nameKey]) {
        return {
          isDuplicate: true,
          existingId: index.names[nameKey],
          reason: 'Nombre y apellidos ya existen',
          type: 'exact'
        };
      }
      
      // Verificación difusa (nueva funcionalidad)
      if (CONFIG.FUZZY_MATCHING.ENABLED) {
        const fuzzyResult = this.checkFuzzyDuplicates(data);
        if (fuzzyResult.hasDuplicates) {
          return {
            isDuplicate: true,
            existingId: fuzzyResult.matches[0].id,
            reason: `Posible duplicado: ${fuzzyResult.matches[0].nombre} (${(fuzzyResult.matches[0].confidence * 100).toFixed(1)}% confianza)`,
            type: 'fuzzy',
            fuzzyMatches: fuzzyResult.matches,
            confidence: fuzzyResult.confidence
          };
        }
      }
      
      return {
        isDuplicate: false
      };
      
    } finally {
      try {
        this.lock.releaseLock();
      } catch (e) {
        // Ignorar si ya fue liberado
      }
    }
  }
  
  addToIndex(id, data) {
    const nameKey = this.generateNameKey(data.almaNombres, data.almaApellidos);
    const phoneKey = data.almaTelefono;
    
    try {
      const lockAcquired = this.lock.tryLock(5000);
      if (!lockAcquired) return;
      
      const index = this.getDedupIndex();
      
      index.names[nameKey] = id;
      
      if (!index.phones[phoneKey]) {
        index.phones[phoneKey] = [];
      }
      index.phones[phoneKey].push(id);
      
      this.saveDedupIndex(index);
      
    } finally {
      try {
        this.lock.releaseLock();
      } catch (e) {
        // Ignorar
      }
    }
  }
  
  getDedupIndex() {
    const cacheKey = `dedup_index_${CONFIG.CACHE.VERSION}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const index = this.buildDedupIndex();
    this.cache.put(cacheKey, JSON.stringify(index), CONFIG.CACHE.TTL_DEDUP);
    
    return index;
  }
  
  buildDedupIndex() {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEETS.INGRESOS);
    
    const index = {
      names: {},
      phones: {},
      timestamp: Date.now()
    };
    
    if (!sheet || sheet.getLastRow() < 2) {
      return index;
    }
    
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 25).getValues();
    
    data.forEach(row => {
      const id = row[0];
      const nameKey = row[24];
      const phone = row[23];
      
      if (id && nameKey) {
        index.names[nameKey] = id;
      }
      
      if (id && phone) {
        if (!index.phones[phone]) {
          index.phones[phone] = [];
        }
        index.phones[phone].push(id);
      }
    });
    
    return index;
  }
  
  saveDedupIndex(index) {
    const cacheKey = `dedup_index_${CONFIG.CACHE.VERSION}`;
    this.cache.put(cacheKey, JSON.stringify(index), CONFIG.CACHE.TTL_DEDUP);
  }
  
  generateNameKey(nombres, apellidos) {
    const normalized = Utils.normalizeString(`${nombres} ${apellidos}`);
    return Utils.generateHash(normalized);
  }
  
  invalidateCache() {
    const cacheKey = `dedup_index_${CONFIG.CACHE.VERSION}`;
    this.cache.remove(cacheKey);
  }
  
  /**
   * Verifica duplicados usando coincidencia difusa
   * @param {Object} data - Datos del nuevo registro
   * @returns {Object} - Resultado de la búsqueda difusa
   */
  checkFuzzyDuplicates(data) {
    try {
      const detector = new FuzzyDuplicateDetector();
      return detector.findFuzzyDuplicates(data);
    } catch (error) {
      console.error('Error en verificación difusa:', error);
      return { hasDuplicates: false, matches: [], confidence: 0 };
    }
  }
}

// =================================================================
// SERVICIO PRINCIPAL DE REGISTRO
// =================================================================
class RegistrationService {
  constructor() {
    this.dedup = new DeduplicationService();
    this.catalog = new CatalogService();
  }
  
  processRegistration(formData, context = {}) {
    try {
      // 1. Validar datos
      const validation = Validator.validateFormData(formData);
      if (!validation.valid) {
        throw new ValidationError(
          'Datos inválidos: ' + validation.errors.map(e => e.message).join(', ')
        );
      }
      
      const sanitized = validation.sanitized;
      
      // 2. Rate limiting
      const limiter = new RateLimiter();
      const rateCheck = limiter.checkLimit(context.user?.email || 'anonymous');
      
      if (!rateCheck.allowed) {
        throw new Error(rateCheck.message);
      }
      
      // 3. Verificar duplicados
      const dupCheck = this.dedup.checkDuplicate(sanitized);
      
      if (dupCheck.isDuplicate) {
        throw new DuplicateError(
          dupCheck.reason,
          dupCheck.existingId
        );
      }
      
      // 4. Obtener jerarquía
      const hierarchy = this.catalog.getLeaderHierarchy(sanitized.liderCasaDeFeId);
      
      // 5. Generar ID único
      const newId = this.generateUniqueId();
      
      // 6. Preparar registro
      const record = this.prepareRecord(newId, sanitized, hierarchy, context);
      
      // 7. Guardar
      this.saveToSheet(record);
      
      // 8. Actualizar índice
      this.dedup.addToIndex(newId, sanitized);
      
      return {
        status: 'success',
        id: newId,
        message: 'Registro exitoso'
      };
      
    } catch (error) {
      ErrorHandler.logError('processRegistration', error, { formData, context });
      
      if (error instanceof DuplicateError) {
        return {
          status: 'duplicate',
          message: error.message,
          existingId: error.existingId
        };
      }
      
      throw error;
    }
  }
  
  generateUniqueId() {
    const props = PropertiesService.getScriptProperties();
    const lock = LockService.getScriptLock();
    
    try {
      lock.waitLock(5000);
      
      let counter = parseInt(props.getProperty('ALMA_COUNTER') || CONFIG.APP.ID_START.toString());
      counter++;
      props.setProperty('ALMA_COUNTER', counter.toString());
      
      return CONFIG.APP.ID_PREFIX + counter;
      
    } finally {
      lock.releaseLock();
    }
  }
  
  prepareRecord(id, data, hierarchy, context = {}) {
    const now = Utils.formatDate();
    const hierarchyData = hierarchy || {};
    const normalizedPhone = String(data.almaTelefono || '').replace(/\D/g, '');
    const nombreClaveNormalizado = this.dedup.generateNameKey(
      data.almaNombres,
      data.almaApellidos
    );
    const peticionesStr = Array.isArray(data.peticionOracion)
      ? data.peticionOracion.join(', ')
      : String(data.peticionOracion || '');
    const defaultSearchKey = Utils.createSearchKey(data.almaNombres, data.almaApellidos);
    const initialState = context.initialState || 'PROCESANDO';
    const revisionState = context.initialRevision || initialState;
    const placeholderValue = Object.prototype.hasOwnProperty.call(context, 'placeholderValue')
      ? context.placeholderValue
      : '';
    const searchKey = context.searchKey || defaultSearchKey;

    return [
      id,                                   // A: ID_Alma
      now,                                  // B: Timestamp
      data.nombreCapturador || '',          // C: Nombre del Capturador
      data.congregacion || '',              // D: Congregación
      data.liderCasaDeFeId || '',           // E: ID LCF
      hierarchyData.lcfNombre || 'PENDIENTE', // F: Nombre LCF
      hierarchyData.lmId || '',             // G: ID LM
      hierarchyData.lmNombre || 'PENDIENTE',// H: Nombre LM
      hierarchyData.ldId || '',             // I: ID LD
      hierarchyData.ldNombre || 'PENDIENTE',// J: Nombre LD
      data.fuenteContacto || '',            // K: Fuente del Contacto
      data.celulaId || '',                  // L: ID Célula
      data.celulaNombre || '',              // M: Nombre Célula
      data.almaNombres || '',               // N: Nombres del Alma
      data.almaApellidos || '',             // O: Apellidos del Alma
      data.almaTelefono || '',              // P: Teléfono
      data.almaDireccion || '',             // Q: Dirección
      data.almaSexo || '',                  // R: Sexo
      data.almaEdad || '',                  // S: Rango de Edad
      data.aceptoJesus || '',               // T: Aceptó a Jesús
      data.deseaVisita || '',               // U: ¿Desea Visita?
      peticionesStr,                        // V: Petición de Oración
      data.responsableSeguimiento || '',    // W: ¿Responsable de Seguimiento?
      normalizedPhone,                      // X: Tel_Normalizado
      nombreClaveNormalizado,               // Y: NombreClave_Normalizado
      initialState,                         // Z: Estado
      placeholderValue,                     // AA: Columna auxiliar (#REF!)
      revisionState,                        // AB: Estado_Revision
      searchKey                             // AC: KEY_BUSQUEDA
    ];
  }
  
  saveToSheet(record) {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.SHEETS.INGRESOS);
    
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEETS.INGRESOS);
      
      const headers = [
        'ID_Alma', 'Timestamp', 'Nombre del Capturador', 'Congregación', 'ID LCF',
        'Nombre LCF', 'ID LM', 'Nombre LM', 'ID LD', 'Nombre LD',
        'Fuente del Contacto', 'ID Célula', 'Nombre Célula',
        'Nombres del Alma', 'Apellidos del Alma', 'Teléfono', 'Dirección',
        'Sexo', 'Rango de Edad', 'Aceptó a Jesús', '¿Desea Visita?',
        'Petición de Oración', '¿Responsable de Seguimiento?',
        'Tel_Normalizado', 'NombreClave_Normalizado', 'Estado',
        '#REF!', 'Estado_Revision', 'KEY_BUSQUEDA'
      ];
      
      sheet.getRange(1, 1, 1, headers.length)
        .setValues([headers])
        .setFontWeight('bold')
        .setBackground('#f0f0f0');
    }
    
    const rowNumber = fastAppend(record);
    this.dedup.invalidateCache();
    return rowNumber;
  }
}

// =================================================================
// UTILIDADES DE ESCRITURA RÁPIDA (Sheets API)
// =================================================================

function fastAppend(record) {
  const startTime = Date.now();
  try {
    const response = Sheets.Spreadsheets.Values.append(
      { values: [record] },
      CONFIG.SPREADSHEET_ID,
      CONFIG.SHEETS.INGRESOS + '!A1',
      {
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS'
      }
    );

    const updates = response && response.updates;
    if (updates && updates.updatedRange) {
      const match = updates.updatedRange.match(/!A(\d+):/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.INGRESOS);
    return sheet.getLastRow();

  } catch (error) {
    console.warn('fastAppend: Sheets API falló, utilizando appendRow. Detalle: ' + error.message);
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.INGRESOS);
    sheet.appendRow(record);
    return sheet.getLastRow();
  } finally {
    const duration = Date.now() - startTime;
    console.log('fastAppend completado en ' + duration + 'ms');
  }
}

// =================================================================
// FUNCIONES PÚBLICAS
// =================================================================
function getCongregaciones() {
  return ErrorHandler.wrap('getCongregaciones', function() {
    const service = new CatalogService();
    return service.getCongregaciones();
  })();
}

function getLideresPorCongregacion(congregacion) {
  return ErrorHandler.wrap('getLideresPorCongregacion', function() {
    const service = new CatalogService();
    return service.getLideresPorCongregacion(congregacion);
  })();
}

function getCelulasPorLider(liderId) {
  return ErrorHandler.wrap('getCelulasPorLider', function() {
    try {
      console.log('🔍 getCelulasPorLider llamada con liderId:', liderId);
      const service = new CatalogService();
      const result = service.getCelulasPorLider(liderId);
      console.log('✅ getCelulasPorLider resultado:', result);
      return result;
    } catch (error) {
      console.error('❌ Error en getCelulasPorLider:', error);
      throw error;
    }
  })();
}

function processForm(formData) {
  // Esta función ahora actúa como un punto de entrada público
  // que llama a la nueva arquitectura rápida.
  return processForm_fastPath(formData);
}

// =================================================================
// DISPATCHER - PROCESAMIENTO EN LOTES
// =================================================================

/**
 * Procesa trabajos de la cola en lotes pequeños
 * Se ejecuta por trigger cada 1-2 minutos
 */
function dispatcher_v3() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    console.log('🔒 Dispatcher ocupado, saltando ejecución');
    return;
  }

  try {
    console.log('🚀 Dispatcher V3 iniciado');
    
    // Procesar hasta 5 trabajos por ejecución
    const batchSize = 5;
    let processed = 0;
    
    for (let i = 0; i < batchSize; i++) {
      const job = dequeueNextJob();
      if (!job) break;
      
      console.log(`📋 Procesando trabajo ${i + 1}/${batchSize}: Fila ${job.rowNum}`);
      
      try {
        processJobFast(job);
        markJobCompleted(job);
        processed++;
      } catch (error) {
        console.error(`❌ Error procesando job ${job.id}:`, error);
        markJobFailed(job, error.message);
      }
    }
    
    console.log(`✅ Dispatcher completado: ${processed} trabajos procesados`);
    
    // Si quedan trabajos, programar siguiente ejecución
    if (hasMoreJobs()) {
      ensureNextDispatcherRun();
    }
    
  } finally {
    lock.releaseLock();
  }
}

/**
 * Procesa un trabajo individual de manera optimizada
 */
function processJobFast(job) {
  const startTime = Date.now();
  
  // 1. Obtener jerarquía (usa caché)
  const catalogService = new CatalogService();
  const hierarchy = catalogService.getLeaderHierarchy(job.payload.liderCasaDeFeId);
  
  // 2. Verificación difusa optimizada (máximo 100 candidatos)
  const fuzzyDetector = new FuzzyDuplicateDetector();
  const fuzzyResult = fuzzyDetector.findFuzzyDuplicates(job.payload);
  
  // 3. Determinar estado final
  let finalStatus = 'COMPLETADO';
  let revisionStatus = 'OK';
  
  if (fuzzyResult.hasDuplicates) {
    const topMatch = fuzzyResult.matches[0];
    revisionStatus = `REVISAR DUPLICADO (DIFUSO ${Math.round(topMatch.confidence * 100)}%): ID ${topMatch.id}`;
  }
  
  // 4. Actualizar fila usando batch update (más rápido)
  updateRowBatch(job.rowNum, hierarchy, finalStatus, revisionStatus);
  
  const duration = Date.now() - startTime;
  console.log(`⚡ Job procesado en ${duration}ms`);
}

/**
 * Actualiza una fila usando operación batch optimizada
 */
function updateRowBatch(rowNum, hierarchy, status, revisionStatus) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    .getSheetByName(CONFIG.SHEETS.INGRESOS);
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Mapear columnas
  const updates = [];
  const lcfNombreCol = headers.indexOf('Nombre LCF') + 1;
  const lmIdCol = headers.indexOf('ID LM') + 1;
  const lmNombreCol = headers.indexOf('Nombre LM') + 1;
  const ldIdCol = headers.indexOf('ID LD') + 1;
  const ldNombreCol = headers.indexOf('Nombre LD') + 1;
  const estadoCol = headers.indexOf('Estado') + 1;
  const revisionCol = headers.indexOf('Estado_Revision') + 1;
  
  // Preparar updates
  if (lcfNombreCol > 0) {
    updates.push({
      range: `${sheet.getName()}!${getColumnLetter(lcfNombreCol)}${rowNum}`,
      values: [[hierarchy.lcfNombre || 'PENDIENTE']]
    });
  }
  
  if (lmIdCol > 0) {
    updates.push({
      range: `${sheet.getName()}!${getColumnLetter(lmIdCol)}${rowNum}`,
      values: [[hierarchy.lmId || '']]
    });
  }
  
  if (lmNombreCol > 0) {
    updates.push({
      range: `${sheet.getName()}!${getColumnLetter(lmNombreCol)}${rowNum}`,
      values: [[hierarchy.lmNombre || 'PENDIENTE']]
    });
  }
  
  if (ldIdCol > 0) {
    updates.push({
      range: `${sheet.getName()}!${getColumnLetter(ldIdCol)}${rowNum}`,
      values: [[hierarchy.ldId || '']]
    });
  }
  
  if (ldNombreCol > 0) {
    updates.push({
      range: `${sheet.getName()}!${getColumnLetter(ldNombreCol)}${rowNum}`,
      values: [[hierarchy.ldNombre || 'PENDIENTE']]
    });
  }
  
  if (estadoCol > 0) {
    updates.push({
      range: `${sheet.getName()}!${getColumnLetter(estadoCol)}${rowNum}`,
      values: [[status]]
    });
  }
  
  if (revisionCol > 0) {
    updates.push({
      range: `${sheet.getName()}!${getColumnLetter(revisionCol)}${rowNum}`,
      values: [[revisionStatus]]
    });
  }
  
  // Aplicar todos los updates en una sola llamada
  if (updates.length > 0) {
    try {
      Sheets.Spreadsheets.Values.batchUpdate({
        valueInputOption: 'RAW',
        data: updates
      }, CONFIG.SPREADSHEET_ID);
      console.log(`📝 ${updates.length} campos actualizados via batch`);
    } catch (apiError) {
      console.warn('Batch update falló, usando método tradicional:', apiError.message);
      // Fallback a updates individuales
      updates.forEach(update => {
        const range = sheet.getRange(update.range);
        range.setValue(update.values[0][0]);
      });
    }
  }
}

/**
 * Convierte número de columna a letra (1=A, 2=B, etc.)
 */
function getColumnLetter(columnNumber) {
  let letter = '';
  while (columnNumber > 0) {
    columnNumber--;
    letter = String.fromCharCode(65 + (columnNumber % 26)) + letter;
    columnNumber = Math.floor(columnNumber / 26);
  }
  return letter;
}

// =================================================================
// GESTIÓN DE COLA DE TRABAJOS
// =================================================================

function dequeueNextJob() {
  const props = PropertiesService.getScriptProperties();
  const queueJson = props.getProperty('JOB_QUEUE_V3') || '[]';
  const queue = JSON.parse(queueJson);
  
  const nextJob = queue.find(job => job.status === 'PENDING');
  if (nextJob) {
    nextJob.status = 'PROCESSING';
    nextJob.startedAt = new Date().toISOString();
    props.setProperty('JOB_QUEUE_V3', JSON.stringify(queue));
  }
  
  return nextJob;
}

function markJobCompleted(job) {
  const props = PropertiesService.getScriptProperties();
  const queueJson = props.getProperty('JOB_QUEUE_V3') || '[]';
  const queue = JSON.parse(queueJson);
  
  const jobIndex = queue.findIndex(j => j.rowNum === job.rowNum);
  if (jobIndex >= 0) {
    queue[jobIndex].status = 'COMPLETED';
    queue[jobIndex].completedAt = new Date().toISOString();
    props.setProperty('JOB_QUEUE_V3', JSON.stringify(queue));
  }
}

function markJobFailed(job, errorMessage) {
  const props = PropertiesService.getScriptProperties();
  const queueJson = props.getProperty('JOB_QUEUE_V3') || '[]';
  const queue = JSON.parse(queueJson);
  
  const jobIndex = queue.findIndex(j => j.rowNum === job.rowNum);
  if (jobIndex >= 0) {
    queue[jobIndex].status = 'FAILED';
    queue[jobIndex].failedAt = new Date().toISOString();
    queue[jobIndex].error = errorMessage;
    props.setProperty('JOB_QUEUE_V3', JSON.stringify(queue));
  }
}

function hasMoreJobs() {
  const props = PropertiesService.getScriptProperties();
  const queueJson = props.getProperty('JOB_QUEUE_V3') || '[]';
  const queue = JSON.parse(queueJson);
  return queue.some(job => job.status === 'PENDING');
}

function ensureNextDispatcherRun() {
  const props = PropertiesService.getScriptProperties();
  const existingTrigger = props.getProperty('DISPATCHER_TRIGGER_V3');
  
  // Solo crear trigger si no existe uno activo
  if (!existingTrigger) {
    const trigger = ScriptApp.newTrigger('dispatcher_v3')
      .timeBased()
      .after(2 * 60 * 1000) // 2 minutos
      .create();
    
    props.setProperty('DISPATCHER_TRIGGER_V3', trigger.getUniqueId());
    console.log('⏰ Próximo dispatcher programado en 2 minutos');
  }
}

/**
 * Se ejecuta automáticamente cuando se edita el Google Sheet.
 * Si se añade una nueva fila (como desde un formulario),
 * y la columna de Estado está vacía, la rellena con "Activo".
 */
function onEdit(e) {
  const hoja = e.source.getActiveSheet();
  const rangoEditado = e.range;

  // Solo nos interesa la hoja "Ingresos" y cuando se añade una nueva fila
  if (hoja.getName() === 'Ingresos' && rangoEditado.getColumn() === 1 && rangoEditado.getRow() > 1) {

    const headers = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
    const estadoColIndex = headers.indexOf('Estado');

    // Si no hay columna de estado o la fila ya tiene un valor, no hacer nada
    if (estadoColIndex === -1 || hoja.getRange(rangoEditado.getRow(), estadoColIndex + 1).getValue() !== '') {
      return;
    }

    // Escribir "Activo" en la columna de Estado para la nueva fila
    hoja.getRange(rangoEditado.getRow(), estadoColIndex + 1).setValue('Activo');
  }
}

function warmLeaderMapCache() {
  const service = new CatalogService();
  service.warmLeaderMapCache();
}

function warmCellMapCache() {
  const service = new CatalogService();
  service.warmCellMapCache();
}