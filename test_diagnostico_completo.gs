/**
 * TEST DE DIAGNÓSTICO COMPLETO v2.0
 * Prueba todo el flujo desde formulario hasta escritura en Sheets
 * @version 2.0.0
 */

/**
 * Ejecuta el test de diagnóstico completo
 * Prueba todo el flujo desde el envío del formulario hasta la escritura en Sheets
 */
function ejecutarDiagnosticoCompleto() {
  console.log('🚀 === INICIANDO DIAGNÓSTICO COMPLETO v2.0 ===');
  console.log('📅 Timestamp:', new Date().toISOString());
  
  const resultados = {
    inicio: Date.now(),
    tests: {},
    errores: [],
    resumen: {}
  };
  
  try {
    // Test 1: Validación de configuración
    console.log('\n📋 === TEST 1: CONFIGURACIÓN DEL SISTEMA ===');
    resultados.tests.configuracion = testearConfiguracion();
    
    // Test 2: Servicios de datos
    console.log('\n📊 === TEST 2: SERVICIOS DE DATOS ===');
    resultados.tests.servicios = testearServiciosDatos();
    
    // Test 3: Flujo completo de formulario
    console.log('\n📝 === TEST 3: FLUJO COMPLETO DE FORMULARIO ===');
    resultados.tests.flujoCompleto = testearFlujoCompleto();
    
    // Test 4: Optimizaciones de rendimiento
    console.log('\n⚡ === TEST 4: OPTIMIZACIONES DE RENDIMIENTO ===');
    resultados.tests.rendimiento = testearRendimiento();
    
    // Test 5: Sistema de cola y dispatcher
    console.log('\n🔄 === TEST 5: SISTEMA DE COLA Y DISPATCHER ===');
    resultados.tests.cola = testearSistemaCola();
    
    // Test 6: Verificación final en Sheets
    console.log('\n📋 === TEST 6: VERIFICACIÓN EN SHEETS ===');
    resultados.tests.verificacionSheets = testearVerificacionSheets();
    
    // Generar resumen
    resultados.fin = Date.now();
    resultados.resumen = generarResumen(resultados);
    
    // Mostrar resultados finales
    mostrarResultadosFinales(resultados);
    
    return resultados;
    
  } catch (error) {
    console.error('❌ Error crítico en diagnóstico completo:', error);
    resultados.errores.push({
      test: 'DIAGNOSTICO_COMPLETO',
      error: error.message,
      stack: error.stack
    });
    
    mostrarResultadosFinales(resultados);
    return resultados;
  }
}

/**
 * Test 1: Validación de configuración del sistema
 */
function testearConfiguracion() {
  const inicio = Date.now();
  const resultados = { exitoso: true, detalles: {}, errores: [] };
  
  try {
    console.log('🔍 Verificando configuración...');
    
    // Verificar CONFIG
    if (typeof CONFIG === 'undefined') {
      throw new Error('CONFIG no está definido');
    }
    
    resultados.detalles.config = {
      spreadsheetId: CONFIG.SPREADSHEET_ID ? '✅ Definido' : '❌ Faltante',
      sheets: CONFIG.SHEETS ? '✅ Definido' : '❌ Faltante',
      cache: CONFIG.CACHE ? '✅ Definido' : '❌ Faltante'
    };
    
    // Verificar servicios avanzados
    try {
      const testSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      resultados.detalles.serviciosAvanzados = '✅ Sheets API disponible';
    } catch (error) {
      resultados.detalles.serviciosAvanzados = '❌ Sheets API no disponible: ' + error.message;
      resultados.exitoso = false;
    }
    
    // Verificar hojas requeridas
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const hojasRequeridas = ['Ingresos', 'Directorio de Líderes', 'Directorio de Células'];
    
    resultados.detalles.hojas = {};
    hojasRequeridas.forEach(hoja => {
      try {
        const sheet = ss.getSheetByName(hoja);
        resultados.detalles.hojas[hoja] = sheet ? '✅ Existe' : '❌ No encontrada';
      } catch (error) {
        resultados.detalles.hojas[hoja] = '❌ Error: ' + error.message;
        resultados.exitoso = false;
      }
    });
    
    const duracion = Date.now() - inicio;
    resultados.duracion = duracion;
    console.log(`✅ Configuración verificada en ${duracion}ms`);
    
    return resultados;
    
  } catch (error) {
    resultados.exitoso = false;
    resultados.errores.push(error.message);
    console.error('❌ Error en configuración:', error);
    return resultados;
  }
}

