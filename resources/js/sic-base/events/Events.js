var SmartComments = SmartComments || {};

SmartComments.Events = {
    enums: {
        SELECTION_ACTIVE: 'sc-selection-active',
        COMMENT_GROUP_OPEN: 'sc-comment-group-open',
        DEBUG_MODE: 'sc-debug-mode',
        OPEN_COMMENT_ID: 'sc-open-comment'
    },
    trigger: function( id, data ) {
        $( window ).trigger( id, data ?? {} );
    }
};