/**
 * EJECUTOR DE FASE 1 - PREPARACIÓN Y RESPALDO
 * Scripts para ejecutar paso a paso la Fase 1 de migración
 */

/**
 * PASO 1: Ejecutar validación completa del sistema actual
 */
function fase1_paso1_validarSistema() {
  console.log('🔍 FASE 1 - PASO 1: Validando sistema actual...');
  
  const validation = validateSystemForMigration();
  
  console.log('📊 RESULTADO DE VALIDACIÓN:');
  console.log(`Score General: ${validation.overall.score}%`);
  console.log(`Sistema Listo: ${validation.overall.ready ? 'SÍ' : 'NO'}`);
  
  // Mostrar detalles por categoría
  Object.entries(validation.categories).forEach(([category, result]) => {
    console.log(`\n--- ${category.toUpperCase()} (${result.score}%) ---`);
    result.checks.forEach(check => console.log(check));
    result.warnings.forEach(warning => console.log(warning));
    result.errors.forEach(error => console.log(error));
  });
  
  if (!validation.overall.ready) {
    console.log('\n❌ SISTEMA NO ESTÁ LISTO PARA MIGRACIÓN');
    console.log('Resuelve los errores marcados antes de continuar.');
    return false;
  }
  
  console.log('\n✅ SISTEMA VALIDADO - PROCEDER A PASO 2');
  return true;
}

/**
 * PASO 2: Crear respaldo completo del sistema
 */
function fase1_paso2_crearRespaldo() {
  console.log('🛡️ FASE 1 - PASO 2: Creando respaldo completo...');
  
  const backup = createSystemBackup();
  
  if (!backup.success) {
    console.log('❌ ERROR CREANDO RESPALDO:', backup.error);
    return false;
  }
  
  console.log('✅ RESPALDO CREADO EXITOSAMENTE');
  console.log(`Clave de respaldo: ${backup.backupKey}`);
  console.log(`Timestamp: ${backup.timestamp}`);
  console.log(`Duración: ${backup.duration}ms`);
  
  if (backup.validation.isValid) {
    console.log('✅ Validación de respaldo: EXITOSA');
    backup.validation.checks.forEach(check => console.log(`  ${check}`));
  } else {
    console.log('⚠️ Validación de respaldo: CON PROBLEMAS');
    backup.validation.errors.forEach(error => console.log(`  ${error}`));
  }
  
  console.log('\n✅ RESPALDO COMPLETADO - PROCEDER A PASO 3');
  return true;
}

/**
 * PASO 3: Documentar puntos de rollback
 */
function fase1_paso3_documentarRollback() {
  console.log('📋 FASE 1 - PASO 3: Documentando puntos de rollback...');
  
  // Obtener estado actual de triggers
  const triggers = ScriptApp.getProjectTriggers();
  const triggerInfo = triggers.map(t => ({
    id: t.getUniqueId(),
    function: t.getHandlerFunction(),
    type: t.getEventType() ? t.getEventType().toString() : 'TIME_DRIVEN'
  }));
  
  // Obtener propiedades críticas
  const props = PropertiesService.getScriptProperties().getProperties();
  const criticalProps = {};
  ['ALMA_COUNTER', 'lastPostSaveContext', 'postSaveTriggerId'].forEach(key => {
    if (props[key]) criticalProps[key] = props[key];
  });
  
  // Crear documento de rollback
  const rollbackDoc = {
    timestamp: new Date().toISOString(),
    triggers: triggerInfo,
    properties: criticalProps,
    functions: {
      processForm: typeof processForm === 'function',
      getCongregaciones: typeof getCongregaciones === 'function',
      getLideresPorCongregacion: typeof getLideresPorCongregacion === 'function',
      getCelulasPorLider: typeof getCelulasPorLider === 'function'
    },
    spreadsheetId: CONFIG.SPREADSHEET_ID
  };
  
  // Guardar documento de rollback
  PropertiesService.getScriptProperties().setProperty(
    'ROLLBACK_POINTS', 
    JSON.stringify(rollbackDoc)
  );
  
  console.log('✅ PUNTOS DE ROLLBACK DOCUMENTADOS:');
  console.log(`- ${triggerInfo.length} triggers activos`);
  console.log(`- ${Object.keys(criticalProps).length} propiedades críticas`);
  console.log('- Funciones principales verificadas');
  
  console.log('\n✅ FASE 1 COMPLETADA - SISTEMA LISTO PARA FASE 2');
  return true;
}

/**
 * EJECUTOR COMPLETO DE FASE 1
 */
function ejecutarFase1Completa() {
  console.log('🚀 INICIANDO FASE 1 COMPLETA - PREPARACIÓN Y RESPALDO');
  console.log('===============================================');
  
  try {
    // Paso 1: Validar sistema
    if (!fase1_paso1_validarSistema()) {
      console.log('❌ FASE 1 ABORTADA - Sistema no está listo');
      return false;
    }
    
    console.log('\n⏳ Esperando 2 segundos...\n');
    Utilities.sleep(2000);
    
    // Paso 2: Crear respaldo
    if (!fase1_paso2_crearRespaldo()) {
      console.log('❌ FASE 1 ABORTADA - Error en respaldo');
      return false;
    }
    
    console.log('\n⏳ Esperando 2 segundos...\n');
    Utilities.sleep(2000);
    
    // Paso 3: Documentar rollback
    if (!fase1_paso3_documentarRollback()) {
      console.log('❌ FASE 1 ABORTADA - Error documentando rollback');
      return false;
    }
    
    console.log('\n🎉 FASE 1 COMPLETADA EXITOSAMENTE');
    console.log('===============================================');
    console.log('El sistema está preparado para la migración.');
    console.log('Próximo paso: Ejecutar Fase 2 (Implementación Incremental)');
    
    return true;
    
  } catch (error) {
    console.error('❌ ERROR EN FASE 1:', error);
    console.log('Se recomienda ejecutar emergencyRollback() si es necesario');
    return false;
  }
}

/**
 * FUNCIÓN DE VERIFICACIÓN RÁPIDA ANTES DE FASE 1
 */
function prevalidacionFase1() {
  console.log('⚡ PRE-VALIDACIÓN RÁPIDA PARA FASE 1');
  console.log('=====================================');
  
  const quickCheck = quickSystemCheck();
  
  console.log(`Score: ${quickCheck.score}%`);
  console.log(`Ready: ${quickCheck.ready ? 'SÍ' : 'NO'}`);
  
  console.log('\nChecks individuales:');
  Object.entries(quickCheck.checks).forEach(([check, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${check}`);
  });
  
  if (quickCheck.ready) {
    console.log('\n✅ SISTEMA LISTO PARA FASE 1');
    console.log('Ejecuta ejecutarFase1Completa() para proceder');
  } else {
    console.log('\n⚠️ SISTEMA NECESITA ATENCIÓN');
    console.log('Resuelve los problemas antes de ejecutar Fase 1');
  }
  
  return quickCheck.ready;
}
