import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Text } from '@/components/ui/text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { FormExamples } from '@/features/practice/form-examples';
import { LayoutExamples } from '@/features/practice/layout-examples';
import { ListExamples } from '@/features/practice/list-examples';
import { MotionExamples } from '@/features/practice/motion-examples';
import { useTheme } from '@/hooks/use-theme';

const TOPICS = [
  { label: 'Layout', Examples: LayoutExamples },
  { label: 'Lists', Examples: ListExamples },
  { label: 'Forms', Examples: FormExamples },
  { label: 'Motion', Examples: MotionExamples },
];

export default function PracticeScreen() {
  const theme = useTheme();
  const [selected, setSelected] = useState(0);
  const { Examples } = TOPICS[selected];

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.page}>
        <View accessibilityRole="tablist" style={[styles.tabs, { backgroundColor: theme.surfaceMuted }]}>
          {TOPICS.map((topic, index) => (
            <Pressable
              key={topic.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: index === selected }}
              onPress={() => setSelected(index)}
              style={[styles.tab, index === selected && { backgroundColor: theme.surface }]}>
              <Text variant="smallStrong" color={index === selected ? 'text' : 'textSecondary'}>
                {topic.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.root}>
          <Examples />
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.four,
    marginTop: Spacing.two,
    padding: Spacing.half,
    borderRadius: Radius.md,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.two, borderRadius: Radius.sm },
});
