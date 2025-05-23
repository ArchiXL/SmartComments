<template>
    <div class="smartcomments">
        <highlight-overlay v-if="isEnabled" v-highlight="{ anchors: highlightedAnchors, onClick: openComment }"></highlight-overlay>
        <comment 
            v-if="comment" 
            :comment="comment" 
            :position="commentPosition"
            @close="closeComment" 
            @delete="deleteComment($event)"
            @complete="completeComment($event)"
            @view="viewPage($event)"
        ></comment>
        
        <!-- New Comment Dialog -->
        <new-comment-dialog
            :is-visible="showNewCommentDialog"
            :position="newCommentPosition"
            :selection-data="newCommentSelection"
            @close="closeNewCommentDialog"
            @save="handleCommentSaved"
            @cancel="closeNewCommentDialog"
        ></new-comment-dialog>
    </div>
</template>

<script>
const { defineComponent } = require('vue');
const useSmartCommentsSetup = require('./composables/useSmartCommentsSetup.js');
const useComments = require('./composables/useComments.js');
const { useSelectionEvents } = require('./composables/useSelectionEvents.js');
const { highlightDirective } = require('./directives/highlightDirective.js');
const Comment = require('./components/Comment.vue');
const HighlightOverlay = require('./components/HighlightOverlay.vue');
const NewCommentDialog = require('./components/NewCommentDialog.vue');

