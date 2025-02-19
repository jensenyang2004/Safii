Video Tutorial Link: https://youtu.be/TJVc2D3LaPk

1. EAS Build does NOT cost money! There is a free plan!
2. Run this in your terminal: 
    npx expo install expo-dev-client
3. Run this in your terminal: 
    npx expo start
4. Run this in your terminal: 
    npm install -g eas-cli
5. Go to https://expo.dev to create a free account
6. Run this in your terminal: 
    eas login
7. Run this in your terminal: 
    eas init
8. For ios, 
    Run this in your terminal: eas device:create
    Follow: https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/#provisioning-profile
9. Run this in your terminal for ios: eas build --platform ios --profile development 
    Or
    Run this in your terminal for Android: eas build --platform android --profile development
10. Run this in your terminal: npx expo start (if it is not still on)
11. Scan development build link to install the development build on your phone
12. For ios, follow this if it’s your first time to turn on developer mode: https://docs.expo.dev/guides/ios-developer-mode/
    This is not required for Android. EAS creates an APK file for testing instead
    https://docs.expo.dev/tutorial/eas/android-development-build/
13. After the reload, 
    Run this in your terminal if your server is closed: npx expo start 
14. Scan the code, and your development build should be working on your iPhone
15. To get Development Build working on an iOS simulator, follow these steps:
https://docs.expo.dev/build-reference/simulators/


Native Notify Push Notifications: https://NativeNotify.com
