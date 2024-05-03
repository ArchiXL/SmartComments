<?php

namespace MediaWiki\Extension\SmartComments;

use MediaWiki\Extension\SmartComments\Jobs\Update;
use Title, User;
use SMW\ApplicationFactory;
use SMW\Subobject;
use SMW\DIProperty;
use SMW\DataValueFactory;
use SMW\MediaWiki\Jobs\UpdateJob;
use MediaWiki\Extension\SmartComments\SemanticInlineComment as SIC;

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
			$job = ApplicationFactory::getInstance()->newJobFactory()->newUpdateJob(
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
	
	public static function createSubobjectsFromArrayOfSics($sics) {
		$subobjects = [];
		foreach($sics as $sic) {
			if (($sic instanceof SIC) && empty($sic->getParent())) {
				//Create subobject only for root comments, not for replies
				$subobjects[] = self::createSubobjectFromSic($sic);
			}
		}
		return $subobjects;
	}
	
	public static function createSubobjectFromSic(SIC $sic) {
		$title = Title::newFromText($sic->getPage());
		if (($title instanceof Title) && $title->exists()) {
			//Create subobject to contain comment data
			$subobject = new Subobject($title);
			$subobjectName = 'SIC-'. $sic->getId();
			$subobject->setEmptyContainerForId($subobjectName);
			
			$authorName = ($sic->getAuthor() instanceof User) ? 'User:'.$sic->getAuthor()->getName() : 'invalid user';
			$modifiedByName = ($sic->getModifiedBy() instanceof User) ? 'User:'.$sic->getModifiedBy()->getName() : 'invalid user';

			$subobject->addDataValue(self::getDataValue(self::PROPERTY_SUBOTYPE, 'SemanticInlineComment'));
			$subobject->addDataValue(self::getDataValue(self::PROPERTY_ID, $sic->getId()));
			$subobject->addDataValue(self::getDataValue(self::PROPERTY_AUTHOR, $authorName));
			$subobject->addDataValue(self::getDataValue(self::PROPERTY_TEXT, $sic->getText()));
			$subobject->addDataValue(self::getDataValue(self::PROPERTY_DATETIME, $sic->getDatetime(SIC::ISO_TIMESTAMPFORMAT)));
			$subobject->addDataValue(self::getDataValue(self::PROPERTY_MODIFIEDBY, $modifiedByName));
			$subobject->addDataValue(self::getDataValue(self::PROPERTY_MODIFIEDDATETIME, $sic->getModifiedDateTime(SIC::ISO_TIMESTAMPFORMAT)));
			$subobject->addDataValue(self::getDataValue(self::PROPERTY_REPLIES, $sic->getNumberOfReplies()));
			
			if (empty($sic->getParent())) {
				$subobject->addDataValue(self::getDataValue(self::PROPERTY_PAGE, $sic->getPage()));
				$subobject->addDataValue(self::getDataValue(self::PROPERTY_REVISIONID, $sic->getRevision()));
				$subobject->addDataValue(self::getDataValue(self::PROPERTY_POSITION, $sic->getPosition()));
				$subobject->addDataValue(self::getDataValue(self::PROPERTY_STATUS, $sic->getStatus()));
			} else {
				$subobject->addDataValue(self::getDataValue(self::PROPERTY_PARENT, $sic->getParent()));
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
		$sics = [];
		$title = Title::newFromText($pageName);
		if ($title instanceof Title) {
			$queryString = "[[{self::PROPERTY_SUBOTYPE}::{__CLASS__}]] [[{self::PROPERTY_PAGE}::$pageName]]";
			if (($filter == SIC::STATUS_OPEN) || ($filter == SIC::STATUS_COMPLETED)) {
				$queryString .= "[[{self::PROPERTY_STATUS}::$filter]]";
			}
			$subos = Utils::queryForPages($queryString);
			foreach ($subos as $subo) {
				$sic = new SIC();
				self::initializeFromSubobject($sic, $subo);
				$sic->setReplies(self::getCommentsByParent($sic->getId(), $filter));
				$sics[] = $sic;
			}
		} else {
			//Invalid title/pagename
		}
		return $sics;
	}
	
	private static function getCommentsByParent($parent) {
		$queryString = "[[{self::PROPERTY_PARENT}::$parent]]";
		$subos = Utils::queryForPages($queryString);
		$sics = [];
		foreach ($subos as $subo) {
			$sic = new SIC();
			self::initializeFromSubobject($sic, $subo);
			$sics[] = $sic;
		}
		return $sics;
	}
	
	private static function initializeFromSubobject($sic, $subo) {
		$author = User::newFromName(self::getPropertyValueFromSubObject($subo, self::PROPERTY_AUTHOR));
		$modifiedBy = User::newFromName(self::getPropertyValueFromSubObject($subo, self::PROPERTY_MODIFIEDBY));
		$sic->setId(self::getPropertyValueFromSubObject($subo, self::PROPERTY_ID));
		$sic->setParent(self::getPropertyValueFromSubObject($subo, self::PROPERTY_PARENT));
		$sic->setAuthor($author);
		$sic->setText(self::getPropertyValueFromSubObject($subo, self::PROPERTY_TEXT));
		$sic->setDatetime(self::getPropertyValueFromSubObject($subo, self::PROPERTY_DATETIME));
		$sic->setModifiedBy($modifiedBy);
		$sic->setModifiedDateTime(self::getPropertyValueFromSubObject($subo, self::PROPERTY_MODIFIEDDATETIME));

		if (is_null($sic->getParent())) {
			$pageId = self::getPropertyValueFromSubObject($subo, self::PROPERTY_ID);
			$title = Title::newFromID($pageId);
			$pageName = ($title instanceof Title) ? $title->getPrefixedText() : "invalid page name";
			$sic->setPage($pageName);
			$sic->setRevision(self::getPropertyValueFromSubObject($subo, self::PROPERTY_REVISIONID));
			$sic->setPosition(self::getPropertyValueFromSubObject($subo, self::PROPERTY_POSITION));
			$sic->setStatus(self::getPropertyValueFromSubObject($subo, self::PROPERTY_STATUS));
		}
	}
	
	private static function getPropertyValueFromSubObject($subo, $propertyName) {
		return Utils::getPropertyValue($subo, $propertyName);
	}
}

