const {
    validateSelectionContent,
    getMediaWikiContentRoot,
    isSelectionEnabled,
    createSVGHash
} = require('../../utils/selectionUtils.js');
const { SELECTION_ENUMS, SMARTCOMMENTS_CLASSES } = require('../../utils/constants.js');
const useScreenshot = require('../useScreenshot.js');

function useSVGSelection() {
    // Screenshot composable instance
    const { screenshotSelectionArea } = useScreenshot();

    /**
     * Process SVG selection
     * @param {Element} svgElement - The SVG element or SVG child element
     * @param {Event} event - Mouse event
     * @param {Object} options - Options including captureScreenshot
     * @returns {Object} - Selection data
     */
    async function processSVGSelection(svgElement, event, options = { captureScreenshot: false }) {
        if (!isSelectionEnabled()) return null;

        // Find the closest SVG link (anchor element within SVG)
        const svgLink = svgElement.closest('a');
        if (!svgLink) {
            console.warn('SVG element is not within a clickable link');
            return null;
        }

        // Generate unique ID for the SVG selection
        const uniqueId = generateSVGUniqueId(svgLink);

        // Extract text content from the SVG link
        const textContent = extractSVGTextContent(svgLink);

        // Get href for additional context
        const href = svgLink.getAttribute('xlink:href') || svgLink.getAttribute('href');

        const validationResult = validateSelectionContent(textContent || href || uniqueId);
        if (validationResult !== SELECTION_ENUMS.SELECTION_VALID && validationResult !== SELECTION_ENUMS.INVALID_SELECTION_CONTAINS_LINEBREAKS) {
            console.warn('Invalid SVG selection:', validationResult);
            return null;
        }

        const selectionData = {
            text: `svg[${uniqueId}]`,
            index: -1,
            type: 'svg',
            svg_id: uniqueId,
            svg_hash: createSVGHash(uniqueId, href, textContent),
            href: href,
            element: svgLink,
            metadata: extractSVGMetadata(svgLink),
            position: `svg[${uniqueId}]`,
            textContent: textContent || `SVG Link: ${href ? new URL(href).pathname.split('/').pop() : uniqueId}`
        };

        if (options.captureScreenshot) {
            try {
                // Get the bounding box of the SVG link element
                const rect = svgLink.getBoundingClientRect();

                // Create position objects similar to text selection
                const selectionPosition = {
                    x: event.clientX || rect.right,
                    y: event.clientY || rect.bottom
                };
                const startPosition = {
                    x: rect.left,
                    y: rect.top
                };

                const screenshotDataUrl = await screenshotSelectionArea(selectionPosition, startPosition, `svg[${uniqueId}]`);
                selectionData.image = screenshotDataUrl;
            } catch (error) {
                console.error('Error taking screenshot for SVG selection:', error);
                selectionData.image = null;
            }
        }

        return selectionData;
    }

    /**
     * Generate a unique ID for SVG selection based on available data
     * @param {Element} svgLink - The SVG anchor element
     * @returns {string} - Unique identifier
     */
    function generateSVGUniqueId(svgLink) {
        // Priority order for unique ID generation:
        // 1. href attribute
        // 2. Combination of text content and position
        // 3. Fallback hash

        // Use href if available
        const href = svgLink.getAttribute('xlink:href') || svgLink.getAttribute('href');
        if (href) {
            try {
                const url = new URL(href);
                const pathSegments = url.pathname.split('/').filter(Boolean);
                const lastSegment = pathSegments[pathSegments.length - 1];
                if (lastSegment && lastSegment !== 'index.php') {
                    return `svg-href-${lastSegment}`;
                }
            } catch (e) {
                // Invalid URL, use as is
                return `svg-href-${href.replace(/[^a-zA-Z0-9-_]/g, '-')}`;
            }
        }

        // Use text content with position
        const textContent = extractSVGTextContent(svgLink);
        if (textContent) {
            const rect = svgLink.getBoundingClientRect();
            const positionHash = `${Math.round(rect.left)}-${Math.round(rect.top)}`;
            const cleanText = textContent.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
            return `svg-text-${cleanText}-${positionHash}`;
        }

        // Fallback: generate hash based on element structure
        const elementInfo = {
            tagName: svgLink.tagName,
            position: svgLink.getBoundingClientRect(),
            childCount: svgLink.children.length
        };

        const fallbackHash = btoa(JSON.stringify(elementInfo)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
        return `svg-fallback-${fallbackHash}`;
    }

    /**
     * Extract text content from SVG link
     * @param {Element} svgLink - The SVG anchor element
     * @returns {string} - Extracted text content
     */
    function extractSVGTextContent(svgLink) {
        // Look for text elements and tspan elements
        const textElements = svgLink.querySelectorAll('text, tspan');
        const textParts = [];

        textElements.forEach(textElement => {
            const text = textElement.textContent.trim();
            if (text && !textParts.includes(text)) {
                textParts.push(text);
            }
        });

        // Also check for title element
        const titleElement = svgLink.querySelector('title');
        if (titleElement && titleElement.textContent.trim()) {
            const titleText = titleElement.textContent.trim();
            if (!textParts.includes(titleText)) {
                textParts.unshift(titleText); // Add title at the beginning
            }
        }

        return textParts.join(' ');
    }

    /**
     * Extract metadata from SVG link
     * @param {Element} svgLink - The SVG anchor element
     * @returns {Object} - Extracted metadata
     */
    function extractSVGMetadata(svgLink) {
        const metadata = {};

        // Extract href information
        const href = svgLink.getAttribute('xlink:href') || svgLink.getAttribute('href');
        if (href) {
            metadata.href = href;
        }

        // Extract general metadata if available
        const metadataElement = svgLink.querySelector('metadata rdf description');
        if (metadataElement) {
            const about = metadataElement.getAttribute('rdf:about');
            if (about) metadata.rdf_about = about;
        }

        // Extract visual properties
        const rect = svgLink.querySelector('rect');
        if (rect) {
            metadata.visual = {
                x: rect.getAttribute('x'),
                y: rect.getAttribute('y'),
                width: rect.getAttribute('width'),
                height: rect.getAttribute('height'),
                fill: rect.style.fill || rect.getAttribute('fill'),
                stroke: rect.style.stroke || rect.getAttribute('stroke')
            };
        }

        // Extract CSS classes if any
        const classes = svgLink.getAttribute('class');
        if (classes) {
            metadata.classes = classes.split(' ').filter(Boolean);
        }

        return metadata;
    }

    /**
     * Check if an element is within an SVG link
     * @param {Element} element - Element to check
     * @returns {Element|null} - The SVG link element if found, null otherwise
     */
    function findSVGLink(element) {
        // Check if the element itself is an SVG link
        if (element.tagName === 'a' && element.closest('svg')) {
            return element;
        }

        // Check if the element is within an SVG link
        const svgLink = element.closest('svg a');
        return svgLink;
    }

    return {
        processSVGSelection,
        generateSVGUniqueId,
        extractSVGTextContent,
        extractSVGMetadata,
        findSVGLink
    };
}

module.exports = { useSVGSelection }; 