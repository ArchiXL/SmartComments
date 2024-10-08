<?php

namespace MediaWiki\Extension\SmartComments\Positioning;

use Jfcherng\Diff\DiffHelper;

class TextLocationUpdater {

	/** @var string */
	private $oldText;

	/** @var string */
	private $newText;
	/**
	 * @var TextLocation
	 */
	private $location;

	/** @var string */
	private $lineNr;
	/** @var string */
	private $charIndex;

	/**
	 * @param string $oldText
	 * @param string $newText
	 * @param TextLocation $location
	 */
	public function __construct( $oldText, $newText, TextLocation $location) {
		$this->oldText = $oldText;
		$this->newText = $newText;
		$this->location = $location;
		$lines = $this->getExactWordLocation();
		$this->lineNr = $lines['lineNr'] ?? 0;
		$this->charIndex = $lines['charIndex'] ?? 0;
	}

	/**
	 * Returns the updated text location based on the old and new text
	 *
	 * @return TextLocation
	 */
	public function getNewTextLocation(): TextLocation {

		// Don't update locations that are unlocated
		if ( $this->location->getIndex() === -1 ) {
			return $this->location;
		}

		if ( substr_count( $this->newText, $this->location->getWord() ) < 1 ) {
			$this->location->setIndex( -1 );
			return $this->location;
		}

		if (
			substr_count( $this->newText, $this->location->getWord() ) === 1 &&
			substr_count( $this->oldText, $this->location->getWord() ) === 1
		) {
			return $this->location;
		}

		if ( is_int( $this->adjustWordIndexBasedOnDiff() ) ) {
			return $this->location;
		}
		// Get the mapping of old lines to new lines
		$lineMapping = $this->getWordMapping();
		if ( is_string( $lineMapping ) ) {
			return $this->location;
		}

		if ( !isset( $lineMapping[ $this->lineNr ] ) ) {
			// The line has been removed
			$this->location->setIndex( -1 );
			return $this->location;
		}


		$newLineNr = $lineMapping[ $this->lineNr ];

		// Get the old and new lines
		$oldLines = explode( PHP_EOL, $this->oldText );
		$newLines = explode( PHP_EOL, $this->newText );

		$oldLine = $oldLines[ $this->lineNr ];
		$newLine = $newLines[ $newLineNr ];

		$word = $this->location->getWord();

		// Check if the word exists at the same position in the new line
		if ( substr_count( $oldLine, $word ) <= 1 ) {
			$wordExistsInNewLine = substr_count( $newLine, $word ) !== 0;
		} else if ( substr_count( $oldLine, $word ) === substr_count( $newLine, $word ) ) {
			$wordExistsInNewLine = true;
		} else {
			$wordExistsInNewLine = substr( $newLine, $this->charIndex, strlen( $word ) ) === $word;
		}


		if ( !$wordExistsInNewLine ) {
			// The word has been changed or removed
			$this->location->setIndex( -1 );
			return $this->location;
		}

		// The word exists at the same position, no change in index
		return $this->location;
	}

	/**
	 * Finds the exact position (line number and character index) of the word in the old text.
	 *
	 * @return array|null
	 */
	private function getExactWordLocation(): ?array {
		$matches = 0;
		$lines = explode( PHP_EOL, $this->oldText );
		$word = htmlspecialchars_decode( $this->location->getWord() );
		$wordIndex = $this->location->getIndex();

		foreach ( $lines as $lineNr => $line ) {
			$lineMatches = substr_count( $line, $word );
			if ( $lineMatches > 0 ) {
				$offset = 0;
				while ( ( $pos = strpos( $line, $word, $offset ) ) !== false ) {
					$matches++;
					if ( $matches == $wordIndex + 1 ) {
						// Found the exact occurrence
						return [
							'lineNr' => $lineNr,
							'charIndex' => $pos,
						];
					}
					$offset = $pos + strlen( $word );
				}
			}
		}
		return null;
	}

	/**
	 * Adjusts the word index in the text based on the differences between the old and new versions.
	 *
	 * @return int|false Returns the difference in the word count between old and new versions if applicable, or false if an insertion was found and the word index was updated.
	 */	private function adjustWordIndexBasedOnDiff() {
		$diffOptions = [
		];
		$renderOptions = [
			'detailLevel' => 'word',
			'outputTagAsString' => true
		];
		$diff = DiffHelper::calculate( $this->oldText, $this->newText, 'Json', $diffOptions, $renderOptions );
		$index = 0;
		$diffArray = json_decode( $diff, true )[ 0 ] ?? [];
		$oldIndexCount = 0;
		$newIndexCount = 0;
		foreach ( $diffArray as $i => $line ) {
			if ( $line[ 'old' ][ 'offset' ] >= $this->lineNr - 1 ) {
				if ( $line[ 'old' ][ 'offset' ] == $this->lineNr ) {
					$index = $i;
				} else {
					$index = $i + 1;
				}
				break;
			}
			foreach ( $line[ 'old' ][ 'lines' ] as $oldLine ) {
				$oldIndexCount += substr_count( $oldLine, $this->location->getWord() );
			}
			foreach ( $line[ 'new' ][ 'lines' ] as $newLine ) {
				$newIndexCount += substr_count( $newLine, $this->location->getWord() );
			}
		}

		# parse the actual last line itself to have more control
		$line = $diffArray[ $index ];
		$oldLine = htmlspecialchars_decode( implode( " ", $line[ 'old' ][ 'lines' ] ) );
		$indexMapOld = $this->getIndexMapping( $oldLine, strip_tags( $oldLine ) );
		$newLine = htmlspecialchars_decode( implode( " ", $line[ 'new' ][ 'lines' ] ) );
		$indexMapNew = $this->getIndexMapping( $newLine, strip_tags( $newLine ) );
		$indexes = $this->isIndexAfter( $oldLine, $indexMapOld, 'del' );
		if ( !is_bool( $indexes ) ) {
			$found = $this->isWordWithinIndexRange( $indexes[ 'ranges' ], $oldLine, $this->location->getWord() );
			if ( $found !== 0 ) {
				if ( $indexes[ 'after' ] ) {
					$this->location->setIndex( $this->location->getIndex() - $found );
				} else {
					$this->location->setIndex( -1 );
				}
			}
			return 0;
		}
		$indexes = $this->isIndexAfter( $newLine, $indexMapNew, 'ins' );
		if ( !is_bool( $indexes ) ) {
			$found = $this->isWordWithinIndexRange( $indexes[ 'ranges' ], $newLine, $this->location->getWord() );
			if ( $found !== 0 ) {
				$this->location->setIndex( $this->location->getIndex() + $found );
				return false;
			}
		}
		if ( $newIndexCount < $oldIndexCount ) {
			return $newIndexCount - $oldIndexCount;
		} else if ( $newIndexCount > $oldIndexCount ) {
			return $oldIndexCount - $newIndexCount;
		}
		return $newIndexCount;
	}

