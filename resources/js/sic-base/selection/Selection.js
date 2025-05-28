var SmartComments = SmartComments || {};

SmartComments.Selection = {
    enabled: false,
    selection: undefined,
    parent: undefined,
    image: undefined,
    enums: {
        SELECTION_VALID: 0,
        INVALID_SELECTION_ALREADY_COMMENTED: 1,
        INVALID_SELECTION_INCLUDES_DYNAMIC_CONTENT: 2,
        INVALID_SELECTION_CONTAINS_LINEBREAKS: 3,
        INVALID_SELECTION_IS_EMPTY: 4,
        INVALID_SELECTION_CONTAINS_HTML: 5
    },
    lastPos: {
        x: 0,
        y: 0
    },
    startPos: {
        x: 0,
        y: 0
    },
    lastRange: undefined,
    addons: [],
    isCapturing: false,

    /**
     * Executes the selection action
     *
     * @param selection object|string
     * @return void
     */
    executeSelectionAction: function (selection) {
        console.warn('SmartComments.Selection.executeSelectionAction is deprecated');
        console.warn('Use SmartComments.Selection.preSelection and SmartComments.Selection.postSelection instead');
        var self = this;

        this.selection = selection;
        SmartComments.helperFunctions.toggleSpinner(this.lastPos.x, this.lastPos.y);

        // Generate a screenshot of the current selection
        // so whenever someone decides to remove the comment we're still able to read
        // the context it was made in.
        this.screenshotSelection(function (canvasBase64) {
            self.image = canvasBase64;
            self.parent = undefined;
            SmartComments.popup.create(
                (SmartComments.Selection.lastPos.x + 5),
                (SmartComments.Selection.lastPos.y + 5)
            ).open();
            SmartComments.helperFunctions.toggleSpinner();
            SmartComments.Events.trigger(SmartComments.Events.enums.SELECTION_ACTIVE);
        });
    },

    /**
     * Pre-selection action. This should be called after the selection has been made and before any
     * other actions are taken.
     *
     * @param range
     */
    preSelection: function (range) {
        SmartComments.Selection.lastRange = range;
        SmartComments.helperFunctions.toggleSpinner(this.lastPos.x, this.lastPos.y);
        this.isCapturing = true;
    },

    /**
     * Post-selection action. This should be should be called after indexing ect. has been done.
     *
     * @param selection
     */
    postSelection: function (selection) {
        var self = this;
        this.selection = selection;

        SmartComments.Highlighting.Types.WordIndex.highlightRange(
            this.lastRange,
            null,
            SmartComments.Highlighting.enums.HIGHLIGHT_CLASS
        );

        this.screenshotSelection(function (canvasBase64) {
            self.image = canvasBase64;
            self.parent = undefined;
            SmartComments.popup.create(
                (self.startPos.x + 5),
                (self.startPos.y + 5)
            ).open();
            SmartComments.helperFunctions.toggleSpinner();
            SmartComments.Events.trigger(SmartComments.Events.enums.SELECTION_ACTIVE);
            $('.' + SmartComments.Highlighting.enums.HIGHLIGHT_CLASS).removeClass(SmartComments.Highlighting.enums.HIGHLIGHT_CLASS);
            self.isCapturing = false;
        });
    },

    /**
     * @return void
     */
    deselect: function (resetState) {
        rangy.getSelection().removeAllRanges();

        resetState = typeof resetState === 'undefined' ? true : resetState;

        SmartComments.Selection.DynamicBlockSelection.deselect();

        if (resetState) {
            this.lastPos = { x: 0, y: 0 };
            this.selection = undefined;
            this.parent = undefined;
            SmartComments.Selection.image = undefined;
            $('.sic-canvas').remove();
        }

    },

    /**
     * Validates the selection
     *
     * @param wrappedSelection rangy.WrappedSelection
     * @returns {number}
     */
    validateSelection: function (wrappedSelection) {
        var selectionHTML = typeof wrappedSelection === 'string' ? wrappedSelection : wrappedSelection.toHtml(),
            res = this.enums.SELECTION_VALID;

        // Apparently the current selection already contains comments. We don't allow that.
        if (selectionHTML.indexOf('smartcomment-hl-') !== -1) {
            res = this.enums.INVALID_SELECTION_ALREADY_COMMENTED;
            // The selection contains dynamic content. We don't allow that.
        } else if (selectionHTML.indexOf('sc-dynamic-block') !== -1) {
            res = this.enums.INVALID_SELECTION_INCLUDES_DYNAMIC_CONTENT;
            // The selection is empty
        } else if (selectionHTML.trim() === '') {
            res = this.enums.INVALID_SELECTION_IS_EMPTY;
            // The selection contains line breaks
        } else if (selectionHTML.match(/[\n\r]/)) {
            res = this.enums.INVALID_SELECTION_CONTAINS_LINEBREAKS;
            // The selection contains HTML content
        } else if (selectionHTML.match(/<[^>]*>/)) {
            res = this.enums.INVALID_SELECTION_CONTAINS_HTML;
        }

        // Show an error message to the user if the selection is invalid
        if (res !== this.enums.SELECTION_VALID) {
            this.showError(res);
        }

        return res;
    },

    /**
     * Binds the selection events
     *
     * @return void
     */
    bindEvents: function () {
        // Load all events
        SmartComments.Selection.ImageSelection.bindEvents();
        SmartComments.Selection.TextSelection.bindEvents();
        SmartComments.Selection.DynamicBlockSelection.bindEvents();

        var self = this;

        // Save mouse movements to determine the popup position
        $(document.body).mousemove(function (event) {
            if (self.isCapturing) {
                return;
            }
            self.lastPos.x = event.pageX;
            self.lastPos.y = event.pageY;
        });
    },

    /**
     * Shows an error message
     *
     * @param id
     * @return void
     */
    showError: function (id) {
        SmartComments.notifications.error(
            mw.msg('sic-selection-error-title'),
            mw.msg('sic-selection-error-' + id)
        );
    },

    /**
     * @param position
     * @return void
     */
    setSelectionFromString: function (position) {
        if (position.indexOf("|") !== -1) {
            var parts = position.split("|");
            this.selection = {
                text: parts[0],
                index: parts[1]
            };
        } else this.selection = position;
    },

    /**
     * @return void
     */
    screenshotSelection: function (callback) {
        var minMaxWidth = 500,
            minMaxHeight = 50,
            maxChars = 45,
            width = this.lastPos.x - this.startPos.x,
            height = this.lastPos.y - this.startPos.y,
            scale = 100;

        if (width < minMaxWidth || width > minMaxWidth) {
            width = minMaxWidth;
        }

        if (height < minMaxHeight || height > minMaxHeight) {
            height = minMaxHeight;
        }

        var x = this.lastPos.x - (this.lastPos.x - this.startPos.x) / 2,
            y = this.lastPos.y - (this.lastPos.y - this.startPos.y) / 2;

        // Determine scale of the image
        if (typeof SmartComments.Selection.selection !== 'undefined'
            && typeof SmartComments.Selection.selection.text !== 'undefined'
            && SmartComments.Selection.selection.text.length > maxChars
        ) {
            scale = (100 * maxChars) / SmartComments.Selection.selection.text.length;
        }

        SmartComments.helperFunctions.screenshot("default", {
            x: x - width / 2,
            y: y - height / 2,
            width: minMaxWidth,
            height: minMaxHeight,
            /* Scaling doesnt actually 'zooms' the image; todo; zoom the canvas scale, zoom ratio must be: < 50 ? .5 : scale / 100, */
            onclone: function (clone) {
                var activeItems = clone.getElementsByClassName(SmartComments.Highlighting.enums.HIGHLIGHT_CLASS);
                for (var i = 0; i < activeItems.length; i++) {
                    activeItems[i].style.background = "#ffffe0";
                    activeItems[i].style["border-top"] = "1px solid rgba(0,0,0,0.2)";
                    activeItems[i].style["border-bottom"] = "1px solid rgba(0,0,0,0.2)";
                    if (i === 0) {
                        activeItems[i].style["border-left"] = "1px solid rgba(0,0,0,0.2)";
                    }
                    if (i === activeItems.length - 1) {
                        activeItems[i].style["border-right"] = "1px solid rgba(0,0,0,0.2)";
                    }
                }
                clone.getElementById('sic-spinner').remove();
                $(clone).find('image').remove();
                return clone;
            }
        }, function (canvas) {
            callback(canvas);
        });

    },

    /**
     * Registers an addon
     * @param addon
     */
    registerAddon: function (name, addon) {
        if (SmartComments.enabledAddons.indexOf(name) !== -1) {
            addon.bindEvents();
        }
    }

};