<?php

namespace MediaWiki\Extension\SmartComments\Updater;

use MediaWiki\Extension\SmartComments\DBHandler;
use MediaWiki\Extension\SmartComments\Positioning\TextLocation;
use MediaWiki\Extension\SmartComments\Positioning\TextLocationUpdater;
use MediaWiki\Extension\SmartComments\SemanticInlineComment;
use MWContentSerializationException;
use MWException;
use ParserOutput;
use MediaWiki\Extension\SmartComments\Store\AnchorStore;
use WikiPage;

class Page {

	public const UPDATE_COMMENT_TEXT = 'Updating SmartComments data slot';
	public const DELETE_COMMENT_TEXT = 'Removing SmartComments data slot';
	public const DATA_SLOT = 'sic-data-slot';

	/**
	 * Contains the currently cached HTML version of the given $page
	 */
	private ?ParserOutput $parserOutput;
	private AnchorStore $anchorStore;
	private WikiPage $page;

	public static bool $wasSaved = false;

	public function __construct( WikiPage $page, ParserOutput $parserOutput = null ) {
		$this->page = $page;
		$this->parserOutput = $parserOutput;
		$this->anchorStore = new AnchorStore( DBHandler::selectAnchorsByPage(
			$this->page->getTitle()->getFullText(),
			SemanticInlineComment::STATUS_OPEN
		) );
	}

	/**
	 * @return bool
	 */
	public function hasComments(): bool {
		return count( $this->anchorStore->getTextLocations() ) !== 0;
	}

	/**
	 * Checks whether the page has a data slot attached to it
	 *
	 * @return bool
	 */
	public function hasDataSlot(): bool {
		return $this->page->getRevisionRecord()->hasSlot( self::DATA_SLOT );
	}

	/**
	 * Removes the SmartComments data slot attached to this page
	 *
	 * @return bool
	 * @throws MWException
	 */
	public function destroyDataSlot(): bool {
		$pageUpdater = $this->page->newPageUpdater( \RequestContext::getMain()->getUser() );
		$pageUpdater->removeSlot( self::DATA_SLOT );
		$comment = \CommentStoreComment::newUnsavedComment( self::DELETE_COMMENT_TEXT );
		$pageUpdater->saveRevision( $comment, EDIT_INTERNAL | EDIT_SUPPRESS_RC );
		return $pageUpdater->getStatus()->isOK();
	}

	/**
	 * Updates comments by comparing the current HTML version of the page with the old one.
	 *
	 * @return bool
	 * @throws MWContentSerializationException
	 * @throws MWException
	 */
	public function updateComments(): bool {
		if ( !$this->hasComments() ) {
			return false;
		}

		try {
			$slot = $this->page->getRevisionRecord()->getContent( self::DATA_SLOT );
		} catch ( \Exception $e ) {
			$this->updateSlotWithCurrentContents();
			return false;
		}

		// Clean the parser transclusion shit from the parser output since we
		// don't care about that
		$currentContent = $this->cleanHTMLString(  $this->parserOutput->getText() );
		$oldContent = $slot->getWikitextForTransclusion();

		// Loop over each text location to update its location
		foreach( $this->anchorStore->getTextLocations() as $textLocation ) {
			$updater = new TextLocationUpdater( $oldContent, $currentContent, $textLocation );
			try {
				$newTextLocation = $updater->getNewTextLocation();
			} catch ( \Exception $e ) {
				//
			}

			if ( $newTextLocation instanceof TextLocation ) {
				$this->anchorStore->updateTextLocation( $newTextLocation );
			}
		}

		// Save current state
		$this->updateSlotWithCurrentContents();

		// Stops endless loops..
		self::$wasSaved = true;

		return true;
	}

	/**
	 * Cleans the HTML string from HTML comments
	 *
	 * @param $string
	 * @return string
	 */
	private function cleanHTMLString( $string ): string {
		return preg_replace( '/<!--(.|\s)*?-->/', '', $string );
	}

	/**
	 * Updates the data slot with the current HTML version of the page
	 *
	 * @param ?string $stringToAppend
	 * @return void
	 * @throws MWContentSerializationException
	 * @throws MWException
	 */
	private function updateSlotWithCurrentContents( $stringToAppend = null ): void {
		$pageUpdater = $this->page->newPageUpdater( \RequestContext::getMain()->getUser() );

		$slotContent = \ContentHandler::makeContent(
			$this->cleanHTMLString( $this->parserOutput->getText() ),
			$this->page->getTitle()
		);

		$commentStore = \CommentStoreComment::newUnsavedComment( self::UPDATE_COMMENT_TEXT );

		$pageUpdater->setContent( self::DATA_SLOT, $slotContent );
		$pageUpdater->saveRevision( $commentStore, EDIT_SUPPRESS_RC );
	}

}