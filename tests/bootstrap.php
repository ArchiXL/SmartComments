<?php

if ( PHP_SAPI !== 'cli' && PHP_SAPI !== 'phpdbg' ) {
	die( 'Not an entry point' );
}

error_reporting( E_ALL | E_STRICT );
date_default_timezone_set( 'UTC' );
ini_set( 'display_errors', 1 );

if ( !defined( 'SMW_PHPUNIT_AUTOLOADER_FILE' ) || !is_readable( SMW_PHPUNIT_AUTOLOADER_FILE ) ) {
	die( "\nThe Semantic MediaWiki test autoloader is not available" );
}

/** @var \Composer\Autoload\ClassLoader $autoloader */
$autoloader = require SMW_PHPUNIT_AUTOLOADER_FILE;
$autoloader->addPsr4( 'SmartComments\\Tests\\', __DIR__ . '/phpunit' );

// We pass --bootstrap explicitly (see composer.json) so that MediaWiki's own
// entry point doesn't override it with its default bootstrap.maintenance.php,
// which would skip the SMW/PSR-4 registration above. Chain-require it here so
// its MediaWikiIntegrationTestCase teardown hook still runs.
if ( defined( 'MW_INSTALL_PATH' ) ) {
	$mwBootstrap = MW_INSTALL_PATH . '/tests/phpunit/bootstrap.maintenance.php';
	if ( is_readable( $mwBootstrap ) ) {
		require_once $mwBootstrap;
	}
}
