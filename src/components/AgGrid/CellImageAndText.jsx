import React from 'react';
import styled from 'styled-components';

const CellContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
`;

const Image = styled.img`
    width: 20px;
    border-radius: 50%;
    margin-right: 2%;
`;

const imageOverride = {
    USDT: 'https://seeklogo.com/images/T/tether-usdt-logo-FA55C7F397-seeklogo.com.png',
    USDC: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
};

const CellImageAndText = ({ img, text }) => {
    return (
        <CellContainer>
            <Image
                src={imageOverride[text] ? imageOverride[text] : img}
            ></Image>
            {text}
        </CellContainer>
    );
};

export default CellImageAndText;
