var SmartComments = SmartComments || {};
SmartComments.Buttons = SmartComments.Buttons || {};

SmartComments.Buttons.EnableCommenting = {

    /**
     * Binds events for this button
     *
     * @return void
     */
    bindEvents: function() {

        $( document ).on( 'click', '.sic-enable-commenting', function( e ) {

            $( '.sic-enable-commenting a' )
                .parent()
                .addClass( 'active selected' );

            $( '.sic-enable-commenting' )
                .removeClass( 'sic-enable-commenting' )
                .addClass( 'sic-disable-commenting' );

                $( this ).find( 'a' ).addClass( 'active' );

            SmartComments.enableCommentMode( e );

            e.preventDefault();

        } );

    }

};