import { useAppStateStore } from '../../store/appStateStore.js';
import { MEDIAWIKI_SELECTORS, SMARTCOMMENTS_CLASSES } from '../../utils/constants.js';
import useMessages from '../core/useMessages.js';
import { useSelectionEvents } from '../selection/useSelectionEvents.js';

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
        const selectOnClick = mw.config.get('wgSmartComments')?.selectLinksOnClick;

        // Only prevent links when comment mode is enabled
        if (!store.isEnabled) {
            return;
        }

        const target = event.target;

        // Function to find link element (HTML or SVG)
        function findLinkElement(element) {
            let current = element;
            while (current && current !== document) {
                // Check for regular HTML link or SVG link
                if ((current.tagName === 'A' && current.href) ||
                    (current.tagName === 'a' && current.getAttributeNS('http://www.w3.org/1999/xlink', 'href'))) {
                    return current;
                }
                current = current.parentElement;
            }
            return null;
        }

        const link = findLinkElement(target);

        if (link) {
            // Get href value, handling both regular links and SVG animated strings
            let hrefValue = link.href || link.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
            if (hrefValue?.baseVal !== undefined) hrefValue = hrefValue.baseVal;

            if (!hrefValue || typeof hrefValue !== 'string') return;

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

            // Don't prevent clicks on editsection links
            if (target.closest('.mw-editsection')) {
                return;
            }

            // Check if this is a click directly on a comment highlight
            if (target.closest(`[class*="${SMARTCOMMENTS_CLASSES.HIGHLIGHT}"]`) ||
                link.classList.toString().includes(SMARTCOMMENTS_CLASSES.HIGHLIGHT)) {
                return;
            }

            // Allow clicks on sc-dynamic-block elements for annotation
            if (target.closest(`.${SMARTCOMMENTS_CLASSES.DYNAMIC_BLOCK}`)) {
                return;
            }

            // Don't prevent clicks on internal anchors (same page navigation)
            if (hrefValue.includes('#') &&
                hrefValue.split('#')[0] === window.location.href.split('#')[0]) {
                return;
            }

            // Check if the link contains comment highlights but the click is not on the highlight itself
            const hasCommentHighlight = link.querySelector(`[class*="${SMARTCOMMENTS_CLASSES.HIGHLIGHT}"]`);
            if (hasCommentHighlight) {
                event.preventDefault();
                event.stopPropagation();
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

            if (selectOnClick) {
                const { createSelectionFromElement } = useSelectionEvents();
                createSelectionFromElement(event);
                return;
            } else {
                mw.notify(messages.linkDisabledWarn(), {
                    type: 'warn',
                    autoHide: true,
                    autoHideSeconds: 3
                });
            }
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

export { useLinkPrevention }; 