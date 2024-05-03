<?php

namespace MediaWiki\Extension\SmartComments\SpecialPage;

use WebRequest;

class CommentsFilter {

	private const QUERY_OFFSET = 'offset';
	private const QUERY_STATUS = 'status';
	private const QUERY_AUTHOR = 'author';
	private const QUERY_PAGE = 'page';

	private int $offset;
	private string $status;
	private string $author;
	private string $page;

	function __construct( int $offset = 0, string $status = '', string $author = '', string $page = '' ) {
		$this->offset = $offset;
		$this->status = $status;
		$this->author = $author;
		$this->page = $page;
	}

	public static function newFromWebRequest( WebRequest $request ) : CommentsFilter {
		$offset = 0;
		$status = '';
		$author = '';
		$page = '';

		if ( $requestOffset = $request->getVal( self::QUERY_OFFSET ) ) {
			$offset = max( intval( $requestOffset ), 0 );
		}

		if ( $requestStatus = $request->getVal( self::QUERY_STATUS ) ) {
			$status = $requestStatus;
		}

		if ( $requestAuthor = $request->getVal( self::QUERY_AUTHOR ) ) {
			$author = $requestAuthor;
		}

		if ( $requestPage = $request->getVal( self::QUERY_PAGE ) ) {
			$page = $requestPage;
		}

		return new CommentsFilter( $offset, $status, $author, $page );
	}

	/**
	 * @return int
	 */
	public function getOffset(): int {
		return $this->offset;
	}

	/**
	 * @return string
	 */
	public function getStatus(): string {
		return $this->status;
	}

	/**
	 * @return string
	 */
	public function getAuthor(): string {
		return $this->author;
	}

	/**
	 * @return string
	 */
	public function getPage(): string {
		return $this->page;
	}

	public function toUrlParams() : array {
		$result = [];

		if ( $this->status ) {
			$result[ self::QUERY_STATUS ] = $this->status;
		}

		if ( $this->author ) {
			$result[ self::QUERY_AUTHOR ] = $this->author;
		}

		if ( $this->page ) {
			$result[ self::QUERY_PAGE ] = $this->page;
		}

		return $result;
	}

}