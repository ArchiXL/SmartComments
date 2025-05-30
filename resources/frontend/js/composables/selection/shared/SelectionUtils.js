/**
 * Selection utilities for SmartComments
 * Maintains compatibility with PHP backend expectations
 * Enhanced with security fixes and performance improvements
 */
const useAppStateStore = require('../../../store/appStateStore.js');
const { CONTENT_ROOT_SELECTORS, SELECTION_VALIDATION, SMARTCOMMENTS_CLASSES, getMediaWikiContentRoot } = require('../../../utils/constants.js');
const { SELECTION_PATTERNS, SELECTION_LIMITS, SELECTION_CLASSES } = require('./SelectionConstants.js');

// Cache for frequently accessed elements
const elementCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

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
 * Enhanced with XSS protection and better validation
 * @param {*} selection - Rangy selection, HTML string, or DOM element
 * @returns {number} - Validation result code from SELECTION_VALIDATION
 */
function validateSelectionContent(selection) {
    let selectionHTML;

    if (typeof selection === 'string') {
        selectionHTML = sanitizeHTMLForValidation(selection);
    } else if (selection && typeof selection.toHtml === 'function') {
        selectionHTML = sanitizeHTMLForValidation(selection.toHtml());
    } else if (selection && typeof selection.toString === 'function') {
        // For rangy range objects, toString() gives the plain text
        selectionHTML = selection.toString();

        // For empty strings, check if it's a range around an element (like image)
        if (!selectionHTML && selection.commonAncestorContainer &&
            selection.commonAncestorContainer.nodeType === Node.ELEMENT_NODE) {
            const container = selection.commonAncestorContainer;
            if (container.querySelector('img')) {
                selectionHTML = sanitizeHTMLForValidation(container.outerHTML);
            }
        }
    } else {
        return SELECTION_VALIDATION.EMPTY;
    }

    // Check if empty (after sanitization)
    if (!selectionHTML || selectionHTML.trim() === '') {
        return SELECTION_VALIDATION.EMPTY;
    }

    // Check length limits
    if (selectionHTML.length > SELECTION_LIMITS.MAX_HTML_LENGTH) {
        console.warn(`Selection too long: ${selectionHTML.length} characters`);
        return SELECTION_VALIDATION.HTML_CONTENT; // Treat as invalid HTML
    }

    // Check for existing comments
    if (selectionHTML.includes(SELECTION_CLASSES.PERMANENT_HIGHLIGHT)) {
        return SELECTION_VALIDATION.ALREADY_COMMENTED;
    }

    // Check for dynamic content with enhanced logic
    if (containsDynamicContent(selectionHTML)) {
        return SELECTION_VALIDATION.DYNAMIC_CONTENT;
    }

    // Check for line breaks (relevant for text selections)
    if (selection.constructor && selection.constructor.name === 'Range') {
        if (SELECTION_PATTERNS.LINEBREAK_REGEX.test(selection.toString())) {
            return SELECTION_VALIDATION.LINEBREAKS;
        }
    }

    // Check for HTML content in text selections
    if (selectionHTML && SELECTION_PATTERNS.HTML_TAG_REGEX.test(selectionHTML)) {
        return SELECTION_VALIDATION.HTML_CONTENT;
    }

    return SELECTION_VALIDATION.VALID;
}

/**
 * Sanitize HTML content for validation (removes dangerous content)
 * @param {string} html - Raw HTML content
 * @returns {string} - Sanitized HTML
 */
function sanitizeHTMLForValidation(html) {
    if (typeof html !== 'string') {
        return '';
    }

    // Remove script tags and dangerous attributes
    let sanitized = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/data:/gi, '')
        .trim();

    // Limit length for performance
    if (sanitized.length > SELECTION_LIMITS.MAX_HTML_LENGTH) {
        sanitized = sanitized.substring(0, SELECTION_LIMITS.MAX_HTML_LENGTH) + '...';
    }

    return sanitized;
}

/**
 * Check if HTML contains dynamic content that should not be selected
 * @param {string} html - HTML content to check
 * @returns {boolean} - Whether HTML contains problematic dynamic content
 */
function containsDynamicContent(html) {
    if (!html) return false;

    // Create a safe DOM parser for checking structure
    const parser = new DOMParser();
    let doc;

    try {
        doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    } catch (error) {
        console.warn('Failed to parse HTML for dynamic content check:', error);
        return false;
    }

    const container = doc.body.firstChild;
    if (!container) return false;

    // Check if the entire selection is a single dynamic block (allowed)
    if (container.children.length === 1 &&
        container.firstElementChild.classList.contains(SELECTION_CLASSES.DYNAMIC_BLOCK)) {
        return false;
    }

    // Check for embedded dynamic blocks (not allowed)
    const dynamicBlocks = container.querySelectorAll(`.${SELECTION_CLASSES.DYNAMIC_BLOCK}`);
    return dynamicBlocks.length > 0;
}

