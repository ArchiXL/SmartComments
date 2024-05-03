var SmartComments = SmartComments || {};
SmartComments.Buttons = SmartComments.Buttons || {};

SmartComments.Buttons.AddComment = {

    /**
     * Binds events for this button
     *
     * @return void
     */
    bindEvents: function() {

        $( document ).on( 'click', '#sc-add-comment', function( e ) {
        	SmartComments.Selection.deselect( false );
        	SmartComments.Dialogs.NewCommentDialog.open();
        	SmartComments.popup.close();
        	e.preventDefault();
        } );

    }

};
