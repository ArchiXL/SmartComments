<?php

namespace MediaWiki\Extension\SmartComments\SpecialPage;

use Html;
use MediaWiki\Extension\SmartComments\SMWHandler;
use MediaWiki\Extension\SmartComments\Utils;
use MediaWiki\MediaWikiServices;
use MWException;
use OOUI;
use OOUI\ButtonWidget;
use OOUI\Exception;
use RequestContext;
use MediaWiki\Extension\SmartComments\DBHandler;
use MediaWiki\Extension\SmartComments\SemanticInlineComment as SIC;
use MediaWiki\Extension\SmartComments\Settings\Handler;
use SpecialPage;
use Title;
use Xml;

class Special extends SpecialPage {

	private const PERMISSION_VIEW_SIC = 'add-inlinecomments';
	private const PERMISSION_MANAGE_SIC = 'manage-inlinecomments';

	private const REQ_BLOCKED_MODE = 'toggleBlockedMode';
	private const REQ_DELETE_COMPLETED = 'deleteCompleted';
	private const REQ_DELETE_ALL = 'deleteAll';
	private const FILTER_COMPLETED = 'completed';
	private const FILTER_ALL = 'all';
	private const ACTION_DELETE = 'delete';
	private const ACTION_REOPEN = 'reopen';
	private const ACTION_COMPLETED = 'completed';

	private const TAB_ID_OVERVIEW = "overview";
	private const TAB_ID_HELP = "help";

	private CommentsFilter $commentsFilter;
	private bool $canManage = false;

	/**
	 * @inheritDoc
	 */
    public function __construct() {
		parent::__construct( 'SmartComments' );
    }

	/**
	 * @inheritDoc
	 * @throws MWException|Exception
	 */
    public function execute( $title ) {
		$user = RequestContext::getMain()->getUser();
		$out = $this->getOutput();
		$request = $this->getRequest();

		if ( $title == 'ReleaseNotes' ) { // Show releasenotes
			$out->setPageTitle( wfMessage( 'smartcomments' )->parse() . " - Release Notes" );
			$out->addWikiTextAsContent( "<small>{{int: sic-rn-backto}} [[Special:SmartComments]]</small>" );
			$out->addWikiTextAsContent( file_get_contents( __DIR__ . "/../../ReleaseNotes.wiki" ) );
			return;
		} else if ( $title == ( $manualTitle = wfMessage( "sic-manual" )->text() ) ) { // Show manual
			$out->setPageTitle( 'SmartComments ' . $manualTitle );
			$out->addHTML( $this->getHelpTab() );
			return;
		}

		$out->setPageTitle( wfMessage( 'sic-sp-title' )->text() );
		$out->enableOOUI();
		$out->addModuleStyles( [ 'oojs-ui-core', 'oojs-ui.styles.icons-moderation', 'oojs-ui.styles.icons-alerts', 'oojs-ui.styles.icons-interactions' ] );
		$out->addModules( 'ext.smartcomments' );
		$out->addModules( 'ext.SmartComments.Special' );

		$mwPermissionManager = MediaWikiServices::getInstance()->getPermissionManager();
		$canView = $mwPermissionManager->userHasRight( $user, self::PERMISSION_VIEW_SIC );
		$this->canManage = $mwPermissionManager->userHasRight( $user, self::PERMISSION_MANAGE_SIC );

		if ( $canView || $this->canManage ) {
			$this->commentsFilter = CommentsFilter::newFromWebRequest( $request );

			if ( $this->canManage && $request->wasPosted() ) {
				if ( $request->getCheck( self::REQ_BLOCKED_MODE ) ) {
					Handler::toggleBlockedMode();
				} else if ( $request->getCheck( self::REQ_DELETE_COMPLETED ) ) {
					$this->deleteComments( self::FILTER_COMPLETED );
				} else if ( $request->getCheck( self::REQ_DELETE_ALL ) ) {
					$this->deleteComments( self::FILTER_ALL );
				}

				$out->redirect( $out->getTitle()->getFullURL( $this->commentsFilter->toUrlParams() ) );
			} else if ( $this->canManage && ( $action = $request->getText( 'action' ) ) !== '' && ( $commentId = $request->getText('id' ) ) !== '' ) {
				$this->doAction( $action, (int) $commentId );
				$out->redirect( $out->getTitle()->getFullURL( $this->commentsFilter->toUrlParams() ) );
			} else {
				$this->showMain();
			}
		} else {
			$out->showErrorPage( 'smartcomments', 'sic-sp-no-access' );
		}
    }