/**
 * Format selection data for backend compatibility
 * @param {Object} selectionData - Raw selection data
 * @returns {Object} - Formatted selection data
 */
function formatSelectionForBackend(selectionData) {
    if (!selectionData) {
        return null;
    }

    const formatted = {
        text: String(selectionData.text || ''),
        index: Number(selectionData.index) || 0,
        type: String(selectionData.type || 'text')
    };

    // For text selections, include additional data that PHP expects
    if (selectionData.type === 'text') {
        // Format as "text|index" for compatibility with existing PHP code
        formatted.position = `${formatted.text}${SELECTION_PATTERNS.POSITION_SEPARATOR}${formatted.index}`;
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
    if (!position || typeof position !== 'string') {
        return null;
    }

    // Check if it's in "text|index" format
    const separatorIndex = position.indexOf(SELECTION_PATTERNS.POSITION_SEPARATOR);
    if (separatorIndex !== -1) {
        const parts = [
            position.substring(0, separatorIndex),
            position.substring(separatorIndex + 1)
        ];
        return {
            text: parts[0],
            index: parseInt(parts[1], 10) || 0,
            type: 'text',
            position: position
        };
    }

    // Check if it's an image selection
    if (position.startsWith(SELECTION_PATTERNS.IMAGE_POSITION_PREFIX) && position.endsWith(']')) {
        return {
            text: position,
            index: 0,
            type: 'image',
            position: position
        };
    }

    // Check if it's an SVG selection
    if (position.startsWith(SELECTION_PATTERNS.SVG_POSITION_PREFIX) && position.endsWith(']')) {
        return {
            text: position,
            index: 0,
            type: 'svg',
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
    if (!html || typeof html !== 'string') {
        return '';
    }

    // Remove any temporary highlighting classes
    let cleaned = html.replace(
        new RegExp(`class="[^"]*${SELECTION_CLASSES.TEMP_HIGHLIGHT}[^"]*"`, 'g'),
        ''
    );

    // Clean up empty class attributes
    cleaned = cleaned.replace(/\s+class=""\s*/g, ' ');

    // Clean up excessive whitespace
    cleaned = cleaned.replace(SELECTION_PATTERNS.WHITESPACE_CLEANUP, ' ');

    return cleaned.trim();
}

/**
 * Check if selection is enabled via URL parameter or button state
 * @returns {boolean} - Whether selection is enabled
 */
function isSelectionEnabled() {
    try {
        const store = useAppStateStore();
        return store.isEnabled;
    } catch (error) {
        console.warn('Could not access app state store for selection status:', error);
        return false;
    }
}

/**
 * Generate a simple hash for content (fallback for MD5)
 * Enhanced with better distribution and collision resistance
 * @param {string} content - Content to hash
 * @returns {string} - Hash string
 */
function simpleHash(content) {
    if (!content || typeof content !== 'string' || content.length === 0) {
        return '0';
    }

    let hash = 0;
    let secondaryHash = 0;

    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);

        // Primary hash with better distribution
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer

        // Secondary hash for collision resistance
        secondaryHash = ((secondaryHash << 3) - secondaryHash) + char;
        secondaryHash = secondaryHash & secondaryHash;
    }

    // Combine both hashes
    const combined = Math.abs(hash) ^ Math.abs(secondaryHash);
    return combined.toString(16);
}

/**
 * Create image hash like the original code
 * Enhanced with input validation
 * @param {string} src - Image source
 * @param {number} width - Image width  
 * @param {number} height - Image height
 * @returns {string} - Image hash
 */
function createImageHash(src, width, height) {
    // Validate and sanitize inputs
    const safeSrc = String(src || '').substring(0, 500); // Limit URL length
    const safeWidth = Number(width) || 0;
    const safeHeight = Number(height) || 0;

    const data = `${safeSrc}${SELECTION_PATTERNS.POSITION_SEPARATOR}${safeWidth}${SELECTION_PATTERNS.POSITION_SEPARATOR}${safeHeight}`;

    // Try to use MD5 if available (from old codebase)
    if (typeof hex_md5 === 'function') {
        try {
            return hex_md5(data);
        } catch (error) {
            console.warn('MD5 function failed, using fallback hash:', error);
        }
    }

    // Fallback to simple hash
    return simpleHash(data);
}

/**
 * Create SVG hash for consistent identification
 * Enhanced with input validation
 * @param {string} uniqueId - The unique ID generated for the SVG
 * @param {string} href - The href attribute of the SVG link
 * @param {string} textContent - The text content of the SVG
 * @returns {string} - SVG hash
 */
function createSVGHash(uniqueId, href, textContent) {
    // Validate and sanitize inputs
    const safeUniqueId = String(uniqueId || '').substring(0, 100);
    const safeHref = String(href || '').substring(0, 500);
    const safeTextContent = String(textContent || '').substring(0, 200);

    const data = `${safeUniqueId}${SELECTION_PATTERNS.POSITION_SEPARATOR}${safeHref}${SELECTION_PATTERNS.POSITION_SEPARATOR}${safeTextContent}`;

    // Try to use MD5 if available (from old codebase)
    if (typeof hex_md5 === 'function') {
        try {
            return hex_md5(data);
        } catch (error) {
            console.warn('MD5 function failed, using fallback hash:', error);
        }
    }

    // Fallback to simple hash
    return simpleHash(data);
}

/**
 * Gets the root element for comments with caching for performance
 * @returns {HTMLElement} The content root element
 * @throws {Error} If the content root is not found or is invalid
 */
function getContentRoot() {
    const cacheKey = 'contentRoot';
    const cached = getCachedElement(cacheKey);

    if (cached) {
        return cached;
    }

    // Check if SmartComments is enabled before proceeding
    if (!isSelectionEnabled()) {
        console.warn('SmartComments is not enabled. Operations in getContentRoot might be restricted.');
    }

    const contentRootId = 'bodyContent'; // Standard MediaWiki content ID
    const contentRoot = document.getElementById(contentRootId);

    if (!contentRoot) {
        throw new Error(`Content root element with id ${contentRootId} not found.`);
    }

    // Cache the element
    setCachedElement(cacheKey, contentRoot);
    return contentRoot;
}

/**
 * Cache element with TTL
 * @param {string} key - Cache key
 * @param {Element} element - Element to cache
 */
function setCachedElement(key, element) {
    elementCache.set(key, {
        element,
        timestamp: Date.now()
    });
}

/**
 * Get cached element if still valid
 * @param {string} key - Cache key
 * @returns {Element|null} - Cached element or null
 */
function getCachedElement(key) {
    const cached = elementCache.get(key);

    if (!cached) {
        return null;
    }

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > CACHE_TTL) {
        elementCache.delete(key);
        return null;
    }

    // Verify element is still in DOM
    if (!document.contains(cached.element)) {
        elementCache.delete(key);
        return null;
    }

    return cached.element;
}

