import React, { useState } from "react";
import { 
    View, TextInput, FlatList, Text, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView 
} from "react-native";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/libs/firebase";
import { useAuth } from "@/context/AuthProvider";
import '@/global.css';

const SearchUsersScreen = () => {

    interface User {
        id: string;
        username: string;
        // Add other user properties if needed
    }


    const [searchQuery, setSearchQuery] = useState("");
    const [results, setResults] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    const { user, fetchUserInfo } = useAuth();

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        
        setLoading(true);
        setResults([]);

        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("username", ">=", searchQuery), where("username", "<=", searchQuery + "\uf8ff"));
            const querySnapshot = await getDocs(q);
            
            const users = querySnapshot.docs
                .map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        username: data.username ?? "",
                        // Add other user properties if needed
                    };
                });
            setResults(users);
        } catch (error) {
            console.error("Error searching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSet = async (id: string) => {
        const usersRef = doc(db, "users", user?.id);
        try {
            await updateDoc(usersRef, {
                contact: id,
            });
            fetchUserInfo(user?.id);
            console.log("Contact updated successfully");
        } catch (error) {
            console.error("Error updating contact:", error);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-100">
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : undefined} 
                className="flex-1 px-5 pt-5"
            >
                <View className="items-center mb-4 w-full">
                    <View className="flex-row items-center w-full bg-white rounded-xl px-4 py-2 shadow">
                        <TextInput
                            placeholder="Search users..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            className="flex-1 text-base py-2 mr-2"
                            returnKeyType="search"
                            onSubmitEditing={handleSearch}
                        />
                        <TouchableOpacity onPress={handleSearch} className="bg-blue-500 px-3 py-2 rounded-lg active:opacity-70">
                            <Text className="text-white font-bold text-base">Search</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {loading && <ActivityIndicator size="large" color="#007BFF" className="mt-4" />}

                <FlatList
                    data={results}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View className="bg-white p-4 rounded-xl mt-3 shadow">
                            <Text className="text-lg font-bold text-gray-800">{item?.username}</Text>
                            <TouchableOpacity 
                                onPress={() => handleSet(item.id)} 
                                className="bg-blue-500 px-3 py-2 mt-2 rounded-lg active:opacity-70"
                            >
                                <Text className="text-white font-bold text-base">
                                    Set as default emergency contact
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    ListEmptyComponent={
                        !loading ? (
                            <Text className="text-center mt-6 text-gray-500 text-base">No users found</Text>
                        ) : null
                    }
                />
            </KeyboardAvoidingView>
            <Text className="text-4xl">Hello nativewind</Text>
        </SafeAreaView>
    );
};

export default SearchUsersScreen;