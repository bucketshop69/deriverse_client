function DeriverseLogo({ className = '' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path
        clipRule="evenodd"
        d="M47.2426 24L24 47.2426L0.757355 24L24 0.757355L47.2426 24ZM12.2426 21H35.7574L24 9.24264L12.2426 21Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  )
}

export default function AppHeader({
  connected,
  connecting,
  walletAddressLabel,
  onDeposit,
  onWalletConnect,
  onWalletDisconnect,
}) {
  return (
    <header className="sticky top-0 z-50 flex h-12 items-center justify-between border-b border-panel-border bg-background-dark px-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <DeriverseLogo className="size-5 text-primary" />
          <h1 className="text-base font-bold tracking-tight">DERIVERSE</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className={`h-8 border px-3 text-[10px] font-bold uppercase tracking-wide ${
            connected
              ? 'border-panel-border bg-neutral-dark/50 text-white hover:border-secondary-text'
              : 'cursor-not-allowed border-panel-border/60 bg-neutral-dark/20 text-secondary-text/70'
          }`}
          disabled={!connected}
          onClick={onDeposit}
          title={!connected ? 'Connect wallet to deposit' : 'Deposit funds'}
          type="button"
        >
          Deposit
        </button>
        <button
          className={`h-8 border px-3 text-[10px] font-bold uppercase tracking-wide ${
            connected
              ? 'border-success/40 bg-success/10 text-success hover:border-success'
              : 'border-panel-border bg-neutral-dark/50 text-white hover:border-secondary-text'
          }`}
          onClick={onWalletConnect}
          type="button"
        >
          {connecting ? 'Connecting...' : connected ? walletAddressLabel : 'Connect Wallet'}
        </button>
        {connected && (
          <button
            className="h-8 border border-panel-border bg-background-dark px-2 text-[10px] font-bold uppercase tracking-wide text-secondary-text hover:text-white"
            onClick={onWalletDisconnect}
            type="button"
          >
            Disconnect
          </button>
        )}
      </div>
    </header>
  )
}
