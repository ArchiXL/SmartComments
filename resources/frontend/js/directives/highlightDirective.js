module.exports = {
    highlightDirective: {
        mounted(el, binding) {
            applyHighlights(document.body, binding.value.anchors, binding.value.onClick);
        },
        updated(el, binding) {
            clearAllHighlights(document.body, binding.oldValue ? binding.oldValue.anchors : []);
            applyHighlights(document.body, binding.value.anchors, binding.value.onClick);
        },
        beforeUnmount(el, binding) {
            clearAllHighlights(document.body, binding.value ? binding.value.anchors : []);
        }
    }
};

/**
 * Store attached event listeners to be able to remove them later.
 * Key: data-comment-id (string), Value: Array of { element: HTMLElement, handler: Function, type: string }
 */
const attachedListeners = new Map();

/**
 * Apply highlights to the given element.
 * 
 * @param {Element} scopeElement - The element to apply highlights to.
 * @param {Array} highlights - The highlights to apply.
 * @param {Function} [onClick] - Optional callback for when a highlight is clicked.
 */
function applyHighlights(scopeElement, highlights, onClick) {
    if (!highlights || !Array.isArray(highlights)) {
        console.warn('highlightDirective: binding.value.anchors must be an array of highlight objects.');
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
        const dataCommentId = String(highlightData.comment.data_id); // Ensure it's a string for Map keys

        // Idempotent function to add click listener
        const ensureClickListenerIsAttached = (targetEl, commentForListener) => {
            const currentDataCommentId = String(commentForListener.data_id);

            let listenersForId = attachedListeners.get(currentDataCommentId);
            if (listenersForId && listenersForId.some(l => l.element === targetEl && l.type === 'click')) {
                return; // Already attached
            }

            if (onClick && typeof onClick === 'function') {
                const clickHandler = (event) => {
                    event.stopPropagation(); // Prevent event from bubbling up
                    const rect = targetEl.getBoundingClientRect();
                    const position = {
                        top: rect.top + window.scrollY,
                        left: rect.left + window.scrollX,
                        bottom: rect.bottom + window.scrollY,
                        right: rect.right + window.scrollX,
                        width: rect.width,
                        height: rect.height
                    };
                    onClick(commentForListener, position);
                };
                targetEl.addEventListener('click', clickHandler);
                targetEl.style.cursor = 'pointer'; // Indicate clickable

                if (!attachedListeners.has(currentDataCommentId)) {
                    attachedListeners.set(currentDataCommentId, []);
                }
                attachedListeners.get(currentDataCommentId).push({ element: targetEl, handler: clickHandler, type: 'click' });
                console.log(`highlightDirective: Click listener ADDED for comment ID ${currentDataCommentId} on element:`, targetEl);
            }
        };

        if (highlightData.type === 'jQuery') {
            applyJQueryHighlight(scopeElement, highlightData, uniqueHighlightClass, (el) => ensureClickListenerIsAttached(el, highlightData.comment));
        } else { // Rangy based
            let currentApplier = window.rangy.createClassApplier(uniqueHighlightClass, {
                ignoreWhiteSpace: true,
                elementTagName: 'span',
                normalize: true,
                onElementCreate: (spanEl, applier) => {
                    console.log('highlightDirective: onElementCreate fired for comment ID:', dataCommentId, 'spanEl:', spanEl);
                    spanEl.setAttribute('data-comment-id', dataCommentId);
                    ensureClickListenerIsAttached(spanEl, highlightData.comment);
                }
            });

            if (highlightData.type === 'findSelectionIndex') {
                applyFindSelectionIndexHighlight(scopeElement, highlightData, currentApplier);
            } else if (highlightData.type === 'wordIndex') {
                applyWordIndexHighlight(scopeElement, highlightData, currentApplier);
            } else {
                console.warn('Unknown highlight type:', highlightData.type);
            }

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
    });
}

