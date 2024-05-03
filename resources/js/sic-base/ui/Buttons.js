var SmartComments = SmartComments || {};
SmartComments.Buttons = {

    /**
     * Binds events to the buttons
     *
     * @return void
     */
    bindEvents: function() {
        SmartComments.Buttons.AddComment.bindEvents();
        SmartComments.Buttons.EnableCommenting.bindEvents();
        SmartComments.Buttons.DisableCommenting.bindEvents();
        SmartComments.Buttons.CommentLinks.bindEvents();
    }
}