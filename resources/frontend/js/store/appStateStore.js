const { defineStore } = Pinia;

module.exports = defineStore('appStore', {
    state: () => ({
        isEnabled: false
    }),
    getters: {
        getIsEnabled: (state) => state.isEnabled,
    },
    actions: {
        /**
         * Update the button's UI based on the current state.
         * @returns {void}
         */
        _updateButtonUI() {
            const toggleElement = document.getElementById('ca-comments');
            if (!toggleElement) {
                console.error('appStateStore: Toggle element "ca-comments" not found.');
                return;
            }

            if (this.isEnabled) {
                // Comments are enabled, button should offer to disable
                toggleElement.classList.add('selected');
                toggleElement.classList.remove('sic-enable-commenting');
                toggleElement.classList.add('sic-disable-commenting');
            } else {
                // Comments are disabled, button should offer to enable
                toggleElement.classList.remove('selected');
                toggleElement.classList.remove('sic-disable-commenting');
                toggleElement.classList.add('sic-enable-commenting');
            }
        },

        /**
         * Initialize the store's state.
         * @returns {void}
         */
        async initializeState() {
            const toggleElement = document.getElementById('ca-comments');
            if (toggleElement) {
                // Use arrow function for onclick to preserve 'this' context
                toggleElement.onclick = () => this.toggleAppState();
                // Set initial button state based on initial isEnabled state
                this._updateButtonUI();
            } else {
                console.error('appStateStore: Toggle element "ca-comments" not found during initialization.');
            }
            console.log('appStateStore: initializeState called. Initial isEnabled:', this.isEnabled);
        },

        /**
         * Enables the comments UI
         * @returns {void}
         */
        enableAppState() {
            if (this.isEnabled) return;
            this.isEnabled = true;
            console.log('appStateStore: Comments ENABLED.');
            this._updateButtonUI();
        },

        /**
         * Disables the comments UI
         * @returns {void}
         */
        disableAppState() {
            if (!this.isEnabled) return;
            this.isEnabled = false;
            console.log('appStateStore: Comments DISABLED.');
            this._updateButtonUI();
        },

        /**
         * Toggles the comments UI
         * @returns {void}
         */
        toggleAppState() {
            console.log('appStateStore: toggleAppState called.');
            if (this.isEnabled) {
                this.disableAppState();
            } else {
                this.enableAppState();
            }
        }
    }
}); 