/**
 * Apply a highlight to the given element based on the selection index.
 * 
 * @param {Element} scopeElement - The element to apply the highlight to.
 * @param {Object} highlightData - The highlight data containing the comment information.
 * @param {Object} classApplier - The class applier to apply the highlight.
*/
function applyFindSelectionIndexHighlight(scopeElement, highlightData, classApplier) {
    const { comment } = highlightData;
    if (!comment || !comment.pos) return;

    const posString = String(comment.pos);
    const lastPipePos = posString.lastIndexOf('|');
    if (lastPipePos === -1) return;

    let textToFind = posString.substring(0, lastPipePos);
    textToFind = decodeHtmlEntities(textToFind);

    const index = parseInt(posString.substring(lastPipePos + 1), 10);

    if (isNaN(index) || index === -1) return;

    const range = window.rangy.createRange();
    range.selectNodeContents(scopeElement);

    const searchScopeRange = window.rangy.createRange();
    searchScopeRange.selectNodeContents(scopeElement);

    let count = 0;
    const options = {
        caseSensitive: true,
        withinRange: searchScopeRange,
        wholeWordsOnly: false
    };

    const textNodes = getTextNodesIn(scopeElement);
    let found = false;
    for (const textNode of textNodes) {
        let localIndex = textNode.data.indexOf(textToFind);
        while (localIndex !== -1) {
            if (count === index) {
                const matchRange = window.rangy.createRange();
                matchRange.setStart(textNode, localIndex);
                matchRange.setEnd(textNode, localIndex + textToFind.length);
                classApplier.applyToRange(matchRange);
                found = true;
                break;
            }
            count++;
            localIndex = textNode.data.indexOf(textToFind, localIndex + textToFind.length);
        }
        if (found) break;
    }
}

/**
 * Apply a highlight to the given element based on the word index.
 * 
 * @param {Element} scopeElement - The element to apply the highlight to.
 * @param {Object} highlightData - The highlight data containing the comment information.
 * @param {Object} classApplier - The class applier to apply the highlight.
*/
function applyWordIndexHighlight(scopeElement, highlightData, classApplier) {
    const { comment } = highlightData;
    if (!comment || !comment.pos) return;

    const posString = String(comment.pos);
    const lastPipePos = posString.lastIndexOf('|');
    if (lastPipePos === -1) return;

    let textToFind = posString.substring(0, lastPipePos);
    textToFind = decodeHtmlEntities(textToFind);

    const index = parseInt(posString.substring(lastPipePos + 1), 10);
    if (isNaN(index) || index === -1) return;

    const range = window.rangy.createRange();
    range.selectNodeContents(scopeElement);

    const searchScopeRange = window.rangy.createRange();
    searchScopeRange.selectNodeContents(scopeElement);

    let count = 0;
    const options = {
        caseSensitive: true,
        withinRange: searchScopeRange,
        wholeWordsOnly: false
    };

    const textNodes = getTextNodesIn(scopeElement);
    let found = false;
    for (const textNode of textNodes) {
        let localIndex = textNode.data.indexOf(textToFind);
        while (localIndex !== -1) {
            if (count === index) {
                const matchRange = window.rangy.createRange();
                matchRange.setStart(textNode, localIndex);
                matchRange.setEnd(textNode, localIndex + textToFind.length);
                classApplier.applyToRange(matchRange);
                found = true;
                break;
            }
            count++;
            localIndex = textNode.data.indexOf(textToFind, localIndex + textToFind.length);
        }
        if (found) break;
    }
}

/**
 * Apply a highlight to the given element based on the jQuery selector.
 * 
 * @param {Element} scopeElement - The element to apply the highlight to.
 * @param {Object} highlightData - The highlight data containing the comment information.
 * @param {string} uniqueHighlightClassString - The unique highlight class string.
 * @param {Function} addClickListener - Function to add click listener to the target element.
 */
function applyJQueryHighlight(scopeElement, highlightData, uniqueHighlightClassString, addClickListener) {
    const { comment } = highlightData;
    if (!comment || !comment.pos) return;

    let selector = comment.pos;
    const classesToAdd = uniqueHighlightClassString.split(' ');
    const dataCommentId = String(comment.data_id);

    if (selector.startsWith('img[')) {
        const hash = selector.replace('img[', '').replace(']', '');
        const images = scopeElement.querySelectorAll('img');
        images.forEach(img => {
            if (img.getAttribute('data-original-hash') === hash || img.src.includes(hash) || (comment.image_hash && img.src.includes(comment.image_hash))) {
                const parent = img.closest('figure') || img.parentElement;
                if (parent && parent !== scopeElement) { // Ensure parent is not the body itself if highlighting images directly under body
                    parent.classList.add(...classesToAdd);
                    parent.setAttribute('data-comment-id', dataCommentId);
                    addClickListener(parent);
                } else {
                    img.classList.add(...classesToAdd);
                    img.setAttribute('data-comment-id', dataCommentId);
                    addClickListener(img);
                }
            }
        });
    } else {
        try {
            const elements = scopeElement.querySelectorAll(selector);
            elements.forEach(targetEl => {
                targetEl.classList.add(...classesToAdd);
                targetEl.setAttribute('data-comment-id', dataCommentId);
                addClickListener(targetEl);
            });
        } catch (e) {
            console.error("Error applying jQuery highlight with selector:", selector, e);
        }
    }
}

