/**
 * VALIDADOR DE ORDEN DE COLUMNAS
 * Verifica que el orden de columnas coincida con el esperado
 */

/**
 * Valida el orden actual de columnas en la hoja
 */
function validarOrdenColumnas() {
  console.log('🔍 Validando orden de columnas...');
  
  const expectedOrder = [
    'ID_Alma',                    // A
    'Timestamp',                  // B  
    'Nombre del Capturador',      // C
    'Congregación',               // D
    'ID LCF',                     // E
    'Nombre LCF',                 // F
    'ID LM',                      // G
    'Nombre LM',                  // H
    'ID LD',                      // I
    'Nombre LD',                  // J
    'Fuente del Contacto',        // K
    'ID Célula',                  // L
    'Nombre Célula',              // M
    'Nombres del Alma',           // N
    'Apellidos del Alma',         // O
    'Teléfono',                   // P
    'Dirección',                  // Q
    'Sexo',                       // R
    'Rango de Edad',              // S
    'Aceptó a Jesús',             // T
    '¿Desea Visita?',             // U
    'Petición de Oración',        // V
    '¿Responsable de Seguimiento?', // W
    'Tel_Normalizado',            // X
    'NombreClave_Normalizado',    // Y
    'Estado',                     // Z
    'COLUMNA_AA',                 // AA (la que tiene #REF!)
    'Estado_Revision',            // AB
    'KEY_BUSQUEDA'                // AC
  ];
  
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
      .getSheetByName(CONFIG.SHEETS.INGRESOS);
    
    if (!sheet) {
      console.log('❌ Hoja Ingresos no encontrada');
      return false;
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    console.log(`📊 Columnas actuales en la hoja: ${headers.length}`);
    
    const validation = {
      matches: 0,
      mismatches: [],
      missing: [],
      extra: []
    };
    
    // Verificar cada posición esperada
    expectedOrder.forEach((expectedHeader, index) => {
      const actualHeader = headers[index];
      const columnLetter = String.fromCharCode(65 + index); // A, B, C, etc.
      
      if (actualHeader === expectedHeader) {
        validation.matches++;
        console.log(`✅ ${columnLetter}: ${expectedHeader}`);
      } else {
        validation.mismatches.push({
          position: columnLetter,
          expected: expectedHeader,
          actual: actualHeader || 'VACÍA'
        });
        console.log(`❌ ${columnLetter}: Esperado "${expectedHeader}", Actual "${actualHeader || 'VACÍA'}"`);
      }
    });
    
    // Verificar columnas extra
    if (headers.length > expectedOrder.length) {
      for (let i = expectedOrder.length; i < headers.length; i++) {
        const columnLetter = String.fromCharCode(65 + i);
        validation.extra.push({
          position: columnLetter,
          header: headers[i]
        });
        console.log(`➕ ${columnLetter}: Columna extra "${headers[i]}"`);
      }
    }
    
    console.log(`\n📈 RESUMEN VALIDACIÓN:`);
    console.log(`✅ Coincidencias: ${validation.matches}/${expectedOrder.length}`);
    console.log(`❌ Diferencias: ${validation.mismatches.length}`);
    console.log(`➕ Columnas extra: ${validation.extra.length}`);
    
    if (validation.mismatches.length > 0) {
      console.log(`\n❌ COLUMNAS CON PROBLEMAS:`);
      validation.mismatches.forEach(mismatch => {
        console.log(`  ${mismatch.position}: "${mismatch.expected}" → "${mismatch.actual}"`);
      });
    }
    
    const isValid = validation.mismatches.length === 0;
    console.log(`\n${isValid ? '✅' : '❌'} Orden de columnas: ${isValid ? 'CORRECTO' : 'NECESITA CORRECCIÓN'}`);
    
    return {
      isValid: isValid,
      validation: validation
    };
    
  } catch (error) {
    console.error('❌ Error validando columnas:', error);
    return { isValid: false, error: error.message };
  }
}

/**
 * Test específico para verificar que prepareRecord_v3 escribe en las posiciones correctas
 */
