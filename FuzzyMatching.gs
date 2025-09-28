/**
 * SISTEMA DE COINCIDENCIA DIFUSA v2.0
 * Módulo de Detección Avanzada de Duplicados
 * @version 2.0.0
 */

// =================================================================
// ALGORITMOS DE COINCIDENCIA DIFUSA
// =================================================================
class FuzzyMatcher {
  /**
   * Calcula la distancia de Levenshtein entre dos strings
   * @param {string} str1 - Primer string
   * @param {string} str2 - Segundo string
   * @returns {number} - Distancia de Levenshtein
   */
  static levenshteinDistance(str1, str2) {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    // Inicializar matriz
    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    // Llenar matriz
    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // sustitución
            matrix[i][j - 1] + 1,     // inserción
            matrix[i - 1][j] + 1      // eliminación
          );
        }
      }
    }

    return matrix[len2][len1];
  }

  /**
   * Calcula el coeficiente de similitud de Jaro-Winkler
   * @param {string} str1 - Primer string
   * @param {string} str2 - Segundo string
   * @returns {number} - Coeficiente de similitud (0-1)
   */
  static jaroWinklerSimilarity(str1, str2) {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    const matchWindow = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
    if (matchWindow < 0) return 0.0;

    const str1Matches = new Array(str1.length).fill(false);
    const str2Matches = new Array(str2.length).fill(false);

    let matches = 0;
    let transpositions = 0;

    // Encontrar coincidencias
    for (let i = 0; i < str1.length; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, str2.length);

      for (let j = start; j < end; j++) {
        if (str2Matches[j] || str1[i] !== str2[j]) continue;
        str1Matches[i] = true;
        str2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0.0;

    // Contar transposiciones
    let k = 0;
    for (let i = 0; i < str1.length; i++) {
      if (!str1Matches[i]) continue;
      while (!str2Matches[k]) k++;
      if (str1[i] !== str2[k]) transpositions++;
      k++;
    }

    const jaro = (matches / str1.length + 
                 matches / str2.length + 
                 (matches - transpositions / 2) / matches) / 3.0;

    // Aplicar factor de Winkler
    if (jaro < 0.7) return jaro;

    let prefix = 0;
    for (let i = 0; i < Math.min(str1.length, str2.length, 4); i++) {
      if (str1[i] === str2[i]) prefix++;
      else break;
    }

    return jaro + 0.1 * prefix * (1 - jaro);
  }

  /**
   * Calcula la similitud de cadenas usando múltiples algoritmos
   * @param {string} str1 - Primer string
   * @param {string} str2 - Segundo string
   * @returns {Object} - Resultado con diferentes métricas de similitud
   */
  static calculateSimilarity(str1, str2) {
    const normalized1 = this.normalizeString(str1);
    const normalized2 = this.normalizeString(str2);

    const levenshtein = this.levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    const levenshteinSimilarity = maxLength === 0 ? 1 : 1 - (levenshtein / maxLength);

    const jaroWinkler = this.jaroWinklerSimilarity(normalized1, normalized2);

    // Similitud de caracteres comunes
    const commonChars = this.getCommonCharacters(normalized1, normalized2);
    const commonSimilarity = commonChars / Math.max(normalized1.length, normalized2.length);

    // Similitud de palabras (para nombres compuestos)
    const words1 = normalized1.split(/\s+/).filter(w => w.length > 0);
    const words2 = normalized2.split(/\s+/).filter(w => w.length > 0);
    const wordSimilarity = this.calculateWordSimilarity(words1, words2);

    return {
      levenshtein: levenshteinSimilarity,
      jaroWinkler: jaroWinkler,
      commonChars: commonSimilarity,
      words: wordSimilarity,
      combined: (levenshteinSimilarity + jaroWinkler + commonSimilarity + wordSimilarity) / 4
    };
  }

  /**
   * Normaliza un string para comparación
   * @param {string} str - String a normalizar
   * @returns {string} - String normalizado
   */
  static normalizeString(str) {
    if (!str || typeof str !== 'string') return '';
    
    return str
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^\w\s]/g, '') // Remover caracteres especiales
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim();
  }

  /**
   * Cuenta caracteres comunes entre dos strings
   * @param {string} str1 - Primer string
   * @param {string} str2 - Segundo string
   * @returns {number} - Número de caracteres comunes
   */
  static getCommonCharacters(str1, str2) {
    const chars1 = str1.split('').reduce((acc, char) => {
      acc[char] = (acc[char] || 0) + 1;
      return acc;
    }, {});

    const chars2 = str2.split('').reduce((acc, char) => {
      acc[char] = (acc[char] || 0) + 1;
      return acc;
    }, {});

    let common = 0;
    for (const char in chars1) {
      if (chars2[char]) {
        common += Math.min(chars1[char], chars2[char]);
      }
    }

    return common;
  }

  /**
   * Calcula similitud entre arrays de palabras
   * @param {Array} words1 - Primer array de palabras
   * @param {Array} words2 - Segundo array de palabras
   * @returns {number} - Similitud de palabras (0-1)
   */
  static calculateWordSimilarity(words1, words2) {
    if (words1.length === 0 && words2.length === 0) return 1;
    if (words1.length === 0 || words2.length === 0) return 0;

    let totalSimilarity = 0;
    let matchedWords = 0;

    for (const word1 of words1) {
      let bestMatch = 0;
      for (const word2 of words2) {
        const similarity = this.jaroWinklerSimilarity(word1, word2);
        bestMatch = Math.max(bestMatch, similarity);
      }
      totalSimilarity += bestMatch;
      if (bestMatch > 0.7) matchedWords++;
    }

    return totalSimilarity / words1.length;
  }
}

