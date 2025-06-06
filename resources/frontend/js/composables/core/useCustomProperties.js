const { watch } = require('vue');

/**
 * Composable for managing CSS custom properties
 */
function useCustomProperties(messages) {
    /**
     * Update CSS custom property for annotate tooltip text
     */
    const updateAnnotateTooltipText = (text) => {
        document.documentElement.style.setProperty('--smartcomments-annotate-text', `"${text}"`);
    };

    /**
     * Update CSS custom property for button open text
     */
    const updateButtonOpenText = (text) => {
        document.documentElement.style.setProperty('--smartcomments-button-open-text', `"${text}"`);
    };

    /**
     * Setup watchers for CSS custom properties
     */
    const setupCustomPropertiesWatchers = () => {
        const annotateTooltipText = () => messages.msg('sic-annotate-tooltip');
        const buttonOpenText = () => messages.msg('sic-button-open');

        // Initial setup
        updateAnnotateTooltipText(annotateTooltipText());
        updateButtonOpenText(buttonOpenText());

        // Watch for changes (e.g., language changes)
        const stopAnnotateWatcher = watch(annotateTooltipText, (newText) => {
            updateAnnotateTooltipText(newText);
        });

        const stopButtonWatcher = watch(buttonOpenText, (newText) => {
            updateButtonOpenText(newText);
        });

        return () => {
            stopAnnotateWatcher();
            stopButtonWatcher();
        };
    };

    return {
        setupCustomPropertiesWatchers,
        updateAnnotateTooltipText,
        updateButtonOpenText
    };
}

module.exports = useCustomProperties; 