/**
 * Centralized error handling for highlight operations
 * Provides consistent error handling and logging across all highlight types
 */

/**
 * Error types for highlight operations
 */
const ERROR_TYPES = {
    VALIDATION: 'VALIDATION_ERROR',
    DOM_MANIPULATION: 'DOM_MANIPULATION_ERROR',
    RANGY: 'RANGY_ERROR',
    SELECTOR: 'SELECTOR_ERROR',
    LISTENER: 'LISTENER_ERROR',
    CLEANUP: 'CLEANUP_ERROR'
};

/**
 * Error severity levels
 */
const SEVERITY_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

/**
 * Base error class for highlight operations
 */
class HighlightError extends Error {
    constructor(message, type, severity = SEVERITY_LEVELS.MEDIUM, context = {}) {
        super(message);
        this.name = 'HighlightError';
        this.type = type;
        this.severity = severity;
        this.context = context;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Error handler class for managing highlight errors
 */
class HighlightErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 100; // Keep last 100 errors
    }

    /**
     * Handle validation errors
     * @param {string} message - Error message
     * @param {Object} context - Error context
     * @throws {HighlightError}
     */
    handleValidationError(message, context = {}) {
        const error = new HighlightError(
            message,
            ERROR_TYPES.VALIDATION,
            SEVERITY_LEVELS.HIGH,
            context
        );
        this._logError(error);
        throw error;
    }

    /**
     * Handle DOM manipulation errors (non-fatal)
     * @param {string} message - Error message
     * @param {Object} context - Error context
     * @param {Error} [originalError] - Original error if available
     */
    handleDOMError(message, context = {}, originalError = null) {
        const error = new HighlightError(
            message,
            ERROR_TYPES.DOM_MANIPULATION,
            SEVERITY_LEVELS.MEDIUM,
            { ...context, originalError: originalError?.message }
        );
        this._logError(error);
        console.warn(`HighlightError [${error.type}]:`, error.message, error.context);
    }

    /**
     * Handle Rangy library errors
     * @param {string} message - Error message
     * @param {Object} context - Error context
     * @param {Error} [originalError] - Original error if available
     */
    handleRangyError(message, context = {}, originalError = null) {
        const error = new HighlightError(
            message,
            ERROR_TYPES.RANGY,
            SEVERITY_LEVELS.HIGH,
            { ...context, originalError: originalError?.message }
        );
        this._logError(error);
        console.error(`HighlightError [${error.type}]:`, error.message, error.context);
    }

    /**
     * Handle CSS selector errors
     * @param {string} selector - The problematic selector
     * @param {Object} context - Error context
     * @param {Error} [originalError] - Original error if available
     */
    handleSelectorError(selector, context = {}, originalError = null) {
        const error = new HighlightError(
            `Invalid or dangerous CSS selector: ${selector}`,
            ERROR_TYPES.SELECTOR,
            SEVERITY_LEVELS.HIGH,
            { ...context, selector, originalError: originalError?.message }
        );
        this._logError(error);
        console.error(`HighlightError [${error.type}]:`, error.message, error.context);
    }

    /**
     * Handle event listener errors
     * @param {string} message - Error message
     * @param {Object} context - Error context
     * @param {Error} [originalError] - Original error if available
     */
    handleListenerError(message, context = {}, originalError = null) {
        const error = new HighlightError(
            message,
            ERROR_TYPES.LISTENER,
            SEVERITY_LEVELS.MEDIUM,
            { ...context, originalError: originalError?.message }
        );
        this._logError(error);
        console.warn(`HighlightError [${error.type}]:`, error.message, error.context);
    }

    /**
     * Handle cleanup errors (usually non-fatal)
     * @param {string} message - Error message
     * @param {Object} context - Error context
     * @param {Error} [originalError] - Original error if available
     */
    handleCleanupError(message, context = {}, originalError = null) {
        const error = new HighlightError(
            message,
            ERROR_TYPES.CLEANUP,
            SEVERITY_LEVELS.LOW,
            { ...context, originalError: originalError?.message }
        );
        this._logError(error);
        console.warn(`HighlightError [${error.type}]:`, error.message, error.context);
    }

