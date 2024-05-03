var SmartComments = SmartComments || {};
SmartComments.Buttons = SmartComments.Buttons || {};

SmartComments.Buttons.DisableCommenting = {

    /**
     * Binds events for this button
     *
     * @return void
     */
    bindEvents: function() {

        $( document ).on( 'click', '.sic-disable-commenting', function( e ) {
            $( '.sic-disable-commenting a' )
                .parent()
                .removeClass( 'active selected' );

            $( '.sic-disable-commenting' )
                .removeClass( 'sic-disable-commenting' )
                .addClass( 'sic-enable-commenting' );

            $( this ).find( 'a' ).removeClass( 'active' );

            SmartComments.disableCommentMode();

            e.preventDefault();

        } );

    }
};