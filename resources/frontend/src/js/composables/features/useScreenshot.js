import { reactive, ref } from 'vue';
import { SMARTCOMMENTS_CLASSES, getMediaWikiContentRoot } from '../../utils/constants.js';

/**
 * Composable for handling screenshot functionality.
 */
function useScreenshot() {
    const selectionPosition = reactive({ x: 0, y: 0 });
    const startPosition = reactive({ x: 0, y: 0 });
    const currentSelectionTextLength = ref(0);

    /**
     * Default onclone function for screenshots that handles SmartComments styling.
     * @param {Document} clonedDocument - The cloned document being processed for screenshot
     */
    function defaultOnClone(clonedDocument) {
        // First handle SmartComments styling
        const allElements = clonedDocument.getElementsByTagName('*');
        for (let i = 0; i < allElements.length; i++) {
            const element = allElements[i];
            const classList = element.classList;
            // Loop over each class in the element and remove the ones that start with smartcomment-hl-
            for (let j = classList.length - 1; j >= 0; j--) {
                if (classList[j].indexOf(SMARTCOMMENTS_CLASSES.HIGHLIGHT) !== -1) {
                    classList.remove(classList[j]);
                }
            }
        }

        // Special handling for SVG elements
        const svgElements = clonedDocument.getElementsByTagName('svg');
        for (let i = 0; i < svgElements.length; i++) {
            const svg = svgElements[i];
            // Ensure SVG namespace is preserved
            if (!svg.getAttribute('xmlns')) {
                svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            }
            // Copy all computed styles to inline styles to preserve appearance
            const computedStyle = window.getComputedStyle(svg);
            for (let j = 0; j < computedStyle.length; j++) {
                const prop = computedStyle[j];
                svg.style[prop] = computedStyle.getPropertyValue(prop);
            }
        }

        // Handle SVG links and references
        const svgLinks = clonedDocument.querySelectorAll('a[*|href]');
        for (let i = 0; i < svgLinks.length; i++) {
            const link = svgLinks[i];
            // Ensure xlink:href is preserved
            const href = link.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
            if (href) {
                link.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', href);
            }
        }
    }

    /**
     * Generic screenshot utility function.
     * @param {string|Element} element - Element to screenshot or "default" (for mw-content-text).
     * @param {Object} options - html2canvas options.
     * @returns {Promise<string|null>} - Promise resolving to canvas data URL or null on error.
     */
    async function takeScreenshot(element, options = {}) {
        const targetElement = element === "default" ?
            getMediaWikiContentRoot() :
            (typeof element === 'string' ? document.querySelector(element) : element);

        if (!targetElement) {
            console.error('Screenshot target element not found:', element);
            return null;
        }

        if (typeof html2canvas === 'undefined') {
            console.error('html2canvas library not available');
            return null;
        }

        try {
            // Use default onclone if not provided in options
            const finalOptions = {
                onclone: defaultOnClone,
                ...options
            };

            const canvas = await html2canvas(targetElement, finalOptions);
            canvas.classList.add(SMARTCOMMENTS_CLASSES.CANVAS);
            const dataURL = canvas.toDataURL("image/jpeg");
            canvas.remove();
            return dataURL;
        } catch (error) {
            console.error('Screenshot failed:', error);
            return null;
        }
    }

    /**
     * Takes a screenshot of the current selection area.
     * Adapts dimensions and scale based on selection.
     * @param {Object} currentSelPos - current selection's end position {x, y}
     * @param {Object} currentStartPos - current selection's start position {x, y}
     * @param {String} currentSelText - current selection's text content
     * @returns {Promise<string|null>} - Promise resolving to canvas data URL or null.
     */
    async function screenshotSelectionArea(currentSelPos, currentStartPos, currentSelText) {
        const minMaxWidth = 500;
        const minMaxHeight = 50;
        const maxChars = 45;

        let width = currentSelPos.x - currentStartPos.x;
        let height = currentSelPos.y - currentStartPos.y;

        // Ensure minimum/maximum dimensions for the screenshot viewport
        width = Math.max(minMaxWidth, Math.min(width, minMaxWidth));
        height = Math.max(minMaxHeight, Math.min(height, minMaxHeight));

        // Calculate center position of the selection
        const x = currentSelPos.x - (currentSelPos.x - currentStartPos.x) / 2;
        const y = currentSelPos.y - (currentSelPos.y - currentStartPos.y) / 2;

        const screenshotOptions = {
            x: x - width / 2,
            y: y - height / 2,
            width: width,
            height: height,
            scale: 1,
            onclone: defaultOnClone
        };

        return takeScreenshot(document.body, screenshotOptions);
    }

    // Expose methods
    return {
        takeScreenshot,
        screenshotSelectionArea,
        selectionPosition,
        startPosition,
        currentSelectionTextLength
    };
}

export default useScreenshot; 