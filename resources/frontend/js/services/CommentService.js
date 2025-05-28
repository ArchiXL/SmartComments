const useComments = require('../composables/useComments.js');

/**
 * Service class for handling comment operations and dialog management
 * Alternative approach to store-based management
 */
class CommentService {
    constructor(commentsStore, appStateStore) {
        this.commentsStore = commentsStore;
        this.appStateStore = appStateStore;
        this.dialogState = {
            activeComment: null,
            commentPosition: null,
            isCommentDialogVisible: false,
            isNewCommentDialogVisible: false,
            newCommentSelection: null
        };
        this.eventListeners = new Map();
        this.setupEventBus();
    }

    /**
     * Set up event bus for communication with UI components
     */
    setupEventBus() {
        this.eventBus = {
            emit: (event, data) => {
                const listeners = this.eventListeners.get(event) || [];
                listeners.forEach(callback => callback(data));
            },
            on: (event, callback) => {
                if (!this.eventListeners.has(event)) {
                    this.eventListeners.set(event, []);
                }
                this.eventListeners.get(event).push(callback);
            },
            off: (event, callback) => {
                if (this.eventListeners.has(event)) {
                    const listeners = this.eventListeners.get(event);
                    const index = listeners.indexOf(callback);
                    if (index > -1) {
                        listeners.splice(index, 1);
                    }
                }
            }
        };
    }

    /**
     * Get current dialog state
     */
    getDialogState() {
        return { ...this.dialogState };
    }

    /**
     * Open comment dialog
     */
    async openCommentDialog(commentData, position) {
        console.log('CommentService: Opening comment dialog for:', commentData.data_id);

        try {
            this.commentsStore.setLoading(true);
            const { getComment } = useComments();
            const fetchedComment = await getComment(commentData.data_id);

            if (fetchedComment) {
                this.dialogState.activeComment = fetchedComment;
                this.dialogState.commentPosition = position;
                this.dialogState.isCommentDialogVisible = true;
                this.commentsStore.setCurrentComment(fetchedComment.id || fetchedComment.data_id);

                this.eventBus.emit('comment-dialog-opened', {
                    comment: fetchedComment,
                    position
                });

                console.log('CommentService: Comment dialog opened successfully');
            } else {
                this.commentsStore.setError('Comment not found');
                console.error('CommentService: Comment not found:', commentData.data_id);
            }
        } catch (error) {
            this.commentsStore.setError('Error fetching comment');
            console.error('CommentService: Error fetching comment:', error);
        } finally {
            this.commentsStore.setLoading(false);
        }
    }

    /**
     * Close comment dialog
     */
    closeCommentDialog() {
        this.dialogState.activeComment = null;
        this.dialogState.commentPosition = null;
        this.dialogState.isCommentDialogVisible = false;
        this.commentsStore.setCurrentComment(null);

        this.eventBus.emit('comment-dialog-closed');
        console.log('CommentService: Comment dialog closed');
    }

    /**
     * Navigate between comments
     */
    async navigateComment(direction) {
        const targetComment = direction === 'next'
            ? this.commentsStore.goToNextComment()
            : this.commentsStore.goToPreviousComment();

        if (targetComment) {
            try {
                const { getComment } = useComments();
                const fetchedComment = await getComment(targetComment.data_id || targetComment.id);

                if (fetchedComment) {
                    this.dialogState.activeComment = fetchedComment;
                    this.eventBus.emit('comment-navigated', {
                        direction,
                        comment: fetchedComment
                    });
                    console.log('CommentService: Successfully navigated to', direction, 'comment');
                } else {
                    this.commentsStore.setError(`Could not fetch ${direction} comment`);
                }
            } catch (error) {
                this.commentsStore.setError(`Error navigating to ${direction} comment`);
            }
        }
    }

