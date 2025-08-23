// import React, { useState } from 'react';
// import { View, Pressable, Text, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
// import { MediaTypeOptions } from 'expo-image-picker';
// import { storage, db } from '@/libs/firebase';
// import { ref, uploadBytesResumable, uploadBytes, getDownloadURL } from 'firebase/storage';
// import { doc, updateDoc } from 'firebase/firestore';
// import { useAuth } from '@/context/AuthProvider';
// import { FontAwesome } from '@expo/vector-icons';


// export default function ProfilePhotoUploader() {
//     const { user, fetchUserInfo } = useAuth();
//     const [uploading, setUploading] = useState(false);

//     const pickImage = async () => {
//         try {
//             // Ask for permission
//             const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

//             if (status !== 'granted') {
//                 Alert.alert('Permission needed', 'Please allow access to your photo library to upload a profile picture.');
//                 return;
//             }

//             // Launch image picker
//             const result = await ImagePicker.launchImageLibraryAsync({
//                 mediaTypes: [ImagePicker.MediaType.Images],
//                 // mediaTypes: ImagePicker.MediaTypeOptions.Images,
//                 allowsEditing: true,
//                 aspect: [1, 1],
//                 quality: 0.7,
//             });

//             if (!result.canceled && result.assets && result.assets.length > 0) {
//                 await uploadImage(result.assets[0].uri);
//             }
//         } catch (error) {
//             console.error("Error picking image:", error);
//             Alert.alert("Error", "Failed to pick image");
//         }
//     };

//     const takePhoto = async () => {
//         try {
//             // Ask for permission
//             const { status } = await ImagePicker.requestCameraPermissionsAsync();

//             if (status !== 'granted') {
//                 Alert.alert('Permission needed', 'Please allow access to your camera to take a profile picture.');
//                 return;
//             }

//             // Launch camera
//             const result = await ImagePicker.launchCameraAsync({
//                 allowsEditing: true,
//                 aspect: [1, 1],
//                 quality: 0.7,
//             });

//             if (!result.canceled && result.assets && result.assets.length > 0) {
//                 await uploadImage(result.assets[0].uri);
//             }
//         } catch (error) {
//             console.error("Error taking photo:", error);
//             Alert.alert("Error", "Failed to take photo");
//         }
//     };

//     const uploadImage = async (uri: string) => {
//         if (!user?.uid) {
//             Alert.alert("Error", "You must be logged in to upload a profile picture");
//             return;
//         }

//         setUploading(true);

//         try {
//             console.log("Starting upload process...");

//             // Convert to blob
//             const response = await fetch(uri);
//             const blob = await response.blob();

//             // Create simple path
//             const path = `test-uploads/image-${Date.now()}.jpg`;
//             const storageRef = ref(storage, path);

//             console.log("Uploading to:", path);

//             // Simple upload
//             const snapshot = await uploadBytes(storageRef, blob);
//             console.log("Upload success!");

//             const url = await getDownloadURL(snapshot.ref);
//             console.log("Download URL:", url);

//             // Update user
//             await updateDoc(doc(db, "users", user.uid), {
//                 avatarUrl: url
//             });

//             fetchUserInfo(user.uid);
//             Alert.alert("Success!", "Photo uploaded");

//             // Create storage reference with explicit path
//             // const storageRef = ref(storage, `profile_photos/${user.uid}/profile.jpg`);
//             // console.log("Upload starting to path:", `profile_photos/${user.uid}/profile.jpg`);

//             // // Upload file
//             // const uploadTask = uploadBytesResumable(storageRef, blob);

//             // // Monitor upload
//             // uploadTask.on(
//             //     'state_changed',
//             //     (snapshot) => {
//             //         const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
//             //         console.log(`Upload is ${progress}% complete`);
//             //     },
//             //     (error) => {
//             //         console.error("Upload failed details:", JSON.stringify(error));
//             //         Alert.alert("Upload failed", "Please check your internet connection and try again");
//             //         setUploading(false);
//             //     },
//             //     async () => {
//             //         // Upload complete
//             //         const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
//             //         console.log("Upload successful, URL:", downloadURL);

//             //         // Rest of your code...
//             //     }
//             // );
//         } catch (error) {
//             console.error("Error in upload process:", error);
//             Alert.alert("Error", "Failed to prepare image for upload");
//             setUploading(false);
//         } finally {
//             setUploading(false);
//         }
//     };

//     return (
//         <View style={styles.container}>
//             {uploading ? (
//                 <ActivityIndicator size="large" color="#1E40AF" />
//             ) : (
//                 <View style={styles.options}>
//                     <Pressable onPress={pickImage} style={styles.option}>
//                         <FontAwesome name="photo" size={24} color="#1E40AF" />
//                         <Text style={styles.optionText}>Choose Photo</Text>
//                     </Pressable>

//                     <Pressable onPress={takePhoto} style={styles.option}>
//                         <FontAwesome name="camera" size={24} color="#1E40AF" />
//                         <Text style={styles.optionText}>Take Photo</Text>
//                     </Pressable>
//                 </View>
//             )}
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     container: {
//         marginTop: 20,
//         alignItems: 'center',
//     },
//     options: {
//         flexDirection: 'row',
//         justifyContent: 'center',
//         width: '100%',
//     },
//     option: {
//         alignItems: 'center',
//         marginHorizontal: 20,
//         padding: 10,
//     },
//     optionText: {
//         marginTop: 5,
//         color: '#1E40AF',
//     }
// });