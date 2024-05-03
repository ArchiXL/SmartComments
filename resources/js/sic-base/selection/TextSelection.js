var SmartComments = SmartComments || {};
SmartComments.Selection = SmartComments.Selection || {};

SmartComments.Selection.TextSelection = {
    active: false,
    /**
     * Runs the select event
     *
     * @param event Event
     * @return void
     */
    select: function( event ) {
        if ( this.active ) {
            return;
        }

        this.active = true;
        var selection = rangy.getSelection( SmartComments.getNodeRoot() ),
            self = this;

        if ( SmartComments.Selection.validateSelection( selection ) === SmartComments.Selection.enums.SELECTION_VALID ) {
            var range = selection.getRangeAt( 0 );

            SmartComments.Selection.preSelection( range );

            this.getTextAndIndexAsync( range ).then( result => {
                SmartComments.Selection.postSelection( result );
                self.active = false;
            }).catch( (e) => {
                self.active = false;
                console.log("Exception caught", e);
            })
        } else {
            // The selection was not valid. Reset the selection, and allow the user to make a new selection
            self.active = false;
        }
    },

    /**
     * Gets the text and index of the selection within the node root.
     *
     * @param selection
     * @returns {{index: number, text: string}}
     */
    getTextAndIndex: function( selection ) {
        var baseEl = SmartComments.getNodeRoot(),
            selectionPos = rangy.serializeSelection( selection ),
            searchFor = selection.toString(),
            range = rangy.createRange(),
            searchScopeRange = rangy.createRange(),
            i = 0;

        range.selectNodeContents( baseEl );
        searchScopeRange.selectNodeContents( baseEl );

        var options = {
                caseSensitive: true,
                withinRange: searchScopeRange
            },
            res = {
                text: searchFor,
                index: i,
                range: selectionPos
            }

        if ( searchFor !== "" ) {
            while( range.findText( searchFor, options ) ) {
                if ( rangy.serializeRange( range ) === selectionPos ) {
                    res.index = i;
                    res.range = range;
                    SmartComments.Selection.lastRange = range;
                    SmartComments.Highlighting.Types.WordIndex.highlightRange(
                        range,
                        null,
                        SmartComments.Highlighting.enums.HIGHLIGHT_CLASS
                    );
                }
                range.collapse(false);
                ++i;
            }
        }

        return res;
    },

    /**
     * Returns the text and index asynchronously
     *
     * @param selectionRange
     * @returns {Promise|jQuery.Promise}
     */
    getTextAndIndexAsync: function( selectionRange ) {
        return new Promise((resolve, reject) => {
            var baseEl = SmartComments.getNodeRoot(),
                selectionPos = rangy.serializeRange( selectionRange ),
                searchFor = selectionRange.toHtml(),
                range = rangy.createRange(),
                searchScopeRange = rangy.createRange(),
                i = 0;

            searchScopeRange.selectNodeContents(baseEl);

            var options = {
                    caseSensitive: true,
                    withinRange: searchScopeRange
                },
                res = {
                    text: searchFor,
                    index: i,
                };

            const asyncSearch = () => {
                if (range.findText(searchFor, options)) {
                    if (rangy.serializeRange(range) === selectionPos) {
                        res.index = i;
                    }
                    range.collapse(false);
                    ++i;
                    requestAnimationFrame( asyncSearch );
                } else {
                    // Resolve the Promise when search is complete
                    resolve(res);
                }
            };

            asyncSearch();
        });
    },


    /**
     * Bind events for this selection type
     * @return void
     */
    bindEvents: function() {
        var self = this;

        // Record selection changes
        $( document ).mouseup( function( event ) {
            if ( SmartComments.Selection.enabled ) {
                // When clicking on a highlighted area, the value stays highlighted until after the mouseup event,
                // and would therefore still be captured by getSelection. This micro-timeout solves the issue.
                setTimeout(function () {
                    if ( ! rangy.getSelection().isCollapsed && ! SmartComments.Panels.CommentGroup.active ) {
                        self.select( event );
                    }
                }, 1 );
            }
        } );

        $( document ).mousedown( function( event ) {
            if ( SmartComments.Selection.enabled ) {
                SmartComments.Selection.startPos = { x: event.pageX, y: event.pageY };
            }
        } );
    }

};