	private function isIndexAfter( $oldLine, $indexMap, $type ) {
		$deletedRanges = $this->findRanges( $oldLine, $type );

		$mappedIndex = $indexMap[ $this->charIndex ];

		if ( empty( $deletedRanges ) ) {
			return false;
		}
		foreach ( $deletedRanges as $range ) {
			$delStart = $range[ 'start' ];
			$delEnd = $range[ 'end' ];

			// Check if the index falls within this deleted range
			if ( $mappedIndex >= $delStart && $mappedIndex < $delEnd ) {
				return [ 'after' => false, 'ranges' => [ $range ] ];
			}
		}

		// Check if the index is after the last deleted section
		$lastDelEnd = $deletedRanges[ count( $deletedRanges ) - 1 ][ 'end' ];
		if ( $mappedIndex >= $lastDelEnd ) {
			return [ 'after' => true, 'ranges' => $deletedRanges ];
		}

		// If none of the conditions are met, it's before all deleted sections
		return false;
	}

	private function findRanges( $str, $type ) {
		$ranges = [];
		$offset = 0;

		while ( ( $delStart = strpos( $str, "<{$type}>", $offset ) ) !== false ) {
			$delEnd = strpos( $str, "</{$type}>", $delStart ) + 6; // Include the closing </del>

			$ranges[] = [ 'start' => $delStart, 'end' => $delEnd ];

			// Move the offset forward to continue searching
			$offset = $delEnd;
		}

		return $ranges;
	}

	private function isWordWithinIndexRange( $ranges, $string, $word ) {
		$amount = 0;
		foreach ( $ranges as $range ) {
			$amount += substr_count( substr( $string, $range[ 'start' ], $range[ 'end' ] ), $word );
		}
		return $amount;
	}

	private function getIndexMapping( $strWithTags, $plainStr ) {
		$map = [];
		$tagOffset = 0;

		// Iterate through the plain string and map each character to its original index
		for ( $i = 0, $j = 0; $i < strlen( $plainStr ); $i++, $j++ ) {
			// If we encounter an opening < character, we skip the HTML tag
			if ( $strWithTags[ $j ] === '<' ) {
				// Move forward until we pass the tag
				while ( $strWithTags[ $j ] !== '>' ) {
					$j++;
				}
				$j++; // Move past the '>'
			}
			$map[ $i ] = $j; // Keep track of where each character in the plain string maps to in the original
		}
		return $map;
	}

	/**
	 * Creates a mapping of old line numbers to new line numbers based on the diff between old and new words in the text.
	 *
	 * @return array
	 */
	private function getWordMapping() {
		$diffOptions = [
			'context' => 0,
		];
		$renderOptions = [
			'detailLevel' => 'word',
			'outputTagAsString' => true
		];
		$diff = DiffHelper::calculate( $this->oldText, $this->newText, 'Json', $diffOptions, $renderOptions );
		$diffArray = json_decode( $diff, true );

		$lineMapping = [];
		$oldLineNr = 0;
		$newLineNr = 0;

		foreach ( array_merge( ...$diffArray ) as $difference ) {
			$tag = $difference['tag'];
			$oldLines = $difference['old']['lines'];
			$newLines = $difference['new']['lines'];
			$oldCount = $difference['old']['offset'];
			$newCount = $difference['new']['offset'];

			if ( $tag === 'eq' ) {
				for ( $i = 0; $i < $oldCount; $i++ ) {
					$lineMapping[ $oldLineNr++ ] = $newLineNr++;
				}
			} elseif ( $tag === 'del' ) {
				for ( $i = 0; $i < $oldCount; $i++ ) {
					$lineMapping[ $oldLineNr++ ] = null; // Line deleted
				}
			} elseif ( $tag === 'ins' ) {
				$newLineNr += $newCount;
			} elseif ( $tag === 'rep' ) {
				for ( $i = 0; $i <= $oldCount; $i++ ) {
					if ( $i <= $newCount ) {
						$lineMapping[ $oldLineNr++ ] = $newLineNr++;
					} else {
						$lineMapping[ $oldLineNr++ ] = null; // Line deleted
					}
				}
				if ( $newCount > $oldCount ) {
					$newLineNr += ( $newCount - $oldCount );
				}
			}
		}

		return $lineMapping;
	}
}
