import DataTableFooter from './DataTableFooter'
import DataTableToolbar from './DataTableToolbar'
import OrdersTable from './OrdersTable'
import PositionsTable from './PositionsTable'
import TransfersTable from './TransfersTable'

export default function DataTable({
  tableView,
  onTableViewChange,
  chatgptPrefillUrl,
  claudePrefillUrl,
  activeRowsLength,
  onExportCsv,
  onExportPdf,
  paginatedRows,
  annotationMap,
  onEditNote,
  symbolFilter,
  onSymbolFilterChange,
  selectableSymbols,
  statusFilter,
  onStatusFilterChange,
  orderStatusFilter,
  onOrderStatusFilterChange,
  transferStatusFilter,
  onTransferStatusFilterChange,
  visibleStart,
  visibleEnd,
  activeRowsLabel,
  activeStatusFilter,
  activeScopedCount,
  dashboardPeriodLabel,
  pageSize,
  onPageSizeChange,
  currentPage,
  pageCount,
  onPageChange,
  paginationItems,
}) {
  return (
    <div className="flex-1 overflow-hidden p-0">
      <div className="flex h-full flex-col bg-background-dark">
        <DataTableToolbar
          activeRowsLength={activeRowsLength}
          chatgptPrefillUrl={chatgptPrefillUrl}
          claudePrefillUrl={claudePrefillUrl}
          onExportCsv={onExportCsv}
          onExportPdf={onExportPdf}
          onTableViewChange={onTableViewChange}
          tableView={tableView}
        />

        <div className="overflow-x-auto">
          {tableView === 'POSITIONS' ? (
            <PositionsTable
              annotationMap={annotationMap}
              onEditNote={onEditNote}
              onStatusFilterChange={onStatusFilterChange}
              onSymbolFilterChange={onSymbolFilterChange}
              rows={paginatedRows}
              selectableSymbols={selectableSymbols}
              statusFilter={statusFilter}
              symbolFilter={symbolFilter}
            />
          ) : tableView === 'ORDERS' ? (
            <OrdersTable
              onOrderStatusFilterChange={onOrderStatusFilterChange}
              onSymbolFilterChange={onSymbolFilterChange}
              orderStatusFilter={orderStatusFilter}
              rows={paginatedRows}
              selectableSymbols={selectableSymbols}
              symbolFilter={symbolFilter}
            />
          ) : (
            <TransfersTable
              onTransferStatusFilterChange={onTransferStatusFilterChange}
              rows={paginatedRows}
              transferStatusFilter={transferStatusFilter}
            />
          )}
        </div>

        <DataTableFooter
          activeRowsLabel={activeRowsLabel}
          activeRowsLength={activeRowsLength}
          activeScopedCount={activeScopedCount}
          activeStatusFilter={activeStatusFilter}
          currentPage={currentPage}
          dashboardPeriodLabel={dashboardPeriodLabel}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          pageCount={pageCount}
          pageSize={pageSize}
          paginationItems={paginationItems}
          visibleEnd={visibleEnd}
          visibleStart={visibleStart}
        />
      </div>
    </div>
  )
}
