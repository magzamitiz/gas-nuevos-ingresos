/**
 * SISTEMA DE REGISTRO DE ALMAS v2.0
 * Módulo de Procesamiento de Formularios (Fast-Path y Post-Save)
 * @version 2.1.0
 */

// =================================================================
// FAST-PATH: PROCESO DE GUARDADO RÁPIDO (< 2 SEGUNDOS)
// =================================================================

/**
 * Procesa el envío del formulario de manera rápida y asíncrona.
 * @param {object} formData - Los datos del formulario enviados desde el cliente.
 * @returns {object} - Un objeto con el resultado de la operación.
 */
function processForm_fastPath(formData) {
  const lock = LockService.getScriptLock();
  const acquired = lock.tryLock(5000); // Espera 5 segundos máximo

  if (!acquired) {
    console.error("processForm_fastPath: No se pudo obtener el lock.");
    return { status: 'error', code: 503, message: 'El sistema está ocupado. Intenta de nuevo.' };
  }

  try {
    // 1. Validar datos (rápido)
    console.time('validacion');
    const validation = Validator.validateFormData(formData);
    if (!validation.valid) {
      console.timeEnd('validacion');
      throw new ValidationError('Datos inválidos: ' + validation.errors.map(e => e.message).join(', '));
    }
    const sanitizedData = validation.sanitized;
    console.timeEnd('validacion');

    // 2. DETECCIÓN SÍNCRONA DE DUPLICADOS (antes de guardar)
    console.time('checkDuplicate');
    const dedupKey = DedupIndexService.generateKey(sanitizedData);
    // OPTIMIZACIÓN: Usar búsqueda puntual en lugar de cargar todo el índice
    const isExactDuplicate = dedupKey ? DedupIndexService.checkSingleKey(dedupKey) : false;
    console.timeEnd('checkDuplicate');
    
    // 3. Si hay duplicado exacto, rechazar inmediatamente
    if (isExactDuplicate) {
      console.timeEnd('processForm_v3_total');
      return {
        status: 'duplicate',
        message: 'Ya existe un registro con estos datos exactos (nombre y teléfono)',
        duplicateType: 'exact'
      };
    }
    
    // 4. Verificación difusa SÍNCRONA (antes de guardar)
    console.time('fuzzySearch');
    const fuzzyDetector = new FuzzyDuplicateDetector();
    const fuzzyResult = fuzzyDetector.findFuzzyDuplicates(sanitizedData);
    console.timeEnd('fuzzySearch');
    
    // 5. Si hay duplicado difuso con alta confianza, rechazar
    if (fuzzyResult.hasDuplicates && fuzzyResult.matches.length > 0) {
      const topMatch = fuzzyResult.matches[0];
      if (topMatch.confidence > 0.8) { // Umbral alto para rechazo automático
        const confidencePercent = Math.round(topMatch.confidence * 100);
        console.timeEnd('processForm_v3_total');
        return {
          status: 'duplicate',
          message: `Posible duplicado detectado (${confidencePercent}% de similitud). Por favor verifica los datos.`,
          duplicateType: 'fuzzy',
          confidence: topMatch.confidence,
          matchId: topMatch.id
        };
      }
    }
    
    // 6. Preparar y guardar registro (solo si NO es duplicado)
    console.time('saveToSheet');
    const registrationService = new RegistrationService();
    const newId = registrationService.generateUniqueId();
    const searchKey = Utils.createSearchKey(
      sanitizedData.almaNombres,
      sanitizedData.almaApellidos
    );
    
    // Obtener jerarquía de líderes síncronamente
    const catalogService = new CatalogService();
    const hierarchy = catalogService.getLeaderHierarchy(sanitizedData.liderCasaDeFeId);
    
    const record = registrationService.prepareRecord(newId, sanitizedData, hierarchy, {
      initialState: 'OK',
      initialRevision: fuzzyResult.hasDuplicates ? 'REVISAR DUPLICADO DIFUSO' : 'OK',
      placeholderValue: '',
      searchKey
    });

    const newRowNum = fastAppend(record);
    
    // 7. Actualizar índice de duplicados
    if (dedupKey) {
      DedupIndexService.appendToIndexSheet(dedupKey, newRowNum);
    }
    console.timeEnd('saveToSheet');

    // 8. Responder al usuario con resultado inmediato
    console.timeEnd('processForm_v3_total');
    return {
      status: 'success',
      id: newId,
      message: 'Registro guardado exitosamente',
      fuzzyWarnings: fuzzyResult.hasDuplicates ? fuzzyResult.matches : null
    };

  } catch (error) {
    console.timeEnd('processForm_v3_total');
    ErrorHandler.logError('processForm_fastPath', error, { formData });
    // Devolvemos el error de una forma que el frontend pueda interpretar
    return { status: 'error', message: error.message, code: error.code || 500 };
  } finally {
    if (acquired) {
      lock.releaseLock();
    }
  }
}

// =================================================================
// POST-SAVE: TAREAS PESADAS ASÍNCRONAS
// =================================================================

