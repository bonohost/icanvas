'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  ShoppingCart,
  CheckCircle2,
  Circle,
  Copy,
  Share2,
  ShoppingBag,
  ArrowUpRight,
  Store,
  Layers
} from 'lucide-react';
import { FurnitureInstance, ProductMetadata, ProductStoreLink } from '../types/furniture';

interface SceneCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  furniture: FurnitureInstance[];
  onSelectItem?: (uid: number) => void;
}

interface GroupedCartItem {
  groupKey: string;
  quantity: number;
  uids: number[];
  product: ProductMetadata;
  name: string;
}

export default function SceneCartModal({
  isOpen,
  onClose,
  furniture,
  onSelectItem,
}: SceneCartModalProps) {
  // Group repeated products into a single row with quantity
  const groupedItems = useMemo<GroupedCartItem[]>(() => {
    const map = new Map<string, GroupedCartItem>();

    furniture.forEach((item) => {
      if (!item.product || !item.product.stores || item.product.stores.length === 0) return;

      // Group key prioritizing product id, then store url, then title
      const key =
        item.product.id ||
        item.product.stores[0]?.url ||
        item.product.title ||
        item.id;

      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.quantity += 1;
        existing.uids.push(item.uid);
      } else {
        map.set(key, {
          groupKey: key,
          quantity: 1,
          uids: [item.uid],
          product: item.product,
          name: item.name,
        });
      }
    });

    return Array.from(map.values());
  }, [furniture]);

  // Track which groups are checked in the cart (by default all are checked)
  const [selectedGroups, setSelectedGroups] = useState<Record<string, boolean>>({});
  // Track selected store index per group (default is 0 = Magazine Luiza)
  const [selectedStoreIndex, setSelectedStoreIndex] = useState<Record<string, number>>({});
  const [copiedToast, setCopiedToast] = useState(false);

  // Check state per group
  const isChecked = (groupKey: string) => {
    return selectedGroups[groupKey] !== false; // default true
  };

  const toggleCheck = (groupKey: string) => {
    setSelectedGroups((prev) => ({
      ...prev,
      [groupKey]: prev[groupKey] === false ? true : false,
    }));
  };

  const getActiveStore = (item: GroupedCartItem): ProductStoreLink => {
    const idx = selectedStoreIndex[item.groupKey] || 0;
    return item.product.stores[idx] || item.product.stores[0];
  };

  const handleStoreChange = (groupKey: string, storeIdx: number) => {
    setSelectedStoreIndex((prev) => ({
      ...prev,
      [groupKey]: storeIdx,
    }));
  };

  // Calculate totals considering quantities
  const { totalAmount, totalSavings, totalUnitsCount, checkedGroupsCount } = useMemo(() => {
    let sum = 0;
    let savings = 0;
    let units = 0;
    let groups = 0;

    groupedItems.forEach((group) => {
      if (isChecked(group.groupKey)) {
        const store = getActiveStore(group);
        const subtotal = store.price * group.quantity;
        sum += subtotal;

        if (store.originalPrice && store.originalPrice > store.price) {
          savings += (store.originalPrice - store.price) * group.quantity;
        }
        units += group.quantity;
        groups += 1;
      }
    });

    return {
      totalAmount: sum,
      totalSavings: savings,
      totalUnitsCount: units,
      checkedGroupsCount: groups,
    };
  }, [groupedItems, selectedGroups, selectedStoreIndex]);

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleCopyList = () => {
    const lines = groupedItems
      .filter((group) => isChecked(group.groupKey))
      .map((group) => {
        const store = getActiveStore(group);
        const subtotal = store.price * group.quantity;
        const qtyLabel = group.quantity > 1 ? `${group.quantity}x ` : '';
        return `• ${qtyLabel}${group.product.title || group.name} - ${store.store}: ${formatBRL(subtotal)} (${formatBRL(store.price)} un) - ${store.url}`;
      });

    const summary = `🛍️ *Lista de Compras do Ambiente (icanvas 3D)*\n\n${lines.join('\n')}\n\n*Total Estimado (${totalUnitsCount} itens):* ${formatBRL(totalAmount)}`;
    navigator.clipboard.writeText(summary);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const lines = groupedItems
      .filter((group) => isChecked(group.groupKey))
      .map((group) => {
        const store = getActiveStore(group);
        const subtotal = store.price * group.quantity;
        const qtyLabel = group.quantity > 1 ? `${group.quantity}x ` : '';
        return `• ${qtyLabel}${group.product.title || group.name} - ${store.store}: ${formatBRL(subtotal)}`;
      });

    const text = `🛍️ *Orçamento do Ambiente (icanvas 3D)*\n\n${lines.join('\n')}\n\n*Total (${totalUnitsCount} itens):* ${formatBRL(totalAmount)}\nConfira os produtos no projeto 3D!`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-3xl bg-zinc-900/95 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Carrinho do Ambiente
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {groupedItems.length} {groupedItems.length === 1 ? 'modelo' : 'modelos'} ({totalUnitsCount} un)
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Produtos reais vinculados aos móveis desta cena 3D agrupados por modelo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
          {groupedItems.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-500">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-zinc-300">
                Nenhum produto vinculado nesta cena
              </h3>
              <p className="text-sm text-zinc-500 max-w-sm">
                Selecione um móvel na cena e acesse a aba <b>Produto & Afiliado</b> no painel lateral para vincular links da Magazine Luiza ou outras lojas.
              </p>
            </div>
          ) : (
            groupedItems.map((group) => {
              const product = group.product;
              const activeStore = getActiveStore(group);
              const checked = isChecked(group.groupKey);
              const subtotalPrice = activeStore.price * group.quantity;
              const subtotalOriginal = activeStore.originalPrice ? activeStore.originalPrice * group.quantity : undefined;

              return (
                <div
                  key={group.groupKey}
                  className={`group relative rounded-xl border p-4 transition-all ${
                    checked
                      ? 'bg-zinc-800/50 border-zinc-700/80 hover:border-indigo-500/50 hover:bg-zinc-800/70'
                      : 'bg-zinc-900/40 border-zinc-800 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleCheck(group.groupKey)}
                      className="text-zinc-400 hover:text-indigo-400 transition-colors shrink-0"
                      title={checked ? 'Desmarcar do total' : 'Incluir no total'}
                    >
                      {checked ? (
                        <CheckCircle2 className="w-5 h-5 text-indigo-400 fill-indigo-500/20" />
                      ) : (
                        <Circle className="w-5 h-5 text-zinc-600" />
                      )}
                    </button>

                    {/* Thumbnail Image with Quantity Badge */}
                    <div
                      className="relative w-16 h-16 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
                      onClick={() => onSelectItem?.(group.uids[0])}
                      title="Focar item no 3D"
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <ShoppingBag className="w-6 h-6 text-zinc-600" />
                      )}

                      {/* Quantity pill on image */}
                      {group.quantity > 1 && (
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-indigo-600/95 text-white font-black text-[10px] shadow-md border border-indigo-400/40">
                          {group.quantity}x
                        </span>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {group.quantity > 1 && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                            {group.quantity} unidades na cena
                          </span>
                        )}
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                          {product.category || group.name}
                        </span>
                        {product.brand && (
                          <span className="text-xs text-zinc-400">
                            Marca: {product.brand}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-white truncate mt-1">
                        {product.title || group.name}
                      </h4>

                      {/* Store Selector (if multiple stores exist) */}
                      {product.stores.length > 1 ? (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-zinc-400 flex items-center gap-1">
                            <Store className="w-3.5 h-3.5" /> Loja:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {product.stores.map((s, sIdx) => {
                              const isStoreActive = (selectedStoreIndex[group.groupKey] || 0) === sIdx;
                              return (
                                <button
                                  key={sIdx}
                                  onClick={() => handleStoreChange(group.groupKey, sIdx)}
                                  className={`text-xs px-2 py-0.5 rounded-md border transition-all ${
                                    isStoreActive
                                      ? 'bg-indigo-500/20 border-indigo-500/60 text-indigo-300 font-medium'
                                      : 'bg-zinc-800/70 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
                                  }`}
                                >
                                  {s.store} ({formatBRL(s.price * group.quantity)})
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-400">
                          <Store className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Loja: <b className="text-zinc-300">{activeStore.store}</b></span>
                        </div>
                      )}
                    </div>

                    {/* Price and Action Button */}
                    <div className="flex sm:flex-col items-end justify-between w-full sm:w-auto shrink-0 gap-2">
                      <div className="text-right">
                        {subtotalOriginal && subtotalOriginal > subtotalPrice && (
                          <span className="text-xs text-zinc-500 line-through block">
                            {formatBRL(subtotalOriginal)}
                          </span>
                        )}
                        <span className="text-base font-bold text-emerald-400">
                          {formatBRL(subtotalPrice)}
                        </span>
                        {group.quantity > 1 && (
                          <span className="text-[11px] text-zinc-400 block font-mono">
                            ({formatBRL(activeStore.price)} cada)
                          </span>
                        )}
                      </div>

                      {/* Direct Affiliate Link */}
                      <a
                        href={activeStore.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Comprar na {activeStore.store}
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary */}
        {groupedItems.length > 0 && (
          <div className="border-t border-zinc-800 bg-zinc-950/60 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-start">
              <div>
                <span className="text-xs text-zinc-400 block">
                  Total do Ambiente ({totalUnitsCount} {totalUnitsCount === 1 ? 'item' : 'itens'} • {groupedItems.length} {groupedItems.length === 1 ? 'modelo' : 'modelos'})
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-white tracking-tight">
                    {formatBRL(totalAmount)}
                  </span>
                  {totalSavings > 0 && (
                    <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      Economia de {formatBRL(totalSavings)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleCopyList}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700/60 transition-colors"
                title="Copiar lista de compras formatada"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedToast ? 'Copiado!' : 'Copiar Lista'}
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-medium border border-emerald-500/30 transition-colors"
                title="Compartilhar no WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                WhatsApp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
