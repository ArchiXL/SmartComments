CREATE TABLE /*_*/sic_anchor (
  `anchor_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `data_id` int(10) unsigned NOT NULL,
  `page_id` int(10) NOT NULL,
  `rev_id` int(10) NOT NULL,
  `pos` varchar(255) NOT NULL DEFAULT '',
  `status` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`anchor_id`),
  FOREIGN KEY (`data_id`) REFERENCES /*_*/sic_data(`data_id`)
) /*$wgDBTableOptions*/;
