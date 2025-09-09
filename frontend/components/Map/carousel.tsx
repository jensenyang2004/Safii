import React, { useRef } from 'react';
import { FlatList, View, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

const CARD_WIDTH = screenWidth * 0.75;
const SPACING = 16;
const SNAP_INTERVAL = CARD_WIDTH + SPACING;
const SIDE_PADDING = (screenWidth - CARD_WIDTH) / 2;

type CarouselItem = {
  id: string;
  component: React.ReactNode;
};

type MapCarouselProps = {
  data: CarouselItem[];
};

export default function MapCarousel({ data }: MapCarouselProps) {
  const flatListRef = useRef<FlatList>(null);

  return (
    <FlatList
      ref={flatListRef}
      data={data}
      renderItem={({ item }) => (
        <View style={{ width: CARD_WIDTH }}>
          {item.component}
        </View>
      )}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={SNAP_INTERVAL}
      decelerationRate="fast"
      contentContainerStyle={{
        paddingHorizontal: SIDE_PADDING,
      }}
      ItemSeparatorComponent={() => <View style={{ width: SPACING }} />}
    />
  );
}
