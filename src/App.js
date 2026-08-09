import { registerRootComponent } from 'expo';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import { View, ActivityIndicator } from 'react-native';
import { MenuProvider } from 'react-native-popup-menu';
import React, { Component } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import Chat from './screens/Chat';
import Help from './screens/Help';
import Chats from './screens/Chats';
import Login from './screens/Login';
import Users from './screens/Users';
import About from './screens/About';
import Group from './screens/Group';
import SignUp from './screens/SignUp';
import Profile from './screens/Profile';
import Account from './screens/Account';
import { auth } from './config/firebase';
import Settings from './screens/Settings';
import ChatInfo from './screens/ChatInfo';
import { colors } from './config/constants';
import ChatMenu from './components/ChatMenu';
import ChatHeader from './components/ChatHeader';
import { UnreadMessagesContext, UnreadMessagesProvider } from './contexts/UnreadMessagesContext';
import {
  AuthenticatedUserContext,
  AuthenticatedUserProvider,
} from './contexts/AuthenticatedUserContext';
import { ThemeProvider, ThemeContext } from './contexts/ThemeContext';
import { lightTheme } from './config/themes';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// TabNavigator as Class Component
class TabNavigator extends Component {
  static contextType = UnreadMessagesContext;

  renderTabBarIcon = ({ route, focused, color, size }) => {
    let iconName = route.name === 'Chats' ? 'chatbubbles' : 'settings';
    iconName += focused ? '' : '-outline';
    return <Ionicons name={iconName} size={size} color={color} />;
  };

  render() {
    const { unreadCount, setUnreadCount } = this.context;

    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => 
            this.renderTabBarIcon({ route, focused, color, size }),
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: 'gray',
          headerShown: true,
          presentation: 'modal',
        })}
      >
        <Tab.Screen 
          name="Chats" 
          options={{ tabBarBadge: unreadCount > 0 ? unreadCount : null }}
        >
          {() => <Chats setUnreadCount={setUnreadCount} />}
        </Tab.Screen>
        <Tab.Screen name="Settings" component={Settings} />
      </Tab.Navigator>
    );
  }
}

// MainStack as Class Component
class MainStack extends Component {
  renderChatHeader = (route) => (
    <ChatHeader chatName={route.params.chatName} chatId={route.params.id} />
  );

  renderChatMenu = (route) => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <ChatMenu chatName={route.params.chatName} chatId={route.params.id} />
    </View>
  );

  render() {
    return (
      <Stack.Navigator>
        <Stack.Screen 
          name="Home" 
          component={TabNavigator} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen
          name="Chat"
          component={Chat}
          options={({ route }) => ({
            headerTitle: () => this.renderChatHeader(route),
            headerRight: () => this.renderChatMenu(route),
          })}
        />
        <Stack.Screen 
          name="Users" 
          component={Users} 
          options={{ title: 'Select User' }} 
        />
        <Stack.Screen name="Profile" component={Profile} />
        <Stack.Screen name="About" component={About} />
        <Stack.Screen name="Help" component={Help} />
        <Stack.Screen name="Account" component={Account} />
        <Stack.Screen 
          name="Group" 
          component={Group} 
          options={{ title: 'New Group' }} 
        />
        <Stack.Screen 
          name="ChatInfo" 
          component={ChatInfo} 
          options={{ title: 'Chat Information' }} 
        />
      </Stack.Navigator>
    );
  }
}

// AuthStack as Class Component
class AuthStack extends Component {
  render() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="SignUp" component={SignUp} />
      </Stack.Navigator>
    );
  }
}

// RootNavigator as Class Component
class RootNavigator extends Component {
  static contextType = AuthenticatedUserContext;

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
    };
    this.unsubscribeAuth = null;
  }

  componentDidMount() {
    const { setUser } = this.context;
    
    this.unsubscribeAuth = onAuthStateChanged(auth, async (authenticatedUser) => {
      setUser(authenticatedUser || null);
      this.setState({ isLoading: false });
    });
  }

  componentWillUnmount() {
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
    }
  }

  renderLoadingScreen() {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  render() {
    const { user } = this.context;
    const { isLoading } = this.state;

    if (isLoading) {
      return this.renderLoadingScreen();
    }

    return (
      // consume ThemeContext so NavigationContainer receives current theme
      <ThemeContext.Consumer>
        {({ theme }) => (
          <NavigationContainer theme={theme}>
            {user ? <MainStack /> : <AuthStack />}
          </NavigationContainer>
        )}
      </ThemeContext.Consumer>
    );
  }
}

// Main App Component as Class
class App extends Component {
  render() {
    return (
      <MenuProvider>
        <AuthenticatedUserProvider>
          <UnreadMessagesProvider>
            <ThemeProvider>
              <RootNavigator />
            </ThemeProvider>
          </UnreadMessagesProvider>
        </AuthenticatedUserProvider>
      </MenuProvider>
    );
  }
}

export default registerRootComponent(App);
