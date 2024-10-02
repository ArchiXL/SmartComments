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

	/**
	 * @param string $oldText
	 * @param string $newText
	 * @param TextLocation $location
	 */
	public function __construct( $oldText, $newText, TextLocation $location) {
		$this->oldText = $oldText;
		$this->newText = $newText;
		$this->location = $location;
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

		$wordLocationInOldText = $this->getExactWordLocation();
		if ( !$wordLocationInOldText ) {
			throw new \InvalidArgumentException( "The given TextLocation could not be matched against old revision text" );
		}

		$lineNr = $wordLocationInOldText['lineNr'];
		$charIndex = $wordLocationInOldText['charIndex'];

		// Get the mapping of old lines to new lines
		$lineMapping = $this->getWordMapping();

		if ( !isset( $lineMapping[ $lineNr ] ) ) {
			// The line has been removed
			$this->location->setIndex( -1 );
			return $this->location;
		}

		$newLineNr = $lineMapping[ $lineNr ];

		// Get the old and new lines
		$oldLines = explode( PHP_EOL, $this->oldText );
		$newLines = explode( PHP_EOL, $this->newText );

		$oldLine = $oldLines[ $lineNr ];
		$newLine = $newLines[ $newLineNr ];

		$word = $this->location->getWord();

		// Check if the word exists at the same position in the new line
		$wordExistsInNewLine = substr( $newLine, $charIndex, strlen( $word ) ) === $word;

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
	 * Creates a mapping of old line numbers to new line numbers based on the diff between old and new words in the text.
	 *
	 * @return array
	 */
	private function getWordMapping(): array {
		$diffOptions = [
			'context' => 0,
		];
		$renderOptions = [
			'detailLevel' => 'word',
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
			$oldCount = count( $oldLines );
			$newCount = count( $newLines );

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
				for ( $i = 0; $i < $oldCount; $i++ ) {
					if ( $i < $newCount ) {
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
