const { isSelectionEnabled } = require('../../utils/selectionUtils.js');
const { SMARTCOMMENTS_CLASSES } = require('../../utils/constants.js');
const useScreenshot = require('../useScreenshot.js');

function useDynamicBlockSelection() {
    // Screenshot composable instance
    const { screenshotSelectionArea } = useScreenshot();

    /**
     * Process dynamic block selection
     * @param {Element} element - The dynamic block element
     * @param {Event} event - Mouse event
     * @param {Object} options - Options including captureScreenshot
     * @returns {Object} - Selection data
     */
    async function processDynamicBlockSelection(element, event, options = { captureScreenshot: false }) {
        if (!isSelectionEnabled()) return null;

        // Skip HTML validation for dynamic blocks since they are pre-approved content
        // and can be wrapped in HTML elements like links
        // Only check for existing comments
        if (element.outerHTML.includes(SMARTCOMMENTS_CLASSES.HIGHLIGHT)) {
            console.warn('Invalid dynamic block selection: already commented');
            return null;
        }

        // For sc-image-block elements, use the data-hash instead of full HTML
        let selectionText = element.outerHTML;
        if (element.classList.contains('sc-image-block') && element.dataset.hash) {
            selectionText = element.dataset.hash;
        }

        const selectionData = {
            text: selectionText,
            index: -1,
            type: 'dynamic_block',
            element: element
        };

        if (options.captureScreenshot) {
            try {
                const rect = element.getBoundingClientRect();
                const currentSelPos = { x: rect.right, y: rect.bottom };
                const currentStartPos = { x: rect.left, y: rect.top };
                // screenshotSelectionArea expects a string for the text, use the derived selectionText
                const screenshotDataUrl = await screenshotSelectionArea(currentSelPos, currentStartPos, selectionText);
                selectionData.image = screenshotDataUrl;
            } catch (error) {
                console.error('Error taking screenshot for dynamic block:', error);
                selectionData.image = null;
            }
        }

        return selectionData;
    }

    return {
        processDynamicBlockSelection
    };
}

module.exports = { useDynamicBlockSelection }; 