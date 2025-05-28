<?php

namespace MediaWiki\Extension\SmartComments;

use MediaWiki\Extension\SmartComments\Settings\Handler;
use MediaWiki\Extension\SmartComments\Updater\Page;
use OutputPage;
use SMW\SemanticData;
use SMW\Store;
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
			if ( !mkdir( self::$imageSaveDirectory ) ) {
				throw new \Exception( "Could not create directory for images (" . self::$imageSaveDirectory . ")." );
			}
		}
	}

	/**
	 * Adds all the required frontend scripts and styles
	 *
	 * @param \OutputPage $out
	 * @param \Skin $skin
	 * @return bool
	 */
	public static function onBeforePageDisplay( \OutputPage $out, \Skin $skin ) {
		if ( $out->getUser()->isRegistered() && $out->isArticle() && !Handler::isCommentModeBlocked() ) {
			$out->addModuleStyles( [ 'oojs-ui.styles.icons-editing-core', 'oojs-ui.styles.icons-moderation', 'oojs-ui.styles.icons-alerts' ] );
			$out->addModules( 'ext.smartcomments.frontend' );
		}
		return true;
	}

	/**
	 * Adds the SmartComments app div at the bottom of the body tag
	 *
	 * @param \Skin $skin
	 * @param string &$text
	 * @return bool
	 */
	public static function onSkinAfterBottomScripts( \Skin $skin, &$text ) {
		$out = $skin->getOutput();
		if ( $out->getUser()->isRegistered() && $out->isArticle() && !Handler::isCommentModeBlocked() ) {
			$text .= '<div id="smartcomments-app"></div>';
		}
		return true;
	}

	public static function onParserCacheSaveComplete(
		\ParserCache $parserCache,
		\ParserOutput $parserOutput,
		\Title $title,
		\ParserOptions $parserOptions,
		int $revId
	) {
		$page = \MediaWiki\MediaWikiServices::getInstance()->getWikiPageFactory()->newFromTitle( $title );
		$pageUpdater = new Page( $page, $parserOutput );
		$pageUpdater->updateComments();
	}

	/**
	 * Passes config variables to the resource loader
	 *
	 * @param &$vars
	 * @return bool
	 */
	public static function onResourceLoaderGetConfigVars( &$vars ) {
		global $wgSmartComments, $wgSmartCommentsSpecialMaxItems;

		$vars[ 'wgSmartComments' ] = [
			'maxCommentsShownOnSpecial' => $wgSmartCommentsSpecialMaxItems,
		];
		return true;
	}

	/**
	 * This function creates subobjects for all comments posted on the page.
	 *
	 * @param Store $store
	 * @param SemanticData $semanticData
	 * @return bool
	 */
	public static function addSubobjectsForComments( $store, \SMW\SemanticData $semanticData ) {
		$subject = $semanticData->getSubject();
		$title = $subject->getTitle();
		$pageName = $title->getPrefixedText();
		$filter = 'all';

		// Retrieve all comments for this page from the database and create subobjects
		$sics = DBHandler::selectCommentsByPage( $pageName, $filter );
		$subobjects = SMWHandler::createSubobjectsFromArrayOfSics( $sics );
		foreach ( $subobjects as $subobject ) {
			if ( $subobject instanceof Subobject ) {
				// Add the subobject to the page's SemanticData object
				$semanticData->addSubobject( $subobject );
			}
		}
		return true;
	}

	/**
	 * Adds the "Add comment" button
	 *
	 * @param \SkinTemplate &$skinTemplate
	 * @param array &$links
	 * @return bool
	 */
	public static function onSkinTemplateNavigation( \SkinTemplate &$skinTemplate, array &$links ) {
		$action = $skinTemplate->getRequest()->getVal( 'action' );
		if ( $action != null || $skinTemplate->getTitle() && !$skinTemplate->getTitle()->exists() || !$skinTemplate->getUser()->isRegistered() || Handler::isCommentModeBlocked() ) {
			return true;
		}

		$links['views']['comments'] = [
			'text' => wfMessage( "sic-action-text" ),
			'href' => '#',
			'class' => 'sic-enable-commenting'
		];

		// We want the 'comments'-tab on the left side of the 'watch'/star button
		if ( isset( $links['views'] ) && isset( $links['views']['watch'] ) ) {
			$watch = $links['views']['watch'];
			unset( $links['views']['watch'] );
			$links['views']['watch'] = $watch;
		}

		return true;
	}

	public static function onArticleDeleteAfterSuccess( Title $title, OutputPage $output ) {
		$titleText = $title->getText();
		$titleNS = $title->getNamespace();
		$pageId = DBHandler::getPageIdFromArchive( $titleText, $titleNS );

		if ( $pageId != 0 ) {
			$sics = DBHandler::selectCommentsByPageId( $pageId );
			DBHandler::deleteDiffTableEntry( $pageId );

			/* @var SemanticInlineComment $sic */
			foreach ( $sics as $sic ) {
				$sicId = $sic->getId();
				$success = DBHandler::deleteComment( $sicId );
			}
		}
	}

}