// =================================================================
// SISTEMA DE DETECCIÓN DE DUPLICADOS DIFUSA
// =================================================================
class FuzzyDuplicateDetector {
  constructor() {
    this.cache = CacheService.getScriptCache();
    this.lock = LockService.getScriptLock();
  }

  /**
   * Busca posibles duplicados usando coincidencia difusa
   * @param {Object} data - Datos del nuevo registro
   * @returns {Object} - Resultado de la búsqueda de duplicados
   */
  findFuzzyDuplicates(data) {
    try {
      const lockAcquired = this.lock.tryLock(5000);
      if (!lockAcquired) {
        throw new Error('No se pudo adquirir lock para búsqueda difusa');
      }

      const candidates = this.getCandidateRecords(data);
      const fuzzyMatches = this.analyzeFuzzyMatches(data, candidates);

      return {
        hasDuplicates: fuzzyMatches.length > 0,
        matches: fuzzyMatches,
        confidence: this.calculateOverallConfidence(fuzzyMatches)
      };

    } finally {
      try {
        this.lock.releaseLock();
      } catch (e) {
        // Ignorar si ya fue liberado
      }
    }
  }

  /**
   * Obtiene registros candidatos para comparación de almas (duplicados) de forma OPTIMIZADA.
   * @param {Object} data - Datos del nuevo registro
   * @returns {Array} - Array de registros candidatos
   */
  getCandidateRecords(data) {
    const startTime = Date.now();
    console.log('⚡️ Obteniendo candidatos con BÚSQUEDA OPTIMIZADA (TextFinder por lotes)...');
    
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEETS.INGRESOS);
    if (!sheet || sheet.getLastRow() < 2) {
        return [];
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const phoneCol = headers.indexOf('Tel_Normalizado') + 1;
    const keyCol = headers.indexOf('KEY_BUSQUEDA') + 1;

    const targetPhone = String(data.almaTelefono || '').replace(/\D/g, '');
    const targetKey = Utils.createSearchKey(data.almaNombres, data.almaApellidos);
    
    const candidateRows = new Set(); // Usamos un Set para evitar filas duplicadas
    const lastRow = sheet.getLastRow();
    const totalDataRows = lastRow - 1; // Excluyendo header
    const batchSize = 1000; // Tamaño de lote para procesamiento

    // Búsqueda 1: Por número de teléfono exacto (POR LOTES)
    if (phoneCol > 0 && targetPhone && totalDataRows > 0) {
        const totalBatches = Math.ceil(totalDataRows / batchSize);
        console.log(`📞 Búsqueda por teléfono en ${totalBatches} lotes de ${batchSize} filas...`);
        
        for (let batch = 0; batch < totalBatches; batch++) {
            const startRow = 2 + (batch * batchSize); // Empezar desde fila 2 (después del header)
            const batchRows = Math.min(batchSize, totalDataRows - (batch * batchSize));
            
            if (batchRows > 0) {
                const phoneFinder = sheet.getRange(startRow, phoneCol, batchRows, 1)
                    .createTextFinder(targetPhone)
                    .matchEntireCell(true)
                    .findAll();
                phoneFinder.forEach(range => candidateRows.add(range.getRow()));
            }
        }
        console.log(`📞 Búsqueda por teléfono completada: ${candidateRows.size} candidatos encontrados`);
    }

    // Búsqueda 2: Por clave de nombre (POR LOTES)
    if (keyCol > 0 && targetKey && totalDataRows > 0) {
        const totalBatches = Math.ceil(totalDataRows / batchSize);
        console.log(`🔑 Búsqueda por clave en ${totalBatches} lotes de ${batchSize} filas...`);
        
        for (let batch = 0; batch < totalBatches; batch++) {
            const startRow = 2 + (batch * batchSize); // Empezar desde fila 2 (después del header)
            const batchRows = Math.min(batchSize, totalDataRows - (batch * batchSize));
            
            if (batchRows > 0) {
                const keyFinder = sheet.getRange(startRow, keyCol, batchRows, 1)
                    .createTextFinder(targetKey)
                    .matchEntireCell(true)
                    .findAll();
                keyFinder.forEach(range => candidateRows.add(range.getRow()));
            }
        }
        console.log(`🔑 Búsqueda por clave completada: ${candidateRows.size} candidatos totales`);
    }
    
    const uniqueRows = Array.from(candidateRows);
    console.log(`🎯 Búsqueda optimizada encontró ${uniqueRows.length} filas candidatas únicas.`);

    if (uniqueRows.length === 0) {
        const duration = Date.now() - startTime;
        console.log(`⚡️ Búsqueda completada en ${duration}ms. Sin candidatos.`);
        return [];
    }

    // Leer solo las filas candidatas específicas (OPTIMIZACIÓN CRÍTICA)
    const candidates = [];
    
    // Agrupar filas candidatas en lotes para lectura eficiente
    const candidateBatches = [];
    const batchSize = 100; // Leer máximo 100 filas por vez
    
    for (let i = 0; i < uniqueRows.length; i += batchSize) {
      const batch = uniqueRows.slice(i, i + batchSize);
      candidateBatches.push(batch);
    }
    
    console.log(`📊 Leyendo ${uniqueRows.length} filas candidatas en ${candidateBatches.length} lotes...`);
    
    candidateBatches.forEach((batch, batchIndex) => {
      // Leer solo las filas del lote actual
      const minRow = Math.min(...batch);
      const maxRow = Math.max(...batch);
      const batchRange = sheet.getRange(minRow, 1, maxRow - minRow + 1, sheet.getLastColumn());
      const batchValues = batchRange.getValues();
      
      batch.forEach(rowNum => {
        const localRowIndex = rowNum - minRow;
        const rowData = batchValues[localRowIndex];
        const record = {
            id: rowData[headers.indexOf('ID_Alma')],
            nombres: rowData[headers.indexOf('Nombres del Alma')],
            apellidos: rowData[headers.indexOf('Apellidos del Alma')],
            telefono: rowData[headers.indexOf('Teléfono')],
            nombreClave: rowData[headers.indexOf('KEY_BUSQUEDA')]
        };
        record.nombreCompleto = `${record.nombres} ${record.apellidos}`;
        candidates.push(record);
      });
    });

    const duration = Date.now() - startTime;
    console.log(`⚡️ Candidatos obtenidos en ${duration}ms (${candidates.length} registros de ${totalDataRows} filas totales)`);
    return candidates;
  }

