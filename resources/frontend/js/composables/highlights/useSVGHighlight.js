/**
 * SVG highlighting composable for svg[id] type highlights
 */

function useSVGHighlight() {
    /**
     * Apply a highlight to SVG elements based on the svg[id] selector.
     * 
     * @param {Element} scopeElement - The element to apply the highlight to.
     * @param {Object} highlightData - The highlight data containing the comment information.
     * @param {string} uniqueHighlightClass - The unique highlight class string.
     * @param {Function} addClickListener - Function to add click listener to the target element.
     */
    function applySVGHighlight(scopeElement, highlightData, uniqueHighlightClass, addClickListener) {
        const { comment } = highlightData;
        if (!comment || !comment.pos) {
            console.warn('applySVGHighlight: Missing comment or comment.pos', highlightData);
            return;
        }

        const selector = comment.pos;
        const classesToAdd = uniqueHighlightClass.split(' ');
        const dataCommentId = String(comment.data_id);

        // Extract SVG ID from svg[id] format
        if (!selector.startsWith('svg[') || !selector.endsWith(']')) {
            console.warn('applySVGHighlight: Invalid SVG selector format:', selector);
            return;
        }

        const svgId = selector.slice(4, -1); // Remove 'svg[' and ']'
        applySVGSelectorHighlight(scopeElement, svgId, comment, classesToAdd, dataCommentId, addClickListener);
    }

    /**
     * Apply SVG selector highlighting by finding SVG links with matching ID
     * 
     * @param {Element} scopeElement - The element to apply the highlight to
     * @param {string} svgId - The SVG unique ID to match
     * @param {Object} comment - The comment data
     * @param {Array} classesToAdd - Classes to add for highlighting
     * @param {string} dataCommentId - The comment ID as string
     * @param {Function} addClickListener - Function to add click listener
     */
    function applySVGSelectorHighlight(scopeElement, svgId, comment, classesToAdd, dataCommentId, addClickListener) {
        let found = false;

        // Strategy 1: Look for elements with data-svg-id attribute
        const elementsWithSvgId = scopeElement.querySelectorAll(`[data-svg-id="${svgId}"]`);
        if (elementsWithSvgId.length > 0) {
            elementsWithSvgId.forEach(element => {
                element.classList.add(...classesToAdd);
                element.setAttribute('data-comment-id', dataCommentId);
                addClickListener(element, comment);
                found = true;
            });
        }

        // Strategy 2: Look for SVG anchor elements and try to match based on href or content
        if (!found) {
            const svgLinks = scopeElement.querySelectorAll('svg a');
            svgLinks.forEach(svgLink => {
                if (matchesSVGId(svgLink, svgId)) {
                    // Store the SVG ID as a data attribute for future reference
                    svgLink.setAttribute('data-svg-id', svgId);
                    svgLink.classList.add(...classesToAdd);
                    svgLink.setAttribute('data-comment-id', dataCommentId);
                    addClickListener(svgLink, comment);
                    found = true;
                }
            });
        }

        // Strategy 3: Fallback - look for any SVG elements that might contain the ID in various attributes
        if (!found) {
            const allSvgElements = scopeElement.querySelectorAll('svg *[href], svg *[xlink\\:href]');
            allSvgElements.forEach(element => {
                if (matchesSVGId(element, svgId)) {
                    const targetElement = element.closest('a') || element;
                    targetElement.setAttribute('data-svg-id', svgId);
                    targetElement.classList.add(...classesToAdd);
                    targetElement.setAttribute('data-comment-id', dataCommentId);
                    addClickListener(targetElement, comment);
                    found = true;
                }
            });
        }

        if (!found) {
            console.warn('applySVGHighlight: SVG element not found for ID:', svgId);
        }
    }

    /**
     * Check if an SVG link matches the given SVG ID
     * 
     * @param {Element} svgElement - The SVG element to check
     * @param {string} svgId - The SVG ID to match against
     * @returns {boolean} - True if the element matches the SVG ID
     */
    function matchesSVGId(svgElement, svgId) {
        // Check if it already has the data-svg-id attribute
        if (svgElement.getAttribute('data-svg-id') === svgId) {
            return true;
        }

        // Check if it matches the expected ID generation patterns from useSVGSelection
        const href = svgElement.getAttribute('xlink:href') || svgElement.getAttribute('href');

        // Pattern 1: svg-href-{segment}
        if (svgId.startsWith('svg-href-') && href) {
            try {
                const url = new URL(href);
                const pathSegments = url.pathname.split('/').filter(Boolean);
                const lastSegment = pathSegments[pathSegments.length - 1];
                if (lastSegment && svgId === `svg-href-${lastSegment}`) {
                    return true;
                }
            } catch (e) {
                const cleanHref = href.replace(/[^a-zA-Z0-9-_]/g, '-');
                if (svgId === `svg-href-${cleanHref}`) {
                    return true;
                }
            }
        }

        // Pattern 2: svg-text-{text}-{position}
        if (svgId.startsWith('svg-text-')) {
            const textContent = extractSVGTextContent(svgElement);
            if (textContent) {
                const rect = svgElement.getBoundingClientRect();
                const positionHash = `${Math.round(rect.left)}-${Math.round(rect.top)}`;
                const cleanText = textContent.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
                const expectedId = `svg-text-${cleanText}-${positionHash}`;
                if (svgId === expectedId) {
                    return true;
                }
            }
        }

        // Pattern 3: svg-fallback-{hash}
        if (svgId.startsWith('svg-fallback-')) {
            // For fallback patterns, we can try to regenerate the hash and compare
            try {
                const elementInfo = {
                    tagName: svgElement.tagName,
                    position: svgElement.getBoundingClientRect(),
                    childCount: svgElement.children.length
                };
                const fallbackHash = btoa(JSON.stringify(elementInfo)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
                const expectedId = `svg-fallback-${fallbackHash}`;
                if (svgId === expectedId) {
                    return true;
                }
            } catch (e) {
                // Hash generation failed, skip this match
            }
        }

        return false;
    }

    /**
     * Extract text content from SVG element (helper function)
     * 
     * @param {Element} svgElement - The SVG element
     * @returns {string} - Extracted text content
     */
    function extractSVGTextContent(svgElement) {
        // Look for text elements and tspan elements
        const textElements = svgElement.querySelectorAll('text, tspan');
        const textParts = [];

        textElements.forEach(textElement => {
            const text = textElement.textContent.trim();
            if (text && !textParts.includes(text)) {
                textParts.push(text);
            }
        });

        // Also check for title element
        const titleElement = svgElement.querySelector('title');
        if (titleElement && titleElement.textContent.trim()) {
            const titleText = titleElement.textContent.trim();
            if (!textParts.includes(titleText)) {
                textParts.unshift(titleText); // Add title at the beginning
            }
        }

        return textParts.join(' ');
    }

    /**
     * Remove SVG-based highlights
     * 
     * @param {string} uniqueHighlightClass - The unique highlight class to remove
     * @param {Element} scopeElement - The element to search within
     * @param {Array} elements - The elements to remove highlights from
     */
    function removeSVGHighlight(uniqueHighlightClass, scopeElement, elements) {
        elements.forEach(targetEl => {
            // Check if this element has any other smartcomment highlight classes
            const hasOtherSmartCommentClass = Array.from(targetEl.classList).some(cls =>
                cls.startsWith('smartcomment-hl-') && cls !== uniqueHighlightClass
            );

            // For SVG-based highlights, remove manually
            targetEl.classList.remove(uniqueHighlightClass);

            // Remove data-comment-id if no other smartcomment classes remain
            if (!hasOtherSmartCommentClass) {
                targetEl.removeAttribute('data-comment-id');
            }

            // Optionally remove data-svg-id if no other smartcomment classes remain
            // This keeps the ID for potential future re-highlighting
            // targetEl.removeAttribute('data-svg-id');
        });
    }

    return {
        applySVGHighlight,
        removeSVGHighlight
    };
}

module.exports = { useSVGHighlight }; 