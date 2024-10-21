<?php

namespace MediaWiki\Extension\SmartComments;

use DateTime, User, Title;
use MediaWiki\Extension\SmartComments\SemanticInlineComment as SIC;
use MediaWiki\Extension\SmartComments\SpecialPage\CommentsFilter;

class DBHandler {
	const DB_TABLE_SIC_DATA = 'sic_data';
	const DB_TABLE_SIC_ANCHOR = 'sic_anchor';
	const DB_TABLE_SIC_DIFF = 'sic_diff_table';
	const DB_COLUMN_DATAID = 'data_id';
	const DB_COLUMN_ANCHORID = 'anchor_id';
	const DB_COLUMN_PAGEID = 'page_id';
	const DB_COLUMN_REVID = 'rev_id';
	const DB_COLUMN_POS = 'pos';
	const DB_COLUMN_POSIMG = 'posimg';
	const DB_COLUMN_TEXT = 'text';
	const DB_COLUMN_AUTHOR = 'author';
	const DB_COLUMN_DATETIME = 'datetime';
	const DB_COLUMN_PARENT = 'parent';
	const DB_COLUMN_STATUS = 'status';
	const DB_COLUMN_MODIFIEDBY = 'modified_by';
	const DB_COLUMN_MODIFIEDDATETIME = 'modified_datetime';
	const DB_TIMESTAMPFORMAT = 'YmdHis';
	const FIELD_HASREPLIES = 'hasReplies';
	const INVALIDUSER = 'invalid user';

	public static function insertComment(SIC $sic) {
		$text = self::sqlSafe($sic->getText());
		$author = $sic->getAuthor();
		$authorId = ($sic->getAuthor() instanceof User) ? $author->getId() : self::INVALIDUSER;
		$modifier = $sic->getModifiedBy();
		$modifierId = ($modifier instanceof User) ? $modifier->getId() : self::INVALIDUSER;
		$datetime = new DateTime($sic->getDatetime());
		$dateTimeString = $datetime->format(self::DB_TIMESTAMPFORMAT);
		$modifiedDateTime = new DateTime($sic->getModifiedDateTime());
		$modifiedDateTimeString = $modifiedDateTime->format(self::DB_TIMESTAMPFORMAT);
		//Note: we use UTC for dates in the database, and convert to localtime in api

		$dbr = wfGetDB(DB_MASTER);
		//First insert comment data
		$columns = [self::DB_COLUMN_TEXT, self::DB_COLUMN_AUTHOR, self::DB_COLUMN_DATETIME, self::DB_COLUMN_MODIFIEDBY, self::DB_COLUMN_MODIFIEDDATETIME];
		$values = [$text, $authorId, $dateTimeString, $modifierId, $modifiedDateTimeString];
		if (!empty($sic->getParent())) {
			$columns[] = self::DB_COLUMN_PARENT;
			$values[] = $sic->getParent();
		}
		//Note: ignore db errors to avoid error when replying to a non-existent parent
		$result = $dbr->insert( self::DB_TABLE_SIC_DATA, array_combine($columns, $values), __METHOD__);
		if ($result) {
			$sic->setId($dbr->insertId());

			//Insert comment anchor for root comments only
			if (empty($sic->getParent())) {
				$title = Title::newFromText($sic->getPage());
				if ($title instanceof Title) {
					$pageId = $title->getArticleID();
					$position = self::sqlSafe($sic->getPosition());
					$positionImage = self::sqlSafe( $sic->getPositionImage() );
					$status = self::sqlSafe($sic->getStatus());
					$revision = self::sqlSafe($sic->getRevision());

					$columns = [self::DB_COLUMN_DATAID, self::DB_COLUMN_PAGEID, self::DB_COLUMN_REVID, self::DB_COLUMN_POS, self::DB_COLUMN_STATUS,self::DB_COLUMN_POSIMG];
					$values = [$sic->getId(), $pageId, $revision, $position, $status, $positionImage];
					$result = $dbr->insert( self::DB_TABLE_SIC_ANCHOR, array_combine($columns, $values), __METHOD__);
				} else {
					//In this situation we end up with root comment_data without comment_anchor
					//Won't happen since the title is checked in the API call
					$result = false;
				}
			}
		}

		return ($result) ? $sic->getId() : false;
	}

