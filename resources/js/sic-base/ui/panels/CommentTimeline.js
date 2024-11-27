var SmartComments = SmartComments || {};
SmartComments.Panels = SmartComments.Panels || {};
SmartComments.Panels.CommentTimeline = {
    /** 
     * List of supported themes since positioning can be a prick.
     * 
     * The skinSelectors should have a entry to determine positions and margins
     */
    supportedSkins: [ 
        'vector', 
        'gemmaonline',
        'rhswiki'
    ],
    positions: [],
    idsHandled: [],
    templates: {
        base: $( '<div class="sic-timeline-container" />' ),
        item: $( '<div class="sic-timeline-item"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="13" fill="currentColor" class="bi bi-chat-right-text" viewBox="0 0 16 12"><path d="M3 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 6a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 6zm0 2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"/></svg></div>' ),
        hover: $( '<div class="sic-timeline-item-hover" />' )
    },

    /**
     * Skin specific stuff
     */
    skinSelectors: {
        vector: $( '.mw-body' ),
        gemmaonline: $( 'section#mainContent' ),
        rhswiki: $( 'main.mainContainer' ),

        getSelector: function() {
            if ( SmartComments.activeSkin === 'gemmaonline' ) {
                return this.gemmaonline;
            } else if ( SmartComments.activeSkin === 'rhswiki' ) {
                return this.rhswiki;
            } else {
                return this.vector;
            }
        },

        getMargin: function() {
            if ( SmartComments.activeSkin === 'gemmaonline' ) {
                return 135;
            } else if ( SmartComments.activeSkin === 'rhswiki' ) {
                return 115;
            } else {
                return 80;
            }
        }
    },

    /**
     * Returns true when current skin is supported
     * 
     * @return boolean
     */
    isSkinSupported: function() {
        return SmartComments.Panels.CommentTimeline.supportedSkins.indexOf( SmartComments.activeSkin ) !== -1;
    },

    /**
     * Creates the base element for the timeline
     *
     * @return void
     */
    createBase: function() {
        this.templates.base.appendTo( SmartComments.getNodeRoot(true) ).css( {
            top: - this.skinSelectors.getSelector().position().top - this.skinSelectors.getMargin()
        });
        this.bindEvents();
    },

    /**
     * Adds a new comment to the timeline
     *
     * @param comment
     * @return void
     */
    addToBase: function( comment ) {
        var self = this,
            id = typeof comment.data_id !== "undefined" ? comment.data_id : comment;
        if ( this.idsHandled.indexOf( id ) !== -1 ) {
            return;
        }

        setTimeout(function() {
            var item = self.templates.item.clone(),
                ref = $( '.smartcomment-hl-' + id ),
                positionTop = 0,
                isBroken = ref.length === 0;

            if ( SmartComments.activeSkin === 'rhswiki' ) {
                positionTop = $( 'main.mainContainer' ).height() + SmartComments.Panels.CommentTimeline.skinSelectors.getMargin() + 120;
            } else {
                positionTop = $( '#bodyContent' ).height() + 90;
            }

            if ( ! isBroken ) {
                positionTop = typeof comment.elementPos !== "undefined" ? comment.elementPos.top : ref.offset().top;
            } else {
                item.addClass( 'broken' );
                item.attr( 'data-selection', comment.posimg );
            }

            // If this position is already taken by another comment, move it a bit, so we get
            // a 'layered' effect
            if ( self.positions.indexOf( positionTop ) !== -1 ) {
                positionTop += 5;
            }

            if ( comment.hasReplies === 'true' ) {
                item.addClass( 'sic-timeline-item-hasreplies' );
            }

            item.css({
                top: positionTop,
                right: -3,
                position: 'absolute'
            });
            item.appendTo( self.templates.base );
            item.on( 'mouseover', function() {
                ref.addClass( 'active' );
            }).on( 'mouseout', function() {
                ref.removeClass( 'active' );
            }).on( 'click', function() {
                SmartComments.Buttons.CommentLinks.openComment( id, isBroken ? item : ref, isBroken );
            });

            self.positions.push( positionTop );
            self.idsHandled.push( id );

        }, 1 );
    },

    /**
     * Binds all the panel events
     * 
     * @return void
     */
    bindEvents: function() {
        $( document ).on( 'mouseover', '.sic-timeline-item.broken', function( e ) {
            var selection = $(this).data('selection'),
                hover = SmartComments.Panels.CommentTimeline.templates.hover.clone(),
                img = $( '<img src="'+ selection +'" width="500" />');

            if ( typeof selection !== "undefined" ) {
                hover.append( '<h2>' + mw.msg( "sic-unlocalized-comment" ) +'</h2>' );
                hover.append( img );
                hover.css( {
                    position: 'absolute',
                    right: "30px",
                    top: e.pageY - 50,
                    border: "2px solid #ff000050"
                } );
                $( 'body' ).append( hover );
            }

        } ).on( 'mouseout', '.sic-timeline-item.broken', function() {
            $( '.sic-timeline-item-hover' ).each( function() {
                $( this ).remove();
            } );
        } );
    },

    /**
     * Destroys the timeline panel
     * 
     * @return void
     */
    destruct: function() {
        $( '.sic-timeline-container' ).remove();
    }

};
