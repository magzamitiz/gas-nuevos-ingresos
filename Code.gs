/**
 * SISTEMA DE REGISTRO DE ALMAS v2.0
 * Módulo Principal - Core + Seguridad
 * @version 2.0.0
 */

// =================================================================
// CONFIGURACIÓN CENTRALIZADA
// =================================================================
const CONFIG = {
  SPREADSHEET_ID: "1dwuqpyMXWHJvnJHwDHCqFMvgdYhypE2W1giH6bRZMKc",
  
  // Hojas
  SHEETS: {
    LIDERES: "Directorio de Líderes",
    CELULAS: "Directorio de Células", 
    INGRESOS: "Ingresos",
    ERRORS: "Errores_Log",
    AUDIT: "Audit_Log"
  },
  
  // Seguridad
  SECURITY: {
    MAX_REQUESTS_PER_MINUTE: 60,
    MAX_REQUESTS_PER_HOUR: 500,
    SESSION_TIMEOUT_MS: 3600000,
    ALLOWED_DOMAINS: ['gmail.com'],
    REQUIRE_AUTH: false, // Cambiar a true para producción
    ADMIN_EMAILS: [] // Agregar emails de administradores
  },
  
  // Cache
  CACHE: {
    TTL_CONGREGACIONES: 3600,
    TTL_LIDERES: 1800,
    TTL_CELULAS: 1800,
    TTL_DEDUP: 300,
    VERSION: "v2.0.0"
  },
  
  // Aplicación
  APP: {
    TIMEZONE: "America/Cancun",
    LOCALE: "es-MX",
    ID_PREFIX: "A-",
    ID_START: 1000,
    BATCH_SIZE: 10
  },
  
  // Límites
  LIMITS: {
    MAX_NAME_LENGTH: 100,
    MAX_ADDRESS_LENGTH: 500,
    MAX_PRAYER_LENGTH: 1000,
    MIN_PHONE_LENGTH: 10,
    MAX_PHONE_LENGTH: 15,
    MAX_RETRIES: 3
  },
  
  // Coincidencia Difusa
  FUZZY_MATCHING: {
    THRESHOLD: 0.75,        // Umbral mínimo de confianza
    NAME_WEIGHT: 0.7,       // Peso del nombre en la confianza
    PHONE_WEIGHT: 0.3,      // Peso del teléfono en la confianza
    ENABLED: true,          // Habilitar coincidencia difusa
    MAX_CANDIDATES: 1000,   // Máximo de candidatos a analizar
    CACHE_TTL: 300          // TTL de caché en segundos
  }
};

// =================================================================
// SISTEMA DE AUTENTICACIÓN
// =================================================================
class AuthManager {
  static getCurrentUser() {
    try {
      const user = Session.getActiveUser();
      const email = user.getEmail();
      
      if (!email) return null;
      
      const domain = email.split('@')[1];
      if (CONFIG.SECURITY.ALLOWED_DOMAINS.length > 0 && 
          !CONFIG.SECURITY.ALLOWED_DOMAINS.includes(domain)) {
        throw new Error('Dominio no autorizado');
      }
      
      return {
        email: email,
        isAdmin: CONFIG.SECURITY.ADMIN_EMAILS.includes(email),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error en autenticación:', error);
      return null;
    }
  }
  
  static requireAuth(fn) {
    return function() {
      const args = Array.prototype.slice.call(arguments);
      
      if (!CONFIG.SECURITY.REQUIRE_AUTH) {
        return fn.apply(this, args);
      }
      
      const user = AuthManager.getCurrentUser();
      if (!user) {
        return {
          status: 'error',
          code: 401,
          message: 'No autorizado'
        };
      }
      
      args.push({ user: user });
      return fn.apply(this, args);
    };
  }
}

// =================================================================
// RATE LIMITING
// =================================================================
class RateLimiter {
  constructor() {
    this.cache = CacheService.getScriptCache();
  }
  
  checkLimit(identifier) {
    const now = Date.now();
    const minuteKey = `rate_min_${identifier}_${Math.floor(now / 60000)}`;
    const hourKey = `rate_hour_${identifier}_${Math.floor(now / 3600000)}`;
    
    const minuteCount = parseInt(this.cache.get(minuteKey) || '0');
    const hourCount = parseInt(this.cache.get(hourKey) || '0');
    
    if (minuteCount >= CONFIG.SECURITY.MAX_REQUESTS_PER_MINUTE) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: 60 - (now % 60000) / 1000,
        message: 'Demasiadas solicitudes. Espera 1 minuto.'
      };
    }
    
