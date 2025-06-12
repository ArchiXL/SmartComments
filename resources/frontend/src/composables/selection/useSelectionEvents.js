/**
 * Selection Events Composable - Refactored
 * Uses new Strategy pattern for consistent selection handling
 * Eliminates duplication and provides centralized event management
 */
import {useSelection} from "./useSelection.js";
import {useHighlightData} from "../highlights/useHighlightData.js";
import {useHoverEffects} from "../ui/useHoverEffects.js";
import {useAppStateStore} from "../../store/appStateStore.js";
import {smartCommentsEvents} from "../../utils/smartCommentsEvents.js";
import {selectionErrorHandler} from "../selection/shared/SelectionErrorHandler.js";
import {SELECTION_TIMEOUTS} from "../../utils/constants.js";

export function useSelectionEvents() {
	const selection = useSelection();
	const highlight = useHighlightData();
	const hoverEffects = useHoverEffects();

	// Event handlers
	let mouseDownHandler, mouseUpHandler, mouseMoveHandler, clickHandler;
	let isEventsBound = false;

	/**
	 * Check if selection is currently enabled
	 * @returns {boolean} - Whether selection is enabled
	 */
	function isSelectionEnabled() {
		try {
			const store = useAppStateStore();
			return store.isEnabled;
		} catch ( error ) {
			console.warn( "Could not check selection enabled state:", error );
			return false;
		}
	}

	/**
	 * Universal selection processor - handles any selection type
	 * @param {*} target - Selection target (element, range, etc.)
	 * @param {Event} event - Interaction event
	 * @param {Object} options - Processing options
	 * @returns {Promise<Object|null>} - Selection result
	 */
	async function processUniversalSelection( target, event, options = {} ) {
		if ( !isSelectionEnabled() ) {
			return null;
		}

		// Default to capturing screenshots
		const processingOptions = {
			captureScreenshot: true,
			...options,
		};

		try {
			const selectionResult = await selection.processSelection(
				target,
				event,
				processingOptions,
			);

			if ( selectionResult ) {
				await handleSuccessfulSelection( selectionResult, event );
				return selectionResult;
			}

			return null;
		} catch ( error ) {
			selectionErrorHandler.handleSelectionError( "universal", error, {
				target,
				event,
				options: processingOptions,
			} );
			return null;
		}
	}

	/**
	 * Create a selection from an element and trigger a selection active event
	 * @param {Event} event - Click/interaction event
	 */
	function createSelectionFromElement( event ) {
		const element = event.target;

		// Check if this is an SVG link click
		const svgLink = selection.findSVGLink( element );
		if ( svgLink ) {
			event.preventDefault();
			handleSVGSelection( svgLink, event );
			return;
		}

		// For other elements, try to create a text selection
		if ( !window.rangy || !rangy.getSelection ) {
			console.warn( "Rangy not available for text selection creation" );
			return;
		}

		const rangySelection = rangy.getSelection();
		const textContent = element.textContent || element.innerText || "";

		if ( textContent.trim() ) {
			try {
				const range = rangy.createRange();
				range.selectNodeContents( element );

				// Try to find and select the text content
				if ( range.findText && range.findText( textContent.trim() ) ) {
					rangySelection.setSingleRange( range );
				} else {
					// Fallback: select node contents
					range.selectNodeContents( element );
					rangySelection.setSingleRange( range );
				}
			} catch ( error ) {
				console.warn( "Failed to create selection from element:", error );
				// Final fallback
				const range = rangy.createRange();
				range.selectNodeContents( element );
				rangySelection.setSingleRange( range );
			}
		}
	}

	/**
	 * Handle SVG selection asynchronously
	 * @param {Element} svgLink - SVG link element
	 * @param {Event} event - Original click event
	 */
	async function handleSVGSelection( svgLink, event ) {
		if ( !isSelectionEnabled() ) return;

		try {
			const result = await processUniversalSelection( svgLink, event );
			// Success handling is done in processUniversalSelection
		} catch ( error ) {
			console.error( "SVG selection failed:", error );
			selectionErrorHandler.handleSelectionError( "svg", error, {
				svgLink,
				event,
			} );
		}
	}

	/**
	 * Handle mouse down events to track start position
	 * @param {Event} event - Mouse down event
	 */
	function handleMouseDown( event ) {
		if ( !isSelectionEnabled() ) return;

		selection.startPosition.x = event.pageX;
		selection.startPosition.y = event.pageY;
	}

	/**
	 * Handle mouse move events to track current position
	 * @param {Event} event - Mouse move event
	 */
	function handleMouseMove( event ) {
		if ( !isSelectionEnabled() ) return;
		if ( selection.isCapturing.value ) return;

		selection.selectionPosition.x = event.pageX;
		selection.selectionPosition.y = event.pageY;
	}

	/**
	 * Handle mouse up events for text selection
	 * @param {Event} event - Mouse up event
	 */
	function handleMouseUp( event ) {
		if ( !isSelectionEnabled() ) return;

		// Add small delay to ensure selection is complete
		setTimeout( async () => {
			if ( !window.rangy || !rangy.getSelection ) {
				return;
			}

			const rangySelection = rangy.getSelection();
			if ( !rangySelection.isCollapsed && rangySelection.rangeCount > 0 ) {
				try {
					const range = rangySelection.getRangeAt( 0 );
					await processUniversalSelection( range, event );
				} catch ( error ) {
					console.error( "Text selection processing failed:", error );
					selectionErrorHandler.handleSelectionError( "text", error, {event} );
				}
			}
		}, SELECTION_TIMEOUTS.TEXT_SELECTION_DELAY );
	}

	/**
	 * Handle click events for dynamic blocks, images, and SVG elements
	 * @param {Event} event - Click event
	 */
	async function handleClick( event ) {
		if ( !isSelectionEnabled() ) return;

		const target = event.target;

		// Determine what type of element was clicked and process accordingly
		try {
			// Check if we can select this element
			if ( selection.canSelectElement( target ) ) {
				event.preventDefault();
				await processUniversalSelection( target, event );
			}
		} catch ( error ) {
			console.error( "Click selection processing failed:", error );
			selectionErrorHandler.handleSelectionError( "click", error, {
				target,
				event,
			} );
		}
	}

	/**
	 * Handle successful selection by creating highlight and triggering events
	 * @param {Object} selectionResult - Selection result data
	 * @param {Event} event - Original interaction event
	 */
	async function handleSuccessfulSelection( selectionResult, event ) {
		try {
			// Create highlight data
			const highlightData = createHighlightData( selectionResult );

			// Add to highlights
			highlight.addHighlight( selectionResult.type, highlightData );

			// Format data for API usage
			const apiData = selection.formatSelectionForAPI( selectionResult );

			// Create event data
			const eventData = {
				selection: selectionResult,
				screenshot: selectionResult.image || null,
				apiData: apiData,
				position: {
					x: event?.pageX || 0,
					y: event?.pageY || 0,
				},
				highlight: highlightData,
				timestamp: Date.now(),
			};

			// Trigger centralized selection active event
			smartCommentsEvents.triggerSelectionActive( eventData );

			// Emit custom event for legacy compatibility
			const selectionEvent = new CustomEvent( "smartcomments:selection", {
				detail: eventData,
			} );
			document.dispatchEvent( selectionEvent );
		} catch ( error ) {
			console.error( "Failed to handle successful selection:", error );
			selectionErrorHandler.handleSelectionError( "event-handling", error, {
				selectionResult,
				event,
			} );
		}
	}

	/**
	 * Create highlight data from selection result
	 * @param {Object} selectionResult - Selection result
	 * @returns {Object} - Highlight data
	 */
	function createHighlightData( selectionResult ) {
		return {
			data_id: generateTempId(),
			text: selectionResult.text,
			index: selectionResult.index,
			type: selectionResult.type,
			element: selectionResult.element || null,
			screenshot: selectionResult.image || null,
			timestamp: Date.now(),
			metadata: selectionResult.metadata || null,
			pos: selectionResult.pos || selectionResult.selector || null,
		};
	}

	/**
	 * Generate temporary ID for new selections
	 * @returns {string} - Temporary ID
	 */
	function generateTempId() {
		return `temp_${Date.now()}_${Math.random().toString( 36 ).substr( 2, 9 )}`;
	}

	/**
	 * Show selection error to user (delegated to error handler)
	 * @param {Error} error - Error that occurred
	 * @param {string} selectionType - Type of selection that failed
	 */
	function showSelectionError( error, selectionType = "unknown" ) {
		selectionErrorHandler.handleSelectionError( selectionType, error );
	}

	/**
	 * Bind all selection event handlers
	 */
	function bindEvents() {
		if ( isEventsBound ) {
			console.warn( "Selection events already bound" );
			return;
		}

		try {
			// Create bound handlers
			mouseDownHandler = handleMouseDown.bind( this );
			mouseUpHandler = handleMouseUp.bind( this );
			mouseMoveHandler = handleMouseMove.bind( this );
			clickHandler = handleClick.bind( this );

			// Bind to document
			document.addEventListener( "mousedown", mouseDownHandler );
			document.addEventListener( "mouseup", mouseUpHandler );
			document.addEventListener( "mousemove", mouseMoveHandler );
			document.addEventListener( "click", clickHandler );

			// Initialize hover effects
			hoverEffects.initializeHoverEffects();

			isEventsBound = true;
		} catch ( error ) {
			console.error( "Failed to bind selection events:", error );
			isEventsBound = false;
		}
	}

	/**
	 * Unbind all selection event handlers
	 */
	function unbindEvents() {
		if ( !isEventsBound ) {
			return;
		}

		try {
			// Remove event listeners
			if ( mouseDownHandler )
				document.removeEventListener( "mousedown", mouseDownHandler );
			if ( mouseUpHandler )
				document.removeEventListener( "mouseup", mouseUpHandler );
			if ( mouseMoveHandler )
				document.removeEventListener( "mousemove", mouseMoveHandler );
			if ( clickHandler ) document.removeEventListener( "click", clickHandler );

			// Clear handlers
			mouseDownHandler = null;
			mouseUpHandler = null;
			mouseMoveHandler = null;
			clickHandler = null;

			// Destroy hover effects
			hoverEffects.destroyHoverEffects();

			isEventsBound = false;
		} catch ( error ) {
			console.error( "Failed to unbind selection events:", error );
		}
	}

	/**
	 * Set up callback for selection creation events
	 * @param {Function} callback - Callback function
	 * @returns {Function} - Cleanup function
	 */
	function onSelectionCreate( callback ) {
		if ( typeof callback !== "function" ) {
			throw new Error( "Selection create callback must be a function" );
		}

		// Listen for the custom selection event
		const eventHandler = ( event ) => {
			callback( event.detail );
		};

		document.addEventListener( "smartcomments:selection", eventHandler );

		// Return cleanup function
		return () => {
			document.removeEventListener( "smartcomments:selection", eventHandler );
		};
	}

	/**
	 * Get event system statistics
	 * @returns {Object} - Event system statistics
	 */
	function getEventStats() {
		return {
			isEventsBound,
			selectionStats: selection.getSelectionStats(),
			errorStats: selectionErrorHandler.getErrorStats(),
			timestamp: Date.now(),
		};
	}

	/**
	 * Reset event system (for testing)
	 */
	function resetEventSystem() {
		unbindEvents();
		selection.clearSelection();
		selectionErrorHandler.clearErrorStats();
	}

	return {
		// Event management
		bindEvents,
		unbindEvents,
		onSelectionCreate,

		// Selection processing
		processUniversalSelection,
		createSelectionFromElement,
		handleSVGSelection,

		// Event handlers
		handleMouseDown,
		handleMouseMove,
		handleMouseUp,
		handleClick,

		// Utility and information
		isSelectionEnabled,
		showSelectionError,
		getEventStats,
		resetEventSystem,

		// State access
		get isEventsBound() {
			return isEventsBound;
		},
	};
}
