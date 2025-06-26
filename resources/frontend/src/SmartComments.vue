<template>
  <div class="smartcomments" v-if="isEnabled">
    <!-- Comment Dialog - now controlled by store -->
    <comment
      v-if="commentsStore.isCommentDialogVisible"
      :comment="commentsStore.activeComment"
      :position="commentsStore.commentPosition"
      :allow-replies="!store.isSpecialPageMode"
      @close="commentsStore.closeCommentDialog"
      @delete="commentsStore.deleteComment"
      @complete="commentsStore.completeComment"
      @view="commentsStore.viewPage"
      @navigate="handleCommentNavigation"
      @reply-added="commentsStore.handleReplyAdded"
    ></comment>

    <!-- New Comment Dialog - only show in regular page mode -->
    <new-comment-dialog
      v-if="!store.isSpecialPageMode"
      :is-visible="commentsStore.isNewCommentDialogVisible"
      :selection-data="commentsStore.newCommentSelection"
      @close="commentsStore.closeNewCommentDialog"
      @save="commentsStore.handleCommentSaved"
      @cancel="commentsStore.closeNewCommentDialog"
    ></new-comment-dialog>

    <!-- Comment Timeline - only show in regular page mode -->
    <comment-timeline v-if="!store.isSpecialPageMode"></comment-timeline>
  </div>
</template>

<script>
import { defineComponent } from "vue";
import useSmartCommentsSetup from "./composables/setup/useSmartCommentsSetup.js";
import { useSelectionEvents } from "./composables/selection/useSelectionEvents.js";
import { useLinkPrevention } from "./composables/features/useLinkPrevention.js";
import { useAppStateStore } from "./store/appStateStore.js";
import useCommentsStore from "./store/commentsStore.js";
import useMessages from "./composables/core/useMessages.js";
import useHighlightOrchestrator from "./composables/highlights/useHighlightOrchestrator.js";
import useKeyboardShortcuts from "./composables/ui/useKeyboardShortcuts.js";
import useCustomProperties from "./composables/core/useCustomProperties.js";
import useSmartCommentsEventHandlers from "./composables/ui/useSmartCommentsEventHandlers.js";
import useUrlNavigation from "./composables/features/useUrlNavigation.js";
import Comment from "./components/Comment.vue";
import NewCommentDialog from "./components/NewCommentDialog.vue";
import CommentTimeline from "./components/CommentTimeline.vue";
import { smartCommentsEvents, EVENTS } from "./utils/smartCommentsEvents.js";

