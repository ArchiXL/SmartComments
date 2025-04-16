<?php

namespace SmartComments\Tests\Integration\Parser;

use MediaWiki\Extension\SmartComments\Store\AnchorStore;
use SmartComments\Tests\Util\XmlFileProvider;
use PHPUnit\Framework\TestCase;
use Generator;
use MediaWiki\Extension\SmartComments\Positioning\TextLocationUpdater;
use MediaWiki\Extension\SmartComments\Positioning\TextLocation;

class AnchorStoreTest extends TestCase {
	private function getLocationUpdater( $old, $new ): TextLocationUpdater {
		return new TextLocationUpdater(
			$old,
			$new,
		);
	}

	/**
	 * @dataProvider provideData
	 */
	public function testTextLocationUpdater( array $testcases ) {
		$anchors = [];
		foreach ( $testcases as $index => $testcase ) {
			$anchors[] = $testcase[ 'data' ];
		}
		$anchorStore = new AnchorStore( $anchors );
		foreach ( $anchorStore->getTextLocations() as $index => $location ) {
			$this->assertEquals(
				$location->getString(),
				$testcases[ $index ][ 'word' ],
				"Test case #{$index}: Expected word {$testcases[$index]['word']}, got {$location->getString()}"
			);
			$this->assertEquals(
				$location->getIndex(),
				$testcases[ $index ][ 'pos' ],
				"Test case #{$index}: Expected index {$testcases[$index]['pos']}, got {$location->getIndex()}"
			);
		}
	}

	public static function provideData(): Generator {
		$xmlFileProvider = new XmlFileProvider( __DIR__ . '/../../Fixture/AnchorStore' );
		$files = $xmlFileProvider->getFiles();

		foreach ( $files as $file ) {
			$testcase = $xmlFileProvider->getJson( $file );
			$testcases = $testcase[ 'testcase' ];

			// Extract a meaningful name from the file or test case
			$testcaseName = basename( $file, '.xml' ); // Assuming .xml extension

			yield $testcaseName => [
				isset( $testcases[ 'string' ] ) ? [ $testcases ] : $testcases
			];
		}
	}
}