    if (hourCount >= CONFIG.SECURITY.MAX_REQUESTS_PER_HOUR) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: 3600 - (now % 3600000) / 1000,
        message: 'Límite por hora excedido.'
      };
    }
    
    this.cache.put(minuteKey, String(minuteCount + 1), 60);
    this.cache.put(hourKey, String(hourCount + 1), 3600);
    
    return {
      allowed: true,
      remaining: Math.min(
        CONFIG.SECURITY.MAX_REQUESTS_PER_MINUTE - minuteCount - 1,
        CONFIG.SECURITY.MAX_REQUESTS_PER_HOUR - hourCount - 1
      )
    };
  }
}

// =================================================================
// VALIDACIÓN Y SANITIZACIÓN
// =================================================================
class Validator {
  static validateFormData(data) {
    const errors = [];
    const sanitized = {};
    
    const required = [
      'nombreCapturador', 'congregacion', 'liderCasaDeFeId', 'fuenteContacto',
      'almaNombres', 'almaApellidos', 'almaTelefono', 'almaDireccion',
      'almaSexo', 'almaEdad', 'aceptoJesus', 'deseaVisita', 'responsableSeguimiento'
    ];
    
    // Verificar campos requeridos
    for (const field of required) {
      if (!data[field] || String(data[field]).trim() === '') {
        errors.push({
          field: field,
          message: `El campo ${field} es requerido`
        });
      }
    }
    
    try {
      // Sanitizar campos
      sanitized.nombreCapturador = this.sanitizeName(data.nombreCapturador, 'nombreCapturador', errors);
      sanitized.congregacion = this.sanitizeText(data.congregacion, 'congregacion', 100, errors);
      sanitized.liderCasaDeFeId = this.sanitizeId(data.liderCasaDeFeId, 'liderCasaDeFeId', errors);
      
      if (data.celulaId) {
        sanitized.celulaId = this.sanitizeId(data.celulaId, 'celulaId', errors);
      }
      
      sanitized.fuenteContacto = this.sanitizeSelect(data.fuenteContacto, [
        'Servicio Congregacional', 'Casa de Fe', 'Célula', 'Evangelismo en la calle',
        'Retiro sanidad', 'Retiro Salvación', 'Escuela Nuevo Comienzo',
        'Mes de la familia', 'Evento Especial'
      ], 'fuenteContacto', errors);
      
      sanitized.almaNombres = this.sanitizeName(data.almaNombres, 'almaNombres', errors);
      sanitized.almaApellidos = this.sanitizeName(data.almaApellidos, 'almaApellidos', errors);
      sanitized.almaTelefono = this.sanitizePhone(data.almaTelefono, 'almaTelefono', errors);
      sanitized.almaDireccion = this.sanitizeAddress(data.almaDireccion, 'almaDireccion', errors);
      
      sanitized.almaSexo = this.sanitizeSelect(data.almaSexo, ['Masculino', 'Femenino'], 'almaSexo', errors);
      
      sanitized.almaEdad = this.sanitizeSelect(data.almaEdad, [
        'Niño (0-11)', 'Adolescente (12-14)', 'Joven (15-24)', 
        'Adulto (25-34)', 'Adulto (35-45)', 'Mayor 45'
      ], 'almaEdad', errors);
      
      sanitized.aceptoJesus = this.sanitizeSelect(data.aceptoJesus, 
        ['Sí', 'No', 'No estoy seguro'], 'aceptoJesus', errors);
      
      sanitized.deseaVisita = this.sanitizeSelect(data.deseaVisita, 
        ['Sí', 'No'], 'deseaVisita', errors);
      
      sanitized.responsableSeguimiento = this.sanitizeSelect(data.responsableSeguimiento, 
        ['Sí', 'No'], 'responsableSeguimiento', errors);
      
      sanitized.peticionOracion = this.sanitizePrayerRequests(data.peticionOracion, errors);
      
      if (data.celulaNombre) {
        sanitized.celulaNombre = this.sanitizeText(data.celulaNombre, 'celulaNombre', 100, errors);
      }
      
    } catch (error) {
      errors.push({
        field: 'general',
        message: 'Error en validación: ' + error.toString()
      });
    }
    
    return {
      valid: errors.length === 0,
      errors: errors,
      sanitized: sanitized
    };
  }
  
  static sanitizeName(value, field, errors, isTest = false) {
    if (!value) return '';
    
    let cleaned = String(value)
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/[<>"'&]/g, '')
      .trim()
      .replace(/\s+/g, ' ');
    
    if (cleaned.length > CONFIG.LIMITS.MAX_NAME_LENGTH) {
      errors.push({
        field: field,
        message: `${field} excede el límite de ${CONFIG.LIMITS.MAX_NAME_LENGTH} caracteres`
      });
      cleaned = cleaned.substring(0, CONFIG.LIMITS.MAX_NAME_LENGTH);
    }
    
    // Regex para producción: solo letras, espacios, guiones y puntos
    // Regex para test: permite además números y guiones bajos
    const nameRegex = isTest 
      ? /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-\.\d_]+$/  // TEST: más flexible
      : /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-\.]+$/;   // PROD: estricto
    