	/**
	 * Show the main HTML for the special page
	 *
	 * @return void
	 * @throws Exception
	 */
	private function showMain() : void {
		$out = $this->getOutput();

		$tabLabels = Xml::openElement( 'div', [ 'class' => 'sc-tabs' ] );
		$tabLabels .= Xml::element( 'span', [ 'class' => 'sc-tab active', 'tab-reference' => "tab-" . self::TAB_ID_OVERVIEW ], wfMessage( "sic-sp-tab-overview" )->text() );
		$tabLabels .= Xml::element( 'span', [ 'class' => 'sc-tab', 'tab-reference' => "tab-" . self::TAB_ID_HELP ], wfMessage( "sic-sp-tab-help" )->text() );
		$tabLabels .= Xml::closeElement( 'div' );
		$out->addhtml( $tabLabels );
		$tabBody = Xml::openElement( "section", [ 'id' => 'tab-' . self::TAB_ID_OVERVIEW, 'class' => 'sc-tab-body' ] );
		$tabBody .= $this->showOverview();
		$tabBody .= Xml::closeElement( "section" );
		$tabBody .= Xml::openElement( "section", [ 'id' => 'tab-' . self::TAB_ID_HELP, 'class' => 'sc-tab-body sc-hide' ] );
		$tabBody .= $this->getHelpTab();
		$tabBody .= Xml::closeElement( "section" );
		$out->addHTML( $tabBody );
	}

	/**
	 * Returns HTML for the Overview-tab
	 *
	 * @return string
	 * @throws OOUI\Exception
	 */
	private function showOverview() : string {
		return $this->generateTopBar() . $this->generateCommentTable();
	}

