import log from 'loglevel';

log.setLevel(
    process.env.REACT_APP_ENVIRONMENT === 'development' ? 'DEBUG' : 'INFO'
);