    /**
     * Validate highlight data and throw if invalid
     * @param {Object} highlightData - The highlight data to validate
     * @throws {HighlightError}
     */
    validateHighlightData(highlightData) {
        if (!highlightData) {
            this.handleValidationError('Highlight data is null or undefined');
        }

        if (!highlightData.type) {
            this.handleValidationError('Highlight data missing type', { highlightData });
        }

        if (!highlightData.comment) {
            this.handleValidationError('Highlight data missing comment', { highlightData });
        }

        if (!highlightData.comment.data_id) {
            this.handleValidationError('Comment missing data_id', {
                highlightData,
                comment: highlightData.comment
            });
        }

        // Type-specific validations
        switch (highlightData.type) {
            case 'wordIndex':
                if (!highlightData.comment.pos) {
                    this.handleValidationError('Text highlight missing pos data', { highlightData });
                }
                break;
            case 'selector':
                if (!highlightData.comment.pos) {
                    this.handleValidationError('Selector highlight missing pos data', { highlightData });
                }
                break;
            case 'svg':
                if (!highlightData.comment.pos || !highlightData.comment.pos.startsWith('svg[')) {
                    this.handleValidationError('SVG highlight missing or invalid pos data', { highlightData });
                }
                break;
            default:
                this.handleValidationError(`Unknown highlight type: ${highlightData.type}`, { highlightData });
        }
    }

    /**
     * Validate highlight data for selection (less strict - allows temporary highlights)
     * @param {Object} highlightData - The highlight data to validate
     * @throws {HighlightError}
     */
    validateSelectionHighlightData(highlightData) {
        if (!highlightData) {
            this.handleValidationError('Highlight data is null or undefined');
        }

        if (!highlightData.type) {
            this.handleValidationError('Highlight data missing type', { highlightData });
        }

        if (!highlightData.comment) {
            this.handleValidationError('Highlight data missing comment', { highlightData });
        }

        // For selection highlights, data_id is optional (temporary highlights)
        // and pos data might not be fully formed yet

        // Only validate known types
        const validTypes = ['wordIndex', 'selector', 'svg', 'image', 'text'];
        if (!validTypes.includes(highlightData.type)) {
            this.handleValidationError(`Unknown highlight type: ${highlightData.type}`, { highlightData });
        }
    }

    /**
     * Safely execute a function with error handling
     * @param {Function} fn - Function to execute
     * @param {string} operation - Description of the operation
     * @param {Object} context - Operation context
     * @returns {*} Function result or null if error occurred
     */
    safeExecute(fn, operation, context = {}) {
        try {
            return fn();
        } catch (error) {
            this.handleDOMError(`Error during ${operation}`, context, error);
            return null;
        }
    }

    /**
     * Get error statistics
     * @returns {Object} Error statistics
     */
    getErrorStats() {
        const stats = {
            total: this.errorLog.length,
            byType: {},
            bySeverity: {},
            recent: this.errorLog.slice(-10) // Last 10 errors
        };

        this.errorLog.forEach(error => {
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
            stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
        });

        return stats;
    }

    /**
     * Clear error log
     */
    clearErrorLog() {
        this.errorLog = [];
    }

    /**
     * Private method to log errors
     * @param {HighlightError} error - The error to log
     * @private
     */
    _logError(error) {
        this.errorLog.push(error);

        // Maintain max log size
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog = this.errorLog.slice(-this.maxLogSize);
        }
    }
}

// Create singleton instance
const errorHandler = new HighlightErrorHandler();

module.exports = {
    HighlightError,
    HighlightErrorHandler,
    ERROR_TYPES,
    SEVERITY_LEVELS,
    errorHandler // Singleton instance
}; 