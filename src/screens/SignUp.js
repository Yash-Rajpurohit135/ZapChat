import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile, createUserWithEmailAndPassword } from 'firebase/auth';
import {
  Text,
  View,
  Image,
  Alert,
  TextInput,
  StatusBar,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';

import { colors } from '../config/constants';
import backImage from '../assets/background.png';
import { auth, database } from '../config/firebase';

class SignUp extends Component {
  constructor(props) {
    super(props);
    this.state = {
      email: '',
      username: '',
      password: '',
    };
  }

  onHandleSignup = () => {
    const { email, password, username } = this.state;

    if (email !== '' && password !== '') {
      createUserWithEmailAndPassword(auth, email, password)
        .then((cred) => {
          updateProfile(cred.user, { displayName: username }).then(() => {
            setDoc(doc(database, 'users', cred.user.email), {
              id: cred.user.uid,
              email: cred.user.email,
              name: cred.user.displayName,
              about: 'Available',
            });
          });
          console.log(`Signup success: ${cred.user.email}`);
        })
        .catch((err) => Alert.alert('Signup error', err.message));
    }
  };

  handleEmailChange = (text) => {
    this.setState({ email: text });
  };

  handleUsernameChange = (text) => {
    this.setState({ username: text });
  };

  handlePasswordChange = (text) => {
    this.setState({ password: text });
  };

  navigateToLogin = () => {
    this.props.navigation.navigate('Login');
  };

  render() {
    const { email, username, password } = this.state;

    return (
      <View style={styles.container}>
        <Image source={backImage} style={styles.backImage} />
        <View style={styles.whiteSheet} />
        <SafeAreaView style={styles.form}>
          <Text style={styles.title}>Sign Up</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter name"
            autoCapitalize="none"
            keyboardType="name-phone-pad"
            textContentType="name"
            autoFocus
            value={username}
            onChangeText={this.handleUsernameChange}
          />
          <TextInput
            style={styles.input}
            placeholder="Enter email"
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={this.handleEmailChange}
          />
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            textContentType="password"
            value={password}
            onChangeText={this.handlePasswordChange}
          />
          <TouchableOpacity style={styles.button} onPress={this.onHandleSignup}>
            <Text style={{ fontWeight: 'bold', color: '#fff', fontSize: 18 }}>
              {' '}
              Sign Up
            </Text>
          </TouchableOpacity>
          <View
            style={{
              marginTop: 30,
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'center',
            }}
          >
            <Text style={{ color: 'gray', fontWeight: '600', fontSize: 14 }}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={this.navigateToLogin}>
              <Text style={{ color: colors.pink, fontWeight: '600', fontSize: 14 }}>
                {' '}
                Log In
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <StatusBar barStyle="light-content" />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  backImage: {
    height: 340,
    position: 'absolute',
    resizeMode: 'cover',
    top: 0,
    width: '100%',
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    height: 58,
    justifyContent: 'center',
    marginTop: 40,
  },
  container: {
    backgroundColor: '#fff',
    flex: 1,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 30,
  },
  input: {
    backgroundColor: '#F6F7FB',
    borderRadius: 10,
    fontSize: 16,
    height: 58,
    marginBottom: 20,
    padding: 12,
  },
  title: {
    alignSelf: 'center',
    color: 'black',
    fontSize: 36,
    fontWeight: 'bold',
    paddingTop: 48,
  },
  whiteSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 60,
    bottom: 0,
    height: '75%',
    position: 'absolute',
    width: '100%',
  },
});

SignUp.propTypes = {
  navigation: PropTypes.object.isRequired,
};

export default SignUp;
