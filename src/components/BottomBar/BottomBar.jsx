import React, { useEffect } from 'react';
import styled from 'styled-components';
import config from '../../config/config.json';

const Container = styled.div`
  background-color: #2b2b2b;
  height: ${config.bottomBarHeight + 'px'};
  border-top: 1px solid rgb(58, 58, 58);
`;

const BottomBar = () => {
  return <Container></Container>;
};

export default BottomBar;