function testPrepareRecordV3Order() {
  console.log('🧪 Testing orden de prepareRecord_v3...');
  
  const testData = {
    nombreCapturador: 'TEST USER',
    congregacion: 'TEST CONG',
    liderCasaDeFeId: 'LCF-TEST',
    fuenteContacto: 'TEST SOURCE',
    celulaId: 'C-TEST',
    celulaNombre: 'TEST CELL',
    almaNombres: 'JUAN',
    almaApellidos: 'PEREZ',
    almaTelefono: '9999999999',
    almaDireccion: 'TEST ADDRESS',
    almaSexo: 'Masculino',
    almaEdad: 'Adulto (25-34)',
    aceptoJesus: 'Sí',
    deseaVisita: 'Sí',
    peticionOracion: ['Test Prayer'],
    responsableSeguimiento: 'Sí'
  };
  
  const testOptions = {
    exactDuplicate: false,
    searchKey: 'juan|perez'
  };
  
  try {
    const record = prepareRecord_v3('TEST-ID', testData, testOptions);
    
    console.log('📋 Registro generado por prepareRecord_v3:');
    record.forEach((value, index) => {
      const columnLetter = String.fromCharCode(65 + index);
      console.log(`  ${columnLetter}: ${value}`);
    });
    
    // Verificaciones específicas
    const checks = [
      { position: 0, expected: 'TEST-ID', description: 'ID_Alma' },
      { position: 1, expected: 'timestamp', description: 'Timestamp (formato fecha)' },
      { position: 2, expected: 'TEST USER', description: 'Nombre del Capturador' },
      { position: 3, expected: 'TEST CONG', description: 'Congregación' },
      { position: 13, expected: 'JUAN', description: 'Nombres del Alma' },
      { position: 14, expected: 'PEREZ', description: 'Apellidos del Alma' },
      { position: 25, expected: 'PROCESANDO', description: 'Estado' },
      { position: 27, expected: 'PROCESANDO', description: 'Estado_Revision' },
      { position: 28, expected: 'juan|perez', description: 'KEY_BUSQUEDA' }
    ];
    
    let passedChecks = 0;
    checks.forEach(check => {
      const actualValue = record[check.position];
      const passed = check.expected === 'timestamp' ? 
        (typeof actualValue === 'string' && actualValue.includes('-')) : 
        actualValue === check.expected;
      
      if (passed) {
        passedChecks++;
        console.log(`✅ ${check.description}: ${actualValue}`);
      } else {
        console.log(`❌ ${check.description}: Esperado "${check.expected}", Actual "${actualValue}"`);
      }
    });
    
    console.log(`\n📊 Test completado: ${passedChecks}/${checks.length} checks pasaron`);
    return passedChecks === checks.length;
    
  } catch (error) {
    console.error('❌ Error en test prepareRecord_v3:', error);
    return false;
  }
}

/**
 * Función para mostrar el mapeo exacto de columnas
 */
function mostrarMapeoColumnas() {
  console.log('📋 MAPEO EXACTO DE COLUMNAS - NUEVO ORDEN');
  console.log('==========================================');
  
  const mapping = [
    'A: ID_Alma',
    'B: Timestamp',  
    'C: Nombre del Capturador',
    'D: Congregación',
    'E: ID LCF',
    'F: Nombre LCF',
    'G: ID LM',
    'H: Nombre LM',
    'I: ID LD',
    'J: Nombre LD',
    'K: Fuente del Contacto',
    'L: ID Célula',
    'M: Nombre Célula',
    'N: Nombres del Alma',
    'O: Apellidos del Alma',
    'P: Teléfono',
    'Q: Dirección',
    'R: Sexo',
    'S: Rango de Edad',
    'T: Aceptó a Jesús',
    'U: ¿Desea Visita?',
    'V: Petición de Oración',
    'W: ¿Responsable de Seguimiento?',
    'X: Tel_Normalizado',
    'Y: NombreClave_Normalizado',
    'Z: Estado',
    'AA: [COLUMNA CON #REF! - VACÍA]',
    'AB: Estado_Revision',
    'AC: KEY_BUSQUEDA'
  ];
  
  mapping.forEach(line => console.log(line));
  
  console.log('\n📝 NOTAS IMPORTANTES:');
  console.log('- La columna AA tiene #REF! - se deja vacía por ahora');
  console.log('- KEY_BUSQUEDA se escribe al final (columna AC)');
  console.log('- Estado y Estado_Revision son columnas separadas');
}

/**
 * Función completa para validar todo el orden
 */
function validacionCompletaColumnas() {
  console.log('🔍 VALIDACIÓN COMPLETA DE ORDEN DE COLUMNAS');
  console.log('===========================================');
  
  // Paso 1: Mostrar mapeo
  mostrarMapeoColumnas();
  
  console.log('\n');
  
  // Paso 2: Validar orden actual
  const validation = validarOrdenColumnas();
  
  console.log('\n');
  
  // Paso 3: Test prepareRecord_v3
  const testPassed = testPrepareRecordV3Order();
  
  console.log('\n📊 RESUMEN FINAL:');
  console.log(`- Orden en hoja: ${validation.isValid ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
  console.log(`- prepareRecord_v3: ${testPassed ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
  
  const allGood = validation.isValid && testPassed;
  console.log(`\n${allGood ? '🎉' : '⚠️'} Estado general: ${allGood ? 'LISTO PARA USAR' : 'NECESITA CORRECCIÓN'}`);
  
  return allGood;
}
