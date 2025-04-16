var SmartComments = SmartComments || {};
var highlighter = SmartComments.Highlighting = SmartComments.Highlighting || {};

SmartComments.Highlighting.Types.FindSelectionIndex = {
	comment: undefined,

	/**
	 * Initializes the FindSelectionIndex highlighting type
	 *
	 * @param comment
	 *
	 * @returns {*}
	 */
	init: function ( comment ) {
		this.comment = comment;
		return this;
	},

	/**
	 * Checks if the comment position is a valid Type
	 *
	 * @returns {boolean}
	 */
	isCorrectType: function () {
		return /<[^>]*>/.test( this.comment.pos.replace( /&lt;/g, '<' ).replace( /&gt;/g, '>' ) ) && this.comment.pos.indexOf( '|' ) !== -1;
	},

	/**
	 * Highlights the comment
	 *
	 * @return {*}
	 */
	highlight: function () {
		var lastPipePos = this.comment.pos.lastIndexOf( '|' ),
			text = this.comment.pos.substring(0, lastPipePos),
			index = parseInt( this.comment.pos.substring( lastPipePos + 1 ), 10 ),
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
		word = word.replace( /(<([^>]+)>)/gi, "" );

		while( range.findText( word, options ) ) {
			if ( i === index ) {
				this.highlightRange( range, this.comment );
				return this.comment;
			}
			range.collapse( false );
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

		// Create a new span element with the desired class
		var span = document.createElement('span');
		span.className = commentClassName;
		span.setAttribute('data-comment-id', comment.data_id );

		// Extract the contents of the range and append them to the span
		try {
			span.appendChild( range.extractContents() );
		} catch ( error ) {
			console.error( 'Error extracting contents:', error );
			return;
		}

		// Insert the span in place of the original range
		range.insertNode( span );

		// Clear the selection ranges
		var sel = rangy.getSelection();
		sel.removeAllRanges();

		// Add data attributes to the new span if needed
		if ( comment ) {
			SmartComments.Highlighting.addDataAttributesToElement(
				$( span ),
				comment
			);
		}
	}

};
highlighter.Types.Register( highlighter.Types.Enums.MAIN, SmartComments.Highlighting.Types.FindSelectionIndex );
