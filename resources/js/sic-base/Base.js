// @todo refactor SmartComments into SemanticInlineComments
var SmartComments = {
    isMobile: /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4)),
    userRights: undefined,
    enabled: undefined,
    alternativeParsing: $( '.sc-highlighting-method' ).data( 'parser' ) === "alternative",
    bodyContainer: $( mw.config.get( 'wgSmartComments' ).bodyContainer ),
    activeSkin: mw.config.get( 'skin' ),
    enabledAddons: mw.config.get( 'wgSmartComments' ).enabledAddons,

    /**
     * Initializes the SmartComments extension.
     *
     * @param rights
     */
    init: function( rights ) {
        var self = this;
        setTimeout(  function() {
            self.userRights = rights;
            self.bindGlobalEvents();
            rangy.init();

            // Auto enable whenever the URL contains scenabled=1
            if ( window.location.href.indexOf( 'scenabled=1' ) !== -1 ) {
                SmartComments.Events.trigger( SmartComments.Events.enums.DEBUG_MODE );
            }
        }, 200 );
    },

    /**
     * Binds global events.
     *
     * @return void
     */
    bindGlobalEvents: function() {
        SmartComments.Buttons.bindEvents();
    },

    /**
     * Enables the comment mode
     *
     * @return void
     */
    enableCommentMode: function( e ) {
        var self = this;
        SmartComments.helperFunctions.toggleSpinner( e.pageX, e.pageY );
        SmartComments.Api.Comments.list( 'open', function( commentsOnPage ) {

            SmartComments.Api.Comments.inBlockedMode( function( inBlockedMode ) {
                var onSpecialPage = mw.config.get( 'wgCanonicalSpecialPageName' ) === 'SmartComments';

                SmartComments.Selection.enabled = !inBlockedMode && !onSpecialPage;
                SmartComments.Highlighting.bindEvents();
                SmartComments.Highlighting.loadFromCommentsOnPage( commentsOnPage );
                if ( self.enabled === undefined ) {
                    SmartComments.Selection.bindEvents();
                }
                self.enabled = true;
                $( 'body' ).addClass( 'sc-enabled' );
                SmartComments.helperFunctions.toggleSpinner();
                SmartComments.Events.trigger( SmartComments.Events.enums.OPEN_COMMENT_ID );

            } );

        } );

    },

    /**
     * Disables the comment mode
     *
     * @return void
     */
    disableCommentMode: function() {
        this.enabled = false;
        SmartComments.Selection.enabled = false;
        SmartComments.Highlighting.destruct();
        $( 'body' ).removeClass( 'sc-enabled' );
    },

    /**
     * Returns the root node
     *
     * @returns {Node}
     */
    getNodeRoot: function() {
        return document.getElementById( 'mw-content-text' );
    },

    /**
     * Helper functions that will be used throughout the codebase.
     *
     * @return {*}
     */
    helperFunctions: {

        /**
         * Transforms the smartcomment-hl-<id> to <id>
         *
         * @param elementClass
         * @returns {*}
         */
        getIdFromClass: function( elementClass ) {
            return elementClass.match( /smartcomment-hl-(\d+)/ )[1];
        },

        /**
         * The dirty string will be cleaned up and returned to the users without
         * any HTML tags being parsed.
         *
         * @param dirtyString
         * @returns {*}
         */
        encodeHTML: function( dirtyString ) {
            var container = document.createElement('div');
            var text = document.createTextNode( dirtyString );
            container.appendChild(text);
            return container.innerHTML; // innerHTML will always be a xss safe string
        },

        /**
         * Decodes the dirty string and returns it to the user.
         *
         * @param encodedString
         * @returns {*}
         */
        decodeHTML: function( encodedString ) {
            var div = document.createElement('div');
            div.innerHTML = encodedString;
            return div.textContent;
        },

        /**
         * Generates a screenshot of the given element
         *
         * @param element
         * @param options
         * @param callback
         */
        screenshot: function( element, options, callback ) {
            element = element === "default" ? $( '#mw-content-text' ) : $( element );
            html2canvas( document.body, options ).then( function( canvas ) {
                canvas.classList.add( 'sic-canvas' );
                var dataURL = canvas.toDataURL( "image/jpeg" );
                canvas.remove();
                callback( dataURL );
            } );
        },

        /**
         * Toggles the loading spinner
         *
         * @param x
         * @param y
         */
        toggleSpinner: function( x, y ) {
            var id = 'sic-spinner';

            if ( $( '#' + id ).length !== 0 ) {
                $( '#' + id ).remove();
                return;
            }

            var spinner = $( '<div id="' + id + '" ><svg width="36" height="36" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><style>.spinner_OSmW{transform-origin:center;animation:spinner_T6mA .75s step-end infinite}@keyframes spinner_T6mA{8.3%{transform:rotate(30deg)}16.6%{transform:rotate(60deg)}25%{transform:rotate(90deg)}33.3%{transform:rotate(120deg)}41.6%{transform:rotate(150deg)}50%{transform:rotate(180deg)}58.3%{transform:rotate(210deg)}66.6%{transform:rotate(240deg)}75%{transform:rotate(270deg)}83.3%{transform:rotate(300deg)}91.6%{transform:rotate(330deg)}100%{transform:rotate(360deg)}}</style><g class="spinner_OSmW"><rect x="11" y="1" width="2" height="5" opacity=".14"/><rect x="11" y="1" width="2" height="5" transform="rotate(30 12 12)" opacity=".29"/><rect x="11" y="1" width="2" height="5" transform="rotate(60 12 12)" opacity=".43"/><rect x="11" y="1" width="2" height="5" transform="rotate(90 12 12)" opacity=".57"/><rect x="11" y="1" width="2" height="5" transform="rotate(120 12 12)" opacity=".71"/><rect x="11" y="1" width="2" height="5" transform="rotate(150 12 12)" opacity=".86"/><rect x="11" y="1" width="2" height="5" transform="rotate(180 12 12)"/></g></svg></div>' );

            // Set default CSS attributes
            spinner.css( 'position', 'absolute' );
            spinner.css( 'top', y );
            spinner.css( 'left', x );

            $( 'body' ).append( spinner );
        }

    },

    /**
     * User functions
     *
     * @return {*}
     */
    user: {
        /**
         * Determines whether the current user can manage comments
         *
         * @returns {boolean}
         */
        canManageComments: function() {
            return SmartComments.userRights.indexOf( "manage-inlinecomments" ) !== -1 ;
        },

        /**
         * Determines whether the current user can add comments
         *
         * @returns {boolean}
         */
        canAddComments: function() {
            return SmartComments.userRights.indexOf( "add-inlinecomments" ) !== -1 ;
        }
    },
};

if (!SmartComments.isMobile) {
    mw.user.getRights().then( function( rights ) {
        SmartComments.init( rights );
    });
};