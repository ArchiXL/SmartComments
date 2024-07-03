# SmartComments

## Please note!
* This is a beta release.
* Unit tests are not working.
* Comment images are not displayed correctly when using img_auth.php
* The UI and JavaScript framework will be refactored to work with Codex.

## Introduction
SmartComments is an extension that enables wiki users to post inline comments  
attached to text fragments on wiki pages, comparable to posting review comments  
in Microsoft Word and other word processors. 

## Installation
To enable SmartComments, the following actions are needed:

* Include the extension in the LocalSettings_wiki_extensions.php  
    `wfLoadExtension( 'SmartComments' );`

* Run the MediaWiki 'update.php' maintenance script to add the database tables
* Manage user permissions if needed (see below) 

## Wiki manual
Please consult the manual under the "Manual"-tab on the page Special:SmartComments.

## configuration
The extension does not need any configuration. It might be useful though to set  
user rights. The extension adds two permissions: 

* add-inlinecomments. Users with this permission are allowed to post comments.  
By default assigned to the group 'user'.
* manage-inlinecomments. Users with this permission are allowed to manage comments.  
By default assigned to the group 'sysop'.

## Usage
Usage is fairly straightforward. Users can post comments by selecting a text  
fragment on any wiki page, and entering comment text in the popup window.  
Commented text on a wiki page is highlighted in light yellow. Upon clicking such  
a text fragment, the posted comment is displayed on the right edge of the page.  
Users can reply to posted comments.  

In addition to posting and viewing comments, users with *manage-inlinecomments*  
permission can delete other users' comments and can toggle comments' status  
between *open* and *completed*. Comments can be managed from the page on which  
they have been posted, or from the Special:SmartComments special page. 

If SemanticMediaWiki has been installed, comments are (additionally) available  
as subobjects on the page on which they have been posted, and can be queried  
accordingly. 

## API
The extension utilizes the MediaWiki API, which means that all interactions can  
be performed through the API as well. 

## Technical
Comments are stored in two database tables, one containing the anchors that are  
needed for highlighting text fragments on wiki pages, and one containing the  
comment details that are displayed only when a user clicks a highlighted text. 

Storing, highlighting, displaying and managing comments is done through the  
MediaWiki API's *smartcomment* module, which is called from the user interface  
but can be called remotely as well. The API module invokes a database handler  
for actual database interactions. 

After posting a comment the API queues a page data update job. If SMW has been  
installed, the *BeforeDataUpdateComplete* hook invokes a routine that stores  
comments data as subobjects attached to the respective wiki page.

## Managing JavaScript Files in the Extension
This MediaWiki extension includes a significant JavaScript library that is bundled into a single minified file for production use. To make adjustments to the included JavaScript files, you can modify the `JavascriptLoader` class provided in the extension.

### Modifying JavaScript Files
The `JavascriptLoader` class handles the loading and inclusion of JavaScript files for this extension. If you need to add or remove specific JavaScript files, follow these steps:

1. Locate the `JavascriptLoader` class in your extension's source code. This class is responsible for managing the loading of JavaScript files.

2. To **add** or remove a new JavaScript file:
  - Place your JavaScript file in a suitable location within your extension's directory structure.
  - Open the `JavascriptLoader` class and find the relevant method responsible for adding JavaScript files.
  - Inside this class, use the appropriate static $packageFiles to include or remove your new JavaScript file.

### Minification and Deployment
Run the maintenance script 'minifier.php' if you made any changes to the JavaScript resources. This is necessary to reflect any changes!

### Debugging Mode
You can enable debugging mode by appending `?debug=true` to the URL query parameters. When debugging mode is enabled, the individual script files will be loaded instead of the minified bundle. This can be useful for development and debugging purposes.
