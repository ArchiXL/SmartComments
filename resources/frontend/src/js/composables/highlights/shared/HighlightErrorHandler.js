/**
 * Centralized error handling for highlight operations
 * Provides consistent error handling and logging across all highlight types
 */

/**
 * Error types for highlight operations
 */
export const ERROR_TYPES = {
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
export const SEVERITY_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

/**
 * Base error class for highlight operations
 */
export class HighlightError extends Error {
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
export class HighlightErrorHandler {
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
     * Validate selection highlight data
     * @param {Object} highlightData - The highlight data to validate
     * @throws {HighlightError}
     */
    validateSelectionHighlightData(highlightData) {
        if (!highlightData) {
            this.handleValidationError('Selection highlight data is null or undefined');
        }

        if (!highlightData.text) {
            this.handleValidationError('Selection highlight missing text', { highlightData });
        }

        if (typeof highlightData.index !== 'number') {
            this.handleValidationError('Selection highlight missing or invalid index', { highlightData });
        }

        if (!highlightData.type) {
            this.handleValidationError('Selection highlight missing type', { highlightData });
        }
    }

    /**
     * Safely execute a function with error handling
     * @param {Function} fn - Function to execute
     * @param {string} operation - Operation name for error context
     * @param {Object} context - Additional context
     * @returns {*} - Function result or null if error
     */
    safeExecute(fn, operation, context = {}) {
        try {
            return fn();
        } catch (error) {
            const errorContext = { operation, ...context, originalError: error?.message };
            this.handleDOMError(`Error during ${operation}`, errorContext, error);
            return null;
        }
    }

    /**
     * Get error statistics
     * @returns {Object} - Error statistics
     */
    getErrorStats() {
        const stats = {
            total: this.errorLog.length,
            byType: {},
            bySeverity: {}
        };

        this.errorLog.forEach(error => {
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
            stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
        });

        return stats;
    }

    /**
     * Clear the error log
     */
    clearErrorLog() {
        this.errorLog = [];
    }

    /**
     * Log an error to the internal log
     * @param {HighlightError} error - Error to log
     * @private
     */
    _logError(error) {
        this.errorLog.push(error);
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift(); // Remove oldest error
        }
    }
}

// Create and export a singleton instance
export const errorHandler = new HighlightErrorHandler();

export default {
    ERROR_TYPES,
    SEVERITY_LEVELS,
    HighlightError,
    HighlightErrorHandler,
    errorHandler
}; 