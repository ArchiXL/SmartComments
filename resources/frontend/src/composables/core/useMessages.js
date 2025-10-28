/**
 * Composable for accessing MediaWiki message strings
 * Provides a consistent interface for internationalization across Vue components
 */

/**
 * Get a MediaWiki message with fallback
 * @param {string} key - The message key
 * @param {Array} params - Optional parameters for the message
 * @param {string} fallback - Optional fallback text if message is not found
 * @returns {string} The localized message
 */
function getMessage(key, params = [], fallback = "") {
  if (typeof mw !== "undefined" && mw.msg) {
    try {
      const message = mw.msg(key, ...params);
      // Check if the message was found (MediaWiki returns the key if not found)
      if (message !== key) {
        return message;
      }
    } catch (e) {
      console.warn(`Error getting message for key "${key}":`, e);
    }
  }

  // Return fallback or the key itself as last resort
  return fallback || key;
}

/**
 * Composable for using MediaWiki messages in Vue components
 * @returns {Object} Message helper functions
 */
function useMessages() {
  /**
   * Get a message with parameters
   */
  const msg = (key, ...params) => {
    return getMessage(key, params);
  };

  /**
   * Get a message with fallback
   */
  const msgWithFallback = (key, fallback, ...params) => {
    return getMessage(key, params, fallback);
  };

  /**
   * Check if a message exists
   */
  const hasMessage = (key) => {
    if (typeof mw !== "undefined" && mw.msg) {
      try {
        const message = mw.msg(key);
        return message !== key;
      } catch (e) {
        return false;
      }
    }
    return false;
  };

  /**
   * Common message getters for frequently used strings
   */
  const messages = {
    // Buttons
    save: () => msg("sc-button-save"),
    cancel: () => msg("sc-button-cancel"),
    close: () => msg("sc-button-close"),
    complete: () => msg("sc-button-complete"),
    delete: () => msg("sc-button-delete"),
    edit: () => msg("sc-button-edit"),
    reopen: () => msg("sc-button-reopen"),
    overview: () => msg("sc-button-overview"),
    newComment: () => msg("sc-button-new-comment"),
    newReply: () => msg("sc-button-new-reply"),
    CommentsShowScreenshotFullSize: () => msg("sc-show-screenshot-full-size"),

    // Input labels
    commentInput: () => msg("sc-input-newcomment"),
    replyInput: () => msg("sc-input-commenttext"),

    // Titles
    newCommentTitle: () => msg("sc-title-new"),

    // Errors
    errorTitle: () => msg("sc-error-title"),
    errorEmpty: () => msg("sc-error-empty"),
    apiError: () => msg("api-error"),

    // Status messages
    justNow: () => msg("sc-date-justnow"),
    commentAdded: () => msg("sc-added-comment"),
    commentAddedRefreshing: () => msg("sc-added-comment-refreshing"),

    // Special messages
    unlocalizedComment: () => msg("sc-unlocalized-comment"),

    // Selection errors
    selectionError1: () => msg("sc-selection-error-1"),
    selectionError2: () => msg("sc-selection-error-2"),
    selectionError3: () => msg("sc-selection-error-3"),
    selectionError4: () => msg("sc-selection-error-4"),
    selectionError5: () => msg("sc-selection-error-5"),

    // Reply form messages
    replyHeader: () => msg("sc-reply-header"),
    replyPlaceholder: () => msg("sc-reply-placeholder"),
    replySubmit: () => msg("sc-reply-submit"),

    // Comment actions
    previousComment: () => msg("sc-previous-comment"),
    nextComment: () => msg("sc-next-comment"),
    actions: () => msg("sc-actions"),
    markComplete: () => msg("sc-mark-complete"),
    markDelete: () => msg("sc-mark-delete"),
    viewOverview: () => msg("sc-view-overview"),

    // Link prevention messages
    linkDisabledWarn: () => msg("sc-link-disabled-warn"),
    linkCommentHighlightWarn: () => msg("sc-link-comment-highlight-warn"),

    // Generic error messages
    selectionGenericError: () => msg("sc-selection-generic-error"),

    // Broken comment indicator
    brokenCommentsBelow: () => msg("sc-broken-comments-below"),
  };

  return {
    msg,
    msgWithFallback,
    hasMessage,
    messages,
  };
}

export default useMessages;
