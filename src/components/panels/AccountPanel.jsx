export default function AccountPanel({
  accountScope,
  onAccountScopeChange,
  accountMatrixItems,
  performanceMatrixItems,
  scopeMatrixItems,
}) {
  return (
    <div className="col-span-4 h-full min-h-0 overflow-hidden bg-background-dark">
      <div className="flex h-full flex-col">
        <div className="border-b border-panel-border px-3 py-2">
          <div className="overflow-hidden border border-panel-border">
            <div className="flex gap-px ">
              {['ALL', 'SPOT', 'PERPS'].map((scope) => (
                <button
                  className={`h-7 px-2.5 text-[10px] font-bold uppercase ${
                    accountScope === scope ? 'bg-primary text-background-dark' : 'bg-background-dark text-secondary-text hover:text-white'
                  }`}
                  key={scope}
                  onClick={() => onAccountScopeChange(scope)}
                  type="button"
                >
                  {scope}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="thin-scrollbar flex-1 overflow-y-auto p-3">
          <section className="border border-panel-border bg-neutral-dark/20">
            <div className="space-y-2 p-2">
              <div>
                <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-secondary-text">Account</p>
                <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
                  {accountMatrixItems.map((item) => (
                    <div key={item.label}>
                      <p className="text-[9px] uppercase text-secondary-text">{item.label}</p>
                      <p className={`mono text-sm font-bold leading-none ${item.valueClass}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-panel-border/70 pt-2">
                <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-secondary-text">Performance</p>
                <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
                  {performanceMatrixItems.map((item) => (
                    <div key={item.label}>
                      <p className="text-[9px] uppercase text-secondary-text">{item.label}</p>
                      <p className={`mono text-sm font-bold leading-none ${item.valueClass}`}>
                        {item.value}
                        {item.delta && <span className="text-[9px] text-secondary-text"> · {item.delta}</span>}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-panel-border/70 pt-2">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-secondary-text">Scope</p>
                  <p className="text-[9px] uppercase text-secondary-text">{accountScope}</p>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {scopeMatrixItems.map((item) => (
                    <div key={item.label}>
                      <p className="text-[9px] uppercase text-secondary-text">{item.label}</p>
                      <p className={`mono text-sm font-bold leading-none ${item.valueClass}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
