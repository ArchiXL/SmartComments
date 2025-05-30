/**
 * Selection constants for SmartComments
 * Centralizes all magic numbers, timeouts, and configuration values
 */

const SELECTION_TIMEOUTS = {
    TEXT_SELECTION_DELAY: 1, // ms delay for text selection processing
    SCREENSHOT_TIMEOUT: 5000, // ms timeout for screenshot operations
    VALIDATION_TIMEOUT: 1000 // ms timeout for validation operations
};

const SELECTION_LIMITS = {
    MAX_TEXT_LENGTH: 10000, // Maximum characters in text selection
    MAX_HTML_LENGTH: 50000, // Maximum HTML content length
    MIN_TEXT_LENGTH: 1, // Minimum meaningful text length
    MAX_SEARCH_ITERATIONS: 1000 // Maximum iterations for text search
};

const SELECTION_PATTERNS = {
    HTML_TAG_REGEX: /<[^>]*>/,
    LINEBREAK_REGEX: /[\n\r]/,
    WHITESPACE_CLEANUP: /[\s\uFEFF\xA0]+/g,
    IMAGE_POSITION_PREFIX: 'img[',
    SVG_POSITION_PREFIX: 'svg[',
    POSITION_SEPARATOR: '|'
};

const SELECTION_CLASSES = {
    TEMP_HIGHLIGHT: 'sc-selection-highlight-temp',
    PERMANENT_HIGHLIGHT: 'sc-selection-highlight',
    DYNAMIC_BLOCK: 'sc-dynamic-block',
    IMAGE_BLOCK: 'sc-image-block',
    COMMENT_VIEW: 'smartcomment-comment-view',
    COMMENT_COMPONENT: 'sc-comment-component'
};

const SELECTION_ERRORS = {
    RANGY_NOT_AVAILABLE: 'Rangy library not available',
    CONTENT_ROOT_NOT_FOUND: 'MediaWiki content root not found',
    SELECTION_EMPTY: 'Selection is empty or contains no searchable content',
    SCREENSHOT_FAILED: 'Screenshot capture failed',
    VALIDATION_FAILED: 'Selection validation failed',
    PROCESSING_FAILED: 'Selection processing failed'
};

const SCREENSHOT_CONFIG = {
    DEFAULT_QUALITY: 0.8,
    DEFAULT_FORMAT: 'image/png',
    CAPTURE_DELAY: 100, // ms delay before screenshot capture
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 500 // ms delay between retries
};

module.exports = {
    SELECTION_TIMEOUTS,
    SELECTION_LIMITS,
    SELECTION_PATTERNS,
    SELECTION_CLASSES,
    SELECTION_ERRORS,
    SCREENSHOT_CONFIG
}; 