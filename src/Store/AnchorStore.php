<?php
namespace MediaWiki\Extension\SmartComments\Store;

use MediaWiki\Extension\SmartComments\DBHandler;
use MediaWiki\Extension\SmartComments\Positioning\TextLocation;

class AnchorStore {

	/** @var TextLocation[]  */
	private $textLocations = [];

	/**
	 * @param array $data
	 */
	public function __construct( array $data ) {

		foreach ( $data as $anchor ) {
			if ( !isset ( $anchor['pos'] ) ) {
				continue;
			}

			if ( strstr( $anchor['pos'], '|' ) ) {
				$this->addTextLocation( $anchor );
			} else {
				// Not supported to store other anchor types
			}

		}
	}

	/**
	 * Adds a new text location object
	 *
	 * @param array $anchor
	 * @return void
	 */
	private function addTextLocation( array $anchor ): void {
		$posExploded = explode( '|', $anchor['pos'] );
		$this->textLocations[] = new TextLocation( $posExploded[0], $posExploded[1], $anchor['anchor_id'] );
	}

	/**
	 * @return TextLocation[]
	 */
	public function getTextLocations(): array {
		return $this->textLocations;
	}

	/**
	 * Saves the textlocation to the database
	 *
	 * @param TextLocation $textLocation
	 * @return bool
	 */
	public function updateTextLocation( TextLocation $textLocation ) {
		DBHandler::updateAnchor(
			$textLocation->getDbId(),
			$textLocation->getString(),
			$textLocation->getIndex()
		);
	}

}