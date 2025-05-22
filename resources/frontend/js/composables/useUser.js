const { ref, onMounted } = require('vue');

function useUser() {
    const userRights = ref([]);

    // Fetch user rights when composable is initialized
    onMounted(async () => {
        userRights.value = await mw.user.getRights();
    });

    const canManageComments = () => {
        return userRights.value.includes('manage-inlinecomments');
    }

    const canAddComments = () => {
        return userRights.value.includes('add-inlinecomments');
    }

    return {
        userRights,
        canManageComments,
        canAddComments,
    }
}

module.exports = useUser;