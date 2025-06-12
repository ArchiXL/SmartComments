/**
 * Selection utilities for SmartComments
 * Maintains compatibility with PHP backend expectations
 * Enhanced with security fixes and performance improvements
 */
import {useAppStateStore} from "../../../store/appStateStore.js";
import {
	CONTENT_ROOT_SELECTORS,
	SELECTION_VALIDATION,
	SMARTCOMMENTS_CLASSES,
	getMediaWikiContentRoot,
} from "../../../utils/constants.js";
import {
	SELECTION_PATTERNS,
	SELECTION_LIMITS,
	SELECTION_CLASSES,
} from "./SelectionConstants.js";

// Cache for frequently accessed elements
const elementCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

/**
 * Initialize rangy library if not already available
 * @returns {boolean} - Whether rangy was successfully initialized
 */
export function initializeRangy() {
	// Check if rangy is already initialized
	if ( window.rangy && window.rangy.initialized ) {
		return true;
	}

	// Check if rangy is available
	if ( typeof window.rangy === "undefined" ) {
		console.error(
			"Rangy library not found. Text selection may not work properly.",
		);
		return false;
	}

	try {
		// Initialize rangy if not already initialized
		if ( !window.rangy.initialized && window.rangy.init ) {
			window.rangy.init();
		}
		return true;
	} catch ( error ) {
		console.error( "Failed to initialize Rangy:", error );
		return false;
	}
}

/**
 * Validate selection based on the original validation rules
 * Enhanced with XSS protection and better validation
 * @param {*} selection - Rangy selection, HTML string, or DOM element
 * @returns {number} - Validation result code from SELECTION_VALIDATION
 */
export function validateSelectionContent( selection ) {
	let selectionHTML;

	if ( typeof selection === "string" ) {
		selectionHTML = sanitizeHTMLForValidation( selection );
	} else if ( selection && typeof selection.toHtml === "function" ) {
		selectionHTML = sanitizeHTMLForValidation( selection.toHtml() );
	} else if ( selection && typeof selection.toString === "function" ) {
		// For rangy range objects, toString() gives the plain text
		selectionHTML = selection.toString();

		// For empty strings, check if it's a range around an element (like image)
		if (
			!selectionHTML &&
			selection.commonAncestorContainer &&
			selection.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
		) {
			const container = selection.commonAncestorContainer;
			if ( container.querySelector( "img" ) ) {
				selectionHTML = sanitizeHTMLForValidation( container.outerHTML );
			}
		}
	} else {
		return SELECTION_VALIDATION.EMPTY;
	}

	// Check if empty (after sanitization)
	if ( !selectionHTML || selectionHTML.trim() === "" ) {
		return SELECTION_VALIDATION.EMPTY;
	}

	// Check length limits
	if ( selectionHTML.length > SELECTION_LIMITS.MAX_HTML_LENGTH ) {
		console.warn( `Selection too long: ${selectionHTML.length} characters` );
		return SELECTION_VALIDATION.HTML_CONTENT; // Treat as invalid HTML
	}

	// Check for existing comments
	if ( selectionHTML.includes( SELECTION_CLASSES.PERMANENT_HIGHLIGHT ) ) {
		return SELECTION_VALIDATION.ALREADY_COMMENTED;
	}

	// Check for dynamic content with enhanced logic
	if ( containsDynamicContent( selectionHTML ) ) {
		return SELECTION_VALIDATION.DYNAMIC_CONTENT;
	}

	// Check for line breaks (relevant for text selections)
	if ( selection.constructor && selection.constructor.name === "Range" ) {
		if ( SELECTION_PATTERNS.LINEBREAK_REGEX.test( selection.toString() ) ) {
			return SELECTION_VALIDATION.LINEBREAKS;
		}
	}

	// Check for HTML content in text selections
	if ( selectionHTML && SELECTION_PATTERNS.HTML_TAG_REGEX.test( selectionHTML ) ) {
		return SELECTION_VALIDATION.HTML_CONTENT;
	}

	return SELECTION_VALIDATION.VALID;
}

/**
 * Sanitize HTML content for validation (removes dangerous content)
 * @param {string} html - Raw HTML content
 * @returns {string} - Sanitized HTML
 */
