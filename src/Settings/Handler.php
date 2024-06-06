<?php

namespace MediaWiki\Extension\SmartComments\Settings;

class Handler {

	private const SMARTCOMMENTS_LOCKFILE = "smartcomments-lock";

	private static function getLockFilePath() : string {
		return wfTempDir() . self::SMARTCOMMENTS_LOCKFILE;
	}

	public static function toggleBlockedMode() : void {
		if ( self::isCommentModeBlocked() ) {
			if ( !unlink( self::getLockFilePath() ) ) {
				wfDebugLog( 'SmartComments', "Could not delete SmartComments lockfile! Check file permissions." );
			}
		} else {
			if ( file_put_contents( self::getLockFilePath(), "" ) === false ) {
				wfDebugLog( 'SmartComments', "Could not create SmartComments lockfile! Check file permissions." );
			}
		}
	}

	public static function isCommentModeBlocked() : bool {
		return file_exists( self::getLockFilePath() );
	}
}
