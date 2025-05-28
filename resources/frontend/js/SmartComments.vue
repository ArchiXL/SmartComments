<template>
    <div class="smartcomments" v-if="isEnabled">
        <!-- No inner div, no v-highlight directive -->
        <comment 
            v-if="comment" 
            :comment="comment" 
            :position="commentPosition"
            @close="closeComment" 
            @delete="deleteComment($event)"
            @complete="completeComment($event)"
            @view="viewPage($event)"
            @navigate="handleCommentNavigation"
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
const { applyHighlights, clearAllHighlights } = require('./directives/highlightDirective.js');
const useAppStateStore = require('./store/appStateStore.js');
const useCommentsStore = require('./store/commentsStore.js');
const Comment = require('./components/Comment.vue');
const NewCommentDialog = require('./components/NewCommentDialog.vue');

module.exports = defineComponent({
    name: 'SmartComments',
    components: {
        Comment,
        NewCommentDialog,
    },
    setup() {
        const smartCommentsSetup = useSmartCommentsSetup();
        const store = useAppStateStore();
        const commentsStore = useCommentsStore();
        return { smartCommentsSetup, store, commentsStore, applyHighlights };
    },
    data() {
        return {
            comment: null,
            commentPosition: null,
            selectionEvents: null,
            selectionCleanup: null,
            showNewCommentDialog: false,
            newCommentPosition: null,
            newCommentSelection: null,
        };
    },
    computed: {
        isEnabled() {
            return this.store.isEnabled;
        }
    },
    mounted() {
        console.log('SmartComments.vue: mounted. isEnabled initially (from store):', this.isEnabled);

        this.selectionEvents = useSelectionEvents();

        this.$watch(() => this.isEnabled, async (stateNowEnabled) => {
            console.log(`SmartComments.vue: isEnabled watcher (from store). New state: ${stateNowEnabled}.`);
            const targetElement = document.getElementById('mw-content-text') || document.body;

            if (stateNowEnabled) {
                if (this.selectionEvents) this.selectionEvents.bindEvents();
                console.log('SmartComments.vue isEnabled watcher: System ENABLED. Clearing old highlights before fetching new.');
                if (this.smartCommentsSetup.highlightedAnchors?.value) {
                    clearAllHighlights(targetElement, this.smartCommentsSetup.highlightedAnchors.value);
                }
                
                console.log('SmartComments.vue isEnabled watcher: Fetching highlights.');
                try {
                    await this.smartCommentsSetup.loadAndSetHighlights();
                    // Update the comments store with the loaded comments
                    if (this.smartCommentsSetup.comments?.value) {
                        this.commentsStore.setComments(this.smartCommentsSetup.comments.value);
                    }
                    console.log('SmartComments.vue isEnabled watcher: Highlights loaded. Applying new highlights. Anchors:', this.smartCommentsSetup.highlightedAnchors?.value);
                    if (this.smartCommentsSetup.highlightedAnchors?.value) {
                        this.applyHighlights(targetElement, this.smartCommentsSetup.highlightedAnchors.value, this.openComment);
                    }
                } catch (e) {
                    console.error('SmartComments.vue isEnabled watcher (enabled): Error loading or applying highlights:', e);
                }
            } else {
                if (this.selectionEvents) this.selectionEvents.unbindEvents();
                console.log('SmartComments.vue isEnabled watcher: System DISABLED. Clearing highlights.');
                if (this.smartCommentsSetup.highlightedAnchors?.value) {
                    clearAllHighlights(targetElement, this.smartCommentsSetup.highlightedAnchors.value);
                }
                this.closeComment();
                this.closeNewCommentDialog();
            }
        }, { immediate: true });

        this.selectionCleanup = this.selectionEvents.onSelectionCreate(this.handleNewSelection);
        document.addEventListener('keydown', this.handleKeydown);

        if (typeof window !== 'undefined') {
            window.SmartCommentsDebug = {
                component: this,
                reloadHighlights: () => this.reloadHighlights(),
                debugState: () => this.debugCurrentState(),
                getComposableHighlights: () => this.smartCommentsSetup.highlightedAnchors?.value,
                isEnabledStore: () => this.store.isEnabled,
                enableComments: () => this.store.enableSmartComments(),
                disableComments: () => this.store.disableSmartComments()
            };
        }
    },
    beforeUnmount() {
        console.log('SmartComments.vue: beforeUnmount. Clearing highlights.');
        const targetElement = document.getElementById('mw-content-text') || document.body;
        if (this.smartCommentsSetup.highlightedAnchors?.value) {
            clearAllHighlights(targetElement, this.smartCommentsSetup.highlightedAnchors.value);
        }
        document.removeEventListener('keydown', this.handleKeydown);
        if (this.selectionEvents) this.selectionEvents.unbindEvents();
        if (this.selectionCleanup) this.selectionCleanup();
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
                    // Set the current comment in the store for navigation
                    this.commentsStore.setCurrentComment(fetchedComment.id || fetchedComment.data_id);
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
            this.commentsStore.setCurrentComment(null);
        },
        handleKeydown(event) {
            if (event.key === 'Escape' && this.comment) this.closeComment();
            else if (event.key === 'Delete' && this.comment) this.deleteComment(this.comment);
        },
        handleNewSelection(selectionData) {
            const { selection, position } = selectionData;
            this.openCommentCreation(selection, position);
        },
        openCommentCreation(selection, position) {
            this.newCommentSelection = {
                text: selection.text,
                index: selection.index,
                type: selection.type,
                image: selection.image || null
            };
            this.newCommentPosition = { x: position.x, y: position.y };
            this.showNewCommentDialog = true;
        },
        async deleteComment(comment) {
            console.log('Delete comment', comment);
            this.closeComment();
        },
        async completeComment(comment) {
            console.log('Complete comment', comment);
        },
        async viewPage(comment) {
            console.log('View page for comment', comment);
        },
        closeNewCommentDialog() {
            this.showNewCommentDialog = false;
            this.newCommentPosition = null;
            this.newCommentSelection = null;
        },
        async handleCommentSaved(savedComment) {
            this.closeNewCommentDialog();
            console.log('SmartComments.vue: Comment saved (event from dialog), reloading highlights.');
            try {
                await this.smartCommentsSetup.loadAndSetHighlights();
                // Update the comments store with the new comments
                if (this.smartCommentsSetup.comments?.value) {
                    this.commentsStore.setComments(this.smartCommentsSetup.comments.value);
                }
            } catch (e) {
                console.error('SmartComments.vue: Error reloading highlights after save:', e);
            }
        },
        async handleCommentNavigation(navigationData) {
            const { type, comment: nextComment } = navigationData;
            console.log('SmartComments.vue: Navigating to', type, 'comment:', nextComment);
            
            if (nextComment) {
                try {
                    const { getComment } = useComments();
                    const fetchedComment = await getComment(nextComment.data_id || nextComment.id);
                    if (fetchedComment) {
                        this.comment = fetchedComment;
                        // Keep the same position for now, or could be enhanced to scroll to the highlighted element
                        console.log('SmartComments.vue: Successfully navigated to', type, 'comment');
                    } else {
                        console.error('SmartComments.vue: Could not fetch', type, 'comment:', nextComment);
                    }
                } catch (e) {
                    console.error('SmartComments.vue: Error navigating to', type, 'comment:', e);
                }
            }
        },
        async reloadHighlights() {
            console.log('SmartComments.vue: Manually reloading highlights...');
            if (!this.isEnabled) {
                console.warn('SmartComments.vue: Cannot reload highlights, system is disabled.');
                return;
            }
            const targetElement = document.getElementById('mw-content-text') || document.body;
            if (this.smartCommentsSetup?.loadAndSetHighlights) {
                try {
                    console.log('SmartComments.vue reloadHighlights: Clearing current DOM highlights.');
                    if (this.smartCommentsSetup.highlightedAnchors?.value) {
                        clearAllHighlights(targetElement, this.smartCommentsSetup.highlightedAnchors.value);
                    }

                    await this.smartCommentsSetup.loadAndSetHighlights();
                    // Update the comments store with the reloaded comments
                    if (this.smartCommentsSetup.comments?.value) {
                        this.commentsStore.setComments(this.smartCommentsSetup.comments.value);
                    }
                    console.log('SmartComments.vue reloadHighlights: Manual reload successfully triggered loadAndSetHighlights. Applying new highlights.');
                    if (this.smartCommentsSetup.highlightedAnchors?.value) {
                        this.applyHighlights(targetElement, this.smartCommentsSetup.highlightedAnchors.value, this.openComment);
                    }
                } catch (error) {
                    console.error('SmartComments.vue reloadHighlights: Error:', error);
                }
            } else {
                console.error('SmartComments.vue reloadHighlights: smartCommentsSetup.loadAndSetHighlights not available.');
            }
        },
        debugCurrentState() {
            console.log('=== SmartComments Debug State ===');
            console.log('isEnabled (computed):', this.isEnabled);
            if (this.smartCommentsSetup) {
                console.log('Composable state (smartCommentsSetup):', {
                    comments: this.smartCommentsSetup.comments?.value,
                    highlightedAnchors: this.smartCommentsSetup.highlightedAnchors?.value,
                });
            } else {
                console.log('Composable state (smartCommentsSetup): Not available');
            }
            console.log('Comments store state:', {
                comments: this.commentsStore.comments,
                currentCommentId: this.commentsStore.currentCommentId,
                hasNext: this.commentsStore.hasNextComment,
                hasPrevious: this.commentsStore.hasPreviousComment
            });
            console.log('Window debug object:', window.SmartCommentsDebug);
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
            width: auto;
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
*[class^='smartcomment-hl-'] {
    cursor: pointer;
    text-decoration: none !important;
    color: #000;
    background: #ffffe0;
    /*blue=#e0ffff; green=#e0ffe0; red=#ffe0e0; yellow=#ffffe0*/
    padding: 0 2px;
    z-index: 2 !important;
    box-shadow: 0 0 1px #000;

    &.active {
        background: #b4f3ff;
    }

    &.image {
        .sc-dynamic-block {
            &:before {
                background: #ffffe0bf;
                content: " ";
                width: 100%;
                height: 100%;
                position: absolute;

                &:hover {
                    background: lightyellow;
                }
            }
        }
    }
}
</style>