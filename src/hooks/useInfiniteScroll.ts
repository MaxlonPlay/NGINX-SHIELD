import { useRef, useEffect, useCallback } from "react";

interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  loadingMore: boolean;
  offset?: number;
}

export const useInfiniteScroll = ({
  onLoadMore,
  hasMore,
  isLoading,
  loadingMore,
  offset = 10,
}: UseInfiniteScrollOptions) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const { current } = scrollContainerRef;
    if (current) {
      const atBottom =
        current.scrollTop + current.clientHeight >=
        current.scrollHeight - offset;

      if (atBottom && hasMore && !loadingMore && !isLoading) {
        onLoadMore();
      }
    }
  }, [hasMore, loadingMore, isLoading, onLoadMore, offset]);

  useEffect(() => {
    const { current } = scrollContainerRef;
    if (current) {
      current.addEventListener("scroll", handleScroll);
      return () => {
        current.removeEventListener("scroll", handleScroll);
      };
    }
  }, [handleScroll]);

  return scrollContainerRef;
};
