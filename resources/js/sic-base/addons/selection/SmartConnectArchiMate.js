var SmartComments = SmartComments || {};
SmartComments.Selection = SmartComments.Selection || {};

SmartComments.Selection.SmartConnectArchiMate = {

    originalState: undefined,

    /**
     * Runs the select event
     *
     * @return void
     */
    select: function( event, target ) {
        if ( target.attr( 'class' ).indexOf( 'smartcomment-hl' ) !== -1 || SmartComments.enabled !== true ) {
            return;
        }
        target.select();
        var viewNodeId = target.find( 'metadata' ).html().match(/(archimedes:viewnodeid="(.*)\") /gm)[0].split('"')[1];
        SmartComments.Selection.executeSelectionAction( "addon^SmartConnectArchiMate%" + viewNodeId );
        event.preventDefault();
    },

    /**
     * Bind events for this selection type
     *
     * @return void
     */
    bindEvents: function() {
        $( document ).find( '.archimate-viewdiagram > svg > a' ).each( function() {
            $( this ).on( 'mouseover', SmartComments.Selection.SmartConnectArchiMate.hoverElement );
            $( this ).on( 'mouseout', SmartComments.Selection.SmartConnectArchiMate.hoverOutElement );
            $( this ).on( 'click', function( e ) {
                SmartComments.Selection.SmartConnectArchiMate.select( e, $( this ) );
            } );
        } );
    },

    /**
     * Hover element handler
     *
     * @return void
     */
    hoverElement: function() {
        if ( SmartComments.enabled !== true ) {
            return;
        }
        this.originalState = $( this ).find( 'rect' ).attr( 'style' );
        $( this ).find( 'rect:not(.sic-scam-text-bg)' ).css( { 'fill': '#ffffe0' } );
        $( this ).addClass( 'sic-highlighted-item' );
        $( this ).find( 'text, image, tspan' ).css( { 'pointer-events': 'none' } );
    },

    /**
     * Hover out element handler
     *
     * @return void
     */
    hoverOutElement: function( ) {
        if ( SmartComments.enabled !== true ) {
            return;
        }
        $( this ).find( 'rect:not(.sic-scam-text-bg)' ).attr( 'style', this.originalState );
        $( this ).removeClass( 'sic-highlighted-item' );
        $( this ).find( 'text, image, tspan' ).css( { 'pointer-events': 'auto' } );
    }

};

// This addon can only be used if viewdiagrams are found on the page
if ( $('.archimate-viewdiagram').length !== 0 ) {
    SmartComments.Selection.registerAddon( 'SmartConnectArchiMate', SmartComments.Selection.SmartConnectArchiMate );
}
