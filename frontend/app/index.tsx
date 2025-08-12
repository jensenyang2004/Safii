// app/index.tsx

import { Redirect } from "expo-router";

import '@/global.css';


export default function Index() {
  return <Redirect href={'/(tabs)/map'} />
}
