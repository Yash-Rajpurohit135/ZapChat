import React, { Component } from 'react';
import { View, Alert } from 'react-native';

import Cell from '../components/Cell';
import { colors } from '../config/constants';

class Help extends Component {
  constructor(props) {
    super(props);
  }

  handleContactUs = () => {
    alert('Help touched');
  };

  handleAppInfo = () => {
    Alert.alert(
      'ZapChat',
      'Developed by Team Zap⚡Chat',
      [
        {
          text: 'Ok',
          onPress: () => {},
        },
      ],
      { cancelable: true }
    );
  };

  render() {
    return (
      <View>
        <Cell
          title="Contact us"
          subtitle="Questions? Need help?"
          icon="people-outline"
          tintColor={colors.primary}
          onPress={this.handleContactUs}
          showForwardIcon={false}
          style={{ marginTop: 20 }}
        />
        <Cell
          title="App info"
          icon="information-circle-outline"
          tintColor={colors.pink}
          onPress={this.handleAppInfo}
          showForwardIcon={false}
        />
      </View>
    );
  }
}

export default Help;
