import { useEffect, useMemo, useState } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'

function formatSol(value, digits = 4) {
  if (!Number.isFinite(value)) {
    return '0.0000'
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export default function DepositModal({ isOpen, onClose, connected, publicKey, accountBalance = 0 }) {
  const { connection } = useConnection()
  const [walletBalanceSol, setWalletBalanceSol] = useState(0)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [amount, setAmount] = useState('')
  const numericAmount = Number(amount)
  const safeAmount = Number.isFinite(numericAmount) && numericAmount > 0 ? numericAmount : 0
  const projectedAccountBalance = accountBalance + safeAmount
  const canDeposit = connected && safeAmount > 0 && safeAmount <= walletBalanceSol
  const amountError = safeAmount > walletBalanceSol ? 'Amount exceeds wallet balance' : ''

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setAmount('')
  }, [isOpen])

  useEffect(() => {
    let isCancelled = false

    async function fetchBalance() {
      if (!isOpen || !connected || !publicKey) {
        setWalletBalanceSol(0)
        return
      }

      try {
        setIsLoadingBalance(true)
        const lamports = await connection.getBalance(publicKey)
        if (!isCancelled) {
          setWalletBalanceSol(lamports / 1_000_000_000)
        }
      } catch (error) {
        if (!isCancelled) {
          setWalletBalanceSol(0)
        }
        console.error('Failed to fetch wallet balance', error)
      } finally {
        if (!isCancelled) {
          setIsLoadingBalance(false)
        }
      }
    }

    fetchBalance()

    return () => {
      isCancelled = true
    }
  }, [connection, connected, isOpen, publicKey])

  const walletBalanceLabel = useMemo(() => {
    if (!connected) {
      return '--'
    }

    if (isLoadingBalance) {
      return 'Loading...'
    }

    return formatSol(walletBalanceSol, 7)
  }, [connected, isLoadingBalance, walletBalanceSol])

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-[520px] border border-panel-border bg-background-dark p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Deposit</h2>
          <button
            className="h-8 w-8 border border-panel-border bg-neutral-dark/40 text-lg leading-none text-secondary-text hover:text-white"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          <div className="border border-panel-border bg-neutral-dark/20 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-secondary-text">Wallet Balance</p>
            <p className="mono mt-1 text-xl font-bold text-white">{walletBalanceLabel}</p>
          </div>
          <span className="pb-2 text-xl text-secondary-text">{'->'}</span>
          <div className="border border-panel-border bg-neutral-dark/20 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-secondary-text">Deriverse Account Balance</p>
            <p className="mono mt-1 text-xl font-bold text-white">{formatSol(projectedAccountBalance)}</p>
          </div>
        </div>

        <div className="mt-4 border border-panel-border bg-neutral-dark/10 p-3">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wide text-secondary-text" htmlFor="deposit-amount">
              Amount (SOL)
            </label>
            <div className="flex items-center gap-1">
              {[25, 50, 75].map((percent) => (
                <button
                  className="h-5 border border-panel-border px-1.5 text-[9px] font-bold text-secondary-text hover:text-white"
                  key={percent}
                  onClick={() => setAmount(((walletBalanceSol * percent) / 100).toFixed(4))}
                  type="button"
                >
                  {percent}%
                </button>
              ))}
            </div>
          </div>
          <input
            className="h-10 w-full border border-panel-border bg-background-dark px-3 text-sm font-bold text-white outline-none placeholder:text-secondary-text/70"
            id="deposit-amount"
            inputMode="decimal"
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.0000"
            value={amount}
          />
          {amountError && <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-danger">{amountError}</p>}
        </div>

        <div className="mt-4 space-y-2">
          <button
            className={`h-11 w-full border text-sm font-bold uppercase tracking-wide ${
              canDeposit
                ? 'border-primary bg-primary/20 text-white hover:bg-primary/30'
                : 'cursor-not-allowed border-panel-border bg-neutral-dark/40 text-secondary-text'
            }`}
            disabled={!canDeposit}
            title={!connected ? 'Connect wallet to deposit' : ''}
            type="button"
          >
            Deposit SOL
          </button>
          <button
            className="h-11 w-full border border-panel-border bg-background-dark text-sm font-bold uppercase tracking-wide text-secondary-text hover:text-white"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
