import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { useNavigation } from '@react-navigation/native';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';

import { colors as defaultColors } from '../config/constants';
import { ThemeContext } from '../contexts/ThemeContext';

const ChatHeader = ({ chatName, chatId }) => {
  const navigation = useNavigation();
  const { theme } = useContext(ThemeContext) || {};
  const th = theme?.colors || {};

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: th?.card ?? '#fff' }]}
      onPress={() => navigation.navigate('ChatInfo', { chatId, chatName })}
    >
      <TouchableOpacity
        style={[styles.avatar, { backgroundColor: th?.primary ?? defaultColors.primary }]}
        onPress={() => navigation.navigate('ChatInfo', { chatId, chatName })}
      >
        <View>
          <Text style={[styles.avatarLabel, { color: th?.card ?? '#fff' }]}>
            {chatName.split(' ').reduce((prev, current) => `${prev}${current[0]}`, '')}
          </Text>
        </View>
      </TouchableOpacity>

      <Text style={[styles.chatName, { color: th?.text ?? '#000' }]} numberOfLines={1}>
        {chatName}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginLeft: -30,
    marginRight: 10,
    width: 40,
  },
  avatarLabel: {
    fontSize: 20,
    fontWeight: '700',
  },
  chatName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
});

ChatHeader.propTypes = {
  chatName: PropTypes.string.isRequired,
  chatId: PropTypes.string.isRequired,
};

export default ChatHeader;