	/**
	 * Returns HTML for the bar of admin buttons and filter menus
	 *
	 * @return string
	 * @throws OOUI\Exception
	 */
	private function generateTopBar() : string {
		$html = '';

		if ( $this->canManage ) {
			$buttonToggleComments = new OOUI\ButtonInputWidget([
				'label' => wfMessage( Handler::isCommentModeBlocked() ? 'sic-sp-adminbutton-unblock-comments' : 'sic-sp-adminbutton-block-comments' )->text(),
				'title' => wfMessage( Handler::isCommentModeBlocked() ? 'sic-sp-adminbutton-unblock-comments-tooltip' : 'sic-sp-adminbutton-block-comments-tooltip' )->text(),
				'name' => self::REQ_BLOCKED_MODE,
				'type' => 'submit',
				'flags' => [ 'progressive' ],
				'icon' => Handler::isCommentModeBlocked() ? 'unLock' : 'lock',
				'classes' => [ 'sic-sp-admin-buttons' ]
			]);

			$buttonDeleteCompleted = new OOUI\ButtonInputWidget([
				'label' => wfMessage( 'sic-sp-adminbutton-delete-completed' )->text(),
				'name' => self::REQ_DELETE_COMPLETED,
				'type' => 'submit',
				'flags' => [ 'destructive' ],
				'icon' => 'checkAll',
				'classes' => [ 'sic-sp-admin-buttons' ]
			]);

			$buttonDeleteAll = new OOUI\ButtonInputWidget([
				'label' => wfMessage( 'sic-sp-adminbutton-delete-all' )->text(),
				'name' => self::REQ_DELETE_ALL,
				'type' => 'submit',
				'flags' => [ 'destructive' ],
				'icon' => 'clear',
				'classes' => [ 'sic-sp-admin-buttons' ]
			]);

			$fieldsetLayout = new OOUI\FieldsetLayout([
				'label' => wfMessage( 'sic-sp-admin-actions' )->text(),
				'classes' => [ 'sic-sp-admin-buttons' ]
			]);

			$fieldsetLayout->addItems([
				new OOUI\FieldLayout( $buttonToggleComments, [] ),
				new OOUI\FieldLayout( $buttonDeleteCompleted, [] ),
				new OOUI\FieldLayout( $buttonDeleteAll, [] )
			]);

			$formLayout = new OOUI\FormLayout([
				'items' => [ $fieldsetLayout ],
				'method' => 'POST'
			]);

			$formLayout->addClasses( [ 'sic-sp-admin-buttons' ] );

			$html = $formLayout->toString();
		}

		$filterAuthorOptions = DBHandler::selectAllAuthors();
		$filterPageOptions = DBHandler::selectAllPages();

		// Take into account that underscores in a page title, might be spaces
		$commentFilterPage = $this->commentsFilter->getPage();
		if ( $commentFilterPage != '' && !in_array( $commentFilterPage, $filterPageOptions ) ) {
			$commentFilterPage = str_replace( '_', ' ', $commentFilterPage );
		}

		$html .= Xml::openElement( 'table', [ 'style' => 'display: inline-block;' ] );
		$html .= Xml::openElement( 'tr' );
		$html .= Xml::openElement( 'td', [ 'class' => 'sic-sp-filter' ] );
		$html .= Xml::label( wfMessage( 'sic-sp-filter-status' )->parse(), 'sic-lb-filter-status' ) . ' : ';
		$html .= Xml::openElement( 'select', [ "name" => "sic-sp-flt-status", "id" => "sic-sp-flt-status", "class" => "sic-filter-dd" ] );
		$html .= Xml::element( 'option', [ "value" => "other", ( $this->commentsFilter->getStatus() == "other" ? "selected" : "" ) => "" ], "" );
		$html .= Xml::element( 'option', [ "value" => SIC::STATUS_OPEN, ( $this->commentsFilter->getStatus() == SIC::STATUS_OPEN ? "selected" : "" ) => ""  ], wfMessage( "sic-status-open" )->text() );
		$html .= Xml::element( 'option', [ "value" => SIC::STATUS_COMPLETED, ( $this->commentsFilter->getStatus() == SIC::STATUS_COMPLETED ? "selected" : "" ) => "" ], wfMessage( "sic-status-completed" )->text() );
		$html .= Xml::closeElement( 'select' );
		$html .= Xml::closeElement( 'td' );
		$html .= Xml::openElement( 'td', [ 'class' => 'sic-sp-filter' ] );
		$html .= Xml::label( wfMessage( 'sic-sp-filter-page' )->parse(), 'sic-lb-filter-page' ) . ' : ';
		$html .= Xml::listDropDown( "sic-sp-flt-page", implode( "\n", $filterPageOptions ), '', $commentFilterPage ?: 'other', 'sic-filter-dd' );
		$html .= Xml::closeElement( 'td' );
		$html .= Xml::openElement( 'td', [ 'class' => 'sic-sp-filter' ] );
		$html .= Xml::label( wfMessage( 'sic-sp-filter-author' )->parse(), 'sic-lb-filter-author' ) . ' : ';
		$html .= Xml::listDropDown( "sic-sp-flt-author", implode( "\n", $filterAuthorOptions ), '', $this->commentsFilter->getAuthor() ?: 'other', 'sic-filter-dd' );
		$html .= Xml::closeElement( 'td' );
		$html .= Xml::closeElement( 'tr' );
		$html .= Xml::closeElement( 'table' );

		return $html;
	}

