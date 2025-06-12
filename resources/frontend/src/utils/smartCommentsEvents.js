/**
 * SmartComments Events System
 *
 * Provides a centralized event system for SmartComments components.
 * This includes events from the previous frontend codebase like sc-debug-mode, sc-comment-group-open.
 */
export const EVENTS = {
	// Core events from previous codebase
	SELECTION_ACTIVE: "sc-selection-active",
	COMMENT_GROUP_OPEN: "sc-comment-group-open",
	COMMENT_GROUP_CLOSE: "sc-comment-group-close",
	DEBUG_MODE: "sc-debug-mode",
	OPEN_COMMENT_ID: "sc-open-comment",

	// New Vue frontend events
	COMMENT_CREATED: "sc-comment-created",
	COMMENT_UPDATED: "sc-comment-updated",
	COMMENT_DELETED: "sc-comment-deleted",
	COMMENT_COMPLETED: "sc-comment-completed",
	HIGHLIGHT_CLICKED: "sc-highlight-clicked",
	SELECTION_CHANGED: "sc-selection-changed",
	COMMENTS_ENABLED: "sc-comments-enabled",
	COMMENTS_DISABLED: "sc-comments-disabled",

	// System events
	REFRESH_HIGHLIGHTS: "smartcomments:refresh-highlights",
	REFRESH_TIMELINE: "smartcomments:refresh-timeline",
};

/**
 * SmartComments Events class
 */
class SmartCommentsEvents {
	constructor() {
		this.listeners = new Map();
		this.debugMode = false;

		// Initialize debug mode from URL parameters
		this.checkDebugMode();

		// Setup legacy compatibility
		this.setupLegacyCompatibility();
	}

	/**
	 * Check for debug mode in URL parameters
	 */
	checkDebugMode() {
		const urlParams = new URLSearchParams( window.location.search );
		if (
			urlParams.get( "scenabled" ) === "1" ||
			window.location.href.indexOf( "scenabled=1" ) !== -1
		) {
			this.enableDebugMode();
		}
	}

	/**
	 * Enable debug mode
	 */
	enableDebugMode() {
		this.debugMode = true;
		this.trigger( EVENTS.DEBUG_MODE, {enabled: true} );
	}

	/**
	 * Disable debug mode
	 */
	disableDebugMode() {
		this.debugMode = false;
		this.trigger( EVENTS.DEBUG_MODE, {enabled: false} );
	}

	/**
	 * Trigger an event
	 * @param {string} eventName - The event name
	 * @param {*} data - Event data
	 * @param {HTMLElement} target - Target element (defaults to window)
	 */
	trigger( eventName, data = {}, target = window ) {
		const event = new CustomEvent( eventName, {
			detail: data,
			bubbles: true,
			cancelable: true,
		} );

		target.dispatchEvent( event );

		if ( target !== window ) {
			window.dispatchEvent( event );
		}

		return event;
	}

	/**
	 * Listen to an event
	 * @param {string} eventName - The event name
	 * @param {Function} callback - Event callback
	 * @param {HTMLElement} target - Target element (defaults to window)
	 * @returns {Function} Cleanup function
	 */
	on( eventName, callback, target = window ) {
		const wrappedCallback = ( event ) => {
			callback( event );
		};

		target.addEventListener( eventName, wrappedCallback );

		// Store for cleanup
		const listenerKey = `${eventName}_${Date.now()}_${Math.random()}`;
		this.listeners.set( listenerKey, {
			target,
			eventName,
			callback: wrappedCallback,
		} );

		// Return cleanup function
		return () => {
			target.removeEventListener( eventName, wrappedCallback );
			this.listeners.delete( listenerKey );
		};
	}

	/**
	 * Listen to an event once
	 * @param {string} eventName - The event name
	 * @param {Function} callback - Event callback
	 * @param {HTMLElement} target - Target element (defaults to window)
	 * @returns {Function} Cleanup function
	 */
	once( eventName, callback, target = window ) {
		const cleanup = this.on(
			eventName,
			( event ) => {
				cleanup();
				callback( event );
			},
			target,
		);

		return cleanup;
	}

	/**
	 * Remove all listeners
	 */
	removeAllListeners() {
		for ( const [key, listener] of this.listeners ) {
			listener.target.removeEventListener(
				listener.eventName,
				listener.callback,
			);
		}
		this.listeners.clear();
	}

