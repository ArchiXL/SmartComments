var SmartComments = SmartComments || {};
SmartComments.Highlighting = SmartComments.Highlighting || {};

// This addon can only be used if viewdiagrams are found on the page
if ( $('.archimate-viewdiagram').length !== 0 ) {

    SmartComments.Highlighting.Types.Register( SmartComments.Highlighting.Types.Enums.ADDON, {
        padding: 5,
        height: undefined,

        /**
         * Initializes the SmartConnectArchiMate highlighting type
         *
         * @param comment
         * @returns {SmartComments.Highlighting.SmartConnectArchiMate}
         */
        init: function( comment ) {
            this.comment = comment;
            return this;
        },

        /**
         * Checks if the comment position is a valid SmartConnectArchiMate Type
         *
         * @returns {boolean}
         */
        isCorrectType: function( ) {
            return this.comment.pos.indexOf( 'SmartConnectArchiMate' ) !== -1;
        },

        /**
         * Highlights the SmartConnectArchiMate element
         *
         * @return {*}|boolean
         */
        highlight: function() {
            var selector = $('*[archimedes\\:viewnodeid="' + this.comment.pos + '"]').parent().parent().parent();

            // If the element is not found, return the unmodified comment
            if ( selector.length === 0 ) {
                return this.comment;
            }
            this.addBackgroundOnTextElement( selector.find( 'text' ) );
            var position = selector.position();
            selector.addClass( 'smartcomment-hl-' + this.comment.data_id );

            this.comment.elementPos = {
                top: position.top + ( this.height + this.padding ),
                left: position.left
            };

            return this.comment;
        },

        /**
         * Adds a background element (rect) before the SVG text element
         *
         * @param selector
         *
         * @return void
         */
        addBackgroundOnTextElement: function( selector ) {
            var svgns = "http://www.w3.org/2000/svg",
                bounds = selector.get( 0 ).getBBox(),
                bg = document.createElementNS( svgns, 'rect' ),
                padding = this.padding;

            this.height = bounds.height + padding;

            bg.setAttribute( 'x', bounds.x - padding / 2 );
            bg.setAttribute( 'y', bounds.y - padding / 2 );
            bg.setAttribute( 'width', bounds.width + padding );
            bg.setAttribute( 'height', bounds.height + padding );
            bg.setAttribute( 'fill', '#ffffe0' );
            bg.setAttribute( 'class', 'sic-scam-text-bg' );
            bg.setAttribute( 'stroke', '#00000020' );
            bg.setAttribute( 'stroke-width', '1px' );
            bg.setAttribute( 'style', 'pointer-events:none;' );

            selector.get( 0 ).parentNode.insertBefore( bg, selector.get( 0 ) );
        },

        /**
         * Removes all added content by this addon
         *
         * @return void
         */
        destruct: function() {
            $( '.sic-scam-text-bg' ).remove();
        }

    } );
}