/**
 * Clear all highlights from the given element.
 * 
 * @param {Element} scopeElement - The element to clear highlights from.
 * @param {Array} [highlightsToClear] - Specific highlights to remove. If not provided, attempts to clear all.
 */
function clearAllHighlights(scopeElement, highlightsToClear) {
    console.log('clearAllHighlights called with:', highlightsToClear);
    if (!highlightsToClear || !Array.isArray(highlightsToClear)) {
        console.warn('clearAllHighlights: highlightsToClear was not an array or was null/undefined', highlightsToClear);
        return;
    }
    if (!window.rangy) return;

    const clearListenersForCommentId = (commentIdStr) => {
        if (attachedListeners.has(commentIdStr)) {
            attachedListeners.get(commentIdStr).forEach(({ element, handler, type }) => {
                element.removeEventListener(type, handler);
                element.style.cursor = ''; // Reset cursor
            });
            attachedListeners.delete(commentIdStr);
        }
    };

    const clearHighlightElements = (commentIdStr, uniqueHighlightClass) => {
        const elements = scopeElement.querySelectorAll(`.${uniqueHighlightClass}`);
        elements.forEach(targetEl => {
            targetEl.classList.remove(uniqueHighlightClass);
            const hasOtherSmartCommentClass = Array.from(targetEl.classList).some(cls => cls.startsWith('smartcomment-hl-'));
            if (!hasOtherSmartCommentClass) {
                targetEl.removeAttribute('data-comment-id');
            }

            if (targetEl.tagName === 'SPAN' && targetEl.classList.length === 0 &&
                !targetEl.hasAttributes() &&
                !hasOtherSmartCommentClass &&
                targetEl.innerHTML === targetEl.textContent
            ) {
                const parent = targetEl.parentNode;
                if (parent) {
                    while (targetEl.firstChild) {
                        parent.insertBefore(targetEl.firstChild, targetEl);
                    }
                    parent.removeChild(targetEl);
                    parent.normalize();
                }
            }
        });
    };


    if (highlightsToClear && Array.isArray(highlightsToClear)) {
        highlightsToClear.forEach(highlightData => {
            if (!highlightData || !highlightData.comment || !highlightData.comment.data_id) return;
            const dataCommentIdStr = String(highlightData.comment.data_id);
            const uniqueHighlightClass = `smartcomment-hl-${dataCommentIdStr}`;

            clearListenersForCommentId(dataCommentIdStr);
            clearHighlightElements(dataCommentIdStr, uniqueHighlightClass);
        });
    } else {
        // Fallback to clear all managed listeners and then search for any remaining highlight classes/attributes
        console.warn('clearAllHighlights called without specific highlights. Clearing all managed listeners and DOM elements.');

        // Clear all known listeners
        attachedListeners.forEach((listeners, commentIdStr) => {
            listeners.forEach(({ element, handler, type }) => {
                element.removeEventListener(type, handler);
                if (element) element.style.cursor = '';
            });
        });
        attachedListeners.clear();

        // Clear all DOM elements that might have been highlighted
        const potentiallyHighlighted = scopeElement.querySelectorAll('[data-comment-id^="smartcomment-hl-"], [class*="smartcomment-hl-"]');
        potentiallyHighlighted.forEach(el => {
            const commentId = el.getAttribute('data-comment-id');
            if (commentId) {
                const uniqueHighlightClass = `smartcomment-hl-${commentId}`;
                el.classList.remove(uniqueHighlightClass);
                // Remove other smartcomment classes if any, though less direct here
                el.classList.forEach(cls => {
                    if (cls.startsWith('smartcomment-hl-')) {
                        el.classList.remove(cls);
                    }
                });
                if (!Array.from(el.classList).some(cls => cls.startsWith('smartcomment-hl-'))) {
                    el.removeAttribute('data-comment-id');
                }
            } else {
                el.classList.forEach(cls => {
                    if (cls.startsWith('smartcomment-hl-')) {
                        el.classList.remove(cls);
                    }
                });
            }


            if (el.tagName === 'SPAN' && el.classList.length === 0 && !el.hasAttributes() && el.innerHTML === el.textContent) {
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
}

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
