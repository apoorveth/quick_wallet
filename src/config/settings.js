const SETTINGS_CONFIG = {
    debugger: {
        labelTitle: 'Debugger',
        type: 'toggle',
        defaultValue: false,
        labelDescription:
            'Edit and simulate transactions before sendning them on chain',
    },
    minimizedMetamask: {
        labelTitle: 'Minimize Metamask',
        labelDescription:
            'On macOS, Metamask opens in the full screen mode by default. Use this to force metamask to open as a small popuo on top of your browser',
        type: 'toggle',
        defaultValue: false,
    },
    tenderlyApiKey: {
        labelTitle: 'Tenderly API Key',
        labelDescription:
            'Read "Get an API Key" over <a class="settingsLink" href="https://docs.tenderly.co/simulations-and-forks/reference/configuration-of-api-access" target="_blank">here</a> to create an API Key',
        type: 'input',
        defaultValue: '',
    },
};

export const getDetfaultSettings = () => {
    const defaultSettings = {};

    Object.entries(SETTINGS_CONFIG).forEach(([key, value]) => {
        defaultSettings[key] = value.defaultValue;
    });
    return defaultSettings;
};

export default SETTINGS_CONFIG;
