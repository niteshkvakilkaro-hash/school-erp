import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { StudentProvider } from '../context/StudentContext';
import { useTheme } from '../context/ThemeContext';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import AttendanceScreen from '../screens/AttendanceScreen';
import HomeworkScreen from '../screens/HomeworkScreen';
import ResultsScreen from '../screens/ResultsScreen';
import MoreScreen from '../screens/MoreScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SubjectsScreen from '../screens/SubjectsScreen';
import SchoolScreen from '../screens/SchoolScreen';
import { Loader } from '../components/ui';

const Stack = createNativeStackNavigator();
const MoreStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Emoji icons - koi extra icon package install karne ki zaroorat nahi padti
const ICONS = {
    Home: '\u{1F3E0}',
    Attendance: '\u{1F4C5}',
    Homework: '\u{1F4DD}',
    Results: '\u{1F4CA}',
    More: '\u{2630}',
};

/** "More" tab ke andar ka stack - kam use hone wale screens. */
function MoreNavigator() {
    const { colors } = useTheme();
    return (
        <MoreStack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: colors.card },
                headerTintColor: colors.foreground,
                headerTitleStyle: { fontSize: 16 },
            }}
        >
            <MoreStack.Screen name="MoreMenu" component={MoreScreen} options={{ headerShown: false }} />
            <MoreStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Student profile' }} />
            <MoreStack.Screen name="Subjects" component={SubjectsScreen} options={{ title: 'Subjects' }} />
            <MoreStack.Screen name="School" component={SchoolScreen} options={{ title: 'School info' }} />
        </MoreStack.Navigator>
    );
}

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
            <Tab.Screen name="Attendance" component={AttendanceScreen} />
            <Tab.Screen name="Homework" component={HomeworkScreen} />
            <Tab.Screen name="Results" component={ResultsScreen} />
            <Tab.Screen name="More" component={MoreNavigator} />
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
