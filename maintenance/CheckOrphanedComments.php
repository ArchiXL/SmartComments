<?php

declare( strict_types=1 );

use MediaWiki\Extension\SmartComments\DBHandler;
use MediaWiki\Maintenance\Maintenance;

$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}
require_once "$IP/maintenance/Maintenance.php";

/**
 * Checks SmartComments tables for entries that reference pages no longer
 * present in the MediaWiki page table.
 *
 * Checks:
 *   - sic_anchor: orphaned page_id entries (and their linked sic_data comments)
 *   - sic_diff_table: orphaned page_id entries
 *
 * Usage:
 *   php maintenance/CheckOrphanedComments.php
 *   php maintenance/CheckOrphanedComments.php --delete
 */
class CheckOrphanedComments extends Maintenance {

	public function __construct() {
		parent::__construct();
		$this->addDescription(
			'Check SmartComments tables for entries referencing pages that no longer exist.'
		);
		$this->addOption(
			'delete',
			'Delete all orphaned entries from sic_anchor, sic_data and sic_diff_table',
			false,
			false
		);
	}

	public function execute(): void {
		$dbr = $this->getDB( DB_REPLICA );
		$delete = $this->hasOption( 'delete' );
		$dbw = $delete ? $this->getDB( DB_PRIMARY ) : null;

		$this->output( "SmartComments orphan check\n" );
		$this->output( str_repeat( '-', 40 ) . "\n" );

		$anchorOrphans = $this->findAnchorOrphans( $dbr );
		$this->reportAnchorOrphans( $anchorOrphans );

		$diffOrphans = $this->findDiffOrphans( $dbr );
		$this->reportDiffOrphans( $diffOrphans );

		if ( !$delete ) {
			$total = count( $anchorOrphans ) + count( $diffOrphans );
			if ( $total > 0 ) {
				$this->output( "\nRun with --delete to remove orphaned entries.\n" );
			} else {
				$this->output( "\nNo orphans found.\n" );
			}
			return;
		}

		if ( count( $anchorOrphans ) > 0 ) {
			$this->deleteAnchorOrphans( $dbw, $dbr, $anchorOrphans );
		}

		if ( count( $diffOrphans ) > 0 ) {
			$this->deleteDiffOrphans( $dbw, $diffOrphans );
		}

		$this->output( "\nDone.\n" );
	}

	/**
	 * Find sic_anchor rows whose page_id does not exist in the page table.
	 *
	 * @param \Wikimedia\Rdbms\IDatabase $dbr
	 * @return array[] Each element has keys: anchor_id, data_id, page_id
	 */
	private function findAnchorOrphans( \Wikimedia\Rdbms\IDatabase $dbr ): array {
		$res = $dbr->newSelectQueryBuilder()
			->select( [ 'sa.anchor_id', 'sa.data_id', 'sa.page_id' ] )
			->from( DBHandler::DB_TABLE_SIC_ANCHOR, 'sa' )
			->leftJoin( 'page', 'p', 'p.page_id = sa.page_id' )
			->where( [ 'p.page_id' => null ] )
			->caller( __METHOD__ )
			->fetchResultSet();

		$orphans = [];
		foreach ( $res as $row ) {
			$orphans[] = [
				'anchor_id' => (int)$row->anchor_id,
				'data_id' => (int)$row->data_id,
				'page_id' => (int)$row->page_id,
			];
		}

		return $orphans;
	}

	/**
	 * Find sic_diff_table rows whose page_id does not exist in the page table.
	 *
	 * @param \Wikimedia\Rdbms\IDatabase $dbr
	 * @return int[] Orphaned page IDs
	 */
	private function findDiffOrphans( \Wikimedia\Rdbms\IDatabase $dbr ): array {
		$res = $dbr->newSelectQueryBuilder()
			->select( [ 'sd.page_id' ] )
			->from( DBHandler::DB_TABLE_SIC_DIFF, 'sd' )
			->leftJoin( 'page', 'p', 'p.page_id = sd.page_id' )
			->where( [ 'p.page_id' => null ] )
			->caller( __METHOD__ )
			->fetchResultSet();

		$pageIds = [];
		foreach ( $res as $row ) {
			$pageIds[] = (int)$row->page_id;
		}

		return $pageIds;
	}

