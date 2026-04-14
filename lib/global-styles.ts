import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    font-family: ${({ theme }) => theme?.fonts?.body ?? "'Inter', system-ui, sans-serif"};
    background-color: ${({ theme }) => theme?.colors?.background ?? '#050505'};
    color: ${({ theme }) => theme?.colors?.text ?? '#FFFFFF'};
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    min-height: 100vh;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: ${({ theme }) => theme?.fonts?.body ?? "'Inter', system-ui, sans-serif"};
    letter-spacing: 0.6px;
    font-weight: 700;
    text-transform: uppercase;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  button {
    cursor: pointer;
    border: none;
    outline: none;
    font-family: inherit;
  }

  input, textarea, select {
    font-family: inherit;
    outline: none;
  }

  img {
    max-width: 100%;
    display: block;
  }

  [data-hydration-error] {
    display: none !important;
  }

  ::-webkit-scrollbar {
    width: 6px;
  }

  ::-webkit-scrollbar-track {
    background: ${({ theme }) => theme?.colors?.background ?? '#050505'};
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme?.colors?.border ?? '#222222'};
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme?.colors?.borderLight ?? '#333333'};
  }

  ::selection {
    background: ${({ theme }) => theme?.colors?.gold ?? '#FFD700'};
    color: ${({ theme }) => theme?.colors?.background ?? '#050505'};
  }
`;
