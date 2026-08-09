import PropTypes from 'prop-types';
import uuid from 'react-native-uuid';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import EmojiModal from 'react-native-emoji-modal';
import React, { Component } from 'react';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { Send, Bubble, GiftedChat, InputToolbar } from 'react-native-gifted-chat';
import Constants from 'expo-constants';
import { Modal, Image, TouchableOpacity, View, StyleSheet, ActivityIndicator, Keyboard, BackHandler, Alert, Dimensions } from 'react-native';
import { Video } from 'expo-av';

import { colors as defaultColors } from '../config/constants';
import { auth, database } from '../config/firebase';
import { ThemeContext } from '../contexts/ThemeContext';

const {
  EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME: CLOUD_NAME,
  EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET: UPLOAD_PRESET,
} = Constants.expoConfig?.extra || Constants.manifest?.extra || {};

class Chat extends Component {
  static contextType = ThemeContext;

  constructor(props) {
    super(props);
    const uid = auth?.currentUser?.uid || auth?.currentUser?.email;
    const chatId = props?.route?.params?.isSelf ? `self_${uid}` : props?.route?.params?.id;
    const { width: screenW, height: screenH } = Dimensions.get('window');

    this.state = {
      chatId,
      messages: [],
      modal: false,
      uploading: false,
      avatarModalVisible: false,
      avatarModalUrl: null,
      mediaModalVisible: false,
      mediaModalUrl: null,
      mediaModalType: null,
      screenW,
      screenH,
    };

    this.videoRef = React.createRef();
    this.unsubscribe = null;
    this.userBackHandler = null;
    this.keyboardListener = null;
  }

  componentDidMount() {
    this.subscribeToChat();
    this.userBackHandler = BackHandler.addEventListener('hardwareBackPress', this.handleHardwareBack);
    this.keyboardListener = Keyboard.addListener('keyboardDidShow', this.handleKeyboardShow);
  }

  componentWillUnmount() {
    if (this.unsubscribe) this.unsubscribe();
    this.userBackHandler?.remove();
    this.keyboardListener?.remove();
  }

  handleHardwareBack = () => {
    Keyboard.dismiss();
    if (this.state.modal) {
      this.setState({ modal: false });
      return true;
    }
    return false;
  };

  handleKeyboardShow = () => {
    if (this.state.modal) this.setState({ modal: false });
  };

  subscribeToChat = () => {
    const { chatId } = this.state;
    if (!chatId) return;
    this.unsubscribe = onSnapshot(doc(database, 'chats', chatId), (document) => {
      const docData = document.data();
      if (!docData) {
        this.setState({ messages: [] });
        return;
      }
      const msgs = (docData.messages || []).map((message) => {
        let createdAt = message.createdAt;
        if (createdAt && typeof createdAt?.toDate === 'function') createdAt = createdAt.toDate();
        else if (typeof createdAt === 'number') createdAt = new Date(createdAt);
        else if (!(createdAt instanceof Date)) createdAt = new Date();
        return { ...message, createdAt, image: message.image ?? '' };
      });
      this.setState({ messages: msgs });
    });
  };

  openAvatarPreview = (url) => {
    if (!url) return;
    this.setState({ avatarModalUrl: url, avatarModalVisible: true });
  };

  closeAvatarPreview = () => {
    this.setState({ avatarModalVisible: false, avatarModalUrl: null });
  };

  openMediaModal = (url, type) => {
    if (!url) return;
    this.setState({ mediaModalUrl: url, mediaModalType: type, mediaModalVisible: true });
  };

  closeMediaModal = async () => {
    try {
      if (this.videoRef.current && this.state.mediaModalType === 'video') {
        await this.videoRef.current.pauseAsync?.();
      }
    } catch (e) {}
    this.setState({ mediaModalVisible: false, mediaModalUrl: null, mediaModalType: null });
  };