/**
 * Test 2: Servicios de datos
 */
function testearServiciosDatos() {
  const inicio = Date.now();
  const resultados = { exitoso: true, detalles: {}, errores: [] };
  
  try {
    console.log('🔍 Probando servicios de datos...');
    
    // Test CatalogService
    try {
      const catalogService = new CatalogService();
      const congregaciones = catalogService.getCongregaciones();
      resultados.detalles.catalogService = {
        status: '✅ Funcionando',
        congregaciones: congregaciones.length
      };
    } catch (error) {
      resultados.detalles.catalogService = {
        status: '❌ Error: ' + error.message
      };
      resultados.exitoso = false;
    }
    
    // Test DeduplicationService
    try {
      const dedupService = new DeduplicationService();
      resultados.detalles.deduplicationService = '✅ Inicializado correctamente';
    } catch (error) {
      resultados.detalles.deduplicationService = '❌ Error: ' + error.message;
      resultados.exitoso = false;
    }
    
    // Test FuzzyDuplicateDetector
    try {
      const fuzzyDetector = new FuzzyDuplicateDetector();
      resultados.detalles.fuzzyDetector = '✅ Inicializado correctamente';
    } catch (error) {
      resultados.detalles.fuzzyDetector = '❌ Error: ' + error.message;
      resultados.exitoso = false;
    }
    
    const duracion = Date.now() - inicio;
    resultados.duracion = duracion;
    console.log(`✅ Servicios de datos probados en ${duracion}ms`);
    
    return resultados;
    
  } catch (error) {
    resultados.exitoso = false;
    resultados.errores.push(error.message);
    console.error('❌ Error en servicios de datos:', error);
    return resultados;
  }
}

/**
 * Test 3: Flujo completo de formulario
 */
function testearFlujoCompleto() {
  const inicio = Date.now();
  const resultados = { exitoso: true, detalles: {}, errores: [] };
  
  try {
    console.log('🔍 Probando flujo completo de formulario...');
    
    // Crear datos de prueba
    const datosPrueba = {
      nombreCapturador: 'Test Diagnóstico',
      congregacion: 'Test Congregación',
      liderCasaDeFeId: 'TEST_LCF_001',
      fuenteContacto: 'Servicio Congregacional',
      celulaId: 'TEST_CEL_001',
      celulaNombre: 'Test Célula',
      almaNombres: 'TestNombre',
      almaApellidos: 'TestApellido',
      almaTelefono: '1234567890',
      almaDireccion: 'Test Dirección',
      almaSexo: 'Masculino',
      almaEdad: 'Adulto (25-34)',
      aceptoJesus: 'Sí',
      deseaVisita: 'Sí',
      peticionOracion: 'Test petición',
      responsableSeguimiento: 'Sí'
    };
    
    console.log('📝 Datos de prueba creados:', datosPrueba);
    
    // Test processForm_v3 (nueva arquitectura)
    try {
      const inicioV3 = Date.now();
      const resultadoV3 = processForm_v3(datosPrueba);
      const duracionV3 = Date.now() - inicioV3;
      
      resultados.detalles.processForm_v3 = {
        status: '✅ Ejecutado',
        duracion: duracionV3,
        resultado: resultadoV3
      };
      
      console.log(`✅ processForm_v3 ejecutado en ${duracionV3}ms`);
      
    } catch (error) {
      resultados.detalles.processForm_v3 = {
        status: '❌ Error: ' + error.message
      };
      resultados.exitoso = false;
      console.error('❌ Error en processForm_v3:', error);
    }
    
    // Test processForm (sistema legacy como respaldo)
    try {
      const inicioLegacy = Date.now();
      const resultadoLegacy = processForm(datosPrueba);
      const duracionLegacy = Date.now() - inicioLegacy;
      
      resultados.detalles.processForm = {
        status: '✅ Ejecutado',
        duracion: duracionLegacy,
        resultado: resultadoLegacy
      };
      
      console.log(`✅ processForm (legacy) ejecutado en ${duracionLegacy}ms`);
      
    } catch (error) {
      resultados.detalles.processForm = {
        status: '❌ Error: ' + error.message
      };
      console.warn('⚠️ Error en processForm (legacy):', error);
    }
    
    const duracion = Date.now() - inicio;
    resultados.duracion = duracion;
    console.log(`✅ Flujo completo probado en ${duracion}ms`);
    
    return resultados;
    
  } catch (error) {
    resultados.exitoso = false;
    resultados.errores.push(error.message);
    console.error('❌ Error en flujo completo:', error);
    return resultados;
  }
}

