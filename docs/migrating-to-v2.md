# Migrating to v2 of SmartComments

This guide will walk you through the steps to migrate to version 2 of SmartComments. Ensure that you have the necessary permissions and access to run the required scripts on your MediaWiki instance.

## Steps for Migration

### Step 1: Run the MediaWiki Update Script

First, execute the MediaWiki update script to build the necessary database tables required for SmartComments v2.
```bash
php maintenance/update.php
```
This script ensures that all database schemas are up-to-date with the latest changes needed for version 2.
### Step 2: Run the Maintenance Script
Next, you will need to convert the data from the old structure to the new SQL-table. To do this, run the provided maintenance script:
```bash
php extensions/SmartComments/maintenance/convertSicToSql.php
```
