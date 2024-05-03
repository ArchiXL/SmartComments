var SmartComments = SmartComments || {};
SmartComments.Panels = SmartComments.Panels || {};
SmartComments.Panels.InlineReply = {
    /**
     * Creates the inline reply panel
     *
     * @param contentFrame
     * @returns {*}
     */
    create: function( contentFrame ) {
        // Create the actual panel layout
        this.panel = new OO.ui.PanelLayout( {
            padded: true,
            expanded: false,
            classes: [ 'smartcomment-reply' ]
        } );
        // Create the fieldsets
        this.content = new OO.ui.FieldsetLayout();

        // Create the input text field and the save button
        this.commentInput = new OO.ui.MultilineTextInputWidget( {
            value: '',
            maxRows: 5,
            autosize: true
        } );
        this.commentSaveButton = new OO.ui.ButtonWidget( {
            label: mw.msg( 'sic-button-new-reply' )
        } );

        var self = this;
        var wasSubmittedBefore = false;

        // Assign save button logic
        this.commentSaveButton.on( 'click', function() {

            // Only allow submitting once
            if ( wasSubmittedBefore ) {
                return false;
            }

            var commentText = self.commentInput.getValue(),
                wasSaved = SmartComments.Dialogs.Actions.CommentSaveProcess.doSave( undefined, commentText ).steps[0].callback();

            if ( wasSaved !== true ) {
                SmartComments.notifications.error( mw.msg( 'sic-error-title' ), wasSaved );
            } else {
                // Append the new comment to the list
                contentFrame.$element.append( new OO.ui.PanelLayout( {
                    expanded: false,
                    padded: true,
                    $content: SmartComments.Panels.CommentGroup.parseComment( {
                        author: mw.config.get( 'wgUserName' ),
                        datetime: mw.msg( 'sic-date-justnow' ),
                        text: commentText
                    }, true ),
                    classes: [ 'smartcomment-comment-reply' ]
                } ).$element );

                // Set empty value
                self.commentInput.setValue( "" );

                // Finally move the reply panel to the last element in the comment list
                $('div.smartcomment-panel div.smartcomment-commentgroup div.smartcomment-reply').appendTo( 'div.sc-plh' );

                // Don't let the user spam
                wasSubmittedBefore = true;

                // And remove the comment form
                $( '.smartcomment-reply' ).remove();
            }

        } );

        // Create the fields
        this.fieldComment = new OO.ui.FieldLayout( this.commentInput, {
            label: mw.msg( 'sic-input-commenttext' ),
            align: 'top'
        } );
        this.fieldSaveButton = new OO.ui.FieldLayout( this.commentSaveButton );

        this.content.addItems( [ this.fieldComment, this.fieldSaveButton ] );
        this.panel.$element.append( this.content.$element);

        return this.panel;
    }
}