/**
 * Test 4: Optimizaciones de rendimiento
 */
function testearRendimiento() {
  const inicio = Date.now();
  const resultados = { exitoso: true, detalles: {}, errores: [] };
  
  try {
    console.log('🔍 Probando optimizaciones de rendimiento...');
    
    // Test fastAppend
    try {
      const inicioFastAppend = Date.now();
      const recordPrueba = [
        'TEST_ID_' + Date.now(),
        new Date().toISOString(),
        'Test FastAppend',
        'Test Congregación',
        'TEST_LCF',
        'Test LCF',
        'TEST_LM',
        'Test LM',
        'TEST_LD',
        'Test LD',
        'Servicio Congregacional',
        'TEST_CEL',
        'Test Célula',
        'TestNombre',
        'TestApellido',
        '1234567890',
        'Test Dirección',
        'Masculino',
        'Adulto',
        'Sí',
        'Sí',
        'Test petición',
        'Sí',
        '1234567890',
        'testnombre_testapellido',
        'OK',
        '',
        'OK',
        'testnombre_testapellido_1234567890'
      ];
      
      const rowNumber = fastAppend(recordPrueba);
      const duracionFastAppend = Date.now() - inicioFastAppend;
      
      resultados.detalles.fastAppend = {
        status: '✅ Ejecutado',
        duracion: duracionFastAppend,
        rowNumber: rowNumber
      };
      
      console.log(`✅ fastAppend ejecutado en ${duracionFastAppend}ms (fila ${rowNumber})`);
      
    } catch (error) {
      resultados.detalles.fastAppend = {
        status: '❌ Error: ' + error.message
      };
      resultados.exitoso = false;
      console.error('❌ Error en fastAppend:', error);
    }
    
    // Test FuzzyMatching optimizado
    try {
      const fuzzyDetector = new FuzzyDuplicateDetector();
      const datosPrueba = {
        almaNombres: 'TestNombre',
        almaApellidos: 'TestApellido',
        almaTelefono: '1234567890'
      };
      
      const inicioFuzzy = Date.now();
      const resultadoFuzzy = fuzzyDetector.getCandidateRecords(datosPrueba);
      const duracionFuzzy = Date.now() - inicioFuzzy;
      
      resultados.detalles.fuzzyMatching = {
        status: '✅ Ejecutado',
        duracion: duracionFuzzy,
        candidatos: resultadoFuzzy.length
      };
      
      console.log(`✅ FuzzyMatching optimizado ejecutado en ${duracionFuzzy}ms (${resultadoFuzzy.length} candidatos)`);
      
    } catch (error) {
      resultados.detalles.fuzzyMatching = {
        status: '❌ Error: ' + error.message
      };
      resultados.exitoso = false;
      console.error('❌ Error en FuzzyMatching:', error);
    }
    
    // Test Index_Dedup (verificar que la corrección de Blob funciona)
    try {
      const inicioIndex = Date.now();
      const indexSet = DedupIndexService.getIndexKeySet();
      const duracionIndex = Date.now() - inicioIndex;
      
      resultados.detalles.indexDedup = {
        status: '✅ Ejecutado',
        duracion: duracionIndex,
        size: indexSet.size
      };
      
      console.log(`✅ Index_Dedup ejecutado en ${duracionIndex}ms (${indexSet.size} elementos)`);
      
    } catch (error) {
      resultados.detalles.indexDedup = {
        status: '❌ Error: ' + error.message
      };
      resultados.exitoso = false;
      console.error('❌ Error en Index_Dedup:', error);
    }
    
    const duracion = Date.now() - inicio;
    resultados.duracion = duracion;
    console.log(`✅ Optimizaciones de rendimiento probadas en ${duracion}ms`);
    
    return resultados;
    
  } catch (error) {
    resultados.exitoso = false;
    resultados.errores.push(error.message);
    console.error('❌ Error en optimizaciones de rendimiento:', error);
    return resultados;
  }
}

