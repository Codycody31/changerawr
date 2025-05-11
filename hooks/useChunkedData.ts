import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

// Generic type for the log data - ensure it includes an id
interface ChunkedDataParams<T extends { id: string | number }> {
    fetchFn: (cursor: string, filters: unknown) => Promise<{
        logs: T[];
        total: number;
        nextCursor: string | null;
    }>;
    queryKey: string;
    filters: unknown;
    chunkSize?: number;
    initialCursor?: string;
}

export const useChunkedData = <T extends { id: string | number }>({
                                                                      fetchFn,
                                                                      queryKey,
                                                                      filters,
                                                                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                                                      chunkSize = 100,
                                                                      initialCursor = '',
                                                                  }: ChunkedDataParams<T>) => {
    const [data, setData] = useState<T[]>([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [cursor, setCursor] = useState(initialCursor);
    const [hasMore, setHasMore] = useState(true);
    const [total, setTotal] = useState(0);
    const queryClient = useQueryClient();
    const initialLoadComplete = useRef(false);

    // Keep a cache of loaded cursors to avoid duplicate data
    const loadedCursors = useRef(new Set<string>());

    // Main query to fetch data
    const { isLoading, isError, refetch } = useQuery({
        queryKey: [queryKey, 'chunked', cursor, filters],
        queryFn: async () => {
            if (cursor && loadedCursors.current.has(cursor)) {
                return null; // Skip if this cursor was already loaded
            }

            const result = await fetchFn(cursor, filters);

            // Mark this cursor as loaded
            if (cursor) {
                loadedCursors.current.add(cursor);
            }

            setTotal(result.total);

            // Append new data to existing data
            setData(prevData => {
                // Ensure no duplicates by checking IDs
                const existingIds = new Set(prevData.map(item => item.id));
                const uniqueNewItems = result.logs.filter(item => !existingIds.has(item.id));

                return [...prevData, ...uniqueNewItems];
            });

            // Update cursor and hasMore flag
            if (result.nextCursor) {
                setCursor(result.nextCursor);
                setHasMore(true);
            } else {
                setHasMore(false);
            }

            return result;
        },
        enabled: hasMore && !loadedCursors.current.has(cursor), // Only run if there's more data to load
        refetchOnWindowFocus: false,
    });

    // Load initial data
    useEffect(() => {
        if (!initialLoadComplete.current) {
            refetch();
            initialLoadComplete.current = true;
        }
    }, [refetch]);

    // Reset when filters change
    useEffect(() => {
        setData([]);
        setCursor('');
        setHasMore(true);
        loadedCursors.current.clear();
        initialLoadComplete.current = false;
        refetch();
    }, [JSON.stringify(filters), refetch]);

    // Function to load more data
    const loadMore = useCallback(() => {
        if (!isLoading && !isLoadingMore && hasMore) {
            setIsLoadingMore(true);
            refetch().finally(() => {
                setIsLoadingMore(false);
            });
        }
    }, [isLoading, isLoadingMore, hasMore, refetch]);

    // Function to reset and reload data
    const reset = useCallback(() => {
        setData([]);
        setCursor('');
        setHasMore(true);
        loadedCursors.current.clear();
        initialLoadComplete.current = false;

        // Invalidate all related queries
        queryClient.invalidateQueries({
            queryKey: [queryKey],
        });

        refetch();
    }, [queryKey, queryClient, refetch]);

    return {
        data,
        isLoading: isLoading || (!initialLoadComplete.current && !isError),
        isLoadingMore,
        isError,
        hasMore,
        loadMore,
        reset,
        total,
        progress: total > 0 ? Math.min(100, (data.length / total) * 100) : 0,
    };
};