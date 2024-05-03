var SmartComments = SmartComments || {};
SmartComments.Selection = SmartComments.Selection || {};

SmartComments.Selection.DynamicBlockSelection = {
    viewActive: false,

    /**
     * Runs the select event
     *
     * @param element jQuery.fn.init
     * @return void
     */
    select: function( element ) {
        // Block is already commented - do nothing and let the comment group dialog
        // take it over from here.
        if ( element.parent().attr( 'class' ).indexOf( 'smartcomment-hl-' ) !== -1 ) {
            return;
        }

        this.viewActive = true;

        SmartComments.Selection.executeSelectionAction( element.data( 'hash' ) );
    },

    /**
     * Deselects the current selection
     *
     * @return void
     */
    deselect: function() {
        $( 'div.sc-dynamic-block' ).removeClass( 'hover' );
        this.viewActive = false;
    },

    /**
     * Bind events for this selection type
     *
     * @return void
     */
    bindEvents: function() {
        var self = this;

        $( document ).on('click', 'div.sc-dynamic-block', function( e ) {
            if ( SmartComments.Selection.enabled ) {
                self.select( $( this ) );
                e.preventDefault();
            }
        });

        $( document ).on( 'mouseover', 'div.sc-dynamic-block', function() {
            if ( $( this ).parent().attr( 'class' ).indexOf( 'smartcomment-hl-' ) === -1 ) {
                $( this ).addClass('hover ');
            }
        } ).on( 'mouseout', 'div.sc-dynamic-block', function() {
            if ( !self.viewActive ) {
                $( this ).removeClass( 'hover' );
            }
        } );

    }

};
