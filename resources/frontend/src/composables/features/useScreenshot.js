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
   * Default onclone function for screenshots that handles SmartComments styling.
   * @param {Document} clonedDocument - The cloned document being processed for screenshot
   */
  function defaultOnClone(clonedDocument) {
    const targetElement = clonedDocument.querySelector(".sc-screenshot-target");

    // Make sure the screenshot target always has a fixed width and padding
    if (targetElement) {
      // Check if there's a selection highlight that needs to be visible
      const highlightElement = targetElement.querySelector(
        ".sc-selection-highlight-temp",
      );
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
        targetElement.style["max-height"] =
          SCREENSHOT_CONFIG.MAX_HEIGHT + 50 + "px";
      } else {
        targetElement.style["white-space"] = "nowrap";
        targetElement.style["text-overflow"] = "ellipsis";
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
        onclone: defaultOnClone,
        // Force html2canvas to capture elements beyond viewport boundaries
        scrollX: 0,
        scrollY: 0,
        windowWidth: Math.max(window.innerWidth, elementWidth),
        windowHeight: Math.max(window.innerHeight, elementHeight),
        // Use html2canvas built-in sizing for consistent output
        width: SCREENSHOT_CONFIG.FIXED_WIDTH,
        height: Math.min(
          Math.max(
            (rect.height * SCREENSHOT_CONFIG.FIXED_WIDTH) / rect.width,
            SCREENSHOT_CONFIG.MIN_HEIGHT,
          ),
          SCREENSHOT_CONFIG.MAX_HEIGHT,
        ),
        backgroundColor: "#ffffff",
        ignoreElements: (el) => {
          return el.tagName === 'image';
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
      height: 150,
      onclone: defaultOnClone,
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
