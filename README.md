# SmartComments
## Introduction
SmartComments is an extension that enables wiki users to post inline comments  
attached to text fragments on wiki pages, comparable to posting review comments  
in Microsoft Word and other word processors. 

## Installation
To enable SmartComments, the following actions are needed:

* Include the extension in the LocalSettings_wiki_extensions.php  
    `wfLoadExtension( 'SmartComments' );`

* To enable Composer to discover and process the composer.json file that's included in the extensions, add this to $IP/composer.local.json
  ```
  "extra": {
        "merge-plugin": {
            "include": [
                "extensions/SmartComments/composer.json"
            ]
        }
    }
  ```
* Run `composer update` so that Composer will recalculate the dependencies and the changes will take effect
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
