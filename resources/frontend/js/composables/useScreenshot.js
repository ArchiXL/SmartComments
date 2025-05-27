const { reactive, ref } = require('vue');

// Helper to get the MediaWiki content root, can be moved to a shared util if used elsewhere
function getMediaWikiContentRoot() {
    return document.getElementById('mw-content-text') || document.body;
}

/**
 * Composable for handling screenshot functionality.
 */
function useScreenshot() {
    const selectionPosition = reactive({ x: 0, y: 0 }); // Assuming this might be needed for positioning screenshots
    const startPosition = reactive({ x: 0, y: 0 }); // Assuming this might be needed for positioning screenshots
    const currentSelectionTextLength = ref(0); // To store the length of the current text selection for scaling

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
            canvas.classList.add('sic-canvas'); // 'sic-canvas' for 'smart-image-comment-canvas' or similar
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
        const maxChars = 45; // Characters before scaling down

        let width = currentSelPos.x - currentStartPos.x;
        let height = currentSelPos.y - currentStartPos.y;

        // Ensure minimum/maximum dimensions for the screenshot viewport
        width = Math.max(minMaxWidth, Math.min(width, minMaxWidth)); // Clamp to minMaxWidth
        height = Math.max(minMaxHeight, Math.min(height, minMaxHeight)); // Clamp to minMaxHeight

        // Calculate center position of the selection
        const x = currentSelPos.x - (currentSelPos.x - currentStartPos.x) / 2;
        const y = currentSelPos.y - (currentSelPos.y - currentStartPos.y) / 2;

        let scale = 1; // Default scale for html2canvas (1 means 100%)
        if (currentSelText && currentSelText.length > maxChars) {
            // This scaling logic is a bit unusual for html2canvas direct options.
            // html2canvas scale option affects the output resolution.
            // If the goal is to "zoom out" on longer text, this might need a different approach
            // or this scale needs to be used differently if a visual zoom out is intended.
            // For now, let's assume this 'scale' was intended for some post-processing or internal logic.
            // The html2canvas `scale` option will render the canvas at a higher resolution.
            // We will pass it as 1 for now, and adjust if specific visual scaling is needed.
        }

        const screenshotOptions = {
            x: x - width / 2, // Center the screenshot area around the selection's center
            y: y - height / 2,
            width: width, // Use the clamped width
            height: height, // Use the clamped height
            scale: 1, // Use default scale for now. Adjust if specific visual scaling needed.
            onclone: function (clonedDocument) {
                // Style highlighted elements in the clone before screenshotting
                // This ensures the highlights are part of the image.
                const activeItems = clonedDocument.getElementsByClassName('sc-highlight-temp');
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

        // We need to screenshot the document body for these coordinates to make sense
        return takeScreenshot(document.body, screenshotOptions);
    }

    // Expose methods
    return {
        takeScreenshot,
        screenshotSelectionArea,
        // Reactive properties if they need to be managed or observed by the consumer
        selectionPosition,
        startPosition,
        currentSelectionTextLength
    };
}

module.exports = useScreenshot; 