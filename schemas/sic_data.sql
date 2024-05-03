CREATE TABLE /*_*/sic_data (
  `data_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `text` tinyblob NOT NULL,
  `author` int(10) unsigned NOT NULL,
  `datetime` varbinary(14) NOT NULL DEFAULT '',
  `parent` int(10) unsigned DEFAULT NULL,
  `modified_by` int(10) unsigned NOT NULL,
  `modified_datetime` varbinary(14) NOT NULL DEFAULT '',
  PRIMARY KEY (`data_id`),
  FOREIGN KEY (`parent`) REFERENCES /*_*/sic_data(`data_id`)
) /*$wgDBTableOptions*/;