/**
 * Clear element cache
 */
function clearElementCache() {
    elementCache.clear();
}

/**
 * Clean text content with enhanced whitespace handling
 * @param {string} text - Raw text
 * @returns {string} - Cleaned text
 */
function getCleanText(text) {
    if (typeof text !== 'string') {
        return '';
    }

    return text
        .replace(SELECTION_PATTERNS.WHITESPACE_CLEANUP, ' ')
        .trim()
        .substring(0, SELECTION_LIMITS.MAX_TEXT_LENGTH); // Limit length
}

/**
 * Check if SmartComments functionality is enabled
 * @returns {boolean} True if SmartComments is enabled, false otherwise
 */
function isSmartCommentsEnabled() {
    return isSelectionEnabled();
}

/**
 * Validate URL for safety (prevent XSS through data URLs, etc.)
 * @param {string} url - URL to validate
 * @returns {boolean} - Whether URL is safe
 */
function isValidURL(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }

    try {
        const urlObj = new URL(url);
        // Allow only safe protocols
        const safeProtocols = ['http:', 'https:', 'ftp:', 'ftps:'];
        return safeProtocols.includes(urlObj.protocol);
    } catch (error) {
        return false;
    }
}

/**
 * Get performance metrics for selection utilities
 * @returns {Object} - Performance metrics
 */
function getPerformanceMetrics() {
    return {
        cacheSize: elementCache.size,
        cacheHitRate: elementCache.size > 0 ? 'Available' : 'No data',
        validationCalls: 'Not tracked', // Could be enhanced with counters
        lastCacheClean: Date.now()
    };
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
    createSVGHash,
    getContentRoot,
    getCleanText,
    isSmartCommentsEnabled,
    isValidURL,
    clearElementCache,
    getPerformanceMetrics,

    // Enhanced utilities
    sanitizeHTMLForValidation,
    containsDynamicContent,
    setCachedElement,
    getCachedElement
}; 