export default defineComponent({
  name: "SmartComments",
  components: {
    Comment,
    NewCommentDialog,
    CommentTimeline,
  },
  setup() {
    const smartCommentsSetup = useSmartCommentsSetup();
    const store = useAppStateStore();
    const commentsStore = useCommentsStore();
    const messages = useMessages();
    const linkPrevention = store.isSpecialPageMode ? null : useLinkPrevention();

    // Initialize specialized composables
    const highlightsManager = useHighlightOrchestrator(
      smartCommentsSetup,
      commentsStore,
      smartCommentsEvents,
    );
    const keyboardShortcuts = useKeyboardShortcuts(commentsStore);
    const customProperties = useCustomProperties(messages);
    const eventHandlers = useSmartCommentsEventHandlers(
      smartCommentsEvents,
      EVENTS,
      store,
      commentsStore,
      highlightsManager,
    );
    const urlNavigation = useUrlNavigation(commentsStore);

    return {
      smartCommentsSetup,
      store,
      commentsStore,
      smartCommentsEvents,
      EVENTS,
      messages,
      linkPrevention,
      highlightsManager,
      keyboardShortcuts,
      customProperties,
      eventHandlers,
      urlNavigation,
    };
  },
  data() {
    return {
      selectionEvents: null,
      cleanupFunctions: [],
    };
  },
  computed: {
    isEnabled() {
      return this.store.isEnabled;
    },
  },
  mounted() {
    // Only initialize selection events in regular page mode
    if (!this.store.isSpecialPageMode) {
      this.selectionEvents = useSelectionEvents();
      
      // Handle selection events - delegate to store
      this.cleanupFunctions.push(
        this.selectionEvents.onSelectionCreate(this.handleNewSelection),
      );
    }

    // Setup all systems
    this.setupSystems();

    this.$watch(
      () => this.isEnabled,
      async (stateNowEnabled) => {
        if (stateNowEnabled) {
          await this.enableSmartComments();
        } else {
          await this.disableSmartComments();
        }
      },
      { immediate: true },
    );
  },
  beforeUnmount() {
    this.highlightsManager.clearHighlights();
    if (this.selectionEvents) this.selectionEvents.unbindEvents();
    if (this.linkPrevention) this.linkPrevention.unbindEvents();

    // Clean up all registered functions
    this.cleanupFunctions.forEach((cleanup) => cleanup());
  },
  methods: {
    /**
     * Setup all systems and event handlers
     */
    setupSystems() {
      // Setup highlight refresh listener
      this.cleanupFunctions.push(
        this.highlightsManager.setupHighlightRefreshListener(),
      );

      // Setup SmartComments events
      this.cleanupFunctions.push(this.eventHandlers.setupSmartCommentsEvents());

      // Setup keyboard shortcuts
      this.cleanupFunctions.push(
        this.keyboardShortcuts.setupKeyboardShortcuts(),
      );

      // Setup CSS custom properties watchers
      this.cleanupFunctions.push(
        this.customProperties.setupCustomPropertiesWatchers(),
      );

      // Setup URL navigation
      this.cleanupFunctions.push(
        this.urlNavigation.setupUrlNavigation(() => this.isEnabled),
      );
    },

    /**
     * Enable SmartComments system
     */
    async enableSmartComments() {
      try {
        // Trigger comments enabled event
        this.smartCommentsEvents.triggerCommentsEnabled();

        if (!this.store.isSpecialPageMode) {
          // Only enable selection and interaction features in regular page mode
          if (this.selectionEvents) this.selectionEvents.bindEvents();

          // Setup image selection to create dynamic block wrappers
          try {
            const { useSelection } = await import(
              "./composables/selection/useSelection.js"
            );
            const selection = useSelection();
            selection.setupSelection();
          } catch (error) {
            console.error("Failed to setup selection strategies:", error);
          }

          // Bind link prevention events when comment mode is enabled
          if (this.linkPrevention) this.linkPrevention.bindEvents();

          this.highlightsManager.clearHighlights();
          await this.highlightsManager.reloadHighlightsAndComments();
        }

        // Always check URL parameters for comment opening (works in both modes)
        await this.commentsStore.checkAndOpenCommentFromUrl();
      } catch (e) {
        console.error("SmartComments.vue enableSmartComments: Error:", e);
      }
    },

    /**
     * Disable SmartComments system
     */
    async disableSmartComments() {
      // Trigger comments disabled event
      this.smartCommentsEvents.triggerCommentsDisabled();

      if (!this.store.isSpecialPageMode) {
        // Only unbind interactive features in regular page mode
        if (this.selectionEvents) this.selectionEvents.unbindEvents();
        if (this.linkPrevention) this.linkPrevention.unbindEvents();
        this.highlightsManager.clearHighlights();
      }

      // Close all dialogs when disabling
      this.commentsStore.closeAllDialogs();
    },

    /**
     * Handle new selection - delegate to store
     */
    handleNewSelection(selectionData) {
      this.smartCommentsEvents.triggerSelectionActive(selectionData);
      this.commentsStore.openNewCommentDialog(selectionData);
    },

    /**
     * Handle comment navigation from Comment component
     */
    handleCommentNavigation(navigationData) {
      const { direction } = navigationData;
      this.commentsStore.navigateComment(direction);
    },

    /**
     * Manual highlight reload (for debugging)
     */
    async reloadHighlights() {
      await this.highlightsManager.reloadHighlights(this.isEnabled);
    },

    /**
     * Check URL parameters and open comment (for debugging)
     */
    async checkUrlParameters() {
      await this.urlNavigation.checkUrlParameters(() => this.isEnabled);
    },
  },
});
</script>

