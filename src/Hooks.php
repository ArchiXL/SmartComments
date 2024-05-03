<?php

namespace MediaWiki\Extension\SmartComments;

use OutputPage;
use MediaWiki\Extension\SmartComments\Settings\Handler;
use MediaWiki\Extension\SmartComments\Updater\Page;
use SMW\Subobject;
use Title;

class Hooks {

	/** @var string */
	public static $imageSaveDirectory;

	/**
	 * This hook will add a role to the list of available slot roles.
	 *
	 * @param \MediaWiki\MediaWikiServices $services
	 * @return void
	 */
	public static function onMediaWikiServices( \MediaWiki\MediaWikiServices $services ) {
		global $wgUploadDirectory;

		self::$imageSaveDirectory = $wgUploadDirectory . "/sic-images/";
		if ( !is_dir( self::$imageSaveDirectory ) ) {
			if ( ! mkdir ( self::$imageSaveDirectory ) ) {
				throw new \Exception( "Could not create directory for images (". self::$imageSaveDirectory .")." );
			}
		}

		$services->addServiceManipulator( 'SlotRoleRegistry', function( \MediaWiki\Revision\SlotRoleRegistry $registry ) {
			if ( ! $registry->isDefinedRole( Page::DATA_SLOT ) ) {
				$registry->defineRoleWithModel(
					Page::DATA_SLOT,
					CONTENT_MODEL_WIKITEXT,
					[
						"display" => "none",
						"region" => "center",
						"placement" => "append"
					]
				);
			}
		} );
	}

	/**
	 * Adds all the required frontend scripts and styles
	 *
	 * @param \OutputPage $out
	 * @param \Skin $skin
	 * @return bool
	 */
	public static function onBeforePageDisplay( \OutputPage $out, \Skin $skin ) {
		if( $out->getUser()->isRegistered() && $out->isArticle() ) {
			$out->addModuleStyles( [ 'oojs-ui.styles.icons-editing-core', 'oojs-ui.styles.icons-moderation', 'oojs-ui.styles.icons-alerts' ] );
			$out->addModules( 'ext.smartcomments' );
		}
		return true;
	}

	/**
	 * @param \WikiPage $wikiPage
	 * @return bool
	 */
	public static function onParserCacheSaveComplete(
		\ParserCache $parserCache,
		\ParserOutput $parserOutput,
		\Title $title,
		\ParserOptions $parserOptions,
		int $revId
	) {
		if ( !Page::$wasSaved ) {
			$pageUpdater = new Page( \WikiPage::factory( $title ), $parserOutput );
			$pageUpdater->updateComments();
		}
		return true;
	}

	/**
	 * Passes config variables to the resource loader
	 *
	 * @param $vars
	 * @return bool
	 */
	public static function onResourceLoaderGetConfigVars( &$vars ) {
		global $wgSmartCommentsBodyContainer, $wgSmartCommentsSelectLinksOnClick,
			   $wgSmartCommentsOpenPopupOnSelect, $wgSmartCommentsDirectComment, $wgSmartCommentsPopupTimeout,
				$wgSmartCommentsSpecialMaxItems, $wgSmartCommentsEnabledAddons;

		$vars[ 'wgSmartComments' ] = [
		    'bodyContainer' => $wgSmartCommentsBodyContainer,
		    'selectOnLinkClick' => $wgSmartCommentsSelectLinksOnClick,
			'commentOnSelect' => $wgSmartCommentsOpenPopupOnSelect,
			'directComment' => $wgSmartCommentsDirectComment,
			'popupTimeout' => $wgSmartCommentsPopupTimeout,
			'maxCommentsShownOnSpecial' => $wgSmartCommentsSpecialMaxItems,
			'enabledAddons' => $wgSmartCommentsEnabledAddons
        ];
		return true;
	}

	/**
	 * This function creates subobjects for all comments posted on the page.
	 * 
	 * @param \SMWStore $store
	 * @param \SMWSemanticData $semanticData
	 * @return bool
	 */
	public static function addSubobjectsForComments($store, \SMW\SemanticData $semanticData) {
		$subject = $semanticData->getSubject();
		$title = $subject->getTitle();
		$pageName = $title->getPrefixedText();
		$filter = 'all';
		
		//Retrieve all comments for this page from the database and create subobjects
		$sics = DBHandler::selectCommentsByPage($pageName, $filter);
		$subobjects = SMWHandler::createSubobjectsFromArrayOfSics($sics);
		foreach ($subobjects as $subobject) {
			if ($subobject instanceof Subobject) {
				//Add the subobject to the page's SemanticData object
				$semanticData->addSubobject($subobject);
			}
		}
		return true;
	}

	/**
	 * Adds the "Add comment" button
	 *
	 * @param \SkinTemplate $skinTemplate
	 * @param array $links
	 * @return bool
	 */
	public static function onSkinTemplateNavigation( \SkinTemplate &$skinTemplate, array &$links ) {
		$action = $skinTemplate->getRequest()->getVal('action');
		if ( $action != null || $skinTemplate->getTitle() && !$skinTemplate->getTitle()->exists() || !$skinTemplate->getUser()->isRegistered() || Handler::isCommentModeBlocked() ) {
			return true;
		}

		$links['views']['comments'] = [
			'text' => wfMessage("sic-action-text"),
			'href' => '#',
			'class' => 'sic-enable-commenting'
		];

		// We want the 'comments'-tab on the left side of the 'watch'/star button
		if ( isset ( $links['views'] ) && isset ( $links['views']['watch'] ) ) {
			$watch = $links['views']['watch'];
			unset( $links['views']['watch'] );
			$links['views']['watch'] = $watch;
		}

		return true;
	}

	/**
	 * @param \HistoryPager $pager
	 * @param $queryInfo
	 * @return void
	 */
	public static function onPageHistoryPagerGetQueryInfo( \HistoryPager $pager, &$queryInfo ) {
		$queryInfo['conds'][] = 'comment_text != "'. Page::UPDATE_COMMENT_TEXT.'"';
		$queryInfo['conds'][] = 'comment_text != "'. Page::DELETE_COMMENT_TEXT.'"';
	}

	/**
	 * @param $db
	 * @param $tables
	 * @param $cond
	 * @param $opts
	 * @param $join_conds
	 * @param $conds
	 * @return void
	 */
	public static function onModifyExportQuery( $db, &$tables, &$cond, &$opts, &$join_conds, &$conds) {
		$conds[] = 'comment_text != "' . Page::UPDATE_COMMENT_TEXT . '"';
		$conds[] = 'comment_text != "' . Page::DELETE_COMMENT_TEXT . '"';
	}

	public static function onArticleDeleteAfterSuccess( Title $title, OutputPage $output ) {
		$titleText = $title->getText();
		$titleNS = $title->getNamespace();
		$pageId = DBHandler::getPageIdFromArchive( $titleText, $titleNS );

		if ( $pageId != 0 ) {
			$sics = DBHandler::selectCommentsByPageId( $pageId );

			/* @var SemanticInlineComment $sic */
			foreach ( $sics as $sic ) {
				$sicId = $sic->getId();
				$success = DBHandler::deleteComment( $sicId );
			}
		}
	}

}

