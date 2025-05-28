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
function getMessage(key, params = [], fallback = '') {
    if (typeof mw !== 'undefined' && mw.msg) {
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
        if (typeof mw !== 'undefined' && mw.msg) {
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
        save: () => msg('sic-button-save'),
        cancel: () => msg('sic-button-cancel'),
        close: () => msg('sic-button-close'),
        complete: () => msg('sic-button-complete'),
        delete: () => msg('sic-button-delete'),
        edit: () => msg('sic-button-edit'),
        reopen: () => msg('sic-button-reopen'),
        overview: () => msg('sic-button-overview'),
        newComment: () => msg('sic-button-new-comment'),
        newReply: () => msg('sic-button-new-reply'),

        // Input labels
        commentInput: () => msg('sic-input-newcomment'),
        replyInput: () => msg('sic-input-commenttext'),

        // Titles
        newCommentTitle: () => msg('sic-title-new'),

        // Errors
        errorTitle: () => msg('sic-error-title'),
        errorEmpty: () => msg('sic-error-empty'),
        apiError: () => msg('api-error'),

        // Status messages
        justNow: () => msg('sic-date-justnow'),
        commentAdded: () => msg('sic-added-comment'),
        commentAddedRefreshing: () => msg('sic-added-comment-refreshing'),

        // Special messages
        unlocalizedComment: () => msg('sic-unlocalized-comment'),

        // Selection errors
        selectionError1: () => msg('sic-selection-error-1'),
        selectionError2: () => msg('sic-selection-error-2'),
        selectionError3: () => msg('sic-selection-error-3'),
        selectionError4: () => msg('sic-selection-error-4'),
        selectionError5: () => msg('sic-selection-error-5'),

        // Reply form messages
        replyHeader: () => msg('sic-reply-header'),
        replyPlaceholder: () => msg('sic-reply-placeholder'),
        replySubmit: () => msg('sic-reply-submit'),

        // Comment actions
        previousComment: () => msg('sic-previous-comment'),
        nextComment: () => msg('sic-next-comment'),
        actions: () => msg('sic-actions'),
        markComplete: () => msg('sic-mark-complete'),
        markDelete: () => msg('sic-mark-delete'),
        viewOverview: () => msg('sic-view-overview'),
    };

    return {
        msg,
        msgWithFallback,
        hasMessage,
        messages
    };
}

module.exports = useMessages; 