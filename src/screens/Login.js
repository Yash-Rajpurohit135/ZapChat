import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
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

import { auth } from '../config/firebase';
import { colors } from '../config/constants';
import backImage from '../assets/background.png';

class Login extends Component {
  constructor(props) {
    super(props);
    this.state = {
      email: '',
      password: '',
    };
  }

  onHandleLogin = () => {
    const { email, password } = this.state;

    if (email !== '' && password !== '') {
      signInWithEmailAndPassword(auth, email, password)
        .then(() => console.log('Login success'))
        .catch((err) => Alert.alert('Login error', err.message));
    }
  };

  handleEmailChange = (text) => {
    this.setState({ email: text });
  };

  handlePasswordChange = (text) => {
    this.setState({ password: text });
  };

  navigateToSignUp = () => {
    this.props.navigation.navigate('SignUp');
  };

  render() {
    const { email, password } = this.state;

    return (
      <View style={styles.container}>
        <Image source={backImage} style={styles.backImage} />
        <View style={styles.whiteSheet} />
        <SafeAreaView style={styles.form}>
          <Text style={styles.title}>Log In</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter email"
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoFocus
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
          <TouchableOpacity style={styles.button} onPress={this.onHandleLogin}>
            <Text style={{ fontWeight: 'bold', color: '#fff', fontSize: 18 }}> Log In</Text>
          </TouchableOpacity>
          <View
            style={{ marginTop: 30, flexDirection: 'row', alignItems: 'center', alignSelf: 'center' }}
          >
            <Text style={{ color: 'gray', fontWeight: '600', fontSize: 14 }}>
              Don&apos;t have an account? &nbsp;
            </Text>
            <TouchableOpacity onPress={this.navigateToSignUp}>
              <Text style={{ color: colors.pink, fontWeight: '600', fontSize: 14 }}> Sign Up</Text>
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
    paddingBottom: 24,
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

Login.propTypes = {
  navigation: PropTypes.object.isRequired,
};

export default Login;
