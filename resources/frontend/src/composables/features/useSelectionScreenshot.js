/**
 * Composable for handling selection screenshots
 * Provides functionality to capture and process screenshots of selected content
 */
import useScreenshot from "./useScreenshot.js";

function useSelectionScreenshot() {
	const {screenshotSelectionArea, screenshotTargetElement} = useScreenshot();

	/**
	 * Capture screenshot of selected content
	 * @param {Element} element - Element to capture (unused, kept for compatibility)
	 * @param {Object} options - Screenshot options (unused, kept for compatibility)
	 * @param {Event} event - Mouse event (used as fallback if no target element)
	 * @returns {Promise<string>} - Base64 encoded screenshot
	 */
	const captureSelectionScreenshot = async ( element, options = {}, event ) => {
		try {
			// First try to screenshot the target element directly
			const targetScreenshot = await screenshotTargetElement();
			if ( targetScreenshot ) {
				return targetScreenshot;
			}

			// Fallback to position-based screenshot if no target element found
			const pos = {
				x: event?.clientX || 0,
				y: event?.clientY || 0,
			};
			return await screenshotSelectionArea( pos, pos );
		} catch ( error ) {
			console.error( "Failed to capture selection screenshot:", error );
			return null;
		}
	};

	return {
		captureSelectionScreenshot,
	};
}

export default useSelectionScreenshot;
