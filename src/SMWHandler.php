<?php

namespace MediaWiki\Extension\SmartComments;

use MediaWiki\Extension\SmartComments\Jobs\Update;
use Title, User;
use SMW\Services\ServicesFactory;
use SMW\Subobject;
use SMW\DIProperty;
use SMW\DataValueFactory;
use SMW\MediaWiki\Jobs\UpdateJob;
use MediaWiki\Extension\SmartComments\SmartComment as SmartComment;

class SMWHandler {
	const PROPERTY_SUBOTYPE = 'Subotype';
	const PROPERTY_ID = 'SIC-Id';
	const PROPERTY_PARENT = 'SIC-Parent';
	const PROPERTY_PAGE = 'SIC-Page';
	const PROPERTY_REVISIONID = 'SIC-RevisionId';
	const PROPERTY_POSITION = 'SIC-Position';
	const PROPERTY_AUTHOR = 'SIC-Author';
	const PROPERTY_TEXT = 'SIC-Text';
	const PROPERTY_STATUS = 'SIC-Status';
	const PROPERTY_DATETIME = 'SIC-DateTime';
	const PROPERTY_MODIFIEDBY = 'SIC-ModifiedBy';
	const PROPERTY_MODIFIEDDATETIME = 'SIC-ModifiedDateTime';
	const PROPERTY_REPLIES = 'SIC-Replies';

	public static function initProperties(\SMW\PropertyRegistry $propertyRegistry = null) {
		$properties = [
			self::PROPERTY_SUBOTYPE => '_txt',
			self::PROPERTY_ID => '_txt',
			self::PROPERTY_PARENT => '_wpg',
			self::PROPERTY_PAGE => '_wpg',
			self::PROPERTY_REVISIONID => '_txt',
			self::PROPERTY_POSITION => '_txt',
			self::PROPERTY_AUTHOR => '_wpg',
			self::PROPERTY_TEXT => '_txt',
			self::PROPERTY_STATUS => '_txt',
			self::PROPERTY_DATETIME => '_dat',
			self::PROPERTY_MODIFIEDBY => '_wpg',
			self::PROPERTY_MODIFIEDDATETIME => '_dat',
			self::PROPERTY_REPLIES => '_txt'
		];

		foreach ($properties as $propName => $propType) {
			$propKey = '___' . $propName;
			if (!$propertyRegistry->isRegistered($propKey)) {
				$propertyRegistry->registerProperty($propKey, $propType, $propName, true);
				$propertyRegistry->registerPropertyDescriptionMsgKeyById($propKey, 'sic-props-description');
			}
		}
		return true;
	}

	public static function createPageUpdateJob($title) {
		$job = null;
		if ($title instanceof Title) {
			$job = ServicesFactory::getInstance()->newJobFactory()->newUpdateJob(
				$title,
				[
					UpdateJob::FORCED_UPDATE => true,
					'origin' => 'API',
					'extrainfo' => "SemanticInlineCommentsPageUpdate"
				]
			);
			if ($job) {
				\MediaWiki\MediaWikiServices::getInstance()->getJobQueueGroup()->push( $job );
				\MediaWiki\MediaWikiServices::getInstance()->getJobQueueGroup()->push( new Update( $title ) );
			}
		}
	}
	
	public static function createSubobjectsFromArrayOfComments( $comments ) {
		$subobjects = [];
		foreach( $comments  as $comment ) {
			if (($comment instanceof SmartComment) && empty($comment->getParent())) {
				//Create subobject only for root comments, not for replies
				$subobjects[] = self::createSubobjectFromComment($comment);
			}
		}
		return $subobjects;
	}
	
