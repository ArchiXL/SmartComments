/**
 * Text highlighting composable for wordIndex type highlights
 */

/**
 * Get all text nodes in the given node.
 * 
 * @param {Element} node - The node to get text nodes from.
 * @param {Array} textNodes - The array to store the text nodes.
 * @returns {Array} The array of text nodes.
 */
function getTextNodesIn(node, textNodes = []) {
    if (node.nodeType === Node.TEXT_NODE) {
        if (node.nodeValue.trim() !== '') {
            textNodes.push(node);
        }
    } else {
        for (let i = 0, len = node.childNodes.length; i < len; ++i) {
            getTextNodesIn(node.childNodes[i], textNodes);
        }
    }
    return textNodes;
}

/**
 * Decode HTML entities in the given string.
 * 
 * @param {string} str - The string to decode.
 * @returns {string} The decoded string.
 */
function decodeHtmlEntities(str) {
    return str.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function useTextHighlight() {
    /**
     * Apply a highlight to the given element based on text and its occurrence index.
     * 
     * @param {Element} scopeElement - The element to apply the highlight to.
     * @param {Object} highlightData - The highlight data containing the comment information.
     * @param {Object} classApplier - The class applier to apply the highlight.
     */
    function applyTextIndexHighlight(scopeElement, highlightData, classApplier) {
        const { comment } = highlightData;
        if (!comment || !comment.pos) {
            console.warn('applyTextIndexHighlight: Missing comment or comment.pos', highlightData);
            return;
        }

        const posString = String(comment.pos);
        const lastPipePos = posString.lastIndexOf('|');
        if (lastPipePos === -1) {
            console.warn('applyTextIndexHighlight: Invalid pos string format (missing |)', posString);
            return;
        }

        let textToFind = posString.substring(0, lastPipePos);
        textToFind = decodeHtmlEntities(textToFind); // Ensure text is decoded

        const index = parseInt(posString.substring(lastPipePos + 1), 10);

        if (isNaN(index) || index < 0) { // Index should be 0 or positive
            console.warn('applyTextIndexHighlight: Invalid index (NaN or negative)', index, 'for pos:', posString);
            return;
        }

        // Rangy range for searching
        const searchRange = window.rangy.createRange();
        searchRange.selectNodeContents(scopeElement);

        let count = 0;
        let found = false;

        // Iterate through text nodes to find the Nth occurrence
        // rangy.findText is powerful but can be tricky with overlapping/adjacent matches.
        // A manual iteration like this, though more verbose, gives fine-grained control over occurrence counting.
        const textNodes = getTextNodesIn(scopeElement);
        for (const textNode of textNodes) {
            let localIndex = textNode.data.indexOf(textToFind);
            while (localIndex !== -1) {
                if (count === index) {
                    const matchRange = window.rangy.createRange();
                    matchRange.setStart(textNode, localIndex);
                    matchRange.setEnd(textNode, localIndex + textToFind.length);
                    try {
                        classApplier.applyToRange(matchRange);
                    } catch (e) {
                        console.error('Error applying classApplier to range:', e, { textNode, localIndex, textToFind, highlightData });
                    }
                    found = true;
                    break;
                }
                count++;
                localIndex = textNode.data.indexOf(textToFind, localIndex + textToFind.length); // search from after the current match
            }
            if (found) break;
        }

        if (!found) {
            console.warn('applyTextIndexHighlight: Text index highlight not found or applied for:', { textToFind, index, posString });
        }
    }

    /**
     * Apply text-based highlights to the given element.
     * 
     * @param {Element} scopeElement - The element to apply highlights to.
     * @param {Object} highlightData - The highlight data to apply.
     * @param {string} uniqueHighlightClass - The unique highlight class.
     * @param {Function} ensureClickListenerIsAttached - Function to ensure click listener is attached.
     */
    function applyTextHighlight(scopeElement, highlightData, uniqueHighlightClass, ensureClickListenerIsAttached) {
        if (!window.rangy) {
            console.error("Rangy not initialized. Cannot apply text highlights.");
            return;
        }

        const dataCommentId = String(highlightData.comment.data_id);

        let currentApplier = window.rangy.createClassApplier(uniqueHighlightClass, {
            ignoreWhiteSpace: true,
            elementTagName: 'span',
            normalize: true,
            onElementCreate: (spanEl, applier) => {
                spanEl.setAttribute('data-comment-id', dataCommentId);
                ensureClickListenerIsAttached(spanEl, highlightData.comment);
            }
        });

        // Call the consolidated function
        applyTextIndexHighlight(scopeElement, highlightData, currentApplier);

        // After Rangy application, explicitly find styled elements and ensure listeners.
        // This is a fallback if onElementCreate didn't fire for all elements or if attributes were missing.
        const createdOrClassedElements = scopeElement.querySelectorAll(`.${uniqueHighlightClass}`);
        if (createdOrClassedElements.length > 0) {
            createdOrClassedElements.forEach(elementNode => {
                // Ensure data-comment-id attribute is set (it might not be if onElementCreate didn't fire)
                if (!elementNode.getAttribute('data-comment-id')) {
                    elementNode.setAttribute('data-comment-id', dataCommentId);
                }
                // Ensure the listener is attached, relying on the idempotency of ensureClickListenerIsAttached.
                ensureClickListenerIsAttached(elementNode, highlightData.comment);
            });
        }
    }

    /**
     * Remove text-based highlights using Rangy's proper removal method
     * 
     * @param {string} uniqueHighlightClass - The unique highlight class to remove
     * @param {Element} scopeElement - The element to search within
     * @param {Array} elements - The elements to remove highlights from
     */
    function removeTextHighlight(uniqueHighlightClass, scopeElement, elements) {
        if (!window.rangy) {
            console.warn('removeTextHighlight: Rangy not available');
            return;
        }

        // Create a class applier for this specific highlight class to use Rangy's proper removal
        const classApplier = window.rangy.createClassApplier(uniqueHighlightClass, {
            ignoreWhiteSpace: true,
            elementTagName: 'span',
            normalize: true
        });

        elements.forEach(targetEl => {
            // Check if this element has any other smartcomment highlight classes
            const hasOtherSmartCommentClass = Array.from(targetEl.classList).some(cls =>
                cls.startsWith('smartcomment-hl-') && cls !== uniqueHighlightClass
            );

            // For SPAN elements that were likely created by Rangy's text highlighting,
            // use Rangy's proper removal method
            if (targetEl.tagName === 'SPAN' && targetEl.hasAttribute('data-comment-id')) {
                try {
                    // Create a range that encompasses this element's content
                    const range = window.rangy.createRange();
                    range.selectNodeContents(targetEl);

                    // Use the class applier to properly unapply the highlight
                    // This will automatically unwrap the SPAN if it becomes empty
                    classApplier.undoToRange(range);

                    // Remove data-comment-id if no other smartcomment classes remain
                    if (!hasOtherSmartCommentClass) {
                        targetEl.removeAttribute('data-comment-id');
                    }
                } catch (e) {
                    console.warn('removeTextHighlight: Error using Rangy undoToRange, falling back to manual removal:', e);
                    // Fallback to manual removal if Rangy method fails
                    manuallyRemoveTextHighlight(targetEl, uniqueHighlightClass, hasOtherSmartCommentClass);
                }
            }
        });
    }

    /**
     * Manually remove text highlight (fallback method)
     * @param {Element} targetEl - The element to remove highlighting from
     * @param {string} uniqueHighlightClass - The highlight class to remove
     * @param {boolean} hasOtherSmartCommentClass - Whether the element has other smartcomment classes
     */
    function manuallyRemoveTextHighlight(targetEl, uniqueHighlightClass, hasOtherSmartCommentClass) {
        targetEl.classList.remove(uniqueHighlightClass);

        // Remove data-comment-id if no other smartcomment classes remain
        if (!hasOtherSmartCommentClass) {
            targetEl.removeAttribute('data-comment-id');
        }

        // Unwrap SPAN elements that were created by highlighting and are now empty/unnecessary
        if (targetEl.tagName === 'SPAN') {
            const shouldUnwrap =
                // No more highlight classes
                !hasOtherSmartCommentClass &&
                // Either no classes at all, or only non-smartcomment classes
                (targetEl.classList.length === 0 ||
                    !Array.from(targetEl.classList).some(cls => cls.startsWith('smartcomment-'))) &&
                // No other attributes that would make this SPAN meaningful
                (!targetEl.hasAttributes() ||
                    (targetEl.attributes.length === 1 && targetEl.hasAttribute('class') && targetEl.classList.length === 0));

            if (shouldUnwrap) {
                const parent = targetEl.parentNode;
                if (parent) {
                    // Move all child nodes before the SPAN
                    while (targetEl.firstChild) {
                        parent.insertBefore(targetEl.firstChild, targetEl);
                    }
                    // Remove the empty SPAN
                    parent.removeChild(targetEl);
                    // Normalize to merge adjacent text nodes
                    try {
                        parent.normalize();
                    } catch (e) {
                        console.warn('manuallyRemoveTextHighlight: Error normalizing parent node:', e);
                    }
                }
            }
        }
    }

    return {
        applyTextHighlight,
        removeTextHighlight,
        // Utility functions that might be useful for other composables
        getTextNodesIn,
        decodeHtmlEntities
    };
}

module.exports = { useTextHighlight }; 