	/**
	 * Returns HTML for the table showing the comments
	 *
	 * @return string
	 */
	private function generateCommentTable() : string {
		$columns = [
			'status', 'author', 'text', 'replies', 'datetime', 'modifiedBy', 'modifiedDateTime', 'page', ''
		];

		if ( $this->canManage ) {
			$columns = array_merge( $columns, [ '', '' ] );
		}

		// Retrieve the comments using the CommentsFilter object
		$result = DBHandler::selectCommentsByFilterObject( $this->commentsFilter );
		$sics = $result[ 0 ];
		$totalCount = $result[ 1 ];
		$hasMoreComments = $result[ 2 ];

		$rowClass = 'sic-sp-rw';
		$algnr = ['style'=>'text-align: right;'];
		$i = 1;

		$tableHtml = $this->generatePaginationButtons( $totalCount, $hasMoreComments, true );
		$tableHtml .=	Xml::openElement( 'table', [ 'class' => 'wikitable sic-tb-allcomments' ] );
		$tableHtml .= Xml::openElement( 'tr' );
		foreach ( $columns as $column ) {
			$tableHtml .= Xml::element( 'th', [ 'class' => "sic-tb-col-$column" ],
				empty( $column ) ? '' : wfMessage( "sic-property-$column" )->parse()
			);
		}
		$tableHtml .= Xml::closeElement( 'tr' );

		/** @var SIC $sic */
		foreach ( $sics as $sic ) {
			$i++;
			$tableHtml .= Xml::openElement( 'tr', [
				'class' => "$rowClass",
				'data-author' => $sic->getAuthor()->getName(),
				'data-page' => $sic->getPage(),
				'data-status' => $sic->getStatus()
			]);
			$tableHtml .= Xml::element( 'td', null, $sic->getStatus() );
			$tableHtml .= Xml::openElement( 'td' );
			$tableHtml .= Xml::element( 'a', [ 'href' => htmlspecialchars( $this->getPageUrl( 'User:'.$sic->getAuthor() ) ) ], $sic->getAuthor());
			$tableHtml .= Xml::closeElement( 'td' );
			$tableHtml .= Xml::element( 'td', null, trim( strip_tags( htmlspecialchars_decode( $sic->getText(), ENT_QUOTES ) ) ) );
			$tableHtml .= Xml::element( 'td', $algnr, ( $sic->getNumberOfReplies() > 0 ) ? $sic->getNumberOfReplies() : '' );
			$tableHtml .= Xml::element( 'td', null, $sic->getDatetime( SIC::USER_TIMESTAMPFORMAT, $this->getUser() ) );
			$tableHtml .= Xml::openElement( 'td' );
			$tableHtml .= Xml::element( 'a', [ 'href' => htmlspecialchars( $this->getPageUrl( 'User:'.$sic->getModifiedBy() ) ) ], $sic->getModifiedBy() );
			$tableHtml .= Xml::closeElement( 'td' );
			$tableHtml .= Xml::element( 'td', null, $sic->getModifiedDateTime( SIC::USER_TIMESTAMPFORMAT, $this->getUser() ) );
			$tableHtml .= Xml::openElement( 'td' );
			$linkTitle = $sic->getPage();
			if ( \ExtensionRegistry::getInstance()->isLoaded( 'DisplayTitle' )) {
				$title = \Title::newFromText( $linkTitle );
				if ( version_compare( MW_VERSION, '1.38', '>' ) ) {
					$displaytitle = \MediaWiki\MediaWikiServices::getInstance()->getPageProps()->getProperties( $title, 'displaytitle' );
				} else {
					$displaytitle = \PageProps::getInstance()->getProperties( $title, 'displaytitle' );
				}
				if ( !empty( $displaytitle ) ) {
					$linkTitle = $displaytitle[ $title->getArticleID( ) ] ?? $linkTitle;
				}
			}
			$tableHtml .= Xml::element( 'a', [ 'href' => $this->getPageUrlFocused( htmlspecialchars( $sic->getPage() ), $sic->getId() ) ], $linkTitle );
			$tableHtml .= Xml::closeElement( 'td' );

			$openButton = new ButtonWidget([
				'infusable' => true,
				'id' => 'openComment-' . $this->getValidCssName( $sic->getId() ),
				'icon' => 'ongoingConversation',
				'title' => wfMessage( 'sic-button-open' )->parse()
			]);
			$openButton->addClasses( [ 'specialOpenCommentButton' ] );
			$tableHtml .= Xml::openElement( 'td' );
			$tableHtml .= $openButton->toString();
			$tableHtml .= Xml::closeElement( 'td' );

			if ( $this->canManage ) {
				if ( $sic->getStatus() == SIC::STATUS_OPEN ) {
					$completeButton = new ButtonWidget([
						'infusable' => true,
						'id' => 'complete-' . $this->getValidCssName( $sic->getId() ),
						'icon' => 'check',
						'title' => wfMessage( 'sic-button-complete' )->parse(),
						'href' => $this->getOutput()->getTitle()->getFullURL( array_merge( [
							'action' => self::ACTION_COMPLETED,
							'id' => $sic->getId()
						], $this->commentsFilter->toUrlParams() ) )
					]);
				} else {
					$completeButton = new ButtonWidget([
						'infusable' => true,
						'id' => 'reopen-' . $this->getValidCssName( $sic->getId() ),
						'icon' => 'undo',
						'title' => wfMessage( 'sic-button-reopen' )->parse(),
						'href' => $this->getOutput()->getTitle()->getFullURL( array_merge( [
							'action' => self::ACTION_REOPEN,
							'id' => $sic->getId()
						], $this->commentsFilter->toUrlParams() ) )
					]);
				}

				$deleteButton = new ButtonWidget( [
					'infusable' => true,
					'id' => 'delete-' . $this->getValidCssName( $sic->getId() ),
					'icon' => 'trash',
					'title' => wfMessage( 'sic-button-delete' )->parse(),
					'href' => $this->getOutput()->getTitle()->getFullURL( array_merge( [
						'action' => self::ACTION_DELETE,
						'id' => $sic->getId()
					], $this->commentsFilter->toUrlParams() ) )
				] );

				$tableHtml .= Xml::openElement( 'td' );
				$tableHtml .= $completeButton->toString();
				$tableHtml .= Xml::closeElement( 'td' );
				$tableHtml .= Xml::openElement( 'td', [ 'class' => 'action-confirm' ] );
				$tableHtml .= $deleteButton->toString();
				$tableHtml .= Xml::closeElement( 'td' );
			}

			$tableHtml .= Xml::closeElement( 'tr' );
		}
		$tableHtml .= Xml::closeElement( 'table' );

		$tableHtml .= $this->generatePaginationButtons( $totalCount, $hasMoreComments );

		return $tableHtml;
	}

