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
      // Calculate element bounds to handle viewport overflow
      const rect = targetElement.getBoundingClientRect();
      const elementWidth = Math.max(rect.width, targetElement.scrollWidth);
      const elementHeight = Math.max(rect.height, targetElement.scrollHeight);

      // Use default onclone if not provided in options
      const finalOptions = {
        // Force html2canvas to capture elements beyond viewport boundaries
        scrollX: 0,
        scrollY: 0,
        windowWidth: Math.max(window.innerWidth, elementWidth),
        windowHeight: Math.max(window.innerHeight, elementHeight),
        // Let html2canvas use natural element dimensions for better fit
        backgroundColor: "#ffffff",
        ignoreElements: (el) => {
          return el.tagName === "image";
        },
        ...options,
      };

      const canvas = await html2canvas(targetElement, finalOptions);
      canvas.classList.add(SMARTCOMMENTS_CLASSES.CANVAS);

      // Get data URL from canvas
      const dataURL = canvas.toDataURL(
        SCREENSHOT_CONFIG.DEFAULT_FORMAT,
        SCREENSHOT_CONFIG.DEFAULT_QUALITY,
      );

      // Clean up canvas
      canvas.remove();

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

    const screenshotOptions = {
      x: currentStartPos.x - 250 + window.scrollX,
      y: currentStartPos.y - 75 + window.scrollY,
      width: 500,
      height: 150
    };

    return takeScreenshot(document.body, screenshotOptions);
  }

  // Expose methods
  return {
    screenshotSelectionArea,
    screenshotTargetElement,
  };
}

export default useScreenshot;
