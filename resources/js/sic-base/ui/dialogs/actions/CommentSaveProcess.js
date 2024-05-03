var SmartComments = SmartComments || {};
SmartComments.Dialogs = SmartComments.Dialogs || {};
SmartComments.Dialogs.Actions = SmartComments.Dialogs.Actions || {};

SmartComments.Dialogs.Actions.CommentSaveProcess = {
    minCommentLength: 1,
    /**
     * Handles the cancel event
     *
     * @param dialog
     */
    doCancel: function( dialog ) {
        SmartComments.Dialogs.destruct( dialog );
    },

    /**
     * Handles the save event
     *
     * @param dialog
     * @param commentText
     * @return OO.ui.Process
     */
    doSave: function( dialog, commentText ) {
        var self = this;
        return new OO.ui.Process( function() {
            if ( commentText.length < self.minCommentLength ) {
                return typeof dialog === "undefined"
                    ? mw.msg( 'sic-error-empty' )
                    : new OO.ui.Error( mw.msg( 'sic-error-empty' ) );
            } else {
                var result = SmartComments.Api.Comments.save( commentText );

                // Succesfully saved
                if ( result.success == "1" || result.success === true ) {

                    // Since the dialog mode has not been set, we can assume that we're currently
                    // saving comments in the inline reply mode. In this case, the CommentGroupDialog
                    // will do the rest of the work.
                    if ( typeof dialog !== "undefined" ) {
                        dialog.close();

                        SmartComments.notifications.success(
                            mw.msg( 'sic-added-comment' ),
                            mw.msg( 'sic-added-comment-refreshing' )
                        );

                        setTimeout( function() {
                            var parser = new URL( window.location );
                            parser.searchParams.set( 'action', 'screfresh' );
                            window.location = parser.href;
                        }, 2000 );
                    }

                    if ( typeof dialog === "undefined" ) {
                        return true;
                    }

                // Error thrown with a message
                } else if ( typeof result.message !== 'undefined' ) {

                    return typeof dialog === "undefined"
                        ? result.message
                        : new OO.ui.Error( result.message );

                // Unknown error without a message
                } else {
                    return typeof dialog === "undefined"
                        ? 'Unknown error'
                        : new OO.ui.Error( "Undefined error happened" );
                }
            }
        } );
    }
}