<style lang="less">
.smartcomments {
  *[data-tooltip] {
    position: relative;

    &:hover:after {
      content: attr(data-tooltip);
      position: absolute;
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      padding: 5px;
      border-radius: 5px;
      font-size: 12px;
      z-index: 1000;
      pointer-events: none;
      top: calc(100% + 8px);

      /* Position relative to right edge to prevent overflow */
      right: -8px;
      max-width: 250px;
      width: auto;
      white-space: normal;
      word-wrap: break-word;
      box-sizing: border-box;
    }

    &.tt-center {
        &:hover::after {
          left: 50%;
          transform: translateX(-50%);
          width: max-content;
          min-width: 0;
        }
      }
  }

  .smartcomments-visually-hidden {
    border: 0;
    clip: rect(0 0 0 0);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
  }
}

*[class^="smartcomment-hl-"] {
  cursor: pointer;
  text-decoration: none;
  color: #000;
  background: #ffffe0;
  box-shadow: 0 0 1px #000;
  transition: all 0.2s ease;
  position: relative;

  &.active {
    background: #ffde8d;
  }
}

/* Selection system styles */
.sc-dynamic-block {
  cursor: pointer;
  transition: background-color 0.2s ease;
  position: relative;

  &:hover,
  &[class*="smartcomment-hl-"] {
    &:before {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 224, 0.8);
      border-top: 1px solid rgba(0, 0, 0, 0.2);
      content: var(--smartcomments-button-open-text, "View comment");
      display: flex;
      align-items: center;
      justify-content: center;
      color: black;
      font-weight: bold;
    }
  }

  &:hover:not([class*="smartcomment-hl-"]) {
    &:before {
      content: var(--smartcomments-annotate-text, "annotate");
    }
  }

  &.sc-hover {
    background-color: rgba(255, 255, 0, 0.2);
    outline: 1px solid rgba(255, 255, 0, 0.5);
  }

  &.sc-image-block {
    display: inline-block;

    img {
      display: block;
      max-width: 100%;
      height: auto;
    }
  }
}

/* Screenshot creation state - hide all SmartComments styling except active highlight */
body.smartcomments-creating-screenshot {
  .smartcomments {
    *[data-tooltip]:hover:after {
      display: none;
    }
  }

  .sc-dynamic-block {
    &:hover,
    &[class*="smartcomment-hl-"]:not(.active) {
      &:before {
        display: none;
      }
    }

    &.sc-hover {
      background-color: transparent;
      outline: none;
    }
  }

  *[class^="smartcomment-hl-"]:not(.active) {
    background: transparent;
    box-shadow: none;
    padding: 0;
  }

  .smartcomments-enabled {
    svg a:not(.active) {
      rect,
      path,
      circle,
      polygon {
        stroke: inherit !important;
        stroke-width: inherit !important;
        filter: none;
      }

      text {
        font-weight: inherit;
        filter: none;
      }
    }

    .sc-selection-highlight:not(.active) {
      background-color: transparent;
      border: none;
    }
  }
}

.smartcomments-enabled {
  svg a {
    cursor: pointer;
    transition: all 0.2s ease;

    &.sc-svg-hover {
      rect,
      path,
      circle,
      polygon {
        stroke: rgba(255, 255, 0, 0.8) !important;
        stroke-width: 2 !important;
        filter: drop-shadow(0 0 3px rgba(255, 255, 0, 0.6));
      }

      text {
        font-weight: bold;
        filter: drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.3));
      }
    }

    &[class*="smartcomment-hl-"] {
      rect {
        stroke: rgba(255, 222, 141, 0.8) !important;
        stroke-width: 2 !important;
        fill: rgba(255, 255, 224, 0.4) !important;
      }

      &.active {
        rect {
          fill: rgba(255, 222, 141, 0.6) !important;
        }
      }
    }
  }

  /* Text selection highlighting */

  .sc-selection-highlight {
    background-color: rgba(255, 255, 224, 0.8);
    border-top: 1px solid rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(0, 0, 0, 0.2);

    &:first-child {
      border-left: 1px solid rgba(0, 0, 0, 0.2);
    }

    &:last-child {
      border-right: 1px solid rgba(0, 0, 0, 0.2);
    }
  }

  /* Selection disabled state */

  &.selection-disabled {
    .sc-dynamic-block {
      cursor: default;

      &:hover {
        background-color: transparent;
        outline: none;
      }
    }
  }
}
</style>
