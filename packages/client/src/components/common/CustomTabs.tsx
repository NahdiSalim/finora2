import type { ReactNode } from "react";
import { useState } from "react";

// ─── Types ─────────────────────────────────────────────────

interface Tab {
  id: string;
  label: string;
  count?: number;
  content?: ReactNode;
}

interface CustomTabsProps {
  tabs: Tab[];
  value?: string;
  onChange?: (id: string) => void;
  defaultTab?: string;
  className?: string;
}

// ─── Component ─────────────────────────────────────────────

export function CustomTabs({
  tabs = [],
  value,
  onChange,
  defaultTab,
  className = "",
}: CustomTabsProps) {
  const isControlled = value !== undefined;

  const [internalActive, setInternalActive] = useState<string>(
    defaultTab ?? tabs[0]?.id ?? "",
  );

  const active = isControlled ? value : internalActive;

  const handleClick = (id: string) => {
    if (!isControlled) setInternalActive(id);
    onChange?.(id);
  };

  return (
    <div className={`bt-root ${className}`}>
      {/* ── Tabs ── */}
      <div className="bt-strip" role="tablist">
        {tabs.map((tab, index) => {
          const isActive = tab.id === active;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`bt-panel-${tab.id}`}
              id={`bt-tab-${tab.id}`}
              className={`bt-tab ${isActive ? "bt-tab--active" : ""} ${
                index === 0 ? "bt-first" : ""
              }`}
              onClick={() => handleClick(tab.id)}
            >
              <span className="bt-tab-label">{tab.label}</span>

              {tab.count !== undefined && (
                <span className="bt-badge">{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Panels ── */}
      {tabs.some((t) => t.content !== undefined) && (
        <div className="bt-panels">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              role="tabpanel"
              id={`bt-panel-${tab.id}`}
              aria-labelledby={`bt-tab-${tab.id}`}
              hidden={tab.id !== active}
              className="bt-panel"
            >
              {tab.content}
            </div>
          ))}
        </div>
      )}

      {/* ── Styles ── */}
      <style>{`

      .bt-root{
        --tab-active:#ffffff;
        --tab-idle:#75A3F0;
        --tab-hover:#508AEB;

        font-family:'Poppins',system-ui;
      }

      /* container */

      .bt-strip{
        display:flex;
        align-items:flex-end;
      }

      /* tab */

      .bt-tab{
        position:relative;
        display:inline-flex;
        align-items:center;
        gap:8px;

        border: none;
        outline: none;

        height:45px;
        padding:0 30px;

        background:var(--tab-idle);
        color:#ffffff;

        font-size:14px;
        font-weight:500;

        border-top-left-radius:14px;
        border-top-right-radius:14px;

        margin-right:-6px;

        cursor:pointer;
        transition:background .18s ease;

        z-index:1;
      }

      .bt-tab:hover:not(.bt-tab--active){
        background:var(--tab-hover);
      }

      .bt-tab--active{
        color: #595959;
      }

      /* angled edges */

      .bt-tab::before,
      .bt-tab::after{
        content:"";
        position:absolute;
        bottom:0;
        width:22px;
        height:100%;
        background:inherit;
        z-index:-1;
      }

      .bt-tab::before{
        left:-10px;
        transform:skewX(-25deg);
        border-bottom-left-radius:6px;
        
      }

      .bt-tab::after{
        right:-10px;
        transform:skewX(25deg);
        border-bottom-right-radius:6px;
      }

      /* first tab fix */

      .bt-first::before{
        display:none;
      }

      /* active */

      .bt-tab--active{
        background:var(--tab-active);
        z-index:3;
        
      }

      /* badge */

      .bt-badge{
        display:inline-flex;
        align-items:center;
        justify-content:center;

        min-width:20px;
        height:20px;

        border-radius:999px;

        font-size:11px;
        font-weight:600;

        background:#D1D5DB;
        color:#6B7280;
      }

    

      /* panels */

      .bt-panels{
        background:white;
        border:1px solid #E5E7EB;
        border-radius:0 12px 12px 12px;
        margin-top:6px;
      }

      .bt-panel{
        padding:24px;
        animation:fade .2s ease;
      }

      @keyframes fade{
        from{opacity:0;transform:translateY(4px)}
        to{opacity:1;transform:translateY(0)}
      }

      `}</style>
    </div>
  );
}
