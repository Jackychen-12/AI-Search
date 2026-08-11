"use client";

import { memo } from "react";
import type { AIItem } from "@/lib/types";
import ItemCard from "./ItemCard";

const MemoCard = memo(ItemCard);

export default function ItemList({
  items,
  bookmarks,
  readSet,
  now,
  keyword,
  onToggleBookmark,
  onOpen,
  emptyHint = "没有匹配的内容，换个关键词或分类试试。",
}: {
  items: AIItem[];
  bookmarks?: Set<string>;
  readSet?: Set<string>;
  now?: number;
  keyword?: string;
  onToggleBookmark?: (id: string) => void;
  onOpen?: (id: string) => void;
  emptyHint?: string;
}) {
  if (items.length === 0) {
    return <div className="card p-10 text-center text-gray-500 dark:text-gray-400">{emptyHint}</div>;
  }
  return (
    <div className="columns-1 sm:columns-2 xl:columns-3 gap-4 stagger-grid">
      {items.map((it, i) => (
        <div
          key={it.id}
          className="mb-4 break-inside-avoid animate-fadeIn"
          style={{ animationDelay: `${Math.min(i * 30, 200)}ms` }}
        >
          <MemoCard
            item={it}
            bookmarked={bookmarks?.has(it.id)}
            read={readSet?.has(it.id)}
            now={now}
            keyword={keyword}
            onToggleBookmark={onToggleBookmark}
            onOpen={onOpen}
          />
        </div>
      ))}
    </div>
  );
}
