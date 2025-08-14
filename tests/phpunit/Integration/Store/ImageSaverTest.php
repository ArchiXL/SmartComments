<?php

namespace SmartComments\Tests\Integration\Store;

use MediaWiki\Extension\SmartComments\Store\ImageSaver;
use MediaWiki\Extension\SmartComments\Hooks;
use PHPUnit\Framework\TestCase;

class ImageSaverTest extends TestCase {

	/**
	 * @var \Title|\PHPUnit\Framework\MockObject\MockObject
	 */
	private $titleMock;

	/**
	 * Set up the test environment
	 */
	protected function setUp(): void {
		parent::setUp();

		$this->titleMock = $this->createMock( \Title::class );
		$this->titleMock->method( 'getId' )->willReturn( 123 );

		Hooks::$imageSaveDirectory = sys_get_temp_dir();
	}

	/**
	 * Test that ImageSaver returns null for invalid XSS payload
	 */
	public function testInvalidXssPayload(): void {
		$imageSaver = new ImageSaver( $this->titleMock );

		$invalidPayload = 'data:image/png;base64,PHNjcmlwdD5hbGVydCgneHNzJyk7PC9zY3JpcHQ+';

		$result = $imageSaver->save( $invalidPayload );

		$this->assertNull( $result, 'ImageSaver should return null for XSS payload' );
	}

	/**
	 * Test that ImageSaver returns a filename for valid payload
	 */
	public function testValidPayload(): void {
		$imageSaver = new ImageSaver( $this->titleMock );

		$validPayload = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

		$result = $imageSaver->save( $validPayload );

		$this->assertNotNull( $result, 'ImageSaver should return a filename for valid payload' );

		$filePath = Hooks::$imageSaveDirectory . '/' . $result;
		$this->assertFileExists( $filePath, 'Image file should be created' );

		if ( file_exists( $filePath ) ) {
			unlink( $filePath );
		}
	}

	/**
	 * Test that ImageSaver returns null for non-image data
	 */
	public function testNonImageData(): void {
		$imageSaver = new ImageSaver( $this->titleMock );

		// Base64 encoded text that's not an image
		$nonImagePayload = 'data:image/png;base64,SGVsbG8gV29ybGQ=';

		$result = $imageSaver->save( $nonImagePayload );

		// Assert that the result is null for non-image data
		$this->assertNull( $result, 'ImageSaver should return null for non-image data' );
	}

	/**
	 * Test that ImageSaver returns null for unsupported image type
	 */
	public function testUnsupportedImageType(): void {
		$imageSaver = new ImageSaver( $this->titleMock );

		$unsupportedTypePayload = 'data:image/webp;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

		$result = $imageSaver->save( $unsupportedTypePayload );

		$this->assertNull( $result, 'ImageSaver should return null for unsupported image type' );
	}
}