<?php

use MediaWiki\MediaWikiServices;
use Wikimedia\Rdbms\Subquery;
use MediaWiki\Extension\SmartComments\DBHandler;

require_once( getcwd() . '/maintenance/Maintenance.php' );

class convertSICtoSQL extends Maintenance
{

	private \Wikimedia\Rdbms\IMaintainableDatabase $dbw;
	private \Wikimedia\Rdbms\IMaintainableDatabase $dbr;

	public function execute() {
		$this->dbw = $this->getDB( DB_PRIMARY );
		$this->dbr = $this->getDB( DB_REPLICA );

		$this->moveLastRevisionToSIC();
		$this->clearSicDataSlots();
	}

	/*
	 * Moves the last revision its content to the new created sic_diff_table
	 */
	private function moveLastRevisionToSIC() {
		$tables = [
			'wt' => 'text',
			'ws' => 'slots',
			'wsr' => 'slot_roles',
			'wr' => 'revision',
			'wp' => 'page',
			'wsa' => DBHandler::DB_TABLE_SIC_ANCHOR
		];

		$fields = [
			'wp.page_id',
			'wp.page_latest',
			'wt.old_text'
		];
		$joins = [
			'ws' => [ 'JOIN', 'wt.old_id = ws.slot_content_id' ],
			'wsr' => [ 'JOIN', 'ws.slot_role_id = wsr.role_id' ],
			'wr' => [ 'JOIN', 'ws.slot_revision_id = wr.rev_id' ],
			'wp' => [ 'JOIN', 'wr.rev_id = wp.page_latest' ],
			'wsa' => [ 'JOIN', 'wp.page_id = wsa.page_id' ]
		];

		$conditions = [
			'wsr.role_name' => 'sic-data-slot'
		];

		$res = $this->dbr->select(
			$tables,
			$fields,
			$conditions,
			__METHOD__,
			[
				'GROUP BY' => [ 'wp.page_id', 'wp.page_latest', 'wt.old_text' ]
			],
			$joins
		);

		$insertRows = [];
		$page_ids = [];
		foreach ( $res as $row ) {
			$insertRows[] = [
				'page_id' => $row->page_id,
				'text' => $row->old_text
			];
			$page_ids[] = $row->page_id;
		}

		if ( !empty( $insertRows ) ) {
			$this->dbw->insert(
				DBHandler::DB_TABLE_SIC_DIFF,
				$insertRows,
				__METHOD__
			);

			$this->output("Inserted " . count( $insertRows ) . " rows with page_ids: " . implode( ', ', $page_ids ) . "into sic_diff_table.\n ");
		} else {
			$this->output("No data found to be inserted.\n");
		}
	}

	private function clearSicDataSlots() {
		$slot_role = $this->dbr->tableName( 'slot_roles' );
		$slots = $this->dbr->select(
			[
				's' => 'slots',
			],
			'*',
			[
				's.slot_role_id = ' . new Subquery( "SELECT role_id FROM $slot_role WHERE role_name = 'sic-data-slot'" )
			]
		);
		$output = [];
		$fields = [
			'slot_role_id',
			'slot_revision_id',
			'slot_content_id'
		];
		foreach ( $slots as $row ) {
			foreach ( $fields as $field ) {
				if (!in_array($row->$field, $output[$field] ?? [])) {
					$output[$field][] = $row->$field;
				}
			}
		}
		if ( empty( $output ) ) {
			$this->output("No data found to be deleted.\n");
			return true;
		}
		$this->deleteFromContentTable( $output['slot_content_id'] );
		$this->deleteFromTextTable( $output['slot_content_id'] );
		$this->deleteFromSlotTables( $output['slot_role_id'] );
		return true;
	}

	private function deleteFromContentTable( $ids ) {
		$res = $this->dbw->delete(
			'content',
			[
				'content_id' => $ids
			]
		);
		$ids = implode( ', ', $ids );
		if ( $res ) {
			$this->output( "Rows with the ids of {$ids} deleted from content table\n" );
		} else {
			$this->output( "No data found to be deleted\n" );
		}
	}

	private function deleteFromSlotTables( $ids ) {
		$roles = $this->dbw->delete(
			'slot_roles',
			[
				'role_id' => $ids
			]
		);
		$slots = $this->dbw->delete(
			'slots',
			[
				'slot_role_id' => $ids
			]
		);
		$ids = implode( ', ', $ids );
		if ( $slots && $roles ) {
			$this->output( "Rows with the ids of {$ids} deleted from slots tables\n" );
		} else {
			$this->output( "No data found to be deleted\n" );
		}
	}

	private function deleteFromTextTable( $ids ) {
		$res = $this->dbw->delete(
			'text',
			[
				'old_id' => $ids
			]
		);
		$ids = implode( ', ', $ids );
		if ( $res ) {
			$this->output( "Rows with the ids of {$ids} deleted from text table\n" );
		} else {
			$this->output( "No data found to be deleted\n" );
		}
	}
}

$maintClass = convertSICtoSQL::class;
require_once RUN_MAINTENANCE_IF_MAIN;
