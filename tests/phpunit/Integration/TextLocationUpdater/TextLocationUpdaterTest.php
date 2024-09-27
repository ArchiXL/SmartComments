<?php

namespace SmartComments\Tests\Integration\Parser;

use SmartComments\Tests\Util\XmlFileProvider;
use PHPUnit\Framework\TestCase;
use Generator;
use MediaWiki\Extension\SmartComments\Positioning\TextLocationUpdater;
use MediaWiki\Extension\SmartComments\Positioning\TextLocation;

class ParserhookUpdater extends TestCase
{

	private function getLocationUpdater( $old, $new, $location ): TextLocationUpdater {
		return new TextLocationUpdater(
			$old,
			$new,
			$location
		);
	}

	/**
	 * @dataProvider provideData
	 */
	public function testTextLocationUpdater( string $old, string $new, array $testcases ) {
		foreach ( $testcases as $testcase ) {
			if ( $testcase[ 'deleted' ] ?? false ) {
				$this->doDeleteCase( $old, $new, $testcase );
			} else {
				$this->doChangedCase( $old, $new, $testcase );
			}
		}
	}

	private function doDeleteCase( $old, $new, $testcase ) {
		$string = $testcase[ 'string' ];
		$current = $testcase[ 'current' ];
		$location = new TextLocation( $string, $current, 0 );
		$this->assertEquals( $location->getIndex(), $current );
		$this->assertEquals( $location->getWord(), $string );

		$locationUpdater = $this->getLocationUpdater( $old, $new, $location );
		$newLocation = $locationUpdater->getNewTextLocation();

		$this->assertEquals( $newLocation->getIndex(), -1 );
	}

	private function doChangedCase( $old, $new, $testcase ) {
		$string = $testcase[ 'string' ];
		$currentIndex = $testcase[ 'current' ];
		$newIndex = $testcase[ 'new' ];

		$location = new TextLocation( $string, $currentIndex, 0 );
		$this->assertEquals( $location->getIndex(), $currentIndex );
		$this->assertEquals( $location->getWord(), $string );

		$locationUpdater = $this->getLocationUpdater( $old, $new, $location );
		$newLocation = $locationUpdater->getNewTextLocation();

		$this->assertEquals( $newLocation->getIndex(), $newIndex );
	}

	public static function provideData(): Generator {
		$xmlFileProvider = new XmlFileProvider( __DIR__ . '/../../Fixture/TextLocationUpdater' );
		$files = $xmlFileProvider->getFiles();

		foreach ( $files as $file ) {
			$testcase = $xmlFileProvider->getJson( $file );
			$text = $testcase[ 'text' ];
			$old = $text[ 'old' ];
			$new = $text[ 'new' ];
			$testcases = $testcase[ 'expected' ][ 'testcase' ];

			yield [
				$old,
				$new,
				isset( $testcases[ 'string' ] ) ? [ $testcases ] : $testcases
			];
		}
	}
}