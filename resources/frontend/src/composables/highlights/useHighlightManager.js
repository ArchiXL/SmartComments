/**
 * Refactored highlight manager using Strategy pattern and shared utilities
 * This eliminates code duplication and improves maintainability
 */

import {useTextHighlight} from "./useTextHighlight.js";
import {useSelectorHighlight} from "./useSelectorHighlight.js";
import {useSVGHighlight} from "./useSVGHighlight.js";
import {useHighlightListeners} from "./useHighlightListeners.js";
import {
	generateHighlightClass,
	findHighlightedElements,
	batchRemoveHighlights,
	cleanupHighlightElement,
	unwrapEmptySpan,
	HIGHLIGHT_CLASS_PREFIX,
} from "./shared/HighlightUtils.js";
import {errorHandler} from "./shared/HighlightErrorHandler.js";

/**
 * Strategy factory for creating highlight strategies
 */
class HighlightStrategyFactory {
	static strategies = null;

	static initialize() {
		if ( this.strategies ) return this.strategies;

		const {applyTextHighlight, removeTextHighlight} = useTextHighlight();
		const {applySelectorHighlight, removeSelectorHighlight} =
			useSelectorHighlight();
		const {applySVGHighlight, removeSVGHighlight} = useSVGHighlight();

		this.strategies = {
			wordIndex: {apply: applyTextHighlight, remove: removeTextHighlight},
			selector: {
				apply: applySelectorHighlight,
				remove: removeSelectorHighlight,
			},
			svg: {apply: applySVGHighlight, remove: removeSVGHighlight},
		};

		return this.strategies;
	}

	static getStrategy( type ) {
		const strategies = this.initialize();
		const strategy = strategies[ type ];

		if ( !strategy ) {
			errorHandler.handleValidationError( `Unknown highlight type: ${type}`, {
				type,
			} );
		}

		return strategy;
	}
}

