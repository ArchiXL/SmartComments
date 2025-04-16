var SmartComments = SmartComments || {};
var highlighter = SmartComments.Highlighting = SmartComments.Highlighting || {};

SmartComments.Highlighting.Types.WordIndex = {
    comment: undefined,
    highlighter: rangy.createHighlighter(),

    /**
     * Initializes the WordIndex highlighting type
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
     * Checks if the comment position is a valid WordIndex Type
     *
     * @returns {boolean}
     */
    isCorrectType: function( ) {
        return ! /<[^>]*>/.test( this.comment.pos.replace( /&lt;/g, '<' ).replace( /&gt;/g, '>' ) ) && this.comment.pos.indexOf( '|' ) !== -1;
    },

    /**
     * Highlights the comment
     *
     * @return {*}
     */
    highlight: function() {
        var lastPipePos = this.comment.pos.lastIndexOf( '|' ),
            text = this.comment.pos.substring(0, lastPipePos),
            index = parseInt(this.comment.pos.substring(lastPipePos + 1), 10),
            word = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
            baseEl = SmartComments.getNodeRoot(),
            range = rangy.createRange(),
            searchScopeRange = rangy.createRange(),
            i = 0;

        if ( index === -1 ) {
            return false;
        }

        range.selectNodeContents( baseEl );
        searchScopeRange.selectNodeContents( baseEl );

        var options = {
            caseSensitive: true,
            withinRange: searchScopeRange
        };

        while( range.findText( word, options ) ) {
            if ( i === index ) {
                this.highlightRange( range, this.comment );
                return this.comment;
            }
            range.collapse(false);
            ++i;
        }
        return false;
    },

    /**
     * Highlights a range
     *
     * @param range
     * @param comment
     * @return void
     */
    highlightRange: function( range, comment, commentClassName ) {
        commentClassName = typeof commentClassName === "undefined" ? 'smartcomment-hl-' + comment.data_id : commentClassName;
        var sel = rangy.getSelection();
        sel.setSingleRange( range );

        // Create a new class applier
        this.highlighter.addClassApplier( rangy.createClassApplier( commentClassName, {
            ignoreWhiteSpace: true
        } ) );

        this.highlighter.highlightSelection( commentClassName, {
            selection: sel
        } );

        sel.removeAllRanges();

        if ( comment ) {
            SmartComments.Highlighting.addDataAttributesToElement( 
                $( '.smartcomment-hl-' + comment.data_id ), 
                comment 
            );
        }
    }

};

highlighter.Types.Register( highlighter.Types.Enums.MAIN, SmartComments.Highlighting.Types.WordIndex );