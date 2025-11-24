/**
 * Centralized error handling for selection operations
 * Provides consistent error reporting and user feedback
 */
import { SELECTION_ENUMS } from "../../../utils/constants.js";

export class SelectionErrorHandler {
  constructor() {
    this.errorCounts = new Map();
    this.lastErrors = new Map();
  }

  /**
   * Handle selection processing errors with appropriate user feedback
   * @param {string} selectionType - Type of selection that failed
   * @param {Error} error - The error that occurred
   * @param {Object} context - Additional context for debugging
   */
  handleSelectionError(selectionType, error, context = {}) {
    const errorKey = `${selectionType}_${error.message}`;

    // Track error frequency
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
    this.lastErrors.set(selectionType, {
      error,
      timestamp: Date.now(),
      context,
    });

    // Log structured error information
    console.error("Selection Error Details:", {
      type: selectionType,
      message: error.message,
      stack: error.stack,
      context,
      count: this.errorCounts.get(errorKey),
      timestamp: new Date().toISOString(),
    });

    // Show appropriate user message
    this.showUserErrorMessage(selectionType, error);
  }

  /**
   * Handle validation errors with specific messaging
   * @param {number} validationResult - Validation result code
   * @param {string} selectionType - Type of selection
   * @returns {boolean} - Whether to continue processing
   */
  handleValidationError(validationResult, selectionType = "unknown") {
    if (validationResult === SELECTION_ENUMS.SELECTION_VALID) {
      return true;
    }

    let errorMessage = "Invalid selection";
    let messageKey = null;

    switch (validationResult) {
      case SELECTION_ENUMS.INVALID_SELECTION_ALREADY_COMMENTED:
        messageKey = "sc-selection-error-1";
        errorMessage = "Selection contains already commented block";
        break;
      case SELECTION_ENUMS.INVALID_SELECTION_INCLUDES_DYNAMIC_CONTENT:
        messageKey = "sc-selection-error-2";
        errorMessage = "Selection contains dynamic content";
        break;
      case SELECTION_ENUMS.INVALID_SELECTION_CONTAINS_LINEBREAKS:
        messageKey = "sc-selection-error-3";
        errorMessage = "Selection contains line breaks";
        break;
      case SELECTION_ENUMS.INVALID_SELECTION_CONTAINS_HTML:
        messageKey = "sc-selection-error-4";
        errorMessage = "Selection contains HTML code";
        break;
      case SELECTION_ENUMS.INVALID_SELECTION_IS_EMPTY:
        messageKey = "sc-selection-error-5";
        errorMessage = "Selection is empty";
        break;
      default:
        messageKey = "sc-selection-generic-error";
        errorMessage = "An error occurred during selection";
    }

    // Log validation error
    console.warn("Selection Validation Failed:", {
      type: selectionType,
      validationResult,
      errorMessage,
      timestamp: new Date().toISOString(),
    });

    // Don't show error message for image selection
    if (selectionType === "image") {
      return false;
    }

    // Show localized message if available
    if (messageKey && typeof mw !== "undefined" && mw.msg) {
      mw.notify(mw.msg(messageKey), { type: "error" });
    } else {
      console.error(errorMessage);
    }

    return false;
  }

  /**
   * Show user-friendly error message based on error type
   * @param {string} selectionType - Type of selection
   * @param {Error} error - The error object
   */
  showUserErrorMessage(selectionType, error) {
    let userMessage = "";
    let notificationType = "error";

    // Categorize errors by type and message
    if (error.message.includes("Screenshot")) {
      userMessage = "Screenshot capture failed. Selection saved without image.";
      notificationType = "warn";
    } else if (error.message.includes("Rangy")) {
      userMessage =
        "Text selection library not available. Please refresh the page.";
    } else if (error.message.includes("content root")) {
      userMessage = "Page content not found. Please refresh the page.";
    } else if (error.message.includes("timeout")) {
      userMessage = "Selection operation timed out. Please try again.";
    } else {
      // Generic error based on selection type
      switch (selectionType) {
        case "text":
          userMessage =
            "Failed to process text selection. Please try selecting different text.";
          break;
        case "image":
          userMessage =
            "Failed to process image selection. Please try clicking the image again.";
          break;
        case "svg":
          userMessage =
            "Failed to process SVG selection. Please try clicking the element again.";
          break;
        case "dynamic-block":
          userMessage =
            "Failed to process block selection. Please try clicking the block again.";
          break;
        default:
          userMessage = "Selection processing failed. Please try again.";
      }
    }

    // Show notification if MediaWiki is available
    if (typeof mw !== "undefined" && mw.notify) {
      mw.notify(userMessage, { type: notificationType });
    } else {
      console.error(userMessage);
    }
  }

  /**
   * Handle screenshot-specific errors
   * @param {string} selectionType - Type of selection
   * @param {Error} error - Screenshot error
   * @param {Object} selectionData - Selection data to update
   */
  handleScreenshotError(selectionType, error, selectionData) {
    console.error(`Screenshot error for ${selectionType}:`, error);

    // Ensure image is null if screenshot fails
    if (selectionData) {
      selectionData.image = null;
    }

    // Show non-blocking warning to user
    if (typeof mw !== "undefined" && mw.notify) {
      mw.notify(
        "Screenshot capture failed. Comment will be saved without image.",
        {
          type: "warn",
          autoHide: true,
        },
      );
    }
  }

  /**
   * Create error with context for better debugging
   * @param {string} message - Error message
   * @param {string} selectionType - Type of selection
   * @param {Object} context - Additional context
   * @returns {Error} - Enhanced error object
   */
  createContextualError(message, selectionType, context = {}) {
    const error = new Error(message);
    error.selectionType = selectionType;
    error.context = context;
    error.timestamp = Date.now();
    return error;
  }

  /**
   * Get error statistics for debugging
   * @returns {Object} - Error statistics
   */
  getErrorStats() {
    return {
      errorCounts: Object.fromEntries(this.errorCounts),
      lastErrors: Object.fromEntries(this.lastErrors),
      totalErrors: Array.from(this.errorCounts.values()).reduce(
        (sum, count) => sum + count,
        0,
      ),
    };
  }

  /**
   * Clear error tracking data
   */
  clearErrorStats() {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }
}

// Create and export a singleton instance
export const selectionErrorHandler = new SelectionErrorHandler();

export default {
  SelectionErrorHandler,
  selectionErrorHandler,
};
