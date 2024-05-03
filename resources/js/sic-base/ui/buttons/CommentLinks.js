var SmartComments = SmartComments || {};
SmartComments.Buttons = SmartComments.Buttons || {};

SmartComments.Buttons.CommentLinks = {

    /**
     * The OpenComment event handler
     *
     * @param commentId
     * @param refElement
     */
    openComment: function( commentId, refElement, isBroken ) {
        if ( SmartComments.enabled === true ) {
            if ( $('div.sc-group-main').length !== 0 ) {
                SmartComments.Panels.CommentGroup.close();
            }
            SmartComments.Panels.CommentGroup.open(
                commentId,
                '.smartcomment-hl-' + commentId,
                refElement,
                isBroken
            );
        }
    },

    /**
     * Binds events for this button
     *
     * @return void
     */
    bindEvents: function() {
        var self = this;
        $(document).on('click', '*[class*=smartcomment-hl-]', function( e ) {
            var $class = $( this ).attr( 'class' ),
                $id = SmartComments.helperFunctions.getIdFromClass( $class );
            self.openComment( $id, $( this ) );
            if ( SmartComments.enabled === true ) {
                e.preventDefault();
            }
        } );
    }

};