	/**
	 * Returns HTML for the pagination buttons
	 *
	 * @param int $totalCount
	 * @param bool $hasMoreComments
	 * @param bool $shorthandNotation
	 * @return string
	 */
	private function generatePaginationButtons( int $totalCount, bool $hasMoreComments, bool $shorthandNotation = false ) : string {
		$html = Xml::openElement( 'div', [ 'class' => 'sic-table-footer' ] );
		if ( $this->commentsFilter->getOffset() > 0 ) {
			$html .= Xml::element( 'button', [ 'id' => 'sic-sp-showprevious' ], $shorthandNotation ? "<" : wfMessage( "sic-sp-filter-showprevious" )->text() );
		}

		global $wgSmartCommentsSpecialMaxItems;
		$indexLastShownComment = $hasMoreComments ? ( $this->commentsFilter->getOffset() + $wgSmartCommentsSpecialMaxItems ) : $totalCount;
		if ( !$shorthandNotation )
			$html .= Xml::element( 'span', [ 'id' => 'sic-sp-display-count' ], wfMessage( 'sic-sp-display-count', $totalCount > 0 ? $this->commentsFilter->getOffset() + 1 : 0, $indexLastShownComment, $totalCount )->text() );

		if ( $hasMoreComments ) {
			$html .= Xml::element( 'button', [ 'id' => 'sic-sp-shownext' ], $shorthandNotation ? ">" : wfMessage( "sic-sp-filter-shownext" )->text() );
		}
		$html .= Xml::closeElement( 'div' );

		return $html;
	}

