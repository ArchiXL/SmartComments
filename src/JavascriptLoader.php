<?php

namespace MediaWiki\Extension\SmartComments;

class JavascriptLoader {

	public static $packageFilesMinified = [
		'/resources/js/SmartComments.min.js'
	];

	public static $packageFiles = [
		// External libs
		"resources/js/node_modules/rangy/lib/rangy-core.js",
		"resources/js/node_modules/rangy/lib/rangy-classapplier.js",
		"resources/js/node_modules/rangy/lib/rangy-highlighter.js",
		"resources/js/node_modules/rangy/lib/rangy-serializer.js",
		"resources/js/node_modules/rangy/lib/rangy-textrange.js",
		"resources/js/node_modules/rangy/lib/rangy-selectionsaverestore.js",
		"resources/js/node_modules/html2canvas/dist/html2canvas.js",
		"resources/js/ext/vanillatoasts/vanillatoasts.js",
		// Internal libs
		"resources/js/sic-base/utils/MD5.js",
		"resources/js/sic-base/Base.js",
		"resources/js/sic-base/events/Events.js",
		"resources/js/sic-base/events/SelectionEvent.js",
		"resources/js/sic-base/events/DebugMode.js",
		"resources/js/sic-base/events/OpenComment.js",
		"resources/js/sic-base/api/Comments.js",
		"resources/js/sic-base/ui/notifications.js",
		"resources/js/sic-base/ui/popup.js",
		"resources/js/sic-base/ui/Buttons.js",
		"resources/js/sic-base/ui/buttons/AddComment.js",
		"resources/js/sic-base/ui/buttons/EnableCommenting.js",
		"resources/js/sic-base/ui/buttons/DisableCommenting.js",
		"resources/js/sic-base/ui/buttons/CommentLinks.js",
		"resources/js/sic-base/ui/Dialogs.js",
		"resources/js/sic-base/ui/dialogs/actions/CommentSaveProcess.js",
		"resources/js/sic-base/ui/dialogs/NewCommentDialog.js",
		"resources/js/sic-base/ui/Panels.js",
		"resources/js/sic-base/ui/panels/CommentGroupPanel.js",
		"resources/js/sic-base/ui/panels/InlineReplyPanel.js",
		"resources/js/sic-base/ui/panels/CommentTimeline.js",
		"resources/js/sic-base/highlighting/Highlighting.js",
		"resources/js/sic-base/highlighting/Types/WordIndex.js",
		"resources/js/sic-base/highlighting/Types/JQuery.js",
		"resources/js/sic-base/highlighting/Types/FindSelectionIndex.js",
		"resources/js/sic-base/selection/Selection.js",
		"resources/js/sic-base/selection/TextSelection.js",
		"resources/js/sic-base/selection/DynamicBlockSelection.js",
		"resources/js/sic-base/selection/ImageSelection.js",
		"resources/js/sic-base/addons/selection/SmartConnectArchiMate.js",
		"resources/js/sic-base/addons/highlighting/SmartConnectArchiMate.js"
	];

	public static function register( $resourceLoader ) {
		$packageFiles = \RequestContext::getMain()->getRequest()->getText('debug')
			? self::$packageFiles
			: self::$packageFilesMinified;

		$resourceLoader->register( 'ext.smartcomments', [
			'localBasePath' => __DIR__ . '/../',
			'remoteExtPath' => 'SmartComments',
			'scripts' => $packageFiles,
			'styles' => [
				"resources/js/ext/vanillatoasts/vanillatoasts.css",
				"resources/css/style.css"
			],
			"messages" => [
				"api-error",
				"sic-button-new-comment",
				"sic-button-new-reply",
				"sic-button-goto-link",
				"sic-button-save",
				"sic-button-cancel",
				"sic-button-close",
				"sic-button-complete",
				"sic-button-delete",
				"sic-button-overview",
				"sic-button-see-page",
				"sic-button-edit",
				"sic-button-reopen",
				"sic-input-newcomment",
				"sic-input-commenttext",
				"sic-date-justnow",
				"sic-error-empty",
				"sic-title-new",
				"sic-sp-no-access",
				"sic-sp-filter-author",
				"sic-sp-filter-page",
				"sic-sp-filter-status",
				"sic-sp-delete-confirm",
				"right-add-inlinecomments",
				"right-manage-inlinecomments",
				"action-add-inlinecomments",
				"action-manage-inlinecomments",
				"sic-error-title",
				"sic-error-dismiss",
				"sic-popup-title",
				"sic-popup-msg-single",
				"sic-popup-msg-multiple",
				"sic-popup-enabled-highlighting-title",
				"sic-popup-enabled-highlighting-msg",
				"sic-popup-unlocalized-comments-title",
				"sic-popup-unlocalized-comments-msg",
				"sic-unlocalized-comments-found",
				"sic-selection-error-title",
				"sic-selection-error-html",
				"sic-selection-error-linebreaks",
				"sic-selection-error-1",
				"sic-selection-error-2",
				"sic-selection-error-3",
				"sic-selection-error-4",
				"sic-added-comment",
				"sic-added-comment-refreshing",
				"sic-unlocalized-comment",
				"sic-popup-closed",
				"sic-popup-completed",
				"sic-popup-deleted"
			],
				"dependencies" => [
				"mediawiki.user",
				"mediawiki.util",
				"oojs-ui-core",
				"oojs-ui-widgets",
				"oojs-ui-windows",
				"oojs-ui-toolbars",
				"oojs-ui.styles.icons-editing-core",
				"oojs-ui.styles.icons-moderation",
				"oojs-ui.styles.icons-alerts",
				"oojs-ui.styles.icons-content"
			]
		]);
	}

}