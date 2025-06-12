/**
 * Shared utilities for highlight operations
 * Consolidates common DOM operations and reduces code duplication
 */

/**
 * Constants for highlight operations
 */
export const HIGHLIGHT_CLASS_PREFIX = "smartcomment-hl-";
export const DATA_COMMENT_ID_ATTR = "data-comment-id";
export const DATA_SVG_ID_ATTR = "data-svg-id";

/**
 * Sanitize and validate comment ID
 * @param {string|number} commentId - The comment ID to sanitize
 * @returns {string} - Sanitized comment ID
 * @throws {Error} - If comment ID is invalid
 */
export function sanitizeCommentId( commentId ) {
	if ( commentId === null || commentId === undefined ) {
		throw new Error( "Comment ID cannot be null or undefined" );
	}

	const sanitized = String( commentId ).replace( /[^a-zA-Z0-9-_]/g, "" );
	if ( !sanitized ) {
		throw new Error( "Comment ID must contain valid characters" );
	}

	return sanitized;
}

/**
 * Generate unique highlight class name
 * @param {string|number} commentId - The comment ID
 * @returns {string} - Unique highlight class name
 */
export function generateHighlightClass( commentId ) {
	return `${HIGHLIGHT_CLASS_PREFIX}${sanitizeCommentId( commentId )}`.trim();
}

/**
 * Validate CSS selector for security
 * @param {string} selector - CSS selector to validate
 * @returns {boolean} - True if selector is safe
 */
export function isValidSelector( selector ) {
	try {
		// Test if it's a valid CSS selector by attempting to use it
		document.querySelector( selector );

		// Additional security checks
		const dangerous = ["javascript:", "expression(", "url(", "@import"];
		const lowerSelector = selector.toLowerCase();

		return !dangerous.some( ( danger ) => lowerSelector.includes( danger ) );
	} catch ( e ) {
		return false;
	}
}

/**
 * Check if element has other SmartComment highlight classes
 * @param {Element} element - The element to check
 * @param {string} excludeClass - Class to exclude from check
 * @returns {boolean} - True if element has other SmartComment classes
 */
export function hasOtherSmartCommentClasses( element, excludeClass ) {
	return Array.from( element.classList ).some(
		( cls ) => cls.startsWith( HIGHLIGHT_CLASS_PREFIX ) && cls !== excludeClass,
	);
}

/**
 * Remove highlight class and cleanup attributes
 * @param {Element} element - The element to clean up
 * @param {string} highlightClass - The highlight class to remove
 */
export function cleanupHighlightElement( element, highlightClass ) {
	element.classList.remove( highlightClass );

	if ( !hasOtherSmartCommentClasses( element, highlightClass ) ) {
		element.removeAttribute( DATA_COMMENT_ID_ATTR );

		// Remove data-svg-id only if specified
		if ( element.hasAttribute( DATA_SVG_ID_ATTR ) ) {
			element.removeAttribute( DATA_SVG_ID_ATTR );
		}
	}
}

/**
 * Find all highlighted elements for a comment
 * @param {Element} scopeElement - The scope to search within
 * @param {string|number} commentId - The comment ID
 * @returns {NodeList} - Found highlighted elements
 */
export function findHighlightedElements( scopeElement, commentId ) {
	const highlightClass = generateHighlightClass( commentId );
	return scopeElement.querySelectorAll( `.${highlightClass}` );
}

/**
 * Unwrap empty SPAN elements safely
 * @param {Element} spanElement - The SPAN element to potentially unwrap
 */
export function unwrapEmptySpan( spanElement ) {
	if ( spanElement.tagName !== "SPAN" ) return;

	const shouldUnwrap =
		spanElement.classList.length === 0 &&
		!spanElement.hasAttributes() &&
		spanElement.innerHTML === spanElement.textContent;

	if ( shouldUnwrap ) {
		const parent = spanElement.parentNode;
		if ( parent ) {
			while ( spanElement.firstChild ) {
				parent.insertBefore( spanElement.firstChild, spanElement );
			}
			parent.removeChild( spanElement );
			try {
				parent.normalize();
			} catch ( e ) {
				console.warn( "Error normalizing parent after span unwrap:", e );
			}
		}
	}
}

/**
 * Set element attributes safely with validation
 * @param {Element} element - The element to modify
 * @param {string|number} commentId - The comment ID
 * @param {string} [svgId] - Optional SVG ID
 */
export function setElementAttributes( element, commentId, svgId = null ) {
	const sanitizedId = sanitizeCommentId( commentId );
	element.setAttribute( DATA_COMMENT_ID_ATTR, sanitizedId );

	if ( svgId ) {
		element.setAttribute( DATA_SVG_ID_ATTR, svgId );
	}
}

/**
 * Batch remove elements with specific highlight class
 * @param {Element} scopeElement - The scope to search within
 * @param {string} highlightClass - The highlight class to remove
 * @param {Function} [customCleanup] - Optional custom cleanup function
 */
export function batchRemoveHighlights(
	scopeElement,
	highlightClass,
	customCleanup = null,
) {
	const elements = scopeElement.querySelectorAll( `.${highlightClass}` );

	elements.forEach( ( element ) => {
		if ( customCleanup && typeof customCleanup === "function" ) {
			customCleanup( element, highlightClass );
		} else {
			cleanupHighlightElement( element, highlightClass );
		}
	} );
}

export default {
	// Constants
	HIGHLIGHT_CLASS_PREFIX,
	DATA_COMMENT_ID_ATTR,
	DATA_SVG_ID_ATTR,

	// Validation functions
	sanitizeCommentId,
	isValidSelector,

	// Class and attribute management
	generateHighlightClass,
	hasOtherSmartCommentClasses,
	cleanupHighlightElement,
	setElementAttributes,

	// Element queries and cleanup
	findHighlightedElements,
	unwrapEmptySpan,
	batchRemoveHighlights,
};
