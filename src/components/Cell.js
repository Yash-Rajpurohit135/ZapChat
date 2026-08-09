import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../contexts/ThemeContext';

const Cell = ({ title, subtitle, icon, onPress, iconColor, showForwardIcon = true, style }) => {
  const { theme } = useContext(ThemeContext) || {};
  const colors = (theme && theme.colors) || {};

  const titleColor = colors.text ?? '#000';
  const subtitleColor = colors.textSecondary ?? (colors.border ?? '#6b7280');
  const iconCol = iconColor ?? colors.text ?? '#000';
  const forwardColor = colors.border ?? '#c7c7cc';
  const background = colors.card ?? '#fff';
  const borderColor = colors.border ?? '#e0e0e0';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, { backgroundColor: background, borderBottomColor: borderColor }, style]}
      activeOpacity={0.8}
    >
      {icon ? <Ionicons name={icon} size={22} color={iconCol} style={styles.icon} /> : null}

      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: subtitleColor }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {showForwardIcon ? <Ionicons name="chevron-forward" size={20} color={forwardColor} /> : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});

Cell.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  icon: PropTypes.string,
  onPress: PropTypes.func,
  iconColor: PropTypes.string,
  showForwardIcon: PropTypes.bool,
  style: PropTypes.any,
};

export default Cell;
