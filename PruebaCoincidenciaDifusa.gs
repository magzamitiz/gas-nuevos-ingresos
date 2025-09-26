/**
 * SCRIPT DE PRUEBA PARA COINCIDENCIA DIFUSA
 * Ejecuta este script para probar el sistema de detección de duplicados
 */

/**
 * 🚀 FUNCIÓN PRINCIPAL - Ejecuta todas las pruebas
 */
function ejecutarPruebasCompletas() {
  console.log('🚀 INICIANDO PRUEBAS COMPLETAS DE COINCIDENCIA DIFUSA');
  console.log('='.repeat(60));
  
  const resultados = {
    configuracion: false,
    algoritmos: false,
    deteccion: false,
    integracion: false
  };
  
  try {
    // 1. Verificar configuración
    console.log('\n1️⃣ VERIFICANDO CONFIGURACIÓN...');
    resultados.configuracion = verificarConfiguracion();
    
    // 2. Probar algoritmos individuales
    console.log('\n2️⃣ PROBANDO ALGORITMOS...');
    resultados.algoritmos = probarAlgoritmos();
    
    // 3. Probar detección de duplicados
    console.log('\n3️⃣ PROBANDO DETECCIÓN DE DUPLICADOS...');
    resultados.deteccion = probarDeteccionDuplicados();
    
    // 4. Probar integración completa
    console.log('\n4️⃣ PROBANDO INTEGRACIÓN COMPLETA...');
    resultados.integracion = probarIntegracionCompleta();
    
    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE PRUEBAS');
    console.log('='.repeat(60));
    
    Object.entries(resultados).forEach(([prueba, resultado]) => {
      const icono = resultado ? '✅' : '❌';
      console.log(`${icono} ${prueba.toUpperCase()}`);
    });
    
    const todasPasaron = Object.values(resultados).every(r => r === true);
    
    if (todasPasaron) {
      console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON!');
      console.log('✅ El sistema de coincidencia difusa está funcionando correctamente.');
    } else {
      console.log('\n⚠️ ALGUNAS PRUEBAS FALLARON');
      console.log('❌ Revisa los errores anteriores para solucionarlos.');
    }
    
    return {
      success: todasPasaron,
      results: resultados,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Error en pruebas:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Verifica que la configuración esté correcta
 */
function verificarConfiguracion() {
  try {
    console.log('   • Verificando CONFIG.FUZZY_MATCHING...');
    
    if (!CONFIG.FUZZY_MATCHING) {
      console.log('   ❌ CONFIG.FUZZY_MATCHING no está definido');
      return false;
    }
    
    const config = CONFIG.FUZZY_MATCHING;
    const camposRequeridos = ['THRESHOLD', 'NAME_WEIGHT', 'PHONE_WEIGHT', 'ENABLED'];
    
    for (const campo of camposRequeridos) {
      if (config[campo] === undefined) {
        console.log(`   ❌ Campo faltante: ${campo}`);
        return false;
      }
    }
    
    console.log(`   ✅ Configuración encontrada:`);
    console.log(`      - Umbral: ${config.THRESHOLD}`);
    console.log(`      - Peso nombre: ${config.NAME_WEIGHT}`);
    console.log(`      - Peso teléfono: ${config.PHONE_WEIGHT}`);
    console.log(`      - Habilitado: ${config.ENABLED}`);
    
    return true;
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

/**
 * Prueba los algoritmos de coincidencia difusa
 */
function probarAlgoritmos() {
  const pruebas = [
    {
      nombre: 'Distancia de Levenshtein',
      test: () => {
        const d1 = FuzzyMatcher.levenshteinDistance('Juan', 'Juan');
        const d2 = FuzzyMatcher.levenshteinDistance('Juan', 'Jose');
        return d1 === 0 && d2 > 0;
      }
    },
    {
      nombre: 'Similitud Jaro-Winkler',
      test: () => {
        const s1 = FuzzyMatcher.jaroWinklerSimilarity('María', 'Maria');
        const s2 = FuzzyMatcher.jaroWinklerSimilarity('Juan', 'Pedro');
        return s1 > 0.8 && s2 < 0.5;
      }
    },
    {
      nombre: 'Cálculo de similitud combinada',
      test: () => {
        const result = FuzzyMatcher.calculateSimilarity('Juan Pérez', 'Juan Perez');
        return result.combined > 0.8 && 
               result.jaroWinkler > 0.8 && 
               result.levenshtein > 0.8;
      }
    },
    {
      nombre: 'Normalización de strings',
      test: () => {
        const normalized = FuzzyMatcher.normalizeString('  JOSÉ MARÍA  ');
        return normalized === 'jose maria';
      }
    }
  ];
  
  let pasaron = 0;
  
  pruebas.forEach(prueba => {
    try {
      if (prueba.test()) {
        console.log(`   ✅ ${prueba.nombre}`);
        pasaron++;
      } else {
        console.log(`   ❌ ${prueba.nombre} - Falló la condición`);
      }
    } catch (error) {
      console.log(`   ❌ ${prueba.nombre} - Error: ${error.message}`);
    }
  });
  
  console.log(`   📊 Resultado: ${pasaron}/${pruebas.length} pruebas pasaron`);
  return pasaron === pruebas.length;
}

/**
 * Prueba la detección de duplicados
 */
function probarDeteccionDuplicados() {
  const casosPrueba = [
    {
      nombre: 'María Elena',
      apellido: 'González Martínez',
      telefono: '9991234567',
      descripcion: 'Caso base'
    },
    {
      nombre: 'Maria Elena',
      apellido: 'Gonzalez Martinez',
      telefono: '9991234567',
      descripcion: 'Sin acentos (debería coincidir)'
    },
    {
      nombre: 'María Elena',
      apellido: 'Gonzales Martinez',
      telefono: '9991234567',
      descripcion: 'Error ortográfico (debería coincidir)'
    },
    {
      nombre: 'Juan Carlos',
      apellido: 'Pérez García',
      telefono: '9999876543',
      descripcion: 'Caso diferente (no debería coincidir)'
    }
  ];
  
  let casosExitosos = 0;
  
  casosPrueba.forEach((caso, index) => {
    console.log(`   ${index + 1}. ${caso.descripcion}:`);
    console.log(`      Nombre: ${caso.nombre} ${caso.apellido}`);
    
    try {
      const testData = {
        almaNombres: caso.nombre,
        almaApellidos: caso.apellido,
        almaTelefono: caso.telefono
      };
      
      const result = findFuzzyDuplicates(testData);
      
      if (result.matches && result.matches.length > 0) {
        console.log(`      ✅ Coincidencias: ${result.matches.length}`);
        result.matches.slice(0, 2).forEach((match, i) => {
          console.log(`         ${i + 1}. ${match.nombre} (${(match.confidence * 100).toFixed(1)}%)`);
        });
        casosExitosos++;
      } else {
        console.log(`      ℹ️ Sin coincidencias`);
        casosExitosos++;
      }
      
    } catch (error) {
      console.log(`      ❌ Error: ${error.message}`);
    }
  });
  
  console.log(`   📊 Resultado: ${casosExitosos}/${casosPrueba.length} casos procesados`);
  return casosExitosos === casosPrueba.length;
}

/**
 * Prueba la integración completa con el sistema de deduplicación
 */
function probarIntegracionCompleta() {
  try {
    console.log('   • Probando integración con DeduplicationService...');
    
    const testData = {
      almaNombres: 'Test',
      almaApellidos: 'Integración',
      almaTelefono: '9990000000'
    };
    
    const dedupService = new DeduplicationService();
    const result = dedupService.checkDuplicate(testData);
    
    console.log(`   ✅ Verificación de duplicados: ${result.isDuplicate ? 'Duplicado encontrado' : 'No duplicado'}`);
    console.log(`   📊 Tipo: ${result.type || 'N/A'}`);
    
    if (result.type === 'fuzzy' && result.fuzzyMatches) {
      console.log(`   🔍 Coincidencias difusas: ${result.fuzzyMatches.length}`);
    }
    
    return true;
    
  } catch (error) {
    console.log(`   ❌ Error en integración: ${error.message}`);
    return false;
  }
}

/**
 * Prueba de rendimiento con múltiples registros
 */
function probarRendimiento() {
  console.log('\n⚡ PROBANDO RENDIMIENTO...');
  
  const startTime = Date.now();
  const numPruebas = 10;
  
  for (let i = 0; i < numPruebas; i++) {
    const testData = {
      almaNombres: `Usuario${i}`,
      almaApellidos: `Prueba${i}`,
      almaTelefono: `999${String(1000000 + i).substring(1)}`
    };
    
    try {
      findFuzzyDuplicates(testData);
    } catch (error) {
      console.log(`   ❌ Error en prueba ${i + 1}: ${error.message}`);
      return false;
    }
  }
  
  const endTime = Date.now();
  const tiempoTotal = endTime - startTime;
  const tiempoPromedio = tiempoTotal / numPruebas;
  
  console.log(`   ✅ ${numPruebas} pruebas completadas en ${tiempoTotal}ms`);
  console.log(`   📊 Tiempo promedio: ${tiempoPromedio.toFixed(2)}ms por prueba`);
  
  return tiempoPromedio < 1000; // Menos de 1 segundo por prueba
}

/**
 * Función de demostración con ejemplos reales
 */
function demostrarCoincidenciaDifusa() {
  console.log('\n🎭 DEMOSTRACIÓN DE COINCIDENCIA DIFUSA');
  console.log('='.repeat(50));
  
  const ejemplos = [
    {
      original: 'María Elena González Martínez',
      variaciones: [
        'Maria Elena Gonzalez Martinez',
        'María Elena Gonzales Martinez',
        'Maria Elena Gonzales Martinez',
        'María Elena González-Martínez',
        'MARIA ELENA GONZALEZ MARTINEZ'
      ]
    },
    {
      original: 'José Carlos Pérez García',
      variaciones: [
        'Jose Carlos Perez Garcia',
        'José Carlos Perez García',
        'Jose Carlos Pérez Garcia',
        'José-Carlos Pérez-García',
        'jose carlos perez garcia'
      ]
    }
  ];
  
  ejemplos.forEach((ejemplo, index) => {
    console.log(`\n${index + 1}. Nombre original: "${ejemplo.original}"`);
    console.log('   Variaciones a probar:');
    
    ejemplo.variaciones.forEach((variacion, i) => {
      console.log(`   ${i + 1}. "${variacion}"`);
      
      try {
        const [nombres, apellidos] = variacion.split(' ').length > 2 
          ? [variacion.split(' ').slice(0, -2).join(' '), variacion.split(' ').slice(-2).join(' ')]
          : [variacion.split(' ')[0], variacion.split(' ').slice(1).join(' ')];
        
        const testData = {
          almaNombres: nombres,
          almaApellidos: apellidos,
          almaTelefono: '9991234567'
        };
        
        const result = findFuzzyDuplicates(testData);
        
        if (result.matches && result.matches.length > 0) {
          const mejorCoincidencia = result.matches[0];
          console.log(`      ✅ Coincidencia: "${mejorCoincidencia.nombre}" (${(mejorCoincidencia.confidence * 100).toFixed(1)}%)`);
          console.log(`         Razones: ${mejorCoincidencia.reasons.join(', ')}`);
        } else {
          console.log(`      ℹ️ Sin coincidencias`);
        }
        
      } catch (error) {
        console.log(`      ❌ Error: ${error.message}`);
      }
    });
  });
}

