// app/(tabs)/contacts.tsx

import { SafeAreaView } from 'react-native-safe-area-context'

import React from 'react'
import {
    View,
    Text,
    FlatList,
    Pressable,
    StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'

const CONTACTS = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
    { id: '3', name: 'Mike' },
]

export default function ContactsScreen() {
    const router = useRouter()

    return (

        <SafeAreaView style={styles.container}>
            <Text style={styles.header}>Who do you want to call?</Text>
            <FlatList
                data={CONTACTS}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <Pressable
                        style={styles.item}
                        onPress={() => {
                            // open the modal and pass the contact’s name
                            router.push({
                                pathname: '/calling',
                                params: { contact: item.name },
                            })
                        }}
                    >
                        <Text style={styles.name}>{item.name}</Text>
                    </Pressable>
                )}
            />
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    item: {
        padding: 16,
        borderBottomColor: '#eee',
        borderBottomWidth: 1,
    },
    name: {
        fontSize: 18,
    },
})