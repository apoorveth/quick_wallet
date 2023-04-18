export const STORAGE_SIMUALTIONS_KEY = 'simulations';
export const STORAGE_SETTINGS_KEY = 'settings';
export const STORAGE_USER_ID_KEY = 'user_id';

export const setStorage = async (key, value) => {
    let newStorage = {};
    newStorage[key] = value;
    await chrome.storage.sync.set(newStorage);
};

export const updateSimulationState = async (id, state) => {
    let storage = await chrome.storage.sync.get(STORAGE_SIMUALTIONS_KEY);

    let newSimulations = storage[STORAGE_SIMUALTIONS_KEY];
    newSimulations = newSimulations.map((x) =>
        x.id === id
            ? {
                  ...x,
                  state,
              }
            : x
    );
    await setStorage(STORAGE_SIMUALTIONS_KEY, newSimulations);
};

export const addSimulation = async (simulation) => {
    const storage = await chrome.storage.sync.get([STORAGE_SIMUALTIONS_KEY]);
    let simulations = storage[STORAGE_SIMUALTIONS_KEY] || [];
    simulations.push(simulation);
    await setStorage(STORAGE_SIMUALTIONS_KEY, simulations);
};

export const updateWalletMessageAndState = async (id, walletMessage, state) => {
    console.log('Updating simulation with id - ', id);
    let storage = await chrome.storage.sync.get(STORAGE_SIMUALTIONS_KEY);

    let newSimulations = storage[STORAGE_SIMUALTIONS_KEY];
    newSimulations = newSimulations.map((x) =>
        x.id === id
            ? {
                  ...x,
                  walletMessage,
                  state,
              }
            : x
    );

    await setStorage(STORAGE_SIMUALTIONS_KEY, newSimulations);
};

export const removeSimulation = async (id) => {
    let storage = await chrome.storage.sync.get(STORAGE_SIMUALTIONS_KEY);

    let simulations = storage[STORAGE_SIMUALTIONS_KEY].filter(
        (storedSimulation) => {
            return storedSimulation.id !== id;
        }
    );

    return setStorage(STORAGE_SIMUALTIONS_KEY, simulations);
};
