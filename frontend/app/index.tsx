import { Redirect } from "expo-router";
import { Text, View } from "react-native";
import '@/global.css';



export default function Index() {
  return <Redirect href={'/(tabs)/map'} />
}
