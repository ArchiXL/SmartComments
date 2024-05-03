var SmartComments = SmartComments || {};
SmartComments.Dialogs = SmartComments.Dialogs || {};

SmartComments.Dialogs.NewCommentDialog = {
    /**
     * Opens the dialog
     *
     * @return void
     */
    open: function() {
        function commentDialog( config ) {
            commentDialog.super.call( this, config );
        }

        OO.inheritClass( commentDialog, OO.ui.ProcessDialog );

        // Set dialog settings
        commentDialog.static.name = 'newComment';
        commentDialog.static.title = mw.msg( 'sic-title-new' );
        commentDialog.static.actions = [
            {
                label: mw.msg( 'sic-button-save' ),
                action: 'save',
                flags: [ 'primary', 'progressive' ]
            },
            {
                flags: 'safe',
                action: 'cancel',
                label: mw.msg( 'sic-button-cancel' )
            }
        ];

        // Set panel height
        commentDialog.prototype.getBodyHeight = function() {
            return 235;
        };

        /**
         * Dialog initializer
         *
         * @return void
         */
        commentDialog.prototype.initialize = function () {
            commentDialog.super.prototype.initialize.call( this );
            this.panel = new OO.ui.PanelLayout( {
                padded: true,
                expanded: false
            } );
            this.content = new OO.ui.FieldsetLayout();
            this.commentInput = new OO.ui.MultilineTextInputWidget( {
                value: '',
                autosize: true,
                maxRows: 8
            } );

            this.field = new OO.ui.FieldLayout( this.commentInput, {
                label: mw.msg('sic-input-newcomment'),
                align: 'top'
            } );

            this.content.addItems( [ this.field ] );
            this.panel.$element.prepend( $( '<img class="sic-selected-content" src="' + SmartComments.Selection.image + '" />'));
            this.panel.$element.append( this.content.$element );
            this.$body.append( this.panel.$element );

            // Input validation
            this.commentInput.connect( this, { 'change': 'onCommentInputChange' } );
        };

        /**
         * Verifies the user input upon input changes
         *
         * @param value
         */
        commentDialog.prototype.onCommentInputChange = function ( value ) {
            this.actions.setAbilities( {
                save: value.length > 0 && value.length
            } );
        };

        /**
         * The actual validation process
         *
         * @param action
         * @returns {*}
         */
        commentDialog.prototype.getActionProcess = function ( action ) {
            if ( action === 'cancel' ) {
                SmartComments.Dialogs.Actions.CommentSaveProcess.doCancel( this );
            } else if ( action === 'save' ) {
                return SmartComments.Dialogs.Actions.CommentSaveProcess.doSave( this, this.commentInput.getValue() );
            }
            return commentDialog.super.prototype.getActionProcess.call( this, action );
        };

        /**
         * Tear down the dialog
         *
         * @param data
         * @returns {*}
         */
        commentDialog.prototype.getTeardownProcess = function ( data ) {
            return commentDialog.super.prototype.getTeardownProcess.call( this, data ).first( function () {
                $('#sc-wm').remove();
            }, this );
        };

        // Create and append a window manager.
        var windowManager = new OO.ui.WindowManager({
            id: 'sc-wm'
        });
        $( document.body ).append( windowManager.$element );

        var myDialog = new commentDialog();

        windowManager.addWindows( [ myDialog ] );
        windowManager.openWindow( myDialog );
    }
};