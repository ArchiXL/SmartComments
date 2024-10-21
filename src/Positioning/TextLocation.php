<?php

namespace MediaWiki\Extension\SmartComments\Positioning;

class TextLocation {

	/** @var string */
	private $word;

	/** @var int */
	private $index;

	/** @var int */
	private $dbId;

	public const INDEX_DELETED = -1;

	public function __construct( $word, int $index, int $dbId ) {
		$this->word = $word;
		$this->index = $index;
		$this->dbId = $dbId;
	}

	/**
	 * @return string
	 */
	public function getString(): string {
		return $this->word;
	}

	/**
	 * @return int
	 */
	public function getIndex(): int {
		return $this->index;
	}

	/**
	 * @param int $index
	 * @return void
	 */
	public function setIndex( int $index ) {
		$this->index = $index;
	}

	/**
	 * @return int
	 */
	public function getDbId(): int {
		return $this->dbId;
	}

}