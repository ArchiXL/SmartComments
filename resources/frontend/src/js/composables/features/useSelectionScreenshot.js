/**
 * Composable for handling selection screenshots
 * Provides functionality to capture and process screenshots of selected content
 */
import useScreenshot from './useScreenshot.js';

function useSelectionScreenshot() {
    const { screenshotSelectionArea } = useScreenshot();

    /**
     * Capture screenshot of selected content
     * @param {Element} element - Element to capture
     * @param {Object} options - Screenshot options
     * @param {Event} event - Mouse event
     * @returns {Promise<string>} - Base64 encoded screenshot
     */
    const captureSelectionScreenshot = async (element, options = {}, event) => {
        try {
            const pos = {
                x: event.clientX,
                y: event.clientY
            };
            return await screenshotSelectionArea(pos, pos);
        } catch (error) {
            console.error('Failed to capture selection screenshot:', error);
            return null;
        }
    };

    return {
        captureSelectionScreenshot
    };
}

export default useSelectionScreenshot; 