    if (cleaned && !nameRegex.test(cleaned)) {
      errors.push({
        field: field,
        message: `${field} contiene caracteres no válidos`
      });
    }
    
    return cleaned;
  }
  
  static sanitizeText(value, field, maxLength, errors) {
    if (!value) return '';
    
    let cleaned = String(value)
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/[<>"']/g, '')
      .replace(/&/g, 'y')
      .replace(/;/g, ',')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '')
      .replace(/\.\./g, '')
      .replace(/\\/g, '/')
      .trim()
      .replace(/\s+/g, ' ');
    
    if (cleaned.length > maxLength) {
      errors.push({
        field: field,
        message: `${field} excede el límite de ${maxLength} caracteres`
      });
      cleaned = cleaned.substring(0, maxLength);
    }
    
    return cleaned;
  }
  
  static sanitizeAddress(value, field, errors) {
    if (!value) return '';
    
    let cleaned = String(value)
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/[<>"']/g, '')
      .trim()
      .replace(/\s+/g, ' ');
    
    if (cleaned.length > CONFIG.LIMITS.MAX_ADDRESS_LENGTH) {
      errors.push({
        field: field,
        message: `La dirección excede el límite de ${CONFIG.LIMITS.MAX_ADDRESS_LENGTH} caracteres`
      });
      cleaned = cleaned.substring(0, CONFIG.LIMITS.MAX_ADDRESS_LENGTH);
    }
    
    return cleaned;
  }
  
  static sanitizePhone(value, field, errors) {
    if (!value) return '';
    
    let cleaned = String(value).replace(/\D/g, '');
    
    if (cleaned.length < CONFIG.LIMITS.MIN_PHONE_LENGTH || 
        cleaned.length > CONFIG.LIMITS.MAX_PHONE_LENGTH) {
      errors.push({
        field: field,
        message: `El teléfono debe tener entre ${CONFIG.LIMITS.MIN_PHONE_LENGTH} y ${CONFIG.LIMITS.MAX_PHONE_LENGTH} dígitos`
      });
    }
    
    return cleaned;
  }
  
  static sanitizeId(value, field, errors) {
    if (!value) return '';
    
    const cleaned = String(value)
      .trim()
      .replace(/[^a-zA-Z0-9\-_]/g, '');
    
    if (cleaned !== String(value).trim()) {
      errors.push({
        field: field,
        message: `${field} contiene caracteres no válidos`
      });
    }
    
    return cleaned;
  }
  
  static sanitizeSelect(value, allowedValues, field, errors) {
    const cleaned = String(value || '').trim();
    
    if (!allowedValues.includes(cleaned)) {
      errors.push({
        field: field,
        message: `Valor no válido para ${field}: ${cleaned}`
      });
      return allowedValues[0];
    }
    
    return cleaned;
  }
  
  static sanitizePrayerRequests(value, errors) {
    if (!value || !Array.isArray(value)) return [];
    
    const cleaned = value
      .filter(v => v != null)
      .map(v => String(v).trim())
      .filter(v => v.length > 0)
      .map(v => v.substring(0, CONFIG.LIMITS.MAX_PRAYER_LENGTH));
    
    return cleaned;
  }
}

// =================================================================
// MANEJO DE ERRORES
// =================================================================
class ErrorHandler {
  static get ErrorTypes() {
    return {
      VALIDATION: 'VALIDATION_ERROR',
      AUTH: 'AUTH_ERROR',
      RATE_LIMIT: 'RATE_LIMIT_ERROR',
      DATABASE: 'DATABASE_ERROR',
      DUPLICATE: 'DUPLICATE_ERROR'
    };
  }
  
