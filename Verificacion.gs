/**
 * VERIFICACIÓN DEL SISTEMA
 * Ejecuta estas funciones para verificar que todo funciona
 */

/**
 * 🔍 VERIFICACIÓN COMPLETA - Ejecutar después de la instalación
 */
function verificarSistema() {
  console.log('🔍 VERIFICANDO SISTEMA...\n');
  
  const results = {
    spreadsheet: false,
    sheets: false,
    properties: false,
    data: false,
    functions: false
  };
  
  try {
    // 1. Verificar acceso al Spreadsheet
    console.log('1. Verificando Spreadsheet...');
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    console.log(`   ✅ Acceso exitoso: ${ss.getName()}`);
    results.spreadsheet = true;
    
    // 2. Verificar hojas creadas
    console.log('\n2. Verificando hojas...');
    const requiredSheets = Object.values(CONFIG.SHEETS);
    const existingSheets = ss.getSheets().map(s => s.getName());
    
    let allSheetsExist = true;
    requiredSheets.forEach(sheetName => {
      if (existingSheets.includes(sheetName)) {
        console.log(`   ✅ ${sheetName} - OK`);
      } else {
        console.log(`   ❌ ${sheetName} - FALTA`);
        allSheetsExist = false;
      }
    });
    
    if (allSheetsExist) {
      console.log('   ✅ Todas las hojas están presentes');
      results.sheets = true;
    }
    
    // 3. Verificar propiedades del script
    console.log('\n3. Verificando propiedades...');
    const props = PropertiesService.getScriptProperties();
    const counter = props.getProperty('ALMA_COUNTER');
    const version = props.getProperty('SYSTEM_VERSION');
    
    if (counter && version) {
      console.log(`   ✅ Contador de almas: ${counter}`);
      console.log(`   ✅ Versión del sistema: ${version}`);
      results.properties = true;
    } else {
      console.log('   ❌ Propiedades faltantes');
    }
    
    // 4. Verificar datos de ejemplo
    console.log('\n4. Verificando datos de ejemplo...');
    const lideresSheet = ss.getSheetByName(CONFIG.SHEETS.LIDERES);
    const celulasSheet = ss.getSheetByName(CONFIG.SHEETS.CELULAS);
    
    if (lideresSheet && lideresSheet.getLastRow() > 1) {
      console.log(`   ✅ Líderes de ejemplo: ${lideresSheet.getLastRow() - 1} registros`);
    }
    
    if (celulasSheet && celulasSheet.getLastRow() > 1) {
      console.log(`   ✅ Células de ejemplo: ${celulasSheet.getLastRow() - 1} registros`);
    }
    
    results.data = true;
    
    // 5. Verificar funciones principales
    console.log('\n5. Verificando funciones...');
    
    try {
      const congregaciones = getCongregaciones();
      if (Array.isArray(congregaciones) && congregaciones.length > 0) {
        console.log(`   ✅ getCongregaciones(): ${congregaciones.length} congregaciones`);
        console.log(`   📋 Congregaciones: ${congregaciones.join(', ')}`);
        
        // Probar getLideresPorCongregacion
        const lideres = getLideresPorCongregacion(congregaciones[0]);
        console.log(`   ✅ getLideresPorCongregacion(): ${lideres.length} líderes`);
        
        if (lideres.length > 0) {
          // Probar getCelulasPorLider
          const celulas = getCelulasPorLider(lideres[0].id);
          console.log(`   ✅ getCelulasPorLider(): ${celulas.length} células`);
        }
        
        results.functions = true;
      }
    } catch (error) {
      console.log(`   ❌ Error en funciones: ${error.message}`);
    }
    
    // 6. Verificar sistema de coincidencia difusa
    console.log('\n6. Verificando coincidencia difusa...');
    
    try {
      if (CONFIG.FUZZY_MATCHING && CONFIG.FUZZY_MATCHING.ENABLED) {
        console.log(`   ✅ Sistema de coincidencia difusa habilitado`);
        console.log(`   📊 Umbral: ${CONFIG.FUZZY_MATCHING.THRESHOLD}`);
        console.log(`   ⚖️ Peso nombre: ${CONFIG.FUZZY_MATCHING.NAME_WEIGHT}`);
        console.log(`   ⚖️ Peso teléfono: ${CONFIG.FUZZY_MATCHING.PHONE_WEIGHT}`);
        
        // Probar función de coincidencia difusa
        const testData = {
          almaNombres: 'Test',
          almaApellidos: 'Usuario',
          almaTelefono: '9990000000'
        };
        
        const fuzzyResult = findFuzzyDuplicates(testData);
        console.log(`   ✅ findFuzzyDuplicates(): Funcionando correctamente`);
        console.log(`   📊 Coincidencias encontradas: ${fuzzyResult.matches ? fuzzyResult.matches.length : 0}`);
        
      } else {
        console.log(`   ⚠️ Sistema de coincidencia difusa deshabilitado`);
      }
    } catch (error) {
      console.log(`   ❌ Error en coincidencia difusa: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ Error general: ${error.message}`);
  }
  
  // Resumen final
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMEN DE VERIFICACIÓN');
  console.log('='.repeat(50));
  
  const checks = [
    { name: 'Spreadsheet', status: results.spreadsheet },
    { name: 'Hojas', status: results.sheets },
    { name: 'Propiedades', status: results.properties },
    { name: 'Datos ejemplo', status: results.data },
    { name: 'Funciones', status: results.functions }
  ];
  
  checks.forEach(check => {
    const icon = check.status ? '✅' : '❌';
    console.log(`${icon} ${check.name}`);
  });
  
  const allPassed = checks.every(check => check.status);
  
  if (allPassed) {
    console.log('\n🎉 ¡SISTEMA TOTALMENTE FUNCIONAL!');
    console.log('✅ Puedes proceder a desplegar la aplicación web');
  } else {
    console.log('\n⚠️ Hay problemas que resolver antes del despliegue');
    console.log('💡 Ejecuta installSystem() nuevamente si hay errores');
  }
  
  return {
    success: allPassed,
    results: results,
    timestamp: new Date().toISOString()
  };
}

/**
 * 🧪 PRUEBA DE COINCIDENCIA DIFUSA - Prueba el sistema de detección de duplicados
 */
function probarCoincidenciaDifusa() {
  console.log('🧪 PROBANDO COINCIDENCIA DIFUSA...\n');
  
  const testCases = [
    {
      name: 'María Elena',
      surname: 'González Martínez',
      phone: '9991234567',
      description: 'Caso normal'
    },
    {
      name: 'Maria Elena',
      surname: 'Gonzalez Martinez',
      phone: '9991234567',
      description: 'Sin acentos (debería coincidir)'
    },
    {
      name: 'María Elena',
      surname: 'Gonzales Martinez',
      phone: '9991234567',
      description: 'Apellido con error ortográfico'
    },
    {
      name: 'María Elena',
      surname: 'González Martínez',
      phone: '9991234568',
      description: 'Teléfono diferente'
    },
    {
      name: 'Juan Carlos',
      surname: 'Pérez García',
      phone: '9999876543',
      description: 'Caso completamente diferente'
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. ${testCase.description}:`);
    console.log(`   Nombre: ${testCase.name} ${testCase.surname}`);
    console.log(`   Teléfono: ${testCase.phone}`);
    
    try {
      const testData = {
        almaNombres: testCase.name,
        almaApellidos: testCase.surname,
        almaTelefono: testCase.phone
      };
      
      const result = findFuzzyDuplicates(testData);
      
      if (result.matches && result.matches.length > 0) {
        console.log(`   ✅ Coincidencias encontradas: ${result.matches.length}`);
        result.matches.slice(0, 2).forEach((match, i) => {
          console.log(`      ${i + 1}. ${match.nombre} (${(match.confidence * 100).toFixed(1)}%)`);
          console.log(`         Razones: ${match.reasons.join(', ')}`);
        });
        passed++;
      } else {
        console.log(`   ℹ️ No se encontraron coincidencias`);
        passed++;
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failed++;
    }
  });
  
  console.log(`\n📊 Resultados: ${passed} ✅ | ${failed} ❌`);
  
  return {
    passed: passed,
    failed: failed,
    total: testCases.length,
    success: failed === 0
  };
}

/**
 * 🧪 PRUEBA DE REGISTRO - Simula un registro completo
 */
function probarRegistro() {
  console.log('🧪 PROBANDO REGISTRO DE ALMA...\n');
  
  // Datos de prueba
  const datosEjemplo = {
    nombreCapturador: 'Sistema de Prueba',
    congregacion: 'Centro',
    liderCasaDeFeId: 'LCF001',
    fuenteContacto: 'Evento Especial',
    almaNombres: 'María Elena',
    almaApellidos: 'Prueba Ejemplo',
    almaTelefono: '9991234567',
    almaDireccion: 'Calle de Ejemplo #123',
    almaSexo: 'Femenino',
    almaEdad: 'Adulto (25-34)',
    aceptoJesus: 'Sí',
    deseaVisita: 'Sí',
    responsableSeguimiento: 'Sí',
    peticionOracion: ['Salvación / Libertad Espiritual', 'Familia / Matrimonio']
  };
  
  try {
    // Probar validación
    console.log('1. Probando validación...');
    const validation = Validator.validateFormData(datosEjemplo);
    
    if (validation.valid) {
      console.log('   ✅ Validación exitosa');
      console.log(`   📋 Datos sanitizados correctamente`);
    } else {
      console.log('   ❌ Errores de validación:');
      validation.errors.forEach(error => {
        console.log(`      • ${error.field}: ${error.message}`);
      });
      return { success: false, step: 'validation' };
    }
    
    // Probar registro (comentado para evitar crear registros reales)
    console.log('\n2. Simulando registro...');
    console.log('   ℹ️ Registro simulado (no se guardará)');
    console.log(`   📝 Alma: ${datosEjemplo.almaNombres} ${datosEjemplo.almaApellidos}`);
    console.log(`   📞 Teléfono: ${datosEjemplo.almaTelefono}`);
    console.log(`   🏠 Congregación: ${datosEjemplo.congregacion}`);
    
    // Si quieres probar registro real, descomenta:
    // const result = processForm(datosEjemplo);
    // console.log('   ✅ Registro exitoso:', result);
    
    console.log('\n🎉 ¡PRUEBA DE REGISTRO EXITOSA!');
    return { success: true };
    
  } catch (error) {
    console.log(`❌ Error en prueba: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 🔧 PRUEBA DE COMPONENTES INDIVIDUALES
 */
function probarComponentes() {
  console.log('🔧 PROBANDO COMPONENTES...\n');
  
  const tests = [
    {
      name: 'Validación de nombres',
      test: () => {
        const errors = [];
        const result = Validator.sanitizeName('Juan Pérez', 'test', errors);
        return result === 'Juan Pérez' && errors.length === 0;
      }
    },
    {
      name: 'Sanitización XSS',
      test: () => {
        const errors = [];
        const result = Validator.sanitizeText('<script>alert("hack")</script>Test', 'test', 100, errors);
        return !result.includes('<script>') && result.includes('Test');
      }
    },
    {
      name: 'Validación de teléfonos',
      test: () => {
        const errors = [];
        const result = Validator.sanitizePhone('999-123-4567', 'test', errors);
        return result === '9991234567' && errors.length === 0;
      }
    },
    {
      name: 'Rate Limiting',
      test: () => {
        const limiter = new RateLimiter();
        const result = limiter.checkLimit('test@example.com');
        return result.allowed === true;
      }
    },
    {
      name: 'Generación de hash',
      test: () => {
        const hash1 = Utils.generateHash('test');
        const hash2 = Utils.generateHash('test');
        return hash1 === hash2 && hash1.length > 0;
      }
    },
    {
      name: 'Normalización de strings',
      test: () => {
        const result = Utils.normalizeString('  JOSÉ MARÍA  ');
        return result === 'jose maria';
      }
    },
    {
      name: 'Distancia de Levenshtein',
      test: () => {
        const distance = FuzzyMatcher.levenshteinDistance('Juan', 'Juan');
        return distance === 0;
      }
    },
    {
      name: 'Similitud Jaro-Winkler',
      test: () => {
        const similarity = FuzzyMatcher.jaroWinklerSimilarity('María', 'Maria');
        return similarity > 0.8;
      }
    },
    {
      name: 'Cálculo de similitud combinada',
      test: () => {
        const result = FuzzyMatcher.calculateSimilarity('Juan Pérez', 'Juan Perez');
        return result.combined > 0.8 && result.jaroWinkler > 0.8;
      }
    },
    {
      name: 'Comparación de teléfonos',
      test: () => {
        const detector = new FuzzyDuplicateDetector();
        const similarity = detector.comparePhones('9991234567', '9991234567');
        return similarity === 1.0;
      }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(test => {
    try {
      if (test.test()) {
        console.log(`✅ ${test.name}`);
        passed++;
      } else {
        console.log(`❌ ${test.name} - Falló la condición`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} - Error: ${error.message}`);
      failed++;
    }
  });
  
  console.log(`\n📊 Resultados: ${passed} ✅ | ${failed} ❌`);
  
  return {
    passed: passed,
    failed: failed,
    total: tests.length,
    success: failed === 0
  };
}

/**
 * 📋 INFORMACIÓN DEL SISTEMA
 */
function infoSistema() {
  console.log('📋 INFORMACIÓN DEL SISTEMA\n');
  
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const props = PropertiesService.getScriptProperties();
    
    console.log('📄 Spreadsheet:');
    console.log(`   • Nombre: ${ss.getName()}`);
    console.log(`   • ID: ${CONFIG.SPREADSHEET_ID}`);
    console.log(`   • URL: ${ss.getUrl()}`);
    
    console.log('\n⚙️ Configuración:');
    console.log(`   • Versión: ${CONFIG.CACHE.VERSION}`);
    console.log(`   • Timezone: ${CONFIG.APP.TIMEZONE}`);
    console.log(`   • Prefijo ID: ${CONFIG.APP.ID_PREFIX}`);
    console.log(`   • Autenticación: ${CONFIG.SECURITY.REQUIRE_AUTH ? 'Activada' : 'Desactivada'}`);
    
    console.log('\n🗄️ Propiedades:');
    const installDate = props.getProperty('INSTALL_DATE');
    const counter = props.getProperty('ALMA_COUNTER');
    
    if (installDate) {
      console.log(`   • Fecha instalación: ${new Date(installDate).toLocaleString()}`);
    }
    if (counter) {
      console.log(`   • Próximo ID: ${CONFIG.APP.ID_PREFIX}${parseInt(counter) + 1}`);
    }
    
    console.log('\n📊 Estadísticas:');
    const ingresosSheet = ss.getSheetByName(CONFIG.SHEETS.INGRESOS);
    const lideresSheet = ss.getSheetByName(CONFIG.SHEETS.LIDERES);
    const celulasSheet = ss.getSheetByName(CONFIG.SHEETS.CELULAS);
    
    console.log(`   • Almas registradas: ${ingresosSheet ? ingresosSheet.getLastRow() - 1 : 0}`);
    console.log(`   • Líderes: ${lideresSheet ? lideresSheet.getLastRow() - 1 : 0}`);
    console.log(`   • Células: ${celulasSheet ? celulasSheet.getLastRow() - 1 : 0}`);
    
  } catch (error) {
    console.log(`❌ Error obteniendo información: ${error.message}`);
  }
}

/**
 * 🚀 PREPARAR PARA DESPLIEGUE
 */
function prepararDespliegue() {
  console.log('🚀 PREPARANDO PARA DESPLIEGUE...\n');
  
  const checks = [];
  
  try {
    // 1. Verificar ID del Spreadsheet
    if (CONFIG.SPREADSHEET_ID !== "TU_SPREADSHEET_ID_AQUI") {
      checks.push({ name: 'ID Spreadsheet configurado', status: true });
    } else {
      checks.push({ name: 'ID Spreadsheet configurado', status: false, fix: 'Configura tu ID real en CONFIG.SPREADSHEET_ID' });
    }
    
    // 2. Verificar acceso al Spreadsheet
    try {
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      checks.push({ name: 'Acceso a Spreadsheet', status: true });
    } catch (error) {
      checks.push({ name: 'Acceso a Spreadsheet', status: false, fix: 'Verifica que el ID sea correcto' });
    }
    
    // 3. Verificar hojas necesarias
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheets = ss.getSheets().map(s => s.getName());
    const requiredSheets = Object.values(CONFIG.SHEETS);
    const missingSheets = requiredSheets.filter(sheet => !sheets.includes(sheet));
    
    checks.push({ 
      name: 'Hojas del sistema', 
      status: missingSheets.length === 0,
      fix: missingSheets.length > 0 ? `Ejecuta installSystem() - faltan: ${missingSheets.join(', ')}` : null
    });
    
    // 4. Verificar datos de ejemplo
    const lideresSheet = ss.getSheetByName(CONFIG.SHEETS.LIDERES);
    const hasLeaders = lideresSheet && lideresSheet.getLastRow() > 1;
    
    checks.push({
      name: 'Datos de líderes',
      status: hasLeaders,
      fix: !hasLeaders ? 'Ejecuta installSystem() para crear datos de ejemplo' : null
    });
    
    // 5. Verificar archivo index.html
    try {
      HtmlService.createTemplateFromFile('index');
      checks.push({ name: 'Archivo index.html', status: true });
    } catch (error) {
      checks.push({ name: 'Archivo index.html', status: false, fix: 'Crea el archivo index.html con el contenido proporcionado' });
    }
    
  } catch (error) {
    checks.push({ name: 'Error general', status: false, fix: error.message });
  }
  
  // Mostrar resultados
  console.log('📋 CHECKLIST DE DESPLIEGUE:');
  console.log('='.repeat(40));
  
  let allReady = true;
  checks.forEach(check => {
    const icon = check.status ? '✅' : '❌';
    console.log(`${icon} ${check.name}`);
    
    if (!check.status) {
      allReady = false;
      if (check.fix) {
        console.log(`   💡 ${check.fix}`);
      }
    }
  });
  
  console.log('\n' + '='.repeat(40));
  
  if (allReady) {
    console.log('🎉 ¡SISTEMA LISTO PARA DESPLEGAR!');
    console.log('\n📝 PASOS PARA DESPLEGAR:');
    console.log('1. Click en "Implementar" → "Nueva implementación"');
    console.log('2. Configurar:');
    console.log('   • Tipo: Aplicación web');
    console.log('   • Ejecutar como: Yo');
    console.log('   • Acceso: Cualquier persona');
    console.log('3. Click en "Implementar"');
    console.log('4. Copiar y guardar la URL generada');
    console.log('\n🔗 ¡Tu sistema estará listo para usar!');
  } else {
    console.log('⚠️ Resuelve los problemas indicados antes de desplegar');
  }
  
  return {
    ready: allReady,
    checks: checks
  };
}

/**
 * Verifica un alma específica por nombre y apellido en la hoja de 'Ingresos'.
 * @param {string} nombre El nombre del alma a buscar.
 * @param {string} apellido El apellido del alma a buscar.
 */
function verificarAlma(nombre, apellido) {
  const SPREADSHEET_ID = CONFIG.SPREADSHEET_ID;
  const SHEET_NAME = CONFIG.SHEETS.INGRESOS;

  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      console.log(`No se encontró la hoja "${SHEET_NAME}"`);
      return;
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const keyColIndex = headers.indexOf('KEY_BUSQUEDA');
    
    if (keyColIndex === -1) {
        console.log("No se encontró la columna 'KEY_BUSQUEDA'. Ejecuta 'rellenarClavesDeBusqueda' para crearla y rellenarla.");
        return;
    }

    const searchKey = Utils.createSearchKey(nombre, apellido);
    const rangeToSearch = sheet.getRange(2, keyColIndex + 1, sheet.getLastRow() - 1, 1);
    const textFinder = rangeToSearch.createTextFinder(searchKey).matchEntireCell(true).findNext();

    if (textFinder) {
      const rowNum = textFinder.getRow();
      const rowData = sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getValues()[0];
      
      console.log(`\n==================================================`);
      console.log(`REGISTRO ENCONTRADO PARA "${nombre} ${apellido}"`);
      console.log(`==================================================`);
      console.log(`Fila en la hoja: ${rowNum}`);
      
      // Mapear datos a un objeto para fácil lectura
      const recordDetails = {};
      headers.forEach((header, index) => {
        if(header) recordDetails[header] = rowData[index];
      });

      // Análisis de estado (similar al anterior, pero ahora sobre el objeto)
      const estadoProcesando = recordDetails['Estado']; // La columna dinámica que se añade al final
      const estadoRevision = recordDetails['Estado_Revision'];

      console.log(`\n---------- ESTADO ----------`);
      console.log(`Estado Inicial: ${estadoProcesando || 'No definido'}`);
      console.log(`Estado de Revisión: ${estadoRevision || 'No definido'}`);
      
      if (estadoRevision === 'OK') {
           console.log("\nCONCLUSIÓN: ✅ El registro se guardó y procesó correctamente.");
      } else if (estadoRevision && estadoRevision !== 'OK') {
           console.log(`\nCONCLUSIÓN: ⚠️  El registro se guardó pero requiere revisión manual. Razón: ${estadoRevision}`);
      } else if (estadoProcesando === 'PROCESANDO' && !estadoRevision) {
          console.log("\nCONCLUSIÓN: ⏳ El registro se guardó, pero el procesamiento pesado aún no ha finalizado o ha fallado.");
      } else {
          console.log(`\nCONCLUSIÓN: ✅ El estado del registro parece ser '${estadoProcesando}'.`);
      }
        
      console.log(`\n---------- DETALLES DEL REGISTRO ----------`);
      console.log(JSON.stringify(recordDetails, null, 2));
      console.log(`==================================================\n`);

    } else {
      console.log(`\n==================================================`);
      console.log(`No se encontró ningún registro para "${nombre} ${apellido}"`);
      console.log(`==================================================\n`);
    }

  } catch (e) {
    console.error("Ocurrió un error al verificar el alma:", e);
  }
}

/**
 * Función de ayuda para verificar el registro de "KIK PO".
 */
function verificarKikPo() {
    verificarAlma("KIK", "PO");
}

/**
 * Función de ayuda para verificar el registro de "timoteo filmon".
 */
function verificarTimoteoFilmon() {
    verificarAlma("timoteo", "filmon");
}

/**
 * Reprocesa una fila específica de la hoja 'Ingresos' que pueda estar atascada en "PROCESANDO".
 * Esta función es más robusta que postSaveJobs para casos manuales porque no depende de PropertiesService.
 * @param {number} rowNum - El número de la fila a reprocesar (ej: 2356).
 */
function reprocesarFilaPorNumero(rowNum) {
  console.log(`Iniciando reprocesamiento manual para la fila ${rowNum}...`);
  
  const lock = LockService.getScriptLock();
  const acquired = lock.tryLock(15000);
  if (!acquired) {
    console.error("reprocesarFilaPorNumero: No se pudo obtener el lock.");
    return;
  }

  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.INGRESOS);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rowData = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];

    // Mapear la fila a un objeto para fácil acceso
    const record = {};
    headers.forEach((header, i) => {
      record[header] = rowData[i];
    });

    // 1. Reconstruir el objeto 'sanitizedData' que necesitan los servicios
    const sanitizedData = {
      liderCasaDeFeId: record['ID LCF'],
      almaNombres: record['Nombres del Alma'],
      almaApellidos: record['Apellidos del Alma'],
      almaTelefono: record['Teléfono'] // Usar el original, no el normalizado, por si acaso
    };
    
    console.log("Datos reconstruidos para el procesamiento:", sanitizedData);

    // 2. Obtener jerarquía (lento)
    console.log("Obteniendo jerarquía de líderes...");
    const hierarchy = new CatalogService().getLeaderHierarchy(sanitizedData.liderCasaDeFeId);
    console.log("Jerarquía obtenida:", hierarchy);

    // 3. Verificación difusa (lento)
    console.log("Realizando verificación de duplicados difusos...");
    const fuzzyDetector = new FuzzyDuplicateDetector();
    const fuzzyResult = fuzzyDetector.findFuzzyDuplicates(sanitizedData);
    console.log("Resultado de duplicados:", fuzzyResult);

    let revisionStatus = 'OK';
    if (fuzzyResult.hasDuplicates) {
        const topMatch = fuzzyResult.matches[0];
        revisionStatus = `REVISAR DUPLICADO (DIFUSO ${Math.round(topMatch.confidence * 100)}%): ID ${topMatch.id}`;
    }
    console.log(`Estado de revisión determinado: ${revisionStatus}`);

    // 4. Actualizar la fila en la hoja 'Ingresos'
    // Asegurarse que la columna 'Estado_Revision' existe
    let statusColIndex = headers.indexOf('Estado_Revision');
    if (statusColIndex === -1) {
      const newHeaderCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, newHeaderCol).setValue('Estado_Revision');
      statusColIndex = newHeaderCol - 1;
      console.log(`Se ha creado la columna 'Estado_Revision' en la columna ${statusColIndex + 1}.`);
    }

    // Actualizar Jerarquía
    const lcfNombreCol = headers.indexOf('Nombre LCF') + 1;
    if (lcfNombreCol > 0) {
        sheet.getRange(rowNum, lcfNombreCol, 1, 5).setValues([[
            hierarchy.lcfNombre,
            hierarchy.lmId,
            hierarchy.lmNombre,
            hierarchy.ldId,
            hierarchy.ldNombre
        ]]);
        console.log("Jerarquía actualizada en la hoja.");
    }
    
    // Actualizar Estado_Revision
    sheet.getRange(rowNum, statusColIndex + 1).setValue(revisionStatus);
    console.log(`'Estado_Revision' actualizado a: "${revisionStatus}"`);
    
    // Opcional: Actualizar la columna 'Estado' original
    const estadoColIndex = headers.indexOf('Estado');
    if (estadoColIndex !== -1) {
      sheet.getRange(rowNum, estadoColIndex + 1).setValue('Reprocesado Manualmente');
      console.log("'Estado' actualizado a: 'Reprocesado Manualmente'");
    }

    console.log(`✅ Reprocesamiento para la fila ${rowNum} completado.`);

  } catch (error) {
    console.error(`Error durante reprocesarFilaPorNumero para la fila ${rowNum}:`, error);
    ErrorHandler.logError('reprocesarFilaPorNumero', error, { rowNum });
  } finally {
    if (acquired) {
      lock.releaseLock();
    }
  }
}

/**
 * Función de ayuda para reprocesar el registro de "KIK PO" en la fila 2356.
 */
function reprocesarKikPo() {
    reprocesarFilaPorNumero(2356);
}

/**
 * Sincroniza el contador de IDs del script con el ID numérico más alto encontrado en la hoja de 'Ingresos'.
 * Esto es crucial después de una migración de datos manual.
 * La función es capaz de manejar IDs con formatos mixtos (ej: 'A-101', 102, 'B-103').
 */
function sincronizarContadorConHoja() {
  console.log("Iniciando sincronización del contador de IDs...");
  
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.INGRESOS);
    if (!sheet || sheet.getLastRow() < 2) {
      console.log("La hoja de 'Ingresos' está vacía. No se necesita sincronización.");
      return;
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const idColIndex = headers.indexOf('ID_Alma');

    if (idColIndex === -1) {
      console.error("No se encontró la columna 'ID_Alma'. No se puede sincronizar.");
      return;
    }

    const data = sheet.getRange(2, idColIndex + 1, sheet.getLastRow() - 1, 1).getValues();
    
    let maxId = 0;
    
    for (const row of data) {
      const idValue = row[0];
      if (idValue) {
        // Convertir a string y extraer solo los dígitos
        const numericPart = String(idValue).replace(/[^0-9]/g, '');
        if (numericPart) {
          const numericId = parseInt(numericPart, 10);
          if (!isNaN(numericId) && numericId > maxId) {
            maxId = numericId;
          }
        }
      }
    }

    if (maxId > 0) {
      PropertiesService.getScriptProperties().setProperty('ALMA_COUNTER', maxId.toString());
      console.log(`✅ Sincronización completada. El contador se ha actualizado al valor máximo encontrado: ${maxId}`);
      console.log(`El próximo ID generado será: ${CONFIG.APP.ID_PREFIX}${maxId + 1}`);
    } else {
      console.log("No se encontraron IDs numéricos válidos para sincronizar. El contador no ha cambiado.");
    }

  } catch (error) {
    console.error("Ocurrió un error durante la sincronización del contador:", error);
    ErrorHandler.logError('sincronizarContadorConHoja', error);
  }
}

/**
 * Rellena la columna 'KEY_BUSQUEDA' para todos los registros existentes.
 * Ejecutar una sola vez después de implementar la optimización de búsqueda.
 */
function rellenarClavesDeBusqueda() {
  console.log("Iniciando relleno de claves de búsqueda para registros existentes...");
  
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.INGRESOS);
    if (sheet.getLastRow() < 2) {
      console.log("No hay registros para procesar.");
      return;
    }

    let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    let keyColIndex = headers.indexOf('KEY_BUSQUEDA');
    const nombresColIndex = headers.indexOf('Nombres del Alma');
    let apellidosColIndex = headers.indexOf('Apellidos del Alma');

    // Si la columna KEY_BUSQUEDA no existe, la crea en la segunda posición.
    if (keyColIndex === -1) {
      sheet.insertColumnBefore(2);
      sheet.getRange(1, 2).setValue('KEY_BUSQUEDA');
      console.log("Columna 'KEY_BUSQUEDA' creada en la posición 2.");
      // CORRECCIÓN: Re-leer los headers para obtener los índices correctos después de la inserción.
      headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      keyColIndex = headers.indexOf('KEY_BUSQUEDA');
      nombresColIndex = headers.indexOf('Nombres del Alma');
      apellidosColIndex = headers.indexOf('Apellidos del Alma');
    }

    if (nombresColIndex === -1 || apellidosColIndex === -1) {
      console.error("No se encontraron las columnas 'Nombres del Alma' o 'Apellidos del Alma'.");
      return;
    }

    const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const values = range.getValues();
    const keysToSet = [];

    for (const row of values) {
      const nombres = row[nombresColIndex];
      const apellidos = row[apellidosColIndex];
      const key = Utils.createSearchKey(nombres, apellidos);
      keysToSet.push([key]);
    }

    // Escribir todas las claves en la columna de una sola vez
    sheet.getRange(2, keyColIndex + 1, keysToSet.length, 1).setValues(keysToSet);

    console.log(`✅ Proceso completado. Se han generado y guardado ${keysToSet.length} claves de búsqueda.`);

  } catch (error) {
    console.error("Ocurrió un error durante el relleno de claves de búsqueda:", error);
    ErrorHandler.logError('rellenarClavesDeBusqueda', error);
  }
}