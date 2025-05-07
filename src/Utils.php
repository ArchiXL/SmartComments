<?php

namespace MediaWiki\Extension\SmartComments;

use SMW\DIWikiPage;
use SMWDataItem;
use SMW\DIProperty;
use SMWQueryProcessor;

class Utils {

	/**
	 * This function performs an SMW query and returns the resulting page set.
	 *
	 * @param string $queryString								The full query string to process
	 * @param int $limit									The maximum number of results. Defaults to 10000
	 * @param int $offset									Number of results to skip. Defaults to 0
	 * @return array										An array of SMWDIWikiPage
	 */
	public static function queryForPages( string $queryString, int $limit = 10000, int $offset = 0 ): array {
		$store = smwfGetStore();
		$queryparams = [ 'limit' => $limit, 'offset' => $offset ];
		$query = SMWQueryProcessor::createQuery( $queryString, SMWQueryProcessor::getProcessedParams( $queryparams ) );
		$smwQueryResult = $store->getQueryResult( $query );
		return $smwQueryResult->getResults();
	}

	/**
	 * This function returns the property values for the given page and property in an array.
	 *
	 * @param DIWikiPage $page			The page to retrieve the properties from
	 * @param string $propertyname			The name of the property
	 * @param boolean $inverse				Indicates whether the inverse property is to be queried for
	 * @return array						An array containing the property values; empty array if not found.
	 */
	public static function getPropertyValues( $page, $propertyname, $inverse = false ) {
		$values = [];
		$store = smwfGetStore();
		if (!empty($store)) {
			$property = DIProperty::newFromUserLabel($propertyname, $inverse);
			$propvalues = $store->getPropertyValues($page, $property);
			if (!empty($propvalues)) {
				foreach ($propvalues as $propvalue) {
					switch ($propvalue->getDIType()) {
						case SMWDataItem::TYPE_BLOB:
							$values[] = $propvalue->getString();
							break;
						case SMWDataItem::TYPE_NUMBER:
							$values[] = $propvalue->getNumber();
							break;
						case SMWDataItem::TYPE_WIKIPAGE:
							$values[] = $propvalue->getTitle()->getFullText();
							break;
						case SMWDataItem::TYPE_TIME:
							$values[] = \SMW\DataValueFactory::newDataItemValue($propvalue, null)->getISO8601Date();
							break;
						case SMWDataItem::TYPE_URI:
							$values[] = $propvalue->getURI();
							break;
						case SMWDataItem::TYPE_BOOLEAN:
							$values[] = $propvalue->getBoolean();
							break;
						default:
							$values[] = "Cannot process value of type " . $propvalue->getDIType();
					}
				}
			}
		}

		return $values;
	}

	/**
	 * This function returns the property value for the given page and property. If the property
	 * contains multiple values, only the first value is returned.
	 *
	 * @param DIWikiPage $page			The page to retrieve the properties from
	 * @param string $propertyname			The name of the property
	 * @param boolean $inverse				Indicates whether the inverse property is to be queried for
	 * @return string						A string containing the property value; false if not found.
	 */
	public static function getPropertyValue( $page, $propertyname, $inverse = false ) {
		$values = self::getPropertyValues( $page, $propertyname, $inverse );
		return reset( $values );
	}

}