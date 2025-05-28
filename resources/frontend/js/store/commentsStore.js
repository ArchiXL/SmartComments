const { defineStore } = Pinia;

module.exports = defineStore('commentsStore', {
    state: () => ({
        comments: [],
        currentCommentId: null,
        isLoading: false,
        error: null,
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
        }
    }
}); 