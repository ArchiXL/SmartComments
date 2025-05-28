/**
 * Selection utilities for SmartComments
 * Maintains compatibility with PHP backend expectations
 */
const useAppStateStore = require('../store/appStateStore.js');
const { CONTENT_ROOT_SELECTORS, SELECTION_VALIDATION_CODES, SMARTCOMMENTS_CLASSES, getMediaWikiContentRoot } = require('./constants.js');

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
 * Validate selection based on the original validation rules
 * @param {*} selection - Rangy selection or HTML string
 * @returns {Object} - Validation result with status and message
 */
function validateSelectionContent(selection) {
    // Use centralized validation codes
    const VALIDATION_CODES = SELECTION_VALIDATION_CODES;

    let selectionHTML;

    if (typeof selection === 'string') {
        selectionHTML = selection;
    } else if (selection && typeof selection.toHtml === 'function') {
        selectionHTML = selection.toHtml();
    } else if (selection && typeof selection.toString === 'function') {
        // For rangy range objects, toString() gives the plain text. 
        // toHtml() is better for checking content like smartcomment-hl or sc-dynamic-block.
        // However, if toHtml is not available, try toString().
        // Consider if an empty string from toString() should immediately be EMPTY or if HTML check is still useful.
        selectionHTML = selection.toString();
        if (!selectionHTML && selection.commonAncestorContainer && selection.commonAncestorContainer.nodeType === Node.ELEMENT_NODE && selection.commonAncestorContainer.querySelector('img')) {
            // If string is empty but it's a range potentially around an image, get outerHTML of ancestor
            selectionHTML = selection.commonAncestorContainer.outerHTML;
        }
    } else {
        return VALIDATION_CODES.EMPTY;
    }

    // Check if empty (after potentially getting HTML from an image selection)
    if (!selectionHTML || selectionHTML.trim() === '') {
        return VALIDATION_CODES.EMPTY;
    }

    // Check for existing comments
    if (selectionHTML.includes(SMARTCOMMENTS_CLASSES.HIGHLIGHT)) {
        return VALIDATION_CODES.ALREADY_COMMENTED;
    }

    // Check for dynamic content (but allow if the selection IS the dynamic block itself, e.g. for image selection)
    // This needs more careful handling. For now, if it *contains* sc-dynamic-block and isn't just the block itself.
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = selectionHTML;
    const firstChild = tempDiv.firstChild;

    if (selectionHTML.includes(SMARTCOMMENTS_CLASSES.DYNAMIC_BLOCK)) {
        // If the selection itself is a dynamic block, it might be valid (e.g. selecting an image that is wrapped)
        // This case is typically handled by specific image/dynamic block selection logic, not general text selection.
        // For general text selection, finding sc-dynamic-block inside is invalid.
        if (!(firstChild && firstChild.classList && firstChild.classList.contains(SMARTCOMMENTS_CLASSES.DYNAMIC_BLOCK) && tempDiv.childNodes.length === 1)) {
            // It's not SOLELY the dynamic block, so it's embedded dynamic content.
            // return VALIDATION_CODES.DYNAMIC_CONTENT; // Re-evaluate this rule based on usage
        }
    }

    // Check for line breaks (relevant for text selections)
    // For outerHTML of elements, line breaks might be part of formatting.
    if (selection.constructor && selection.constructor.name === 'Range') { // Apply only for Rangy Range objects (text selections)
        if (selection.toString().match(/[\n\r]/)) {
            return VALIDATION_CODES.LINEBREAKS;
        }
    }

    return VALIDATION_CODES.VALID;
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
    html = html.replace(new RegExp(`class="[^"]*${SMARTCOMMENTS_CLASSES.SELECTION_HIGHLIGHT}[^"]*"`, 'g'), '');

    // Clean up empty class attributes
    html = html.replace(/\s+class=""\s*/g, ' ');

    return html.trim();
}

/**
 * Check if selection is enabled via URL parameter or button state
 * @returns {boolean} - Whether selection is enabled
 */
function isSelectionEnabled() {
    const store = useAppStateStore();
    return store.isEnabled;
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

/**
 * Gets the root element for comments, ensuring it's valid.
 * @returns {HTMLElement} The content root element.
 * @throws {Error} If the content root is not found or is invalid.
 */
function getContentRoot() {
    // Check if SmartComments is enabled before proceeding
    const store = useAppStateStore(); // Get store instance
    if (!store.isEnabled) { // Assuming 'isEnabled' is a reactive property or getter
        console.warn('SmartComments is not enabled. Operations in getContentRoot might be restricted or unexpected.');
        // Depending on strictness, you might throw an error or return a sensible default/null
        // For now, we'll allow it to proceed but log a warning.
    }

    const contentRootId = 'bodyContent'; // Standard MediaWiki content ID
    const contentRoot = document.getElementById(contentRootId);
    if (!contentRoot) {
        throw new Error(`Content root element with id ${contentRootId} not found.`);
    }
    return contentRoot;
}

function getCleanText(text) {
    if (typeof text !== 'string') return '';
    return text.replace(/[\s\uFEFF\xA0]+/g, ' ').trim();
}

/**
 * NEW: Checks if SmartComments functionality is enabled. Placeholder for now.
 * This function will eventually check the global state (e.g., from Pinia store or a global flag).
 * @returns {boolean} True if SmartComments is enabled, false otherwise.
 */
function isSmartCommentsEnabled() {
    const store = useAppStateStore();
    return store.isEnabled; // Assuming 'isEnabled' is a reactive property or getter
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
    createImageHash,
    getContentRoot,
    getCleanText,
    isSmartCommentsEnabled
}; 