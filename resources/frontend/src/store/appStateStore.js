import { defineStore } from "pinia";
import useUserStore from "./userStore.js";

export const useAppStateStore = defineStore("appStore", {
  state: () => ({
    isEnabled: false,
    isSpecialPageMode: false,
    notification: null,
  }),
  getters: {
    getIsEnabled: (state) => state.isEnabled,
    getIsSpecialPageMode: (state) => state.isSpecialPageMode,
  },
  actions: {
    /**
     * Update the button's UI based on the current state.
     * @returns {void}
     */
    _updateButtonUI() {
      const toggleElement = document.getElementById("ca-comments");
      this.notifyUserOfState();

      if (this.isEnabled) {
        // Update body class regardless of button presence
        document.body.classList.add("smartcomments-enabled");

        if (toggleElement) {
          // Comments are enabled, button should offer to disable
          toggleElement.classList.add("selected");
          toggleElement.classList.remove("sic-enable-commenting");
          toggleElement.classList.add("sic-disable-commenting");
        }
      } else {
        // Update body class regardless of button presence
        document.body.classList.remove("smartcomments-enabled");
        
        if (toggleElement) {
          // Comments are disabled, button should offer to enable
          toggleElement.classList.remove("selected");
          toggleElement.classList.remove("sic-disable-commenting");
          toggleElement.classList.add("sic-enable-commenting");
        }
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

      // Initialize toggle button - only if we're on a regular article page
      const toggleElement = document.getElementById("ca-comments");
      if (toggleElement) {
        // Use arrow function for onclick to preserve 'this' context
        toggleElement.onclick = () => this.toggleAppState();
      } else {
        // Check if we're on a SpecialPage - if so, this is expected behavior
        const isSpecialPage = mw.config.get('wgCanonicalSpecialPageName') === 'SmartComments';
        if (!isSpecialPage) {
          console.error(
            'appStateStore: Toggle element "ca-comments" not found during initialization.',
          );
        }
      }
    },

    /**
     * Initialize the store's state for SpecialPage context (view-only mode)
     * @returns {void}
     */
    async initializeSpecialPageState() {
      // Initialize userStore
      const userStore = useUserStore();
      await userStore.fetchUserRights();

      // Set special page mode flags
      this.isSpecialPageMode = true;
      this.isEnabled = true; // Always enabled for viewing comments
      
      // Apply body class for styling
      document.body.classList.add("smartcomments-enabled", "smartcomments-special-page");
    },

    /**
     * Enables the comments UI
     * @returns {void}
     */
    enableAppState() {
      if (this.isEnabled) return;
      this.isEnabled = true;
      this._updateButtonUI();
    },

    /**
     * Disables the comments UI
     * @returns {void}
     */
    disableAppState() {
      if (!this.isEnabled) return;
      this.isEnabled = false;
      this._updateButtonUI();
    },

    /**
     * Toggles the comments UI
     * @returns {void}
     */
    toggleAppState() {
      if (this.isEnabled) {
        this.disableAppState();
      } else {
        this.enableAppState();
      }
    },
    notifyUserOfState() {
      if ( this.isEnabled ) {
        this.notification = mw.notify(
            mw.message( 'sc-enabled-smartcomments' ).text(),
            {
              autoHide: false,
              tag: 'smartcomments-notification',
              type: 'warn'
            }
        );

        // We want the notification to be undismissable so remove the click handler and handle the closing of the notification ourselves
        setTimeout( function() {
          $( '.mw-notification-tag-smartcomments-notification' ).click( function ( e ) {
            e.stopImmediatePropagation();
            return false;
          } );
        }, 100 );
      } else {
        let $notif = $( '.mw-notification-tag-smartcomments-notification' );
        let notifObj = $notif.data( 'mw-notification' );
        if ( notifObj ) {
          notifObj.close();
        }
      }
    }
  },
});
