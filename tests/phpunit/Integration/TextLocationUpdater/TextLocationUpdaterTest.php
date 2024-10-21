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
		foreach ( $testcases as $index => $testcase ) {
			$string = $testcase[ 'string' ];
			$currentIndex = $testcase[ 'current' ];
			$newIndex = $testcase[ 'new' ];

			$location = new TextLocation( $string, $currentIndex, 0 );

			$this->assertEquals(
				$currentIndex,
				$location->getIndex(),
				"Test case #{$index}: Expected current index {$currentIndex} for string '{$string}', got {$location->getIndex()}"
			);
			$this->assertEquals(
				$string,
				$location->getString(),
				"Test case #{$index}: Expected word '{$string}', got {$location->getString()}"
			);

			$locationUpdater = $this->getLocationUpdater( $old, $new, $location );
			$newLocation = $locationUpdater->getNewTextLocation();

			$this->assertEquals(
				$newIndex,
				$newLocation->getIndex(),
				"Test case #{$index}: Expected new index {$newIndex} for string '{$string}', got {$newLocation->getIndex()}"
			);
		}
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

			// Extract a meaningful name from the file or test case
			$testcaseName = basename( $file, '.xml' ); // Assuming .xml extension

			yield $testcaseName => [
				$old,
				$new,
				isset( $testcases['string'] ) ? [ $testcases ] : $testcases
			];
		}
	}
}
