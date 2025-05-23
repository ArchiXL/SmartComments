/**
 * Selection utilities for SmartComments
 * Maintains compatibility with PHP backend expectations
 */

/**
 * Initialize rangy library if not already available
 */
function initializeRangy() {
    if (typeof rangy === 'undefined') {
        console.warn('Rangy library not found. Text selection may not work properly.');
        return false;
    }

    // Initialize rangy modules if needed
    if (rangy.init) {
        rangy.init();
    }

    return true;
}

/**
 * Get the MediaWiki content root for selections
 * @returns {Element|null} - The content root element
 */
function getMediaWikiContentRoot() {
    // Try different selectors in order of preference
    const selectors = [
        "#mw-content-text > .mw-parser-output",
        "#mw-content-text",
        ".mw-body-content",
        "#content",
        "body"
    ];

    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            return element;
        }
    }

    return document.body;
}

/**
 * Validate selection based on the original validation rules
 * @param {*} selection - Rangy selection or HTML string
 * @returns {Object} - Validation result with status and message
 */
function validateSelectionContent(selection) {
    const VALIDATION_RESULTS = {
        VALID: { valid: true, code: 0 },
        ALREADY_COMMENTED: { valid: false, code: 1, message: 'Selection already contains comments' },
        DYNAMIC_CONTENT: { valid: false, code: 2, message: 'Selection includes dynamic content' },
        LINEBREAKS: { valid: false, code: 3, message: 'Selection contains line breaks' },
        EMPTY: { valid: false, code: 4, message: 'Selection is empty' }
    };

    let selectionHTML;

    if (typeof selection === 'string') {
        selectionHTML = selection;
    } else if (selection && typeof selection.toHtml === 'function') {
        selectionHTML = selection.toHtml();
    } else if (selection && typeof selection.toString === 'function') {
        selectionHTML = selection.toString();
    } else {
        return VALIDATION_RESULTS.EMPTY;
    }

    // Check if empty
    if (!selectionHTML || selectionHTML.trim() === '') {
        return VALIDATION_RESULTS.EMPTY;
    }

    // Check for existing comments
    if (selectionHTML.indexOf('smartcomment-hl-') !== -1) {
        return VALIDATION_RESULTS.ALREADY_COMMENTED;
    }

    // Check for dynamic content
    if (selectionHTML.indexOf('sc-dynamic-block') !== -1) {
        return VALIDATION_RESULTS.DYNAMIC_CONTENT;
    }

    // Check for line breaks
    if (selectionHTML.match(/[\n\r]/)) {
        return VALIDATION_RESULTS.LINEBREAKS;
    }

    return VALIDATION_RESULTS.VALID;
}

/**
 * Format selection data for backend compatibility
 * @param {Object} selectionData - Raw selection data
 * @returns {Object} - Formatted selection data
 */
function formatSelectionForBackend(selectionData) {
    const formatted = {
        text: selectionData.text || '',
        index: selectionData.index || 0,
        type: selectionData.type || 'text'
    };

    // For text selections, include additional data that PHP expects
    if (selectionData.type === 'text') {
        // Format as "text|index" for compatibility with existing PHP code
        formatted.position = `${formatted.text}|${formatted.index}`;
    } else {
        // For non-text selections (images, dynamic blocks), just use the text
        formatted.position = formatted.text;
    }

    return formatted;
}

/**
 * Parse selection data from backend format
 * @param {string} position - Backend position string
 * @returns {Object} - Parsed selection data
 */
function parseSelectionFromBackend(position) {
    if (!position) {
        return null;
    }

    // Check if it's in "text|index" format
    if (position.indexOf('|') !== -1) {
        const parts = position.split('|');
        return {
            text: parts[0],
            index: parseInt(parts[1], 10) || 0,
            type: 'text',
            position: position
        };
    }

    // Check if it's an image selection
    if (position.startsWith('img[') && position.endsWith(']')) {
        return {
            text: position,
            index: 0,
            type: 'image',
            position: position
        };
    }

    // Default to dynamic block or simple text
    return {
        text: position,
        index: 0,
        type: 'dynamic-block',
        position: position
    };
}

/**
 * Clean up selection HTML to match original processing
 * @param {string} html - Raw selection HTML
 * @returns {string} - Cleaned HTML
 */
function cleanSelectionHTML(html) {
    if (!html) return '';

    // Remove any temporary highlighting classes
    html = html.replace(/class="[^"]*sc-selection-highlight[^"]*"/g, '');

    // Clean up empty class attributes
    html = html.replace(/\s+class=""\s*/g, ' ');

    return html.trim();
}

/**
 * Check if selection is enabled via URL parameter
 * @returns {boolean} - Whether selection is enabled
 */
function isSelectionEnabled() {
    return window.location.href.indexOf('scenabled=1') !== -1;
}

/**
 * Generate a simple hash for content (fallback for MD5)
 * @param {string} content - Content to hash
 * @returns {string} - Hash string
 */
function simpleHash(content) {
    let hash = 0;
    if (!content || content.length === 0) return '0';

    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
}

/**
 * Create image hash like the original code
 * @param {string} src - Image source
 * @param {number} width - Image width  
 * @param {number} height - Image height
 * @returns {string} - Image hash
 */
function createImageHash(src, width, height) {
    const data = `${src}|${width}|${height}`;

    // Try to use MD5 if available (from old codebase)
    if (typeof hex_md5 === 'function') {
        return hex_md5(data);
    }

    // Fallback to simple hash
    return simpleHash(data);
}

module.exports = {
    initializeRangy,
    getMediaWikiContentRoot,
    validateSelectionContent,
    formatSelectionForBackend,
    parseSelectionFromBackend,
    cleanSelectionHTML,
    isSelectionEnabled,
    simpleHash,
    createImageHash
}; 