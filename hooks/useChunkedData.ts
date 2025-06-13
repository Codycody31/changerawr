import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

// Generic type for the log data - ensure it includes an id
interface ChunkedDataParams<T extends { id: string | number }> {
    fetchFn: (cursor: string, filters: unknown) => Promise<{
        logs: T[];
        total: number;
        nextCursor: string | null;
        hasMore?: boolean;
        currentCount?: number;
    }>;
    queryKey: string;
    filters: unknown;
    chunkSize?: number;
    initialCursor?: string;
    maxRetries?: number;
    retryDelay?: number;
}

export const useChunkedData = <T extends { id: string | number }>({
                                                                      fetchFn,
                                                                      queryKey,
                                                                      filters,
                                                                      initialCursor = '',
                                                                      maxRetries = 3,
                                                                      retryDelay = 1000,
                                                                  }: ChunkedDataParams<T>) => {
    const [data, setData] = useState<T[]>([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [cursor, setCursor] = useState(initialCursor);
    const [hasMore, setHasMore] = useState(true);
    const [total, setTotal] = useState(0);
    const [currentRetries, setCurrentRetries] = useState(0);
    const [lastError, setLastError] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const initialLoadComplete = useRef(false);
    const isResetting = useRef(false);

    // Keep a cache of loaded cursors to avoid duplicate data
    const loadedCursors = useRef(new Set<string>());
    const loadedIds = useRef(new Set<string | number>());

    // Debug logging
    const debugLog = useCallback((message: string, ...args: unknown[]) => {
        console.log(`🦖 ChunkedData [${queryKey}]:`, message, ...args);
    }, [queryKey]);

    // Main query to fetch data
    const { isLoading, isError, refetch, error } = useQuery({
        queryKey: [queryKey, 'chunked', cursor, filters],
        queryFn: async () => {
            if (cursor && loadedCursors.current.has(cursor)) {
                debugLog('Skipping already loaded cursor:', cursor);
                return null; // Skip if this cursor was already loaded
            }

            debugLog('Fetching with cursor:', cursor || 'initial');

            try {
                const result = await fetchFn(cursor, filters);

                debugLog('Fetch result:', {
                    logsCount: result.logs.length,
                    total: result.total,
                    nextCursor: result.nextCursor,
                    hasMore: result.hasMore
                });

                // Reset error state on successful fetch
                setLastError(null);
                setCurrentRetries(0);

                // Mark this cursor as loaded
                if (cursor) {
                    loadedCursors.current.add(cursor);
                }

                setTotal(result.total);

                // Append new data to existing data
                setData(prevData => {
                    // Ensure no duplicates by checking IDs
                    const existingIds = new Set(prevData.map(item => item.id));
                    const uniqueNewItems = result.logs.filter(item => {
                        if (existingIds.has(item.id) || loadedIds.current.has(item.id)) {
                            return false;
                        }
                        loadedIds.current.add(item.id);
                        return true;
                    });

                    debugLog('Adding unique items:', uniqueNewItems.length, 'out of', result.logs.length);

                    return [...prevData, ...uniqueNewItems];
                });

                // Update cursor and hasMore flag
                const hasMoreData = result.hasMore !== undefined ? result.hasMore : !!result.nextCursor;

                if (result.nextCursor && hasMoreData) {
                    setCursor(result.nextCursor);
                    setHasMore(true);
                } else {
                    setHasMore(false);
                    debugLog('No more data available');
                }

                return result;
            } catch (error) {
                debugLog('Fetch error:', error);
                setLastError(error instanceof Error ? error.message : 'Unknown error');

                // Retry logic
                if (currentRetries < maxRetries) {
                    debugLog('Retrying fetch, attempt:', currentRetries + 1);
                    setCurrentRetries(prev => prev + 1);

                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, retryDelay * (currentRetries + 1)));
                    throw error; // Re-throw to trigger react-query retry
                } else {
                    debugLog('Max retries reached, giving up');
                    throw error;
                }
            }
        },
        enabled: hasMore && !loadedCursors.current.has(cursor) && !isResetting.current,
        refetchOnWindowFocus: false,
        retry: false, // We handle retries manually
        staleTime: 30000, // 30 seconds
    });

    // Load initial data
    useEffect(() => {
        if (!initialLoadComplete.current && !isResetting.current) {
            debugLog('Loading initial data');
            refetch();
            initialLoadComplete.current = true;
        }
    }, [refetch]);

    // Reset when filters change
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const filtersString = JSON.stringify(filters);
        debugLog('Filters changed, resetting data');

        isResetting.current = true;
        setData([]);
        setCursor('');
        setHasMore(true);
        setLastError(null);
        setCurrentRetries(0);
        loadedCursors.current.clear();
        loadedIds.current.clear();
        initialLoadComplete.current = false;

        // Small delay to ensure state is updated
        setTimeout(() => {
            isResetting.current = false;
            refetch();
        }, 10);
    }, [JSON.stringify(filters), refetch]);

    // Function to load more data
    const loadMore = useCallback(async () => {
        if (!hasMore || isLoadingMore || isLoading || isResetting.current) {
            debugLog('Skipping loadMore - conditions not met:', {
                hasMore,
                isLoadingMore,
                isLoading,
                isResetting: isResetting.current
            });
            return;
        }

        debugLog('Loading more data with cursor:', cursor);
        setIsLoadingMore(true);

        try {
            await refetch();
        } catch (error) {
            debugLog('LoadMore error:', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [hasMore, isLoadingMore, isLoading, cursor, refetch]);

    // Function to reset and reload data
    const reset = useCallback(() => {
        debugLog('Manual reset triggered');

        isResetting.current = true;
        setData([]);
        setCursor('');
        setHasMore(true);
        setLastError(null);
        setCurrentRetries(0);
        loadedCursors.current.clear();
        loadedIds.current.clear();
        initialLoadComplete.current = false;

        // Invalidate all related queries
        queryClient.invalidateQueries({
            queryKey: [queryKey],
        });

        setTimeout(() => {
            isResetting.current = false;
            refetch();
        }, 10);
    }, [queryKey, queryClient, refetch]);

    // Enhanced progress calculation
    const progress = total > 0 ? Math.min(100, (data.length / total) * 100) : 0;

    // Debug state changes
    useEffect(() => {
        debugLog('State update:', {
            dataLength: data.length,
            total,
            hasMore,
            cursor,
            progress: progress.toFixed(1) + '%',
            isLoading,
            isLoadingMore,
            isError,
            lastError
        });
    }, [data.length, total, hasMore, cursor, progress, isLoading, isLoadingMore, isError, lastError]);

    return {
        data,
        isLoading: (isLoading && !initialLoadComplete.current) || isResetting.current,
        isLoadingMore,
        isError: isError || !!lastError,
        hasMore,
        loadMore,
        reset,
        total,
        progress,
        currentRetries,
        lastError,
        error: error || lastError,
    };
};