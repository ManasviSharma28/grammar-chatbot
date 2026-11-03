import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  FadeOut,
  interpolate,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { ExampleCard } from '@/features/practice/example-card';
import { useTheme } from '@/hooks/use-theme';

const INITIAL_ROWS = ['Swipe me left', 'Or me', 'Me too'];
const SHEET_HEIGHT = 300;
const FAST_SWIPE = 800;

export function MotionExamples() {
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);
  // Shared values live on the UI thread, so animations stay smooth when JS is busy.
  const sheetY = useSharedValue(SHEET_HEIGHT);

  function openSheet() {
    setSheetOpen(true);
    sheetY.set(withSpring(0, { damping: 20, stiffness: 200 }));
  }

  function closeSheet() {
    setSheetOpen(false);
    sheetY.set(withTiming(SHEET_HEIGHT, { duration: 200 }));
  }

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
        <SwipeToDelete />
        <DraggableCard />
        <ExampleCard
          title="Bottom sheet"
          problem="Sheets feel wrong unless they follow the finger and close on a fast flick.">
          <Button label="Open sheet" onPress={openSheet} />
        </ExampleCard>
      </ScrollView>
      <BottomSheet open={sheetOpen} translateY={sheetY} onClose={closeSheet} />
    </View>
  );
}

function SwipeToDelete() {
  const [rows, setRows] = useState(INITIAL_ROWS);
  return (
    <ExampleCard
      title="Swipe to delete"
      problem="A sideways swipe can fight with vertical scrolling, and other rows jump when one is removed.">
      {rows.map((row) => (
        <SwipeRow
          key={row}
          label={row}
          onDelete={() => setRows((current) => current.filter((r) => r !== row))}
        />
      ))}
      <Button
        label="Reset rows"
        variant="secondary"
        disabled={rows.length === INITIAL_ROWS.length}
        onPress={() => setRows(INITIAL_ROWS)}
      />
    </ExampleCard>
  );
}

function SwipeRow({ label, onDelete }: { label: string; onDelete: () => void }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(0);

  const pan = usePanGesture({
    // Start only on sideways movement, and give up on vertical movement so the page can scroll.
    activeOffsetX: [-10, 10],
    failOffsetY: [-10, 10],
    onUpdate: (event) => {
      translateX.set(Math.min(0, event.translationX));
    },
    onDeactivate: (event) => {
      const farEnough = translateX.get() < -width * 0.35;
      if (farEnough || event.velocityX < -FAST_SWIPE) {
        translateX.set(
          withTiming(-width, { duration: 180 }, (finished) => {
            // State lives on the JS thread, so hop back there from this worklet.
            if (finished) scheduleOnRN(onDelete);
          })
        );
      } else {
        translateX.set(withSpring(0));
      }
    },
  });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.get() }],
  }));

  return (
    // LinearTransition slides the remaining rows up instead of letting them jump.
    <Animated.View
      layout={LinearTransition}
      exiting={FadeOut.duration(120)}
      style={[styles.swipeTrack, { backgroundColor: theme.dangerMuted }]}>
      <Text variant="smallStrong" color="danger" style={styles.deleteLabel}>
        Delete
      </Text>
      <GestureDetector gesture={pan}>
        <Animated.View
          // Screen reader users can't swipe, so give them the same action another way.
          accessible
          accessibilityLabel={label}
          accessibilityActions={[{ name: 'delete', label: 'Delete' }]}
          onAccessibilityAction={onDelete}
          style={[styles.swipeRow, { backgroundColor: theme.surfaceMuted }, rowStyle]}>
          <Text>{label}</Text>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

function DraggableCard() {
  const theme = useTheme();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(1);

  const pan = usePanGesture({
    onActivate: () => {
      scale.set(withSpring(1.08));
    },
    onUpdate: (event) => {
      x.set(event.translationX);
      y.set(event.translationY);
    },
    // onFinalize also runs when the gesture is cancelled, so the card can't get stuck.
    onFinalize: () => {
      x.set(withSpring(0));
      y.set(withSpring(0));
      scale.set(withSpring(1));
    },
  });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: scale.get() }],
  }));

  return (
    <ExampleCard
      title="Drag and drop"
      problem="Dragging with React state re-renders on every move and lags. Shared values don't.">
      <View style={styles.dragArea}>
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.dragCard, { backgroundColor: theme.accent }, cardStyle]}>
            <Text variant="smallStrong" color="accentText">
              Drag me
            </Text>
          </Animated.View>
        </GestureDetector>
      </View>
    </ExampleCard>
  );
}

type BottomSheetProps = {
  open: boolean;
  translateY: ReturnType<typeof useSharedValue<number>>;
  onClose: () => void;
};

function BottomSheet({ open, translateY, onClose }: BottomSheetProps) {
  const theme = useTheme();

  const pan = usePanGesture({
    onUpdate: (event) => {
      // Math.max stops the sheet being dragged above its open position.
      translateY.set(Math.max(0, event.translationY));
    },
    onDeactivate: (event) => {
      // Close on a long drag or a quick flick, as native sheets do.
      if (translateY.get() > SHEET_HEIGHT / 3 || event.velocityY > FAST_SWIPE) {
        scheduleOnRN(onClose);
      } else {
        translateY.set(withSpring(0, { damping: 20, stiffness: 200 }));
      }
    },
  });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
  }));

  // The backdrop fades with the sheet because both read the same shared value.
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.get(), [0, SHEET_HEIGHT], [0.5, 0]),
  }));

  return (
    <View pointerEvents={open ? 'auto' : 'none'} style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable accessibilityLabel="Close sheet" style={styles.flex} onPress={onClose} />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.sheet, { backgroundColor: theme.surface }, sheetStyle]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          <Text variant="heading">Bottom sheet</Text>
          <Text color="textSecondary">Drag this down, flick it, or tap outside to close it.</Text>
          <Button label="Close" variant="secondary" onPress={onClose} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: Spacing.four, padding: Spacing.four },
  swipeTrack: { justifyContent: 'center', borderRadius: Radius.md, overflow: 'hidden' },
  deleteLabel: { position: 'absolute', right: Spacing.four },
  swipeRow: { padding: Spacing.four, borderRadius: Radius.md },
  dragArea: { height: 140, alignItems: 'center', justifyContent: 'center' },
  dragCard: {
    width: 110,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: '#000' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    gap: Spacing.three,
    padding: Spacing.five,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: Radius.pill },
});
