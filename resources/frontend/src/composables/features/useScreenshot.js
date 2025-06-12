import { reactive, ref } from "vue";
import {
	SMARTCOMMENTS_CLASSES,
	getMediaWikiContentRoot,
	SCREENSHOT_CONFIG,
} from "../../utils/constants.js";
import { findCurrentScreenshotTarget } from "../../utils/screenshotTargetManager.js";
import html2canvas from "html2canvas";

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
		// SVG specific handling
		const svgs = clonedDocument.getElementsByTagName("svg");
		for (let i = 0; i < svgs.length; i++) {
			const svg = svgs[i];
			const image = svg.getElementsByTagName("image");
			for (let j = 0; j < image.length; j++) {
				const img = image[j];
				// Check if the xlink:href or href is an URL that's
				// a different domain than the current page, to prevent
				// CORS issues.
				const href = img.getAttribute("xlink:href") || img.getAttribute("href");
				if (href && !href.startsWith(window.location.origin)) {
					img.remove();
				}
			}
		}

		const targetElement = clonedDocument.querySelector(
			".sc-screenshot-target",
		);

		// Make sure the screenshot target always has a fixed width and padding
		if (targetElement) {

			// Check if there's a selection highlight that needs to be visible
			const highlightElement = targetElement.querySelector('.sc-selection-highlight-temp');
			const hasHighlight = highlightElement !== null;

			targetElement.style["width"] = SCREENSHOT_CONFIG.FIXED_WIDTH + "px";
			targetElement.style["max-height"] = SCREENSHOT_CONFIG.MAX_HEIGHT + "px";
			targetElement.style["padding"] = "5px";
			targetElement.style["overflow"] = "hidden";
			targetElement.style["display"] = "inline-block";
			targetElement.style["vertical-align"] = "middle";
			targetElement.style["line-height"] = "normal";
			targetElement.style["font-size"] = "inherit";
			targetElement.style["font-weight"] = "inherit";
			targetElement.style["font-style"] = "inherit";
			targetElement.style["text-decoration"] = "inherit";

			// Adjust text wrapping behavior based on whether there's a highlight
			if (hasHighlight) {
				targetElement.style["white-space"] = "normal";
				targetElement.style["text-overflow"] = "clip";
				targetElement.style["max-height"] = (SCREENSHOT_CONFIG.MAX_HEIGHT + 50) + "px";
			} else {
				targetElement.style["white-space"] = "nowrap";
				targetElement.style["text-overflow"] = "ellipsis";
			}
		}
	}

	/**
	 * Create a fixed-size canvas from the original screenshot
	 * @param {HTMLCanvasElement} originalCanvas - Original screenshot canvas
	 * @returns {HTMLCanvasElement} - Resized canvas with fixed dimensions
	 */
	function createFixedSizeCanvas(originalCanvas) {
		const fixedCanvas = document.createElement("canvas");
		const ctx = fixedCanvas.getContext("2d");

		// Set fixed dimensions
		const targetWidth = SCREENSHOT_CONFIG.FIXED_WIDTH;
		let targetHeight = Math.min(
			(originalCanvas.height * targetWidth) / originalCanvas.width,
			SCREENSHOT_CONFIG.MAX_HEIGHT,
		);

		// Ensure minimum height
		targetHeight = Math.max(targetHeight, SCREENSHOT_CONFIG.MIN_HEIGHT);

		fixedCanvas.width = targetWidth;
		fixedCanvas.height = targetHeight;

		// Fill with white background
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, targetWidth, targetHeight);

		// Calculate scaling to fit image within fixed dimensions while maintaining aspect ratio
		const scaleX = targetWidth / originalCanvas.width;
		const scaleY = targetHeight / originalCanvas.height;
		const scale = Math.min(scaleX, scaleY);

		const scaledWidth = originalCanvas.width * scale;
		const scaledHeight = originalCanvas.height * scale;

		// Center the image in the canvas
		const x = (targetWidth - scaledWidth) / 2;
		const y = (targetHeight - scaledHeight) / 2;

		// Draw the scaled image
		ctx.drawImage(originalCanvas, x, y, scaledWidth, scaledHeight);

		return fixedCanvas;
	}

	/**
	 * Generic screenshot utility function.
	 * @param {string|Element} element - Element to screenshot or "default" (for mw-content-text).
	 * @param {Object} options - html2canvas options.
	 * @returns {Promise<string|null>} - Promise resolving to canvas data URL or null on error.
	 */
	async function takeScreenshot(element, options = {}) {
		const targetElement =
			element === "default"
				? getMediaWikiContentRoot()
				: typeof element === "string"
					? document.querySelector(element)
					: element;

		if (!targetElement) {
			console.error("Screenshot target element not found:", element);
			return null;
		}

		if (typeof html2canvas === "undefined") {
			console.error("html2canvas library not available");
			return null;
		}

		try {
			// Use default onclone if not provided in options
			const finalOptions = {
				onclone: defaultOnClone,
				...options,
			};

			const originalCanvas = await html2canvas(targetElement, finalOptions);

			// Create fixed-size canvas from the original
			const fixedCanvas = createFixedSizeCanvas(originalCanvas);
			fixedCanvas.classList.add(SMARTCOMMENTS_CLASSES.CANVAS);

			// Get data URL from fixed-size canvas
			const dataURL = fixedCanvas.toDataURL(
				SCREENSHOT_CONFIG.DEFAULT_FORMAT,
				SCREENSHOT_CONFIG.DEFAULT_QUALITY,
			);

			// Clean up canvases
			originalCanvas.remove();
			fixedCanvas.remove();

			return dataURL;
		} catch (error) {
			console.error("Screenshot failed:", error);
			return null;
		}
	}

	/**
	 * Takes a screenshot of the screenshot target element.
	 * @returns {Promise<string|null>} - Promise resolving to canvas data URL or null.
	 */
	async function screenshotTargetElement() {
		// Find the element with sc-screenshot-target class
		const targetElement = findCurrentScreenshotTarget();

		if (!targetElement) {
			return null;
		}

		return takeScreenshot(targetElement);
	}

	/**
	 * Takes a screenshot of the current selection area.
	 * Adapts dimensions and scale based on selection.
	 * @param {Object} currentSelPos - current selection's end position {x, y}
	 * @param {Object} currentStartPos - current selection's start position {x, y}
	 * @returns {Promise<string|null>} - Promise resolving to canvas data URL or null.
	 */
	async function screenshotSelectionArea(currentSelPos, currentStartPos) {
		// First try to use the screenshot target element
		const targetScreenshot = await screenshotTargetElement();
		if (targetScreenshot) {
			return targetScreenshot;
		}

		// Fallback to position-based screenshot if no target element found
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
			onclone: defaultOnClone,
		};

		return takeScreenshot(document.body, screenshotOptions);
	}

	// Expose methods
	return {
		takeScreenshot,
		screenshotSelectionArea,
		screenshotTargetElement,
		selectionPosition,
		startPosition,
		currentSelectionTextLength,
	};
}

export default useScreenshot;
