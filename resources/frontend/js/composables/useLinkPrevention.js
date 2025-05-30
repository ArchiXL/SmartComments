const useAppStateStore = require('../store/appStateStore.js');
const { MEDIAWIKI_SELECTORS, SMARTCOMMENTS_CLASSES } = require('../utils/constants.js');
const useMessages = require('./useMessages.js');

/**
 * Composable for handling link prevention when comment mode is enabled
 */
function useLinkPrevention() {
    let clickHandler = null;
    let isEventsBound = false;
    const { messages } = useMessages();

    /**
     * Handle clicks on links and prevent default behavior when comment mode is enabled
     */
    function handleLinkClick(event) {
        const store = useAppStateStore();

        // Only prevent links when comment mode is enabled
        if (!store.isEnabled) {
            return;
        }

        const target = event.target;
        const link = target.closest('a[href]');

        // If we found a link element with an href attribute
        if (link && link.href) {
            // Only apply link prevention within MediaWiki content area
            const contentArea = document.getElementById(MEDIAWIKI_SELECTORS.CONTENT_TEXT);
            if (!contentArea || !contentArea.contains(link)) {
                return;
            }

            // Don't prevent clicks on SmartComments UI elements
            if (target.closest('.smartcomments') ||
                target.closest('.sic-timeline-container')) {
                return;
            }

            // Check if this is a click directly on a comment highlight
            // If the target itself or its closest parent has a smartcomment-hl class, allow it
            if (target.closest(`[class*="${SMARTCOMMENTS_CLASSES.HIGHLIGHT}"]`) ||
                link.classList.toString().includes(SMARTCOMMENTS_CLASSES.HIGHLIGHT)) {
                return;
            }

            // Allow clicks on sc-dynamic-block elements for annotation
            // This allows users to annotate elements even when wrapped in links
            if (target.closest(`.${SMARTCOMMENTS_CLASSES.DYNAMIC_BLOCK}`)) {
                return;
            }

            // Don't prevent clicks on internal anchors (same page navigation)
            if (link.href.includes('#') &&
                link.href.split('#')[0] === window.location.href.split('#')[0]) {
                return;
            }

            // Check if the link contains comment highlights but the click is not on the highlight itself
            // In this case, we want to prevent the link navigation but allow comment interaction
            const hasCommentHighlight = link.querySelector(`[class*="${SMARTCOMMENTS_CLASSES.HIGHLIGHT}"]`);
            if (hasCommentHighlight) {
                // If the link contains comment highlights but the click target is not on a highlight,
                // we should prevent the link navigation
                event.preventDefault();
                event.stopPropagation();

                // Show a more specific message for links with comments
                mw.notify(messages.linkCommentHighlightWarn(), {
                    type: 'warn',
                    autoHide: true,
                    autoHideSeconds: 4
                });
                return;
            }

            // Prevent the default link behavior for all other links
            event.preventDefault();
            event.stopPropagation();

            mw.notify(messages.linkDisabledWarn(), {
                type: 'warn',
                autoHide: true,
                autoHideSeconds: 3
            });
        }
    }

    /**
     * Bind link prevention events
     */
    function bindEvents() {
        if (isEventsBound) return;

        // Create bound handler
        clickHandler = handleLinkClick.bind(null);

        // Bind to document to catch all link clicks
        // Use capture phase to ensure we catch the event before other handlers
        document.addEventListener('click', clickHandler, true);

        isEventsBound = true;
    }

    /**
     * Unbind link prevention events
     */
    function unbindEvents() {
        if (!isEventsBound || !clickHandler) return;

        document.removeEventListener('click', clickHandler, true);
        clickHandler = null;
        isEventsBound = false;
    }

    /**
     * Check if link prevention is active
     */
    function isLinkPreventionActive() {
        const store = useAppStateStore();
        return store.isEnabled;
    }

    return {
        bindEvents,
        unbindEvents,
        isLinkPreventionActive,
        isEventsBound: () => isEventsBound
    };
}

module.exports = { useLinkPrevention }; 