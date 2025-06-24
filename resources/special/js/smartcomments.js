$(document).ready(function () {

    $('.sic-enable-commenting').trigger('click');

    $("span.sic-sp-admin-buttons > button, td.action-confirm a").click(buttonConfirm);

    $(document).on('change', '.sic-filter-dd', function () {
        doFilter(0);
    });

    var maxItems = mw.config.get('wgSmartComments').maxCommentsShownOnSpecial;

    $(document).on('click', "#sic-sp-showprevious", function () {
        doFilter(-maxItems);
    });

    $(document).on('click', "#sic-sp-shownext", function () {
        doFilter(maxItems);
    });

    $(document).on('click', '.sc-tab', (e) => {
        let tab = $(e.target);
        if (tab.hasClass('active')) {
            return;
        }
        $('.sc-tab.active').removeClass('active');
        tab.addClass('active');
        $('.sc-tab-body').addClass('sc-hide');
        $('#' + tab.attr('tab-reference')).removeClass('sc-hide');
    });

    // Handle open comment button clicks
    $(document).on('click', '.specialOpenCommentButton', function(e) {
        e.preventDefault();
        const commentId = $(this).data('comment-id');
        console.log('Open comment button clicked, commentId:', commentId);
        console.log('SmartCommentsEventManager available:', !!window.SmartCommentsEventManager);
        
        if (commentId && window.SmartCommentsEventManager) {
            // Trigger the SmartComments system to open the comment
            console.log('Triggering open comment event for ID:', commentId);
            window.SmartCommentsEventManager.triggerOpenComment(commentId);
        } else {
            console.error('Cannot open comment - missing commentId or EventManager');
        }
    });

});

function buttonConfirm(e) {
    const response = confirm(mw.msg("sic-sp-adminbutton-confirm"));

    if (!response) {
        e.preventDefault();
    }
}

function doFilter(increment) {
    var commentStatus = $("#sic-sp-flt-status").val() === 'other' ? null : $("#sic-sp-flt-status").val();
    var commentPage = $("#sic-sp-flt-page").val() === 'other' ? null : $("#sic-sp-flt-page").val();
    var commentAuthor = $("#sic-sp-flt-author").val() === 'other' ? null : $("#sic-sp-flt-author").val();

    var urlParams = new URLSearchParams(window.location.search);
    var offset = Number(urlParams.get('offset')) + increment;

    var params = {};

    if (offset !== 0) {
        params['offset'] = offset;
    }

    if (commentStatus) {
        params['status'] = commentStatus;
    }

    if (commentAuthor) {
        params['author'] = commentAuthor;
    }

    if (commentPage) {
        params['page'] = commentPage;
    }

    var scSpecial = new mw.Title('SmartComments', -1);
    var redirectUrl = mw.config.get('wgServer') + scSpecial.getUrl(params);
    location.assign(redirectUrl);
}