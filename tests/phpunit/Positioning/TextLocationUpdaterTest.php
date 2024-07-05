<?php

namespace MediaWiki\Extension\SmartComments\Tests\Poisitioning;

use MediaWiki\Extension\SmartComments\Positioning\TextLocation;
use MediaWiki\Extension\SmartComments\Positioning\TextLocationUpdater;
use PHPUnit\Framework\TestCase;

class TextLocationUpdaterTest extends TestCase {

	/**
	 * @param $location
	 * @return TextLocationUpdater
	 */
	private function getLocationUpdater( $location ): TextLocationUpdater {
		return new TextLocationUpdater(
			file_get_contents( TEST_DATA_DIR . '/WikiTestPageSource' ),
			file_get_contents( TEST_DATA_DIR . '/WikiTestPageSourceEdited' ),
			$location
		);
	}

	/**
	 * @return void
	 */
	public function testTextLocationEdit() {
		$location = new TextLocation( "amet", 6, 0 );
		$this->assertEquals( $location->getIndex(), 6 );
		$this->assertEquals( $location->getWord(), "amet" );

		$locationUpdater = $this->getLocationUpdater( $location );
		$newLocation = $locationUpdater->getNewTextLocation();

		$this->assertEquals( $newLocation->getIndex(), 7 );
	}

	/**
	 * @return void
	 */
	public function testTextLocationDeletedLine() {
		$location = new TextLocation( "In erat elit, semper sed", 0, 0 );
		$this->assertEquals( $location->getIndex(), 0 );
		$this->assertEquals( $location->getWord(), "In erat elit, semper sed" );

		$locationUpdater = $this->getLocationUpdater( $location );
		$newLocation = $locationUpdater->getNewTextLocation();

		$this->assertEquals( $newLocation->getIndex(), -1 );
	}


	public function testTextLocationChangedWord() {
		$location = new TextLocation( "voer", 0, 0 );
		$this->assertEquals( $location->getIndex(), 0 );
		$this->assertEquals( $location->getWord(), "voer" );

		$locationUpdater = $this->getLocationUpdater( $location );
		$newLocation = $locationUpdater->getNewTextLocation();

		$this->assertEquals( $location->getIndex(), $newLocation->getIndex() );
	}

}