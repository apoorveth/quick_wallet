const SETTINGS_CONFIG = {
    generalCategory: {
        type: 'seperator',
        title: 'General Settings',
    },
    debugger: {
        labelTitle: 'Debugger',
        type: 'toggle',
        defaultValue: true,
        labelDescription:
            'Edit and simulate transactions before sendning them on chain',
    },
    minimizedMetamask: {
        labelTitle: 'Minimize Wallet',
        labelDescription:
            "Force wallet to open in a minimized view on macOS. It's in beta so it might break in some cases.",
        type: 'toggle',
        defaultValue: false,
        beta: true,
    },
    evmCategory: {
        type: 'seperator',
        title: 'EVM Settings',
    },
    tenderlyApiKey: {
        labelTitle: 'Tenderly API Key (optional)',
        labelDescription:
            'Read "Get an API Key" over <a class="settingsLink" href="https://docs.tenderly.co/simulations-and-forks/reference/configuration-of-api-access" target="_blank">here</a> to create an API Key',
        type: 'input',
        defaultValue: '',
        inputType: 'password',
    },
    tenderlyUsername: {
        labelTitle: 'Tenderly Username (optional)',
        labelDescription:
            'Get your tenderly username from <a class="settingsLink" href="https://dashboard.tenderly.co/account" target="_blank">here</a>',
        type: 'input',
        defaultValue: '',
        inputType: 'text',
    },
    tenderlyProjectName: {
        labelTitle: 'Tenderly Project Name (optional)',
        labelDescription:
            'Get your tenderly project name from <a class="settingsLink" href="https://dashboard.tenderly.co/projects" target="_blank">here</a>',
        type: 'input',
        defaultValue: '',
        inputType: 'text',
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