	public static function updateComment($unsafeCommentId, $modifier, $datetime, $field, $value) {
		$commentId = self::sqlSafe(intval($unsafeCommentId));
		$modifierId = ($modifier instanceof User) ? $modifier->getId() : self::INVALIDUSER;
		$modifiedDateTime = new DateTime($datetime);
		$modifiedDateTimeString = $modifiedDateTime->format(self::DB_TIMESTAMPFORMAT);

		$dbr = wfGetDB(DB_PRIMARY);
		$cl_dataId = self::DB_COLUMN_DATAID;
		$cl_modBy = self::DB_COLUMN_MODIFIEDBY;
		$cl_modDT = self::DB_COLUMN_MODIFIEDDATETIME;
		if ($field == self::DB_COLUMN_STATUS) {
			//User changes status field
			if (($value == SIC::STATUS_OPEN) || ($value == SIC::STATUS_COMPLETED)) {
				$cl_status = self::DB_COLUMN_STATUS;
				$result = $dbr->update( self::DB_TABLE_SIC_ANCHOR, [ $cl_status => $value ], "$cl_dataId = $commentId");
				if ($result) {
					$result = $dbr->update( self::DB_TABLE_SIC_DATA, [ $cl_modBy => $modifierId, $cl_modDT => $modifiedDateTimeString ], "$cl_dataId = $commentId");
				}
			} else {
				//Invalid status, do nothing
				$result = false;
			}
		} else {
			//User changes text field
			$cl_text = self::DB_COLUMN_TEXT;
			$text = self::sqlSafe($value);
			$result = $dbr->update( self::DB_TABLE_SIC_DATA, [ $cl_text => $text, $cl_modBy => $modifierId, $cl_modDT => $modifiedDateTimeString], "$cl_dataId = $commentId");
		}
		//Note that an invalid comment id results in a valid query returning true.
		return $result;
	}

	public static function updateAnchor( $unsafeAnchorId, $word, $index ) {
		$anchorId = (int) $unsafeAnchorId;
		$pos = "{$word}|{$index}";
		$cl_anchorId = self::DB_COLUMN_ANCHORID;
		$dbr = wfGetDB( DB_PRIMARY );
		$result = $dbr->update(
			self::DB_TABLE_SIC_ANCHOR,
			[ self::DB_COLUMN_POS => $pos ],
			"{$cl_anchorId} = {$anchorId}"
		);
	}
	
	public static function deleteComment($unsafeCommentId) {
		$commentId = self::sqlSafe(intval($unsafeCommentId));
		$dbr = wfGetDB(DB_PRIMARY);
		
		//Delete the comment data and any replies to the comment
		$cl_dataId = self::DB_COLUMN_DATAID;
		$cl_parent = self::DB_COLUMN_PARENT;
		
		//Try delete the comment anchor (will fail for replies, which is ok)
		$dbr->delete( self::DB_TABLE_SIC_ANCHOR, [ $cl_dataId => $commentId ], __METHOD__ );
		$dbr->delete( self::DB_TABLE_SIC_DATA, [ $cl_parent => $commentId ], __METHOD__ );
		$result = $dbr->delete( self::DB_TABLE_SIC_DATA, [ $cl_dataId => $commentId ], __METHOD__ );
		
		return $result;
	}
	
	public static function selectCommentById($unsafeCommentId) {
		$commentId = self::sqlSafe(intval($unsafeCommentId));
		global $wgDBprefix;
		$dbr = wfGetDB(DB_PRIMARY);
		$tb_data = $wgDBprefix . self::DB_TABLE_SIC_DATA;
		$tb_anchor = $wgDBprefix . self::DB_TABLE_SIC_ANCHOR;
		$cl_dataId = self::DB_COLUMN_DATAID;
		$cl_parent = self::DB_COLUMN_PARENT;
		
		//Query for both root comment and replies in a single db query
		$qs = "SELECT * FROM $tb_data AS sd LEFT JOIN $tb_anchor AS sa ON (sa.$cl_dataId=sd.$cl_dataId) " . 
				"WHERE sd.$cl_dataId=$commentId OR sd.$cl_parent=$commentId ORDER BY sd.$cl_dataId;";
		$dbResults = $dbr->query($qs);
		$sics = self::createSicsFromDbResults($dbResults);
		if (sizeof($sics) > 0) {
			$sic = reset($sics);
		} else {
			$sic = false;
		}
		return $sic;
	}
	
