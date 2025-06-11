import { defineStore } from 'pinia';

export default defineStore('userStore', {
    state: () => ({
        userRights: [],
        isLoading: false,
        error: null,
    }),

    getters: {
        canManageComments: (state) => {
            return state.userRights.includes('manage-inlinecomments');
        },

        canAddComments: (state) => {
            return state.userRights.includes('add-inlinecomments');
        }
    },

    actions: {
        async fetchUserRights() {
            this.isLoading = true;
            this.error = null;

            try {
                this.userRights = await mw.user.getRights();
            } catch (error) {
                this.error = error;
                console.error('userStore: Failed to fetch user rights:', error);
            } finally {
                this.isLoading = false;
            }
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