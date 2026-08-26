import { useEffect, useState } from 'react';
import { initStorage, type StorageTier } from '@/lib/storage';

/** 偵測完成前回傳 null，UI 應顯示載入態而不是假設某個層級 */
export function useStorageTier(): StorageTier | null {
  const [tier, setTier] = useState<StorageTier | null>(null);
  useEffect(() => {
    let alive = true;
    initStorage().then((s) => {
      if (alive) setTier(s.tier);
    });
    return () => {
      alive = false;
    };
  }, []);
  return tier;
}
