import {defineStore} from "pinia";
import useUserStore from "./userStore.js";

export const useAppStateStore = defineStore( "appStore", {
	state: () => ( {
		isEnabled: false,
	} ),
	getters: {
		getIsEnabled: ( state ) => state.isEnabled,
	},
	actions: {
		/**
		 * Update the button's UI based on the current state.
		 * @returns {void}
		 */
		_updateButtonUI() {
			const toggleElement = document.getElementById( "ca-comments" );
			if ( !toggleElement ) {
				return;
			}

			if ( this.isEnabled ) {
				// Comments are enabled, button should offer to disable
				toggleElement.classList.add( "selected" );
				toggleElement.classList.remove( "sic-enable-commenting" );
				toggleElement.classList.add( "sic-disable-commenting" );
				// Update body class
				document.body.classList.add( "smartcomments-enabled" );
			} else {
				// Comments are disabled, button should offer to enable
				toggleElement.classList.remove( "selected" );
				toggleElement.classList.remove( "sic-disable-commenting" );
				toggleElement.classList.add( "sic-enable-commenting" );
				// Update body class
				document.body.classList.remove( "smartcomments-enabled" );
			}
		},

		/**
		 * Initialize the store's state and related stores.
		 * @returns {void}
		 */
		async initializeState() {
			// Initialize userStore
			const userStore = useUserStore();
			await userStore.fetchUserRights();

			// Initialize toggle button
			const toggleElement = document.getElementById( "ca-comments" );
			if ( toggleElement ) {
				// Use arrow function for onclick to preserve 'this' context
				toggleElement.onclick = () => this.toggleAppState();
				// Set initial button state based on initial isEnabled state
				this._updateButtonUI();
			} else {
				console.error(
					'appStateStore: Toggle element "ca-comments" not found during initialization.',
				);
			}
		},

		/**
		 * Enables the comments UI
		 * @returns {void}
		 */
		enableAppState() {
			if ( this.isEnabled ) return;
			this.isEnabled = true;
			this._updateButtonUI();
		},

		/**
		 * Disables the comments UI
		 * @returns {void}
		 */
		disableAppState() {
			if ( !this.isEnabled ) return;
			this.isEnabled = false;
			this._updateButtonUI();
		},

		/**
		 * Toggles the comments UI
		 * @returns {void}
		 */
		toggleAppState() {
			if ( this.isEnabled ) {
				this.disableAppState();
			} else {
				this.enableAppState();
			}
		},
	},
} );
