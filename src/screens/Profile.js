import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import {
  Text,
  View,
  Alert,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Pressable,
  Image,
  Platform,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import Cell from '../components/Cell';
import { auth } from '../config/firebase';
import { colors as defaultColors } from '../config/constants';
import { ThemeContext } from '../contexts/ThemeContext';
import { updateProfile, updateEmail } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
const db = getFirestore();
import Constants from 'expo-constants';

const {
  EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME: CLOUD_NAME,
  EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET: UPLOAD_PRESET,
} = Constants.expoConfig?.extra || Constants.manifest?.extra || {};

class Profile extends Component {
  static contextType = ThemeContext;

  constructor(props) {
    super(props);
    this.state = {
      modalVisible: false,
      editingField: null, // 'name' | 'email' | null
      editingValue: '',
      saving: false,
      uploading: false,
      imageModalVisible: false,
    };
  }

  handleChangeName = () => {
    const current = auth?.currentUser?.displayName || '';
    this.setState({ modalVisible: true, editingField: 'name', editingValue: current });
  };

  handleDisplayEmail = () => {
    const current = auth?.currentUser?.email || '';
    this.setState({ modalVisible: true, editingField: 'email', editingValue: current });
  };

  handleChangeProfilePicture = async () => {
    Alert.alert(
      'Profile photo',
      'Choose an option',
      [
        { text: 'Take photo', onPress: () => this.pickImage({ fromCamera: true }) },
        { text: 'Choose from library', onPress: () => this.pickImage({ fromCamera: false }) },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  handleShowProfilePicture = () => {
    const url = auth?.currentUser?.photoURL;
    if (!url) {
      Alert.alert('No profile picture', 'You have not set a profile picture yet.');
      return;
    }
    // open fullscreen preview modal
    this.setState({ imageModalVisible: true });
  };

  closeImageModal = () => {
    this.setState({ imageModalVisible: false });
  };

  // pick from camera or library
  pickImage = async ({ fromCamera = false } = {}) => {
    try {
      if (fromCamera) {
        const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraPerm.status !== 'granted') {
          Alert.alert('Permission required', 'Camera permission is required to take a photo.');
          return;
        }
      } else {
        const mediaPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (mediaPerm.status !== 'granted') {
          Alert.alert('Permission required', 'Media library permission is required to choose a photo.');
          return;
        }
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8 });

      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri || result.uri;
      if (!uri) return;

      await this.uploadAndSetProfilePhoto(uri);
    } catch (err) {
      console.error('pickImage error', err);
      Alert.alert('Error', 'Could not pick image.');
    }
  };

  uploadAndSetProfilePhoto = async (uri) => {
    try {
      this.setState({ uploading: true });
      const downloadUrl = await this.uploadToCloudinary(uri);
      await updateProfile(auth.currentUser, { photoURL: downloadUrl });

      // persist latest avatar to users/<uid> so other devices can read it in realtime
      try {
        const uid = auth?.currentUser?.uid;
        if (uid) {
          await setDoc(doc(db, 'users', uid), { photoURL: downloadUrl, displayName: auth.currentUser?.displayName || null }, { merge: true });
        }
      } catch (e) {
        console.warn('Failed writing users/<uid> photoURL', e);
      }

      Alert.alert('Success', 'Profile picture updated');
    } catch (err) {
      console.error('uploadAndSetProfilePhoto error', err);
      Alert.alert('Error', err.message || 'Could not upload photo.');
    } finally {
      this.setState({ uploading: false });
    }
  };

  // call with local URI from ImagePicker
  uploadToCloudinary = async (uri) => {
    const filename = `photo-${Date.now()}.jpg`;
    try {
      // DEBUG: log config + uri
      console.log('DEBUG Cloudinary config:', { CLOUD_NAME, UPLOAD_PRESET });
      console.log('DEBUG picked uri:', uri);

      if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error(
          'Cloudinary config missing. Ensure EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET are set in .env and restart Expo.'
        );
      }

      // Quick network check
      try {
        const netCheck = await fetch('https://httpbin.org/get');
        const netJson = await netCheck.json();
        console.log('DEBUG network check ok:', netJson.url);
      } catch (netErr) {
        console.error('DEBUG network check failed:', netErr);
        throw new Error('Network request failed (check device/emulator internet).');
      }

      // Preferred approach: append the RN file object
      const formData = new FormData();
      formData.append('file', { uri, name: filename, type: 'image/jpeg' });
      formData.append('upload_preset', UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' }, // don't set Content-Type
      });

      const json = await res.json().catch((e) => {
        console.error('DEBUG failed parsing json (file object):', e);
        return null;
      });
      console.log('Cloudinary upload response (file object):', json, 'status:', res.status);

      if (!res.ok) {
        const msg = json?.error?.message || JSON.stringify(json) || `status ${res.status}`;
        throw new Error(msg);
      }
      if (!json?.secure_url) throw new Error('No URL returned from Cloudinary');
      return json.secure_url;
    } catch (err) {
      console.warn('uploadToCloudinary (file object) failed, trying blob fallback:', err);

      // Fallback: try XMLHttpRequest -> blob (handles content:// on Android)
      try {
        console.log('DEBUG: starting xhr blob fallback for', uri);
        const blob = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = () => resolve(xhr.response);
          xhr.onerror = () => reject(new TypeError('Network request failed (xhr)'));
          xhr.responseType = 'blob';
          xhr.open('GET', uri, true);
          xhr.send(null);
        });

        const formData2 = new FormData();
        formData2.append('file', blob, filename);
        formData2.append('upload_preset', UPLOAD_PRESET);

        const res2 = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData2,
          headers: { Accept: 'application/json' },
        });

        const json2 = await res2.json().catch((e) => {
          console.error('DEBUG failed parsing json (blob):', e);
          return null;
        });
        console.log('Cloudinary upload response (blob):', json2, 'status:', res2.status);

        if (!res2.ok) {
          const msg2 = json2?.error?.message || JSON.stringify(json2) || `status ${res2.status}`;
          throw new Error(msg2);
        }
        if (!json2?.secure_url) throw new Error('No URL returned from Cloudinary');
        return json2.secure_url;
      } catch (err2) {
        console.error('uploadToCloudinary error:', err2);
        throw err2;
      }
    }
  };

  getInitials = () => {
    return auth?.currentUser?.displayName
      ? auth.currentUser.displayName
          .split(' ')
          .map((name) => name[0])
          .join('')
      : auth?.currentUser?.email?.charAt(0).toUpperCase();
  };

  getUserDisplayName = () => {
    return auth?.currentUser?.displayName || 'No name set';
  };

  getUserEmail = () => {
    return auth?.currentUser?.email;
  };

  closeModal = () => this.setState({ modalVisible: false, editingField: null, editingValue: '' });

  saveEditing = async () => {
    const { editingField, editingValue } = this.state;
    if (!editingField) return;
    const trimmed = (editingValue || '').trim();
    if (!trimmed) {
      Alert.alert('Validation', `${editingField === 'name' ? 'Name' : 'Email'} cannot be empty`);
      return;
    }

    this.setState({ saving: true });
    try {
      if (editingField === 'name') {
        await updateProfile(auth.currentUser, { displayName: trimmed });
        Alert.alert('Success', 'Name updated');
      } else if (editingField === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
          throw new Error('invalid-email');
        }
        await updateEmail(auth.currentUser, trimmed);
        Alert.alert('Success', 'Email updated. You may need to re-login for sensitive ops.');
      }
      this.closeModal();
      this.setState({ saving: false });
    } catch (err) {
      const code = err?.code || err?.message || '';
      if (code === 'auth/requires-recent-login' || code === 'requires-recent-login') {
        Alert.alert(
          'Re-authentication required',
          'To change your email please sign out and sign in again to re-authenticate.'
        );
      } else if (code === 'invalid-email') {
        Alert.alert('Invalid email', 'Please enter a valid email address.');
      } else {
        Alert.alert('Error', err?.message || 'An error occurred while updating profile.');
        console.error('Profile update error:', err);
      }
      this.setState({ saving: false });
    }
  };

  render() {
    const themeContext = this.context || {};
    const colors = (themeContext.theme && themeContext.theme.colors) || defaultColors;
    const { modalVisible, editingField, editingValue, saving, uploading } = this.state;
    const { imageModalVisible } = this.state;
 
    const photoUrl = auth?.currentUser?.photoURL;
 
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background ?? defaultColors.background }]}>
        {/* Profile Avatar */}
        <View style={styles.avatarContainer}>
          <TouchableOpacity
            accessible
            accessibilityLabel="Profile picture"
            style={[styles.avatar, { backgroundColor: colors.primary ?? defaultColors.primary }]}
            onPress={this.handleShowProfilePicture}
            onLongPress={this.handleChangeProfilePicture}
          >
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarLabel, { color: colors.card ?? '#fff' }]}>{this.getInitials()}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Change profile picture"
            style={[styles.cameraIcon, { backgroundColor: colors.teal ?? defaultColors.teal }]}
            onPress={this.handleChangeProfilePicture}
          >
            <Ionicons name="camera-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* User Info Cells */}
        <View style={styles.infoContainer}>
          <Cell
            title="Name"
            icon="person-outline"
            iconColor={colors.text ?? defaultColors.text}
            subtitle={this.getUserDisplayName()}
            secondIcon="pencil-outline"
            onPress={this.handleChangeName}
            style={[
              styles.cell,
              {
                backgroundColor: colors.card ?? defaultColors.card,
                shadowColor: colors.shadow ?? '#000',
              },
            ]}
          />

          <Cell
            title="Email"
            subtitle={this.getUserEmail()}
            icon="mail-outline"
            iconColor={colors.text ?? defaultColors.text}
            secondIcon="pencil-outline"
            onPress={this.handleDisplayEmail}
            style={[
              styles.cell,
              {
                backgroundColor: colors.card ?? defaultColors.card,
                shadowColor: colors.shadow ?? '#000',
              },
            ]}
          />

          <Cell
            title="About"
            subtitle="Available"
            icon="information-circle-outline"
            iconColor={colors.text ?? defaultColors.text}
            secondIcon="pencil-outline"
            onPress={this.handleAbout}
            style={[
              styles.cell,
              {
                backgroundColor: colors.card ?? defaultColors.card,
                shadowColor: colors.shadow ?? '#000',
              },
            ]}
          />
        </View>

        {/* Edit Modal */}
        <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={this.closeModal}>
          <View style={[modalStyles.backdrop]}>
            <View style={[modalStyles.container, { backgroundColor: colors.card ?? '#fff' }]}>
              <Text style={[modalStyles.title, { color: colors.text ?? '#000' }]}>
                {editingField === 'name' ? 'Edit name' : 'Edit email'}
              </Text>
              <TextInput
                value={editingValue}
                onChangeText={(val) => this.setState({ editingValue: val })}
                placeholder={editingField === 'name' ? 'Your name' : 'you@example.com'}
                placeholderTextColor={colors.textSecondary ?? '#888'}
                autoCapitalize={editingField === 'name' ? 'words' : 'none'}
                keyboardType={editingField === 'email' ? 'email-address' : 'default'}
                style={[modalStyles.input, { color: colors.text ?? '#000', borderColor: colors.border ?? '#e0e0e0' }]}
              />
              <View style={modalStyles.row}>
                <Pressable onPress={this.closeModal} style={[modalStyles.button, { borderColor: colors.border ?? '#e0e0e0' }]}>
                  <Text style={{ color: colors.text ?? '#000' }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={this.saveEditing}
                  style={[modalStyles.buttonPrimary, { backgroundColor: colors.teal ?? defaultColors.teal }]}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff' }}>Save</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Uploading overlay */}
        {uploading && (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={{ color: '#fff', marginTop: 8 }}>Uploading...</Text>
          </View>
        )}

        {/* Fullscreen profile image modal */}
        <Modal visible={imageModalVisible} transparent animationType="fade" onRequestClose={this.closeImageModal}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={this.closeImageModal}
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}
          >
            {photoUrl ? (
              <Image
                source={{ uri: photoUrl }}
                style={{ width: '92%', height: '82%', resizeMode: 'contain', borderRadius: 8 }}
              />
            ) : null}
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    );
  }
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  container: {
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 8,
  },
  buttonPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
});

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    borderRadius: 60,
    height: 120,
    justifyContent: 'center',
    width: 120,
    overflow: 'hidden',
  },
  // (modal image uses inline styles above, but keep this if you prefer)
  imageModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    resizeMode: 'cover',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 20,
    position: 'relative',
  },
  avatarLabel: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  cameraIcon: {
    alignItems: 'center',
    borderRadius: 18,
    bottom: 4,
    elevation: 5,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    width: 36,
  },
  cell: {
    borderRadius: 10,
    elevation: 0.5,
    marginBottom: 15,
    paddingHorizontal: 10,
    paddingVertical: 12,
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  container: {
    alignItems: 'center',
    flex: 1,
  },
  infoContainer: {
    marginTop: 40,
    width: '90%',
  },
  uploadOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
});

// ensure propTypes and export are valid
Profile.propTypes = {
  navigation: PropTypes.object,
};

export default Profile;