	/**
	 * Returns HTML for the Help-tab
	 *
	 * @return string
	 */
	private function getHelpTab() : string {
		$languageCode = MediaWikiServices::getInstance()->getContentLanguage()->getCode();

		if ( !in_array( $languageCode, [ 'nl', 'en' ] ) ) {
			return Html::element( 'p', [], "This language is currently not supported." );
		} else {
			return file_get_contents( __DIR__ . "/../../resources/documentation/Documentation_$languageCode.html" );
		}
	}

	/**
	 * Executes action (delete, complete or reopen) on the given commentId
	 * This function does not check if the user has the manage-right, do this before calling!
	 *
	 * @param string $action
	 * @param int $commentId
	 *
	 * @return void
	 */
	private function doAction( string $action, int $commentId ): void {
		$message = [
			self::ACTION_DELETE => wfMessage( 'sic-sp-message-deleted' ),
			self::ACTION_REOPEN => wfMessage( 'sic-sp-message-reopened' ),
			self::ACTION_COMPLETED => wfMessage( 'sic-sp-message-complete' )
		];

		if ( DBHandler::selectCommentById( $commentId ) === false || !array_key_exists( $action, $message ) ) {
			return;
		}

		switch( $action ) {
			case self::ACTION_DELETE:
				DBHandler::deleteComment( $commentId );
				break;
			case self::ACTION_COMPLETED:
				DBHandler::updateComment(
					$commentId,
					$this->getUser(),
					wfTimestampNow(),
					DBHandler::DB_COLUMN_STATUS,
					SIC::STATUS_COMPLETED
				);
				break;
			case self::ACTION_REOPEN:
				DBHandler::updateComment(
					$commentId,
					$this->getUser(),
					wfTimestampNow(),
					DBHandler::DB_COLUMN_STATUS,
					SIC::STATUS_OPEN
				);
				break;
		}
	}

	/**
	 * Delete comments based on a filter
	 *
	 * @param string $filter
	 * @return void
	 */
	private function deleteComments( string $filter ) : void {
		$sics = [];

		if ( $filter == self::FILTER_COMPLETED ) {
			$sics = DBHandler::selectCompletedComments();
		} else if ( $filter == self::FILTER_ALL ) {
			$sics = DBHandler::selectAllComments();
		}

		/* @var SIC $sic */
		foreach ( $sics as $sic ) {
			DBHandler::deleteComment( $sic->getId() );
		}
	}

	/**
	 * @param $string
	 * @return array|string|string[]|null
	 */
	private function getValidCssName( $string ) {
		return preg_replace( '/[^a-z0-9\s-]/', '', str_replace( ' ', '-', strtolower( $string ) ) );
	}

	/**
	 * @param $pageName
	 * @return string
	 */
	private function getPageUrl( $pageName ) : string {
		$title = Title::newFromText( $pageName );
		return ( $title instanceof Title ) ? $title->getLinkUrl() : '';
	}

	/**
	 * @param $pageName
	 * @param $commentId
	 * @return string
	 */
	private function getPageUrlFocused( $pageName, $commentId ) : string {
		$title = Title::newFromText( $pageName );
		return ( $title instanceof Title ) ? $title->getLinkUrl( [ 'scenabled' => 1, 'focusId' => $commentId ] ) : '';
	}

}