  onSend = async (m = []) => {
    try {
      const { chatId } = this.state;
      const chatDocRef = doc(database, 'chats', chatId);
      const chatDocSnap = await getDoc(chatDocRef);
      const chatData = chatDocSnap.data() || { messages: [] };

      const data = (chatData.messages || []).map((message) => {
        let createdAt = message.createdAt;
        if (createdAt && typeof createdAt?.toDate === 'function') createdAt = createdAt.toDate();
        else if (typeof createdAt === 'number') createdAt = new Date(createdAt);
        else if (!(createdAt instanceof Date)) createdAt = new Date();
        return { ...message, createdAt, image: message.image ?? '' };
      });

      const messagesWillSend = [{ ...m[0], sent: true, received: false }];
      const chatMessages = GiftedChat.append(data, messagesWillSend);

      await setDoc(
        doc(database, 'chats', chatId),
        {
          messages: chatMessages,
          lastUpdated: Date.now(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error('onSend error', err);
      Alert.alert('Error', 'Could not send message.');
    }
  };

  deleteMessage = async (messageId) => {
    try {
      const { chatId } = this.state;
      const chatRef = doc(database, 'chats', chatId);
      const snap = await getDoc(chatRef);
      const chatData = snap.data() || { messages: [] };
      const messagesArr = Array.isArray(chatData.messages) ? chatData.messages : [];
      const filtered = messagesArr.filter((m) => m._id !== messageId);
      await setDoc(chatRef, { messages: filtered, lastUpdated: Date.now() }, { merge: true });
    } catch (err) {
      console.error('deleteMessage error', err);
      Alert.alert('Error', 'Could not delete message. Please try again.');
    }
  };

  handleMessageLongPress = (context, message) => {
    if (!message || !message._id) return;
    const myId = auth?.currentUser?.email || auth?.currentUser?.uid;
    const isOwner = message.user && (message.user._id === myId || message.user._id === auth?.currentUser?.uid);

    const buttons = [
      isOwner ? { text: 'Delete', style: 'destructive', onPress: () => this.deleteMessage(message._id) } : null,
      { text: 'Cancel', style: 'cancel' },
    ].filter(Boolean);

    Alert.alert('Message options', 'Choose an action', buttons, { cancelable: true });
  };

  handleMediaPress = (message, type) => {
    if (!message) return;
    const uri = type === 'image' ? message.image : message.video;
    if (!uri) return;
    const myId = auth?.currentUser?.email || auth?.currentUser?.uid;
    const isOwner = message.user && (message.user._id === myId || message.user._id === auth?.currentUser?.uid);

    const buttons = [
      { text: 'View', onPress: () => this.openMediaModal(uri, type) },
      isOwner ? { text: 'Delete', style: 'destructive', onPress: () => this.deleteMessage(message._id) } : null,
      { text: 'Cancel', style: 'cancel' },
    ].filter(Boolean);

    Alert.alert('Media', 'Choose an action', buttons, { cancelable: true });
  };

  pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Permission to access media library is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      await this.uploadImageAsync(result.assets[0]);
    }
  };

  uploadImageAsync = async (asset) => {
    try {
      this.setState({ uploading: true });
      if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error('Cloudinary config missing. Add env vars and restart.');
      }

      const { uri, type } = asset;
      const filename = asset.fileName || `chat-${Date.now()}`;
      const mime = type === 'video' ? 'video/mp4' : 'image/jpeg';

      const formData = new FormData();
      formData.append('file', { uri, name: filename, type: mime });
      formData.append('upload_preset', UPLOAD_PRESET);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
      const res = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || `Upload failed (${res.status})`);
      }

      const downloadUrl = json?.secure_url;
      if (!downloadUrl) throw new Error('No URL returned from Cloudinary');

      const message = {
        _id: uuid.v4(),
        createdAt: new Date(),
        text: '',
        user: {
          _id: auth?.currentUser?.email,
          name: auth?.currentUser?.displayName,
          avatar: auth?.currentUser?.photoURL || null,
        },
      };
      if (type === 'video') {
        message.video = downloadUrl;
      } else {
        message.image = downloadUrl;
      }

