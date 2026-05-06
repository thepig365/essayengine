"use client";

import { useEffect, useRef } from "react";
import type { MegaMenuCategorySpec, MegaMenuItemSpec } from "@/components/navigation/megaMenuData";

type Props = {
  open: boolean;
  categories: MegaMenuCategorySpec[];
  /** When set, scroll this section into view when the menu opens */
  focusSectionId: MegaMenuCategorySpec["id"] | null;
  onClose: () => void;
  onItemActivate: (item: MegaMenuItemSpec) => void;
};

export function FeatureMegaMenu({ open, categories, focusSectionId, onClose, onItemActivate }: Props) {
  const sectionRefs = useRef<Partial<Record<MegaMenuCategorySpec["id"], HTMLElement | null>>>({});

  useEffect(() => {
    if (!open || !focusSectionId) return;
    const id = window.requestAnimationFrame(() => {
      const el = sectionRefs.current[focusSectionId];
      el?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, focusSectionId]);

  if (!open) return null;

  return (
    <div
      className="ee-functions-overlay"
      role="dialog"
      aria-label="Functions"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ee-functions-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ee-functions-head">
          <div>
            <p className="ee-functions-eyebrow">Workflow tools</p>
            <h2 className="ee-functions-title">Functions</h2>
            <p className="ee-functions-lead">
              Source → Extract → Topic → Process → Review → Export · 素材源 · 提取 · 题材 · 加工 · 审阅 · 导出
            </p>
          </div>
          <button type="button" className="ee-functions-close" onClick={onClose} aria-label="Close menu">
            ✕
          </button>
        </div>

        <div className="ee-functions-grid">
          {categories.map((category) => (
            <section
              key={category.id}
              className="ee-functions-section"
              data-section-id={category.id}
              ref={(node) => {
                sectionRefs.current[category.id] = node;
              }}
              aria-labelledby={`ee-fn-sec-${category.id}`}
            >
              <header className="ee-functions-section-head">
                <h3 id={`ee-fn-sec-${category.id}`} className="ee-functions-section-title">
                  {category.navLabel}
                </h3>
              </header>
              <ul className="ee-functions-list">
                {category.items.map((item) => {
                  const isDisabled = item.tier === "disabled";
                  const isAdvanced = item.tier === "advanced";
                  return (
                    <li key={item.actionId}>
                      <button
                        type="button"
                        className={
                          "ee-functions-item" +
                          (isDisabled ? " ee-functions-item--disabled" : "") +
                          (isAdvanced ? " ee-functions-item--advanced" : "")
                        }
                        disabled={isDisabled}
                        onClick={() => onItemActivate(item)}
                      >
                        <span className="ee-functions-item-icon" aria-hidden>
                          {item.icon}
                        </span>
                        <span className="ee-functions-item-body">
                          <span className="ee-functions-item-title">{item.title}</span>
                          <span className="ee-functions-item-desc">{item.description}</span>
                          {isDisabled ? (
                            <span className="ee-functions-item-hint">Not available yet</span>
                          ) : isAdvanced ? (
                            <span className="ee-functions-item-hint">Available in Advanced Studio</span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