/**
 * Test 5: Sistema de cola y dispatcher
 */
function testearSistemaCola() {
  const inicio = Date.now();
  const resultados = { exitoso: true, detalles: {}, errores: [] };
  
  try {
    console.log('🔍 Probando sistema de cola y dispatcher...');
    
    // Test FastPathCore
    try {
      const datosPrueba = {
        almaNombres: 'TestCola',
        almaApellidos: 'TestCola',
        almaTelefono: '9876543210',
        liderCasaDeFeId: 'TEST_LCF_COLA'
      };
      
      const inicioFastPath = Date.now();
      const resultadoFastPath = FastPathCore.normalizePayload(datosPrueba);
      const duracionFastPath = Date.now() - inicioFastPath;
      
      resultados.detalles.fastPathCore = {
        status: '✅ Ejecutado',
        duracion: duracionFastPath,
        payload: resultadoFastPath
      };
      
      console.log(`✅ FastPathCore ejecutado en ${duracionFastPath}ms`);
      
    } catch (error) {
      resultados.detalles.fastPathCore = {
        status: '❌ Error: ' + error.message
      };
      resultados.exitoso = false;
      console.error('❌ Error en FastPathCore:', error);
    }
    
    // Test dispatcher_v3
    try {
      const inicioDispatcher = Date.now();
      dispatcher_v3();
      const duracionDispatcher = Date.now() - inicioDispatcher;
      
      resultados.detalles.dispatcher = {
        status: '✅ Ejecutado',
        duracion: duracionDispatcher
      };
      
      console.log(`✅ dispatcher_v3 ejecutado en ${duracionDispatcher}ms`);
      
    } catch (error) {
      resultados.detalles.dispatcher = {
        status: '❌ Error: ' + error.message
      };
      resultados.exitoso = false;
      console.error('❌ Error en dispatcher_v3:', error);
    }
    
    // Test JobDispatcher
    try {
      const inicioJobDispatcher = Date.now();
      const queueStatus = getQueueStatus();
      const duracionJobDispatcher = Date.now() - inicioJobDispatcher;
      
      resultados.detalles.jobDispatcher = {
        status: '✅ Ejecutado',
        duracion: duracionJobDispatcher,
        queueStatus: queueStatus
      };
      
      console.log(`✅ JobDispatcher ejecutado en ${duracionJobDispatcher}ms`);
      
    } catch (error) {
      resultados.detalles.jobDispatcher = {
        status: '❌ Error: ' + error.message
      };
      resultados.exitoso = false;
      console.error('❌ Error en JobDispatcher:', error);
    }
    
    const duracion = Date.now() - inicio;
    resultados.duracion = duracion;
    console.log(`✅ Sistema de cola y dispatcher probado en ${duracion}ms`);
    
    return resultados;
    
  } catch (error) {
    resultados.exitoso = false;
    resultados.errores.push(error.message);
    console.error('❌ Error en sistema de cola:', error);
    return resultados;
  }
}

