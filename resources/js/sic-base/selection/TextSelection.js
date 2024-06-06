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

            /**
             * Ensure that the start and end containers of the range are within the same parent node.
             * If not, adjust the range accordingly to avoid errors.
             */
            if ( ! range.endContainer.parentNode.isSameNode( range.startContainer.parentNode ) && ! range.endContainer.parentNode.contains( range.startContainer.parentNode ) ) {
                range.setEnd( range.endContainer, range.endContainer.length );
            }
            if ( ! range.startContainer.parentNode.contains( range.endContainer.parentNode ) ) {
                range.setStart( range.startContainer, 0 );
            }

            SmartComments.Selection.preSelection( range );

            this.getTextAndIndexAsync( range ).then( result => {
                SmartComments.Selection.postSelection( result );
                self.active = false;
            }).catch( (e) => {
                self.active = false;
                console.log("Exception caught", e);
            });
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
                searchFor = selectionRange.toString(),
                searchForHtml = selectionRange.toHtml(),
                range = rangy.createRange(),
                searchScopeRange = rangy.createRange(),
                i = 0;
            const asyncSearchHtml = () => {
                let content = document.querySelectorAll( "#mw-content-text > .mw-parser-output" )[0],
                    currentNode,
                    currentText = searchForHtml,
                    iterator = document.createNodeIterator( content, NodeFilter.SHOW_TEXT ),
                    found = -1;
                while( ( currentNode = iterator.nextNode() ) ) {
                    for( let i = 0; i < currentNode.data.length; i++ ) {
                        if ( currentNode.data[ i ] === currentText[ 0 ] ) {
                            currentText = currentText.substring( 1 );
                            if ( currentText.length === 0 ) {
                                found++;
                                if ( currentNode.parentNode.contains( selectionRange.endContainer ) ) {
                                    res.index = found;
                                    resolve(res);
                                    return;
                                }
                            }
                        } else {
                            currentText = selectionRange.toString();
                        }
                    }
                }
                SmartComments.notifications.error(
                    mw.msg( 'sic-selection-error-title' )
                );
            };


            const asyncSearch = () => {
                if ( range.findText(searchFor, options ) ) {
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

            var res = {
                index: i,
            };

            // if string contains html use different method
            if ( /<[^>]*>/.test( searchForHtml ) ) {
                res.text = searchForHtml;
                asyncSearchHtml();
            } else {
                searchScopeRange.selectNodeContents(baseEl);

                res.text = searchFor;
                var options = {
                    caseSensitive: true,
                    withinRange: searchScopeRange
                };

                asyncSearch();
            }
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
