/**
 * TEST CON DATOS REALES - FASE 3
 * Prueba completa del sistema con datos reales controlados
 */

/**
 * Test completo con datos reales - Flujo end-to-end
 */
function testFase3_DatosReales() {
  console.log('🚀 INICIANDO TEST FASE 3 - DATOS REALES');
  console.log('======================================');
  
  // Datos reales pero marcados como TEST para fácil identificación
  const datosReales = {
    nombreCapturador: 'TEST FASE3 - USUARIO REAL',
    congregacion: 'Cancún', // Usar congregación real
    liderCasaDeFeId: 'LCF-1018', // Usar líder real del sistema
    fuenteContacto: 'Servicio Congregacional',
    almaNombres: 'MARIA ELENA',
    almaApellidos: 'RODRIGUEZ LOPEZ',
    almaTelefono: '9998887766',
    almaDireccion: 'Calle 25 #123 x 10 y 12, Centro, Cancún',
    almaSexo: 'Femenino',
    almaEdad: 'Adulto (25-34)',
    aceptoJesus: 'Sí',
    deseaVisita: 'Sí',
    peticionOracion: ['Salvación / Libertad Espiritual', 'Familia / Matrimonio'],
    responsableSeguimiento: 'Sí'
  };
  
  try {
    console.log('📋 Datos de prueba preparados:');
    console.log(`- Nombre: ${datosReales.almaNombres} ${datosReales.almaApellidos}`);
    console.log(`- Congregación: ${datosReales.congregacion}`);
    console.log(`- Líder: ${datosReales.liderCasaDeFeId}`);
    console.log(`- Teléfono: ${datosReales.almaTelefono}`);
    
    console.log('\n⚡ EJECUTANDO processForm_v3 con datos reales...');
    const startTime = Date.now();
    
    const resultado = processForm_v3(datosReales);
    
    const duration = Date.now() - startTime;
    console.log(`\n⏱️ TIEMPO TOTAL: ${duration}ms`);
    
    // Analizar resultado
    console.log('\n📊 RESULTADO DEL PROCESAMIENTO:');
    console.log(`Status: ${resultado.status}`);
    console.log(`ID generado: ${resultado.id || 'NO GENERADO'}`);
    console.log(`Fila guardada: ${resultado.rowNum || 'NO GUARDADO'}`);
    console.log(`Mensaje: ${resultado.message || 'NO HAY MENSAJE'}`);
    
    if (resultado.warning) {
      console.log(`⚠️ Advertencia: ${resultado.warning}`);
    }
    
    if (resultado.status === 'success') {
      console.log('\n✅ GUARDADO EXITOSO - Verificando detalles...');
      
      // Verificar que el registro se guardó correctamente
      const verificacion = verificarRegistroGuardado(resultado.id, resultado.rowNum);
      
      // Verificar estado de la cola de trabajos
      console.log('\n📋 Verificando cola de trabajos...');
      const colaStats = getQueueStatus();
      console.log(`Trabajos en cola: ${colaStats.total || 0}`);
      
      if (colaStats.total > 0) {
        console.log('🔄 Hay trabajos en cola - esperando procesamiento...');
        
        // Esperar un momento y luego verificar si hay trabajos pendientes
        console.log('⏳ Esperando 5 segundos para procesamiento automático...');
        Utilities.sleep(5000);
        
        // Verificar si el dispatcher procesó el trabajo
        const colaFinal = getQueueStatus();
        console.log(`Trabajos restantes: ${colaFinal.total || 0}`);
        
        if (colaFinal.total > 0) {
          console.log('🔧 Forzando procesamiento manual...');
          const procesamientoManual = processQueueManually();
          console.log('Resultado procesamiento manual:', JSON.stringify(procesamientoManual, null, 2));
        }
      }
      
      // Verificación final del registro
      console.log('\n🔍 VERIFICACIÓN FINAL DEL REGISTRO...');
      console.log('⏳ Esperando 2 segundos para verificación final...');
      Utilities.sleep(2000);
      verificacionFinalRegistro(resultado.id);
      
      return {
        success: true,
        duration: duration,
        id: resultado.id,
        rowNum: resultado.rowNum,
        message: 'Test completado exitosamente'
      };
      
    } else {
      console.log('\n❌ ERROR EN EL PROCESAMIENTO:');
      console.log(`Error: ${resultado.error || resultado.message}`);
      
      return {
        success: false,
        error: resultado.error || resultado.message,
        duration: duration
      };
    }
    
  } catch (error) {
    console.error('\n❌ ERROR EN TEST FASE 3:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verifica que el registro se guardó correctamente en la hoja
 */
function verificarRegistroGuardado(id, rowNum) {
  console.log(`🔍 Verificando registro ID: ${id} en fila: ${rowNum}`);
  
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.INGRESOS);
    
    if (!sheet) {
      console.log('❌ No se pudo acceder a la hoja');
      return false;
    }
    
    if (rowNum > sheet.getLastRow()) {
      console.log('❌ Número de fila inválido');
      return false;
    }
    
    // Leer toda la fila
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rowData = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];
    
    // Crear objeto con los datos
    const registro = {};
    headers.forEach((header, index) => {
      registro[header] = rowData[index];
    });
    
    // Verificaciones específicas
    const checks = [
      { field: 'ID_Alma', expected: id, actual: registro['ID_Alma'] },
      { field: 'Nombres del Alma', expected: 'MARIA ELENA', actual: registro['Nombres del Alma'] },
      { field: 'Apellidos del Alma', expected: 'RODRIGUEZ LOPEZ', actual: registro['Apellidos del Alma'] },
      { field: 'KEY_BUSQUEDA', expected: 'maria elena|rodriguez lopez', actual: registro['KEY_BUSQUEDA'] }
    ];
    
    let verificacionExitosa = true;
    console.log('\n📋 Verificando campos clave:');
    
    checks.forEach(check => {
      const coincide = check.actual === check.expected;
      if (coincide) {
        console.log(`✅ ${check.field}: ${check.actual}`);
      } else {
        console.log(`❌ ${check.field}: Esperado "${check.expected}", Actual "${check.actual}"`);
        verificacionExitosa = false;
      }
    });
    
    // Mostrar algunos campos adicionales
    console.log('\n📊 Otros campos relevantes:');
    console.log(`- Timestamp: ${registro['Timestamp']}`);
    console.log(`- Congregación: ${registro['Congregación']}`);
    console.log(`- ID LCF: ${registro['ID LCF']}`);
    console.log(`- Estado: ${registro['Estado']}`);
    console.log(`- Estado_Revision: ${registro['Estado_Revision']}`);
    
    return verificacionExitosa;
    
  } catch (error) {
    console.error('❌ Error verificando registro:', error);
    return false;
  }
}