	public static function selectCommentsByPage($pageName, $filter = '') {
		$sics = [];
		$title = Title::newFromText($pageName);
		if (($title instanceof Title) && $title->exists()) {
			$pageId = $title->getArticleID();
			
			$filters = [self::DB_COLUMN_PAGEID => $pageId];
			if (($filter == SIC::STATUS_OPEN) || ($filter == SIC::STATUS_COMPLETED)) {
				$filters[self::DB_COLUMN_STATUS] = $filter;
			}
			//selectCommentsFiltered is safe since user input is validated
			$sics = self::selectCommentsFiltered($filters);
		}
		return $sics;
	}

	public static function selectCommentsByPageId($pageId, $filter = '') {
		$filters = [self::DB_COLUMN_PAGEID => $pageId];
		if (($filter == SIC::STATUS_OPEN) || ($filter == SIC::STATUS_COMPLETED)) {
			$filters[self::DB_COLUMN_STATUS] = $filter;
		}
		//selectCommentsFiltered is safe since user input is validated
		$sics = self::selectCommentsFiltered($filters);
		return $sics;
	}

	public static function selectCompletedComments() {
		// safe as we do not forward any user input
		return self::selectCommentsFiltered( [ self::DB_COLUMN_STATUS => SIC::STATUS_COMPLETED ] );
	}

	public static function selectAllComments() {
		//selectCommentsFiltered is safe since no user input is forwarded
		return self::selectCommentsFiltered();
	}

	public static function selectCommentsByFilterObject( CommentsFilter $filter ) : array {
		$filters = null;

		$user = User::newFromName( $filter->getAuthor() );
		if ( $user && $user->isRegistered() ) {
			$author = $user->getId();
		}

		$title = Title::newFromText( $filter->getPage() );
		if ( $title && $title->exists() ) {
			$filters[ self::DB_COLUMN_PAGEID ] = $title->getId();
		}

		if ( $status = $filter->getStatus() ) {
			$filters[ self::DB_COLUMN_STATUS ] = $status;
		}

		$sics = self::selectCommentsFiltered( $filters, $author ?? '' );
		$amountSics = count( $sics );
		$offset = $filter->getOffset();

		global $wgSmartCommentsSpecialMaxItems;

		if ( $offset > $amountSics ) {
			return [ [], $amountSics, false ];
		} else {
			return [ array_slice( $sics, $offset, $wgSmartCommentsSpecialMaxItems ), $amountSics, ( $amountSics - $offset ) > $wgSmartCommentsSpecialMaxItems ];
		}
	}
	
	//Keep this function private as it does not validate user input
	private static function selectCommentsFiltered($filters = null, $author = null) {
		global $wgDBprefix;
		$dbr = wfGetDB(DB_PRIMARY);
		$tb_data = $wgDBprefix . self::DB_TABLE_SIC_DATA;
		$tb_anchor = $wgDBprefix . self::DB_TABLE_SIC_ANCHOR;
		$cl_dataId = self::DB_COLUMN_DATAID;
		$cl_parent = self::DB_COLUMN_PARENT;
		$sqs = "SELECT sd.$cl_dataId FROM $tb_data AS sd LEFT JOIN $tb_anchor AS sa ON (sa.$cl_dataId=sd.$cl_dataId)";
		if (is_array($filters)) {
			$fs = array_map(function($k, $v) { return "sa.$k='$v'"; }, array_keys($filters), array_values($filters));
			$sqs .= " WHERE " . implode(" AND ", $fs);
		}

		if ( is_array( $filters ) && $author ) {
			$sqs .= " AND sd.author='" . $author . "'";
		} else if ( $author ) {
			$sqs .= " WHERE sd.author='" . $author . "'";
		}

		$qs = "SELECT * FROM $tb_data AS sd LEFT JOIN $tb_anchor AS sa ON (sa.$cl_dataId=sd.$cl_dataId) " . 
			"WHERE sd.$cl_dataId IN ($sqs) OR sd.$cl_parent IN ($sqs) ORDER BY sd.$cl_dataId;";

		$dbResults = $dbr->query($qs);
		$sics = self::createSicsFromDbResults($dbResults);
		return $sics;		
	}

