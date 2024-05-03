var SmartComments = SmartComments || {};
SmartComments.Api = SmartComments.Api || {};
SmartComments.Api.Comments = {

    mwApi: new mw.Api(),

    /**
     * Creates a new comment
     *
     * @param text
     * @returns {*}
     */
    save: function( text ) {
        if ( mw.config.get( 'wgCanonicalSpecialPageName' ) != 'SmartComments' && ! this.isValid() ) {
            return {
                success: '0',
                message: 'selection-error'
            };
        }

        var posString = typeof SmartComments.Selection.selection === "string"
                ? SmartComments.Selection.selection
                : SmartComments.Selection.selection.text + "|" + SmartComments.Selection.selection.index,

        result = JSON.parse(
            $.ajax( {
                type: 'POST',
                url: mw.util.wikiScript( 'api' ) + '?action=smartcomments&method=new&format=json',
                data: {
                    pos: posString,
                    comment: typeof SmartComments.Selection.parent !== 'undefined' ? SmartComments.Selection.parent : '',
                    text: text,
                    page: mw.config.get( 'wgPageName' ),
                    image: SmartComments.Selection.image
                },
                async: false
            } ).responseText
        );

        return typeof result.smartcomments === 'undefined' ? { success:'0', message: 'api-error' } : result.smartcomments;
    },

    /**
     * Returns a list of comments for the given comment id
     *
     * @param commentid
     * @param group
     * @param callback
     *
     * @return void
     */
    get: function(commentid, group, callback) {
        this.mwApi.get( {
            action: 'smartcomments',
            method: 'get',
            comment: commentid
        }) .done( function( data ) {
            var result = (typeof data.smartcomments !== 'undefined' && typeof data.smartcomments.comment !== 'undefined')
                ? data.smartcomments.comment
                : null;
            callback(group, result);
        });
    },

    /**
     * Returns a list of comments for the current page
     *
     * @param status
     * @param callback
     *
     * @return void
     */
    list: function(status, callback) {
        this.mwApi.get( {
            action: 'smartcomments',
            method: 'lista',
            page: mw.config.get( 'wgPageName' ),
            //rev: mw.config.get( 'wgCurRevisionId' ),
            status: status
        }) .done( function( data ) {
            var result = typeof data.smartcomments !== 'undefined' && typeof data.smartcomments.anchors !== 'undefined'
                ? data.smartcomments.anchors
                : [];
            callback(result);
        });
    },

    /**
     * Checks if we can actually save a comment
     *
     * @returns {boolean}
     */
    isValid: function() {
        return SmartComments.Selection.enabled || typeof SmartComments.Selection.selection === 'undefined';
    },

    /**
     * Updates the given comment id
     *
     * @param commentid
     * @param status
     * @param text
     * @param page
     *
     * @returns {{success: string, message: string}|*}
     */
    update: function(commentid, status, text, page) {
        if ( typeof page === 'undefined') {
            page = mw.config.get( 'wgPageName' );
        }
        var result = JSON.parse(
            $.ajax( {
                type: 'POST',
                url: mw.util.wikiScript( 'api' ) + '?action=smartcomments&method=update&format=json',
                data: {
                    comment: commentid,
                    status: status,
                    text: text,
                    page: page
                },
                async:false
            } ).responseText
        );
        return ( typeof result.smartcomments === 'undefined' ) ? {success:'0',message:'api-error'} : result.smartcomments;
    },

    /**
     * Deletes the given comment id
     *
     * @param commentid
     * @param page
     *
     * @returns {{success: string, message: string}|*}
     */
    delete: function(commentid, page) {
        if ( typeof page === 'undefined') {
            page = mw.config.get( 'wgPageName' );
        }
        var result = JSON.parse(
            $.ajax( {
                type: 'POST',
                url: mw.util.wikiScript( 'api' ) + '?action=smartcomments&method=delete&format=json',
                data: {
                    comment: commentid,
                    page: page
                },
                async:false
            } ).responseText
        );
        return ( typeof result.smartcomments === 'undefined' ) ? {success:'0',message:'api-error'} : result.smartcomments;
    },

    /**
     * Returns whether the wiki is in blocked mode (does not allow new comments)
     * @param callback
     *
     * @return void
     */
    inBlockedMode: function(callback) {
        this.mwApi.get( {
            action: 'smartcomments',
            method: 'blockedmode'
        }).done( function( data ) {
            var result = (typeof data.smartcomments !== 'undefined' && typeof data.smartcomments.message !== 'undefined')
                ? data.smartcomments.message
                : null;
            callback(result == 'true');
        });
    }

};