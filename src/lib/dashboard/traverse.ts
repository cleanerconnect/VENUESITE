// Spec traversal.
//
// Blocks nest (split, group), so anything that asks a question about a
// whole screen has to walk the tree rather than scan the top level.

import type { Block, BlockType } from "./spec";

/** Depth-first walk over a block list, descending into containers. */
export function walkBlocks(blocks: Block[]): Block[] {
  const out: Block[] = [];
  for (const block of blocks) {
    out.push(block);
    if (block.type === "split") {
      out.push(...walkBlocks(block.main), ...walkBlocks(block.rail));
    } else if (block.type === "group") {
      out.push(...walkBlocks(block.children));
    }
  }
  return out;
}

export function containsBlockType(blocks: Block[], type: BlockType): boolean {
  return walkBlocks(blocks).some((b) => b.type === type);
}
