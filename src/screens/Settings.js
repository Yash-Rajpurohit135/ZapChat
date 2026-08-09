import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import {
  Text,
  View,
  Linking,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';

import Cell from '../components/Cell';
import { auth } from '../config/firebase';
import ContactRow from '../components/ContactRow';
import { ThemeContext } from '../contexts/ThemeContext';

class Settings extends Component {
  static contextType = ThemeContext;

  constructor(props) {
    super(props);
  }

  navigateToProfile = () => {
    this.props.navigation.navigate('Profile');
  };

  navigateToAccount = () => {
    this.props.navigation.navigate('Account');
  };

  navigateToHelp = () => {
    this.props.navigation.navigate('Help');
  };

  handleInviteFriend = () => {
    alert('Share touched');
  };

  getUserDisplayName = () => {
    return auth?.currentUser?.displayName ?? 'No name';
  };

  getUserEmail = () => {
    return auth?.currentUser?.email;
  };

  render() {
    const { theme, isDark, toggleTheme } = this.context || {};
    const colors = (theme && theme.colors) || {};

    return (
      <View style={[styles.container, { backgroundColor: colors.background ?? '#fff' }]}>
        <ContactRow
          name={this.getUserDisplayName()}
          subtitle={this.getUserEmail()}
          style={[
            styles.contactRow,
            { backgroundColor: colors.card ?? '#fff', borderColor: colors.border ?? '#e0e0e0' },
          ]}
          onPress={this.navigateToProfile}
        />

        {/* Dark mode toggle */}
        <View
          style={[
            styles.row,
            { backgroundColor: colors.card ?? '#fff', borderTopColor: colors.border ?? '#e0e0e0' },
          ]}
        >
          <Text style={[styles.rowText, { color: colors.text ?? '#000' }]}>Dark mode</Text>
          <Switch
            value={!!isDark}
            onValueChange={toggleTheme}
            thumbColor={isDark ? colors.teal ?? '#06b6d4' : undefined}
            trackColor={{ true: colors.primary ?? '#06b6d4', false: '#ccc' }}
          />
        </View>

        <Cell
          title="Account"
          subtitle="Privacy, logout, delete account"
          icon="key-outline"
          onPress={this.navigateToAccount}
          iconColor={colors.text ?? '#000'}
          style={[{ marginTop: 20, backgroundColor: colors.card ?? '#fff' }]}
        />

        <Cell
          title="Help"
          subtitle="Contact us, app info"
          icon="help-circle-outline"
          iconColor={colors.text ?? '#000'}
          onPress={this.navigateToHelp}
          style={{ backgroundColor: colors.card ?? '#fff' }}
        />

        <Cell
          title="Invite a friend"
          icon="people-outline"
          iconColor={colors.text ?? '#000'}
          onPress={this.handleInviteFriend}
          showForwardIcon={false}
          style={{ backgroundColor: colors.card ?? '#fff' }}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contactRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    fontSize: 16,
  },
});

Settings.propTypes = {
  navigation: PropTypes.object.isRequired,
};

export default Settings;
