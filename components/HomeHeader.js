// import { View, Text, Image, Platform } from 'react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { blurhash } from '../utils/common';
// import { useAuth } from '../context/authContext';

// const ios = Platform.OS === 'ios';

// export default function HomeHeader() {
//   const { user } = useAuth();
//   const { top } = useSafeAreaInsets();

//   return (
//     <View style={{ paddingTop: ios ? top + 10 : 0 }} className="flex-row justify-between px-5 bg-indigo-400 pb-6 rounded-b-3xl">
//       <View>
//         <Text style={{ fontSize: hp(3) }} className="font-medium text-white">Chats</Text>
//       </View>

//       <View>
//         <Image
//           style={{ height: hp(4.3), aspectRatio: 1, borderRadius: 100 }}
//           source={user?.profileUrl}
//           placeholder={blurhash}
//           transition={500}
//         />
//       </View>
//     </View>
//   );
// }
