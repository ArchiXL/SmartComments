/**
 * Centralized screenshot handling for all selection types
 * Eliminates duplication and provides consistent error handling
 */
const useScreenshot = require('./useScreenshot.js');
const { SCREENSHOT_CONFIG } = require('../../utils/constants.js');

function useSelectionScreenshot() {
    const { screenshotSelectionArea, takeScreenshot } = useScreenshot();

    /**
     * Capture screenshot for any selection type with unified error handling
     * @param {string} selectionType - Type of selection ('text', 'image', 'svg', 'dynamic-block')
     * @param {Object} params - Parameters specific to selection type
     * @returns {Promise<string|null>} - Screenshot data URL or null if failed
     */
    async function captureSelectionScreenshot(selectionType, params) {
        if (!params) {
            console.warn('No parameters provided for screenshot capture');
            return null;
        }

        try {
            let screenshotDataUrl = null;

            switch (selectionType) {
                case 'text':
                case 'svg':
                case 'dynamic-block':
                    screenshotDataUrl = await captureAreaScreenshot(params);
                    break;
                case 'image':
                    screenshotDataUrl = await captureElementScreenshot(params);
                    break;
                default:
                    throw new Error(`Unknown selection type for screenshot: ${selectionType}`);
            }

            return screenshotDataUrl;
        } catch (error) {
            console.error(`Screenshot capture failed for ${selectionType}:`, error);
            return null;
        } finally {
            // Execute cleanup callback if provided
            if (params.cleanupCallback && typeof params.cleanupCallback === 'function') {
                try {
                    params.cleanupCallback();
                } catch (cleanupError) {
                    console.warn('Cleanup callback failed:', cleanupError);
                }
            }
        }
    }

    /**
     * Capture screenshot of a specific area (for text, SVG, dynamic blocks)
     * @param {Object} params - Contains selectionPosition, startPosition, text, and optional cleanupCallback
     * @returns {Promise<string>} - Screenshot data URL
     */
    async function captureAreaScreenshot(params) {
        const { selectionPosition, startPosition, text, cleanupCallback } = params;

        if (!selectionPosition || !startPosition) {
            throw new Error('Missing position data for area screenshot');
        }

        try {
            // Add delay before capture to ensure UI is stable
            await new Promise(resolve => setTimeout(resolve, SCREENSHOT_CONFIG.CAPTURE_DELAY));

            return await screenshotSelectionArea(selectionPosition, startPosition, text);
        } finally {
            // Ensure cleanup is called even if screenshot fails
            if (cleanupCallback && typeof cleanupCallback === 'function') {
                try {
                    cleanupCallback();
                } catch (cleanupError) {
                    console.warn('Area screenshot cleanup failed:', cleanupError);
                }
            }
        }
    }

    /**
     * Capture screenshot of a specific element (for images)
     * @param {Object} params - Contains element
     * @returns {Promise<string>} - Screenshot data URL
     */
    async function captureElementScreenshot(params) {
        const { element } = params;

        if (!element) {
            throw new Error('Missing element for element screenshot');
        }

        // Add delay before capture to ensure UI is stable
        await new Promise(resolve => setTimeout(resolve, SCREENSHOT_CONFIG.CAPTURE_DELAY));

        return await takeScreenshot(element);
    }

    /**
     * Capture screenshot with retry mechanism
     * @param {string} selectionType - Type of selection
     * @param {Object} params - Screenshot parameters
     * @param {number} maxRetries - Maximum number of retry attempts
     * @returns {Promise<string|null>} - Screenshot data URL or null
     */
    async function captureWithRetry(selectionType, params, maxRetries = SCREENSHOT_CONFIG.RETRY_ATTEMPTS) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await captureSelectionScreenshot(selectionType, params);
                if (result) {
                    return result;
                }
            } catch (error) {
                lastError = error;
                console.warn(`Screenshot attempt ${attempt} failed:`, error);

                if (attempt < maxRetries) {
                    await new Promise(resolve =>
                        setTimeout(resolve, SCREENSHOT_CONFIG.RETRY_DELAY * attempt)
                    );
                }
            }
        }

        console.error(`All ${maxRetries} screenshot attempts failed:`, lastError);
        return null;
    }

    /**
     * Calculate position data from element and event
     * @param {Element} element - The target element
     * @param {Event} event - The mouse event
     * @returns {Object} - Position data with selectionPosition and startPosition
     */
    function calculatePositionData(element, event) {
        const rect = element.getBoundingClientRect();

        return {
            selectionPosition: {
                x: event ? event.clientX : (rect.right),
                y: event ? event.clientY : (rect.bottom)
            },
            startPosition: {
                x: rect.left,
                y: rect.top
            }
        };
    }

    return {
        captureSelectionScreenshot,
        captureAreaScreenshot,
        captureElementScreenshot,
        captureWithRetry,
        calculatePositionData
    };
}

module.exports = { useSelectionScreenshot }; 