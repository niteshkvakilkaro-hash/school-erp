import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { StudentProvider } from '../context/StudentContext';
import { useTheme } from '../context/ThemeContext';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SubjectsScreen from '../screens/SubjectsScreen';
import SchoolScreen from '../screens/SchoolScreen';
import { Loader } from '../components/ui';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Emoji icons - koi extra icon package install karne ki zaroorat nahi padti
const ICONS = {
    Home: '\u{1F3E0}',
    Profile: '\u{1F464}',
    Subjects: '\u{1F4DA}',
    School: '\u{1F3EB}',
};

function Tabs() {
    const { colors } = useTheme();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.mutedForeground,
                tabBarStyle: {
                    backgroundColor: colors.card,
                    borderTopColor: colors.border,
                    height: 76,
                    paddingBottom: 14,
                    paddingTop: 8,
                },
                tabBarLabelStyle: { fontSize: 11, fontWeight: '500', lineHeight: 15, marginTop: 2 },
                tabBarIcon: ({ focused }) => (
                    <Text style={{ fontSize: 18, lineHeight: 22, opacity: focused ? 1 : 0.55 }}>
                        {ICONS[route.name]}
                    </Text>
                ),
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
            <Tab.Screen name="Subjects" component={SubjectsScreen} />
            <Tab.Screen name="School" component={SchoolScreen} />
        </Tab.Navigator>
    );
}

export function RootNavigator() {
    const { isAuthenticated, loading } = useAuth();
    const { colors, scheme } = useTheme();

    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    const navTheme = {
        ...base,
        colors: {
            ...base.colors,
            primary: colors.primary,
            background: colors.background,
            card: colors.card,
            text: colors.foreground,
            border: colors.border,
        },
    };

    if (loading) return <Loader text="ERPSC" />;

    return (
        <NavigationContainer theme={navTheme}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {isAuthenticated ? (
                    <Stack.Screen name="App">
                        {() => (
                            <StudentProvider>
                                <Tabs />
                            </StudentProvider>
                        )}
                    </Stack.Screen>
                ) : (
                    <Stack.Screen name="Login" component={LoginScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
