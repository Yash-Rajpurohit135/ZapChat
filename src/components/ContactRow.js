import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import PropTypes from 'prop-types';
import { ThemeContext } from '../contexts/ThemeContext';

const ContactRow = ({
  name,
  subtitle,
  subtitle2,
  onPress,
  onLongPress,
  selected,
  style,
  avatar,
  newMessageCount,
  showForwardIcon = true,
}) => {
  const { theme } = useContext(ThemeContext) || {};
  const colors = (theme && theme.colors) || {};

  const subtitleColor = colors.textSecondary || colors.border || '#6b7280';

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.row,
        {
          backgroundColor: selected ? (colors.grey || '#EDEDED') : (colors.card || '#fff'),
          borderColor: colors.border || '#e0e0e0',
        },
        style,
      ]}
      activeOpacity={0.8}
    >
      {avatar ? (
        (() => {
          const imageSource = typeof avatar === 'string' ? { uri: avatar } : avatar;
          return <Image source={imageSource} style={styles.avatar} />;
        })()
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary || '#00b894' }]}>
          <Text style={[styles.avatarLabel, { color: colors.card || '#fff' }]}>
            {name ? name.charAt(0).toUpperCase() : '?'}
          </Text>
        </View>
      )}

      <View style={styles.middle}>
        <Text style={[styles.name, { color: colors.text || '#000' }]} numberOfLines={1}>
          {name}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: subtitleColor }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>
        {subtitle2 ? <Text style={[styles.subtitle2, { color: subtitleColor }]}>{subtitle2}</Text> : null}
        {newMessageCount ? (
          <View style={[styles.badge, { backgroundColor: colors.teal || '#00b894' }]}>
            <Text style={styles.badgeText}>{newMessageCount}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  middle: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  subtitle2: {
    fontSize: 12,
  },
  badge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

ContactRow.propTypes = {
  name: PropTypes.string,
  subtitle: PropTypes.string,
  subtitle2: PropTypes.string,
  onPress: PropTypes.func,
  onLongPress: PropTypes.func,
  selected: PropTypes.bool,
  style: PropTypes.any,
  avatar: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  newMessageCount: PropTypes.number,
  showForwardIcon: PropTypes.bool,
};

export default ContactRow;
