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
  Layers,
  Sparkles
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-neutral-900/95 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] z-10 text-neutral-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 text-white shrink-0">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Carrinho do Ambiente
                </h2>
                <span className="px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1 shrink-0 whitespace-nowrap">
                  <Layers className="w-3 h-3" />
                  {groupedItems.length} {groupedItems.length === 1 ? 'produto' : 'produtos'}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-neutral-400">
                Produtos reais vinculados aos móveis desta cena 3D
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-4 space-y-2.5 custom-scrollbar">
          {groupedItems.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-neutral-200">
                Nenhum produto vinculado nesta cena
              </h3>
              <p className="text-xs text-neutral-400 max-w-sm px-4">
                Adicione móveis à cena para visualizar a lista completa de produtos e compras com orçamento automático.
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
                  className={`group relative rounded-2xl border p-3 sm:p-3.5 transition-all ${
                    checked
                      ? 'bg-white/[0.04] border-white/15 hover:border-indigo-500/40 hover:bg-white/[0.07]'
                      : 'bg-white/[0.01] border-white/5 opacity-50'
                  }`}
                >
                  {/* Item Top: Checkbox + Thumbnail + Details */}
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleCheck(group.groupKey)}
                      className="mt-1 text-neutral-400 hover:text-indigo-400 active:scale-90 transition-all shrink-0"
                      title={checked ? 'Desmarcar do total' : 'Incluir no total'}
                    >
                      {checked ? (
                        <CheckCircle2 className="w-5 h-5 text-indigo-400 fill-indigo-500/20" />
                      ) : (
                        <Circle className="w-5 h-5 text-neutral-600" />
                      )}
                    </button>

                    {/* Thumbnail with Quantity Pill */}
                    <div
                      className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-neutral-950 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer group-hover:border-indigo-500/40 transition-colors"
                      onClick={() => {
                        onSelectItem?.(group.uids[0]);
                        onClose();
                      }}
                      title="Tocar para selecionar este móvel no 3D"
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <ShoppingBag className="w-5 h-5 text-neutral-600" />
                      )}

                      {/* Quantity pill on image */}
                      {group.quantity > 1 && (
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-indigo-600 text-white font-black text-[9px] shadow border border-indigo-400/40">
                          {group.quantity}x
                        </span>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      {/* Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {group.quantity > 1 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {group.quantity} un
                          </span>
                        )}
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white/10 text-neutral-300 border border-white/10 truncate max-w-[120px]">
                          {product.category || group.name}
                        </span>
                        {product.brand && (
                          <span className="text-[10px] text-neutral-400 truncate max-w-[100px]">
                            {product.brand}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4
                        onClick={() => {
                          onSelectItem?.(group.uids[0]);
                          onClose();
                        }}
                        className="text-xs sm:text-sm font-semibold text-white leading-snug line-clamp-2 mt-1 cursor-pointer hover:text-indigo-300 transition-colors"
                        title={product.title || group.name}
                      >
                        {product.title || group.name}
                      </h4>

                      {/* Store Selector or Store Line */}
                      {product.stores.length > 1 ? (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                            <Store className="w-3 h-3 text-neutral-400" /> Loja:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {product.stores.map((s, sIdx) => {
                              const isStoreActive = (selectedStoreIndex[group.groupKey] || 0) === sIdx;
                              return (
                                <button
                                  key={sIdx}
                                  onClick={() => handleStoreChange(group.groupKey, sIdx)}
                                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all ${
                                    isStoreActive
                                      ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-200 font-bold'
                                      : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                                  }`}
                                >
                                  {s.store} ({formatBRL(s.price * group.quantity)})
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mt-1 text-[11px] text-neutral-400">
                          <Store className="w-3 h-3 text-neutral-400 shrink-0" />
                          <span className="truncate">Loja: <b className="text-neutral-200">{activeStore.store}</b></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Item Bottom Bar: Pricing + Affiliate CTA */}
                  <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-white/10">
                    <div className="flex flex-col">
                      {subtotalOriginal && subtotalOriginal > subtotalPrice && (
                        <span className="text-[10px] text-neutral-500 line-through">
                          {formatBRL(subtotalOriginal)}
                        </span>
                      )}
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm sm:text-base font-extrabold text-emerald-400">
                          {formatBRL(subtotalPrice)}
                        </span>
                        {group.quantity > 1 && (
                          <span className="text-[9px] text-neutral-400 font-mono">
                            ({formatBRL(activeStore.price)} un)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Direct Buy Affiliate Link Button */}
                    <a
                      href={activeStore.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
                    >
                      <span>Comprar na {activeStore.store.length > 15 ? 'Loja' : activeStore.store}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary */}
        {groupedItems.length > 0 && (
          <div className="border-t border-white/10 bg-black/60 px-4 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center justify-between w-full sm:w-auto sm:justify-start gap-3">
              <div>
                <span className="text-[10px] sm:text-xs text-neutral-400 block">
                  Total do Ambiente ({totalUnitsCount} {totalUnitsCount === 1 ? 'item' : 'itens'})
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                    {formatBRL(totalAmount)}
                  </span>
                  {totalSavings > 0 && (
                    <span className="text-[10px] sm:text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      Economia de {formatBRL(totalSavings)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleCopyList}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-white text-xs font-bold border border-white/15 transition-all active:scale-95"
                title="Copiar lista de compras formatada"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedToast ? 'Copiado!' : 'Copiar Lista'}</span>
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all active:scale-95"
                title="Compartilhar no WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
