import React, { useRef, useCallback } from 'react';
import { View, Dimensions, ViewToken } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';

const { width: screenWidth } = Dimensions.get('window');

const CARD_WIDTH = screenWidth * 1;
const SPACING = 16;
const SNAP_INTERVAL = CARD_WIDTH + SPACING;
const SIDE_PADDING = (screenWidth - CARD_WIDTH) / 2;

type CarouselItem = {
  id: string;
  component: React.ReactNode;
};

type MapCarouselProps = {
  data: CarouselItem[];
  onVisibleItemChange?: (id: string) => void;
};

export default function MapCarousel({ data, onVisibleItemChange }: MapCarouselProps) {
  const flatListRef = useRef<FlatList>(null);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && onVisibleItemChange) {
        onVisibleItemChange(viewableItems[0].item.id);
      }
    },
    [onVisibleItemChange]
  );

  return (
    <FlatList
      ref={flatListRef}
      data={data}
      renderItem={({ item }) => (
        <View style={{ width: CARD_WIDTH, flex: 1, justifyContent: 'flex-end' }}>
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
      viewabilityConfig={viewabilityConfig}
      onViewableItemsChanged={onViewableItemsChanged}
    />
  );
}
