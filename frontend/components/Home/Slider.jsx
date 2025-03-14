import { View, Text, FlatList } from 'react-native'
import React, { useState, useEffect } from 'react';

import { collection, query } from 'firebase/firestore'
// import {
import firestore from '@react-native-firebase/firestore';

export default function Slider() {
    const [sliderList, setSliderList] = useState([]);

    useEffect(() => {
        GetSliderList();
    }, []);

    const GetSliderList = async () => {
        setSliderList([]);

        const q = query(collection(db, 'Slider'));
        const querySnapshot = await getDocs(q);


        querySnapshot.forEach((doc) => {
            console.log(doc.data());
            setSliderList(prev=>[...prev, doc.data()]);
        })
        
    };

    // GetSliderList();
    // }, []);

    return (
        <View>
            <Text style={{ 
                fontFamily: 'outfit-bold', 
                fontSize: 20, 
                paddingLeft: 20,
                paddingTop: 20,
                marginBottom: 5
                
                }}>
                Special for you
            </Text>

            <FlatList
                data={sliderList}
                horizontal={true}
                showsHorixontalScrollIndicator={false}
                style={{paddingLeft:20}}
                renderItem={({ item, index }) => (
                    <Image source={{ uri: item.imageUrl }} 
                    style={{ 
                        width: 300, 
                        height: 160, 
                        borderRadius: 15,
                        marginRight: 20
                    }} />
                )}
            />
        </View>
    );
}