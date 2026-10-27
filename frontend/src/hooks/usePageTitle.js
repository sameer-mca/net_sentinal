import { useEffect } from 'react';

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `NetSentinel · ${title}` : 'NetSentinel — Network Traffic Analyzer & IDS';
  }, [title]);
}

export default usePageTitle;
