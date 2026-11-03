import { memo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, type ListRenderItem, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { ExampleCard } from '@/features/practice/example-card';
import { useTheme } from '@/hooks/use-theme';

const PAGE_SIZE = 50;
const MAX_ITEMS = 1000;
const ROW_HEIGHT = 64;

type Item = { id: string; title: string };

/** Stands in for a real API call. */
function fetchPage(start: number): Promise<Item[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const count = Math.min(PAGE_SIZE, MAX_ITEMS - start);
      resolve(
        Array.from({ length: count }, (_, i) => ({
          id: String(start + i),
          title: `Item ${start + i + 1}`,
        }))
      );
    }, 600);
  });
}

const FIRST_PAGE = Array.from({ length: PAGE_SIZE }, (_, i) => ({
  id: String(i),
  title: `Item ${i + 1}`,
}));

// memo skips rows whose props did not change. The React Compiler in this project
// does this automatically, but you need it by hand in projects without the compiler.
const Row = memo(function Row({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <View style={styles.rowFrame}>
      <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text>{title}</Text>
      </View>
    </View>
  );
});

// Defined outside the component, so it stays the same function on every render.
const renderItem: ListRenderItem<Item> = ({ item }) => <Row title={item.title} />;

// With a fixed row height, the list can jump to any offset without measuring rows.
const getItemLayout = (_: unknown, index: number) => ({
  length: ROW_HEIGHT,
  offset: ROW_HEIGHT * index,
  index,
});

export function ListExamples() {
  const theme = useTheme();
  const [items, setItems] = useState<Item[]>(FIRST_PAGE);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // onEndReached can fire several times in a row. A ref blocks repeats immediately,
  // which prevents duplicate pages. State would only update on the next render.
  const isLoadingMore = useRef(false);

  async function loadMore() {
    if (isLoadingMore.current || refreshing || items.length >= MAX_ITEMS) return;
    isLoadingMore.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchPage(items.length);
      setItems((current) => [...current, ...page]);
    } finally {
      isLoadingMore.current = false;
      setLoadingMore(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    try {
      setItems(await fetchPage(0));
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <View style={styles.flex}>
      <View style={styles.intro}>
        <ExampleCard
          title="Long lists"
          problem="Rows render too often, scrolling drops frames and blank areas appear. Scroll to load more, pull to refresh.">
          <Text variant="small">{items.length} items loaded</Text>
        </ExampleCard>
      </View>
      <FlatList
        style={styles.flex}
        contentContainerStyle={styles.list}
        data={items}
        renderItem={renderItem}
        // Stable ids let rows keep their identity when data changes. Avoid array indexes.
        keyExtractor={(item) => item.id}
        getItemLayout={getItemLayout}
        // Fewer rows kept in memory, in exchange for more chance of blanks on fast scrolls.
        initialNumToRender={12}
        windowSize={7}
        // Starts loading when the user is half a screen from the end.
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={styles.footer} color={theme.accent} /> : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  intro: { padding: Spacing.four },
  list: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six },
  rowFrame: { height: ROW_HEIGHT, paddingBottom: Spacing.two },
  row: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footer: { padding: Spacing.four },
});
