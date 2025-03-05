import { InitReady, createCmdKey, prosePluginsCtx } from "@milkdown/core";
import { Plugin, PluginKey, Transaction } from "@milkdown/prose/state";
import { Ctx, createSlice } from "@milkdown/ctx";
import { debounce, debounceFn } from "../utils";
import { $command, insert } from "@milkdown/utils";
import { setBlockType } from "@milkdown/prose/commands";
import { linkSchema } from "@milkdown/preset-commonmark";

type SelectionFn = (
  ctx: Ctx,
  selection: Transaction["selection"],
  doc: Transaction["doc"]
) => void;

export class SelectionManager {
  selectionListeners: SelectionFn[] = [];

  get listeners() {
    return {
      selection: this.selectionListeners,
    };
  }

  selection(fn: SelectionFn) {
    this.selectionListeners.push(fn);
    return this;
  }
}

export const selectionCtx = createSlice(
  new SelectionManager(),
  "selection-listener"
);

export const key = new PluginKey("MILKDOWN_SELECTION_LISTENER");

export const selectionListener = (ctx: Ctx) => {
  ctx.inject(selectionCtx, new SelectionManager());

  return async () => {
    await ctx.wait(InitReady);
    const listener = ctx.get(selectionCtx);
    const { listeners } = listener;

    let prevSelection: Transaction["selection"] | null = null;

    const plugin = new Plugin({
      key,
      state: {
        init: () => undefined,
        apply: (tr) => {
          if (prevSelection && tr.selection.eq(prevSelection)) return;

          const handler = debounceFn(() => {
            const { selection, doc } = tr;
            if (
              listeners.selection.length > 0 &&
              (prevSelection == null || !prevSelection.eq(selection))
            ) {
              listeners.selection.forEach((fn) => {
                fn(ctx, selection, doc);
              });
            }
            prevSelection = tr.selection;
          }, 200);

          return handler();
        },
      },
    });

    ctx.update(prosePluginsCtx, (x) => x.concat(plugin));
  };
};

export const AddLink = createCmdKey<number>();
export const addLinkCommand = $command(
  "AddLink",
  (ctx) =>
    (href = '', title = '', label = '') =>
      () => {
        insert(`[${title}](${href} ${label})`);
        return true;
      },
);