  static logError(functionName, error, context) {
    const ctx = context || {};
    try {
      const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      let sheet = ss.getSheetByName(CONFIG.SHEETS.ERRORS);
      
      if (!sheet) {
        sheet = ss.insertSheet(CONFIG.SHEETS.ERRORS);
        sheet.getRange(1, 1, 1, 4).setValues([
          ['Timestamp', 'Function', 'Error', 'Details']
        ]).setFontWeight('bold');
      }
      
      const errorDetails = {};
      for (let key in ctx) {
        errorDetails[key] = ctx[key];
      }
      errorDetails.stack = error.stack;
      errorDetails.type = error.type || ErrorHandler.ErrorTypes.UNKNOWN;
      
      const errorData = [
        new Date().toISOString(),
        functionName,
        error.message || error.toString(),
        JSON.stringify(errorDetails)
      ];
      
      // 🚀 Usar fastAppendToSheet para logs de error (evita contaminar hoja de Ingresos)
      try {
        fastAppendToSheet(CONFIG.SHEETS.ERRORS, errorData);
      } catch (appendError) {
        // Fallback directo para errores críticos
        sheet.appendRow(errorData);
      }
      console.error(`[${functionName}] ${error.message}`, ctx);
      
    } catch (logError) {
      console.error('Failed to log error:', logError);
      console.error('Original error:', error);
    }
  }
  
  static wrap(functionName, fn) {
    return function() {
      const args = Array.prototype.slice.call(arguments);
      try {
        return fn.apply(this, args);
      } catch (error) {
        ErrorHandler.logError(functionName, error, { args: args });
        
        return {
          status: 'error',
          code: error.code || 500,
          message: ErrorHandler.getUserFriendlyMessage(error),
          type: error.type || ErrorHandler.ErrorTypes.UNKNOWN,
          timestamp: new Date().toISOString()
        };
      }
    };
  }
  
  static getUserFriendlyMessage(error) {
    const ErrorTypes = ErrorHandler.ErrorTypes;
    const messages = {
      [ErrorTypes.VALIDATION]: 'Por favor verifica los datos ingresados.',
      [ErrorTypes.AUTH]: 'Por favor inicia sesión para continuar.',
      [ErrorTypes.RATE_LIMIT]: 'Demasiadas solicitudes. Por favor espera.',
      [ErrorTypes.DATABASE]: 'Error al guardar. Intenta nuevamente.',
      [ErrorTypes.DUPLICATE]: 'Este registro ya existe.'
    };
    
    return messages[error.type] || error.message || 'Error inesperado.';
  }
}

// =================================================================
// CLASES DE ERROR
// =================================================================
class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.type = ErrorHandler.ErrorTypes.VALIDATION;
    this.field = field;
    this.code = 400;
  }
}

class DuplicateError extends Error {
  constructor(message, existingId) {
    super(message);
    this.name = 'DuplicateError';
    this.type = ErrorHandler.ErrorTypes.DUPLICATE;
    this.code = 409;
    this.existingId = existingId;
  }
}

// =================================================================
// UTILIDADES
// =================================================================
class Utils {
  static normalizeString(str) {
    if (!str || typeof str !== 'string') return '';
    
    return str
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }
  
  static createSearchKey(nombres, apellidos) {
    const norm = s => (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, '')
      .trim()
      .replace(/\s+/g, ' ');
    return `${norm(nombres)}|${norm(apellidos)}`;
  }

  static generateHash(str) {
    if (!str) return '';
    
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = (hash * 16777619) >>> 0;
    }
    return hash.toString(36);
  }
  
  static formatDate(date = new Date()) {
    return Utilities.formatDate(
      date,
      CONFIG.APP.TIMEZONE,
      'yyyy-MM-dd HH:mm:ss'
    );
  }
  
  static sleep(ms) {
    Utilities.sleep(ms);
  }
}

// =================================================================
// ENTRY POINT - WEB APP
// =================================================================
function doGet(e) {
  try {
    if (CONFIG.SECURITY.REQUIRE_AUTH) {
      const user = AuthManager.getCurrentUser();
      if (!user) {
        return HtmlService.createHtmlOutput(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Autenticación Requerida</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  text-align: center; 
                  padding: 50px; 
                }
              </style>
            </head>
            <body>
              <h1>🔒 Autenticación Requerida</h1>
              <p>Por favor contacta al administrador para acceder al sistema.</p>
            </body>
          </html>
        `);
      }
    }
    
    const html = HtmlService.createTemplateFromFile('index');
    
    html.config = {
      requireAuth: CONFIG.SECURITY.REQUIRE_AUTH,
      user: AuthManager.getCurrentUser(),
      version: CONFIG.CACHE.VERSION
    };
    
    return html.evaluate()
      .setTitle('Sistema de Registro de Almas v2.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
      
  } catch (error) {
    ErrorHandler.logError('doGet', error, { params: e });
    
    return HtmlService.createHtmlOutput(`
      <h1>Error del Sistema</h1>
      <p>Ha ocurrido un error. Contacta al administrador.</p>
      <p>Error: ${error.message}</p>
    `);
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getClientConfig() {
  return {
    version: CONFIG.CACHE.VERSION,
    user: AuthManager.getCurrentUser(),
    limits: CONFIG.LIMITS,
    timezone: CONFIG.APP.TIMEZONE
  };
}