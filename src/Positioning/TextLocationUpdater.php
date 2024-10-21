<?php

namespace MediaWiki\Extension\SmartComments\Positioning;

use Jfcherng\Diff\SequenceMatcher;

class TextLocationUpdater {

	/** @var string */
	private $oldText;

	/** @var string */
	private $newText;

	/** @var TextLocation */
	private $location;

	/**
	 * @param string $oldText
	 * @param string $newText
	 * @param TextLocation $location
	 */
	public function __construct( $oldText, $newText, TextLocation $location ) {
		$this->oldText = $oldText;
		$this->newText = $newText;
		$this->location = $location;
	}

	/**
	 * Returns the updated text location based on the old and new text.
	 *
	 * @return TextLocation
	 */
	public function getNewTextLocation(): TextLocation {
		if ( $this->location->getIndex() === TextLocation::INDEX_DELETED ) {
			return $this->location;
		}

		$annotatedString = $this->location->getString();
		$annotatedIndex = $this->location->getIndex();

		// Find positions of the annotated string in the old text
		$oldPositions = $this->findStringPositions( $this->oldText, $annotatedString );
		if ( !isset( $oldPositions[ $annotatedIndex ] ) ) {
			// Annotated string not found at the specified index in old text
			$this->location->setIndex( TextLocation::INDEX_DELETED );
			return $this->location;
		}

		// Get the start position of the annotated string in the old text
		$oldStartPos = $oldPositions[ $annotatedIndex ];

		// Split texts into arrays of characters
		$oldChars = $this->splitIntoCharacters( $this->oldText );
		$newChars = $this->splitIntoCharacters( $this->newText );

		// Use SequenceMatcher to compute the differences between the old and new texts
		$matcher = new SequenceMatcher( $oldChars, $newChars );
		$matchingBlocks = $matcher->getMatchingBlocks();

		// Build mapping from old text positions to new text positions
		$positionMapping = $this->buildPositionMapping( $matchingBlocks );

		// Map the old start position to the new text
		if ( isset( $positionMapping[ $oldStartPos ] ) ) {
			$newStartPos = $positionMapping[ $oldStartPos ];

			// Check if the annotated string exists at the new position
			$substring = mb_substr( $this->newText, $newStartPos, mb_strlen( $annotatedString ) );
			if ( $substring === $annotatedString ) {
				// Find the new index (occurrence number) of the annotated string
				$newPositions = $this->findStringPositions( $this->newText, $annotatedString );
				$newIndex = array_search( $newStartPos, $newPositions );
				$this->location->setIndex( $newIndex );
				return $this->location;
			} else {
				// Annotated string was modified
				$this->location->setIndex( TextLocation::INDEX_DELETED );
				return $this->location;
			}
		} else {
			// Annotated string was deleted
			$this->location->setIndex( TextLocation::INDEX_DELETED );
			return $this->location;
		}
	}

	/**
	 * Splits a string into an array of characters.
	 *
	 * @param string $text
	 * @return array
	 */
	private function splitIntoCharacters( $text ): array {
		// Use mb_str_split if available (PHP 7.4+)
		if ( function_exists( 'mb_str_split' ) ) {
			return mb_str_split( $text );
		}
		// Fallback for earlier PHP versions
		return preg_split( '//u', $text, -1, PREG_SPLIT_NO_EMPTY );
	}

	/**
	 * Builds a mapping from old text positions to new text positions based on matching blocks.
	 *
	 * @param array $matchingBlocks
	 * @return array
	 */
	private function buildPositionMapping( $matchingBlocks ): array {
		$mapping = [];

		foreach ( $matchingBlocks as $block ) {
			list ( $oldStart, $newStart, $length ) = $block;

			for ( $i = 0; $i < $length; $i++ ) {
				$mapping[ $oldStart + $i ] = $newStart + $i;
			}
		}

		return $mapping;
	}

	/**
	 * Finds all positions of a string within the text.
	 *
	 * @param string $text
	 * @param string $string
	 * @return array
	 */
	private function findStringPositions( $text, $string ): array {
		$positions = [];
		$offset = 0;
		$stringLength = mb_strlen( $string );
		while ( ( $pos = mb_strpos( $text, $string, $offset ) ) !== false ) {
			$positions[] = $pos;
			$offset = $pos + $stringLength; // Move past this occurrence
		}
		return $positions;
	}
}