module.exports = defineComponent({
    name: 'SmartComments',
    components: {
        Comment,
        HighlightOverlay,
        NewCommentDialog,
    },
    directives: {
        highlight: highlightDirective,
    },
    setup() {
        // Initialize smart comments setup during setup phase so onMounted works properly
        const smartCommentsSetup = useSmartCommentsSetup();
        
        return {
            smartCommentsSetup
        };
    },
    data() {
        return {
            enabled: false,
            comment: null,
            commentPosition: null,
            highlightedAnchors: [],
            isLoading: false,
            error: null,
            // Store references needed for cleanup
            selectionEvents: null,
            selectionCleanup: null,
            showNewCommentDialog: false,
            newCommentPosition: null,
            newCommentSelection: null,
        };
    },
    computed: {
        isEnabled() {
            return window.location.href.indexOf('scenabled=1') !== -1;
        }
    },
    mounted() {
        console.log('SmartComments mounted');
        
        // Set initial values with null checks - but these might be empty initially due to async loading
        if (this.smartCommentsSetup.highlightedAnchors?.value) {
            this.highlightedAnchors = this.smartCommentsSetup.highlightedAnchors.value;
        }
        if (this.smartCommentsSetup.isLoading?.value !== undefined) {
            this.isLoading = this.smartCommentsSetup.isLoading.value;
        }
        if (this.smartCommentsSetup.error?.value !== undefined) {
            this.error = this.smartCommentsSetup.error.value;
        }

        // Watch for changes in the reactive values - these are critical for catching async updates
        if (this.smartCommentsSetup.highlightedAnchors) {
            this.$watch(() => this.smartCommentsSetup.highlightedAnchors.value, (newValue) => {
                console.log('Highlighted anchors changed:', newValue);
                this.highlightedAnchors = newValue || [];
            }, { deep: true, immediate: true });
        }
        
        if (this.smartCommentsSetup.isLoading) {
            this.$watch(() => this.smartCommentsSetup.isLoading.value, (newValue) => {
                console.log('Loading state changed:', newValue);
                this.isLoading = newValue || false;
            }, { immediate: true });
        }
        
        if (this.smartCommentsSetup.error) {
            this.$watch(() => this.smartCommentsSetup.error.value, (newValue) => {
                console.log('Error state changed:', newValue);
                this.error = newValue || null;
            }, { immediate: true });
        }

        // Initialize selection events
        this.selectionEvents = useSelectionEvents();
        
        // Bind selection events if enabled
        if (this.isEnabled) {
            this.selectionEvents.bindEvents();
        }

        // Listen for new selections
        this.selectionCleanup = this.selectionEvents.onSelectionCreate(this.handleNewSelection);

        // Bind keyboard events
        document.addEventListener('keydown', this.handleKeydown);
        
        // Add a small delay to ensure everything is mounted, then manually trigger a check
        this.$nextTick(() => {
            setTimeout(async () => {
                // If highlights are still empty after a delay, there might be an issue
                if (this.highlightedAnchors.length === 0 && this.isEnabled) {
                    console.warn('No highlights loaded after mount. Checking for issues...');
                    this.debugCurrentState();
                    
                    // Try to manually load highlights as backup
                    console.log('Attempting manual highlight loading...');
                    try {
                        await this.smartCommentsSetup.loadAndSetHighlights();
                        console.log('Manual highlight loading completed');
                    } catch (error) {
                        console.error('Manual highlight loading failed:', error);
                    }
                }
            }, 1000);
        });
        
        // Expose debug methods globally for console access
        if (typeof window !== 'undefined') {
            window.SmartCommentsDebug = {
                component: this,
                reloadHighlights: () => this.reloadHighlights(),
                debugState: () => this.debugCurrentState(),
                getHighlights: () => this.highlightedAnchors,
                isEnabled: () => this.isEnabled
            };
            console.log('SmartComments debug methods available at window.SmartCommentsDebug');
        }
    },
    beforeUnmount() {
        // Clean up keyboard events
        document.removeEventListener('keydown', this.handleKeydown);
        
        // Clean up selection events
        if (this.selectionEvents) {
            this.selectionEvents.unbindEvents();
        }
        
        // Clean up selection listener
        if (this.selectionCleanup) {
            this.selectionCleanup();
        }
    },
    methods: {
        async openComment(commentData, position) {
            console.log('DEBUG: openComment called with:', commentData, 'at position:', position);
            try {
                const { getComment } = useComments();
                const fetchedComment = await getComment(commentData.data_id);
                if (fetchedComment) {
                    this.comment = fetchedComment;
                    this.commentPosition = position;
                } else {
                    console.error('Comment not found:', commentData.data_id);
                    this.comment = null;
                    this.commentPosition = null;
                }
            } catch (e) {
                console.error('Error fetching comment:', e);
                this.comment = null;
                this.commentPosition = null;
            }
        },

        closeComment() {
            this.comment = null;
            this.commentPosition = null;
        },

        handleKeydown(event) {
            if (event.key === 'Escape' && this.comment) {
                this.closeComment();
            } else if (event.key === 'Delete' && this.comment) {
                this.deleteComment(this.comment);
            }
        },

        /**
         * Handle new selection from the selection system
         * @param {Object} selectionData - Selection event data
         */
        handleNewSelection(selectionData) {
            const { selection, position, highlight } = selectionData;
            
            // Open comment creation interface at selection position
            this.openCommentCreation(selection, position);
        },

        /**
         * Open comment creation interface for a new selection
         * @param {Object} selection - Selection data
         * @param {Object} position - Mouse position
         */
        openCommentCreation(selection, position) {
            // Set up the new comment dialog data
            this.newCommentSelection = {
                text: selection.text,
                index: selection.index,
                type: selection.type,
                image: selection.image || null
            };

            this.newCommentPosition = {
                x: position.x,
                y: position.y
            };

            this.showNewCommentDialog = true;
        },

        async deleteComment(comment) {
            console.log('Delete comment', comment);
            // Add your delete logic here
            this.closeComment(); // Close comment after deletion
        },

        async completeComment(comment) {
            console.log('Complete comment', comment);
            // Add your complete logic here
        },

        async viewPage(comment) {
            console.log('View page', comment);
            // Add your view page logic here
        },

        closeNewCommentDialog() {
            this.showNewCommentDialog = false;
            this.newCommentPosition = null;
            this.newCommentSelection = null;
        },

        handleCommentSaved(comment) {
            this.comment = comment;
            this.commentPosition = comment.position;
            this.closeNewCommentDialog();
        },

        /**
         * Manual method to reload highlights for debugging
         */
        async reloadHighlights() {
            console.log('Manually reloading highlights...');
            if (this.smartCommentsSetup && this.smartCommentsSetup.loadAndSetHighlights) {
                try {
                    await this.smartCommentsSetup.loadAndSetHighlights();
                    console.log('Highlights reloaded successfully');
                } catch (error) {
                    console.error('Error reloading highlights:', error);
                }
            } else {
                console.error('SmartComments setup not available for manual reload');
            }
        },

        /**
         * Debug method to check current state
         */
        debugCurrentState() {
            console.log('=== SmartComments Debug State ===');
            console.log('isEnabled:', this.isEnabled);
            console.log('highlightedAnchors:', this.highlightedAnchors);
            console.log('isLoading:', this.isLoading);
            console.log('error:', this.error);
            console.log('smartCommentsSetup:', this.smartCommentsSetup);
            
            if (this.smartCommentsSetup) {
                console.log('Setup state:', {
                    comments: this.smartCommentsSetup.comments?.value,
                    highlightedAnchors: this.smartCommentsSetup.highlightedAnchors?.value,
                    isLoading: this.smartCommentsSetup.isLoading?.value,
                    error: this.smartCommentsSetup.error?.value
                });
            }
            console.log('================================');
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
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 1000;
            pointer-events: none;
            top: calc(100% + 0.5em);
            
            /* Position relative to right edge to prevent overflow */
            right: 0;
            max-width: 250px;
            white-space: normal;
            word-wrap: break-word;
            box-sizing: border-box;
        }
    }

    /* Selection system styles */
    .sc-dynamic-block {
        cursor: pointer;
        transition: background-color 0.2s ease;
        
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

    /* Existing comment highlights */
    [class*="smartcomment-hl-"] {
        cursor: pointer;
        transition: background-color 0.2s ease;
        
        &:hover {
            background-color: rgba(255, 255, 0, 0.3);
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