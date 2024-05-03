<?php

require_once( getcwd() . '/maintenance/Maintenance.php' );

class SmartCommentsMaintenance extends Maintenance {

	public function execute() {
		$minifiedScript = "";
		foreach( \MediaWiki\Extension\SmartComments\JavascriptLoader::$packageFiles as $file ) {
			$file = __DIR__ . '/../' . $file;
			$file = file_get_contents( $file );
			$minifiedScript .= $file .';';
		}

		$minifier = new Wikimedia\Minify\JavaScriptMinifier();

		file_put_contents(
			__DIR__ .'/../resources/js/SmartComments.min.js',
			$minifier->minify(
				$minifiedScript
			)
		);

	}
}

$maintClass = "SmartCommentsMaintenance";
require_once RUN_MAINTENANCE_IF_MAIN;
