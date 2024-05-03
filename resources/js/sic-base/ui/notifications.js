SmartComments.notifications = {

	/**
	 * Shows an error message
	 *
	 * @param title
	 * @param message
	 */
	error: function(title, message) {
		this.echo("error", title, message);
	},

	/**
	 * Shows a success message
	 *
	 * @param title
	 * @param message
	 */
	success: function(title, message) {
		this.echo("success", title, message);
	},

	/**
	 * Shows an info message
	 *
	 * @param title
	 * @param message
	 */
	info: function(title, message) {
		this.echo(null, title, message);
	},

	/**
	 * Runs an actual notification based on the given type
	 *
	 * @param type
	 * @param title
	 * @param text
	 */
	echo: function(type, title, text) {
		VanillaToasts.create({
			title: title,
			text: text,
			type: type,
			timeout: mw.config.get("wgSmartComments").popupTimeout
		});
	}
}
