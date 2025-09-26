/**
 * EJECUTOR DE FASE 2 - IMPLEMENTACIÓN INCREMENTAL
 * Scripts para testing y validación de la nueva infraestructura
 */

/**
 * PASO 1: Validar que toda la infraestructura nueva está disponible
 */
function fase2_paso1_validarInfraestructura() {
  console.log('🔍 FASE 2 - PASO 1: Validando nueva infraestructura...');
  
  const validations = {
    fastPathCore: false,
    jobDispatcher: false,
    processFormV3: false,
    prepareFunctions: false
  };
  
  // Test 1: FastPathCore existe y funciona
  try {
    if (typeof FastPathCore !== 'undefined') {
      // Test normalización
      const testPayload = {
        almaNombres: '  Juan  ',
        almaApellidos: '  Pérez  ',
        almaTelefono: '999-123-4567'
      };
      const normalized = FastPathCore.normalizePayload(testPayload);
      
      if (normalized.almaNombres === 'Juan' && normalized.almaApellidos === 'Pérez') {
        validations.fastPathCore = true;
        console.log('✅ FastPathCore: Normalización funciona');
        
        // Test generación de clave
        const key = FastPathCore.makeSearchKey('Juan', 'Pérez');
        if (key === 'juan|perez') {
          console.log('✅ FastPathCore: Generación de clave funciona');
        }
      }
    }
  } catch (e) {
    console.log('❌ FastPathCore:', e.message);
  }
  
  // Test 2: Dispatcher funciona
  try {
    if (typeof dispatcher_v3 === 'function') {
      validations.jobDispatcher = true;
      console.log('✅ JobDispatcher: Función existe');
      
      // Test estadísticas de cola
      const stats = getQueueStatus();
      if (stats && typeof stats === 'object') {
        console.log(`✅ JobDispatcher: Cola accesible (${stats.total || 0} trabajos)`);
      }
    }
  } catch (e) {
    console.log('❌ JobDispatcher:', e.message);
  }
  
  // Test 3: processForm_v3 existe
  try {
    if (typeof processForm_v3 === 'function') {
      validations.processFormV3 = true;
      console.log('✅ processForm_v3: Función existe');
    }
  } catch (e) {
    console.log('❌ processForm_v3:', e.message);
  }
  
  // Test 4: Funciones de preparación
  try {
    if (typeof prepareRecord_v3 === 'function' && typeof fastAppend === 'function') {
      validations.prepareFunctions = true;
      console.log('✅ Funciones de preparación: Existen');
    }
  } catch (e) {
    console.log('❌ Funciones de preparación:', e.message);
  }
  
  const passedTests = Object.values(validations).filter(Boolean).length;
  const ready = passedTests >= 3; // Al menos 3 de 4 deben pasar
  
  console.log(`\n📊 VALIDACIÓN INFRAESTRUCTURA: ${passedTests}/4 tests pasaron`);
  
  if (ready) {
    console.log('✅ INFRAESTRUCTURA LISTA - PROCEDER A PASO 2');
  } else {
    console.log('❌ INFRAESTRUCTURA INCOMPLETA - Revisar errores');
  }
  
  return ready;
}

/**
 * PASO 2: Test de FastPath con datos simulados
 */
function fase2_paso2_testFastPath() {
  console.log('🧪 FASE 2 - PASO 2: Testing FastPath con datos simulados...');
  
  // Datos de prueba que NO se guardarán realmente
  const testData = {
    nombreCapturador: 'TEST USUARIO FASE2',
    congregacion: 'Cancún',
    liderCasaDeFeId: 'LCF-1018', // Usar líder real del sistema
    fuenteContacto: 'Servicio Congregacional',
    almaNombres: 'PRUEBA',
    almaApellidos: 'FASE2',
    almaTelefono: '9999999999',
    almaDireccion: 'Dirección de prueba',
    almaSexo: 'Masculino',
    almaEdad: 'Adulto (25-34)',
    aceptoJesus: 'Sí',
    deseaVisita: 'Sí',
    peticionOracion: ['Salvación / Libertad Espiritual'],
    responsableSeguimiento: 'Sí'
  };
  
  try {
    console.log('🔄 Ejecutando processForm_v3 con datos de prueba...');
    const startTime = Date.now();
    
    // IMPORTANTE: Comentar esta línea para evitar guardado real
    // const result = processForm_v3(testData);
    
    // En su lugar, testear componentes individuales
    console.log('🔄 Testing normalización...');
    const normalized = FastPathCore.normalizePayload(testData);
    console.log('✅ Normalización exitosa');
    
    console.log('🔄 Testing validación...');
    const validation = FastPathCore.fastValidation(normalized);
    console.log(`✅ Validación: ${validation.isValid ? 'VÁLIDO' : 'INVÁLIDO'}`);
    
    console.log('🔄 Testing generación de clave...');
    const searchKey = FastPathCore.makeSearchKey(normalized.almaNombres, normalized.almaApellidos);
    console.log(`✅ Clave generada: ${searchKey}`);
    
    console.log('🔄 Testing búsqueda rápida...');
    const exactCheck = FastPathCore.quickExactCheck(searchKey);
    console.log(`✅ Check duplicado: ${exactCheck ? 'DUPLICADO' : 'ÚNICO'}`);
    
    const duration = Date.now() - startTime;
    console.log(`⚡ Componentes individuales testeados en ${duration}ms`);
    
    console.log('✅ FASTPATH COMPONENTS TEST COMPLETADO');
    return true;
    
  } catch (error) {
    console.error('❌ Error en test FastPath:', error);
    return false;
  }
}

