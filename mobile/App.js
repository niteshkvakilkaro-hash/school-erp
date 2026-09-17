import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';

function Shell() {
    const { scheme } = useTheme();
    return (
        <>
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
            <RootNavigator />
        </>
    );
}

export default function App() {
    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <AuthProvider>
                    <Shell />
                </AuthProvider>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
