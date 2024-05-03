SmartComments.popup = {

	popupString: undefined,
	widget: undefined,

	/**
	 * Close event
	 */
	close: function( visible ) {
		if ( !visible ) {
			SmartComments.Selection.deselect( false );
			$('#sic-popup').remove();
		}
	},

	/**
	 * Open popup
	 */
	open: function( ) {
		this.widget.toggle( true );
	},

	/**
	 * Creates the actual popup
	 * @param x
	 * @param y
	 * @param linkElement
	 * @returns {popup}
	 */
	create: function( x, y, linkElement ) {
		var self = this;

		// Remove previous popup
		if ( typeof this.widget !== "undefined" ) {
			$('#sic-popup').remove();
		}

		// A PopupWidget.
		this.widget = new OO.ui.PopupWidget( {
			$content: $( '<p>'+ this.buttons( linkElement ) +'</p>' ),
			padded: true,
			anchor: false,
			autoClose: true,
			width: 'auto',
			id: 'sic-popup'
		} );

		this.widget.on( 'toggle', this.close );

		// Append widget to the HTML
		$( document.body ).append( this.widget.$element );

		// $( document ).on( 'click', '#sc-add-comment', function( e ) {
		// 	SmartComments.Selection.deselect( false );
		// 	SmartComments.Dialogs.NewCommentDialog.open();
		// 	self.close();
		// 	e.preventDefault();
		// });

		// And finally, change position of the popup. We do this with a small
		// timeout make sure the popup is always 100% positioned correctly.
		//
		// We had some issues in the past when not using the timeout but
		// calling it directly on the object. Thus this is somewhat of a hack..
		setTimeout(function() {
			$('#sic-popup').css({ top: y, left: x });
		}, 10);

		return this;
	},

	/**
	 * Returns the buttonset
	 * @returns {string}
	 */
	buttons: function( linkElement ) {

		var newCommentButton = new OO.ui.ButtonWidget( {
			label: mw.msg('sic-button-new-comment'),
			id: 'sc-add-comment',
			icon: 'ongoingConversation'
		} );

		var linkButton = new OO.ui.ButtonWidget( {
			label: mw.msg( 'sic-button-goto-link' ),
			id: 'sc-goto-link',
			icon: 'link'
		} );

		var button2 =  ( typeof linkElement !== 'undefined' )
			? linkButton
			: false;

		var buttonGroup = new OO.ui.ButtonGroupWidget( {
			items: ( button2 ) ? [ newCommentButton, button2 ] : [ newCommentButton ]
		} );

		return buttonGroup.$element.html();

	}

};
