$(document).ready(function () {
    mw.loader.using('mediawiki.api').then(function () {
        const Vue = require('vue');
        const App = require('./SmartComments.vue');

        console.log('App.js loaded');

        Vue.createMwApp(App).mount('#smartcomments-app');
    }).catch(function (error) {
        console.error('Error loading App.js:', error);
    });
});