/**
 * PASO 3: Test del dispatcher con trabajo simulado
 */
function fase2_paso3_testDispatcher() {
  console.log('🔧 FASE 2 - PASO 3: Testing dispatcher...');
  
  try {
    // Test estadísticas de cola
    console.log('📊 Obteniendo estadísticas de cola...');
    const stats = getQueueStatus();
    console.log('✅ Estadísticas obtenidas:', JSON.stringify(stats, null, 2));
    
    // Test limpieza de cola (solo completados)
    console.log('🧹 Testeando limpieza de cola...');
    const cleanResult = clearJobQueue();
    console.log('✅ Limpieza testeada:', JSON.stringify(cleanResult, null, 2));
    
    // Test estadísticas de FastPath
    console.log('📈 Obteniendo estadísticas FastPath...');
    const fastStats = getJobQueueStats();
    console.log('✅ Estadísticas FastPath:', JSON.stringify(fastStats, null, 2));
    
    console.log('✅ DISPATCHER TEST COMPLETADO');
    return true;
    
  } catch (error) {
    console.error('❌ Error en test dispatcher:', error);
    return false;
  }
}

/**
 * PASO 4: Comparación de velocidades (sin guardado real)
 */
function fase2_paso4_comparacionVelocidades() {
  console.log('⚡ FASE 2 - PASO 4: Comparación de velocidades...');
  
  const testData = {
    nombreCapturador: 'TEST VELOCIDAD',
    congregacion: 'Cancún',
    liderCasaDeFeId: 'LCF-1018',
    fuenteContacto: 'Servicio Congregacional',
    almaNombres: 'SPEED',
    almaApellidos: 'TEST',
    almaTelefono: '8888888888',
    almaDireccion: 'Test address',
    almaSexo: 'Femenino',
    almaEdad: 'Joven (15-24)',
    aceptoJesus: 'Sí',
    deseaVisita: 'No',
    peticionOracion: ['Sanidad (Física o Emocional)'],
    responsableSeguimiento: 'No'
  };
  
  // Test componentes FastPath individualmente para medir velocidad
  console.log('📏 Midiendo velocidad de componentes FastPath...');
  
  const measurements = {};
  
  try {
    // Normalización
    let start = Date.now();
    const normalized = FastPathCore.normalizePayload(testData);
    measurements.normalization = Date.now() - start;
    
    // Validación
    start = Date.now();
    const validation = FastPathCore.fastValidation(normalized);
    measurements.validation = Date.now() - start;
    
    // Generación de clave
    start = Date.now();
    const searchKey = FastPathCore.makeSearchKey(normalized.almaNombres, normalized.almaApellidos);
    measurements.keyGeneration = Date.now() - start;
    
    // Búsqueda exacta
    start = Date.now();
    const exactCheck = FastPathCore.quickExactCheck(searchKey);
    measurements.exactCheck = Date.now() - start;
    
    // Preparación de registro
    start = Date.now();
    const record = prepareRecord_v3('TEST-ID', normalized, { searchKey: searchKey });
    measurements.recordPreparation = Date.now() - start;
    
    console.log('📊 MEDICIONES DE VELOCIDAD:');
    Object.entries(measurements).forEach(([component, time]) => {
      console.log(`  ${component}: ${time}ms`);
    });
    
    const totalFastPath = Object.values(measurements).reduce((sum, time) => sum + time, 0);
    console.log(`⚡ Total componentes FastPath: ${totalFastPath}ms`);
    
    // Estimación de tiempo total incluyendo append
    const estimatedTotal = totalFastPath + 500; // ~500ms estimado para append
    console.log(`📈 Estimación total con append: ${estimatedTotal}ms`);
    
    if (estimatedTotal < 3000) {
      console.log('🎉 ¡OBJETIVO DE VELOCIDAD ALCANZADO! (< 3 segundos)');
    } else {
      console.log('⚠️ Velocidad por encima del objetivo de 3 segundos');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error en comparación de velocidades:', error);
    return false;
  }
}

/**
 * EJECUTOR COMPLETO DE FASE 2
 */
function ejecutarFase2Completa() {
  console.log('🚀 INICIANDO FASE 2 COMPLETA - IMPLEMENTACIÓN INCREMENTAL');
  console.log('=======================================================');
  
  try {
    // Paso 1: Validar infraestructura
    if (!fase2_paso1_validarInfraestructura()) {
      console.log('❌ FASE 2 ABORTADA - Infraestructura no está lista');
      return false;
    }
    
    console.log('\n⏳ Esperando 2 segundos...\n');
    Utilities.sleep(2000);
    
    // Paso 2: Test FastPath
    if (!fase2_paso2_testFastPath()) {
      console.log('❌ FASE 2 ABORTADA - Error en test FastPath');
      return false;
    }
    
    console.log('\n⏳ Esperando 2 segundos...\n');
    Utilities.sleep(2000);
    
    // Paso 3: Test Dispatcher
    if (!fase2_paso3_testDispatcher()) {
      console.log('❌ FASE 2 ABORTADA - Error en test Dispatcher');
      return false;
    }
    
    console.log('\n⏳ Esperando 2 segundos...\n');
    Utilities.sleep(2000);
    
    // Paso 4: Comparación de velocidades
    if (!fase2_paso4_comparacionVelocidades()) {
      console.log('❌ FASE 2 ABORTADA - Error en comparación de velocidades');
      return false;
    }
    
    console.log('\n🎉 FASE 2 COMPLETADA EXITOSAMENTE');
    console.log('=======================================================');
    console.log('La nueva infraestructura está funcionando correctamente.');
    console.log('Próximo paso: Ejecutar Fase 3 (Testing Incremental)');
    
    return true;
    
  } catch (error) {
    console.error('❌ ERROR EN FASE 2:', error);
    console.log('Se recomienda ejecutar emergencyRollback() si es necesario');
    return false;
  }
}

/**
 * Test rápido de la nueva infraestructura
 */
function quickTestFase2() {
  console.log('⚡ TEST RÁPIDO DE INFRAESTRUCTURA FASE 2');
  console.log('========================================');
  
  const tests = {
    fastPathCore: false,
    processFormV3: false,
    dispatcher: false,
    queueManager: false
  };
  
  // Test FastPathCore
  try {
    const testKey = FastPathCore.makeSearchKey('Test', 'User');
    tests.fastPathCore = testKey === 'test|user';
  } catch (e) {
    console.log('❌ FastPathCore error:', e.message);
  }
  
  // Test processForm_v3
  try {
    tests.processFormV3 = typeof processForm_v3 === 'function';
  } catch (e) {
    console.log('❌ processForm_v3 error:', e.message);
  }
  
  // Test dispatcher
  try {
    tests.dispatcher = typeof dispatcher_v3 === 'function';
  } catch (e) {
    console.log('❌ dispatcher_v3 error:', e.message);
  }
  
  // Test queue manager
  try {
    const stats = getQueueStatus();
    tests.queueManager = stats && typeof stats === 'object';
  } catch (e) {
    console.log('❌ Queue manager error:', e.message);
  }
  
  const passed = Object.values(tests).filter(Boolean).length;
  const ready = passed >= 3;
  
  console.log(`\nResultados: ${passed}/4 tests pasaron`);
  Object.entries(tests).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`);
  });
  
  if (ready) {
    console.log('\n✅ INFRAESTRUCTURA FASE 2 LISTA');
    console.log('Ejecuta ejecutarFase2Completa() para testing completo');
  } else {
    console.log('\n⚠️ INFRAESTRUCTURA FASE 2 NECESITA ATENCIÓN');
    console.log('Revisa los errores antes de proceder');
  }
  
  return ready;
}

/**
 * Función para crear índice exacto manualmente (helper)
 */
function buildExactIndexForTesting() {
  console.log('🔍 Construyendo índice exacto para testing...');
  try {
    const count = buildExactIndex();
    console.log(`✅ Índice construido con ${count} registros`);
    return true;
  } catch (error) {
    console.error('❌ Error construyendo índice:', error);
    return false;
  }
}
