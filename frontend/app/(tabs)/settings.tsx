import React, { useState } from "react";
import { 
    View, TextInput, FlatList, Text, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, SafeAreaView 
} from "react-native";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/libs/firebase";
import { useAuth } from "@/context/AuthProvider";

const SearchUsersScreen = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const { user } = useAuth();

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        
        setLoading(true);
        setResults([]);

        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("username", ">=", searchQuery), where("username", "<=", searchQuery + "\uf8ff"));
            const querySnapshot = await getDocs(q);
            
            const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setResults(users);
        } catch (error) {
            console.error("Error searching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSet = async (id) => {
        const usersRef = doc(db, "users", user?.id)
        try {
          await updateDoc(usersRef, {
              contact: id,
          });
          console.log("Contact updated successfully");
        } catch (error) {
            console.error("Error updating contact:", error);
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : undefined} 
                style={styles.keyboardView}
            >
                <View style={styles.searchBoxContainer}>
                    <View style={styles.searchBox}>
                        <TextInput
                            placeholder="Search users..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={styles.input}
                            returnKeyType="search"
                            onSubmitEditing={handleSearch}
                        />
                        <TouchableOpacity onPress={handleSearch} style={styles.searchButton} activeOpacity={0.7}>
                            <Text style={styles.buttonText}>Search</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {loading && <ActivityIndicator size="large" color="#007BFF" style={styles.loading} />}

                <FlatList
                    data={results}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.userItem}>
                            <Text style={styles.username}>{item.username}</Text>
                            <TouchableOpacity onPress={() => {handleSet(item.id)}} style={styles.searchButton} activeOpacity={0.7}>
                              <Text style={styles.buttonText}>Set as default emergency contact</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    ListEmptyComponent={!loading && <Text style={styles.emptyText}>No users found</Text>}
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8F9FA",
    },
    keyboardView: {
        flex: 1, 
        padding: 20,
    },
    searchBoxContainer: {
        alignItems: "center",
        marginBottom: 15,
        width: "100%",
    },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 8,
        marginRight: 10,
    },
    searchButton: {
        backgroundColor: "#007BFF",
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
    },
    buttonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    loading: {
        marginTop: 15,
    },
    userItem: {
        backgroundColor: "#FFF",
        padding: 15,
        borderRadius: 10,
        marginTop: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    username: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
    },
    emptyText: {
        marginTop: 20,
        textAlign: "center",
        fontSize: 16,
        color: "#888",
    },
});

export default SearchUsersScreen;