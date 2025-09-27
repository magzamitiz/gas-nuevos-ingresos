/**
 * FUNCIONES DE CALENTAMIENTO DE CACHÉ
 * Funciones faltantes para warmAllCaches()
 */

/**
 * Calienta la caché del mapa de líderes
 */
function warmLeaderMapCache() {
  console.log('🔥 Calentando caché de líderes...');
  
  try {
    const catalogService = new CatalogService();
    const leaderMap = catalogService.getLeaderMap();
    
    if (leaderMap && Object.keys(leaderMap).length > 0) {
      console.log(`✅ Caché de líderes calentada: ${Object.keys(leaderMap).length} líderes`);
    } else {
      console.log('⚠️ Caché de líderes vacía o no disponible');
    }
    
  } catch (error) {
    console.error('❌ Error calentando caché de líderes:', error);
    ErrorHandler.logError('warmLeaderMapCache', error);
  }
}

/**
 * Calienta la caché del mapa de células
 */
function warmCellMapCache() {
  console.log('🔥 Calentando caché de células...');
  
  try {
    const catalogService = new CatalogService();
    const cellMap = catalogService.getCellMap();
    
    if (cellMap && Object.keys(cellMap).length > 0) {
      console.log(`✅ Caché de células calentada: ${Object.keys(cellMap).length} células`);
    } else {
      console.log('⚠️ Caché de células vacía o no disponible');
    }
    
  } catch (error) {
    console.error('❌ Error calentando caché de células:', error);
    ErrorHandler.logError('warmCellMapCache', error);
  }
}

/**
 * Calienta la caché del índice de duplicados
 */
function warmDedupIndexCache() {
  console.log('🔥 Calentando caché del índice de duplicados...');
  
  try {
    const indexKeySet = DedupIndexService.getIndexKeySet();
    
    if (indexKeySet && indexKeySet.size > 0) {
      console.log(`✅ Caché del índice de duplicados calentada: ${indexKeySet.size} claves`);
    } else {
      console.log('⚠️ Caché del índice de duplicados vacía o no disponible');
    }
    
  } catch (error) {
    console.error('❌ Error calentando caché del índice de duplicados:', error);
    ErrorHandler.logError('warmDedupIndexCache', error);
  }
}

/**
 * Versión mejorada de warmAllCaches que incluye todas las funciones
 */
function warmAllCachesCompleto() {
  console.log('🔥🔥🔥 Iniciando calentamiento completo de todas las cachés...');
  
  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;
  
  // 1. Calentar caché de duplicados
  console.log('\n1️⃣ Calentando caché de duplicados...');
  try {
    warmDedupIndexCache();
    successCount++;
  } catch (error) {
    console.error('❌ Error en caché de duplicados:', error);
    errorCount++;
  }
  
  // 2. Calentar caché de líderes
  console.log('\n2️⃣ Calentando caché de líderes...');
  try {
    warmLeaderMapCache();
    successCount++;
  } catch (error) {
    console.error('❌ Error en caché de líderes:', error);
    errorCount++;
  }
  
  // 3. Calentar caché de células
  console.log('\n3️⃣ Calentando caché de células...');
  try {
    warmCellMapCache();
    successCount++;
  } catch (error) {
    console.error('❌ Error en caché de células:', error);
    errorCount++;
  }
  
  const duration = Date.now() - startTime;
  
  console.log('\n📊 RESUMEN DEL CALENTAMIENTO:');
  console.log('================================================');
  console.log(`✅ Cachés calentadas exitosamente: ${successCount}/3`);
  console.log(`❌ Errores: ${errorCount}/3`);
  console.log(`⏱️ Tiempo total: ${duration}ms`);
  
  if (successCount === 3) {
    console.log('🎉 ¡Todas las cachés calentadas correctamente!');
  } else if (successCount > 0) {
    console.log('⚠️ Calentamiento parcial completado');
  } else {
    console.log('❌ Error en el calentamiento de cachés');
  }
  
  console.log('🔥🔥🔥 Calentamiento completo finalizado');
}

/**
 * Verifica el estado de todas las cachés
 */
function verificarEstadoCache() {
  console.log('🔍 VERIFICANDO ESTADO DE TODAS LAS CACHÉS...');
  
  try {
    const cache = CacheService.getScriptCache();
    const cacheKeys = [
      'leaderMap.v2',
      'cellMap.v2', 
      'dedupIndex.v2.full_set'
    ];
    
    console.log('\n📊 Estado de cachés:');
    console.log('================================================');
    
    cacheKeys.forEach(key => {
      const cached = cache.get(key);
      if (cached) {
        console.log(`✅ Caché '${key}': Disponible`);
      } else {
        console.log(`⚠️ Caché '${key}': No disponible`);
      }
    });
    
    // Verificar caché de duplicados
    console.log('\n🔍 Verificando caché de duplicados...');
    try {
      const indexKeySet = DedupIndexService.getIndexKeySet();
      console.log(`✅ Índice de duplicados: ${indexKeySet.size} claves`);
    } catch (error) {
      console.log(`❌ Error en índice de duplicados: ${error.message}`);
    }
    
    // Verificar caché de líderes
    console.log('\n🔍 Verificando caché de líderes...');
    try {
      const catalogService = new CatalogService();
      const leaderMap = catalogService.getLeaderMap();
      console.log(`✅ Mapa de líderes: ${Object.keys(leaderMap).length} líderes`);
    } catch (error) {
      console.log(`❌ Error en mapa de líderes: ${error.message}`);
    }
    
    // Verificar caché de células
    console.log('\n🔍 Verificando caché de células...');
    try {
      const catalogService = new CatalogService();
      const cellMap = catalogService.getCellMap();
      console.log(`✅ Mapa de células: ${Object.keys(cellMap).length} células`);
    } catch (error) {
      console.log(`❌ Error en mapa de células: ${error.message}`);
    }
    
    console.log('\n✅ Verificación de cachés completada');
    
  } catch (error) {
    console.error('❌ Error verificando estado de cachés:', error);
    ErrorHandler.logError('verificarEstadoCache', error);
  }
}

/**
 * Limpia todas las cachés (para mantenimiento)
 */
function limpiarTodasLasCaches() {
  console.log('🧹 LIMPIANDO TODAS LAS CACHÉS...');
  
  try {
    const cache = CacheService.getScriptCache();
    const cacheKeys = [
      'leaderMap.v2',
      'cellMap.v2',
      'dedupIndex.v2.full_set'
    ];
    
    let cleanedCount = 0;
    
    cacheKeys.forEach(key => {
      if (cache.get(key)) {
        cache.remove(key);
        cleanedCount++;
        console.log(`✅ Caché '${key}' eliminada`);
      } else {
        console.log(`ℹ️ Caché '${key}' ya estaba vacía`);
      }
    });
    
    console.log(`\n📊 Resumen de limpieza:`);
    console.log(`✅ Cachés eliminadas: ${cleanedCount}/${cacheKeys.length}`);
    
    if (cleanedCount > 0) {
      console.log('🔄 Recomendación: Ejecutar warmAllCachesCompleto() para recalentar');
    }
    
  } catch (error) {
    console.error('❌ Error limpiando cachés:', error);
    ErrorHandler.logError('limpiarTodasLasCaches', error);
  }
}
