$( window ).on( SmartComments.Events.enums.DEBUG_MODE, function(e) {
    console.log( "Auto enabling SmartComments due debug mode" );
    if ( e ) {
        SmartComments.enableCommentMode( e );
    } else {
        $( '.sic-enable-commenting' ).click();
    }
} );