$(document).ready(function () {
    const Vue = require('vue');
    const App = require('./SmartComments.vue');

    Vue.createMwApp(App).mount('#smartcomments-app');
});