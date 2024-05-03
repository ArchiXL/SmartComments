var SmartComments = SmartComments || {};

SmartComments.Highlighting = {
    highlighter: rangy.createHighlighter(),
    enums: {
        HIGHLIGHT_CLASS: 'sic-highlighted-item'
    },
    comments: [],
    anchors: [],
    Types: {
        Callers: {
            main: [],
            addon: []
        },
        Enums: {
            MAIN: 'main',
            ADDON: 'addon'
        },

        /**
         * Registers a new type
         *
         * @param type
         * @param handler
         * @param name (optional)
         * @constructor
         */
        Register: function( type, handler ) {
            this.Callers[ type ].push( handler );
        }

    },

    /**
     * Binds the highlighting events
     */
    bindEvents: function() {
        this.highlighter.addClassApplier( rangy.createClassApplier( this.enums.HIGHLIGHT_CLASS, {
            ignoreWhiteSpace: true
        } ) );
    },

    /**
     * Destructs the highlighting
     */
    destruct: function() {

        for ( var i = 0; i < this.Types.Callers[ this.Types.Enums.ADDON ].length; i++ ) {
            this.Types.Callers[ this.Types.Enums.ADDON ][ i ].destruct();
        }

        // Unwrap all the highlighted comments
        $.each( this.comments, function( k, comment ) {
            if ( comment ) {
                $( '*.smartcomment-hl-' + comment.data_id )
                    .removeClass( 'smartcomment-hl-' + comment.data_id )
                    .removeAttr( 'data-comment-id' );
            }
        } );

        SmartComments.Panels.CommentTimeline.destruct();
    },

    /**
     * Highlight all the given comments on the current page
     *
     * @param commentsOnPage
     */
    loadFromCommentsOnPage: function( commentsOnPage ) {
        this.comments = commentsOnPage;

        if ( SmartComments.Panels.CommentTimeline.isSkinSupported() ) {
            SmartComments.Panels.CommentTimeline.createBase();
        }

        for (var i = 0; i < commentsOnPage.length; i++) {
            var comment = this.highlightOnPage( commentsOnPage[ i ] );
            if ( SmartComments.Panels.CommentTimeline.isSkinSupported() ) {
                SmartComments.Panels.CommentTimeline.addToBase( commentsOnPage[ i ] );
            }
            this.anchors[ comment.data_id ] = comment;
        }
    },

    /**
     * Highlights the comment on the page
     *
     * @param comment
     */
    highlightOnPage: function( comment ) {
        // The main callers have to be checked first before running the addons
        for ( var i = 0; i < this.Types.Callers[ this.Types.Enums.MAIN ].length; i++ ) {
            var caller = this.Types.Callers[ this.Types.Enums.MAIN ][ i ].init( comment );
            if ( caller.isCorrectType() ) {
                return caller.highlight();
            }
        }

        for ( var i = 0; i < this.Types.Callers[ this.Types.Enums.ADDON ].length; i++ ) {
            var caller = this.Types.Callers[ this.Types.Enums.ADDON ][ i ].init( comment );
            if ( caller.isCorrectType() ) {
                // keep addon value
                comment.pos = comment.pos.split('%')[1];
                return caller.highlight();
            }
        }

        return false;
    },

    addDataAttributesToElement: function( element, comment ) {
        element.attr( 'data-comment-id', comment.data_id );
    }

};