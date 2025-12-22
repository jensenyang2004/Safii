import React, { useState } from 'react';
import { View, Pressable, Text, Image, StyleSheet, ActivityIndicator, Alert, Modal, TouchableOpacity } from 'react-native';
import * as Theme from '@/constants/Theme';
import * as ImagePicker from 'expo-image-picker';
import { storage, db, auth } from '@/libs/firebase';
import { ref, uploadBytesResumable, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthProvider';
import { FontAwesome } from '@expo/vector-icons';

export default function ProfilePhotoUploader() {
    const { user, fetchUserInfo } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [showOptions, setShowOptions] = useState(false);

    const pickImage = async () => {
        try {
            // Ask for permission
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please allow access to your photo library to upload a profile picture.');
                return;
            }

            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                // mediaTypes: ImagePicker.MediaType.Images,
                mediaTypes: ['images', 'videos'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                await uploadImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error("Error picking image:", error);
            Alert.alert("Error", "Failed to pick image");
        }
    };

    const takePhoto = async () => {
        try {
            // Ask for permission
            const { status } = await ImagePicker.requestCameraPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please allow access to your camera to take a profile picture.');
                return;
            }

            // Launch camera
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                await uploadImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error("Error taking photo:", error);
            Alert.alert("Error", "Failed to take photo");
        }
    };

    const uploadImage = async (uri: string, mimeType?: string) => {
    if (!user?.uid) {
        Alert.alert("Error", "You must be logged in to upload a profile picture");
        return;
    }

    setUploading(true);

    try {
        console.log("Starting upload process...");

        // Convert URI → Blob
        const response = await fetch(uri);
        const blob = await response.blob();

        // Path in Firebase
        const path = `users/${user.uid}/avatar_${Date.now()}`;
        const storageRef = ref(storage, path);

        // Pick correct mime type (fallback to jpeg)
        const metadata = { contentType: mimeType || 'image/jpeg' };

        // Upload
        const snapshot = await uploadBytes(storageRef, blob, metadata);
        console.log("Upload success!");

        const url = await getDownloadURL(snapshot.ref);
        console.log("Download URL:", url);

        // Save to Firestore
        await updateDoc(doc(db, "users", user.uid), {
        avatarUrl: url
        });
        fetchUserInfo(auth.currentUser)
        // Alert.alert("Success!", "Photo uploaded");
    } catch (error: any) {
        console.error("Upload error:", JSON.stringify(error, null, 2));
        Alert.alert("Error", `Failed to upload image: ${error.message || "Unknown error"}`);
    } finally {
        setUploading(false);
    }
    };
    return (
        <View style={styles.container}>
            {uploading ? (
                <ActivityIndicator size="large" color="#1E40AF" />
            ) : (
                <>
                    <Pressable onPress={() => setShowOptions(true)} style={styles.avatarWrapper}>
                        {user?.avatarUrl ? (
                            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Text style={styles.avatarInitial}>{(user?.displayName || user?.username || 'U')[0]}</Text>
                            </View>
                        )}
                    </Pressable>

                    <Modal
                        visible={showOptions}
                        animationType="fade"
                        transparent
                        onRequestClose={() => setShowOptions(false)}
                    >
                        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowOptions(false)}>
                            <View style={styles.modalContent}>
                                <TouchableOpacity style={styles.modalButton} onPress={async () => { setShowOptions(false); await pickImage(); }}>
                                    <FontAwesome name="photo" size={20} color="#1E40AF" />
                                    <Text style={styles.modalButtonText}>選擇照片</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalButton} onPress={async () => { setShowOptions(false); await takePhoto(); }}>
                                    <FontAwesome name="camera" size={20} color="#1E40AF" />
                                    <Text style={styles.modalButtonText}>拍照</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.modalButton, styles.modalCancel]} onPress={() => setShowOptions(false)}>
                                    <Text style={[styles.modalButtonText, { color: '#374151' }]}>取消</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </Modal>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
        alignItems: 'center',
    },
    options: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
    },
    option: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 20,
        padding: 10,
    },
    optionText: {
        marginTop: 5,
        color: '#1E40AF',
    }
    ,
    avatarWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: Theme.tracking_colors.coralRed,
        backgroundColor: '#E5E7EB',
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 48,
        color: '#6B7280',
        fontWeight: '700',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 16,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    modalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        gap: 12,
    },
    modalButtonText: {
        marginLeft: 12,
        fontSize: 16,
        color: '#1E40AF',
    },
    modalCancel: {
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    }
});