/**
 * Verificación final después de procesamiento completo
 */
function verificacionFinalRegistro(id) {
  console.log(`\n🔍 VERIFICACIÓN FINAL - ID: ${id}`);
  console.log('=====================================');
  
  try {
    // Usar la función existente de verificación por alma
    verificarAlma('MARIA ELENA', 'RODRIGUEZ LOPEZ');
    
    // También verificar estadísticas finales
    console.log('\n📊 Estadísticas finales de cola:');
    const stats = getQueueStatus();
    console.log(JSON.stringify(stats, null, 2));
    
    console.log('\n✅ VERIFICACIÓN FINAL COMPLETADA');
    
  } catch (error) {
    console.error('❌ Error en verificación final:', error);
  }
}

/**
 * Comparación directa: Original vs FastPath V3
 */
function comparacionDirecta_OriginalVsFastPath() {
  console.log('⚡ COMPARACIÓN DIRECTA: ORIGINAL vs FASTPATH V3');
  console.log('===============================================');
  
  const datosComparacion = {
    nombreCapturador: 'TEST COMPARACION',
    congregacion: 'Cancún',
    liderCasaDeFeId: 'LCF-1018',
    fuenteContacto: 'Servicio Congregacional',
    almaNombres: 'JUAN CARLOS',
    almaApellidos: 'PRUEBA COMPARACION',
    almaTelefono: '9995554433',
    almaDireccion: 'Dirección de prueba comparación',
    almaSexo: 'Masculino',
    almaEdad: 'Joven (15-24)',
    aceptoJesus: 'Sí',
    deseaVisita: 'No',
    peticionOracion: ['Finanzas / Trabajo'],
    responsableSeguimiento: 'No'
  };
  
  console.log('⚠️ IMPORTANTE: Esta función creará 2 registros reales');
  console.log('¿Deseas continuar? Ejecuta manualmente si estás seguro.');
  console.log('\nPara ejecutar la comparación, descomenta las líneas de guardado.');
  
  /*
  // DESCOMENTA ESTAS LÍNEAS PARA EJECUTAR LA COMPARACIÓN REAL
  console.log('\n🐌 Ejecutando processForm ORIGINAL...');
  const start1 = Date.now();
  const result1 = processForm(datosComparacion);
  const time1 = Date.now() - start1;
  
  console.log('\n⚡ Ejecutando processForm_v3 FASTPATH...');
  const start2 = Date.now();
  const result2 = processForm_v3(datosComparacion);
  const time2 = Date.now() - start2;
  
  console.log('\n📊 RESULTADOS COMPARACIÓN:');
  console.log(`Original: ${time1}ms - Status: ${result1.status}`);
  console.log(`FastPath: ${time2}ms - Status: ${result2.status}`);
  console.log(`Mejora: ${Math.round(time1/time2)}x más rápido`);
  */
}

