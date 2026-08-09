import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  doc,
  where,
  query,
  setDoc,
  orderBy,
  deleteDoc,
  collection,
  onSnapshot,
} from 'firebase/firestore';
import {
  Text,
  View,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  ScrollView,
  BackHandler,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import ContactRow from '../components/ContactRow';
import { auth, database } from '../config/firebase';
import { ThemeContext } from '../contexts/ThemeContext';
import useUsersMap from '../hooks/useUsersMap';

const createStyles = (theme) =>
  StyleSheet.create({
    blankContainer: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
    },
    container: {
      flex: 1,
      backgroundColor: theme?.colors?.background ?? '#fff',
    },
    fab: {
      bottom: 12,
      position: 'absolute',
      right: 12,
    },
    fabContainer: {
      alignItems: 'center',
      backgroundColor: theme?.colors?.teal ?? '#00b894',
      borderRadius: 28,
      height: 56,
      justifyContent: 'center',
      width: 56,
    },
    itemCount: {
      color: theme?.colors?.teal ?? '#00b894',
      fontSize: 18,
      fontWeight: '400',
      left: 100,
    },
    loadingContainer: {
      alignItems: 'center',
      color: theme?.colors?.teal ?? '#00b894',
      flex: 1,
      justifyContent: 'center',
    },
    selectedContactRow: {
      backgroundColor: theme?.colors?.grey ?? '#EDEDED',
    },
    textContainer: {
      fontSize: 16,
      color: theme?.colors?.text ?? '#000',
    },
    trashBin: {
      right: 12,
    },
  });

