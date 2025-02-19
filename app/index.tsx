
// import { View, Text } from 'react-native'
// import React from 'react'

// export default function index() {
//   return (
//     <View className='bg-red-200 pt-20'>
//       <Text className='text-3xl text-center'>index</Text>
//     </View>
//   )
// }



import { Redirect } from "expo-router";
import { Text, View } from "react-native";


export default function Index() {
  return <Redirect href={'/home'} />
}
