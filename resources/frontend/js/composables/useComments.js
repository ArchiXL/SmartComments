const { ref } = require('vue');

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


    /**
     * Make a request to the MediaWiki API
     * @param {string} method - API method to call
     * @param {object} params - Parameters to send
     * @returns {Promise<Object>} - API response
     */
    const apiRequest = async (method, params = {}) => {
        const defaultParams = {
            action: 'smartcomments',
            method,
            format: 'json'
        };

        const requestParams = { ...defaultParams, ...params };
        const api = new mw.Api();

        // For GET requests
        if (method === 'get' || method === 'lista' || method === 'blockedmode') {
            return api.get(requestParams);
        }
        // For POST requests
        else {
            return api.post(requestParams);
        }
    };

    /**
     * Fetch all comments for the current page
     * @param {string} status - Filter comments by status
     * @returns {Promise<void>}
     */
    const fetchComments = async () => {
        isLoading.value = true;
        error.value = null;

        try {
            const data = await apiRequest('lista', {
                page: mw.config.get('wgPageName')
            });

            const rawAnchors = data.smartcomments?.anchors || [];
            comments.value = rawAnchors.map(anchor => {
                const processedAnchor = { ...anchor };

                if (anchor.pos && typeof anchor.pos === 'string' && anchor.pos.includes('|')) {
                    processedAnchor.highlight_type = 'wordIndex';
                } else if (anchor.pos && typeof anchor.pos === 'string' && anchor.pos.indexOf('[') !== -1 && anchor.pos.indexOf(']') !== -1) {
                    processedAnchor.highlight_type = 'jQuery';
                } else if (anchor.pos && typeof anchor.pos === 'string' && anchor.pos.includes('img[')) {
                    processedAnchor.highlight_type = 'jQuery';
                }
                // If no type is determined, processedAnchor.highlight_type will be undefined.
                // formatCommentsForHighlighting should filter these out.
                return processedAnchor;
            });
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
     * @returns {Promise<ApiResponse>} - The result of the operation
     */
    const saveComment = async (text) => {
        try {
            // Get the current selection
            const selection = window.getSelection();
            const selectionString = selection.toString();
            const range = selection.getRangeAt(0);

            // Check if selection is valid
            if (!selectionString && mw.config.get('wgCanonicalSpecialPageName') !== 'SmartComments') {
                return {
                    success: '0',
                    message: 'selection-error'
                };
            }

            // Get parent element if available
            const parentId = range.startContainer.parentElement?.id || '';

            // Get image data if available
            const image = document.querySelector('img.selected')?.src || '';

            const data = await apiRequest('new', {
                pos: selectionString,
                comment: parentId,
                text: text,
                page: mw.config.get('wgPageName'),
                image: image
            });

            return data.smartcomments || { success: '0', message: 'api-error' };
        } catch (err) {
            error.value = err;
            return { success: '0', message: 'api-error' };
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

            return data.smartcomments || { success: '0', message: 'api-error' };
        } catch (err) {
            error.value = err;
            return { success: '0', message: 'api-error' };
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

            return data.smartcomments || { success: '0', message: 'api-error' };
        } catch (err) {
            error.value = err;
            return { success: '0', message: 'api-error' };
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