const { useTextHighlight } = require('./useTextHighlight.js');
const { useSelectorHighlight } = require('./useSelectorHighlight.js');
const { useSVGHighlight } = require('./useSVGHighlight.js');
const { useHighlightListeners } = require('./useHighlightListeners.js');
const { useHighlightManager } = require('./useHighlightManager.js');

// Import shared utilities
const HighlightUtils = require('../shared/HighlightUtils.js');
const { errorHandler, HighlightError, ERROR_TYPES, SEVERITY_LEVELS } = require('../shared/HighlightErrorHandler.js');

module.exports = {
    useTextHighlight,
    useSelectorHighlight,
    useSVGHighlight,
    useHighlightListeners,
    useHighlightManager,

    // Shared utilities
    HighlightUtils,
    errorHandler,
    HighlightError,
    ERROR_TYPES,
    SEVERITY_LEVELS
}; 