	/**
	 * Setup legacy compatibility with jQuery events
	 */
	setupLegacyCompatibility() {
		// Check if jQuery is available
		if ( typeof $ !== "undefined" && $.fn ) {
			// Mirror events to jQuery for legacy compatibility
			Object.values( EVENTS ).forEach( ( eventName ) => {
				this.on( eventName, ( event ) => {
					$( window ).trigger( eventName, event.detail );
				} );
			} );
		}
	}

	/**
	 * Specific event triggers for common actions
	 */

	/**
	 * Trigger comment group open event
	 * @param {Object} commentData - Comment data
	 * @param {Object} position - Position data
	 */
	triggerCommentGroupOpen( commentData, position = {} ) {
		return this.trigger( EVENTS.COMMENT_GROUP_OPEN, {
			comment: commentData,
			position,
			timestamp: Date.now(),
		} );
	}

	/**
	 * Trigger comment group close event
	 */
	triggerCommentGroupClose() {
		return this.trigger( EVENTS.COMMENT_GROUP_CLOSE, {
			timestamp: Date.now(),
		} );
	}

	/**
	 * Trigger selection active event
	 * @param {Object} selectionData - Selection data
	 */
	triggerSelectionActive( selectionData ) {
		return this.trigger( EVENTS.SELECTION_ACTIVE, {
			selection: selectionData,
			timestamp: Date.now(),
		} );
	}

	/**
	 * Trigger open comment event
	 * @param {string|number} commentId - Comment ID
	 */
	triggerOpenComment( commentId ) {
		return this.trigger( EVENTS.OPEN_COMMENT_ID, {
			commentId,
			timestamp: Date.now(),
		} );
	}

	/**
	 * Trigger highlight clicked event
	 * @param {Object} commentData - Comment data
	 * @param {Object} position - Click position
	 */
	triggerHighlightClicked( commentData, position ) {
		return this.trigger( EVENTS.HIGHLIGHT_CLICKED, {
			comment: commentData,
			position,
			timestamp: Date.now(),
		} );
	}

	/**
	 * Trigger comment created event
	 * @param {Object} commentData - New comment data
	 */
	triggerCommentCreated( commentData ) {
		return this.trigger( EVENTS.COMMENT_CREATED, {
			comment: commentData,
			timestamp: Date.now(),
		} );
	}

	/**
	 * Trigger comment updated event
	 * @param {Object} commentData - Updated comment data
	 */
	triggerCommentUpdated( commentData ) {
		return this.trigger( EVENTS.COMMENT_UPDATED, {
			comment: commentData,
			timestamp: Date.now(),
		} );
	}

	/**
	 * Trigger comment deleted event
	 * @param {Object} commentData - Deleted comment data
	 */
	triggerCommentDeleted( commentData ) {
		return this.trigger( EVENTS.COMMENT_DELETED, {
			comment: commentData,
			timestamp: Date.now(),
		} );
	}

	/**
	 * Trigger comment completed event
	 * @param {Object} commentData - Completed comment data
	 */
	triggerCommentCompleted( commentData ) {
		return this.trigger( EVENTS.COMMENT_COMPLETED, {
			comment: commentData,
			timestamp: Date.now(),
		} );
	}

	/**
	 * Trigger comments enabled event
	 */
	triggerCommentsEnabled() {
		return this.trigger( EVENTS.COMMENTS_ENABLED, {
			timestamp: Date.now(),
		} );
	}

	/**
	 * Trigger comments disabled event
	 */
	triggerCommentsDisabled() {
		return this.trigger( EVENTS.COMMENTS_DISABLED, {
			timestamp: Date.now(),
		} );
	}

	/**
	 * Trigger refresh highlights event
	 */
	triggerRefreshHighlights() {
		return this.trigger( EVENTS.REFRESH_HIGHLIGHTS, {
			timestamp: Date.now(),
		} );
	}

	/**
	 * Trigger refresh timeline event
	 */
	triggerRefreshTimeline() {
		return this.trigger( EVENTS.REFRESH_TIMELINE, {
			timestamp: Date.now(),
		} );
	}
}

// Create and export singleton instance
export const smartCommentsEvents = new SmartCommentsEvents();
