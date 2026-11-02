export async function fetchAgentReceivablesOverview() {
  return {
    confirmedTotalKopecks: 250000,
    pendingTotalKopecks: 10000,
    suspendedTotalKopecks: 0,
    openCount: 2,
    pendingCount: 1,
    coverage: { needsReviewCount: 0 },
  };
}

export async function fetchAgentReceivablePartners() {
  return { partners: [], meta: { page: 1, pageSize: 25, pageCount: 1, totalRecords: 0, selectionTotalKopecks: 0 } };
}

export async function fetchAgentReceivableOrders() {
  return { orders: [], meta: { page: 1, pageSize: 25, pageCount: 1, totalRecords: 0, selectionTotalKopecks: 0 } };
}

export async function fetchAgentReceivableOrderDetail() {
  throw new Error("not used in overview capture");
}

export async function downloadAgentReceivablesExport() {}
