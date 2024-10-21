<?php

namespace MediaWiki\Extension\SmartComments;

class SchemaUpdates {

	/**
	 * Fired when MediaWiki is updated to allow extensions to update the database
	 *
	 * @param null|\DatabaseUpdater $updater
	 * @return boolean
	 */
	public static function onLoadExtensionSchemaUpdates( $updater = null ) {
		$schemaDirectory = dirname( __FILE__ ) . '/../schemas/';
		// Init tables
		$updater->addExtensionUpdate(["addTable", "sic_data", "{$schemaDirectory}/sic_data.sql", true]);
		$updater->addExtensionUpdate(["addTable", "sic_anchor", "{$schemaDirectory}/sic_anchor.sql", true]);
		$updater->addExtensionUpdate(["addTable", "sic_diff_table", "{$schemaDirectory}/sic_diff_table.sql", true]);
		// Change tables
		$updater->modifyExtensionField(
			"sic_data",
			"text",
			"{$schemaDirectory}/updates/alter-sic_data-text.sql"
		);
		$updater->addExtensionField(
			"sic_anchor",
			"posimg",
			"{$schemaDirectory}/updates/alter-sic_anchor-posimg.sql"
		);
		return true;
	}
}