function Chats(props) {
  const usersMap = useUsersMap();
  const meId = auth?.currentUser?.uid || auth?.currentUser?.email;

  const navigation = useNavigation();
  const { theme, isDark, toggleTheme } = useContext(ThemeContext) || {};
  const styles = useMemo(() => createStyles(theme || { colors: {} }), [theme]);

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [newMessages, setNewMessages] = useState({});

  // keep provider updates out of render: update unread count whenever local newMessages changes
  useEffect(() => {
    if (typeof props.setUnreadCount === 'function') {
      const total = Object.values(newMessages).reduce((total, num) => total + num, 0);
      props.setUnreadCount(total);
    }
  }, [newMessages, props.setUnreadCount]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (selectedItems.length > 0) {
          setSelectedItems([]);
          return true;
        }
        return false;
      });
      return () => subscription.remove();
    }
    // Always return a cleanup function for non-android platforms
    return () => { };
  }, [selectedItems.length]);

  useFocusEffect(
    useCallback(() => {
      let unsubscribe = () => { };

      const loadNewMessages = async () => {
        try {
          const storedMessages = await AsyncStorage.getItem('newMessages');
          const parsed = storedMessages ? JSON.parse(storedMessages) : {};
          // only update local state here; provider update happens in effect above
          setNewMessages(parsed);
        } catch (error) {
          console.log('Error loading new messages from storage', error);
        }
      };

      const chatsRef = collection(database, 'chats');
      const q = query(
        chatsRef,
        where('users', 'array-contains', {
          email: auth?.currentUser?.email,
          name: auth?.currentUser?.displayName,
          deletedFromChat: false,
        }),
        orderBy('lastUpdated', 'desc')
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        setChats(snapshot.docs);
        setLoading(false);
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const chatId = change.doc.id;
            const { messages } = change.doc.data();
            if (Array.isArray(messages) && messages.length > 0) {
              const firstMessage = messages[0];
              if (
                firstMessage.user &&
                firstMessage.user._id !== auth?.currentUser?.email
              ) {
                // update only local state and AsyncStorage here
                setNewMessages((prev) => {
                  const updated = { ...prev, [chatId]: (prev[chatId] || 0) + 1 };
                  AsyncStorage.setItem('newMessages', JSON.stringify(updated));
                  return updated;
                });
              }
            }
          }
        });
      });

      loadNewMessages();

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }, [props.setUnreadCount])
  );

  const getChatName = useCallback((chat) => {
    const { users, groupName } = chat.data();
    const currentUser = auth?.currentUser;
    if (groupName) return groupName;
    if (Array.isArray(users) && users.length === 2) {
      if (currentUser?.displayName) {
        return users[0].name === currentUser.displayName ? users[1].name : users[0].name;
      }
      if (currentUser?.email) {
        return users[0].email === currentUser.email ? users[1].email : users[0].email;
      }
    }
    return '~ No Name or Email ~';
  }, []);

  const handleChatPress = async (chat) => {
    const chatId = chat.id;
    if (selectedItems.length) {
      selectItems(chat);
      return;
    }
    setNewMessages((prev) => {
      const updated = { ...prev, [chatId]: 0 };
      AsyncStorage.setItem('newMessages', JSON.stringify(updated));
      return updated;
    });
    navigation.navigate('Chat', { id: chatId, chatName: getChatName(chat) });
  };

  const handleChatLongPress = (chat) => selectItems(chat);

  const selectItems = (chat) => {
    setSelectedItems((prev) =>
      prev.includes(chat.id)
        ? prev.filter((id) => id !== chat.id)
        : [...prev, chat.id]
    );
  };

  const getSelected = (chat) => selectedItems.includes(chat.id);

  const deSelectItems = useCallback(() => setSelectedItems([]), []);

  const handleFabPress = () => navigation.navigate('Users');

  const handleDeleteChat = useCallback(() => {
    Alert.alert(
      selectedItems.length > 1 ? 'Delete selected chats?' : 'Delete this chat?',
      'Messages will be removed from this device.',
      [
        {
          text: 'Delete chat',
          style: 'destructive',
          onPress: async () => {
            const deletePromises = selectedItems.map((chatId) => {
              const chat = chats.find((c) => c.id === chatId);
              if (!chat) return Promise.resolve();
              const updatedUsers = chat
                .data()
                .users.map((user) =>
                  user.email === auth?.currentUser?.email
                    ? { ...user, deletedFromChat: true }
                    : user
                );
              return setDoc(doc(database, 'chats', chatId), { users: updatedUsers }, { merge: true }).then(() => {
                const deletedCount = updatedUsers.filter((u) => u.deletedFromChat).length;
                if (deletedCount === updatedUsers.length) {
                  return deleteDoc(doc(database, 'chats', chatId));
                }
                return Promise.resolve();
              });
            });
            Promise.all(deletePromises).then(() => {
              deSelectItems();
            });
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }, [selectedItems, chats, deSelectItems]);

  useEffect(() => {
    navigation.setOptions({
      headerRight:
        selectedItems.length > 0
          ? () => (
              <TouchableOpacity style={styles.trashBin} onPress={handleDeleteChat}>
                <Ionicons name="trash" size={24} color={theme?.colors?.teal ?? '#00b894'} />
              </TouchableOpacity>
            )
          : undefined,
      headerLeft:
        selectedItems.length > 0
          ? () => <Text style={styles.itemCount}>{selectedItems.length}</Text>
          : undefined,
    });
  }, [selectedItems, navigation, handleDeleteChat, styles, theme]);

  const getSubtitle = useCallback((chat) => {
    const { messages } = chat.data();
    if (!messages || messages.length === 0) return 'No messages yet';
    const message = messages[0];
    const isCurrentUser = auth?.currentUser?.email === message.user._id;
    const userName = isCurrentUser ? 'You' : (message.user.name || '').split(' ')[0];
    let messageText = '';
    if (message.image) messageText = 'sent an image';
    else if (message.text.length > 20) messageText = `${message.text.substring(0, 20)}...`;
    else messageText = message.text;
    return `${userName}: ${messageText}`;
  }, []);

  const getSubtitle2 = useCallback((chat) => {
    const { lastUpdated } = chat.data();
    if (!lastUpdated) return '';
    const options = { year: '2-digit', month: 'numeric', day: 'numeric' };
    return new Date(lastUpdated).toLocaleDateString(undefined, options);
  }, []);

  // when rendering each chat row, derive partnerId and avatar:
  const renderChatRow = (chat) => {
    // determine other participant id (example: chat.participants = [uid1, uid2])
    const otherId = (chat.participants || []).find((id) => id !== meId) || chat.id;
    const userDoc = usersMap[otherId];
    const avatar = userDoc?.photoURL || null;
    const title = userDoc?.displayName || chat.title || otherId;

    return (
      <TouchableOpacity key={chat.id} onPress={() => navigation.navigate('Chat', { id: chat.id })} style={styles.row}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarFallback]}>
            <Text style={styles.avatarLetter}>{(title || 'U')[0].toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSubtitle}>{chat.lastMessagePreview || ''}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Pressable style={styles.container} onPress={deSelectItems}>
      {loading ? (
        <ActivityIndicator size="large" color={theme?.colors?.teal ?? '#00b894'} style={styles.loadingContainer} />
      ) : (
        <ScrollView>
          {chats.length === 0 ? (
            <View style={styles.blankContainer}>
              <Text style={styles.textContainer}>No conversations yet</Text>
            </View>
          ) : (
            chats.map((chat) => (
              <ContactRow
                key={chat.id}
                style={getSelected(chat) ? styles.selectedContactRow : undefined}
                name={getChatName(chat)}
                subtitle={getSubtitle(chat)}
                subtitle2={getSubtitle2(chat)}
                onPress={() => handleChatPress(chat)}
                onLongPress={() => handleChatLongPress(chat)}
                selected={getSelected(chat)}
                showForwardIcon={false}
                newMessageCount={newMessages[chat.id] || 0}
              />
            ))
          )}
          <View style={styles.blankContainer}>
            <Text style={{ fontSize: 12, margin: 15, color: theme?.colors?.text ?? '#000' }}>
              <Ionicons name="lock-open" size={12} style={{ color: theme?.colors?.border ?? '#565656' }} />{' '}
              Your personal messages are not <Text style={{ color: theme?.colors?.teal ?? '#00b894' }}>end-to-end-encrypted</Text>
            </Text>
          </View>
        </ScrollView>
      )}
      <TouchableOpacity style={styles.fab} onPress={handleFabPress}>
        <View style={styles.fabContainer}>
          <Ionicons name="chatbox-ellipses" size={24} color={theme?.colors?.cardText ?? '#fff'} />
        </View>
      </TouchableOpacity>
    </Pressable>
  );
};

Chats.propTypes = {
  setUnreadCount: PropTypes.func,
};

export default Chats;