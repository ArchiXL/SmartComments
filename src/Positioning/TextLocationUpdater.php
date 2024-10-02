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

		// Set index to -1 if the text can't be found in the new revision (can't be localised).
		if ( ! $this->getLocationMatchesOnText( $this->newText ) ) {
			$this->location->setIndex( -1 );
			return $this->location;
		}

		$wordOnCurrentLineNr = $this->getLineNrBasedOnTextLocation();
		if ( !$wordOnCurrentLineNr ) {
			throw new \InvalidArgumentException( "The given TextLocation could not be matched against old revision text" );
		}

		$differencesList = $this->getDiffArray();
		if ( count( $differencesList ) === 0 ) {
			return $this->location;
		}

		foreach( $differencesList as $listKey => $differenceItem ) {
			// Filter all equal differences and remove offsets greater than the current location
			$differencesList[ $listKey ] = array_filter( $differenceItem, function( $difference ) use ( $wordOnCurrentLineNr ) {
				return $difference['tag'] !== 'eq' || $difference['old']['offset'] > $wordOnCurrentLineNr;
			} );
		}

		$newMatches = 0;
		$deleteMatches = 0;
		foreach ( array_merge(...$differencesList) as $difference ) {
			$deleteMatches += $this->getNumMatches( implode( PHP_EOL, $difference['old']['lines'] ) );
			$newMatches += $this->getNumMatches( implode( PHP_EOL, $difference['new']['lines'] ), 'new' );

		}
		//dd($deleteMatches, $newMatches, $this->location, $differencesList);

		if ( $deleteMatches !== 1 ) {
			$newIndex = $this->location->getIndex();
			$newIndex += $newMatches;
			$newIndex -= $deleteMatches;
		} else {
			$newIndex = -1;
		}


		// Update the index to set the new location
		$this->location->setIndex( $newIndex );

		return $this->location;
	}

	/**
	 * @param $text
	 * @return array
	 */
	private function getNumMatches( $text, $mode = 'del' ): int {
		$nrOfActualMatches = 0;
		$regex = $mode === 'del'
			? '/\<(del)\>(.*)\<\/(del)\>/m'
			: '/\<(ins|rep)\>(.*)\<\/(ins|rep)\>/m';

		// Match all insertions and replacements
		preg_match_all( $regex, $text, $matches );
		if ( $matches ) {
			foreach ( $matches[2] as $line ) {
				$nrOfActualMatches += substr_count( $line, $this->location->getWord() );
			}
		}

		return $nrOfActualMatches;
	}

	/**
	 * @return false|string
	 */
	public function getDiffArray(): array {
		$renderOptions = [
			'outputTagAsString' => true,
			'detailLevel' => 'word'
		];
		$diffOptions = ['fullContextIfIdentical' => true];
		$calculatedDiff = DiffHelper::calculate( $this->oldText, $this->newText, 'Json', $diffOptions, $renderOptions );
		$differences = json_decode( $calculatedDiff, true );
		return $differences;
	}

	/**
	 * @param string|null $againstText
	 * @return array|false
	 */
	private function getLineNrBasedOnTextLocation( $againstText = null ): ?array {
		$matches = 0;
		$lines = explode( PHP_EOL, $againstText === null ? $this->oldText : $againstText );
		foreach ( $lines as $lineNr => $line ) {
			$matches += substr_count( $line, htmlspecialchars_decode( $this->location->getWord() ) );
			if ( $matches >= $this->location->getIndex() ) {
				return [
					'lineNr' => $lineNr,
					'context' => $line
				];
			}
		}
		return null;
	}

	/**
	 * @param $text
	 * @return bool
	 */
	private function getLocationMatchesOnText( $text ): bool {
		$location = $this->location;
		$oldLineData = $this->getLineNrBasedOnTextLocation( $this->oldText );

		// Use the diff to map the old line number to the new line number
		$lineMapping = $this->getLineMapping();
		if ( !isset( $lineMapping[$oldLineData['lineNr']] ) ) {
			return false; // Line has been removed
		}
		$newLineNr = $lineMapping[$oldLineData['lineNr']];

		$lines = explode( PHP_EOL, $text );
		if ( !isset( $lines[$newLineNr] ) ) {
			return false; // Line doesn't exist in new text
		}
		$newLine = $lines[$newLineNr];
		$safeWord = htmlspecialchars_decode( $location->getWord() );

		return strpos( $newLine, $safeWord ) !== false;
	}

	/**
	 * @return array
	 */
	private function getLineMapping(): array {
		// Use the diff to create a mapping of old line numbers to new line numbers
		// This is a simplified example and may need adjustment based on your diff library's capabilities
		$diff = DiffHelper::calculate( $this->oldText, $this->newText, 'Unified' );
		$lines = explode( PHP_EOL, $diff );
		$lineMapping = [];
		$oldLineNr = 0;
		$newLineNr = 0;

		foreach ( $lines as $line ) {
			if ( strpos( $line, '-' ) === 0 ) {
				// Line removed in new text
				$lineMapping[$oldLineNr ++] = null;
			} elseif ( strpos( $line, '+' ) === 0 ) {
				// Line added in new text
				$newLineNr ++;
			} else {
				// Line unchanged
				$lineMapping[$oldLineNr ++] = $newLineNr ++;
			}
		}

		return $lineMapping;
	}


}