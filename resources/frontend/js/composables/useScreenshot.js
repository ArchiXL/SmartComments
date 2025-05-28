const { reactive, ref } = require('vue');
const { SMARTCOMMENTS_CLASSES, getMediaWikiContentRoot } = require('../utils/constants.js');

/**
 * Composable for handling screenshot functionality.
 */
function useScreenshot() {
    const selectionPosition = reactive({ x: 0, y: 0 });
    const startPosition = reactive({ x: 0, y: 0 });
    const currentSelectionTextLength = ref(0);

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
            const canvas = await html2canvas(targetElement, options);
            canvas.classList.add(SMARTCOMMENTS_CLASSES.CANVAS); // 'sic-canvas' for 'smart-image-comment-canvas' or similar
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
            onclone: function (clonedDocument) {
                // Style highlighted elements in the clone before screenshotting
                // This ensures the highlights are part of the image.
                const activeItems = clonedDocument.getElementsByClassName(SMARTCOMMENTS_CLASSES.HIGHLIGHT_TEMP);
                for (let i = 0; i < activeItems.length; i++) {
                    activeItems[i].style.background = "#ffffe0"; // Light yellow
                    activeItems[i].style.borderTop = "1px solid rgba(0,0,0,0.2)";
                    activeItems[i].style.borderBottom = "1px solid rgba(0,0,0,0.2)";
                    if (i === 0) {
                        activeItems[i].style.borderLeft = "1px solid rgba(0,0,0,0.2)";
                    }
                    if (i === activeItems.length - 1) {
                        activeItems[i].style.borderRight = "1px solid rgba(0,0,0,0.2)";
                    }
                }
            }
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

module.exports = useScreenshot; 