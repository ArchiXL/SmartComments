import { useSelection } from './useSelection.js';

// Export shared utilities for convenience
import { SelectionErrorHandler, selectionErrorHandler } from './shared/SelectionErrorHandler.js';
import { SELECTION_LIMITS, SELECTION_PATTERNS, SELECTION_CLASSES, SELECTION_ERRORS, SCREENSHOT_CONFIG } from '../../utils/constants.js';

import { initializeRangy,
    validateSelectionContent,
    formatSelectionForBackend,
    parseSelectionFromBackend,
    isSelectionEnabled,
    getContentRoot,
    createImageHash,
    createSVGHash } from './shared/SelectionUtils.js';

export default {
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