    /**
     * Open new comment dialog
     */
    openNewCommentDialog(selectionData) {
        this.dialogState.newCommentSelection = {
            text: selectionData.selection.text,
            index: selectionData.selection.index,
            type: selectionData.selection.type,
            image: selectionData.selection.image || null
        };
        this.dialogState.isNewCommentDialogVisible = true;

        this.eventBus.emit('new-comment-dialog-opened', {
            selectionData: this.dialogState.newCommentSelection
        });
        console.log('CommentService: New comment dialog opened');
    }

    /**
     * Close new comment dialog
     */
    closeNewCommentDialog() {
        this.dialogState.newCommentSelection = null;
        this.dialogState.isNewCommentDialogVisible = false;

        this.eventBus.emit('new-comment-dialog-closed');
        console.log('CommentService: New comment dialog closed');
    }

    /**
     * Handle comment save
     */
    async handleCommentSaved(savedComment) {
        this.closeNewCommentDialog();

        this.eventBus.emit('comment-saved', { savedComment });

        // Trigger highlight refresh
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('smartcomments:refresh-highlights', {
                detail: { savedComment }
            }));
        }

        console.log('CommentService: Comment saved, triggering refresh');
    }

    /**
     * Delete comment
     */
    async deleteComment(comment) {
        console.log('CommentService: Deleting comment:', comment.id || comment.data_id);
        this.commentsStore.setLoading(true);

        try {
            const { deleteComment } = useComments();
            const result = await deleteComment(comment.id || comment.data_id);

            if (result.success === '1' || result.success === true) {
                this.commentsStore.removeComment(comment.id || comment.data_id);
                this.closeCommentDialog();

                this.eventBus.emit('comment-deleted', { comment });

                // Trigger highlight refresh
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('smartcomments:refresh-highlights', {
                        detail: { deletedComment: comment }
                    }));
                }
                console.log('CommentService: Comment deleted successfully');
            } else {
                this.commentsStore.setError(result.message || 'Failed to delete comment');
            }
        } catch (error) {
            this.commentsStore.setError('Error deleting comment');
            console.error('CommentService: Error deleting comment:', error);
        } finally {
            this.commentsStore.setLoading(false);
        }
    }

    /**
     * Complete comment
     */
    async completeComment(comment) {
        console.log('CommentService: Completing comment:', comment.id || comment.data_id);
        this.commentsStore.setLoading(true);

        try {
            const { updateComment } = useComments();
            const result = await updateComment(
                comment.id || comment.data_id,
                'completed',
                comment.text
            );

            if (result.success === '1' || result.success === true) {
                this.commentsStore.updateComment(comment.id || comment.data_id, { status: 'completed' });

                this.eventBus.emit('comment-completed', { comment });

                // Trigger highlight refresh
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('smartcomments:refresh-highlights', {
                        detail: { completedComment: comment }
                    }));
                }
                console.log('CommentService: Comment completed successfully');
            } else {
                this.commentsStore.setError(result.message || 'Failed to complete comment');
            }
        } catch (error) {
            this.commentsStore.setError('Error completing comment');
            console.error('CommentService: Error completing comment:', error);
        } finally {
            this.commentsStore.setLoading(false);
        }
    }

    /**
     * View page for comment
     */
    viewPage(comment) {
        console.log('CommentService: Viewing page for comment:', comment.id || comment.data_id);
        this.eventBus.emit('comment-page-view', { comment });
        // Implementation depends on your page navigation system
    }

    /**
     * Close all dialogs
     */
    closeAllDialogs() {
        this.closeCommentDialog();
        this.closeNewCommentDialog();
        this.eventBus.emit('all-dialogs-closed');
    }

    /**
     * Subscribe to service events
     */
    on(event, callback) {
        this.eventBus.on(event, callback);
    }

    /**
     * Unsubscribe from service events
     */
    off(event, callback) {
        this.eventBus.off(event, callback);
    }

    /**
     * Destroy service and cleanup
     */
    destroy() {
        this.eventListeners.clear();
        this.dialogState = null;
    }
}

module.exports = CommentService; 