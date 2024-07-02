var SmartComments = SmartComments || {};
SmartComments.Panels = SmartComments.Panels || {};
SmartComments.Panels.CommentGroup = {
    refElement: null,
    active: false,
    isBroken: false,
    replies: [],
    anchor: undefined,
    last: {
        referringElement: undefined
    },
    enums: {
        ACTION_CLOSED: 0,
        ACTION_COMPLETED: 1,
        ACTION_DELETED: 2
    },

    getBaseSelector: function() {
        if ( SmartComments.activeSkin === 'vector' ) {
            return SmartComments.bodyContainer.parent().parent();
        } else if ( SmartComments.activeSkin === 'rhswiki' ) {
            return SmartComments.bodyContainer.parent().parent().parent();
        } else if ( SmartComments.activeSkin === 'gemmaonline' ) {
            return SmartComments.bodyContainer;
        } else {
            return SmartComments.bodyContainer;
        }
    },

    /**
     * Templates used
     */
    templating: {
        group: $( $.parseHTML( '<div class="sc-group-main"><!--<div class="smartcomment-overlay"></div>--><div class="smartcomment-panel"></div></div>' ) ),
        comment: $( $.parseHTML( '<span><div class="meta"><h5>$AUTHOR$</h5><span class="date">$DATE$</span></div><div class="comment"><p>$TEXT$</p></div></span>' ) )
    },

    /**
     * Closes the comment overlay
     */
    close: function( action ) {
        try {
            this.refElement = null;
            this.setActive(false);
            this.last.referringElement.removeClass("sc-active");
            this.refElement = null;
            $('.smartcomment-panel').empty();
            $('div.sc-group-main').remove();

            if ( action === this.enums.ACTION_COMPLETED ) {
                SmartComments.notifications.success(
                    mw.msg( 'sic-popup-completed' ),
                    mw.msg( 'sic-added-comment-refreshing' )
                );
            } else if ( action === this.enums.ACTION_DELETED ) {
                SmartComments.notifications.success(
                    mw.msg( 'sic-popup-deleted' ),
                    mw.msg( 'sic-added-comment-refreshing' )
                );
            } else if ( action === this.enums.ACTION_CLOSED ) {
                SmartComments.notifications.success(
                    mw.msg( 'sic-popup-closed' ),
                    mw.msg( 'sic-added-comment-refreshing' )
                );
            }
        } catch ( e ) {
            // Ignore
        }
    },

    /**
     * Creates the comment panel
     *
     * @param comment
     * @return void
     */
    create: function( comment ) {
        // Set anchor
        this.anchor = SmartComments.Highlighting.anchors[ comment.id ];

        // Set base selector
        var baseSelector = this.getBaseSelector();

        // Self pointer
        var that = this;

        // Create the toolbar
        var toolFactory = new OO.ui.ToolFactory();
        var toolGroupFactory = new OO.ui.ToolGroupFactory();
        var toolbar = new OO.ui.Toolbar( toolFactory, toolGroupFactory );
        var includes = [];

        //Add 'close' button to the toolbar
        function closeButton() {
            closeButton.parent.apply( this, arguments );
        }
        OO.inheritClass( closeButton, OO.ui.Tool );
        closeButton.static.name = 'close';
        closeButton.static.icon = 'close';
        closeButton.static.title = mw.msg('sic-button-close');
        closeButton.prototype.onSelect = function () {
            SmartComments.Panels.CommentGroup.close();
        };
        closeButton.prototype.onUpdateState = function () {};
        // Assign the comment tool to the tool factory
        toolFactory.register( closeButton );
        includes.push('close');

        // If inline or direct comments are enabled; don't add the reply button - since the
        // form has been showed
        if ( ! mw.config.get('wgSmartComments').directComment ) {
            //Add 'reply' button to the toolbar
            function replyButton() {
                replyButton.parent.apply( this, arguments );
            }

            OO.inheritClass( replyButton, OO.ui.Tool );
            replyButton.static.name = 'newComment';
            replyButton.static.icon = 'speechBubbleAdd';
            replyButton.static.title = mw.msg( 'sic-button-new-reply' );
            // Defines the action that will happen when this tool is selected (clicked).
            replyButton.prototype.onSelect = function () {
                SmartComments.Panels.CommentGroup.createReply( comment.id );
                this.setActive( false );
            };
            replyButton.prototype.onUpdateState = function () {
            };
            // Assign the comment tool to the tool factory
            toolFactory.register( replyButton );
            includes.push( 'newComment' );
        }

        /*//Add 'edit' button if current user is the comment author
        if (comment.author === mw.config.get('wgUserName') || SmartComments.user.canManageComments()) {
            //Add 'edit' button to the toolbar
            function editButton() {
                editButton.parent.apply( this, arguments );
            }
            OO.inheritClass( editButton, OO.ui.Tool );
            editButton.static.name = 'edit';
            editButton.static.icon = 'edit';
            editButton.static.title = mw.msg('sic-button-edit');
            editButton.prototype.onSelect = function () {
                SmartComments.comment.group.edit( comment );
                this.setActive( false );
            };
            editButton.prototype.onUpdateState = function () {};
            toolFactory.register( editButton );
            includes.push('edit');
        }*/

        //Add 'complete' button if current user is an admin
        if (comment.author === mw.config.get('wgUserName') || SmartComments.user.canManageComments()) {
            //Add 'complete' button to the toolbar
            function completeButton() {
                completeButton.parent.apply( this, arguments );
            }
            OO.inheritClass( completeButton, OO.ui.Tool );
            completeButton.static.name = 'complete';
            completeButton.static.icon = 'check';
            completeButton.static.title = mw.msg('sic-button-complete');
            completeButton.prototype.onSelect = function () {
                SmartComments.Panels.CommentGroup.complete( comment.id );
                this.setActive( false );
            };
            completeButton.prototype.onUpdateState = function () {};
            toolFactory.register( completeButton );
            includes.push('complete');
        }

        //Add 'delete' button if current user is the comment author or an admin
        if (comment.author === mw.config.get('wgUserName') || SmartComments.user.canManageComments()) {
            //Add 'delete' button to the toolbar
            function deleteButton() {
                deleteButton.parent.apply( this, arguments );
            }
            OO.inheritClass( deleteButton, OO.ui.Tool );
            deleteButton.static.name = 'delete';
            deleteButton.static.icon = 'trash';
            deleteButton.static.title = mw.msg('sic-button-delete');
            deleteButton.prototype.onSelect = function () {
                SmartComments.Panels.CommentGroup.delete(comment.id);
                this.setActive( false );
            };
            deleteButton.prototype.onUpdateState = function () {};
            toolFactory.register( deleteButton );
            includes.push('delete');
        }

        //Add 'link to overview' button if current user is an admin
        if (SmartComments.user.canManageComments()) {
            //Add 'overview' button to the toolbar
            function overviewButton() {
                overviewButton.parent.apply( this, arguments );
            }
            OO.inheritClass( overviewButton, OO.ui.Tool );
            overviewButton.static.name = 'overview';

            // Adjust the icon and title of the button accordingly to an article or to the special page
            if ( mw.config.get( 'wgCanonicalSpecialPageName' ) === 'SmartComments' ) {
                overviewButton.static.icon = 'article';
                overviewButton.static.title = mw.msg('sic-button-see-page');
            } else {
                overviewButton.static.icon = 'articles';
                overviewButton.static.title = mw.msg('sic-button-overview');
            }

            overviewButton.prototype.onSelect = function () {
                SmartComments.Panels.CommentGroup.goToOverview( comment.id, comment.page );
                this.setActive( false );
            };
            overviewButton.prototype.onUpdateState = function () {};
            toolFactory.register( overviewButton );
            includes.push('overview');
        }

        // Setup the toolbar (add tools ect.)
        toolbar.setup( [ {
            type: 'bar',
            include: includes
        } ] );

        // Create the comment group frame
        var commentGroupFrame = new OO.ui.PanelLayout( {
            expanded: false,
            framed: true,
            classes: [ 'smartcomment-commentgroup' ],
            id: 'sc-commentgroup-' + comment.id
        } );

        // Create the content frame (this will be the placeholder for the comments)
        var contentFrame = new OO.ui.PanelLayout( {
            expanded: false,
            padded: true,
            classes: [ 'container sc-plh']
        } );

        if ( this.isBroken ) {
            contentFrame.$element.append( new OO.ui.PanelLayout( {
                expanded: false,
                padded: false,
                $content: $( '<img src="'+ comment.positionImage +'" />'),
                classes: [ 'sc-broken' ]
            } ).$element );
        }

        // Append the main comment
        contentFrame.$element.append( new OO.ui.PanelLayout( {
            expanded: false,
            padded: false,
            $content: this.parseComment( comment ),
            classes: [ 'smartcomment-comment', 'comment-type-anchor' ]
        } ).$element );

        var lastAuthor = comment.modifiedBy;
        $.each( comment.replies, function( k, reply ) {
            contentFrame.$element.append( new OO.ui.PanelLayout( {
                expanded: false,
                padded: true,
                $content: that.parseComment( reply ),
                classes: [ 'smartcomment-comment-reply' ]
            } ).$element );
            lastAuthor = reply.modifiedBy;
        });

        // If direct commenting has been enabled; add the inline
        // comment form
        if ( mw.config.get('wgSmartComments').directComment && lastAuthor !== mw.user.getName() ) {

            SmartComments.Api.Comments.inBlockedMode( function( inBlockedMode ) {

                if ( !inBlockedMode ) {
                    contentFrame.$element.append(
                        SmartComments.Panels.InlineReply.create( contentFrame ).$element
                    );
                }

            } );
        }

        // Create the frame containing the frames above
        commentGroupFrame.$element.append(
            toolbar.$element,
            contentFrame.$element
        );

        // Append stuff to the DOM
        baseSelector.before().append( this.templating.group );
        baseSelector.find( 'div.smartcomment-panel' ).append( commentGroupFrame.$element );

        commentGroupFrame.$element.animate( {
            left:"0px"
        }, 250);

        var top = $( window ).scrollTop();
        if ( this.anchor && typeof this.anchor.elementPos !== "undefined" ) {
            top = this.anchor.elementPos.top - 100;
        } else if ( this.refElement !== null ) {
            top = this.refElement.position().top;
        }

        baseSelector.find( 'div.smartcomment-panel' ).css( {
            top: top,
            'max-height': "calc(100% - " + ( this.isBroken ? 0 : top) + 'px)'
        } );

        this.setActive(true);
    },

    complete: function( commentid ) {
        if ( SmartComments.Api.Comments.update( commentid, 'completed', '' ) ) {
            this.close( this.enums.ACTION_COMPLETED );
            setTimeout( function() {
                var parser = new URL( window.location );
                parser.searchParams.set( 'action', 'screfresh' );
                window.location = parser.href;
            }, 1500 );
        } else {
            SmartComments.notifications.error( 'Error!', 'Couldnt close comment thread' );
        }

    },

    delete: function( commentid ) {
        if ( SmartComments.Api.Comments.delete( commentid ) ) {
            this.close( this.enums.ACTION_DELETED );
            setTimeout( function() {
                var parser = new URL( window.location );
                parser.searchParams.set( 'action', 'screfresh' );
                window.location = parser.href;
            }, 1500 );
        } else {
            SmartComments.notifications.error( 'Error!', 'Couldnt close comment thread' );
        }
    },

    edit: function( comment ) {
        var $anchorElement = $('div.smartcomment-panel div.comment-type-anchor');
        var commentTextField = $anchorElement.find('div.comment');
        commentTextField.html( SmartComments.comment.forms.inlineEditPanel(commentTextField.text(), commentTextField).$element.html() );
    },

    goToOverview: function( commentId, pageTitle ) {
        // Check if we are currently on the special page
        if ( mw.config.get( 'wgCanonicalSpecialPageName' ) === 'SmartComments' ) {
            // We are on the special page, so the icon should redirect the user to the wikipage the comment is on
            var commentPage = new mw.Title( pageTitle );
            location.assign( commentPage.getUrl( { 'scenabled' : '1', 'focusId' : commentId } ) );
        } else {
            // We are on the page itself, so we redirect the user to the overview on the special page
            var pageName = mw.config.get( 'wgPageName' );
            var scSpecial = new mw.Title( 'SmartComments', -1 );
            var redirectUrl = mw.config.get( 'wgServer' ) + scSpecial.getUrl( { 'page' : pageName } );
            location.assign( redirectUrl );
        }
    },

    /**
     * Opens the comment group
     *
     * @param anchorId
     * @param elementClass
     * @param refElement
     * @param isBroken
     */
    open: function( anchorId, elementClass, refElement, isBroken ) {
        $( elementClass ).addClass("sc-active");
        this.isBroken = isBroken;
        this.last.referringElement = $( elementClass ).css( {
            'z-index': 100,
            'position': 'relative'
        } );

        //Get comment data from API and create group
        SmartComments.Api.Comments.get( anchorId, this, function( group, comment ) {
            SmartComments.Events.trigger( SmartComments.Events.enums.COMMENT_GROUP_OPEN );
            SmartComments.Selection.setSelectionFromString( comment.position );
            SmartComments.Selection.parent = comment.id;
            if ( !isBroken ) {
                group.refElement = refElement;
            }
            group.create( comment );
        });
    },

    /**
     * Parsers the given comment into an HTML template
     *
     * @param comment
     * @returns {*}
     */
    parseComment: function( comment, antiXss ) {
        antiXss = typeof antiXss !== 'undefined' ? antiXss : false;

        return this.templating.comment.html()
            .replace( '$AUTHOR$', comment.author )
            .replace( '$DATE$', comment.datetime )
            .replace( '$TEXT$', antiXss ? SmartComments.helperFunctions.encodeHTML( comment.text ) : $( comment.text ).text() );
    },

    /**
     * Adds a new reply to the given thread
     *
     * @param comment
     */
    addReply: function( text ) {

        var replyFrame = new OO.ui.PanelLayout( {
            expanded: false,
            padded: true,
            $content: this.parseComment( {
                datetime: mw.msg( 'sic-date-justnow' ),
                text: text,
                author:  mw.config.get( 'wgUserName' )
            } ),
            classes: [ 'smartcomment-comment-reply' ]
        } ).$element;

        $('div.sc-plh').append( replyFrame );
    },

    /**
     * Sets the active state of the comment group
     * 
     * @param {*} active 
     */
    setActive: function(active) {
        this.active = active;
    }
}