/**
 * Test 6: Verificación en Sheets
 */
function testearVerificacionSheets() {
  const inicio = Date.now();
  const resultados = { exitoso: true, detalles: {}, errores: [] };
  
  try {
    console.log('🔍 Verificando datos en Sheets...');
    
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEETS.INGRESOS);
    
    if (!sheet) {
      throw new Error('Hoja de Ingresos no encontrada');
    }
    
    // Verificar estructura de la hoja
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const headersEsperados = [
      'ID_Alma', 'Timestamp', 'Nombre del Capturador', 'Congregación', 'ID LCF',
      'Nombre LCF', 'ID LM', 'Nombre LM', 'ID LD', 'Nombre LD',
      'Fuente del Contacto', 'ID Célula', 'Nombre Célula',
      'Nombres del Alma', 'Apellidos del Alma', 'Teléfono', 'Dirección',
      'Sexo', 'Rango de Edad', 'Aceptó a Jesús', '¿Desea Visita?',
      'Petición de Oración', '¿Responsable de Seguimiento?',
      'Tel_Normalizado', 'NombreClave_Normalizado', 'Estado',
      '#REF!', 'Estado_Revision', 'KEY_BUSQUEDA'
    ];
    
    resultados.detalles.estructura = {
      headersEncontrados: headers.length,
      headersEsperados: headersEsperados.length,
      coincidencia: headers.length === headersEsperados.length ? '✅ Correcta' : '⚠️ Diferente'
    };
    
    // Verificar datos recientes
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const ultimaFila = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];
      resultados.detalles.ultimaFila = {
        rowNumber: lastRow,
        idAlma: ultimaFila[0],
        timestamp: ultimaFila[1],
        nombreCapturador: ultimaFila[2]
      };
    }
    
    // Verificar que no hay errores #REF!
    const refErrors = [];
    for (let col = 1; col <= headers.length; col++) {
      const cellValue = sheet.getRange(1, col).getValue();
      if (String(cellValue).includes('#REF!')) {
        refErrors.push(`Columna ${col}: ${cellValue}`);
      }
    }
    
    resultados.detalles.erroresRef = refErrors.length === 0 ? '✅ Sin errores #REF!' : '⚠️ ' + refErrors.length + ' errores encontrados';
    
    const duracion = Date.now() - inicio;
    resultados.duracion = duracion;
    console.log(`✅ Verificación en Sheets completada en ${duracion}ms`);
    
    return resultados;
    
  } catch (error) {
    resultados.exitoso = false;
    resultados.errores.push(error.message);
    console.error('❌ Error en verificación de Sheets:', error);
    return resultados;
  }
}

/**
 * Genera resumen de resultados
 */
function generarResumen(resultados) {
  const resumen = {
    duracionTotal: resultados.fin - resultados.inicio,
    testsExitosos: 0,
    testsFallidos: 0,
    erroresTotales: resultados.errores.length,
    rendimiento: {}
  };
  
  // Contar tests exitosos y fallidos
  Object.keys(resultados.tests).forEach(testKey => {
    const test = resultados.tests[testKey];
    if (test.exitoso) {
      resumen.testsExitosos++;
    } else {
      resumen.testsFallidos++;
    }
    
    // Agregar duración si existe
    if (test.duracion) {
      resumen.rendimiento[testKey] = test.duracion;
    }
  });
  
  // Calcular rendimiento general
  resumen.rendimientoTotal = Object.values(resumen.rendimiento).reduce((sum, dur) => sum + dur, 0);
  
  return resumen;
}

/**
 * Muestra resultados finales
 */
