<?php

namespace MediaWiki\Extension\SmartComments;

use ApiBase;
use MediaWiki\Extension\SmartComments\SemanticInlineComment as SIC;
use MediaWiki\Extension\SmartComments\Settings\Handler;
use MediaWiki\Extension\SmartComments\Store\ImageSaver;
use MWException;
use Title;
use Wikimedia\ParamValidator\ParamValidator;

class Api extends ApiBase {
	const RES_MODULE = 'smartcomments';
	const RES_SUCCESS = 'success';
	const RES_MESSAGE = 'message';
	const RES_ANCHORS = 'anchors';
	const RES_COMMENT = 'comment';
	const RES_COMMENTS = 'comments';
	const PARAM_METHOD = 'method';
	const PARAM_METHOD_NEW = 'new';
	const PARAM_METHOD_UPDATE = 'update';
	const PARAM_METHOD_DELETE = 'delete';
	const PARAM_METHOD_GET = 'get';
	const PARAM_METHOD_LIST_ANCHORS = 'lista';
	const PARAM_METHOD_LIST_COMMENTS = 'listc';
	const PARAM_METHOD_ADD_COMMENT = 'addcomment';
	const PARAM_METHOD_IN_BLOCKED_MODE = 'blockedmode';
	const PARAM_POS = 'pos';
	const PARAM_TEXT = 'text';
	const PARAM_REV = 'rev';
	const PARAM_PAGE = 'page';
	const PARAM_STATUS = 'status';
	const PARAM_COMMENT = 'comment';
	const PARAM_IMAGE = 'image';
	const PERMISSION_MANAGE_COMMENTS = 'manage-inlinecomments';
	const PERMISSION_ADD_COMMENTS = 'add-inlinecomments';

	/**
	 * SmartCommentsAPIBase
	 *
	 * @throws MWException
	 */
	public function execute() {
		$givenParams = $this->extractRequestParams();

		if ( isset( $givenParams[self::PARAM_METHOD] ) ) {
			switch ( $givenParams[self::PARAM_METHOD] ) {
				case self::PARAM_METHOD_NEW:
					$this->doNew();
					break;
				case self::PARAM_METHOD_UPDATE:
					$this->doUpdate();
					break;
				case self::PARAM_METHOD_DELETE:
					$this->doDelete();
					break;
				case self::PARAM_METHOD_GET:
					$this->doGet();
					break;
				case self::PARAM_METHOD_LIST_ANCHORS:
					$this->doListAnchors();
					break;
				case self::PARAM_METHOD_LIST_COMMENTS:
					$this->doListComments();
					break;
				case self::PARAM_METHOD_IN_BLOCKED_MODE:
					$this->getBlockedMode();
					break;
				default:
					$this->addError( 'smartcomments-api-error-invalid-method' );
					break;
			}
		} else {
			$this->addError( 'smartcomments-api-error-no-method' );
		}
	}

	/**
	 * Creates a new comment
	 */
	private function doNew() {
		if ( !$this->getUser()->isRegistered() ) {
			$this->addError( 'smartcomments-api-new-error-no-session' );
			return;
		}
		if ( !$this->getUser()->isAllowed( self::PERMISSION_ADD_COMMENTS ) ) {
			$this->addError( 'smartcomments-api-delete-error-no-permission' );
			return;
		}

		$pos = $this->getRequest()->getVal( self::PARAM_POS );
		$text = $this->getRequest()->getVal( self::PARAM_TEXT );
		$page = $this->getRequest()->getVal( self::PARAM_PAGE );
		$parent = $this->getRequest()->getVal( self::PARAM_COMMENT );
		$img = $this->getRequest()->getVal( self::PARAM_IMAGE );

		if ( empty( $text ) || ( empty( $parent ) && ( empty( $page ) || empty( $pos ) ) ) ) {
			$this->addError( 'smartcomments-api-new-error-incomplete-post' );
		} else {
			if ( empty( $parent ) ) {
				// Root comment, check for valid page name
				$title = Title::newFromText( $page );
				$imageSaver = new ImageSaver( $title );
				if ( !$title->exists() ) {
					$this->addError( 'smartcomments-api-new-error-invalid-page' );
				} else {
					$sic = new SIC();
					$sic->setPage( $page );
					$sic->setPosition( $pos );
					$sic->setRevision( $title->getLatestRevID() );
					$sic->setStatus( SIC::STATUS_OPEN );

					$imageName = $imageSaver->save( $img );
					if ( $imageName === null ) {
						$this->addError( 'smartcomments-api-new-error-invalid-image' );
						unset( $sic );
					} else {
						$sic->setPositionImage( $imageName );
					}
				}
			} else {
				// Reply comment
				$sic = new SIC();
				$sic->setParent( $parent );
			}

			if ( isset( $sic ) ) {
				$sic->setAuthor( $this->getUser() );
				$sic->setDatetime( wfTimestampNow() );
				$sic->setModifiedBy( $this->getUser() );
				$sic->setModifiedDateTime( $sic->getDatetime() );
				$sic->setText( $text );

				// Insert comment into the database
				$result = DBHandler::insertComment( $sic );
				if ( !$result ) {
					$this->addError( 'smartcomments-api-new-error-insert' );
				} else {
					if ( \ExtensionRegistry::getInstance()->isLoaded( 'SemanticMediaWiki' ) ) {
						if ( !isset( $title ) || !$title ) {
							$title = Title::newFromText( $page );
						}
						// Force page update job to create a subobject for the new comment
						SMWHandler::createPageUpdateJob( $title );
					}

					$this->getResult()->addValue( self::RES_MODULE, self::RES_SUCCESS, '1' );
					$this->getResult()->addValue( self::RES_MODULE, self::RES_COMMENT, $result );
				}
			}
		}
	}

