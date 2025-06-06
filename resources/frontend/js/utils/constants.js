const { SELECTION_CLASSES, SCREENSHOT_CONFIG, SELECTION_TIMEOUTS } = require('../composables/selection/shared/SelectionConstants.js');

/**
 * Global constants for SmartComments frontend
 */

// MediaWiki content selectors in order of preference
const MEDIAWIKI_SELECTORS = {
    CONTENT_TEXT: 'mw-content-text',
    CONTENT_TEXT_FULL: '#mw-content-text',
    PARSER_OUTPUT: '#mw-content-text > .mw-parser-output',
    BODY_CONTENT: '.mw-body-content',
    CONTENT: '#content',
    BODY: 'body'
};

// Ordered array of selectors to try when finding content root
const CONTENT_ROOT_SELECTORS = [
    MEDIAWIKI_SELECTORS.PARSER_OUTPUT,
    MEDIAWIKI_SELECTORS.CONTENT_TEXT_FULL,
    MEDIAWIKI_SELECTORS.BODY_CONTENT,
    MEDIAWIKI_SELECTORS.CONTENT,
    MEDIAWIKI_SELECTORS.BODY
];

// Selection validation codes - consolidated from SELECTION_ENUMS and SELECTION_VALIDATION_CODES
const SELECTION_VALIDATION = {
    VALID: 0,
    ALREADY_COMMENTED: 1,
    DYNAMIC_CONTENT: 2,
    LINEBREAKS: 3,
    EMPTY: 4,
    HTML_CONTENT: 5,
    UNKNOWN_ERROR: 99
};

// Legacy aliases for backward compatibility
const SELECTION_VALIDATION_CODES = SELECTION_VALIDATION;
const SELECTION_ENUMS = {
    SELECTION_VALID: SELECTION_VALIDATION.VALID,
    INVALID_SELECTION_ALREADY_COMMENTED: SELECTION_VALIDATION.ALREADY_COMMENTED,
    INVALID_SELECTION_INCLUDES_DYNAMIC_CONTENT: SELECTION_VALIDATION.DYNAMIC_CONTENT,
    INVALID_SELECTION_CONTAINS_LINEBREAKS: SELECTION_VALIDATION.LINEBREAKS,
    INVALID_SELECTION_IS_EMPTY: SELECTION_VALIDATION.EMPTY,
    INVALID_SELECTION_CONTAINS_HTML: SELECTION_VALIDATION.HTML_CONTENT,
    UNKNOWN_ERROR: SELECTION_VALIDATION.UNKNOWN_ERROR
};

// CSS classes used by SmartComments
const SMARTCOMMENTS_CLASSES = {
    HIGHLIGHT_TEMP: 'sc-highlight-temp',
    HIGHLIGHT: 'smartcomment-hl-',
    DYNAMIC_BLOCK: 'sc-dynamic-block',
    SELECTION_HIGHLIGHT: 'sc-selection-highlight',
    CANVAS: 'sic-canvas'
};

/**
 * Get the MediaWiki content root element
 * @returns {Element} - The content root element, fallback to body
 */
function getMediaWikiContentRoot() {
    // First try the simple ID approach for screenshot use case
    const contentTextElement = document.getElementById(MEDIAWIKI_SELECTORS.CONTENT_TEXT);
    if (contentTextElement) {
        return contentTextElement;
    }

    // Try different selectors in order of preference for selection use cases
    for (const selector of CONTENT_ROOT_SELECTORS) {
        const element = document.querySelector(selector);
        if (element) {
            return element;
        }
    }

    return document.body;
}

module.exports = {
    MEDIAWIKI_SELECTORS,
    CONTENT_ROOT_SELECTORS,
    SELECTION_VALIDATION,
    SELECTION_VALIDATION_CODES,
    SELECTION_ENUMS,
    SMARTCOMMENTS_CLASSES,
    getMediaWikiContentRoot,
    SELECTION_CLASSES,
    SCREENSHOT_CONFIG,
    SELECTION_TIMEOUTS
}; 