	public static function createSubobjectFromComment(SmartComment $comment) {
		$title = Title::newFromText($comment->getPage());
		if (($title instanceof Title) && $title->exists()) {
			//Create subobject to contain comment data
			$subobject = new Subobject($title);
			$subobjectName = 'SIC-'. $comment->getId();
			$subobject->setEmptyContainerForId($subobjectName);
			
			$authorName = ($comment->getAuthor() instanceof User) ? 'User:'.$comment->getAuthor()->getName() : 'invalid user';
			$modifiedByName = ($comment->getModifiedBy() instanceof User) ? 'User:'.$comment->getModifiedBy()->getName() : 'invalid user';

			$subobject->addDataValue(self::getDataValue(self::PROPERTY_SUBOTYPE, 'SemanticInlineComment'));
			$subobject->addDataValue(self::getDataValue(self::PROPERTY_ID, $comment->getId()));
			$subobject->addDataValue(self::getDataValue(self::PROPERTY_AUTHOR, $authorName));
			$subobject->addDataValue(self::getDataValue(self::PROPERTY_TEXT, $comment->getText()));
			$subobject->addDataValue(self::getDataValue(self::PROPERTY_DATETIME, $comment->getDatetime(SmartComment::ISO_TIMESTAMPFORMAT)));
			$subobject->addDataValue(self::getDataValue(self::PROPERTY_MODIFIEDBY, $modifiedByName));
			$subobject->addDataValue(self::getDataValue(self::PROPERTY_MODIFIEDDATETIME, $comment->getModifiedDateTime(SmartComment::ISO_TIMESTAMPFORMAT)));
			$subobject->addDataValue(self::getDataValue(self::PROPERTY_REPLIES, $comment->getNumberOfReplies()));
			
			if (empty($comment->getParent())) {
				$subobject->addDataValue(self::getDataValue(self::PROPERTY_PAGE, $comment->getPage()));
				$subobject->addDataValue(self::getDataValue(self::PROPERTY_REVISIONID, $comment->getRevision()));
				$subobject->addDataValue(self::getDataValue(self::PROPERTY_POSITION, $comment->getPosition()));
				$subobject->addDataValue(self::getDataValue(self::PROPERTY_STATUS, $comment->getStatus()));
			} else {
				$subobject->addDataValue(self::getDataValue(self::PROPERTY_PARENT, $comment->getParent()));
			}
		} else {
			//Title does not exist
			$subobject = false;
		}
		return $subobject;
	}
	
	private static function getDataValue($propertyName, $propertyValue) {
		$property = DIProperty::newFromUserLabel($propertyName);
		$dataValue = DataValueFactory::getInstance()->newPropertyValue($property, $propertyValue, false);
		return $dataValue;
	}
	
	public static function getCommentsByPageName($pageName, $filter = null) {
		$comments = [];
		$title = Title::newFromText($pageName);
		if ($title instanceof Title) {
			$queryString = "[[{self::PROPERTY_SUBOTYPE}::{__CLASS__}]] [[{self::PROPERTY_PAGE}::$pageName]]";
			if (($filter == SmartComment::STATUS_OPEN) || ($filter == SmartComment::STATUS_COMPLETED)) {
				$queryString .= "[[{self::PROPERTY_STATUS}::$filter]]";
			}
			$subos = Utils::queryForPages($queryString);
			foreach ($subos as $subo) {
				$comment = new SmartComment();
				self::initializeFromSubobject($comment, $subo);
				$comment->setReplies(self::getCommentsByParent($comment->getId(), $filter));
				$comments[] = $comment;
			}
		} else {
			//Invalid title/pagename
		}
		return $comments;
	}
	
	private static function getCommentsByParent($parent) {
		$queryString = "[[{self::PROPERTY_PARENT}::$parent]]";
		$subos = Utils::queryForPages($queryString);
		$comments = [];
		foreach ($subos as $subo) {
			$comment = new SmartComment();
			self::initializeFromSubobject($comment, $subo);
			$comments[] = $comment;
		}
		return $comments;
	}
	
	private static function initializeFromSubobject($comment, $subo) {
		$author = User::newFromName(self::getPropertyValueFromSubObject($subo, self::PROPERTY_AUTHOR));
		$modifiedBy = User::newFromName(self::getPropertyValueFromSubObject($subo, self::PROPERTY_MODIFIEDBY));
		$comment->setId(self::getPropertyValueFromSubObject($subo, self::PROPERTY_ID));
		$comment->setParent(self::getPropertyValueFromSubObject($subo, self::PROPERTY_PARENT));
		$comment->setAuthor($author);
		$comment->setText(self::getPropertyValueFromSubObject($subo, self::PROPERTY_TEXT));
		$comment->setDatetime(self::getPropertyValueFromSubObject($subo, self::PROPERTY_DATETIME));
		$comment->setModifiedBy($modifiedBy);
		$comment->setModifiedDateTime(self::getPropertyValueFromSubObject($subo, self::PROPERTY_MODIFIEDDATETIME));

		if (is_null($comment->getParent())) {
			$pageId = self::getPropertyValueFromSubObject($subo, self::PROPERTY_ID);
			$title = Title::newFromID($pageId);
			$pageName = ($title instanceof Title) ? $title->getPrefixedText() : "invalid page name";
			$comment->setPage($pageName);
			$comment->setRevision(self::getPropertyValueFromSubObject($subo, self::PROPERTY_REVISIONID));
			$comment->setPosition(self::getPropertyValueFromSubObject($subo, self::PROPERTY_POSITION));
			$comment->setStatus(self::getPropertyValueFromSubObject($subo, self::PROPERTY_STATUS));
		}
	}
	
	private static function getPropertyValueFromSubObject($subo, $propertyName) {
		return Utils::getPropertyValue($subo, $propertyName);
	}
}

