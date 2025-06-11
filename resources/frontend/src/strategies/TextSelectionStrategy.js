/**
 * Text Selection Strategy
 * Handles text-based selections with enhanced security and performance
 */
import BaseSelectionStrategy from './BaseSelectionStrategy.js';
import {
    initializeRangy,
    validateSelectionContent
} from '../composables/selection/shared/SelectionUtils.js';
import { SELECTION_ENUMS, getMediaWikiContentRoot } from '../utils/constants.js';
import {
    SELECTION_TIMEOUTS,
    SELECTION_LIMITS,
    SELECTION_PATTERNS,
    SELECTION_CLASSES
} from '../composables/selection/shared/SelectionConstants.js';

class TextSelectionStrategy extends BaseSelectionStrategy {
    constructor() {
        super('text');
        this.rangyInitialized = false;
        this.highlighter = null;
    }

    /**
     * Validate text selection target (rangy selection/range)
     * @param {*} target - Rangy selection or range
     * @returns {boolean} - Whether target is valid
     */
    validateTarget(target) {
        if (!target) return false;

        // Check if target is a rangy range or selection
        if (target.rangeCount !== undefined) {
            // It's a selection object
            return target.rangeCount > 0 && !target.isCollapsed;
        }

        // Check if target is a range object
        if (target.toString && target.toHtml) {
            return true;
        }

        return false;
    }

    /**
     * Process text selection
     * @param {Range|Selection} target - Rangy range or selection
     * @param {Event} event - Mouse event
     * @param {Object} options - Processing options
     * @returns {Promise<Object|null>} - Selection result
     */
    async processSelection(target, event, options = {}) {
        if (!await this.preProcess(target, event, options)) {
            return null;
        }

        try {
            // Ensure rangy is initialized
            if (!this.ensureRangyInitialized()) {
                throw new Error('Rangy library not available');
            }

            // Get the range from selection if needed
            const range = target.rangeCount !== undefined
                ? target.getRangeAt(0)
                : target;

            // Validate selection content
            const validationResult = validateSelectionContent(range);
            if (!this.errorHandler.handleValidationError(validationResult, this.selectionType)) {
                return null;
            }

            // Extract text and index safely
            const selectionData = await this.extractTextAndIndex(range);

            // Add element reference for parent comment detection
            selectionData.element = this.getSelectionElement(range);

            return await this.postProcess(selectionData, range, event, options);

        } catch (error) {
            this.errorHandler.handleSelectionError(this.selectionType, error, {
                target,
                event,
                options
            });
            return null;
        }
    }

    /**
     * Prepare screenshot parameters for text selections
     * @param {Range} target - Selection range
     * @param {Event} event - Mouse event
     * @param {Object} selectionData - Selection data
     * @returns {Object} - Screenshot parameters
     */
    prepareScreenshotParams(target, event, selectionData) {
        // Apply temporary highlight for screenshot
        this.applyTemporaryHighlight(target);

        // Calculate position from range
        const rect = target.getBoundingClientRect
            ? target.getBoundingClientRect()
            : this.getRangeRect(target);

        return {
            selectionPosition: {
                x: event?.clientX || rect.right,
                y: event?.clientY || rect.bottom
            },
            startPosition: {
                x: rect.left,
                y: rect.top
            },
            text: selectionData.text,
            cleanupCallback: () => this.clearTemporaryHighlight()
        };
    }

    /**
     * Enhanced post-processing for text selections
     * @param {Object} selectionData - Raw selection data
     * @param {Range} target - Original range
     * @param {Event} event - Original event
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} - Enhanced selection data
     */
    async postProcess(selectionData, target, event, options) {
        let highlightApplied = false;
        let highlightElement = null;

        try {
            // Apply temporary highlight before screenshot if needed
            if (options.captureScreenshot) {
                highlightElement = this.applyTemporaryHighlight(target);
                highlightApplied = true;

                // Add small delay to ensure highlighting is rendered
                await new Promise(resolve => setTimeout(resolve, 50));

                // Use the highlight element as the screenshot target
                if (highlightElement) {
                    selectionData.element = highlightElement;
                }
            }

            const result = await super.postProcess(selectionData, target, event, options);
            return result;
        } finally {
            // Always clean up highlight if it was applied
            if (highlightApplied) {
                // Add small delay before cleanup to ensure screenshot is complete
                setTimeout(() => {
                    this.clearTemporaryHighlight();
                }, 100);
            }
        }
    }