	/**
	 * @param string $pageName
	 * @param string $filter
	 * @return array
	 */
	public static function selectAnchorsByPage( $pageName, $filter = 'all' ): array {
		$dbAnchors = [];
		$title = Title::newFromText($pageName);
		if (($title instanceof Title) && $title->exists()) {
			$pageId = $title->getArticleID();

			global $wgDBprefix;
			$dbr = wfGetDB(DB_PRIMARY);
			$tb_anchor = $wgDBprefix . self::DB_TABLE_SIC_ANCHOR;
			$cl_pageid = self::DB_COLUMN_PAGEID;
			$qs = "SELECT * FROM $tb_anchor WHERE $cl_pageid=$pageId";
			if (($filter == SIC::STATUS_OPEN) || ($filter == SIC::STATUS_COMPLETED)) {
				$cl_status = self::DB_COLUMN_STATUS;
				$qs .= " AND $cl_status='$filter'";
			}
			$qs .= ";"; //return $qs;			
			$dbResults = $dbr->query($qs);
			foreach ($dbResults as $dbResult) {
				$id = $dbResult->{self::DB_COLUMN_DATAID};

				$dbAnchors[] = [
					self::DB_COLUMN_ANCHORID => $dbResult->{self::DB_COLUMN_ANCHORID}, 
					self::DB_COLUMN_DATAID => $id,
					self::DB_COLUMN_PAGEID => $dbResult->{self::DB_COLUMN_PAGEID}, 
					self::DB_COLUMN_REVID => $dbResult->{self::DB_COLUMN_REVID},
					self::DB_COLUMN_POS => $dbResult->{self::DB_COLUMN_POS}, 
					self::DB_COLUMN_STATUS => $dbResult->{self::DB_COLUMN_STATUS},
					self::DB_COLUMN_POSIMG => $dbResult->{self::DB_COLUMN_POSIMG},
					self::FIELD_HASREPLIES => self::commentHasReplies( $id ) ? 'true' : 'false'
				];
			}
		}
		return $dbAnchors;
	}
	
	private static function createSicsFromDbResults($dbResults) {
		$sics = [];
		foreach ($dbResults as $dbResult) {
			$sic = new SIC();
			$sic->setId($dbResult->{self::DB_COLUMN_DATAID});
			$sic->setAuthor(User::newFromId($dbResult->{self::DB_COLUMN_AUTHOR}));
			$sic->setDatetime($dbResult->{self::DB_COLUMN_DATETIME});
			$sic->setModifiedBy(User::newFromId($dbResult->{self::DB_COLUMN_MODIFIEDBY}));
			$sic->setModifiedDateTime($dbResult->{self::DB_COLUMN_MODIFIEDDATETIME});
			$sic->setText($dbResult->{self::DB_COLUMN_TEXT});
			$sic->setPositionImage($dbResult->{self::DB_COLUMN_POSIMG});
			if (isset($dbResult->{self::DB_COLUMN_PAGEID})) {
				//PageID is set from the anchors table, and has a value only for a root comment
				$title = Title::newFromId($dbResult->{self::DB_COLUMN_PAGEID});
				if ($title instanceof Title) {
					$sic->setPage($title->getPrefixedText());
				}
				$sic->setPosition($dbResult->{self::DB_COLUMN_POS});
				$sic->setRevision($dbResult->{self::DB_COLUMN_REVID});
				$sic->setStatus($dbResult->{self::DB_COLUMN_STATUS});
				$sics[$sic->getId()] = $sic;
			} else {
				//This must be a reply comment
				$sic->setParent($dbResult->{self::DB_COLUMN_PARENT});
				if (isset($sics[$sic->getParent()])) {
					$sics[$sic->getParent()]->addReply($sic);
				}
			}
		}
		return $sics;
	}
	