export function sanitizeHTMLForValidation( html ) {
	if ( typeof html !== "string" ) {
		return "";
	}

	// Remove script tags and dangerous attributes
	let sanitized = html
		.replace( /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "" )
		.replace( /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "" )
		.replace( /javascript:/gi, "" )
		.replace( /on\w+\s*=/gi, "" )
		.replace( /vbscript:/gi, "" )
		.replace( /data:/gi, "" )
		.trim();

	// Limit length for performance
	if ( sanitized.length > SELECTION_LIMITS.MAX_HTML_LENGTH ) {
		sanitized =
			sanitized.substring( 0, SELECTION_LIMITS.MAX_HTML_LENGTH ) + "...";
	}

	return sanitized;
}

/**
 * Check if HTML contains dynamic content that should not be selected
 * @param {string} html - HTML content to check
 * @returns {boolean} - Whether HTML contains problematic dynamic content
 */
export function containsDynamicContent( html ) {
	if ( !html ) return false;

	// Create a safe DOM parser for checking structure
	const parser = new DOMParser();
	let doc;

	try {
		doc = parser.parseFromString( `<div>${html}</div>`, "text/html" );
	} catch ( error ) {
		console.warn( "Failed to parse HTML for dynamic content check:", error );
		return false;
	}

	const container = doc.body.firstChild;
	if ( !container ) return false;

	// Check if the entire selection is a single dynamic block (allowed)
	if (
		container.children.length === 1 &&
		container.firstElementChild.classList.contains(
			SELECTION_CLASSES.DYNAMIC_BLOCK,
		)
	) {
		return false;
	}

	// Check for embedded dynamic blocks (not allowed)
	const dynamicBlocks = container.querySelectorAll(
		`.${SELECTION_CLASSES.DYNAMIC_BLOCK}`,
	);
	return dynamicBlocks.length > 0;
}

/**
 * Format selection data for backend compatibility
 * @param {Object} selectionData - Raw selection data
 * @returns {Object} - Formatted selection data
 */
