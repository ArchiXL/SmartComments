$( document ).ready( function() {

    $( '.sic-enable-commenting' ).trigger( 'click' );

    $( "span.sic-sp-admin-buttons > button, td.action-confirm a" ).click( buttonConfirm );

    $(document).on('change', '.sic-filter-dd', function () {
        doFilter(0);
    });

    var maxItems = mw.config.get( 'wgSmartComments').maxCommentsShownOnSpecial;

    $(document).on('click', "#sic-sp-showprevious", function () {
        doFilter(-maxItems);
    });

    $(document).on('click', "#sic-sp-shownext", function () {
        doFilter(maxItems);
    });

    $(document).on('click', ".specialOpenCommentButton", function ( e ) {
        var focusId = e.currentTarget.id;

        $( window ).trigger({
            type: 'sc-open-comment',
            pass: focusId.substring( 12 )
        });
    });

    $( document ).on( 'click', '.sc-tab', ( e ) => {
        let tab =  $( e.target );
        if ( tab.hasClass( 'active' ) ) {
           return;
        }
        $( '.sc-tab.active' ).removeClass( 'active' );
        tab.addClass( 'active' );
        $( '.sc-tab-body' ).addClass( 'sc-hide' );
        $( '#' + tab.attr( 'tab-reference' ) ).removeClass( 'sc-hide' );
    } );

});

function buttonConfirm(e) {
    const response = confirm( mw.msg( "sic-sp-adminbutton-confirm" ) );

    if ( !response ) {
        e.preventDefault();
    }
}

function doFilter(increment) {
    var commentStatus = $("#sic-sp-flt-status").val() === 'other' ? null : $("#sic-sp-flt-status").val();
    var	commentPage = $("#sic-sp-flt-page").val() === 'other' ? null : $("#sic-sp-flt-page").val();
    var commentAuthor = $("#sic-sp-flt-author").val() === 'other' ? null : $("#sic-sp-flt-author").val();

    var urlParams = new URLSearchParams( window.location.search );
    var offset = Number( urlParams.get('offset') ) + increment;

    var params = {};

    if ( offset !== 0 ) {
        params[ 'offset' ] = offset;
    }

    if ( commentStatus ) {
        params[ 'status' ] = commentStatus;
    }

    if ( commentAuthor ) {
        params[ 'author' ] = commentAuthor;
    }

    if ( commentPage ) {
        params[ 'page' ] = commentPage;
    }

    var scSpecial = new mw.Title( 'SmartComments', -1 );
    var redirectUrl = mw.config.get( 'wgServer' ) + scSpecial.getUrl( params );
    location.assign( redirectUrl );
}