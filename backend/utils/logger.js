const winston = require('winston');

// 1. Determine if logging is enabled (default: true)
// Note: We check strings because .env values are strings
const isLoggingEnabled = process.env.LOGGING_ENABLED !== 'false';

// 2. Determine Log Level (default: info)
// levels: error, warn, info, http, verbose, debug, silly
const logLevel = process.env.LOG_LEVEL || 'info';

// Custom format to match console.log style but better
const logFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  if (!isLoggingEnabled) return '';
  
  // If meta object is not empty, stringify it
  let metaString = '';
  if (Object.keys(meta).length > 0) {
    metaString = JSON.stringify(meta, null, 2);
  }
  
  return `[${timestamp}] ${level.toUpperCase()}: ${message} ${metaString}`;
});

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.splat(), // Allows %s style interpolation
    logFormat
  ),
  transports: [
    new winston.transports.Console()
  ],
  silent: !isLoggingEnabled
});

// Wrapper to ensure we don't log if silent (redundant with winston.silent but good for explicit checks if needed)
module.exports = logger;
