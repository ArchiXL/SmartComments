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

// Validation codes for selection validation
const SELECTION_VALIDATION_CODES = {
    VALID: 0,
    ALREADY_COMMENTED: 1,
    DYNAMIC_CONTENT: 2,
    LINEBREAKS: 3,
    EMPTY: 4,
    HTML_CONTENT: 5
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
    SELECTION_VALIDATION_CODES,
    SMARTCOMMENTS_CLASSES,
    getMediaWikiContentRoot
}; 