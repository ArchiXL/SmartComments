<template>
    <div class="smartcomments" v-if="isEnabled">
        <!-- Comment Dialog - now controlled by store -->
        <comment 
            v-if="commentsStore.isCommentDialogVisible" 
            :comment="commentsStore.activeComment" 
            :position="commentsStore.commentPosition"
            @close="commentsStore.closeCommentDialog" 
            @delete="commentsStore.deleteComment"
            @complete="commentsStore.completeComment"
            @view="commentsStore.viewPage"
            @navigate="handleCommentNavigation"
            @reply-added="commentsStore.handleReplyAdded"
        ></comment>
        
        <!-- New Comment Dialog - now controlled by store -->
        <new-comment-dialog
            :is-visible="commentsStore.isNewCommentDialogVisible"
            :selection-data="commentsStore.newCommentSelection"
            @close="commentsStore.closeNewCommentDialog"
            @save="commentsStore.handleCommentSaved"
            @cancel="commentsStore.closeNewCommentDialog"
        ></new-comment-dialog>

        <!-- Comment Timeline -->
        <comment-timeline></comment-timeline>
    </div>
</template>

<script>
const { defineComponent } = require('vue');
const useSmartCommentsSetup = require('./composables/useSmartCommentsSetup.js');
const { useSelectionEvents } = require('./composables/useSelectionEvents.js');
const { useLinkPrevention } = require('./composables/useLinkPrevention.js');
const { applyHighlights, clearAllHighlights } = require('./directives/highlightDirective.js');
const useAppStateStore = require('./store/appStateStore.js');
const useCommentsStore = require('./store/commentsStore.js');
const useMessages = require('./composables/useMessages.js');
const Comment = require('./components/Comment.vue');
const NewCommentDialog = require('./components/NewCommentDialog.vue');
const CommentTimeline = require('./components/CommentTimeline.vue');
const { smartCommentsEvents, EVENTS } = require('./utils/smartCommentsEvents.js');