	/**
	 * @param array[] $orphans
	 */
	private function reportAnchorOrphans( array $orphans ): void {
		$this->output( "\n[sic_anchor]\n" );

		if ( count( $orphans ) === 0 ) {
			$this->output( "  No orphaned entries.\n" );
			return;
		}

		foreach ( $orphans as $row ) {
			$this->output( sprintf(
				"  anchor_id=%-6d  data_id=%-6d  page_id=%d\n",
				$row[ 'anchor_id' ],
				$row[ 'data_id' ],
				$row[ 'page_id' ]
			) );
		}

		$this->output( sprintf( "  Total: %d orphaned anchor(s).\n", count( $orphans ) ) );
	}

	/**
	 * @param int[] $pageIds
	 */
	private function reportDiffOrphans( array $pageIds ): void {
		$this->output( "\n[sic_diff_table]\n" );

		if ( count( $pageIds ) === 0 ) {
			$this->output( "  No orphaned entries.\n" );
			return;
		}

		foreach ( $pageIds as $pageId ) {
			$this->output( "  page_id={$pageId}\n" );
		}

		$this->output( sprintf( "  Total: %d orphaned entry/entries.\n", count( $pageIds ) ) );
	}

	/**
	 * Delete orphaned anchors, their root comments, and all replies.
	 * Deletion order respects FK constraints:
	 *   1. sic_anchor (references sic_data)
	 *   2. sic_data replies (reference sic_data root via parent)
	 *   3. sic_data root comments
	 *
	 * @param \Wikimedia\Rdbms\IDatabase $dbw
	 * @param \Wikimedia\Rdbms\IDatabase $dbr
	 * @param array[] $orphans
	 */
	private function deleteAnchorOrphans(
		\Wikimedia\Rdbms\IDatabase $dbw,
		\Wikimedia\Rdbms\IDatabase $dbr,
		array $orphans
	): void {
		$anchorIds = array_column( $orphans, 'anchor_id' );
		$dataIds = array_column( $orphans, 'data_id' );

		$replyIds = $this->findReplyIds( $dbr, $dataIds );

		// 1. Remove anchors first (FK: sic_anchor.data_id → sic_data.data_id)
		$dbw->delete( DBHandler::DB_TABLE_SIC_ANCHOR, [ 'anchor_id' => $anchorIds ], __METHOD__ );

		// 2. Remove replies before root comments (FK: sic_data.parent → sic_data.data_id)
		if ( count( $replyIds ) > 0 ) {
			$dbw->delete( DBHandler::DB_TABLE_SIC_DATA, [ 'data_id' => $replyIds ], __METHOD__ );
		}

		// 3. Remove root comments
		$dbw->delete( DBHandler::DB_TABLE_SIC_DATA, [ 'data_id' => $dataIds ], __METHOD__ );

		$this->output( sprintf(
			"\n[sic_anchor] Deleted %d anchor(s), %d root comment(s), %d reply/replies.\n",
			count( $anchorIds ),
			count( $dataIds ),
			count( $replyIds )
		) );
	}

	/**
	 * @param \Wikimedia\Rdbms\IDatabase $dbw
	 * @param int[] $pageIds
	 */
	private function deleteDiffOrphans( \Wikimedia\Rdbms\IDatabase $dbw, array $pageIds ): void {
		$dbw->delete( DBHandler::DB_TABLE_SIC_DIFF, [ 'page_id' => $pageIds ], __METHOD__ );

		$this->output( sprintf(
			"[sic_diff_table] Deleted %d entry/entries.\n",
			count( $pageIds )
		) );
	}

	/**
	 * Find data_ids of reply comments whose parent is in the given list.
	 *
	 * @param \Wikimedia\Rdbms\IDatabase $dbr
	 * @param int[] $dataIds
	 * @return int[]
	 */
	private function findReplyIds( \Wikimedia\Rdbms\IDatabase $dbr, array $dataIds ): array {
		$res = $dbr->newSelectQueryBuilder()
			->select( [ 'data_id' ] )
			->from( DBHandler::DB_TABLE_SIC_DATA )
			->where( [ 'parent' => $dataIds ] )
			->caller( __METHOD__ )
			->fetchResultSet();

		$ids = [];
		foreach ( $res as $row ) {
			$ids[] = (int)$row->data_id;
		}

		return $ids;
	}
}

$maintClass = CheckOrphanedComments::class;
require_once RUN_MAINTENANCE_IF_MAIN;