import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect } from 'react';
import styled from 'styled-components';
import config from '../../config/config.json';
import { faExchange, faCog } from '@fortawesome/free-solid-svg-icons';
import { useDispatch, useSelector } from 'react-redux';
import { NAVBAR_PAGES, selectPage, setPage } from '../../features/navbarSlice';

const Container = styled.div`
    background-color: #2b2b2b;
    height: ${config.bottomBarHeight + 'px'};
    border-top: 1px solid rgb(58, 58, 58);
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
`;

const StyledFontAwesomeIcon = styled(FontAwesomeIcon)`
    cursor: pointer;
    :hover {
        color: white;
    }
`;

const Navbar = () => {
    const dispatch = useDispatch();
    const selectedPage = useSelector(selectPage);

    const navigate = (page) => {
        dispatch(setPage(page));
    };

    return (
        <Container>
            {Object.values(NAVBAR_PAGES).map((obj) => (
                <StyledFontAwesomeIcon
                    style={{
                        marginRight: '4%',
                        display: obj.active ? 'block' : 'none',
                    }}
                    icon={obj.icon}
                    color={obj.value == selectedPage ? 'white' : 'grey'}
                    onClick={() => navigate(obj.value)}
                    size="2x"
                    key={obj.value}
                />
            ))}
        </Container>
    );
};

export default Navbar;