    /**
     * Extract text content and find its index safely
     * @param {Range} range - Selection range
     * @returns {Promise<Object>} - Text and index data
     */
    async extractTextAndIndex(range) {
        return new Promise((resolve, reject) => {
            try {
                const baseEl = getMediaWikiContentRoot();
                if (!baseEl) {
                    reject(new Error('MediaWiki content root not found'));
                    return;
                }

                const selectionPos = rangy.serializeRange(range);
                const searchText = this.sanitizeText(range.toString());
                const searchHtml = range.toHtml();

                // Validate content length
                if (searchText.length > SELECTION_LIMITS.MAX_TEXT_LENGTH) {
                    reject(new Error(`Selection too long: ${searchText.length} characters`));
                    return;
                }

                if (!searchText && !searchHtml) {
                    reject(new Error('Selection is empty'));
                    return;
                }

                // Choose search method based on content
                if (SELECTION_PATTERNS.HTML_TAG_REGEX.test(searchHtml)) {
                    this.searchHTMLContent(baseEl, range, searchText, searchHtml, resolve, reject);
                } else {
                    this.searchPlainText(baseEl, range, searchText, selectionPos, resolve, reject);
                }

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Search for plain text content
     * @param {Element} baseEl - Search base element
     * @param {Range} range - Original range
     * @param {string} searchText - Text to search for
     * @param {string} selectionPos - Serialized range position
     * @param {Function} resolve - Promise resolve
     * @param {Function} reject - Promise reject
     */
    searchPlainText(baseEl, range, searchText, selectionPos, resolve, reject) {
        const searchRange = rangy.createRange();
        searchRange.selectNodeContents(baseEl);

        const findOptions = {
            caseSensitive: true,
            withinRange: searchRange
        };

        // Check if text exists at all
        const testRange = rangy.createRange();
        testRange.selectNodeContents(baseEl);
        if (!testRange.findText(searchText, findOptions)) {
            reject(new Error(`Text "${searchText}" not found in content`));
            return;
        }

        // Find the exact occurrence
        this.findTextOccurrence(baseEl, searchText, selectionPos, 0, resolve, reject);
    }

    /**
     * Search for HTML content safely
     * @param {Element} baseEl - Search base element
     * @param {Range} range - Original range
     * @param {string} searchText - Plain text version
     * @param {string} searchHtml - HTML version
     * @param {Function} resolve - Promise resolve
     * @param {Function} reject - Promise reject
     */
    searchHTMLContent(baseEl, range, searchText, searchHtml, resolve, reject) {
        // For HTML content, use a safer approach with DOM walker
        const walker = document.createTreeWalker(
            baseEl,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let currentNode;
        let foundOccurrences = 0;
        let searchIndex = 0;
        const targetText = searchText;

        while (currentNode = walker.nextNode()) {
            const nodeText = currentNode.textContent;

            for (let i = 0; i < nodeText.length; i++) {
                if (nodeText[i] === targetText[searchIndex]) {
                    searchIndex++;
                    if (searchIndex === targetText.length) {
                        // Found complete match, check if it's our target
                        if (this.isTargetMatch(currentNode, range)) {
                            resolve({
                                text: this.sanitizeText(searchHtml),
                                index: foundOccurrences,
                                type: 'text'
                            });
                            return;
                        }
                        foundOccurrences++;
                        searchIndex = 0;
                    }
                } else {
                    searchIndex = 0;
                }
            }
        }

        reject(new Error('HTML selection not found at specified position'));
    }

    /**
     * Find specific text occurrence with async processing
     * @param {Element} baseEl - Search base
     * @param {string} searchText - Text to find
     * @param {string} targetPos - Target position
     * @param {number} occurrenceIndex - Current occurrence count
     * @param {Function} resolve - Promise resolve
     * @param {Function} reject - Promise reject
     */
    findTextOccurrence(baseEl, searchText, targetPos, occurrenceIndex, resolve, reject) {
        const range = rangy.createRange();
        const searchRange = rangy.createRange();
        searchRange.selectNodeContents(baseEl);

        const findOptions = {
            caseSensitive: true,
            withinRange: searchRange
        };

        // Use requestAnimationFrame for non-blocking search
        const searchStep = () => {
            if (occurrenceIndex > SELECTION_LIMITS.MAX_SEARCH_ITERATIONS) {
                reject(new Error('Search iteration limit exceeded'));
                return;
            }

            try {
                if (range.findText(searchText, findOptions)) {
                    if (rangy.serializeRange(range) === targetPos) {
                        resolve({
                            text: searchText,
                            index: occurrenceIndex,
                            type: 'text'
                        });
                        return;
                    }

                    // Move to next occurrence
                    range.collapse(false);
                    occurrenceIndex++;
                    requestAnimationFrame(searchStep);
                } else {
                    reject(new Error(`Text not found at position after ${occurrenceIndex} occurrences`));
                }
            } catch (error) {
                reject(error);
            }
        };

        searchStep();
    }

    /**
     * Check if a text node match corresponds to our target range
     * @param {Node} textNode - Text node that matched
     * @param {Range} targetRange - Original selection range
     * @returns {boolean} - Whether this is the target match
     */
    isTargetMatch(textNode, targetRange) {
        return textNode.parentNode.contains(targetRange.endContainer) &&
            textNode.parentNode.contains(targetRange.startContainer);
    }

    /**
     * Get element associated with selection range
     * @param {Range} range - Selection range
     * @returns {Element} - Associated element
     */
    getSelectionElement(range) {
        if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
            return range.startContainer;
        }
        return range.startContainer.parentElement || range.startContainer.parentNode;
    }

    /**
     * Get bounding rectangle for range
     * @param {Range} range - Range object
     * @returns {DOMRect} - Bounding rectangle
     */
    getRangeRect(range) {
        try {
            return range.getBoundingClientRect();
        } catch (error) {
            // Fallback for ranges without getBoundingClientRect
            const element = this.getSelectionElement(range);
            return element ? element.getBoundingClientRect() : { left: 0, top: 0, right: 0, bottom: 0 };
        }
    }

    /**
     * Apply temporary highlight for screenshot
     * @param {Range} range - Range to highlight
     */
    applyTemporaryHighlight(range) {
        try {
            // Create a simple span element with highlight styling
            const span = document.createElement('span');
            span.className = SELECTION_CLASSES.TEMP_HIGHLIGHT;
            span.style.backgroundColor = '#ffffe0'; // Light yellow background
            span.style.borderTop = '1px solid rgba(0,0,0,0.2)';
            span.style.borderBottom = '1px solid rgba(0,0,0,0.2)';

            // Surround the range contents with the highlight span
            if (range.canSurroundContents()) {
                range.surroundContents(span);
                return span;
            } else {
                // Fallback for complex selections
                const contents = range.extractContents();
                span.appendChild(contents);
                range.insertNode(span);
                return span;
            }
        } catch (error) {
            console.warn('Failed to apply temporary highlight:', error);
            return null;
        }
    }

    /**
     * Clear temporary highlight
     */
    clearTemporaryHighlight() {
        try {
            // Remove all temporary highlight elements
            const tempHighlights = document.querySelectorAll(`.${SELECTION_CLASSES.TEMP_HIGHLIGHT}`);
            tempHighlights.forEach(element => {
                // Replace the highlighted element with its text content
                const parent = element.parentNode;
                if (parent) {
                    parent.replaceChild(document.createTextNode(element.textContent), element);
                    parent.normalize(); // Merge adjacent text nodes
                }
            });

        } catch (error) {
            console.warn('Failed to clear temporary highlight:', error);
        }
    }

    /**
     * Ensure rangy library is initialized
     * @returns {boolean} - Whether rangy is available
     */
    ensureRangyInitialized() {
        if (!this.rangyInitialized) {
            this.rangyInitialized = initializeRangy();
            // We don't need the complex highlighter for temporary highlighting
            // Simple DOM manipulation will work better for screenshots
        }
        return this.rangyInitialized;
    }
}

export { TextSelectionStrategy }; 