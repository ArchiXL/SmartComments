<?php

use MediaWiki\MediaWikiServices;
use Wikimedia\Rdbms\Subquery;
use MediaWiki\Extension\SmartComments\DBHandler;

require_once( getcwd() . '/maintenance/Maintenance.php' );

class convertSICtoSQL extends Maintenance
{

	private \Wikimedia\Rdbms\IMaintainableDatabase $dbw;
	private \Wikimedia\Rdbms\IMaintainableDatabase $dbr;

	private $page_ids = [];

	public function execute() {
		$this->dbw = $this->getDB( DB_PRIMARY );
		$this->dbr = $this->getDB( DB_REPLICA );

		$this->moveLastRevisionToSIC();
		$this->dbw->startAtomic( __METHOD__ );
		try {
			$this->clearSicDataSlots();
		} finally {
			$this->dbw->endAtomic( __METHOD__ );
		}
	}

	/*
	 * Moves the last revision its content to the new created sic_diff_table
	 */
	private function moveLastRevisionToSIC() {
		$slotRoleTable = 'slot_roles';
		$slotsTable = 'slots';
		$revisionTable = 'revision';
		$pageTable = 'page';

		// Get the slot_role_id for 'sic-data-slot'
		$slotRoleId = $this->dbr->selectField(
			$slotRoleTable,
			'role_id',
			[ 'role_name' => 'sic-data-slot' ],
			__METHOD__
		);

		if ( !$slotRoleId ) {
			$this->output( "No slot role found for 'sic-data-slot'.\n" );
			return;
		}

		// Get all slots with the slot_role_id
		$slots = $this->dbr->select(
			$slotsTable,
			'slot_revision_id',
			[ 'slot_role_id' => $slotRoleId ],
			__METHOD__
		);

		$revisionIds = [];
		foreach ( $slots as $slot ) {
			$revisionIds[] = $slot->slot_revision_id;
		}

		if ( empty( $revisionIds ) ) {
			$this->output( "No slots found for the given slot role.\n" );
			return;
		}

		// Get all unique pages from the revisions
		$res = $this->dbr->select(
			[ 'r' => $revisionTable, 'p' => $pageTable ],
			[ 'DISTINCT p.page_id', 'p.page_latest' ],
			[ 'r.rev_id' => $revisionIds ],
			__METHOD__,
			[],
			[
				'p' => [ 'JOIN', 'r.rev_page = p.page_id' ],
			]
		);

		$page_ids = [];
		foreach ( $res as $row ) {
			$page = MediaWikiServices::getInstance()->getWikiPageFactory()->newFromID( $row->page_id );
			$page_ids[] = $row->page_id;
			try {
				$insertRows[ $row->page_latest ] = [
					'page_id' => $row->page_id,
					'text' => serialize( $page->getRevisionRecord()->getContent( 'sic-data-slot' )->getText() ),
				];
			} catch ( Exception $e ) {
				// skip it if its gives an exeception
				// it means there is no slot found in the recent revision
			}
		}
		if ( !empty( $insertRows ) ) {
			$this->dbw->insert(
				DBHandler::DB_TABLE_SIC_DIFF,
				array_values( $insertRows ),
				__METHOD__
			);

			$this->output( "Inserted " . count( $insertRows ) . " rows with page_ids: " . implode( ', ', $page_ids ) . " into sic_diff_table.\n " );
			$this->page_ids = $page_ids;
		} else {
			$this->output( "No data found to be inserted.\n" );
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
				if ( !in_array( $row->$field, $output[ $field ] ?? [] ) ) {
					$output[ $field ][] = $row->$field;
				}
			}
		}
		if ( empty( $output ) ) {
			$this->output( "No data found to be deleted.\n" );
			return true;
		}
		$this->deleteFromTextTable( $output[ 'slot_content_id' ] );
		$this->deleteFromContentTable( $output[ 'slot_content_id' ] );
		$this->deleteFromSlotTables( $output[ 'slot_role_id' ] );
		$this->purgePages();
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
		// select content from db where content_id in (ids)
		$texts = $this->dbr->select(
			'content',
			'*',
			[
				'content_id' => $ids
			]
		);

		$text_ids = [];
		foreach ( $texts as $text ) {
			$address = \MediaWiki\Storage\SqlBlobStore::splitBlobAddress( $text->content_address );
			if ( empty( $address ) || $address[ 0 ] !== 'tt' ) {
				// we only support tt: content_address no es: externalStorage
				continue;
			}
			// remove first 3 letters from the content_address
			$text_ids[] = $address[ 1 ];
		}

		$res = $this->dbw->delete(
			'text',
			[
				'old_id' => $text_ids
			]
		);
		$ids = implode( ', ', $ids );
		if ( $res ) {
			$this->output( "Rows with the ids of {$ids} deleted from text table\n" );
		} else {
			$this->output( "No data found to be deleted\n" );
		}
	}

	private function purgePages() {
		foreach ( $this->page_ids as $page_id ) {
			$page = MediaWikiServices::getInstance()->getWikiPageFactory()->newFromID( $page_id );
			$page->doPurge();
		}
	}
}

$maintClass = convertSICtoSQL::class;
require_once RUN_MAINTENANCE_IF_MAIN;
