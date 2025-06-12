/**
 * Selection constants for SmartComments
 * Centralizes all magic numbers, timeouts, and configuration values
 */

export const SELECTION_TIMEOUTS = {
	TEXT_SELECTION_DELAY: 10,
	SCREENSHOT_TIMEOUT: 1000,
	VALIDATION_TIMEOUT: 1000,
};

export const SELECTION_LIMITS = {
	MAX_TEXT_LENGTH: 10000,
	MAX_HTML_LENGTH: 50000,
	MIN_TEXT_LENGTH: 1,
	MAX_SEARCH_ITERATIONS: 1000,
};

export const SELECTION_PATTERNS = {
	HTML_TAG_REGEX: /<[^>]*>/,
	LINEBREAK_REGEX: /[\n\r]/,
	WHITESPACE_CLEANUP: /[\s\uFEFF\xA0]+/g,
	IMAGE_POSITION_PREFIX: "img[",
	SVG_POSITION_PREFIX: "svg[",
	POSITION_SEPARATOR: "|",
};

export const SELECTION_CLASSES = {
	TEMP_HIGHLIGHT: "sc-selection-highlight-temp",
	PERMANENT_HIGHLIGHT: "sc-selection-highlight",
	DYNAMIC_BLOCK: "sc-dynamic-block",
	IMAGE_BLOCK: "sc-image-block",
	COMMENT_VIEW: "smartcomment-comment-view",
	COMMENT_COMPONENT: "sc-comment-component",
};

export const SELECTION_ERRORS = {
	RANGY_NOT_AVAILABLE: "Rangy library not available",
	CONTENT_ROOT_NOT_FOUND: "MediaWiki content root not found",
	SELECTION_EMPTY: "Selection is empty or contains no searchable content",
	SCREENSHOT_FAILED: "Screenshot capture failed",
	VALIDATION_FAILED: "Selection validation failed",
	PROCESSING_FAILED: "Selection processing failed",
};

export const SCREENSHOT_CONFIG = {
	DEFAULT_QUALITY: 0.8,
	DEFAULT_FORMAT: "image/png",
	CAPTURE_DELAY: 10,
	RETRY_ATTEMPTS: 3,
	RETRY_DELAY: 500,
	FIXED_WIDTH: 500,
	MAX_HEIGHT: 150,
	MIN_HEIGHT: 50,
};

export default {
	SELECTION_TIMEOUTS,
	SELECTION_LIMITS,
	SELECTION_PATTERNS,
	SELECTION_CLASSES,
	SELECTION_ERRORS,
	SCREENSHOT_CONFIG,
};
