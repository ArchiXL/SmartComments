/**
 * Base class for selection strategies
 * Implements common functionality and defines interface for all selection types
 */
const { selectionErrorHandler } = require('../composables/selection/shared/SelectionErrorHandler.js');
const { useSelectionScreenshot } = require('../composables/useSelectionScreenshot.js');
const { isSelectionEnabled } = require('../composables/selection/shared/SelectionUtils.js');
const { SELECTION_LIMITS } = require('../composables/selection/shared/SelectionConstants.js');

class BaseSelectionStrategy {
    constructor(selectionType) {
        this.selectionType = selectionType;
        this.screenshot = useSelectionScreenshot();
        this.errorHandler = selectionErrorHandler;
    }

    /**
     * Process selection - must be implemented by subclasses
     * @param {*} target - Selection target (element, range, etc.)
     * @param {Event} event - Mouse/interaction event
     * @param {Object} options - Processing options
     * @returns {Promise<Object|null>} - Selection result or null
     */
    async processSelection(target, event, options = {}) {
        throw new Error(`processSelection must be implemented by ${this.constructor.name}`);
    }

    /**
     * Validate selection target - can be overridden by subclasses
     * @param {*} target - Selection target
     * @returns {boolean} - Whether target is valid
     */
    validateTarget(target) {
        return target != null;
    }

    /**
     * Pre-process checks common to all selection types
     * @param {*} target - Selection target
     * @param {Event} event - Interaction event
     * @param {Object} options - Processing options
     * @returns {boolean} - Whether to continue processing
     */
    async preProcess(target, event, options) {
        // Check if selection is enabled
        if (!isSelectionEnabled()) {
            return false;
        }

        // Validate target
        if (!this.validateTarget(target)) {
            this.errorHandler.handleSelectionError(
                this.selectionType,
                new Error('Invalid selection target'),
                { target, event }
            );
            return false;
        }

        return true;
    }

    /**
     * Post-process selection data - common to all types
     * @param {Object} selectionData - Raw selection data
     * @param {*} target - Original selection target
     * @param {Event} event - Original event
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} - Enhanced selection data
     */
    async postProcess(selectionData, target, event, options) {
        if (!selectionData) {
            return null;
        }

        // Add common metadata
        selectionData.type = this.selectionType;
        selectionData.timestamp = Date.now();
        selectionData.index = selectionData.index ?? -1;

        // Handle screenshot if requested
        if (options.captureScreenshot && !selectionData.image) {
            try {
                const screenshotParams = this.prepareScreenshotParams(target, event, selectionData);
                selectionData.image = await this.screenshot.captureSelectionScreenshot(
                    this.selectionType,
                    screenshotParams
                );
            } catch (error) {
                this.errorHandler.handleScreenshotError(this.selectionType, error, selectionData);
            }
        }

        // Validate final selection data
        if (!this.validateSelectionData(selectionData)) {
            throw this.errorHandler.createContextualError(
                'Selection data validation failed',
                this.selectionType,
                { selectionData, target }
            );
        }

        return selectionData;
    }

    /**
     * Prepare screenshot parameters - can be overridden by subclasses
     * @param {*} target - Selection target
     * @param {Event} event - Interaction event
     * @param {Object} selectionData - Selection data
     * @returns {Object} - Screenshot parameters
     */
    prepareScreenshotParams(target, event, selectionData) {
        // Default implementation for element-based targets
        if (target && target.getBoundingClientRect) {
            const positionData = this.screenshot.calculatePositionData(target, event);
            return {
                ...positionData,
                text: selectionData.text || '',
                element: target
            };
        }

        return {
            selectionPosition: { x: event?.clientX || 0, y: event?.clientY || 0 },
            startPosition: { x: 0, y: 0 },
            text: selectionData.text || ''
        };
    }

    /**
     * Validate final selection data
     * @param {Object} selectionData - Selection data to validate
     * @returns {boolean} - Whether data is valid
     */
    validateSelectionData(selectionData) {
        if (!selectionData || typeof selectionData !== 'object') {
            return false;
        }

        // Check required fields
        if (!selectionData.text || selectionData.text.length === 0) {
            return false;
        }

        // Check text length limits
        if (selectionData.text.length > SELECTION_LIMITS.MAX_TEXT_LENGTH) {
            return false;
        }

        // Check type consistency
        if (selectionData.type !== this.selectionType) {
            return false;
        }

        return true;
    }

    /**
     * Create base selection data structure
     * @param {string} text - Selection text
     * @param {*} element - Associated element
     * @param {number} index - Selection index
     * @returns {Object} - Base selection data
     */
    createBaseSelectionData(text, element = null, index = -1) {
        return {
            text: this.sanitizeText(text),
            index,
            type: this.selectionType,
            element,
            timestamp: Date.now(),
            image: null
        };
    }

    /**
     * Sanitize text content to prevent XSS
     * @param {string} text - Raw text
     * @returns {string} - Sanitized text
     */
    sanitizeText(text) {
        if (typeof text !== 'string') {
            return '';
        }

        // Basic HTML sanitization - remove script tags and dangerous attributes
        return text
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim();
    }

    /**
     * Get selection type
     * @returns {string} - Selection type
     */
    getType() {
        return this.selectionType;
    }

    /**
     * Get strategy name for debugging
     * @returns {string} - Strategy class name
     */
    getName() {
        return this.constructor.name;
    }
}

module.exports = { BaseSelectionStrategy }; 