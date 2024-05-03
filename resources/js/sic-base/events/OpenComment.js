$( window ).on( SmartComments.Events.enums.OPEN_COMMENT_ID, function( data ) {
    var queryString = window.location.search;
    var urlParams = new URLSearchParams( queryString );
    var commentId = urlParams.get('focusId');

    if ( mw.config.get( 'wgCanonicalSpecialPageName' ) === 'SmartComments' ) {
        var commentId = data.pass;
        if ( $('div.sc-group-main').length !== 0 ) {
            SmartComments.Panels.CommentGroup.close();
        }
        SmartComments.Panels.CommentGroup.open( commentId, null, null, true );
    } else if ( commentId ) {
        $( 'span[data-comment-id=\'' + commentId + '\']' ).click();
    }
} );