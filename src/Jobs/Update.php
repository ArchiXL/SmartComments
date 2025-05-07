<?php

namespace MediaWiki\Extension\SmartComments\Jobs;

use MediaWiki\Extension\SmartComments\DBHandler;
use MediaWiki\Extension\SmartComments\Updater\Page;

class Update extends \Job {

	/**
	 * @inheritDoc
	 */
	public function __construct( \Title $title, $params = [] ) {
		parent::__construct( 'SmartCommentsUpdateJob', $title, $params );
	}

	/**
	 * Removes the data slot if the page has no comments
	 *
	 * @return true
	 * @throws \MWException
	 */
	public function run() {
		if ( $this->title && $this->title->exists() ) {
			$wikiPage = \MediaWiki\MediaWikiServices::getInstance()->getWikiPageFactory()->newFromTitle( $this->title );
			$pageUpdater = new Page( $wikiPage );
			$hasComments = $pageUpdater->hasComments();
			if ( !$pageUpdater->hasComments() ) {
				DBHandler::deleteDiffTableEntry( $wikiPage->getId() );
				$this->setMetadata( 'removedFromTable', 'yes' );
			}
			$this->setMetadata('hasComments', $hasComments ? 'yes' : 'no' );
		}
		return true;
	}
}