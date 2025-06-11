/**
 * Selection Strategy Factory
 * Implements Factory pattern for creating appropriate selection strategies
 * Manages strategy instances and provides unified interface
 */
import { TextSelectionStrategy } from '../strategies/TextSelectionStrategy.js';
import { ImageSelectionStrategy } from '../strategies/ImageSelectionStrategy.js';
import { SVGSelectionStrategy } from '../strategies/SVGSelectionStrategy.js';
import { DynamicBlockSelectionStrategy } from '../strategies/DynamicBlockSelectionStrategy.js';

class SelectionStrategyFactory {
    constructor() {
        this.strategies = new Map();
        this.defaultStrategy = null;
        this.initialized = false;
    }

    /**
     * Initialize the factory with all available strategies
     */
    initialize() {
        if (this.initialized) {
            return;
        }

        try {
            // Register all strategy types
            this.registerStrategy('text', new TextSelectionStrategy());
            this.registerStrategy('image', new ImageSelectionStrategy());
            this.registerStrategy('svg', new SVGSelectionStrategy());
            this.registerStrategy('dynamic-block', new DynamicBlockSelectionStrategy());

            // Set default strategy
            this.defaultStrategy = this.strategies.get('text');
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize Selection Strategy Factory:', error);
            this.initialized = false;
        }
    }

    /**
     * Register a new strategy
     * @param {string} type - Strategy type identifier
     * @param {BaseSelectionStrategy} strategy - Strategy instance
     */
    registerStrategy(type, strategy) {
        if (!type || !strategy) {
            throw new Error('Both type and strategy are required for registration');
        }

        if (this.strategies.has(type)) {
            console.warn(`Strategy type '${type}' already registered, overwriting`);
        }

        this.strategies.set(type, strategy);
    }

    /**
     * Get strategy by type
     * @param {string} type - Strategy type
     * @returns {BaseSelectionStrategy|null} - Strategy instance or null
     */
    getStrategy(type) {
        this.ensureInitialized();
        return this.strategies.get(type) || null;
    }

    /**
     * Determine appropriate strategy for a given target
     * @param {*} target - Selection target (element, range, etc.)
     * @param {Event} event - Interaction event
     * @returns {BaseSelectionStrategy|null} - Best matching strategy
     */
    determineStrategy(target, event) {
        this.ensureInitialized();

        // If target is a rangy selection or range, use text strategy
        if (this.isTextSelection(target)) {
            return this.getStrategy('text');
        }

        // If target is an element, determine based on element type
        if (target && target.nodeType === Node.ELEMENT_NODE) {
            return this.determineElementStrategy(target);
        }

        // Fallback to default strategy
        console.warn('Could not determine appropriate strategy for target:', target);
        return this.defaultStrategy;
    }

    /**
     * Determine strategy for element-based targets
     * @param {Element} element - Target element
     * @returns {BaseSelectionStrategy} - Appropriate strategy
     */
    determineElementStrategy(element) {
        // Check for SVG links first (most specific)
        const svgStrategy = this.getStrategy('svg');
        if (svgStrategy && svgStrategy.validateTarget(element)) {
            return svgStrategy;
        }

        // Check for dynamic blocks
        const dynamicBlockStrategy = this.getStrategy('dynamic-block');
        if (dynamicBlockStrategy && dynamicBlockStrategy.validateTarget(element)) {
            return dynamicBlockStrategy;
        }

        // Check for images
        const imageStrategy = this.getStrategy('image');
        if (imageStrategy && imageStrategy.validateTarget(element)) {
            return imageStrategy;
        }

        // Default to text strategy for other elements
        return this.getStrategy('text');
    }

    /**
     * Check if target represents a text selection
     * @param {*} target - Target to check
     * @returns {boolean} - Whether target is text selection
     */
    isTextSelection(target) {
        // Check for rangy selection object
        if (target && typeof target === 'object' && target.rangeCount !== undefined) {
            return target.rangeCount > 0 && !target.isCollapsed;
        }

        // Check for rangy range object
        if (target && typeof target === 'object' &&
            typeof target.toString === 'function' &&
            typeof target.toHtml === 'function') {
            return true;
        }

        return false;
    }

    /**
     * Process selection using the appropriate strategy
     * @param {*} target - Selection target
     * @param {Event} event - Interaction event
     * @param {Object} options - Processing options
     * @returns {Promise<Object|null>} - Selection result
     */
    async processSelection(target, event, options = {}) {
        this.ensureInitialized();

        const strategy = this.determineStrategy(target, event);
        if (!strategy) {
            console.error('No strategy available for target:', target);
            return null;
        }

        try {
            const result = await strategy.processSelection(target, event, options);

            // Add strategy information to result for debugging
            if (result) {
                result._strategy = {
                    type: strategy.getType(),
                    name: strategy.getName()
                };
            }

            return result;
        } catch (error) {
            console.error(`Strategy ${strategy.getName()} failed:`, error);
            return null;
        }
    }

    /**
     * Get all registered strategy types
     * @returns {string[]} - Array of strategy type names
     */
    getRegisteredTypes() {
        this.ensureInitialized();
        return Array.from(this.strategies.keys());
    }

    /**
     * Get factory statistics
     * @returns {Object} - Factory statistics
     */
    getStatistics() {
        return {
            initialized: this.initialized,
            strategyCount: this.strategies.size,
            registeredTypes: this.getRegisteredTypes(),
            defaultStrategy: this.defaultStrategy ? this.defaultStrategy.getName() : null
        };
    }

    /**
     * Reset factory (for testing)
     */
    reset() {
        this.strategies.clear();
        this.defaultStrategy = null;
        this.initialized = false;
    }

    /**
     * Ensure factory is initialized
     */
    ensureInitialized() {
        if (!this.initialized) {
            this.initialize();
        }
    }

    /**
     * Setup all strategies (delegate to individual strategy setup methods)
     */
    setupStrategies() {
        this.ensureInitialized();

        // Setup image strategy (wraps images in dynamic blocks)
        const imageStrategy = this.getStrategy('image');
        if (imageStrategy && typeof imageStrategy.setupImageSelection === 'function') {
            imageStrategy.setupImageSelection();
        }
    }

    /**
     * Validate that a strategy implements required interface
     * @param {*} strategy - Strategy to validate
     * @returns {boolean} - Whether strategy is valid
     */
    validateStrategy(strategy) {
        if (!strategy || typeof strategy !== 'object') {
            return false;
        }

        // Check required methods
        const requiredMethods = ['processSelection', 'validateTarget', 'getType', 'getName'];
        return requiredMethods.every(method => typeof strategy[method] === 'function');
    }

    /**
     * Get strategy by element inspection
     * @param {Element} element - Element to inspect
     * @returns {BaseSelectionStrategy|null} - Matching strategy
     */
    getStrategyByElement(element) {
        this.ensureInitialized();

        for (const [type, strategy] of this.strategies) {
            if (strategy.validateTarget(element)) {
                return strategy;
            }
        }

        return this.defaultStrategy;
    }
}

// Create and export singleton instance
export const selectionStrategyFactory = new SelectionStrategyFactory(); 