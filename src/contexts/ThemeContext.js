import React, { Component } from 'react';
import { lightTheme, darkTheme } from '../config/themes';

export const ThemeContext = React.createContext({
  isDark: false,
  theme: lightTheme,
  toggleTheme: () => {},
});

export class ThemeProvider extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isDark: false,
      theme: lightTheme,
    };
  }

  toggleTheme = () => {
    this.setState((prev) => ({
      isDark: !prev.isDark,
      theme: prev.isDark ? lightTheme : darkTheme,
    }));
  };

  render() {
    const { children } = this.props;
    return (
      <ThemeContext.Provider
        value={{
          isDark: this.state.isDark,
          theme: this.state.theme,
          toggleTheme: this.toggleTheme,
        }}
      >
        {children}
      </ThemeContext.Provider>
    );
  }
}