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

	private AnchorStore $anchorStore;
	/**
	 * Contains the currently cached HTML version of the given $page
	 */
	private ?ParserOutput $parserOutput;
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

		// Clean the parser transclusion tags from the parser output since we don't want that in our content
		$currentContent = $this->cleanHTMLString( $this->parserOutput->getText() );
		$oldContent = DBHandler::getDiffTableEntryText( $this->page->getId() );
		if ( $oldContent === null ) {
			DBHandler::updateDiffTable( $this->page->getId(), $currentContent );
			return true;
		}

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
		DBHandler::updateDiffTable( $this->page->getId(), $currentContent );

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
}