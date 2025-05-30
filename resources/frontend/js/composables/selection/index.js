const { useSelection } = require('./useSelection.js');

// Export shared utilities for convenience
const { SelectionErrorHandler, selectionErrorHandler } = require('./shared/SelectionErrorHandler.js');
const { SELECTION_LIMITS, SELECTION_PATTERNS, SELECTION_CLASSES, SELECTION_ERRORS, SCREENSHOT_CONFIG } = require('./shared/SelectionConstants.js');
const {
    initializeRangy,
    validateSelectionContent,
    formatSelectionForBackend,
    parseSelectionFromBackend,
    isSelectionEnabled,
    getContentRoot,
    createImageHash,
    createSVGHash
} = require('./shared/SelectionUtils.js');

module.exports = {
    // Main composable
    useSelection,

    // Shared utilities
    SelectionErrorHandler,
    selectionErrorHandler,

    // Constants
    SELECTION_LIMITS,
    SELECTION_PATTERNS,
    SELECTION_CLASSES,
    SELECTION_ERRORS,
    SCREENSHOT_CONFIG,

    // Utility functions
    initializeRangy,
    validateSelectionContent,
    formatSelectionForBackend,
    parseSelectionFromBackend,
    isSelectionEnabled,
    getContentRoot,
    createImageHash,
    createSVGHash
}; 