const STORAGE_KEY = 'logger_enabled';

// Initialize state from local storage (default to true if not set)
let isEnabled = localStorage.getItem(STORAGE_KEY) !== 'false';

const logger = {
  info: (...args) => {
    if (isEnabled) console.info(...args);
  },
  warn: (...args) => {
    if (isEnabled) console.warn(...args);
  },
  error: (...args) => {
    if (isEnabled) console.error(...args);
  },
  debug: (...args) => {
    if (isEnabled) console.debug(...args);
  },
  
  // Public API to control logging
  enable: () => {
    isEnabled = true;
    localStorage.setItem(STORAGE_KEY, 'true');
    console.log('[System] Application logging enabled.');
  },
  disable: () => {
    isEnabled = false;
    localStorage.setItem(STORAGE_KEY, 'false');
    console.log('[System] Application logging disabled.');
  }
};

// Expose to window for console control
window.logger = {
  on: logger.enable,
  off: logger.disable
};

export default logger;
