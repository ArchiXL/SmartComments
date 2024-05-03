var SmartComments = SmartComments || {};
SmartComments.Dialogs = {

    /**
     * Destructs the dialog
     *
     * @param dialog
     * @return void
     */
    destruct: function( dialog ) {

        SmartComments.Selection.deselect();

        if ( typeof dialog !== 'undefined' ) {
            dialog.close();
        }

    }
}