module.exports = defineComponent({
    name: 'SmartComments',
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
        const linkPrevention = useLinkPrevention();
        return { smartCommentsSetup, store, commentsStore, applyHighlights, smartCommentsEvents, EVENTS, messages, linkPrevention };
    },
    data() {
        return {
            selectionEvents: null,
            selectionCleanup: null,
        };
    },
    computed: {
        isEnabled() {
            return this.store.isEnabled;
        },
        annotateTooltipText() {
            return this.messages.msg('sic-annotate-tooltip');
        },
        buttonOpenText() {
            return this.messages.msg('sic-button-open');
        }
    },
    mounted() {
        this.selectionEvents = useSelectionEvents();

        // Set up highlight refresh event listener
        this.setupHighlightRefreshListener();
        
        // Setup SmartComments events
        this.setupSmartCommentsEvents();

        // Set CSS custom property for annotate tooltip text
        this.updateAnnotateTooltipText();

        // Set CSS custom property for button open text
        this.updateButtonOpenText();

        this.$watch(() => this.isEnabled, async (stateNowEnabled) => {
            const targetElement = document.getElementById('mw-content-text') || document.body;

            if (stateNowEnabled) {
                // Trigger comments enabled event
                this.smartCommentsEvents.triggerCommentsEnabled();
                
                if (this.selectionEvents) this.selectionEvents.bindEvents();
                
                // Setup image selection to create dynamic block wrappers
                try {
                    const { useSelection } = require('./composables/selection/useSelection.js');
                    const selection = useSelection();
                    selection.setupSelection(); // This calls selectionStrategyFactory.setupStrategies()
                } catch (error) {
                    console.error('Failed to setup selection strategies:', error);
                }
                
                // Bind link prevention events when comment mode is enabled
                if (this.linkPrevention) this.linkPrevention.bindEvents();
                if (this.smartCommentsSetup.highlightedAnchors?.value) {
                    clearAllHighlights(targetElement, this.smartCommentsSetup.highlightedAnchors.value);
                }
                
                try {
                    await this.reloadHighlightsAndComments();
                    
                    // Check URL parameters and open comment if specified
                    await this.commentsStore.checkAndOpenCommentFromUrl();
                } catch (e) {
                    console.error('SmartComments.vue isEnabled watcher (enabled): Error loading or applying highlights:', e);
                }
            } else {
                // Trigger comments disabled event
                this.smartCommentsEvents.triggerCommentsDisabled();
                
                if (this.selectionEvents) this.selectionEvents.unbindEvents();
                // Unbind link prevention events when comment mode is disabled
                if (this.linkPrevention) this.linkPrevention.unbindEvents();
                if (this.smartCommentsSetup.highlightedAnchors?.value) {
                    clearAllHighlights(targetElement, this.smartCommentsSetup.highlightedAnchors.value);
                }
                // Close all dialogs when disabling
                this.commentsStore.closeAllDialogs();
            }
        }, { immediate: true });

        // Watch for changes in annotate tooltip text (e.g., language changes)
        this.$watch(() => this.annotateTooltipText, () => {
            this.updateAnnotateTooltipText();
        });

        // Watch for changes in button open text (e.g., language changes)
        this.$watch(() => this.buttonOpenText, () => {
            this.updateButtonOpenText();
        });

        // Handle selection events - delegate to store
        this.selectionCleanup = this.selectionEvents.onSelectionCreate(this.handleNewSelection);
        document.addEventListener('keydown', this.handleKeydown);

        // Listen for URL changes (back/forward navigation)
        this.handlePopState = async () => {
            if (this.isEnabled) {
                await this.commentsStore.checkAndOpenCommentFromUrl();
            }
        };
        window.addEventListener('popstate', this.handlePopState);
    },
    beforeUnmount() {
        const targetElement = document.getElementById('mw-content-text') || document.body;
        if (this.smartCommentsSetup.highlightedAnchors?.value) {
            clearAllHighlights(targetElement, this.smartCommentsSetup.highlightedAnchors.value);
        }
        document.removeEventListener('keydown', this.handleKeydown);
        document.removeEventListener('smartcomments:refresh-highlights', this.handleHighlightRefresh);
        if (this.selectionEvents) this.selectionEvents.unbindEvents();
        // Clean up link prevention events
        if (this.linkPrevention) this.linkPrevention.unbindEvents();
        if (this.selectionCleanup) this.selectionCleanup();
        window.removeEventListener('popstate', this.handlePopState);
        
        // Clean up SmartComments events
        if (this.smartCommentsEventsCleanup) {
            this.smartCommentsEventsCleanup.forEach(cleanup => cleanup());
        }
    },
    methods: {
        /**
         * Set up event listener for highlight refresh events
         */
        setupHighlightRefreshListener() {
            this.handleHighlightRefresh = async (event) => {
                await this.reloadHighlightsAndComments();
            };
            document.addEventListener('smartcomments:refresh-highlights', this.handleHighlightRefresh);
        },

        /**
         * Reload highlights and update comments store
         */
        async reloadHighlightsAndComments() {
            try {
                const targetElement = document.getElementById('mw-content-text') || document.body;
                
                // Clear existing highlights first (like enable/disable process)
                if (this.smartCommentsSetup.highlightedAnchors?.value) {
                    clearAllHighlights(targetElement, this.smartCommentsSetup.highlightedAnchors.value);
                }
                
                // Reload comments and highlights from server
                await this.smartCommentsSetup.loadAndSetHighlights();
                
                // Update the comments store with the freshly loaded comments
                if (this.smartCommentsSetup.comments?.value) {
                    this.commentsStore.setComments(this.smartCommentsSetup.comments.value);
                }
                
                // Apply the fresh highlights
                if (this.smartCommentsSetup.highlightedAnchors?.value) {
                    this.applyHighlights(targetElement, this.smartCommentsSetup.highlightedAnchors.value, this.handleHighlightClick);
                }
                
                // Restore active highlight if dialog is open
                if (this.commentsStore.isCommentDialogVisible && this.commentsStore.activeComment) {
                    const commentId = this.commentsStore.activeComment.data_id || this.commentsStore.activeComment.id;
                    this.commentsStore.setActiveHighlight(commentId);
                }
            } catch (error) {
                console.error('SmartComments.vue: Error reloading highlights:', error);
            }
        },

        /**
         * Handle highlight click - delegate to store
         */
        handleHighlightClick(event, commentData, position) {
            if (event && event.preventDefault) {
                event.preventDefault();
            }
            
            // Trigger events
            this.smartCommentsEvents.triggerHighlightClicked(commentData, position);
            this.smartCommentsEvents.triggerCommentGroupOpen(commentData, position);
            
            this.commentsStore.openCommentDialog(commentData, position);
        },

        /**
         * Handle keyboard shortcuts
         */
        handleKeydown(event) {
            if (event.key === 'Escape' && this.commentsStore.isCommentDialogVisible) {
                this.commentsStore.closeCommentDialog();
            } else if (event.key === 'Delete' && this.commentsStore.activeComment) {
                this.commentsStore.deleteComment(this.commentsStore.activeComment);
            } else if (event.key === 'ArrowDown' && this.commentsStore.hasNextComment) {
                this.commentsStore.navigateComment('next');
            } else if (event.key === 'ArrowUp' && this.commentsStore.hasPreviousComment) {
                this.commentsStore.navigateComment('previous');
            }
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
            if (!this.isEnabled) {
                console.warn('SmartComments.vue: Cannot reload highlights, system is disabled.');
                return;
            }
            const targetElement = document.getElementById('mw-content-text') || document.body;
            if (this.smartCommentsSetup?.loadAndSetHighlights) {
                try {
                    if (this.smartCommentsSetup.highlightedAnchors?.value) {
                        clearAllHighlights(targetElement, this.smartCommentsSetup.highlightedAnchors.value);
                    }

                    await this.reloadHighlightsAndComments();
                } catch (error) {
                    console.error('SmartComments.vue reloadHighlights: Error:', error);
                }
            } else {
                console.error('SmartComments.vue reloadHighlights: smartCommentsSetup.loadAndSetHighlights not available.');
            }
        },

        /**
         * Check URL parameters and open comment (for debugging)
         */
        async checkUrlParameters() {
            if (!this.isEnabled) {
                console.warn('SmartComments.vue: Cannot check URL parameters, system is disabled.');
                return;
            }
            await this.commentsStore.checkAndOpenCommentFromUrl();
        },

        /**
         * Setup SmartComments events
         */
        setupSmartCommentsEvents() {
            // Store cleanup functions for event listeners
            this.smartCommentsEventsCleanup = [];
            
            // Listen for debug mode events
            this.smartCommentsEventsCleanup.push(
                this.smartCommentsEvents.on(EVENTS.DEBUG_MODE, (event) => {
                    if (event.detail.enabled && !this.isEnabled) {
                        this.store.setEnabled(true);
                    }
                })
            );
            
            // Listen for selection active events
            this.smartCommentsEventsCleanup.push(
                this.smartCommentsEvents.on(EVENTS.SELECTION_ACTIVE, (event) => {
                    // Close any open comment dialogs when a new selection is made
                    if (this.commentsStore.isCommentDialogVisible) {
                        this.commentsStore.closeCommentDialog();
                    }
                })
            );
            
            // Listen for open comment events
            this.smartCommentsEventsCleanup.push(
                this.smartCommentsEvents.on(EVENTS.OPEN_COMMENT_ID, (event) => {
                    if (event.detail.commentId) {
                        // Handle opening specific comment
                        this.commentsStore.openCommentById(event.detail.commentId);
                    }
                })
            );

            // Listen for comment created events
            this.smartCommentsEventsCleanup.push(
                this.smartCommentsEvents.on(EVENTS.COMMENT_CREATED, (event) => {
                    this.reloadHighlightsAndComments();
                })
            );
        },

        /**
         * Update CSS custom property for annotate tooltip text
         */
        updateAnnotateTooltipText() {
            document.documentElement.style.setProperty('--smartcomments-annotate-text', `"${this.annotateTooltipText}"`);
        },

        /**
         * Update CSS custom property for button open text
         */
        updateButtonOpenText() {
            document.documentElement.style.setProperty('--smartcomments-button-open-text', `"${this.buttonOpenText}"`);
        }
    }
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
    }
}
*[class^='smartcomment-hl-'] {
    cursor: pointer;
    text-decoration: none;
    color: #000;
    background: #ffffe0;
    padding: 0 2px;
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

.smartcomments-enabled {
    svg a {
        cursor: pointer;
        transition: all 0.2s ease;
        
        &.sc-svg-hover {
            rect, path, circle, polygon {
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