function mostrarResultadosFinales(resultados) {
  console.log('\n🎯 === RESULTADOS FINALES DEL DIAGNÓSTICO ===');
  console.log(`⏱️ Duración total: ${resultados.resumen.duracionTotal}ms`);
  console.log(`✅ Tests exitosos: ${resultados.resumen.testsExitosos}`);
  console.log(`❌ Tests fallidos: ${resultados.resumen.testsFallidos}`);
  console.log(`🚨 Errores totales: ${resultados.resumen.erroresTotales}`);
  
  if (resultados.resumen.erroresTotales > 0) {
    console.log('\n🚨 === ERRORES DETALLADOS ===');
    resultados.errores.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}: ${error.error}`);
    });
  }
  
  console.log('\n⚡ === RENDIMIENTO POR TEST ===');
  Object.entries(resultados.resumen.rendimiento).forEach(([test, duracion]) => {
    const status = resultados.tests[test].exitoso ? '✅' : '❌';
    console.log(`${status} ${test}: ${duracion}ms`);
  });
  
  // Determinar estado general
  const estadoGeneral = resultados.resumen.testsFallidos === 0 && resultados.resumen.erroresTotales === 0 
    ? '🎉 SISTEMA COMPLETAMENTE FUNCIONAL' 
    : '⚠️ SISTEMA CON PROBLEMAS';
  
  console.log(`\n🏁 === ESTADO GENERAL: ${estadoGeneral} ===`);
  
  if (estadoGeneral.includes('FUNCIONAL')) {
    console.log('✅ Todas las optimizaciones funcionando correctamente');
    console.log('✅ Sistema listo para uso en producción');
    console.log('✅ Rendimiento optimizado (TextFinder + fastAppend + dispatcher)');
  } else {
    console.log('⚠️ Se requieren correcciones antes del uso en producción');
    console.log('📋 Revisar errores detallados arriba');
  }
  
  return resultados;
}

/**
 * Función auxiliar para limpiar datos de prueba
 */
function limpiarDatosPrueba() {
  try {
    console.log('🧹 Limpiando datos de prueba...');
    
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEETS.INGRESOS);
    
    if (!sheet || sheet.getLastRow() < 2) {
      console.log('✅ No hay datos para limpiar');
      return;
    }
    
    const lastRow = sheet.getLastRow();
    let filasLimpiadas = 0;
    
    // Buscar y eliminar filas de prueba
    for (let row = lastRow; row >= 2; row--) {
      const idCell = sheet.getRange(row, 1).getValue();
      const nombreCell = sheet.getRange(row, 2).getValue();
      
      if (String(idCell).includes('TEST_') || String(nombreCell).includes('Test')) {
        sheet.deleteRow(row);
        filasLimpiadas++;
      }
    }
    
    console.log(`✅ ${filasLimpiadas} filas de prueba eliminadas`);
    
  } catch (error) {
    console.error('❌ Error limpiando datos de prueba:', error);
  }
}

/**
 * Test rápido para verificar funcionalidad básica
 */
function testRapido() {
  console.log('⚡ === TEST RÁPIDO ===');
  
  try {
    // Test 1: Configuración
    const configOk = typeof CONFIG !== 'undefined' && CONFIG.SPREADSHEET_ID;
    console.log('📋 Configuración:', configOk ? '✅ OK' : '❌ FALTA');
    
    // Test 2: fastAppend
    const inicio = Date.now();
    const record = ['TEST_' + Date.now(), new Date().toISOString(), 'Test Rápido'];
    const rowNum = fastAppend(record);
    const duracion = Date.now() - inicio;
    console.log(`⚡ fastAppend: ${duracion}ms (fila ${rowNum})`);
    
    // Test 3: FuzzyMatching
    const fuzzyDetector = new FuzzyDuplicateDetector();
    const candidatos = fuzzyDetector.getCandidateRecords({
      almaNombres: 'Test',
      almaApellidos: 'Rápido',
      almaTelefono: '1234567890'
    });
    console.log(`🔍 FuzzyMatching: ${candidatos.length} candidatos`);
    
    console.log('✅ Test rápido completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error en test rápido:', error);
  }
}