  /**
   * Obtiene líderes candidatos para autocompletado
   * @param {string} congregacion - Congregación seleccionada
   * @returns {Array} - Array de líderes candidatos
   */
  getLeaderCandidates(congregacion) {
    const cacheKey = `fuzzy_leaders_${congregacion}_${CONFIG.CACHE.VERSION}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEETS.LIDERES);
    
    if (!sheet || sheet.getLastRow() < 2) {
      return [];
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const cols = this.mapColumns(headers, {
      id: ['ID_Lider', 'ID Líder', 'ID'],
      nombre: ['Nombre_Lider', 'Nombre Líder', 'Nombre'],
      rol: ['Rol', 'Tipo'],
      congregacion: ['Congregación', 'Congregacion']
    });

    const maxCol = Math.max(...Object.values(cols));
    const sheetData = sheet.getRange(2, 1, sheet.getLastRow() - 1, maxCol).getValues();
    const candidates = [];

    sheetData.forEach(row => {
      const id = String(row[cols.id - 1] || '').trim();
      const nombre = String(row[cols.nombre - 1] || '').trim();
      const rol = this.normalizeRole(String(row[cols.rol - 1] || ''));
      const cong = String(row[cols.congregacion - 1] || '').trim();

      if (id && nombre && rol === 'LCF' && cong === congregacion) {
        candidates.push({
          id: id,
          nombre: nombre,
          rol: rol,
          congregacion: cong
        });
      }
    });

    // Cachear por 5 minutos
    this.cache.put(cacheKey, JSON.stringify(candidates), 300);
    return candidates;
  }

  /**
   * Mapea columnas por nombres de encabezados
   * @param {Array} headers - Array de encabezados
   * @param {Object} mapping - Mapeo de campos
   * @returns {Object} - Mapeo de columnas
   */
  mapColumns(headers, mapping) {
    const result = {};
    
    for (const [key, candidates] of Object.entries(mapping)) {
      result[key] = 1;
      
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

  /**
   * Normaliza el rol del líder
   * @param {string} rol - Rol original
   * @returns {string} - Rol normalizado
   */
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

  /**
   * Analiza coincidencias difusas con los candidatos
   * @param {Object} newData - Datos del nuevo registro
   * @param {Array} candidates - Registros candidatos
   * @returns {Array} - Array de coincidencias encontradas
   */
  analyzeFuzzyMatches(newData, candidates) {
    const newName = `${newData.almaNombres} ${newData.almaApellidos}`;
    const newPhone = String(newData.almaTelefono || '').replace(/\D/g, '');
    const matches = [];

    candidates.forEach(candidate => {
      // Comparar nombres
      const nameSimilarity = FuzzyMatcher.calculateSimilarity(
        newName, 
        candidate.nombreCompleto
      );

      // Comparar teléfonos (exacto o similar)
      const phoneSimilarity = this.comparePhones(newPhone, candidate.telefono);

      // Calcular confianza general
      const overallConfidence = this.calculateMatchConfidence(
        nameSimilarity, 
        phoneSimilarity
      );

      // Solo incluir si supera el umbral
      if (overallConfidence > CONFIG.FUZZY_MATCHING.THRESHOLD) {
        matches.push({
          id: candidate.id,
          nombre: candidate.nombreCompleto,
          telefono: candidate.telefono,
          confidence: overallConfidence,
          nameSimilarity: nameSimilarity,
          phoneSimilarity: phoneSimilarity,
          reasons: this.generateMatchReasons(nameSimilarity, phoneSimilarity)
        });
      }
    });

    // Ordenar por confianza descendente
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Compara números de teléfono
   * @param {string} phone1 - Primer teléfono
   * @param {string} phone2 - Segundo teléfono
   * @returns {number} - Similitud de teléfonos (0-1)
   */
  comparePhones(phone1, phone2) {
    if (!phone1 || !phone2) return 0;

    const clean1 = String(phone1).replace(/\D/g, '');
    const clean2 = String(phone2).replace(/\D/g, '');

    if (clean1 === clean2) return 1.0;

    // Comparar últimos 7 dígitos (más comunes en duplicados)
    const last7_1 = clean1.slice(-7);
    const last7_2 = clean2.slice(-7);
    
    if (last7_1 === last7_2) return 0.8;

    // Comparar últimos 4 dígitos
    const last4_1 = clean1.slice(-4);
    const last4_2 = clean2.slice(-4);
    
    if (last4_1 === last4_2) return 0.5;

    return 0;
  }

  /**
   * Calcula la confianza general de una coincidencia
   * @param {Object} nameSimilarity - Similitud de nombres
   * @param {number} phoneSimilarity - Similitud de teléfonos
   * @returns {number} - Confianza general (0-1)
   */
  calculateMatchConfidence(nameSimilarity, phoneSimilarity) {
    const nameWeight = CONFIG.FUZZY_MATCHING.NAME_WEIGHT;
    const phoneWeight = CONFIG.FUZZY_MATCHING.PHONE_WEIGHT;

    const nameScore = nameSimilarity.combined;
    const phoneScore = phoneSimilarity;

    return (nameScore * nameWeight) + (phoneScore * phoneWeight);
  }

  /**
   * Calcula la confianza general de todas las coincidencias
   * @param {Array} matches - Array de coincidencias
   * @returns {number} - Confianza general
   */
  calculateOverallConfidence(matches) {
    if (matches.length === 0) return 0;
    
    const totalConfidence = matches.reduce((sum, match) => sum + match.confidence, 0);
    return totalConfidence / matches.length;
  }

  /**
   * Genera razones para la coincidencia
   * @param {Object} nameSimilarity - Similitud de nombres
   * @param {number} phoneSimilarity - Similitud de teléfonos
   * @returns {Array} - Array de razones
   */
  generateMatchReasons(nameSimilarity, phoneSimilarity) {
    const reasons = [];

    if (nameSimilarity.combined > 0.9) {
      reasons.push('Nombres muy similares');
    } else if (nameSimilarity.combined > 0.7) {
      reasons.push('Nombres similares');
    }

    if (phoneSimilarity === 1.0) {
      reasons.push('Teléfono idéntico');
    } else if (phoneSimilarity > 0.5) {
      reasons.push('Teléfono similar');
    }

    if (nameSimilarity.jaroWinkler > 0.8) {
      reasons.push('Coincidencia de caracteres alta');
    }

    if (nameSimilarity.words > 0.8) {
      reasons.push('Palabras muy similares');
    }

    return reasons;
  }

  /**
   * Invalida la caché de candidatos
   */
  invalidateCache() {
    const cacheKey = `fuzzy_candidates_${CONFIG.CACHE.VERSION}`;
    this.cache.remove(cacheKey);
  }
}

// =================================================================
// CONFIGURACIÓN DE COINCIDENCIA DIFUSA
// =================================================================
// Añadir al objeto CONFIG en Code.gs
const FUZZY_CONFIG = {
  THRESHOLD: 0.75,        // Umbral mínimo de confianza
  NAME_WEIGHT: 0.7,       // Peso del nombre en la confianza
  PHONE_WEIGHT: 0.3,      // Peso del teléfono en la confianza
  ENABLED: true,          // Habilitar coincidencia difusa
  MAX_CANDIDATES: 1000,   // Máximo de candidatos a analizar
  CACHE_TTL: 300          // TTL de caché en segundos
};

// =================================================================
// FUNCIONES PÚBLICAS
// =================================================================

/**
 * Busca duplicados difusos para un registro
 * @param {Object} formData - Datos del formulario
 * @returns {Object} - Resultado de la búsqueda
 */
function findFuzzyDuplicates(formData) {
  return ErrorHandler.wrap('findFuzzyDuplicates', function() {
    const detector = new FuzzyDuplicateDetector();
    return detector.findFuzzyDuplicates(formData);
  })();
}

/**
 * Busca líderes con coincidencia difusa para autocompletado
 * @param {string} congregacion - Congregación seleccionada
 * @param {string} searchTerm - Término de búsqueda
 * @returns {Array} - Array de líderes que coinciden
 */
function findFuzzyLeaders(congregacion, searchTerm) {
  return ErrorHandler.wrap('findFuzzyLeaders', function() {
    const detector = new FuzzyDuplicateDetector();
    const candidates = detector.getLeaderCandidates(congregacion);
    
    if (!searchTerm || searchTerm.trim() === '') {
      return candidates.slice(0, 10); // Limitar a 10 resultados
    }
    
    const normalizedSearch = FuzzyMatcher.normalizeString(searchTerm);
    const matches = [];
    
    candidates.forEach(candidate => {
      const similarity = FuzzyMatcher.calculateSimilarity(
        normalizedSearch, 
        FuzzyMatcher.normalizeString(candidate.nombre)
      );
      
      if (similarity.combined > 0.3) { // Umbral más bajo para autocompletado
        matches.push({
          ...candidate,
          confidence: similarity.combined,
          similarity: similarity
        });
      }
    });
    
    // Ordenar por confianza descendente
    matches.sort((a, b) => b.confidence - a.confidence);
    
    return matches.slice(0, 10); // Limitar a 10 resultados
  })();
}

/**
 * Prueba el sistema de coincidencia difusa
 * @param {string} testName - Nombre de prueba
 * @param {string} testSurname - Apellido de prueba
 * @returns {Object} - Resultado de la prueba
 */
function testFuzzyMatching(testName, testSurname) {
  console.log(`🧪 Probando coincidencia difusa para: ${testName} ${testSurname}`);
  
  const testData = {
    almaNombres: testName,
    almaApellidos: testSurname,
    almaTelefono: '9991234567'
  };

  try {
    const result = findFuzzyDuplicates(testData);
    
    console.log(`📊 Resultados:`);
    console.log(`   • Coincidencias encontradas: ${result.matches.length}`);
    console.log(`   • Confianza general: ${(result.confidence * 100).toFixed(1)}%`);
    
    if (result.matches.length > 0) {
      console.log(`   • Mejores coincidencias:`);
      result.matches.slice(0, 3).forEach((match, index) => {
        console.log(`     ${index + 1}. ${match.nombre} (${(match.confidence * 100).toFixed(1)}%)`);
        console.log(`        Razones: ${match.reasons.join(', ')}`);
      });
    }
    
    return result;
    
  } catch (error) {
    console.error(`❌ Error en prueba: ${error.message}`);
    return { error: error.message };
  }
}
