const { ref } = require('vue');
const {
    formatSelectionForBackend,
    parseSelectionFromBackend
} = require('../utils/selectionUtils.js');
const useMessages = require('./useMessages.js');

/**
 * @typedef {Object} Comment
 * @property {string} id - Unique identifier for the comment
 * @property {string} text - The content of the comment
 * @property {string} status - Current status of the comment
 * @property {string} user - The user who created the comment
 * @property {string} timestamp - When the comment was created
 * @property {string} [parentId] - Optional parent comment ID
 * @property {string} page - The page the comment belongs to
 */

/**
 * @typedef {Object} ApiResponse
 * @property {string} success - Whether the operation was successful ('1' for success, '0' for failure)
 * @property {string} [message] - Optional message, especially for errors
 * @property {Object} [data] - Optional data returned from the API
 */

/**
 * @typedef {Object} CommentsState
 * @property {Array<Comment>} comments - List of comments
 * @property {boolean} isLoading - Whether comments are being loaded
 * @property {Error|null} error - Any error that occurred
 * @property {boolean} blockedMode - Whether the wiki is in blocked mode
 */

/**
 * Composable for managing smart comments
 * @returns {Object} Comments composable functions and state
 */
function useComments() {
    const comments = ref([]);
    const isLoading = ref(false);
    const error = ref(null);
    const blockedMode = ref(false);

    const { messages } = useMessages();

    /**
     * Make API requests to the MediaWiki API
     * @param {string} method - The method to call
     * @param {Object} params - Parameters for the API request
     * @returns {Promise<Object>} - The API response
     */
    const apiRequest = async (method, params = {}) => {
        const api = new mw.Api();

        const requestData = {
            action: 'smartcomments',
            method: method,
            format: 'json',
            ...params
        };

        try {
            const result = await api.post(requestData);
            return result;
        } catch (err) {
            console.error('API request failed:', err);
            throw err;
        }
    };

    /**
     * Fetch comments for the current page
     * @returns {Promise<void>}
     */
    const fetchComments = async () => {
        isLoading.value = true;
        error.value = null;

        try {
            const data = await apiRequest('lista', {
                page: mw.config.get('wgPageName'),
                status: 'open'
            });

            const rawAnchors = data.smartcomments?.anchors || [];

            comments.value = rawAnchors.map(anchor => {
                const processedAnchor = { ...anchor };
                const selectionDetails = parseSelectionFromBackend(anchor.pos);

                if (selectionDetails) {
                    processedAnchor.parsedSelection = selectionDetails;

                    if (selectionDetails.type === 'text') {
                        processedAnchor.highlight_type = 'wordIndex';
                    } else if (selectionDetails.type === 'image' || selectionDetails.type === 'dynamic-block') {
                        processedAnchor.highlight_type = 'selector';
                    } else {
                        processedAnchor.highlight_type = 'unknown';
                        console.warn('fetchComments: Unknown highlight type for anchor:', anchor);
                    }
                } else {
                    processedAnchor.highlight_type = 'unknown';
                    console.warn('fetchComments: Could not parse backend position string for anchor:', anchor);
                }
                return processedAnchor;
            }).filter(anchor => anchor.highlight_type !== 'unknown');

            isLoading.value = false;
        } catch (err) {
            error.value = err;
            isLoading.value = false;
            console.error('Error fetching comments:', err);
        }
    };

    /**
     * Get a specific comment by ID
     * @param {string|number} commentId - The ID of the comment
     * @param {string} group - Group parameter
     * @returns {Promise<Comment|null>} - The comment data
     */
    const getComment = async (commentId, group) => {
        try {
            const data = await apiRequest('get', {
                comment: commentId
            });

            return data.smartcomments?.comment || null;
        } catch (err) {
            error.value = err;
            return null;
        }
    };

    /**
     * Create a new comment
     * @param {string} text - The comment text
     * @param {Object} selectionData - Optional selection data (if not provided, will use current selection)
     * @returns {Promise<ApiResponse>} - The result of the operation
     */
    const saveComment = async (text, selectionData) => {
        isLoading.value = true;
        error.value = null;

        if (!text || text.trim() === '') {
            isLoading.value = false;
            return { success: '0', message: messages.errorEmpty() };
        }

        // For replies, we only need parentId, not selection text
        const isReply = selectionData && selectionData.parentId;

        if (!isReply && (!selectionData || !selectionData.text)) {
            console.warn('saveComment called without valid selectionData. This path might be deprecated or require legacy handling.');
            isLoading.value = false;
            return { success: '0', message: messages.selectionError5() };
        }

        try {
            let posString = '';

            // For replies, we don't need position data
            if (!isReply) {
                const formattedSelection = formatSelectionForBackend(selectionData);
                posString = formattedSelection.position;
            }

            const params = {
                pos: posString,
                comment: selectionData?.parentId || '',
                text: text,
                page: mw.config.get('wgPageName'),
                image: selectionData?.image || ''
            };

            const data = await apiRequest('new', params);

            isLoading.value = false;
            if (data && data.smartcomments && data.smartcomments.success === '1') {
                return data.smartcomments;
            } else if (data && data.smartcomments) {
                return data.smartcomments;
            } else {
                console.error('saveComment: Unexpected API response format:', data);
                return { success: '0', message: messages.apiError() };
            }

        } catch (err) {
            isLoading.value = false;
            error.value = err;
            console.error('Error saving comment:', err);
            return { success: '0', message: messages.apiError() };
        }
    };

    /**
     * Update an existing comment
     * @param {string|number} commentId - The ID of the comment
     * @param {string} status - The new status
     * @param {string} text - The updated text
     * @param {string} page - Optional page name
     * @returns {Promise<ApiResponse>} - The result of the operation
     */
    const updateComment = async (commentId, status, text, page = mw.config.get('wgPageName')) => {
        try {
            const data = await apiRequest('update', {
                comment: commentId,
                status,
                text,
                page
            });

            return data.smartcomments || { success: '0', message: messages.apiError() };
        } catch (err) {
            error.value = err;
            return { success: '0', message: messages.apiError() };
        }
    };

    /**
     * Delete a comment
     * @param {string|number} commentId - The ID of the comment
     * @param {string} page - Optional page name
     * @returns {Promise<ApiResponse>} - The result of the operation
     */
    const deleteComment = async (commentId, page = mw.config.get('wgPageName')) => {
        try {
            const data = await apiRequest('delete', {
                comment: commentId,
                page
            });

            return data.smartcomments || { success: '0', message: messages.apiError() };
        } catch (err) {
            error.value = err;
            return { success: '0', message: messages.apiError() };
        }
    };

    /**
     * Check if the wiki is in blocked mode
     * @returns {Promise<void>}
     */
    const checkBlockedMode = async () => {
        try {
            const data = await apiRequest('blockedmode');
            blockedMode.value = data.smartcomments?.message === 'true';
        } catch (err) {
            error.value = err;
        }
    };

    /**
     * Check if a comment can be saved
     * @returns {boolean} - Whether the comment can be saved
     */
    const canSaveComment = () => {
        const selection = window.getSelection();
        return selection && selection.toString().length > 0;
    };

    return {
        comments,
        isLoading,
        error,
        blockedMode,
        fetchComments,
        getComment,
        saveComment,
        updateComment,
        deleteComment,
        checkBlockedMode,
        canSaveComment
    };
}

module.exports = useComments; 