	public static function sqlSafe($string) {
		return htmlspecialchars($string, ENT_QUOTES, 'UTF-8');
	}

	/**
	 * Return information about a PageArchive
	 *
	 * @param int $page_id
	 * @return array
	 */
	public static function getPageIdFromArchive( string $title, int $namespace ): int {
		$dbr = wfGetDB( DB_REPLICA );

		$res = $dbr->newSelectQueryBuilder()
			->select( [ 'ar_page_id' ] )
			->from( 'archive' )
			->where( 'ar_title = "' . $title . '" AND ar_namespace = ' . $namespace )
			->limit( 1 )
			->caller( __METHOD__ )
			->fetchRow();

		if ( !$res ) {
			return 0;
		} else {
			return intval( $res->{'ar_page_id'} );
		}
	}

	public static function selectAllAuthors() : array {
		$dbr = wfGetDB( DB_REPLICA );

		$res = $dbr->newSelectQueryBuilder()
			->select( self::DB_COLUMN_AUTHOR )
			->distinct()
			->from( self::DB_TABLE_SIC_DATA )
			->caller( __METHOD__ )
			->fetchFieldValues();

		$users = [];
		foreach ( $res as $user ) {
			$users[] = User::newFromId( $user )->getName();
		}

		return $users;
	}

	public static function selectAllPages() : array {
		$dbr = wfGetDB( DB_REPLICA );

		$res = $dbr->newSelectQueryBuilder()
			->select( self::DB_COLUMN_PAGEID )
			->distinct()
			->from( self::DB_TABLE_SIC_ANCHOR )
			->caller( __METHOD__ )
			->fetchFieldValues();

		$pages = [];
		foreach ( $res as $page ) {
			$title = Title::newFromID( $page );
			if ( $title ) {
				$pages[] = $title->getText();
			}
		}

		return $pages;
	}

	private static function commentHasReplies( int $commentId ) : bool {
		$dbr = wfGetDB( DB_REPLICA );

		$count = $dbr->selectRowCount(
			self::DB_TABLE_SIC_DATA,
			'*',
			self::DB_COLUMN_PARENT . '=' . $commentId,
			__METHOD__
		);

		return $count > 0;
	}

	public static function updateDiffTable( $page_id,  $content ) {
		return ( self::getDiffTableEntryText( $page_id ) === null )
			? self::insertDiffTableEntry( $page_id, $content )
			: self::updateDiffTableEntry( $page_id, $content );
	}

	public static function deleteDiffTableEntry( $page_id ) {
		$dbw = wfGetDB( DB_PRIMARY );
		$dbw->startAtomic( __METHOD__ );
		$res = $dbw->delete(
			'sic_diff_table',
			[
				'page_id' => self::sqlSafe( $page_id ),
			]
		);
		$dbw->endAtomic( __METHOD__ );
		return $res;
	}

	public static function insertDiffTableEntry( $page_id, $text ) {
		$dbw = wfGetDB( DB_PRIMARY );

		$dbw->startAtomic( __METHOD__ );
		$res = $dbw->insert(
			'sic_diff_table',
			[
				'page_id' => self::sqlSafe( $page_id ),
				'text' => serialize( $text )
			]
		);
		$dbw->endAtomic( __METHOD__ );
		return $res;
	}

	public static function updateDiffTableEntry( $page_id, $text ) {
		$dbw = wfGetDB( DB_PRIMARY );
		$dbw->startAtomic( __METHOD__ );
		$res =  $dbw->update(
			'sic_diff_table',
			[
				'text' => serialize( $text )
			],
			[
				'page_id' => self::sqlSafe( $page_id )
			],
			__METHOD__
		);
		$dbw->endAtomic( __METHOD__ );
		return $res;
	}

	public static function getDiffTableEntryText( int $page_id ) : ?string {
		$dbr = wfGetDB( DB_REPLICA );
		$result = $dbr->select(
			'sic_diff_table',
			'*',
			[
				'page_id' => self::sqlSafe( $page_id )
			]
		);
		$obj = $result->fetchObject();
		return ( $obj === false ) ? null : unserialize( $obj->text );
	}
}