	private function doUpdate() {
		if ( !$this->getUser()->isRegistered() ) {
			$this->addError( 'smartcomments-api-update-error-no-session' );
			return;
		}
		$status = $this->getRequest()->getVal( self::PARAM_STATUS, '' );
		$commentId = $this->getRequest()->getVal( self::PARAM_COMMENT );
		// User must have manage-inlinecomments permission to change status
		if ( !( empty( $status ) || $this->getUser()->isAllowed( self::PERMISSION_MANAGE_COMMENTS ) ) ) {
			$this->addError( 'smartcomments-api-update-error-no-permission' );
		}

		// User must have manage-inlinecomments permission or must be comment owner to change comment text
		if ( !$this->getUser()->isAllowed( self::PERMISSION_MANAGE_COMMENTS ) ) {
			$sic = DBHandler::selectCommentById( $commentId );
			if ( !( $sic instanceof SIC ) || ( $sic->getAuthor() != $this->getUser() ) ) {
				$this->addError( 'smartcomments-api-update-error-no-permission' );
				return;
			}
		}

		// Check validity of parameters
		$text = $this->getRequest()->getVal( self::PARAM_TEXT, '' );
		if ( $commentId === null || !( empty( $text ) xor empty( $status ) ) ||
			( empty( $text ) && !in_array( $status, [ SIC::STATUS_OPEN, SIC::STATUS_COMPLETED ] ) ) ) {
			$this->addError( "smartcomments-api-update-error-incorrect-parms ($commentId)" );
			return;
		}

		if ( empty( $status ) ) {
			$field = DBHandler::DB_COLUMN_TEXT;
			$value = $text;
		} else {
			$field = DBHandler::DB_COLUMN_STATUS;
			$value = $status;
		}
		$result = DBHandler::updateComment( $commentId, $this->getUser(), wfTimestampNow(), $field, $value );
		if ( $result === true ) {
			// Force page update job to modify the corresponding subobject, if page is provided
			if ( \ExtensionRegistry::getInstance()->isLoaded( 'SemanticMediaWiki' ) ) {
				$page = $this->getRequest()->getVal( self::PARAM_PAGE );
				if ( !empty( $page ) ) {
					$title = Title::newFromText( $page );
					SMWHandler::createPageUpdateJob( $title );
				}
			}
			$this->getResult()->addValue( self::RES_MODULE, self::RES_SUCCESS, '1' );
		} else {
			$this->addError( "smartcomments-api-update-error" );
		}
	}

	private function doDelete() {
		if ( !$this->getUser()->isRegistered() ) {
			$this->addError( 'smartcomments-api-delete-error-no-session' );
			return;
		}
		$commentId = $this->getRequest()->getVal( self::PARAM_COMMENT );
		// User must have manage-inlinecomments permission or must be comment owner
		if ( !$this->getUser()->isAllowed( self::PERMISSION_MANAGE_COMMENTS ) ) {
			$sic = DBHandler::selectCommentById( $commentId );
			if ( !( $sic instanceof SIC ) || ( $sic->getAuthor() != $this->getUser() ) ) {
				$this->addError( 'smartcomments-api-delete-error-no-permission' );
				return;
			}
		}

		if ( $commentId === null ) {
			$this->addError( "smartcomments-api-delete-error-incorrect-parms ($commentId)" );
			return;
		}

		$result = DBHandler::deleteComment( $commentId );
		if ( $result === true ) {
			$page = $this->getRequest()->getVal( self::PARAM_PAGE );
			if ( !empty( $page ) ) {
				$title = Title::newFromText( $page );
				if ( count( DBHandler::selectCommentsByPage( $page ) ) < 1 ) {
					$page = \MediaWiki\MediaWikiServices::getInstance()->getWikiPageFactory()->newFromTitle( $title );
					DBHandler::deleteDiffTableEntry( $page->getId() );
				}
			}
			$this->getResult()->addValue( self::RES_MODULE, self::RES_SUCCESS, '1' );
		} else {
			$this->addError( "smartcomments-api-delete-error ($commentId)" );
		}
	}

