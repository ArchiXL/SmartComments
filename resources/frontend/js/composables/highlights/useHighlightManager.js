/**
 * Main highlight manager composable that orchestrates different highlight types
 */

const { useTextHighlight } = require('./useTextHighlight.js');
const { useSelectorHighlight } = require('./useSelectorHighlight.js');
const { useSVGHighlight } = require('./useSVGHighlight.js');
const { useHighlightListeners } = require('./useHighlightListeners.js');

function useHighlightManager() {
    // Initialize composables
    const { applyTextHighlight, removeTextHighlight } = useTextHighlight();
    const { applySelectorHighlight, removeSelectorHighlight } = useSelectorHighlight();
    const { applySVGHighlight, removeSVGHighlight } = useSVGHighlight();
    const {
        ensureClickListenerIsAttached,
        clearListenersForCommentId,
        clearAllListeners
    } = useHighlightListeners();

    /**
     * Apply highlights to the given element.
     * 
     * @param {Element} scopeElement - The element to apply highlights to.
     * @param {Array} highlights - The highlights to apply.
     * @param {Function} [onClick] - Optional callback for when a highlight is clicked.
     */
    function applyHighlights(scopeElement, highlights, onClick) {
        if (!highlights || !Array.isArray(highlights)) {
            console.warn('useHighlightManager: highlights must be an array of highlight objects.');
            return;
        }
        if (!window.rangy) {
            console.error("Rangy not initialized. Cannot apply highlights.");
            return;
        }

        highlights.forEach(highlightData => {
            if (!highlightData || !highlightData.type || !highlightData.comment || !highlightData.comment.rawComment) {
                console.warn('Skipping invalid highlightData (missing rawComment?):', highlightData);
                return;
            }

            const uniqueHighlightClass = `smartcomment-hl-${highlightData.comment.data_id}`;

            // Create a wrapper function to ensure click listener attachment
            const ensureClickListener = (targetEl, commentForListener) => {
                ensureClickListenerIsAttached(targetEl, commentForListener, onClick);
            };

            // Route to appropriate highlight handler based on type
            if (highlightData.type === 'selector') {
                applySelectorHighlight(scopeElement, highlightData, uniqueHighlightClass, ensureClickListener);
            } else if (highlightData.type === 'wordIndex') {
                applyTextHighlight(scopeElement, highlightData, uniqueHighlightClass, ensureClickListener);
            } else if (highlightData.type === 'svg') {
                applySVGHighlight(scopeElement, highlightData, uniqueHighlightClass, ensureClickListener);
            } else {
                console.warn('Unknown highlight type:', highlightData.type);
            }
        });
    }

    /**
     * Clear specific highlights from the given element.
     * 
     * @param {Element} scopeElement - The element to clear highlights from.
     * @param {Array} [highlightsToClear] - Specific highlights to remove. If not provided, attempts to clear all.
     */
    function clearHighlights(scopeElement, highlightsToClear) {
        if (!highlightsToClear || !Array.isArray(highlightsToClear)) {
            console.warn('clearHighlights: highlightsToClear was not an array or was null/undefined', highlightsToClear);
            return;
        }
        if (!window.rangy) return;

        highlightsToClear.forEach(highlightData => {
            if (!highlightData || !highlightData.comment || !highlightData.comment.data_id) return;

            const dataCommentIdStr = String(highlightData.comment.data_id);
            const uniqueHighlightClass = `smartcomment-hl-${dataCommentIdStr}`;

            // Clear event listeners for this comment
            clearListenersForCommentId(dataCommentIdStr);

            // Find elements with this highlight class
            const elements = scopeElement.querySelectorAll(`.${uniqueHighlightClass}`);

            if (elements.length === 0) return;

            // Route to appropriate removal handler based on type
            if (highlightData.type === 'wordIndex') {
                removeTextHighlight(uniqueHighlightClass, scopeElement, elements);
            } else if (highlightData.type === 'selector') {
                removeSelectorHighlight(uniqueHighlightClass, scopeElement, elements);
            } else if (highlightData.type === 'svg') {
                removeSVGHighlight(uniqueHighlightClass, scopeElement, elements);
            }
        });
    }

    /**
     * Clear all highlights from the given element (fallback method).
     * This is used when specific highlight data is not available.
     * 
     * @param {Element} scopeElement - The element to clear highlights from.
     */
    function clearAllHighlights(scopeElement) {
        console.warn('clearAllHighlights called without specific highlights. Clearing all managed listeners and DOM elements.');

        // Clear all known listeners
        clearAllListeners();

        // Clear all DOM elements that might have been highlighted
        const potentiallyHighlighted = scopeElement.querySelectorAll('[data-comment-id], [class*="smartcomment-hl-"]');
        potentiallyHighlighted.forEach(el => {
            // Remove all smartcomment highlight classes
            el.classList.forEach(cls => {
                if (cls.startsWith('smartcomment-hl-')) {
                    el.classList.remove(cls);
                }
            });

            // Remove data-comment-id if no smartcomment classes remain
            const hasSmartCommentClass = Array.from(el.classList).some(cls => cls.startsWith('smartcomment-hl-'));
            if (!hasSmartCommentClass) {
                el.removeAttribute('data-comment-id');
            }

            // Unwrap empty SPAN elements
            if (el.tagName === 'SPAN' &&
                el.classList.length === 0 &&
                !el.hasAttributes() &&
                el.innerHTML === el.textContent) {

                const parent = el.parentNode;
                if (parent) {
                    while (el.firstChild) {
                        parent.insertBefore(el.firstChild, el);
                    }
                    parent.removeChild(el);
                    try {
                        parent.normalize();
                    } catch (e) {
                        console.warn("Error normalizing parent node during general cleanup", e);
                    }
                }
            }
        });
    }

    /**
     * Remove highlight elements from DOM for a specific comment and unwrap SPAN elements properly.
     * This is used when a comment is deleted or completed.
     * 
     * @param {string|number} commentId - The ID of the comment to remove highlights for
     * @param {Element} [scopeElement] - The element to search within (defaults to mw-content-text or body)
     */
    function removeCommentHighlight(commentId, scopeElement = null) {
        if (!window.rangy) {
            console.warn('removeCommentHighlight: Rangy not available');
            return;
        }

        const targetElement = scopeElement || document.getElementById('mw-content-text') || document.body;
        const uniqueHighlightClass = `smartcomment-hl-${commentId}`;
        const commentIdStr = String(commentId);

        // Clear event listeners for this comment
        clearListenersForCommentId(commentIdStr);

        // Find all elements with this highlight class
        const elements = targetElement.querySelectorAll(`.${uniqueHighlightClass}`);

        if (elements.length === 0) {
            return;
        }

        // We need to determine the type to use the appropriate removal method
        // Check if elements are SPAN elements (likely text highlights)
        const hasSpanElements = Array.from(elements).some(el =>
            el.tagName === 'SPAN' && el.hasAttribute('data-comment-id')
        );

        // Check if elements have SVG-related attributes (likely SVG highlights)
        const hasSVGElements = Array.from(elements).some(el =>
            el.hasAttribute('data-svg-id') ||
            el.closest('svg') ||
            (el.tagName === 'a' && el.closest('svg'))
        );

        if (hasSpanElements) {
            // Use text highlight removal for SPAN elements
            removeTextHighlight(uniqueHighlightClass, targetElement, elements);
        } else if (hasSVGElements) {
            // Use SVG highlight removal for SVG elements
            removeSVGHighlight(uniqueHighlightClass, targetElement, elements);
        } else {
            // Use selector highlight removal for other elements
            removeSelectorHighlight(uniqueHighlightClass, targetElement, elements);
        }
    }

    return {
        applyHighlights,
        clearHighlights,
        clearAllHighlights,
        removeCommentHighlight
    };
}

module.exports = { useHighlightManager }; 