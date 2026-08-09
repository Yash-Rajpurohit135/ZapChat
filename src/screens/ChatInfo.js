import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, Alert, FlatList, StyleSheet, TouchableOpacity } from 'react-native';

import Cell from '../components/Cell';
import { colors as defaultColors } from '../config/constants';
import { database } from '../config/firebase';
import { ThemeContext } from '../contexts/ThemeContext';

const createStyles = (th) =>
  StyleSheet.create({
    avatar: {
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: th.primary,
      borderRadius: 60,
      height: 120,
      justifyContent: 'center',
      marginBottom: 10,
      marginTop: 20,
      width: 120,
    },
    avatarLabel: {
      color: th.card,
      fontSize: 36,
      fontWeight: 'bold',
    },
    cell: {
      backgroundColor: th.card,
      borderRadius: 10,
      elevation: 0.5,
      marginBottom: 15,
      marginHorizontal: 16,
      paddingHorizontal: 10,
      paddingVertical: 12,
      shadowColor: th.shadow || '#000',
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    chatHeader: {
      alignItems: 'center',
      marginBottom: 20,
    },
    chatTitle: {
      color: th.text,
      fontSize: 20,
      fontWeight: '600',
      textAlign: 'center',
    },
    container: {
      backgroundColor: th.background,
      flex: 1,
    },
    groupLabel: {
      color: th.primary,
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 4,
    },
    userContainer: {
      alignItems: 'center',
      backgroundColor: th.card,
      borderBottomColor: th.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    userEmail: {
      color: th.textSecondary || th.border,
      fontSize: 14,
    },
    userInfo: {
      marginLeft: 12,
    },
    userName: {
      color: th.text,
      fontSize: 16,
      fontWeight: '500',
    },
    usersList: {
      backgroundColor: th.card,
      borderRadius: 10,
      elevation: 0.5,
      marginHorizontal: 16,
      paddingVertical: 12,
      shadowColor: th.shadow || '#000',
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    usersTitle: {
      color: th.text,
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
      marginHorizontal: 16,
      marginTop: 20,
    },
  });

const ChatInfo = ({ route }) => {
  const { chatId, chatName } = route.params;
  const [users, setUsers] = useState([]);
  const [groupName, setGroupName] = useState('');

  const themeContext = useContext(ThemeContext) || {};
  const theme = themeContext.theme || {};
  const th = theme.colors || {
    background: defaultColors.background,
    card: defaultColors.card,
    text: defaultColors.text,
    textSecondary: defaultColors.textSecondary || defaultColors.border,
    primary: defaultColors.primary,
    border: defaultColors.border,
    shadow: '#000',
  };

  const styles = useMemo(() => createStyles(th), [th]);

  useEffect(() => {
    const fetchChatInfo = async () => {
      try {
        const chatRef = doc(database, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);

        if (chatDoc.exists()) {
          const chatData = chatDoc.data();
          if (chatData) {
            if (Array.isArray(chatData.users)) {
              setUsers(chatData.users);
            }
            if (chatData.groupName) {
              setGroupName(chatData.groupName);
            }
          } else {
            setUsers([]);
          }
        } else {
          Alert.alert('Error', 'Chat does not exist');
        }
      } catch (error) {
        Alert.alert('Error', 'An error occurred while fetching chat info');
        console.error('Error fetching chat info: ', error);
      }
    };

    fetchChatInfo();
  }, [chatId]);

  // try to open avatar: prefer provided photoURL, otherwise lookup users collection by uid/id or email
  const handleHeaderAvatarPress = async (user) => {
    if (!user) {
      Alert.alert('No profile picture', 'No profile picture available for preview');
      return;
    }

    if (user.photoURL) {
      openImageModal(user.photoURL);
      return;
    }

    try {
      const uid = user.uid || user.id || user.userId || null;
      if (uid) {
        const userDoc = await getDoc(doc(database, 'users', uid));
        if (userDoc.exists()) {
          const ud = userDoc.data();
          if (ud?.photoURL) {
            openImageModal(ud.photoURL);
            return;
          }
        }
      }

      const email = user.email || null;
      if (email) {
        const q = query(collection(database, 'users'), where('email', '==', email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const ud = snap.docs[0].data();
          if (ud?.photoURL) {
            openImageModal(ud.photoURL);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Error looking up user avatar', e);
    }

    Alert.alert('No profile picture', 'No profile picture available for preview');
  };

  const renderUser = ({ item }) => (
    <View style={styles.userContainer}>
      <TouchableOpacity onPress={() => handleHeaderAvatarPress(item)}>
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={styles.smallAvatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarLetter}>{(item.name || item.displayName || 'U')[0].toUpperCase()}</Text>
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
    </View>
  );

  const uniqueUsers = Array.from(new Map(users.map((user) => [user.email, user])).values());

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.avatar}>
        <View>
          <Text style={styles.avatarLabel}>
            {chatName.split(' ').reduce((prev, current) => `${prev}${current[0]}`, '')}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.chatHeader}>
        {groupName ? (
          <>
            <Text style={styles.groupLabel}>Group</Text>
            <Text style={styles.chatTitle}>{chatName}</Text>
          </>
        ) : (
          <Text style={styles.chatTitle}>{chatName}</Text>
        )}
      </View>

      <Cell
        title="About"
        subtitle="Available"
        icon="information-circle-outline"
        iconColor={th.primary}
        style={styles.cell}
      />

      <Text style={styles.usersTitle}>Members</Text>
      <FlatList
        data={uniqueUsers}
        renderItem={renderUser}
        keyExtractor={(item) => item.email}
        contentContainerStyle={styles.usersList}
      />
    </SafeAreaView>
  );
};

ChatInfo.propTypes = {
  route: PropTypes.object.isRequired,
};

export default ChatInfo;
