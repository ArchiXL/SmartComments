const { defineStore } = Pinia;
const useComments = require('../composables/useComments.js');

module.exports = defineStore('commentsStore', {
    state: () => ({
        comments: [],
        currentCommentId: null,
        isLoading: false,
        error: null,

        // Dialog state management
        activeComment: null,
        commentPosition: null,
        isCommentDialogVisible: false,

        // New comment dialog state
        isNewCommentDialogVisible: false,
        newCommentSelection: null,
    }),

    getters: {
        getCurrentComment: (state) => {
            return state.comments.find(comment =>
                (comment.id && comment.id === state.currentCommentId) ||
                (comment.data_id && comment.data_id === state.currentCommentId)
            ) || null;
        },

        getCurrentCommentIndex: (state) => {
            return state.comments.findIndex(comment =>
                (comment.id && comment.id === state.currentCommentId) ||
                (comment.data_id && comment.data_id === state.currentCommentId)
            );
        },

        hasNextComment: (state) => {
            const currentIndex = state.comments.findIndex(comment =>
                (comment.id && comment.id === state.currentCommentId) ||
                (comment.data_id && comment.data_id === state.currentCommentId)
            );
            return currentIndex !== -1 && currentIndex < state.comments.length - 1;
        },

        hasPreviousComment: (state) => {
            const currentIndex = state.comments.findIndex(comment =>
                (comment.id && comment.id === state.currentCommentId) ||
                (comment.data_id && comment.data_id === state.currentCommentId)
            );
            return currentIndex > 0;
        },

        getNextComment: (state) => {
            const currentIndex = state.comments.findIndex(comment =>
                (comment.id && comment.id === state.currentCommentId) ||
                (comment.data_id && comment.data_id === state.currentCommentId)
            );
            if (currentIndex !== -1 && currentIndex < state.comments.length - 1) {
                return state.comments[currentIndex + 1];
            }
            return null;
        },

        getPreviousComment: (state) => {
            const currentIndex = state.comments.findIndex(comment =>
                (comment.id && comment.id === state.currentCommentId) ||
                (comment.data_id && comment.data_id === state.currentCommentId)
            );
            if (currentIndex > 0) {
                return state.comments[currentIndex - 1];
            }
            return null;
        }
    },

    actions: {
        setComments(comments) {
            this.comments = comments;
        },

        setCurrentComment(commentId) {
            this.currentCommentId = commentId;
        },

        addComment(comment) {
            this.comments.push(comment);
        },

        updateComment(commentId, updatedData) {
            const index = this.comments.findIndex(comment =>
                (comment.id && comment.id === commentId) ||
                (comment.data_id && comment.data_id === commentId)
            );
            if (index !== -1) {
                this.comments[index] = { ...this.comments[index], ...updatedData };
            }
        },

        removeComment(commentId) {
            this.comments = this.comments.filter(comment =>
                (comment.id && comment.id !== commentId) &&
                (comment.data_id && comment.data_id !== commentId)
            );
            if (this.currentCommentId === commentId) {
                this.currentCommentId = null;
            }
        },

        goToNextComment() {
            const nextComment = this.getNextComment;
            if (nextComment) {
                this.currentCommentId = nextComment.id || nextComment.data_id;
                return nextComment;
            }
            return null;
        },

        goToPreviousComment() {
            const previousComment = this.getPreviousComment;
            if (previousComment) {
                this.currentCommentId = previousComment.id || previousComment.data_id;
                return previousComment;
            }
            return null;
        },

        setLoading(loading) {
            this.isLoading = loading;
        },

        setError(error) {
            this.error = error;
        },

        clearError() {
            this.error = null;
        },

        /**
         * Open a comment dialog with the specified comment and position
         */
        async openCommentDialog(commentData, position) {
            console.log('CommentsStore: Opening comment dialog for:', commentData.data_id);
            this.setLoading(true);
            this.clearError();

            try {
                const { getComment } = useComments();
                const fetchedComment = await getComment(commentData.data_id);

                if (fetchedComment) {
                    this.activeComment = fetchedComment;
                    this.commentPosition = position;
                    this.isCommentDialogVisible = true;
                    this.setCurrentComment(fetchedComment.id || fetchedComment.data_id);

                    // Set active highlight
                    this.setActiveHighlight(fetchedComment.data_id || fetchedComment.id);

                    console.log('CommentsStore: Comment dialog opened successfully');
                } else {
                    this.setError('Comment not found');
                    console.error('CommentsStore: Comment not found:', commentData.data_id);
                }
            } catch (error) {
                this.setError('Error fetching comment');
                console.error('CommentsStore: Error fetching comment:', error);
            } finally {
                this.setLoading(false);
            }
        },

        /**
         * Close the comment dialog
         */
        closeCommentDialog() {
            // Clear active highlight
            this.clearActiveHighlight();

            this.activeComment = null;
            this.commentPosition = null;
            this.isCommentDialogVisible = false;
            this.setCurrentComment(null);
            console.log('CommentsStore: Comment dialog closed');
        },

        /**
         * Navigate to next/previous comment
         */
        async navigateComment(direction) {
            const targetComment = direction === 'next' ? this.goToNextComment() : this.goToPreviousComment();

            if (targetComment) {
                try {
                    const { getComment } = useComments();
                    const fetchedComment = await getComment(targetComment.data_id || targetComment.id);

                    if (fetchedComment) {
                        this.activeComment = fetchedComment;

                        // Update active highlight to the new comment and scroll it into view
                        this.setActiveHighlight(fetchedComment.data_id || fetchedComment.id, true);

                        // Keep the same position for now, could be enhanced to scroll to highlighted element
                        console.log('CommentsStore: Successfully navigated to', direction, 'comment');
                    } else {
                        this.setError(`Could not fetch ${direction} comment`);
                        console.error('CommentsStore: Could not fetch', direction, 'comment:', targetComment);
                    }
                } catch (error) {
                    this.setError(`Error navigating to ${direction} comment`);
                    console.error('CommentsStore: Error navigating to', direction, 'comment:', error);
                }
            }
        },

        /**
         * Open new comment dialog with selection data
         */
        openNewCommentDialog(selectionData) {
            this.newCommentSelection = {
                text: selectionData.selection.text,
                index: selectionData.selection.index,
                type: selectionData.selection.type,
                image: selectionData.selection.image || null
            };
            this.isNewCommentDialogVisible = true;
            console.log('CommentsStore: New comment dialog opened');
        },

        /**
         * Close new comment dialog
         */
        closeNewCommentDialog() {
            this.newCommentSelection = null;
            this.isNewCommentDialogVisible = false;
            console.log('CommentsStore: New comment dialog closed');
        },

        /**
         * Handle comment save completion
         */
        async handleCommentSaved(savedComment) {
            this.closeNewCommentDialog();
            console.log('CommentsStore: Comment saved, triggering refresh');

            // Emit an event that the main component can listen to for reloading highlights
            // This maintains separation - the store doesn't know about highlight management
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('smartcomments:refresh-highlights', {
                    detail: { savedComment }
                }));
            }
        },

        /**
         * Delete a comment
         */
        async deleteComment(comment) {
            console.log('CommentsStore: Deleting comment:', comment.id || comment.data_id);
            this.setLoading(true);

            try {
                const { deleteComment } = useComments();
                const result = await deleteComment(comment.id || comment.data_id);

                if (result.success === '1' || result.success === true) {
                    this.removeComment(comment.id || comment.data_id);
                    this.closeCommentDialog();

                    // Trigger highlight refresh
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('smartcomments:refresh-highlights', {
                            detail: { deletedComment: comment }
                        }));
                    }
                    console.log('CommentsStore: Comment deleted successfully');
                } else {
                    this.setError(result.message || 'Failed to delete comment');
                }
            } catch (error) {
                this.setError('Error deleting comment');
                console.error('CommentsStore: Error deleting comment:', error);
            } finally {
                this.setLoading(false);
            }
        },

        /**
         * Complete a comment
         */
        async completeComment(comment) {
            console.log('CommentsStore: Completing comment:', comment.id || comment.data_id);
            this.setLoading(true);

            try {
                const { updateComment } = useComments();
                const result = await updateComment(
                    comment.id || comment.data_id,
                    'completed',
                    comment.text
                );

                if (result.success === '1' || result.success === true) {
                    this.updateComment(comment.id || comment.data_id, { status: 'completed' });

                    // Trigger highlight refresh
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('smartcomments:refresh-highlights', {
                            detail: { completedComment: comment }
                        }));
                    }
                    console.log('CommentsStore: Comment completed successfully');
                } else {
                    this.setError(result.message || 'Failed to complete comment');
                }
            } catch (error) {
                this.setError('Error completing comment');
                console.error('CommentsStore: Error completing comment:', error);
            } finally {
                this.setLoading(false);
            }
        },

        /**
         * View page for comment
         */
        viewPage(comment) {
            console.log('CommentsStore: Viewing page for comment:', comment.id || comment.data_id);
            // Implementation depends on your page navigation system
            // This could open a new window, navigate to a different route, etc.
        },

        /**
         * Close all dialogs (useful for global state changes)
         */
        closeAllDialogs() {
            this.closeCommentDialog();
            this.closeNewCommentDialog();
        },

        /**
         * Set active highlight for a comment
         */
        setActiveHighlight(commentId, scrollIntoView = false) {
            // First clear any existing active highlights
            this.clearActiveHighlight();

            // Find elements with the specific comment highlight class
            const specificClass = `smartcomment-hl-${commentId}`;
            const highlightElements = document.querySelectorAll(`.${specificClass}`);

            highlightElements.forEach(element => {
                element.classList.add('active');
            });

            // Also check for elements with data-comment-id attribute
            const dataElements = document.querySelectorAll(`[data-comment-id="${commentId}"]`);
            dataElements.forEach(element => {
                element.classList.add('active');
            });

            // Scroll the first active element into view if requested
            if (scrollIntoView) {
                const firstActiveElement = highlightElements[0] || dataElements[0];
                if (firstActiveElement) {
                    firstActiveElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
            }

            console.log('CommentsStore: Set active highlight for comment:', commentId);
        },

        /**
         * Clear all active highlights
         */
        clearActiveHighlight() {
            // Remove active class from all highlighted elements
            const activeElements = document.querySelectorAll('[class*="smartcomment-hl-"].active, [data-comment-id].active');
            activeElements.forEach(element => {
                element.classList.remove('active');
            });

            console.log('CommentsStore: Cleared all active highlights');
        },
    }
}); 