	private function doGet() {
		if ( !$this->getUser()->isRegistered() ) {
			$this->addError( 'smartcomments-api-get-error-no-session' );
			return;
		}

		$commentId = $this->getRequest()->getVal( self::PARAM_COMMENT );
		if ( $commentId === null ) {
			$this->addError( "smartcomments-api-get-error-no-commentid" );
			return;
		}

		$sic = DBHandler::selectCommentById( $commentId );
		if ( $sic instanceof SIC ) {
			$this->getResult()->addValue( self::RES_MODULE, self::RES_SUCCESS, '1' );
			$this->getResult()->addValue( self::RES_MODULE, self::RES_COMMENT, $sic->toArray() );
		} else {
			$this->addError( "smartcomments-api-get-error-comment-not-found" );
		}
	}

	private function doListComments() {
		$pageName = $this->getRequest()->getText( self::PARAM_PAGE, '' );
		$filter = $this->getRequest()->getVal( self::PARAM_STATUS, '' );
		if ( empty( $pageName ) || !in_array( $filter, [ SIC::STATUS_OPEN, SIC::STATUS_COMPLETED, '' ] ) ) {
			$this->addError( "smartcomments-api-list-error-incorrect-parms" );
		} else {
			$sics = DBHandler::selectCommentsByPage( $pageName, $filter );
			$comments = [];
			foreach ( $sics as $sic ) {
				$comments[] = $sic->toArray();
			}

			$this->getResult()->addValue( self::RES_MODULE, self::RES_SUCCESS, '1' );
			$this->getResult()->addValue( self::RES_MODULE, self::RES_COMMENTS, $comments );
		}
	}

	private function doListAnchors() {
		$pageName = $this->getRequest()->getText( self::PARAM_PAGE, '' );
		$filter = $this->getRequest()->getVal( self::PARAM_STATUS, '' );
		$rev = $this->getRequest()->getVal( self::PARAM_REV, '' );
		if ( empty( $pageName ) || !in_array( $filter, [ SIC::STATUS_OPEN, SIC::STATUS_COMPLETED, '' ] ) ) {
			$this->addError( "smartcomments-api-list-error-incorrect-parms" );
		} else {
			$anchors = (array)DBHandler::selectAnchorsByPage( $pageName, $filter );
			if ( $rev !== '' ) {
				$anchors = array_filter( $anchors, static function ( $item ) use ( $rev ) {
					return $rev === $item['rev_id'];
				} );
			}

			$this->getResult()->addValue( self::RES_MODULE, self::RES_SUCCESS, '1' );
			$this->getResult()->addValue( self::RES_MODULE, self::RES_ANCHORS, $anchors );
		}
	}

	private function getBlockedMode() {
		$status = Handler::isCommentModeBlocked();

		$this->getResult()->addValue(
			self::RES_MODULE,
			self::RES_MESSAGE,
			$status ? 'true' : 'false'
		);
	}

	/**
	 * Get allowed parameters
	 *
	 * @return array
	 */
	public function getAllowedParams() {
		return [
			self::PARAM_METHOD => [
				ParamValidator::PARAM_REQUIRED => true,
				ParamValidator::PARAM_TYPE => [ self::PARAM_METHOD_LIST_ANCHORS,
					self::PARAM_METHOD_LIST_COMMENTS,
					self::PARAM_METHOD_NEW,
					self::PARAM_METHOD_DELETE,
					self::PARAM_METHOD_UPDATE,
					self::PARAM_METHOD_GET,
					self::PARAM_METHOD_ADD_COMMENT,
					self::PARAM_METHOD_IN_BLOCKED_MODE
				],
				ParamValidator::PARAM_ISMULTI => false,
			],
			self::PARAM_COMMENT => [
				ParamValidator::PARAM_ISMULTI => false,
			],
			self::PARAM_PAGE => [
				ParamValidator::PARAM_ISMULTI => false,
			],
			self::PARAM_TEXT => [
				ParamValidator::PARAM_ISMULTI => false,
			],
			self::PARAM_POS => [
				ParamValidator::PARAM_ISMULTI => false,
			],
			self::PARAM_IMAGE => [
				ParamValidator::PARAM_ISMULTI => false,
			],
			self::PARAM_REV => [
				ParamValidator::PARAM_ISMULTI => false
			],
			self::PARAM_STATUS => [
				ParamValidator::PARAM_TYPE => [ SIC::STATUS_OPEN, SIC::STATUS_COMPLETED ],
				ParamValidator::PARAM_ISMULTI => false,
			]
		];
	}

	/**
	 * Get example messages
	 *
	 * @return array
	 */
	public function getExamplesMessages() {
		return [
			'action=smartcomments&method=list' => 'smartcomments-api-help-list',
			'action=smartcomments&method=new' => 'smartcomments-api-help-new'
		];
	}

	public function addError( $msg, $code = null, $data = null ) {
		$this->getResult()->addValue( self::RES_MODULE, self::RES_SUCCESS, '0' );
		$this->getResult()->addValue( self::RES_MODULE, self::RES_MESSAGE, $msg );
	}
}