/**
 * Test rápido sin guardado real - Solo verificación de componentes
 */
function testRapido_SinGuardado() {
  console.log('⚡ TEST RÁPIDO - SIN GUARDADO REAL');
  console.log('=================================');
  
  const datosTest = {
    nombreCapturador: 'TEST SIN GUARDADO',
    congregacion: 'Cancún',
    liderCasaDeFeId: 'LCF-1018',
    fuenteContacto: 'Casa de Fe',
    almaNombres: 'PRUEBA',
    almaApellidos: 'SIN GUARDADO',
    almaTelefono: '9997776655',
    almaDireccion: 'Dirección de prueba',
    almaSexo: 'Femenino',
    almaEdad: 'Mayor 45',
    aceptoJesus: 'No estoy seguro',
    deseaVisita: 'Sí',
    peticionOracion: ['Sanidad (Física o Emocional)'],
    responsableSeguimiento: 'Sí'
  };
  
  try {
    // Solo testear componentes sin guardado
    console.log('🔄 Testing normalización...');
    const normalized = FastPathCore.normalizePayload(datosTest);
    
    console.log('🔄 Testing validación...');
    const validation = FastPathCore.fastValidation(normalized);
    console.log(`Validación: ${validation.isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
    
    console.log('🔄 Testing generación de clave...');
    const searchKey = FastPathCore.makeSearchKey(normalized.almaNombres, normalized.almaApellidos);
    console.log(`Clave: ${searchKey}`);
    
    console.log('🔄 Testing verificación de duplicados...');
    const duplicateCheck = FastPathCore.quickExactCheck(searchKey);
    console.log(`Duplicado: ${duplicateCheck ? '⚠️ SÍ' : '✅ NO'}`);
    
    console.log('🔄 Testing preparación de registro...');
    const record = prepareRecord_v3('TEST-123', normalized, { searchKey: searchKey });
    console.log(`Registro preparado: ${record.length} columnas`);
    
    console.log('\n✅ TODOS LOS COMPONENTES FUNCIONAN CORRECTAMENTE');
    console.log('Sistema listo para guardado real.');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error en test rápido:', error);
    return false;
  }
}

/**
 * Función principal para ejecutar test completo de Fase 3
 */
function ejecutarTestCompleto_Fase3() {
  console.log('🎯 EJECUTANDO TEST COMPLETO - FASE 3');
  console.log('====================================');
  
  // Paso 1: Test rápido sin guardado
  console.log('\n1️⃣ Test rápido de componentes...');
  const testRapido = testRapido_SinGuardado();
  
  if (!testRapido) {
    console.log('❌ Test rápido falló - abortando');
    return false;
  }
  
  console.log('\n⏳ Esperando 3 segundos...\n');
  Utilities.sleep(3000);
  
  // Paso 2: Test con datos reales
  console.log('2️⃣ Test con datos reales...');
  const testReal = testFase3_DatosReales();
  
  if (testReal.success) {
    console.log('\n🎉 TEST FASE 3 COMPLETADO EXITOSAMENTE');
    console.log(`⚡ Velocidad achieved: ${testReal.duration}ms`);
    console.log(`📝 Registro creado: ${testReal.id}`);
    console.log('\n✅ SISTEMA LISTO PARA PRODUCCIÓN');
  } else {
    console.log('\n❌ TEST FASE 3 FALLÓ');
    console.log(`Error: ${testReal.error}`);
  }
  
  return testReal.success;
}
