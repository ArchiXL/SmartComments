<?php

namespace MediaWiki\Extension\SmartComments\Store;

use MediaWiki\Extension\SmartComments\Hooks;

class ImageSaver {

	/** @var string[] */
	private $allowedFileTypes = [ 'jpg', 'jpeg', 'gif', 'png' ];

	/** @var string */
	private $imageType;

	/** @var string */
	private $imageName;

	/**
	 * @param \Title $title
	 */
	public function __construct( \Title $title ) {
		$this->imageName = substr( md5( sprintf( "%s|%s|%d", $title->getId(), uniqid(), rand( 0,1000000 ) ) ), 0, 10 );
	}

	/**
	 * Transforms the given base64 encoded image into a file and saves on the disk.
	 * Returns the file name of the saved image.
	 *
	 * @param string $data
	 * @return string|null
	 */
	public function save( $data ): ?string {

		if ( preg_match('/^data:image\/(\w+);base64,/', $data, $type ) ) {
			$data = substr( $data, strpos($data, ',' ) + 1 );
			$this->imageType = strtolower( $type[1] );

			// Allowed types
			if ( !in_array( $this->imageType, $this->allowedFileTypes ) ) {
				return null;
			}

			$data = str_replace( ' ', '+', $data );
			$data = base64_decode($data);

			try {
				$image = imagecreatefromstring( $data );
			} catch ( \Exception $e ) {
				return null;
			}

			if ( $image === false ) {
				return null;
			}

			if ( $data === false ) {
				return null;
			}
		} else {
			return null;
		}

		if ( ! file_put_contents( Hooks::$imageSaveDirectory . "/{$this->imageName}.{$this->imageType}", $data) ) {
			return null;
		}

		return "{$this->imageName}.{$this->imageType}";
	}

}