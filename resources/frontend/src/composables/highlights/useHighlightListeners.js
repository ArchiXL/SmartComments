/**
 * Event listener management composable for highlighted elements
 */

/**
 * Store attached event listeners to be able to remove them later.
 * Key: data-comment-id (string), Value: Array of { element: HTMLElement, handler: Function, type: string }
 */
const attachedListeners = new Map();

export function useHighlightListeners() {
  /**
   * Idempotent function to add click listener to an element
   *
   * @param {HTMLElement} targetEl - The element to attach the listener to
   * @param {Object} commentForListener - The comment data for the listener
   * @param {Function} onClick - The click callback function
   */
  function ensureClickListenerIsAttached(
    targetEl,
    commentForListener,
    onClick,
  ) {
    const currentDataCommentId = String(commentForListener.data_id);

    let listenersForId = attachedListeners.get(currentDataCommentId);
    if (
      listenersForId &&
      listenersForId.some((l) => l.element === targetEl && l.type === "click")
    ) {
      return; // Already attached
    }

    if (onClick && typeof onClick === "function") {
      const clickHandler = (event) => {
        event.stopPropagation(); // Prevent event from bubbling up
        const rect = targetEl.getBoundingClientRect();
        const position = {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          bottom: rect.bottom + window.scrollY,
          right: rect.right + window.scrollX,
          width: rect.width,
          height: rect.height,
        };
        onClick(event, commentForListener, position);
      };

      targetEl.addEventListener("click", clickHandler);
      targetEl.style.cursor = "pointer"; // Indicate clickable

      if (!attachedListeners.has(currentDataCommentId)) {
        attachedListeners.set(currentDataCommentId, []);
      }
      attachedListeners.get(currentDataCommentId).push({
        element: targetEl,
        handler: clickHandler,
        type: "click",
      });
    }
  }

  /**
   * Clear event listeners for a specific comment ID
   *
   * @param {string} commentIdStr - The comment ID as string
   */
  function clearListenersForCommentId(commentIdStr) {
    if (attachedListeners.has(commentIdStr)) {
      attachedListeners
        .get(commentIdStr)
        .forEach(({ element, handler, type }) => {
          element.removeEventListener(type, handler);
          element.style.cursor = ""; // Reset cursor
        });
      attachedListeners.delete(commentIdStr);
    }
  }

  /**
   * Clear all managed event listeners
   */
  function clearAllListeners() {
    attachedListeners.forEach((listeners, commentIdStr) => {
      listeners.forEach(({ element, handler, type }) => {
        element.removeEventListener(type, handler);
        if (element) element.style.cursor = "";
      });
    });
    attachedListeners.clear();
  }

  /**
   * Get all attached listeners (for debugging or inspection)
   *
   * @returns {Map} The map of attached listeners
   */
  function getAttachedListeners() {
    return attachedListeners;
  }

  /**
   * Check if a listener is attached to a specific element for a comment
   *
   * @param {HTMLElement} element - The element to check
   * @param {string} commentId - The comment ID
   * @param {string} type - The event type (default: 'click')
   * @returns {boolean} Whether a listener is attached
   */
  function hasListenerAttached(element, commentId, type = "click") {
    const commentIdStr = String(commentId);
    const listenersForId = attachedListeners.get(commentIdStr);
    return (
      listenersForId &&
      listenersForId.some((l) => l.element === element && l.type === type)
    );
  }

  return {
    ensureClickListenerIsAttached,
    clearListenersForCommentId,
    clearAllListeners,
    getAttachedListeners,
    hasListenerAttached,
  };
}
