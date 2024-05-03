var SmartComments = SmartComments || {};
var highlighter = SmartComments.Highlighting = SmartComments.Highlighting || {};

highlighter.Types.Register( highlighter.Types.Enums.MAIN, {
    comment: undefined,

    /**
     * Initializes the JQuery highlighting type
     *
     * @param comment
     *
     * @returns {*}
     */
    init: function( comment ) {
        this.comment = comment;
        return this;
    },

    /**
     * Checks if the comment position is a valid JQuery Type
     *
     * @returns {boolean}
     */
    isCorrectType: function( ) {
        return this.comment.pos.indexOf( '[') !== -1 && this.comment.pos.indexOf(']') !== -1;
    },

    /**
     * Highlights the comment
     *
     * @return {*}
     */
    highlight: function() {
        this.comment.pos = SmartComments.helperFunctions.decodeHTML( this.comment.pos );

        var element = undefined,
            isImage = false;
        if ( this.comment.pos.indexOf( 'img' ) !== -1 ) {
            element = this.determineImageLocation( this.comment.pos );
            isImage = true;
        } else {
            element = $( this.comment.pos );
        }

        if ( this.comment && element ) {
            if (isImage) {
                element.parent().addClass( 'smartcomment-hl-' + this.comment.data_id );
            } else {
                element.addClass( 'smartcomment-hl-' + this.comment.data_id );
            }
            SmartComments.Highlighting.addDataAttributesToElement( 
                $( '.smartcomment-hl-' + this.comment.data_id ), 
                this.comment 
            );
        }

        return this.comment;
    },

    /**
     * Determines the actual element based on the given hash
     *
     * @param hash
     * @returns {null}
     */
    determineImageLocation(hash) {
        hash = hash.replace( 'img[', '' ).replace( ']', '' );
        var element = null;
        // The image hashes are based on their source, width, and hash.
        SmartComments.bodyContainer.find( 'img' ).each( function() {
            var imageHash = SmartComments.Selection.ImageSelection.getHash( $( this ) );
            if ( hash === imageHash ) {
                element = $( this );
            }
        } );
        return element;
    }

} );