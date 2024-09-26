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

		$newIndex = $this->location->getIndex();
		$newIndex += $newMatches;
		$newIndex -= $deleteMatches;


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
				$nrOfActualMatches += substr_count( $text, $line );
			}
		}

		return $nrOfActualMatches;
	}

	/**
	 * @return false|string
	 */
	public function getDiffArray(): array {
		$renderOptions = [
			'outputTagAsString' => true
		];
		$diffOptions = [];
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
		$counter = 0;
		$replaced = false;
		$location = $this->location;
		$safeWord = preg_quote( htmlspecialchars_decode( $location->getWord() ) );
		// for some reason / doesn't get escaped so do string replace for that character
		$safeWord = str_replace( "/", "\/", $safeWord );

		preg_replace_callback( "/{$safeWord}/", function( $m ) use ( &$counter, &$replaced, $location ) {
			if ( $counter == $location->getIndex() ) {
				$replaced = true;
			}
			$counter++;
			return $m[0];
		}, $text );

		return $replaced;
	}

}