      this.setState({ uploading: false });
      this.onSend([message]);
    } catch (err) {
      console.log('uploadImageAsync error', err);
      this.setState({ uploading: false });
      Alert.alert('Upload failed', err?.message || 'Please try again.');
    }
  };

  handleEmojiPanel = () => {
    this.setState((prev) => ({ modal: !prev.modal }));
    Keyboard.dismiss();
  };

  RenderLoadingUpload = () => (
    <View style={[styles.loadingContainerUpload, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
      <ActivityIndicator size="large" color={this.th?.teal ?? defaultColors.teal} />
    </View>
  );

  RenderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={this.th?.teal ?? defaultColors.teal} />
    </View>
  );

  RenderBubble = (props) => (
    <Bubble
      {...props}
      wrapperStyle={{
        right: { backgroundColor: this.th?.primary ?? defaultColors.primary },
        left: { backgroundColor: this.th?.card ?? '#e6e6e6' },
      }}
      textStyle={{
        right: { color: this.th?.cardText ?? '#fff' },
        left: { color: this.th?.text ?? '#000' },
      }}
    />
  );

  RenderActions = (handleEmojiPanel) => (
    <TouchableOpacity style={styles.emojiIcon} onPress={handleEmojiPanel}>
      <View>
        <Ionicons name="happy-outline" size={32} color={this.th?.teal ?? defaultColors.teal} />
      </View>
    </TouchableOpacity>
  );

  RenderInputToolbar = (props) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        backgroundColor: this.th?.background ?? '#fff',
      }}
    >
      <InputToolbar
        {...props}
        renderActions={() => this.RenderActions(this.handleEmojiPanel)}
        containerStyle={[
          styles.inputToolbar,
          {
            backgroundColor: this.th?.card ?? '#fff',
            borderColor: this.th?.border ?? defaultColors.grey,
          },
        ]}
        textInputProps={{ style: { color: this.th?.text ?? '#000' } }}
      />
      <TouchableOpacity style={styles.attachButtonRight} onPress={this.pickImage}>
        <Ionicons name="attach-outline" size={24} color={this.th?.teal ?? defaultColors.teal} />
      </TouchableOpacity>
    </View>
  );

  render() {
    const themeContext = this.context || {};
    const colors = (themeContext.theme && themeContext.theme.colors) || defaultColors;
    this.th = colors;

    const {
      messages,
      uploading,
      avatarModalVisible,
      avatarModalUrl,
      mediaModalVisible,
      mediaModalUrl,
      mediaModalType,
      screenW,
      screenH,
      modal,
    } = this.state;

    return (
      <>
        <Modal visible={avatarModalVisible} transparent animationType="fade" onRequestClose={this.closeAvatarPreview}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={this.closeAvatarPreview}>
            {avatarModalUrl ? <Image source={{ uri: avatarModalUrl }} style={{ width: '90%', height: '80%', resizeMode: 'contain', borderRadius: 8 }} /> : null}
          </TouchableOpacity>
        </Modal>

        <Modal visible={mediaModalVisible} transparent animationType="fade" onRequestClose={this.closeMediaModal}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={this.closeMediaModal}>
            {mediaModalType === 'image' && mediaModalUrl ? (
              <Image source={{ uri: mediaModalUrl }} style={{ width: screenW * 0.95, height: screenH * 0.85, resizeMode: 'contain', borderRadius: 8 }} />
            ) : null}
            {mediaModalType === 'video' && mediaModalUrl ? (
              <View style={{ width: screenW * 0.95, height: screenH * 0.6 }}>
                <Video ref={this.videoRef} source={{ uri: mediaModalUrl }} style={{ width: '100%', height: '100%' }} useNativeControls resizeMode="contain" shouldPlay />
              </View>
            ) : null}
          </TouchableOpacity>
        </Modal>

        {uploading && this.RenderLoadingUpload()}

        <GiftedChat
          messages={messages}
          showAvatarForEveryMessage={false}
          showUserAvatar={false}
          onSend={(messagesArr) => this.onSend(messagesArr)}
          imageStyle={{ height: 212, width: 212 }}
          messagesContainerStyle={{ backgroundColor: this.th?.background ?? '#fff' }}
          textInputStyle={{ backgroundColor: this.th?.card ?? '#fff', borderRadius: 20, color: this.th?.text ?? '#000' }}
          user={{
            _id: auth?.currentUser?.email,
            name: auth?.currentUser?.displayName,
            avatar: auth?.currentUser?.photoURL || null,
          }}
          renderBubble={(props) => this.RenderBubble(props)}
          renderUsernameOnMessage
          renderAvatarOnTop
          renderInputToolbar={(props) => this.RenderInputToolbar(props)}
          minInputToolbarHeight={56}
          scrollToBottom
          onPressActionButton={this.handleEmojiPanel}
          scrollToBottomStyle={[styles.scrollToBottomStyle, { borderColor: this.th?.border ?? defaultColors.grey }]}
          renderLoading={this.RenderLoading}
          onLongPress={(context, message) => this.handleMessageLongPress(context, message)}
          renderSend={(props) => (
            <Send {...props}>
              <View style={[styles.sendIconContainer, { borderColor: this.th?.border ?? defaultColors.grey, backgroundColor: this.th?.card ?? '#fff' }]}>
                <Ionicons name="send" size={24} color={this.th?.teal ?? defaultColors.teal} />
              </View>
            </Send>
          )}
          renderAvatar={(props) => {
            const avatarUrl = props.currentMessage?.user?.avatar;
            if (!avatarUrl) return null;
            return (
              <TouchableOpacity onPress={() => this.openAvatarPreview(avatarUrl)} style={{ marginRight: 8 }}>
                <Image source={{ uri: avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} />
              </TouchableOpacity>
            );
          }}
          renderMessageImage={(props) => {
            const msg = props.currentMessage;
            const uri = msg?.image;
            if (!uri) return null;
            return (
              <TouchableOpacity activeOpacity={0.9} onPress={() => this.handleMediaPress(msg, 'image')}>
                <Image source={{ uri }} style={{ width: 212, height: 212, borderRadius: 8 }} />
              </TouchableOpacity>
            );
          }}
          renderMessageVideo={(props) => {
            const msg = props.currentMessage;
            const uri = msg?.video;
            if (!uri) return null;
            return (
              <TouchableOpacity activeOpacity={0.9} onPress={() => this.handleMediaPress(msg, 'video')}>
                <View style={{ width: 212, height: 212, borderRadius: 8, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="play-circle" size={48} color="#fff" />
                </View>
              </TouchableOpacity>
            );
          }}
        />

        {modal && (
          <EmojiModal
            onPressOutside={this.handleEmojiPanel}
            modalStyle={[styles.emojiModal, { backgroundColor: this.th?.card ?? '#fff' }]}
            containerStyle={styles.emojiContainerModal}
            backgroundStyle={[styles.emojiBackgroundModal, { backgroundColor: this.th?.background ?? '#fff' }]}
            columns={5}
            emojiSize={66}
            activeShortcutColor={this.th?.primary ?? defaultColors.primary}
            onEmojiSelected={(emoji) => {
              this.onSend([
                {
                  _id: uuid.v4(),
                  createdAt: new Date(),
                  text: emoji,
                  user: {
                    _id: auth?.currentUser?.email,
                    name: auth?.currentUser?.displayName,
                    avatar: auth?.currentUser?.photoURL || null,
                  },
                },
              ]);
            }}
          />
        )}
      </>
    );
  }
}

const styles = StyleSheet.create({
  addImageIcon: {
    borderRadius: 16,
    bottom: 8,
    height: 32,
    width: 32,
  },
  attachButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachButtonRight: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiBackgroundModal: {},
  emojiContainerModal: {
    height: 348,
    width: 396,
  },
  emojiIcon: {
    borderRadius: 16,
    bottom: 8,
    height: 32,
    marginLeft: 4,
    width: 32,
  },
  emojiModal: {},
  inputToolbar: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 0.5,
    flex: 1,
    flexDirection: 'row',
    marginHorizontal: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingContainerUpload: {
    alignItems: 'center',
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 999,
  },
  scrollToBottomStyle: {
    borderRadius: 28,
    borderWidth: 1,
    bottom: 12,
    height: 56,
    position: 'absolute',
    right: 12,
    width: 56,
  },
  sendIconContainer: {
    alignItems: 'center',
    width: 48,
    justifyContent: 'center',
    height: 48,
    borderWidth: 1,
    borderRadius: 24,
    borderColor: '#fff',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    marginRight: 8,
    width: 44,
  },
});

Chat.propTypes = {
  route: PropTypes.object.isRequired,
};

export default Chat;
