import React, { Component } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { doc, query, where, setDoc, orderBy, collection, onSnapshot } from 'firebase/firestore';

import Cell from '../components/Cell';
import { colors } from '../config/constants';
import ContactRow from '../components/ContactRow';
import { auth, database } from '../config/firebase';

class Users extends Component {
  constructor(props) {
    super(props);
    this.state = {
      users: [],
      existingChats: [],
    };
    
    this.unsubscribeUsers = null;
    this.unsubscribeChats = null;
  }

  componentDidMount() {
    this.setupListeners();
  }

  componentWillUnmount() {
    if (this.unsubscribeUsers) {
      this.unsubscribeUsers();
    }
    if (this.unsubscribeChats) {
      this.unsubscribeChats();
    }
  }

  setupListeners = () => {
    // Listen to users collection
    const collectionUserRef = collection(database, 'users');
    const q = query(collectionUserRef, orderBy('name', 'asc'));
    this.unsubscribeUsers = onSnapshot(q, (snapshot) => {
      this.setState({ users: snapshot.docs });
    });

    // Get existing chats to avoid creating duplicate chats
    const collectionChatsRef = collection(database, 'chats');
    const q2 = query(
      collectionChatsRef,
      where('users', 'array-contains', {
        email: auth?.currentUser?.email,
        name: auth?.currentUser?.displayName,
        deletedFromChat: false,
      }),
      where('groupName', '==', '')
    );
    this.unsubscribeChats = onSnapshot(q2, (snapshot) => {
      const existing = snapshot.docs.map((existingChat) => ({
        chatId: existingChat.id,
        userEmails: existingChat.data().users,
      }));
      this.setState({ existingChats: existing });
    });
  };

  handleNewGroup = () => {
    this.props.navigation.navigate('Group');
  };

  handleNewUser = () => {
    alert('New user');
  };

  handleName = (user) => {
    const { name, email } = user.data();
    if (name) {
      return email === auth?.currentUser?.email ? `${name}*(You)` : name;
    }
    return email || '~ No Name or Email ~';
  };

  handleSubtitle = (user) => {
    return user.data().email === auth?.currentUser?.email 
      ? 'Message yourself' 
      : 'User status';
  };

  handleNavigate = (user) => {
    const { existingChats } = this.state;
    let navigationChatID = '';
    let messageYourselfChatID = '';

    existingChats.forEach((existingChat) => {
      const isCurrentUserInTheChat = existingChat.userEmails.some(
        (e) => e.email === auth?.currentUser?.email
      );
      const isMessageYourselfExists = existingChat.userEmails.filter(
        (e) => e.email === user.data().email
      ).length;

      if (
        isCurrentUserInTheChat &&
        existingChat.userEmails.some((e) => e.email === user.data().email)
      ) {
        navigationChatID = existingChat.chatId;
      }

      if (isMessageYourselfExists === 2) {
        messageYourselfChatID = existingChat.chatId;
      }

      if (auth?.currentUser?.email === user.data().email) {
        navigationChatID = '';
      }
    });

    if (messageYourselfChatID) {
      this.props.navigation.navigate('Chat', { 
        id: messageYourselfChatID, 
        chatName: this.handleName(user) 
      });
    } else if (navigationChatID) {
      this.props.navigation.navigate('Chat', { 
        id: navigationChatID, 
        chatName: this.handleName(user) 
      });
    } else {
      // Creates new chat
      this.createNewChat(user);
    }
  };

  createNewChat = (user) => {
    const newRef = doc(collection(database, 'chats'));
    setDoc(newRef, {
      lastUpdated: Date.now(),
      groupName: '', // It is not a group chat
      users: [
        {
          email: auth?.currentUser?.email,
          name: auth?.currentUser?.displayName,
          deletedFromChat: false,
        },
        { 
          email: user.data().email, 
          name: user.data().name, 
          deletedFromChat: false 
        },
      ],
      lastAccess: [
        { email: auth?.currentUser?.email, date: Date.now() },
        { email: user.data().email, date: '' },
      ],
      messages: [],
    }).then(() => {
      this.props.navigation.navigate('Chat', { 
        id: newRef.id, 
        chatName: this.handleName(user) 
      });
    });
  };

  renderUserList = () => {
    const { users } = this.state;

    if (users.length === 0) {
      return (
        <View style={styles.blankContainer}>
          <Text style={styles.textContainer}>No registered users yet</Text>
        </View>
      );
    }

    return (
      <ScrollView>
        <View>
          <Text style={styles.textContainer}>Registered users</Text>
        </View>
        {users.map((user) => (
          <ContactRow
            key={user.id}
            name={this.handleName(user)}
            subtitle={this.handleSubtitle(user)}
            onPress={() => this.handleNavigate(user)}
            showForwardIcon={false}
          />
        ))}
      </ScrollView>
    );
  };

  render() {
    return (
      <SafeAreaView style={styles.container}>
        <Cell
          title="New group"
          icon="people"
          tintColor={colors.teal}
          onPress={this.handleNewGroup}
          style={{ marginTop: 5 }}
        />
        <Cell
          title="New user"
          icon="person-add"
          tintColor={colors.teal}
          onPress={this.handleNewUser}
          style={{ marginBottom: 10 }}
        />

        {this.renderUserList()}
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  blankContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  textContainer: {
    fontSize: 16,
    fontWeight: '300',
    marginLeft: 16,
  },
});

export default Users;
