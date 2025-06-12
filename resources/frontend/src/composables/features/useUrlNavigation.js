/**
 * Composable for managing URL navigation and parameters
 */
function useUrlNavigation( commentsStore ) {
	/**
	 * Setup URL navigation handlers
	 */
	const setupUrlNavigation = ( isEnabled ) => {
		// Handle URL changes (back/forward navigation)
		const handlePopState = async () => {
			if ( isEnabled() ) {
				await commentsStore.checkAndOpenCommentFromUrl();
			}
		};

		window.addEventListener( "popstate", handlePopState );

		return () => {
			window.removeEventListener( "popstate", handlePopState );
		};
	};

	/**
	 * Check URL parameters and open comment (for debugging)
	 */
	const checkUrlParameters = async ( isEnabled ) => {
		if ( !isEnabled() ) {
			console.warn(
				"useUrlNavigation: Cannot check URL parameters, system is disabled.",
			);
			return;
		}
		await commentsStore.checkAndOpenCommentFromUrl();
	};

	return {
		setupUrlNavigation,
		checkUrlParameters,
	};
}

export default useUrlNavigation;