export function formatSelectionForBackend( selectionData ) {
	if ( !selectionData ) {
		return null;
	}

	const formatted = {
		text: String( selectionData.text || "" ),
		index: Number( selectionData.index ) || 0,
		type: String( selectionData.type || "text" ),
	};

	// For text selections, include additional data that PHP expects
	if ( selectionData.type === "text" ) {
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
export function parseSelectionFromBackend( position ) {
	if ( !position || typeof position !== "string" ) {
		return null;
	}

	// Check if it's in "text|index" format
	const separatorIndex = position.indexOf(
		SELECTION_PATTERNS.POSITION_SEPARATOR,
	);
	if ( separatorIndex !== -1 ) {
		const parts = [
			position.substring( 0, separatorIndex ),
			position.substring( separatorIndex + 1 ),
		];

		return {
			text: parts[ 0 ],
			index: parseInt( parts[ 1 ], 10 ) || 0,
			type: "text",
			position: position,
		};
	}

	// Check if it's an image selector
	if ( position.startsWith( SELECTION_PATTERNS.IMAGE_POSITION_PREFIX ) ) {
		return {
			text: position,
			type: "image",
			position: position,
		};
	}

	// Check if it's an SVG selector
	if ( position.startsWith( SELECTION_PATTERNS.SVG_POSITION_PREFIX ) ) {
		return {
			text: position,
			type: "svg",
			position: position,
		};
	}

	// For dynamic blocks or other selectors, return as-is
	return {
		text: position,
		type: "dynamic-block",
		position: position,
	};
}

/**
 * Clean selection HTML for display
 * @param {string} html - Raw HTML content
 * @returns {string} - Cleaned HTML
 */
export function cleanSelectionHTML( html ) {
	if ( !html ) return "";

	return sanitizeHTMLForValidation( html ).replace( /\s+/g, " " ).trim();
}

/**
 * Check if selection functionality is enabled
 * @returns {boolean} - Whether selection is enabled
 */
export function isSelectionEnabled() {
	const store = useAppStateStore();
	return store.isEnabled;
}

/**
 * Generate a simple hash for content
 * @param {string} content - Content to hash
 * @returns {string} - Hash string
 */
export function simpleHash( content ) {
	if ( !content ) return "";

	let hash = 0;
	for ( let i = 0; i < content.length; i++ ) {
		const char = content.charCodeAt( i );
		hash = ( hash << 5 ) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}

	// Convert to positive hex string
	return Math.abs( hash ).toString( 16 );
}

/**
 * Create a hash for an image based on its properties
 * @param {string} src - Image source URL
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {string} - Image hash
 */
export function createImageHash( src, width, height ) {
	if ( !src ) return "";

	const normalized = src.replace( /^https?:\/\//, "" );
	const dimensions = `${width || 0}x${height || 0}`;
	return simpleHash( `${normalized}|${dimensions}` );
}

/**
 * Create a hash for an SVG element
 * @param {string} uniqueId - SVG unique ID
 * @param {string} href - SVG href attribute
 * @param {string} textContent - SVG text content
 * @returns {string} - SVG hash
 */
export function createSVGHash( uniqueId, href, textContent ) {
	const parts = [uniqueId || "", href || "", ( textContent || "" ).trim()].filter(
		Boolean,
	);

	return simpleHash( parts.join( "|" ) );
}

/**
 * Get the content root element
 * @returns {Element} - Content root element
 */
export function getContentRoot() {
	// Try cache first
	const cached = getCachedElement( "contentRoot" );
	if ( cached ) return cached;

	// Find the root element
	const root = getMediaWikiContentRoot();
	if ( !root ) {
		console.error( "Could not find MediaWiki content root element" );
		return document.body;
	}

	// Cache the result
	setCachedElement( "contentRoot", root );
	return root;
}

/**
 * Set a cached element with TTL
 * @param {string} key - Cache key
 * @param {Element} element - Element to cache
 */
export function setCachedElement( key, element ) {
	if ( !key || !element ) return;

	elementCache.set( key, {
		element,
		timestamp: Date.now(),
	} );
}

/**
 * Get a cached element if not expired
 * @param {string} key - Cache key
 * @returns {Element|null} - Cached element or null
 */
export function getCachedElement( key ) {
	if ( !key ) return null;

	const cached = elementCache.get( key );
	if ( !cached ) return null;

	// Check if expired
	if ( Date.now() - cached.timestamp > CACHE_TTL ) {
		elementCache.delete( key );
		return null;
	}

	return cached.element;
}

/**
 * Clear the element cache
 */
export function clearElementCache() {
	elementCache.clear();
}

/**
 * Clean text content for display
 * @param {string} text - Raw text content
 * @returns {string} - Cleaned text
 */
export function getCleanText( text ) {
	if ( !text ) return "";

	return text.replace( SELECTION_PATTERNS.WHITESPACE_CLEANUP, " " ).trim();
}

/**
 * Check if SmartComments functionality is enabled
 * @returns {boolean} - Whether SmartComments is enabled
 */
export function isSmartCommentsEnabled() {
	return isSelectionEnabled();
}

/**
 * Validate a URL string
 * @param {string} url - URL to validate
 * @returns {boolean} - Whether URL is valid
 */
export function isValidURL( url ) {
	if ( !url ) return false;

	try {
		const parsed = new URL( url );
		return ["http:", "https:"].includes( parsed.protocol );
	} catch ( e ) {
		return false;
	}
}

/**
 * Sanitize a string for use as an ID
 * @param {string} str - Input string
 * @returns {string} - Sanitized string
 */
export function sanitizeIdString( str ) {
	if ( !str ) return "";

	return str
		.replace( /[^a-z0-9-]/gi, "-" )
		.replace( /-+/g, "-" )
		.toLowerCase();
}

/**
 * Get performance metrics for debugging
 * @returns {Object} - Performance metrics
 */
export function getPerformanceMetrics() {
	return {
		cacheSize: elementCache.size,
		cacheKeys: Array.from( elementCache.keys() ),
		timestamp: Date.now(),
	};
}

export default {
	initializeRangy,
	validateSelectionContent,
	sanitizeHTMLForValidation,
	containsDynamicContent,
	formatSelectionForBackend,
	parseSelectionFromBackend,
	cleanSelectionHTML,
	isSelectionEnabled,
	simpleHash,
	createImageHash,
	createSVGHash,
	getContentRoot,
	setCachedElement,
	getCachedElement,
	clearElementCache,
	getCleanText,
	isSmartCommentsEnabled,
	isValidURL,
	sanitizeIdString,
	getPerformanceMetrics,
};
