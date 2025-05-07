<?php

namespace MediaWiki\Extension\SmartComments;

use Language, User, MWTimestamp;
use MediaWiki\MediaWikiServices;
use Wikimedia\Timestamp\TimestampException;

/**
 * 
 * Class defining the properties and methods of an inline semantic comment.
 * 
 */
Class SemanticInlineComment {
	const STATUS_OPEN = 'open';
	const STATUS_COMPLETED = 'completed';
	const ISO_TIMESTAMPFORMAT = 'Y-m-dTH:i:s';
	const USER_TIMESTAMPFORMAT = 'Y-m-d H:i:s';
	
	private $id = '';
	private $parent = null;
	private $page = null;
	private $revision = null;
	private $position = null;
	private $positionImage = null;
	/** @var User */
	private $author;
	private $text;
	private $status = null;
	private $datetime;
	private $modifiedBy;
	private $modifiedDateTime;
	private $replies = [];

	public function toArray() {
		$repliesArray = [];
		foreach ($this->getReplies() as $reply) {
			$repliesArray[] = $reply->toArray();
		}
		
		$lang = new Language();
		$mwTimeStamp = MWTimestamp::getLocalInstance($this->getDatetime());
		$datetime = $lang->getHumanTimestamp($mwTimeStamp, null, $this->getAuthor());
		$mwTimeStamp = MWTimestamp::getLocalInstance($this->getModifiedDateTime());
		$modifiedDateTime = $lang->getHumanTimestamp($mwTimeStamp, null, $this->getAuthor());
				
		return [
			'id' => $this->getId(),
			'parentId' => $this->getParent(),
			'page' => $this->getPage(),
			'revision' => $this->getRevision(),
			'position' => $this->getPosition(),
			'positionImage' => $this->getPositionImage( false ),
			'author' => $this->getAuthorAsString(),//($this->getAuthor() instanceof User) ? $this->getAuthor()->getName() : 'invalid user',
			'text' => $this->getText(),
			'status' => $this->getStatus(),
			'datetime' => $datetime,
			'modifiedBy' => $this->getModifiedBy(),//($this->getModifiedBy() instanceof User) ? $this->getModifiedBy()->getName() : 'invalid user',
			'modifiedDateTime' => $modifiedDateTime,
			'replies' => $repliesArray
		];
	}

	/**
	 * @param $timestamp
	 * @param $format
	 * @param User|null $user	If $user is given, format the timestamp according to the user's local settings
	 * @return mixed|string
	 */
	private function formatTimestamp( $timestamp, $format, User $user = null ) {
		if ( $user ) {
			$result = MWTimestamp::getInstance( $timestamp );
			$result->offsetForUser( $user );

			try {
				$timestamp = $result->getTimestamp( TS_MW );
			}
			catch ( TimestampException $e ) {}
		}

		switch ($format) {
			case self::ISO_TIMESTAMPFORMAT :
				$timestamp = vsprintf('%s%s-%s-%sT%s:%s:%s', str_split($timestamp, 2));
				break;
			case self::USER_TIMESTAMPFORMAT :
				$timestamp = vsprintf('%s%s-%s-%s %s:%s:%s', str_split($timestamp, 2));
				break;
		}
		return $timestamp;
	}

	/**
	 * Adds a reply to this object
	 *
	 * @param SemanticInlineComment $sic
	 * @return void
	 */
	public function addReply(SemanticInlineComment $sic) {
		$this->replies[] = $sic;
	}

	/**
	 * Get number of replies attached to this conversation
	 *
	 * @return int|void
	 */
	public function getNumberOfReplies() {
		return is_array($this->replies) ? sizeof($this->replies) : 0;
	}

	/**
	 * Returns the DB id
	 *
	 * @return int
	 */
	public function getId() {
		return $this->id;
	}

	/**
	 * Returns the parent of this comment
	 *
	 * @return null|SemanticInlineComment
	 */
	public function getParent() {
		return $this->parent;
	}

	/**
	 * Returns Title of this page
	 *
	 * @return null
	 */
	public function getPage() {
		return $this->page;
	}

	/**
	 * @return int
	 */
	public function getRevision() {
		return $this->revision;
	}

	/**
	 * @return string|null
	 */
	public function getPosition() {
		return $this->position;
	}

	/**
	 * @return string
	 */
	public function getPositionImage( $withPath = true ): ?string {
		return $withPath ?
			self::getPositionImageWithFullPath( $this->positionImage )
			: $this->positionImage;
	}

	/**
	 * @return string
	 */
	public function getPositionImageFilename(): string {
		return $this->positionImage;
	}

	/**
	 * @param string $imgName
	 * @return string
	 */
	public static function getPositionImageWithFullPath( string $imgName ): string {
		global $wgUploadPath, $wgUploadDirectory;
		$saveDirectory = str_replace( $wgUploadDirectory, '', Hooks::$imageSaveDirectory );
		return ( strstr( $wgUploadPath, 'auth.php' ) )
			? "{$wgUploadPath}/sic-images/{$imgName}"
			: "{$wgUploadPath}/{$saveDirectory}/{$imgName}";
	}

	/**
	 * @return User
	 */
	public function getAuthor() {
		return $this->author;
	}

	/**
	 * @return string
	 */
	public function getAuthorAsString() {
		return sprintf('<a href="%s">%s</a>', $this->author->getUserPage()->getFullURL(), $this->author->getName() );
	}

	/**
	 * @return mixed
	 */
	public function getText() {
		$parser = MediaWikiServices::getInstance()->getParserFactory()->getInstance();
		return $parser->parse(
			htmlspecialchars_decode( $this->text ),
			\Title::newFromText( "{$this->getPage()}_sic_{$this->getId()}" ),
			new \ParserOptions( \RequestContext::getMain()->getUser() )
		)->getText( [
			'allowTOC' => false,
			'enableSectionEditLinks' => false,
			'skin' => null,
			'unwrap' => false,
			'deduplicateStyles' => true,
			'wrapperDivClass' => [ 'sic-text'],
		] );
	}

	/**
	 * @return null
	 */
	public function getStatus() {
		return $this->status;
	}

	/**
	 * @param null $format
	 * @param User|null $user		If $user is given, format the timestamp according to the user's local settings
	 * @return mixed|string
	 */
	public function getDatetime($format = null, User $user = null) {
		return $this->formatTimestamp($this->datetime, $format, $user);
	}

	/**
	 * @return mixed
	 */
	public function getModifiedBy() {
		return $this->modifiedBy;
	}

	/**
	 * @param null $format
	 * @param User|null $user		If $user is given, format the timestamp according to the user's local settings
	 * @return mixed|string
	 */
	public function getModifiedDateTime($format = null, User $user = null) {
		return $this->formatTimestamp($this->modifiedDateTime, $format, $user);
	}

	/**
	 * @return SemanticInlineComment[]
	 */
	public function getReplies() {
		return $this->replies;
	}

	/**
	 * @param $id
	 * @return void
	 */
	public function setId($id) {
		$this->id = $id;
	}

	/**
	 * @param int $parent
	 * @return void
	 */
	public function setParent($parent) {
		$this->parent = $parent;
	}

	/**
	 * @param $page
	 * @return void
	 */
	public function setPage($page) {
		$this->page = $page;
	}

	/**
	 * @param int $revision
	 * @return void
	 */
	public function setRevision($revision) {
		$this->revision = $revision;
	}

	/**
	 * @param string $position
	 * @return void
	 */
	public function setPosition($position) {
		$this->position = htmlspecialchars_decode( $position, ENT_QUOTES );
	}

	/**
	 * @param $imageName
	 * @return void
	 */
	public function setPositionImage( $imageName ) {
		$this->positionImage = $imageName;
	}

	/**
	 * @param string $author
	 * @return void
	 */
	public function setAuthor($author) {
		$this->author = $author;
	}

	/**
	 * @param string $text
	 * @return void
	 */
	public function setText($text) {
		$text = strip_tags( $text );
		$text = htmlspecialchars( $text );
		$this->text = $text;
	}

	/**
	 * @param string $status
	 * @return void
	 */
	public function setStatus($status) {
		$this->status = $status;
	}

	/**
	 * @param string $datetime
	 * @return void
	 */
	public function setDatetime($datetime) {
		$this->datetime = $datetime;
	}

	/**
	 * @param string $modifiedBy
	 * @return void
	 */
	public function setModifiedBy($modifiedBy) {
		$this->modifiedBy = $modifiedBy;
	}

	/**
	 * @param string $modifiedDateTime
	 * @return void
	 */
	public function setModifiedDateTime($modifiedDateTime) {
		$this->modifiedDateTime = $modifiedDateTime;
	}

	/**
	 * @param SemanticInlineComment[] $replies
	 * @return void
	 */
	public function setReplies($replies) {
		$this->replies = $replies;
	}
}

