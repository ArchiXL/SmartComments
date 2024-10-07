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

		if ( $newIndex = $this->test() !== 0 ) {
			$this->location->setIndex( $this->location->getIndex() + $newIndex);
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

	// TODO: NAME THE FUNCTION
	private function test() {
		$diffOptions = [
		];
		$renderOptions = [
			'detailLevel' => 'word',
			'outputTagAsString' => true
		];
		$diff = DiffHelper::calculate( $this->oldText, $this->newText, 'Json', $diffOptions, $renderOptions );
		$diffArray = json_decode( $diff, true )[0] ?? [];
		$oldIndexCount = 0;
		$newIndexCount = 0;
		foreach( $diffArray as $line ) {
			if ( ( $line['old']['offset'] >= $this->lineNr - 1 ) ) {
				break;
			}
			foreach( $line[ 'old' ][ 'lines' ] as $oldLine ) {
				$oldIndexCount += substr_count( $oldLine, $this->location->getWord() );
			}
			foreach( $line[ 'new' ][ 'lines' ] as $newLine ) {
				$newIndexCount += substr_count( $newLine, $this->location->getWord() );
			}
		}
		if ( $newIndexCount < $oldIndexCount ) {
			return $newIndexCount - $oldIndexCount;
		} else if ( $newIndexCount > $oldIndexCount ) {
			return $oldIndexCount - $newIndexCount;
		}
		return $newIndexCount;
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
