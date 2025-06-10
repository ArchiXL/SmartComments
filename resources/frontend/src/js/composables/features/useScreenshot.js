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
        const svgs = clonedDocument.getElementsByTagName('svg');
        for (let i = 0; i < svgs.length; i++) {
            const svg = svgs[i];
            const image = svg.getElementsByTagName('image');
            for (let j = 0; j < image.length; j++) {
                const img = image[j];
                // Check if the xlink:href or href is an URL that's 
                // a different domain than the current page, to prevent
                // CORS issues.
                const href = img.getAttribute('xlink:href') || img.getAttribute('href');
                if (href && !href.startsWith(window.location.origin)) {
                    img.remove();
                }
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
     * @returns {Promise<string|null>} - Promise resolving to canvas data URL or null.
     */
    async function screenshotSelectionArea(currentSelPos, currentStartPos) {
        const minMaxWidth = 500;
        const minMaxHeight = 50;

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