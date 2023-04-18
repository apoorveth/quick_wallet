import React, {
    useState,
    useRef,
    useEffect,
    useMemo,
    useCallback,
} from 'react';
import styled, { css } from 'styled-components';
import Toggle from 'react-toggle';
import './Settings.css';
import { useDispatch, useSelector } from 'react-redux';
import { selectAllSettings, updateSetting } from '../../features/userSlice';
import SETTINGS_CONFIG from '../../config/settings';

const SettingsContainer = styled.div`
    padding-left: 1rem;
    height: -webkit-fill-available;
    padding-top: 1rem;
    padding-right: 1rem;
    padding-bottom: 1rem;
    overflow: hidden;
    padding-left: 2%;
    padding-top: 2%;
`;

const Heading = styled.div`
    font-size: 4vh;
    color: white;
    text-align: left;
    margin-bottom: 2%;
    @media (min-width: 900px) {
        font-size: 3vh;
    }
`;

const SettingRow = styled.div`
    justify-content: space-between;
    display: flex;
    margin-bottom: 1%;
    align-items: center;

    @media (max-width: 900px) {
        margin-bottom: 2%;
    }
`;

const SettingLabel = styled.div`
    display: flex;
    flex-direction: column;
    text-align: left;
`;

const SettingName = styled.div`
    color: #eeeeee;
    font-size: 3vh;
    display: flex;
    flex-direction: row;
    align-items: center;
    @media (min-width: 900px) {
        font-size: 2.5vh;
    }
`;

const BetaLabel = styled.div`
    background-color: white;
    color: black;
    font-size: 1.8vh;
    width: 80px;
    text-align: center;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 2%;
    height: fit-content;

    @media (max-width: 900px) {
        font-size: 2.2vh;
        width: 60px;
    }
`;

const SettingDetails = styled.div`
    color: rgb(189, 189, 189);
    margin-top: 5px;

    @media (min-width: 900px) {
        font-size: 1.7vh;
    }

    .settingsLink {
        color: white;
    }
`;

const SettingInput = styled.input`
    border-radius: 5px;
    padding-left: 10px;
    background-color: #272727;
    border: 1px solid #b3b3b3;
    font-size: 2vh;
    color: white;
    width: 30%;
    height: fit-content;
    padding-top: 8px;
    padding-bottom: 8px;

    @media (min-width: 900px) {
        width: 20%;
    }
`;

const ToggleSetting = ({ checked, onChange }) => {
    return (
        <label>
            <Toggle checked={checked} icons={false} onChange={onChange} />
        </label>
    );
};

const Settings = () => {
    const dispatch = useDispatch();
    const settings = useSelector(selectAllSettings);

    const updateSettings = async (key, value) => {
        console.log('Updating setting - ', key, value);
        dispatch(updateSetting(key, value));
    };
    return (
        <SettingsContainer>
            <Heading>Settings</Heading>
            {Object.entries(SETTINGS_CONFIG).map(([key, value]) => {
                let settingJSX = <div></div>;
                if (value.type == 'toggle') {
                    settingJSX = (
                        <ToggleSetting
                            onChange={(e) => {
                                updateSettings(key, e.target.checked);
                            }}
                            checked={settings[key]}
                        ></ToggleSetting>
                    );
                } else if (value.type == 'input') {
                    settingJSX = (
                        <SettingInput
                            onChange={(e) => {
                                updateSettings(key, e.target.value);
                            }}
                            value={settings[key]}
                            type={value.inputType ? value.inputType : 'text'}
                        ></SettingInput>
                    );
                }
                return (
                    <SettingRow key={key}>
                        <SettingLabel>
                            <SettingName>
                                {value.labelTitle}
                                {value.beta && <BetaLabel>BETA</BetaLabel>}
                            </SettingName>
                            {value.labelDescription && (
                                <SettingDetails
                                    dangerouslySetInnerHTML={{
                                        __html: value.labelDescription,
                                    }}
                                ></SettingDetails>
                            )}
                        </SettingLabel>
                        {settingJSX}
                    </SettingRow>
                );
            })}
        </SettingsContainer>
    );
};

export default Settings;
