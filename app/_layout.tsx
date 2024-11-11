import { Theme, ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import * as Font from "expo-font";
import * as Notifications from "expo-notifications";
import { Slot, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as TaskManager from "expo-task-manager";
import { swrConfiguration } from "lib/swr";
import * as React from "react";
import { SafeAreaView } from "react-native";
import Toast from "react-native-toast-message";
import PolyfillCrypto from "react-native-webview-crypto";
import { SWRConfig } from "swr";
import { toastConfig } from "~/components/ToastConfig";
import { UserInactivityProvider } from "~/context/UserInactivity";
import "~/global.css";
import { useInfo } from "~/hooks/useInfo";
import { SessionProvider } from "~/hooks/useSession";
import { BACKGROUND_NOTIFICATION_TASK, NAV_THEME } from "~/lib/constants";
import { isBiometricSupported } from "~/lib/isBiometricSupported";
import { useAppStore } from "~/lib/state/appStore";
import { useColorScheme } from "~/lib/useColorScheme";

const LIGHT_THEME: Theme = {
  dark: false,
  colors: NAV_THEME.light,
};
const DARK_THEME: Theme = {
  dark: true,
  colors: NAV_THEME.dark,
};

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

// FIXME: only use this in android (?)
TaskManager.defineTask(
  BACKGROUND_NOTIFICATION_TASK,
  ({ data }: { data: Record<string, any> }) => {
    console.info("Received a notification in the background!", data?.body);
    // Do something with the notification data
  },
);

Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK)
  .then(() => {
    console.info(
      `Notifications.registerTaskAsync success: ${BACKGROUND_NOTIFICATION_TASK}`,
    );
  })
  .catch((reason) => {
    console.info(`Notifications registerTaskAsync failed: ${reason}`);
  });

// Prevent the splash screen from auto-hiding before getting the color scheme.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(app)/index",
};

export default function RootLayout() {
  const { isDarkColorScheme, setColorScheme } = useColorScheme();
  const [resourcesLoaded, setResourcesLoaded] = React.useState(false);

  useConnectionChecker();

  async function loadFonts() {
    await Font.loadAsync({
      OpenRunde: require("./../assets/fonts/OpenRunde-Regular.otf"),
      "OpenRunde-Medium": require("./../assets/fonts/OpenRunde-Medium.otf"),
      "OpenRunde-Semibold": require("./../assets/fonts/OpenRunde-Semibold.otf"),
      "OpenRunde-Bold": require("./../assets/fonts/OpenRunde-Bold.otf"),
    });
  }

  async function checkBiometricStatus() {
    const isSupported = await isBiometricSupported();
    if (!isSupported) {
      useAppStore.getState().setSecurityEnabled(false);
    }
  }

  const loadTheme = React.useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const theme = useAppStore.getState().theme;
      setColorScheme(theme);
      resolve();
    });
  }, [setColorScheme]);

  React.useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([loadTheme(), loadFonts(), checkBiometricStatus()]);
      } finally {
        setResourcesLoaded(true);
        SplashScreen.hideAsync();
      }
    };

    init();
  }, [loadTheme]);

  if (!resourcesLoaded) {
    return null;
  }

  return (
    <SWRConfig value={swrConfiguration}>
      <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
        <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
        <PolyfillCrypto />
        <SafeAreaView className="w-full h-full bg-background">
          <UserInactivityProvider>
            <SessionProvider>
              <Slot />
            </SessionProvider>
          </UserInactivityProvider>
          <Toast
            config={toastConfig}
            position="bottom"
            bottomOffset={140}
            topOffset={140}
          />
          <PortalHost />
        </SafeAreaView>
      </ThemeProvider>
    </SWRConfig>
  );
}

function useConnectionChecker() {
  const { error } = useInfo();
  React.useEffect(() => {
    if (error?.message) {
      Toast.show({
        type: "connectionError",
        text1: error.message,
      });
    }
  }, [error?.message]);
}