function schedulePostSaveJobs(rowNum, sanitizedData) {
  const scriptProperties = PropertiesService.getScriptProperties();

  // OPTIMIZACIÓN: Eliminar el trigger anterior directamente por su ID.
  const oldTriggerId = scriptProperties.getProperty('postSaveTriggerId');
  if (oldTriggerId) {
    try {
      const allTriggers = ScriptApp.getProjectTriggers();
      for (const trigger of allTriggers) {
        if (trigger.getUniqueId() === oldTriggerId) {
          ScriptApp.deleteTrigger(trigger);
          break; // Salimos del bucle una vez encontrado y borrado.
        }
      }
    } catch (e) {
      console.warn(`No se pudo eliminar el trigger anterior (ID: ${oldTriggerId}). Puede que ya no exista. Error: ${e.message}`);
    }
  }

  scriptProperties.setProperty('lastPostSaveContext', JSON.stringify({
    rowNum: rowNum,
    sanitizedData: sanitizedData,
    timestamp: Date.now()
  }));

  const newTrigger = ScriptApp.newTrigger('postSaveJobs')
    .timeBased()
    .after(60 * 1000) // 1 minuto
    .create();
    
  // Guardamos el ID del nuevo trigger para poder borrarlo eficientemente la próxima vez.
  scriptProperties.setProperty('postSaveTriggerId', newTrigger.getUniqueId());
}

function postSaveJobs() {
  const lock = LockService.getScriptLock();
  const acquired = lock.tryLock(15000);
  if (!acquired) {
    console.error("postSaveJobs: No se pudo obtener el lock.");
    return;
  }

  try {
    const contextJSON = PropertiesService.getScriptProperties().getProperty('lastPostSaveContext');
    if (!contextJSON) return;

    const context = JSON.parse(contextJSON);
    const { rowNum, sanitizedData } = context;

    console.log('Ejecutando post-save para la fila ' + rowNum + '...');

    // --- TAREA 1: Generar clave y actualizar índice ---
    const key = DedupIndexService.generateKey(sanitizedData);
    DedupIndexService.appendToIndexSheet(key, rowNum);
    
    // --- TAREA 2: Obtener jerarquía (lento) ---
    const hierarchy = new CatalogService().getLeaderHierarchy(sanitizedData.liderCasaDeFeId);

    // --- TAREA 3: Verificación difusa (lento) ---
    const fuzzyDetector = new FuzzyDuplicateDetector();
    const fuzzyResult = fuzzyDetector.findFuzzyDuplicates(sanitizedData);

    let revisionStatus = 'OK';
    if (fuzzyResult.hasDuplicates) {
        const topMatch = fuzzyResult.matches[0];
        revisionStatus = `REVISAR DUPLICADO (DIFUSO ${Math.round(topMatch.confidence * 100)}%): ID ${topMatch.id}`;
    }

    // --- TAREA 4: Actualizar la fila en la hoja 'Ingresos' ---
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.INGRESOS);
    const range = sheet.getRange(rowNum, 6, 1, 6); // Columnas: Nombre LCF(6) a Nombre LD(10) + Estado_Revision(26)
    
    // Los índices en el array que devuelve `prepareRecord` son:
    // 5: Nombre LCF, 6: ID LM, 7: Nombre LM, 8: ID LD, 9: Nombre LD
    // El 26 es el que acabamos de añadir. Necesitamos encontrar la columna correcta.
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    let statusCol = headers.indexOf('Estado_Revision') + 1;

    // Si la columna no existe, la crea
    if (statusCol === 0) {
      const newHeaderCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, newHeaderCol).setValue('Estado_Revision');
      statusCol = newHeaderCol;
      console.log("Se ha creado la columna 'Estado_Revision' en la columna " + statusCol + '.');
    }
    
    if (statusCol > 0) {
      sheet.getRange(rowNum, statusCol).setValue(revisionStatus);
    }
    
    // CORRECCIÓN: Buscar columnas por nombre en lugar de usar índices fijos.
    const lcfNombreCol = headers.indexOf('Nombre LCF') + 1;
    if (lcfNombreCol > 0) {
        sheet.getRange(rowNum, lcfNombreCol, 1, 5).setValues([[
            hierarchy.lcfNombre,
            hierarchy.lmId,
            hierarchy.lmNombre,
            hierarchy.ldId,
            hierarchy.ldNombre
        ]]);
    } else {
        console.error("No se encontró la columna 'Nombre LCF'. No se pudo actualizar la jerarquía.");
        ErrorHandler.logError('postSaveJobs', new Error("Columna 'Nombre LCF' no encontrada."), { rowNum });
    }

    // --- TAREA 5: Limpiar propiedad ---
    PropertiesService.getScriptProperties().deleteProperty('lastPostSaveContext');
    console.log('Post-save para la fila ' + rowNum + ' completado.');

  } catch (error) {
    console.error("Error durante postSaveJobs:", error);
  } finally {
    if (acquired) {
      lock.releaseLock();
    }
  }
}

function processForm_v3(formData) {
  console.log('=== INICIO processForm_v3 ===', new Date().toISOString());
  console.time('processForm_v3_total');
  console.log('⚡ processForm_v3 redirigido a fast path');
  return processForm_fastPath(formData);
}
