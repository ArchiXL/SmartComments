<?php

namespace SmartComments\Tests\Util;

use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use RegexIterator;
use RuntimeException;

class XmlFileProvider {

	/** @var string */
	private $path = null;

	/**
	 * @param string $path
	 */
	public function __construct( $path ) {
		$this->path = $path;
	}

	/**
	 * @return string[]
	 */
	public function getFiles() {
		return $this->loadXmlFiles( $this->readDirectory( $this->path ) );
	}

	/**
	 * @param string $file
	 * @return array
	 */
	public function getJson( string $file ): array {
		$xml = simplexml_load_file( $file, "SimpleXMLElement", LIBXML_NOCDATA );
		$json = json_encode( $xml );
		return json_decode( $json, true );
	}

	/**
	 * @param string $path
	 * @return string
	 */
	private function readDirectory( $path ) {
		$path = str_replace( [ '\\', '/' ], DIRECTORY_SEPARATOR, $path );

		if ( is_readable( $path ) ) {
			return $path;
		}

		throw new RuntimeException( "Expected an accessible {$path} path" );
	}

	/**
	 * @param string $path
	 * @return string[]
	 */
	private function loadXmlFiles( $path ) {
		$directoryIterator = new RecursiveDirectoryIterator( $path );
		$iteratorIterator = new RecursiveIteratorIterator( $directoryIterator );
		$regexIterator = new RegexIterator( $iteratorIterator, '/^.+\.xml$/i', RegexIterator::GET_MATCH );

		return call_user_func_array( 'array_merge', iterator_to_array( $regexIterator, false ) );
	}

}