function useHighlightManager() {
	const {
		ensureClickListenerIsAttached,
		clearListenersForCommentId,
		clearAllListeners,
	} = useHighlightListeners();

	/**
	 * Apply highlights to the given element using Strategy pattern
	 *
	 * @param {Element} scopeElement - The element to apply highlights to
	 * @param {Array} highlights - The highlights to apply
	 * @param {Function} [onClick] - Optional callback for when a highlight is clicked
	 */
	function applyHighlights( scopeElement, highlights, onClick ) {
		// Input validation
		if ( !highlights || !Array.isArray( highlights ) ) {
			errorHandler.handleValidationError(
				"Highlights must be an array of highlight objects",
				{highlights},
			);
			return;
		}

		if ( !window.rangy ) {
			errorHandler.handleRangyError(
				"Rangy not initialized. Cannot apply highlights",
			);
			return;
		}

		highlights.forEach( ( highlightData ) => {
			errorHandler.safeExecute(
				() => {
					// Validate highlight data
					errorHandler.validateHighlightData( highlightData );

					const uniqueHighlightClass = generateHighlightClass(
						highlightData.comment.data_id,
					);

					// Create click listener wrapper
					const ensureClickListener = ( targetEl, commentForListener ) => {
						ensureClickListenerIsAttached(
							targetEl,
							commentForListener,
							onClick,
						);
					};

					// Get strategy for this highlight type
					const strategy = HighlightStrategyFactory.getStrategy(
						highlightData.type,
					);

					// Apply highlight using strategy
					strategy.apply(
						scopeElement,
						highlightData,
						uniqueHighlightClass,
						ensureClickListener,
					);
				},
				`apply ${highlightData?.type || "unknown"} highlight`,
				{
					commentId: highlightData?.comment?.data_id,
					type: highlightData?.type,
				},
			);
		} );
	}

	/**
	 * Clear specific highlights using Strategy pattern
	 *
	 * @param {Element} scopeElement - The element to clear highlights from
	 * @param {Array} [highlightsToClear] - Specific highlights to remove
	 */
	function clearHighlights( scopeElement, highlightsToClear ) {
		if ( !highlightsToClear || !Array.isArray( highlightsToClear ) ) {
			errorHandler.handleValidationError( "highlightsToClear must be an array", {
				highlightsToClear,
			} );
			return;
		}

		if ( !window.rangy ) {
			errorHandler.handleRangyError(
				"Rangy not available for clearing highlights",
			);
			return;
		}

		highlightsToClear.forEach( ( highlightData ) => {
			errorHandler.safeExecute(
				() => {
					if ( !highlightData?.comment?.data_id ) {
						return; // Skip invalid data
					}

					const commentIdStr = String( highlightData.comment.data_id );
					const uniqueHighlightClass = generateHighlightClass( commentIdStr );

					// Clear event listeners
					clearListenersForCommentId( commentIdStr );

					// Find elements with this highlight class
					const elements = findHighlightedElements( scopeElement, commentIdStr );
					if ( elements.length === 0 ) return;

					// Get strategy and remove highlights
					const strategy = HighlightStrategyFactory.getStrategy(
						highlightData.type,
					);
					strategy.remove(
						uniqueHighlightClass,
						scopeElement,
						Array.from( elements ),
					);
				},
				`clear ${highlightData?.type || "unknown"} highlight`,
				{
					commentId: highlightData?.comment?.data_id,
					type: highlightData?.type,
				},
			);
		} );
	}

	/**
	 * Clear all highlights (optimized fallback method)
	 *
	 * @param {Element} scopeElement - The element to clear highlights from
	 */
	function clearAllHighlights( scopeElement ) {
		errorHandler.safeExecute(
			() => {
				clearAllListeners();

				// Find all potentially highlighted elements
				const potentiallyHighlighted = scopeElement.querySelectorAll(
					`[data-comment-id], [class*="${HIGHLIGHT_CLASS_PREFIX}"]`,
				);

				potentiallyHighlighted.forEach( ( element ) => {
					// Remove all smartcomment highlight classes
					const classesToRemove = Array.from( element.classList ).filter( ( cls ) =>
						cls.startsWith( HIGHLIGHT_CLASS_PREFIX ),
					);

					classesToRemove.forEach( ( cls ) => {
						cleanupHighlightElement( element, cls );
					} );

					// Unwrap empty SPAN elements
					if ( element.tagName === "SPAN" ) {
						unwrapEmptySpan( element );
					}
				} );
			},
			"clear all highlights",
			{scopeElement: scopeElement?.tagName},
		);
	}

	/**
	 * Remove highlights for a specific comment with type detection
	 *
	 * @param {string|number} commentId - The ID of the comment to remove highlights for
	 * @param {Element} [scopeElement] - The element to search within
	 */
	function removeCommentHighlight( commentId, scopeElement = null ) {
		const targetElement =
			scopeElement ||
			document.getElementById( "mw-content-text" ) ||
			document.body;

		errorHandler.safeExecute(
			() => {
				if ( !window.rangy ) {
					errorHandler.handleRangyError(
						"Rangy not available for comment highlight removal",
						{commentId},
					);
					return;
				}

				const commentIdStr = String( commentId );
				clearListenersForCommentId( commentIdStr );

				const elements = findHighlightedElements( targetElement, commentIdStr );
				if ( elements.length === 0 ) return;

				// Detect highlight type based on element characteristics
				const highlightType = detectHighlightType( Array.from( elements ) );

				if ( highlightType ) {
					const strategy = HighlightStrategyFactory.getStrategy( highlightType );
					const uniqueHighlightClass = generateHighlightClass( commentIdStr );
					strategy.remove(
						uniqueHighlightClass,
						targetElement,
						Array.from( elements ),
					);
				} else {
					// Fallback to manual cleanup
					const uniqueHighlightClass = generateHighlightClass( commentIdStr );
					batchRemoveHighlights( targetElement, uniqueHighlightClass );
				}
			},
			"remove comment highlight",
			{commentId, scopeElement: targetElement?.tagName},
		);
	}

	/**
	 * Detect highlight type based on element characteristics
	 *
	 * @param {Element[]} elements - Elements to analyze
	 * @returns {string|null} - Detected highlight type or null
	 */
	function detectHighlightType( elements ) {
		// Check for SPAN elements (likely text highlights)
		const hasSpanElements = elements.some(
			( el ) => el.tagName === "SPAN" && el.hasAttribute( "data-comment-id" ),
		);

		// Check for SVG-related elements
		const hasSVGElements = elements.some(
			( el ) =>
				el.hasAttribute( "data-svg-id" ) ||
				el.closest( "svg" ) ||
				( el.tagName === "a" && el.closest( "svg" ) ),
		);

		if ( hasSpanElements ) return "wordIndex";
		if ( hasSVGElements ) return "svg";
		return "selector"; // Default to selector for other elements
	}

	return {
		applyHighlights,
		clearHighlights,
		clearAllHighlights,
		removeCommentHighlight,
	};
}

export {useHighlightManager};
