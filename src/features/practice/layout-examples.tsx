import { FlatList, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { ExampleCard } from '@/features/practice/example-card';
import { useTheme } from '@/hooks/use-theme';

const TILES = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'];
const CHIPS = ['All', 'Music', 'Sports', 'Movies', 'Travel', 'Food', 'Science', 'Books'];

export function LayoutExamples() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}>
      <ExampleCard
        title="Safe areas"
        problem="Content slides under the notch, the status bar or the home indicator.">
        {/* Read the real insets. Hard-coded values break on other devices. */}
        <Text variant="small">
          Insets on this device: top {insets.top}, bottom {insets.bottom}, left {insets.left}, right{' '}
          {insets.right}
        </Text>
      </ExampleCard>

      <ResponsiveGrid />
      <LongTextRow />

      <ExampleCard
        title="Scrolling inside scrolling"
        problem="A vertical list inside a ScrollView stops recycling rows, and RN warns about it.">
        {/* Different directions are safe to nest. Same-direction lists should be one list. */}
        <FlatList
          horizontal
          data={CHIPS}
          keyExtractor={(chip) => chip}
          renderItem={({ item }) => <Chip label={item} />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        />
      </ExampleCard>
    </ScrollView>
  );
}

function ResponsiveGrid() {
  const theme = useTheme();
  // Unlike Dimensions.get, this hook re-renders on rotation and window resizing.
  const { width } = useWindowDimensions();
  const columns = width >= 600 ? 3 : 2;
  // Percentages let the card's padding decide the space, so no width maths is needed.
  const tileWidth = columns === 3 ? '31%' : '48%';

  return (
    <ExampleCard
      title="Different screen sizes"
      problem="A layout built for one phone overflows on small phones and looks empty on tablets.">
      <Text variant="small">
        Window width {Math.round(width)} shows {columns} columns.
      </Text>
      <View style={styles.grid}>
        {TILES.map((tile) => (
          <View key={tile} style={[styles.tile, { width: tileWidth, backgroundColor: theme.surfaceMuted }]}>
            <Text variant="smallStrong">{tile}</Text>
          </View>
        ))}
      </View>
    </ExampleCard>
  );
}

function LongTextRow() {
  const theme = useTheme();
  return (
    <ExampleCard
      title="Long text"
      problem="Long names and large system fonts push buttons and badges off the screen.">
      <View style={styles.row}>
        {/* flex: 1 makes the text take only the space left, then numberOfLines truncates it. */}
        <Text numberOfLines={1} style={styles.rowText}>
          A really long name that would otherwise push the badge off the screen
        </Text>
        {/* flexShrink: 0 keeps the badge at full size. */}
        <View style={[styles.badge, { backgroundColor: theme.successMuted }]}>
          <Text variant="smallStrong" color="success" maxFontSizeMultiplier={1.3}>
            New
          </Text>
        </View>
      </View>
    </ExampleCard>
  );
}

function Chip({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: theme.surfaceMuted }]}>
      <Text variant="small">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.four, padding: Spacing.four },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: Spacing.two },
  tile: { aspectRatio: 1.6, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rowText: { flex: 1 },
  badge: { flexShrink: 0, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, borderRadius: Radius.sm },
  chips: { gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.pill },
});
