import log from 'loglevel';

// Set default log level based on environment
if (process.env.NODE_ENV === 'production') {
  log.setLevel('warn'); // Only warn and error in production
} else {
  log.setLevel('debug'); // Debug/info in dev
}

// Optionally allow runtime override
export function setLogLevel(level: log.LogLevelDesc) {
  log.setLevel(level);
}

export default log; 