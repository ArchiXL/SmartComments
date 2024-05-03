var SmartComments = SmartComments || {};
SmartComments.Selection = SmartComments.Selection || {};

SmartComments.Selection.ImageSelection = {

    /**
     * Runs the select event
     *
     * @return void
     */
    select: function() {
    },

    /**
     * Deselects the current selection
     *
     * @return void
     */
    deselect: function() {
    },

    /**
     * Bind events for this selection type
     *
     * @return void
     */
    bindEvents: function() {
        var instance = this;

        SmartComments.bodyContainer.find( 'img' ).each( function() {
            // Wrap this image around a sc-dynamic-block so the DynamicBlockSelection class will take over
            var wrapper = "<div class=\"sc-dynamic-block\" data-hash=\"##HASH##\" />",
                hash = instance.getHash( $( this ) );

            $( this ).wrap(
                $( wrapper.replace( '##HASH##', "img[" + hash + "]" ) )
            );
        } );

    },

    getHash(element) {
        return hex_md5(
            element.attr( 'src' ) + '|' + element.width() + '|' + element.height()
        );
    }

};
