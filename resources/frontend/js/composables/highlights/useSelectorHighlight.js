/**
 * Selector-based highlighting composable for CSS selector and dynamic block highlights
 */

function useSelectorHighlight() {
    /**
     * Apply a highlight to the given element based on the CSS selector.
     * 
     * @param {Element} scopeElement - The element to apply the highlight to.
     * @param {Object} highlightData - The highlight data containing the comment information.
     * @param {string} uniqueHighlightClass - The unique highlight class string.
     * @param {Function} addClickListener - Function to add click listener to the target element.
     */
    function applySelectorHighlight(scopeElement, highlightData, uniqueHighlightClass, addClickListener) {
        const { comment } = highlightData;
        if (!comment || !comment.pos) {
            console.warn('applySelectorHighlight: Missing comment or comment.pos', highlightData);
            return;
        }

        let selector = comment.pos;
        const classesToAdd = uniqueHighlightClass.split(' ');
        const dataCommentId = String(comment.data_id);

        if (selector.startsWith('img[')) {
            applyImageSelectorHighlight(scopeElement, selector, comment, classesToAdd, dataCommentId, addClickListener);
        } else {
            applyGenericSelectorHighlight(scopeElement, selector, comment, classesToAdd, dataCommentId, addClickListener);
        }
    }

    /**
     * Apply image selector highlighting (img[hash] format)
     * 
     * @param {Element} scopeElement - The element to apply the highlight to
     * @param {string} selector - The image selector
     * @param {Object} comment - The comment data
     * @param {Array} classesToAdd - Classes to add for highlighting
     * @param {string} dataCommentId - The comment ID as string
     * @param {Function} addClickListener - Function to add click listener
     */
    function applyImageSelectorHighlight(scopeElement, selector, comment, classesToAdd, dataCommentId, addClickListener) {
        const hash = selector.replace('img[', '').replace(']', '');

        // First, try to find elements with data-hash attribute that matches the selector
        const dynamicBlocksWithHash = scopeElement.querySelectorAll(`[data-hash="${selector}"]`);
        if (dynamicBlocksWithHash.length > 0) {
            dynamicBlocksWithHash.forEach(element => {
                // Apply highlighting directly to the element with data-hash
                element.classList.add(...classesToAdd);
                element.setAttribute('data-comment-id', dataCommentId);
                addClickListener(element, comment);
            });
            return; // Exit early if we found dynamic blocks
        }

        // Fallback to original image matching logic
        const images = scopeElement.querySelectorAll('img');
        images.forEach(img => {
            if (img.getAttribute('data-original-hash') === hash ||
                img.src.includes(hash) ||
                (comment.image_hash && img.src.includes(comment.image_hash))) {

                const parent = img.closest('figure') || img.parentElement;
                if (parent && parent !== scopeElement) { // Ensure parent is not the body itself if highlighting images directly under body
                    parent.classList.add(...classesToAdd);
                    parent.setAttribute('data-comment-id', dataCommentId);
                    addClickListener(parent, comment);
                } else {
                    img.classList.add(...classesToAdd);
                    img.setAttribute('data-comment-id', dataCommentId);
                    addClickListener(img, comment);
                }
            }
        });
    }

    /**
     * Apply generic CSS selector highlighting
     * 
     * @param {Element} scopeElement - The element to apply the highlight to
     * @param {string} selector - The CSS selector
     * @param {Object} comment - The comment data
     * @param {Array} classesToAdd - Classes to add for highlighting
     * @param {string} dataCommentId - The comment ID as string
     * @param {Function} addClickListener - Function to add click listener
     */
    function applyGenericSelectorHighlight(scopeElement, selector, comment, classesToAdd, dataCommentId, addClickListener) {
        try {
            const elements = scopeElement.querySelectorAll(selector);
            elements.forEach(targetEl => {
                targetEl.classList.add(...classesToAdd);
                targetEl.setAttribute('data-comment-id', dataCommentId);
                addClickListener(targetEl, comment);
            });
        } catch (e) {
            console.error("Error applying selector highlight with selector:", selector, e);
        }
    }

    /**
     * Remove selector-based highlights
     * 
     * @param {string} uniqueHighlightClass - The unique highlight class to remove
     * @param {Element} scopeElement - The element to search within
     * @param {Array} elements - The elements to remove highlights from
     */
    function removeSelectorHighlight(uniqueHighlightClass, scopeElement, elements) {
        elements.forEach(targetEl => {
            // Check if this element has any other smartcomment highlight classes
            const hasOtherSmartCommentClass = Array.from(targetEl.classList).some(cls =>
                cls.startsWith('smartcomment-hl-') && cls !== uniqueHighlightClass
            );

            // For selector-based highlights, remove manually
            targetEl.classList.remove(uniqueHighlightClass);

            // Remove data-comment-id if no other smartcomment classes remain
            if (!hasOtherSmartCommentClass) {
                targetEl.removeAttribute('data-comment-id');
            }
        });
    }

    return {
        applySelectorHighlight,
        removeSelectorHighlight
    };
}

module.exports = { useSelectorHighlight }; 