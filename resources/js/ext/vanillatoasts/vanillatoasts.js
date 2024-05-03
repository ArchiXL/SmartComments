(function(root, factory) {
    // commonjs
    if (typeof exports === 'object') {
        module.exports = factory();
        // global
    } else {
        root.VanillaToasts = factory();
    }
})(this, function() {

    // We need DOM to be ready
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('DOMContentLoaded', init);
    }

    // Initialize library
    function init() {
        // Toast container
        var container = document.createElement('div');
        container.id = 'vanillatoasts-container';
        document.body.appendChild(container);
    }

    var VanillaToasts = {};
    var autoincrement = 0;

    VanillaToasts.create = function(options) {
        var toast = document.createElement('div');
        toast.id = ++autoincrement;
        toast.id = 'toast-' + toast.id;
        toast.className = 'vanillatoasts-toast';

        var closeButton = document.createElement( 'span' );
        closeButton.className = 'close'
        closeButton.innerHTML = '<svg class="svg-icon" style="width: 1em; height: 1em;vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M574.293333 512L810.666667 748.373333V810.666667h-62.293334L512 574.293333 275.626667 810.666667H213.333333v-62.293334L449.706667 512 213.333333 275.626667V213.333333h62.293334L512 449.706667 748.373333 213.333333H810.666667v62.293334L574.293333 512z" fill="" /></svg>';
        toast.appendChild( closeButton );

        // title
        if (options.title) {
            var h4 = document.createElement('h4');
            h4.className = 'vanillatoasts-title';
            h4.innerHTML = options.title;
            toast.appendChild(h4);
        }

        // text
        if (options.text) {
            var p = document.createElement('p');
            p.className = 'vanillatoasts-text';
            p.innerHTML = options.text;
            toast.appendChild(p);
        }

        // icon
        if (options.icon) {
            var img = document.createElement('img');
            img.src = options.icon;
            img.className = 'vanillatoasts-icon';
            toast.appendChild(img);
        }

        // click callback
        if (typeof options.callback === 'function') {
            toast.addEventListener('click', options.callback);
        }

        // toast api
        toast.hide = function() {
            toast.className += ' vanillatoasts-fadeOut';
            toast.addEventListener('animationend', removeToast, false);
        };

        // autohide
        if (options.timeout) {
            setTimeout(toast.hide, options.timeout);
        }

        if (options.type) {
            toast.className += ' vanillatoasts-' + options.type;
        }

        toast.addEventListener('click', toast.hide);


        function removeToast() {
            document.getElementById('vanillatoasts-container').removeChild(toast);
        }

        document.getElementById('vanillatoasts-container').appendChild(toast);
        return toast;

    };

    return VanillaToasts;

});