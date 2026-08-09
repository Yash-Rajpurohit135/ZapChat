import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import React, { Component } from 'react';
import { doc, query, setDoc, orderBy, collection, onSnapshot } from 'firebase/firestore';
import {
  Text,
  View,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

import { colors } from '../config/constants';
import ContactRow from '../components/ContactRow';
import { auth, database } from '../config/firebase';

class Group extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedItems: [],
      users: [],
      modalVisible: false,
      groupName: '',
    };
    
    this.unsubscribeUsers = null;
  }

  componentDidMount() {
    this.setupUsersListener();
    this.updateNavigationOptions();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.selectedItems.length !== this.state.selectedItems.length) {
      this.updateNavigationOptions();
    }
  }

  componentWillUnmount() {
    if (this.unsubscribeUsers) {
      this.unsubscribeUsers();
    }
  }

  setupUsersListener = () => {
    const collectionUserRef = collection(database, 'users');
    const q = query(collectionUserRef, orderBy('name', 'asc'));
    this.unsubscribeUsers = onSnapshot(q, (snapshot) => {
      this.setState({ users: snapshot.docs });
    });
  };

  updateNavigationOptions = () => {
    const { selectedItems } = this.state;
    this.props.navigation.setOptions({
      headerRight: () =>
        selectedItems.length > 0 && <Text style={styles.itemCount}>{selectedItems.length}</Text>,
    });
  };

  handleName = (user) => {
    if (user.data().name) {
      return user.data().email === auth?.currentUser?.email
        ? `${user.data().name}*(You)`
        : user.data().name;
    }
    return user.data().email ? user.data().email : '~ No Name or Email ~';
  };

  handleSubtitle = (user) => {
    return user.data().email === auth?.currentUser?.email ? 'Message yourself' : 'User status';
  };

  handleOnPress = (user) => {
    this.selectItems(user);
  };

  selectItems = (user) => {
    this.setState((prevState) => ({
      selectedItems: prevState.selectedItems.includes(user.id)
        ? prevState.selectedItems.filter((item) => item !== user.id)
        : [...prevState.selectedItems, user.id],
    }));
  };

  getSelected = (user) => {
    return this.state.selectedItems.includes(user.id);
  };

  deSelectItems = () => {
    this.setState({ selectedItems: [] });
  };

  handleFabPress = () => {
    this.setState({ modalVisible: true });
  };

  handleGroupNameChange = (text) => {
    this.setState({ groupName: text });
  };

  handleCreateGroup = () => {
    const { groupName, users, selectedItems } = this.state;

    if (!groupName.trim()) {
      alert('Group name cannot be empty');
      return;
    }

    const usersToAdd = users
      .filter((user) => selectedItems.includes(user.id))
      .map((user) => ({
        email: user.data().email,
        name: user.data().name,
        deletedFromChat: false,
      }));

    usersToAdd.unshift({
      email: auth?.currentUser?.email,
      name: auth?.currentUser?.displayName,
      deletedFromChat: false,
    });

    const newRef = doc(collection(database, 'chats'));
    setDoc(newRef, {
      lastUpdated: Date.now(),
      users: usersToAdd,
      messages: [],
      groupName,
      groupAdmins: [auth?.currentUser?.email],
    }).then(() => {
      this.props.navigation.navigate('Chat', { id: newRef.id, chatName: groupName });
      this.deSelectItems();
      this.setState({ modalVisible: false, groupName: '' });
    });
  };

  handleModalClose = () => {
    this.setState((prevState) => ({ modalVisible: !prevState.modalVisible }));
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
        {users.map(
          (user) =>
            user.data().email !== auth?.currentUser?.email && (
              <React.Fragment key={user.id}>
                <ContactRow
                  style={this.getSelected(user) ? styles.selectedContactRow : {}}
                  name={this.handleName(user)}
                  subtitle={this.handleSubtitle(user)}
                  onPress={() => this.handleOnPress(user)}
                  selected={this.getSelected(user)}
                  showForwardIcon={false}
                />
              </React.Fragment>
            )
        )}
      </ScrollView>
    );
  };

  render() {
    const { selectedItems, modalVisible, groupName } = this.state;

    return (
      <Pressable style={styles.container} onPress={this.deSelectItems}>
        {this.renderUserList()}
        
        {selectedItems.length > 0 && (
          <TouchableOpacity style={styles.fab} onPress={this.handleFabPress}>
            <View style={styles.fabContainer}>
              <Ionicons name="arrow-forward-outline" size={24} color="white" />
            </View>
          </TouchableOpacity>
        )}

        <Modal
          animationType="slide"
          transparent
          visible={modalVisible}
          onRequestClose={this.handleModalClose}
        >
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Enter Group Name</Text>
            <TextInput
              style={styles.input}
              onChangeText={this.handleGroupNameChange}
              value={groupName}
              placeholder="Group Name"
              onSubmitEditing={this.handleCreateGroup}
            />
          </View>
        </Modal>
      </Pressable>
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
  fab: {
    bottom: 12,
    position: 'absolute',
    right: 12,
  },
  fabContainer: {
    alignItems: 'center',
    backgroundColor: colors.teal,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  input: {
    borderColor: 'gray',
    borderWidth: 1,
    height: 40,
    marginBottom: 15,
    paddingHorizontal: 10,
    width: '100%',
  },
  itemCount: {
    color: colors.teal,
    fontSize: 18,
    fontWeight: '400',
    right: 10,
  },
  modalText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalView: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    elevation: 5,
    margin: 20,
    padding: 35,
  },
  selectedContactRow: {
    backgroundColor: '#E0E0E0',
  },
  textContainer: {
    fontSize: 16,
  },
});

Group.propTypes = {
  navigation: PropTypes.object.isRequired,
};

export default Group;
