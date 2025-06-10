/**
 * Composable for handling selection screenshots
 * Provides functionality to capture and process screenshots of selected content
 */
import useScreenshot from './useScreenshot.js';
import { SCREENSHOT_CONFIG } from '../selection/shared/SelectionConstants.js';

function useSelectionScreenshot() {
    const { takeScreenshot } = useScreenshot();

    /**
     * Capture screenshot of selected content
     * @param {Element} element - Element to capture
     * @param {Object} options - Screenshot options
     * @returns {Promise<string>} - Base64 encoded screenshot
     */
    const captureSelectionScreenshot = async (element, options = {}) => {
        const defaultOptions = {
            quality: SCREENSHOT_CONFIG.DEFAULT_QUALITY,
            format: SCREENSHOT_CONFIG.DEFAULT_FORMAT,
            delay: SCREENSHOT_CONFIG.CAPTURE_DELAY
        };

        const mergedOptions = { ...defaultOptions, ...options };

        try {
            return await takeScreenshot(element, mergedOptions);
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