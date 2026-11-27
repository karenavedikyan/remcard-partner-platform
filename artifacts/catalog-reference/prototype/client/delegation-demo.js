/* Demo-only: many assignments per project → report → owner review (no network). Memory via RCDemoMem. */
(function () {
  const store = { byProject: {} };
  let idSeq = 0;

  function mem() {
    return window.RCDemoMem || null;
  }

  function uniqueId(prefix) {
    idSeq += 1;
    return `${prefix}-${Date.now()}-${idSeq}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function syncToMem(projectId, state) {
    store.byProject[projectId] = state;
    if (mem()?.setDemoDelegation) mem().setDemoDelegation(projectId, state);
  }

  function loadFromMem(projectId) {
    if (mem()?.getDemoDelegation) {
      const m = mem().getDemoDelegation(projectId);
      if (m) store.byProject[projectId] = m;
    }
    return store.byProject[projectId] || null;
  }

  function defaultState(projectId) {
    return {
      projectId,
      assignments: [],
      pendingReports: [],
      history: [],
      taskDemo: {},
      assignment: null,
      pendingReport: null,
    };
  }

  function migrateLegacyState(s) {
    if (!s || s._migratedV2) return s;
    if (s.assignment && (!s.assignments || !s.assignments.length)) {
      const a = { ...s.assignment, status: s.assignment.status || 'active' };
      s.assignments = [a];
    }
    if (s.pendingReport && (!s.pendingReports || !s.pendingReports.length)) {
      s.pendingReports = [s.pendingReport];
    }
    s.assignments = s.assignments || [];
    s.pendingReports = s.pendingReports || [];
    (s.assignments || []).forEach((a) => {
      if (!a?.id || !a.taskIds?.length) return;
      a.taskIds.forEach((id) => {
        const td = s.taskDemo[id];
        if (!td || td.assignmentId) return;
        if (td.phase === 'accepted') return;
        if (td.phase === 'assigned' || td.phase === 'review') {
          td.assignmentId = a.id;
          if (!td.executor && a.executor) td.executor = a.executor;
        }
      });
    });
    syncLegacyPointers(s);
    s._migratedV2 = true;
    return s;
  }

  function syncLegacyPointers(s) {
    if (!s) return;
    const active = activeAssignments(s);
    s.assignment = active.length ? active[active.length - 1] : null;
    s.pendingReport = pendingReportActive(s);
  }

  function ensureState(p) {
    if (!p) return null;
    let s = p._demoDelegation;
    if (!s || s.projectId !== p.id) {
      s = loadFromMem(p.id) || defaultState(p.id);
      p._demoDelegation = s;
    }
    migrateLegacyState(s);
    return s;
  }

  function persist(p) {
    const s = ensureState(p);
    if (!s) return;
    syncLegacyPointers(s);
    syncToMem(
      p.id,
      JSON.parse(
        JSON.stringify({
          ...s,
          assignments: s.assignments,
          pendingReports: s.pendingReports,
          history: s.history,
          taskDemo: s.taskDemo,
          assignment: s.assignment,
          pendingReport: s.pendingReport,
        })
      )
    );
  }

  function hydrate(p) {
    if (!p) return;
    const s = loadFromMem(p.id) || defaultState(p.id);
    migrateLegacyState(s);
    p._demoDelegation = s;
  }

  function activeAssignments(s) {
    return (s?.assignments || []).filter((a) => a.status === 'active');
  }

  function assignmentById(s, id) {
    return (s?.assignments || []).find((a) => a.id === id) || null;
  }

  function taskAssignment(s, taskId) {
    const td = s?.taskDemo?.[taskId];
    if (!td?.assignmentId) return null;
    const a = assignmentById(s, td.assignmentId);
    return a && a.status === 'active' ? a : null;
  }

  function scopeSignature(scope) {
    const kind =
      scope?.scopeKind ||
      (scope?.taskIds?.length && !scope?.l2Ids?.length && !scope?.l2Id ? 'points' : scope?.l2Id || scope?.l2Ids?.length
        ? 'l2'
        : scope?.l1Id || scope?.l1Ids?.length
          ? 'l1'
          : 'project');
    const l1 = ((scope?.l1Ids && scope.l1Ids.length ? scope.l1Ids : scope?.l1Id ? [scope.l1Id] : []) || [])
      .slice()
      .sort()
      .join(',');
    const l2 = ((scope?.l2Ids && scope.l2Ids.length ? scope.l2Ids : scope?.l2Id ? [scope.l2Id] : []) || [])
      .slice()
      .sort()
      .join(',');
    if (kind !== 'points') return `${kind}|${l1}|${l2}|`;
    const tasks = (scope?.taskIds || []).slice().sort().join(',');
    return `${kind}|${l1}|${l2}|${tasks}`;
  }

  function contextOk(p, openCtx) {
    if (!p || p.shared) return false;
    const s = ensureState(p);
    if (!s || s.projectId !== p.id) return false;
    if (!openCtx || openCtx.projectId !== p.id) return false;
    return true;
  }

  function projectGuardOk(p, projectId) {
    return !!(p && !p.shared && p.id === projectId);
  }

  function scopeAllowed(openCtx, rawIds) {
    const allow = new Set((openCtx?.taskIds || []).map(String));
    const seen = new Set();
    const out = [];
    (rawIds || []).forEach((id) => {
      const k = String(id);
      if (!allow.has(k) || seen.has(k)) return;
      seen.add(k);
      out.push(k);
    });
    return out;
  }

  function normalizeTaskIds(p, openCtx, rawIds) {
    if (!contextOk(p, openCtx)) return [];
    return scopeAllowed(openCtx, rawIds).filter((id) => !p.completedTasks.has(id));
  }

  function pendingReportActive(s) {
    return (s?.pendingReports || []).find((rep) => rep.status === 'pending') || null;
  }

  function pendingReportForAssignment(s, assignmentId) {
    return (s?.pendingReports || []).find((rep) => rep.status === 'pending' && rep.assignmentId === assignmentId) || null;
  }

  function anyPendingForTasks(s, taskIds) {
    const set = new Set((taskIds || []).map(String));
    return (s?.pendingReports || []).some(
      (rep) => rep.status === 'pending' && rep.taskIds.some((id) => set.has(String(id)))
    );
  }

  function assignmentOpenRework(p, asn) {
    if (!p || !asn?.taskIds?.length) return false;
    const s = ensureState(p);
    return asn.taskIds.some((id) => {
      if (p.completedTasks.has(id)) return false;
      const td = s.taskDemo[id];
      return td?.phase === 'assigned' && !!td.returnNote;
    });
  }

  function lastReturnNote(s, assignmentId) {
    if (!s?.history?.length || !assignmentId) return '';
    for (let i = s.history.length - 1; i >= 0; i--) {
      const h = s.history[i];
      if (h.assignmentId === assignmentId && h.status === 'returned' && h.returnNote) return h.returnNote;
    }
    const td = Object.values(s.taskDemo || {}).find((x) => x.assignmentId === assignmentId && x.returnNote);
    return td?.returnNote || '';
  }

  function setAssignedPhase(s, id, executor, assignmentId, extra) {
    const prev = s.taskDemo[id];
    if (prev?.phase === 'accepted') return;
    s.taskDemo[id] = { phase: 'assigned', executor, assignmentId, ...extra };
  }

  function assignmentFullyResolved(p, s, asn) {
    if (!asn || !asn.taskIds?.length) return true;
    return asn.taskIds.every((id) => p.completedTasks.has(id));
  }

  function findAssignmentBySig(s, sig) {
    return activeAssignments(s).find((a) => a.sig === sig) || null;
  }

  function assignmentForContext(s, openCtx) {
    const sig = scopeSignature(openCtx);
    const bySig = findAssignmentBySig(s, sig);
    if (bySig) return bySig;
    const ctxSet = new Set((openCtx.taskIds || []).map(String));
    const matches = activeAssignments(s).filter((a) => a.taskIds.some((id) => ctxSet.has(String(id))));
    if (openCtx.assignmentId) return assignmentById(s, openCtx.assignmentId);
    if (matches.length === 1) return matches[0];
    return null;
  }

  function pendingReportById(s, reportId) {
    return (s?.pendingReports || []).find((r) => r.id === reportId && r.status === 'pending') || null;
  }

  function openCtxFromAssignment(p, asn) {
    if (!asn) return null;
    return {
      projectId: p.id,
      assignmentId: asn.id,
      scopeKind: asn.scopeKind || null,
      l1Id: asn.l1Id || null,
      l2Id: asn.l2Id || null,
      l1Ids: (asn.l1Ids || []).slice(),
      l2Ids: (asn.l2Ids || []).slice(),
      taskIds: (asn.taskIds || []).slice(),
      scopeTitle: asn.scopeTitle || '',
    };
  }

  function eligibleTaskIds(p, openCtx, rawIds) {
    const s = ensureState(p);
    const ids = normalizeTaskIds(p, openCtx, rawIds);
    const out = [];
    const skipped = { busy: 0, pending: 0 };
    ids.forEach((id) => {
      const td = s.taskDemo[id];
      if (td?.phase === 'review') {
        skipped.pending += 1;
        return;
      }
      if (taskAssignment(s, id)) {
        skipped.busy += 1;
        return;
      }
      if (anyPendingForTasks(s, [id])) {
        skipped.pending += 1;
        return;
      }
      out.push(id);
    });
    return { ids: out, skipped };
  }

  function startAssignment(p, openCtx, executor, taskIds) {
    if (!contextOk(p, openCtx)) return { ok: false, reason: 'readonly' };
    const exec = String(executor || '').trim().slice(0, 80);
    if (!exec) return { ok: false, reason: 'name' };
    const s = ensureState(p);
    const pool = taskIds.length ? taskIds : openCtx.taskIds;
    const { ids, skipped } = eligibleTaskIds(p, openCtx, pool);
    const sigLookup = scopeSignature({ ...openCtx, taskIds: pool });
    const asnExisting = findAssignmentBySig(s, sigLookup);
    if (!ids.length) {
      if (asnExisting) {
        const pend = pendingReportForAssignment(s, asnExisting.id);
        if (pend) return { ok: false, reason: 'pending_report', reportId: pend.id, report: pend };
        if (asnExisting.executor === exec) {
          return { ok: true, count: 0, idempotent: true, assignmentId: asnExisting.id };
        }
        return { ok: false, reason: 'exists', assignmentId: asnExisting.id };
      }
      if (skipped.busy) return { ok: false, reason: 'overlap', excluded: skipped.busy };
      if (skipped.pending) return { ok: false, reason: 'pending_report' };
      return { ok: false, reason: 'tasks' };
    }
    if (asnExisting) {
      const pend = pendingReportForAssignment(s, asnExisting.id);
      if (pend) return { ok: false, reason: 'pending_report', reportId: pend.id, report: pend };
      const req = [...new Set(ids.map(String))].sort().join(',');
      const cur = [...new Set((asnExisting.taskIds || []).map(String))].sort().join(',');
      const sameExec = asnExisting.executor === exec;
      if (sameExec && req === cur) {
        return { ok: true, count: 0, idempotent: true, assignmentId: asnExisting.id };
      }
      return { ok: false, reason: 'exists', assignmentId: asnExisting.id };
    }
    for (const id of ids) {
      const busy = taskAssignment(s, id);
      if (busy) return { ok: false, reason: 'overlap', excluded: 1 };
      if (anyPendingForTasks(s, [id]))
        return { ok: false, reason: 'pending_report', report: pendingReportActive(s) };
    }
    const sig = scopeSignature({ ...openCtx, taskIds: ids });
    const asn = {
      id: uniqueId('asg'),
      sig,
      scopeKind: openCtx.scopeKind || null,
      l1Id: openCtx.l1Id || openCtx.l1Ids?.[0] || null,
      l2Id: openCtx.l2Id || openCtx.l2Ids?.[0] || null,
      l1Ids: (openCtx.l1Ids || (openCtx.l1Id ? [openCtx.l1Id] : [])).slice(),
      l2Ids: (openCtx.l2Ids || (openCtx.l2Id ? [openCtx.l2Id] : [])).slice(),
      scopeTitle: openCtx.scopeTitle || '',
      taskIds: ids.slice(),
      executor: exec,
      startedAt: Date.now(),
      status: 'active',
    };
    s.assignments.push(asn);
    ids.forEach((id) => setAssignedPhase(s, id, exec, asn.id));
    persist(p);
    return { ok: true, count: ids.length, assignmentId: asn.id };
  }

  function simulateReport(p, openCtx, payload) {
    if (!contextOk(p, openCtx)) return { ok: false, reason: 'readonly' };
    const s = ensureState(p);
    let asn = null;
    if (openCtx?.assignmentId) asn = assignmentById(s, openCtx.assignmentId);
    if (!asn) asn = assignmentForContext(s, openCtx);
    if (!asn) return { ok: false, reason: openCtx?.assignmentId ? 'stale' : 'ambiguous' };
    const pending = pendingReportForAssignment(s, asn.id);
    const picked = normalizeTaskIds(
      p,
      openCtx,
      scopeAllowed(openCtx, payload.taskIds || []).filter((id) => asn.taskIds.includes(id))
    );
    if (!picked.length) return { ok: false, reason: 'pick' };
    const comment = String(payload.comment || '').trim().slice(0, 500);
    if (pending) {
      const sameTasks =
        pending.taskIds.length === picked.length && pending.taskIds.every((id) => picked.includes(id));
      const sameComment = (pending.comment || '') === comment;
      if (sameTasks && sameComment) return { ok: true, report: pending, idempotent: true };
      return { ok: false, reason: 'pending_report', reportId: pending.id, report: pending };
    }
    const report = {
      id: uniqueId('rpt'),
      assignmentId: asn.id,
      taskIds: picked.slice(),
      comment,
      at: Date.now(),
      status: 'pending',
      executor: asn.executor,
    };
    s.pendingReports.push(report);
    syncLegacyPointers(s);
    picked.forEach((id) => {
      if (p.completedTasks.has(id)) return;
      s.taskDemo[id] = { phase: 'review', executor: asn.executor, assignmentId: asn.id };
    });
    persist(p);
    return { ok: true, report };
  }

  function resolvePendingReport(s, rep, status, extra) {
    const i = (s.pendingReports || []).findIndex((r) => r.id === rep.id);
    if (i < 0) return;
    s.pendingReports[i] = { ...rep, status, ...extra };
    if (status !== 'pending') {
      s.history.push({ ...s.pendingReports[i] });
    }
    s.pendingReports = s.pendingReports.filter((r) => r.status === 'pending');
    syncLegacyPointers(s);
  }

  function acceptReport(p, reportId, guards = {}) {
    if (!projectGuardOk(p, guards.projectId || p?.id)) return { ok: false, reason: 'project' };
    const s = ensureState(p);
    if (guards.projectId && s.projectId !== guards.projectId) return { ok: false, reason: 'project' };
    const rep = (s.pendingReports || []).find((r) => r.id === reportId && r.status === 'pending');
    if (!rep) return { ok: false, reason: 'stale' };
    if (guards.assignmentId && rep.assignmentId !== guards.assignmentId) return { ok: false, reason: 'scope' };
    const asn = assignmentById(s, rep.assignmentId);
    if (!asn) return { ok: false, reason: 'scope' };
    let newlyAccepted = 0;
    rep.taskIds.forEach((id) => {
      const ownerAlready = p.completedTasks.has(id);
      if (ownerAlready) {
        const td = s.taskDemo[id];
        if (td && td.phase !== 'accepted') delete s.taskDemo[id];
        return;
      }
      p.completedTasks.add(id);
      newlyAccepted += 1;
      s.taskDemo[id] = {
        phase: 'accepted',
        executor: rep.executor,
        assignmentId: rep.assignmentId,
        acceptedAt: Date.now(),
      };
    });
    resolvePendingReport(s, rep, 'accepted', { resolvedAt: Date.now(), newlyAccepted });
    if (assignmentFullyResolved(p, s, asn)) asn.status = 'done';
    persist(p);
    return { ok: true, count: newlyAccepted, reported: rep.taskIds.length };
  }

  function returnReport(p, reportId, note, guards = {}) {
    if (!projectGuardOk(p, guards.projectId || p?.id)) return { ok: false, reason: 'project' };
    const n = String(note || '').trim().slice(0, 500);
    if (!n) return { ok: false, reason: 'note' };
    const s = ensureState(p);
    if (guards.projectId && s.projectId !== guards.projectId) return { ok: false, reason: 'project' };
    const rep = (s.pendingReports || []).find((r) => r.id === reportId && r.status === 'pending');
    if (!rep) return { ok: false, reason: 'stale' };
    if (guards.assignmentId && rep.assignmentId !== guards.assignmentId) return { ok: false, reason: 'scope' };
    rep.status = 'returned';
    rep.returnNote = n;
    rep.resolvedAt = Date.now();
    rep.taskIds.forEach((id) => {
      if (p.completedTasks.has(id)) return;
      s.taskDemo[id] = {
        phase: 'assigned',
        executor: rep.executor,
        assignmentId: rep.assignmentId,
        returnedAt: rep.resolvedAt,
        returnNote: n,
      };
    });
    resolvePendingReport(s, rep, 'returned', { returnNote: n, resolvedAt: rep.resolvedAt });
    persist(p);
    return { ok: true };
  }

  function withdrawAssignment(p, assignmentId, openCtx) {
    if (!p || p.shared) return { ok: false, reason: 'readonly' };
    if (!projectGuardOk(p, p.id)) return { ok: false, reason: 'project' };
    if (openCtx?.projectId && openCtx.projectId !== p.id) return { ok: false, reason: 'project' };
    const s = ensureState(p);
    if (s.projectId !== p.id) return { ok: false, reason: 'project' };
    const asn = assignmentById(s, assignmentId);
    if (!asn || asn.status !== 'active') return { ok: false, reason: 'stale' };
    const pend = pendingReportForAssignment(s, asn.id);
    if (pend) return { ok: false, reason: 'pending_report', reportId: pend.id };
    asn.status = 'withdrawn';
    asn.withdrawnAt = Date.now();
    asn.taskIds.forEach((id) => {
      if (p.completedTasks.has(id)) return;
      const td = s.taskDemo[id];
      if (td?.assignmentId === asn.id && td.phase !== 'accepted') delete s.taskDemo[id];
    });
    persist(p);
    return { ok: true, released: asn.taskIds.filter((id) => !p.completedTasks.has(id)).length };
  }

  function taskPhase(p, taskId) {
    const s = ensureState(p);
    if (!s) return null;
    return s.taskDemo[taskId]?.phase || null;
  }

  function ownerMayToggleTask(p, taskId) {
    if (!p || p.shared) return false;
    const ph = taskPhase(p, taskId);
    return ph !== 'assigned' && ph !== 'review';
  }

  function taskAttributionLine(p, taskId) {
    if (!p || p.shared) return '';
    const s = ensureState(p);
    if (!s) return '';
    const td = s.taskDemo[taskId];
    if (!td) return '';
    if (p.completedTasks.has(taskId) && td.phase !== 'accepted') return '';
    if (p.completedTasks.has(taskId) && td.phase === 'accepted')
      return `<span class="task__deleg demo-deleg demo-deleg--accepted" data-testid="demo-attrib-${escAttr(taskId)}">Выполнил ${esc(td.executor)} · принято вами</span>`;
    if (td.phase === 'review')
      return `<span class="task__deleg demo-deleg demo-deleg--review" data-testid="demo-attrib-${escAttr(taskId)}">${esc(td.executor)} · На проверке</span>`;
    if (td.phase === 'assigned' && td.returnNote) {
      const note = td.returnNote.length > 72 ? `${td.returnNote.slice(0, 69)}…` : td.returnNote;
      return `<span class="task__deleg demo-deleg demo-deleg--rework" data-testid="demo-attrib-${escAttr(taskId)}">${esc(td.executor)} · На доработке: ${esc(note)}</span>`;
    }
    if (td.phase === 'assigned')
      return `<span class="task__deleg demo-deleg demo-deleg--assigned" data-testid="demo-attrib-${escAttr(taskId)}">Поручено: ${esc(td.executor)}</span>`;
    return '';
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function escAttr(s) {
    return esc(s).replace(/'/g, '&#39;');
  }

  function pluralRu(n, one, few, many) {
    const a = Math.abs(n) % 100;
    const b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }

  function reportsIntersecting(openCtx, s) {
    const allow = new Set((openCtx?.taskIds || []).map(String));
    return (s?.pendingReports || []).filter(
      (rep) => rep.status === 'pending' && rep.taskIds.some((id) => allow.has(String(id)))
    );
  }

  function assignmentsIntersecting(openCtx, s) {
    const allow = new Set((openCtx?.taskIds || []).map(String));
    return activeAssignments(s).filter((a) => a.taskIds.some((id) => allow.has(String(id))));
  }

  function scopedDelegationBanner(p, openCtx) {
    if (!p || p.shared || !openCtx) return '';
    const s = ensureState(p);
    const reps = reportsIntersecting(openCtx, s);
    if (reps.length === 1) {
      const rep = reps[0];
      const n = rep.taskIds.length;
      return `<div class="demo-deleg-banner card card--soft" data-testid="demo-deleg-banner" style="margin:.65rem 0;padding:.65rem .75rem">
        <p class="small" style="margin:0">${esc(rep.executor)} — ${n} ${pluralRu(n, 'задача', 'задачи', 'задач')} на проверке</p>
        <button type="button" class="btn btn--primary btn--sm btn--block" data-n="demo-report-review" data-a="${escAttr(rep.id)}" style="min-height:2.75rem;margin-top:.5rem">Проверить результат</button></div>`;
    }
    if (reps.length > 1) {
      return `<div class="demo-deleg-banner card card--soft" data-testid="demo-deleg-banner" style="margin:.65rem 0;padding:.65rem .75rem">
        <p class="small" style="margin:0">${reps.length} отчёта на проверке в этом объёме</p>
        <button type="button" class="btn btn--ghost btn--sm btn--block" data-n="demo-deleg-list" data-a="reports" style="min-height:2.75rem;margin-top:.5rem">Открыть список</button></div>`;
    }
    const asns = assignmentsIntersecting(openCtx, s);
    if (!asns.length) return '';
    if (asns.length === 1) {
      const a = asns[0];
      const left = a.taskIds.filter((id) => !p.completedTasks.has(id)).length;
      return `<div class="demo-deleg-banner card card--soft" data-testid="demo-deleg-banner" style="margin:.65rem 0;padding:.65rem .75rem">
        <p class="small" style="margin:0"><b>Поручено:</b> ${esc(a.executor)} · ${esc(a.scopeTitle || 'поручение')} · ${left} ${pluralRu(left, 'задача', 'задачи', 'задач')}</p>
        <button type="button" class="btn btn--ghost btn--sm btn--block" data-n="demo-assign-detail" data-a="${escAttr(a.id)}" style="min-height:2.75rem;margin-top:.5rem">Подробнее о поручении</button></div>`;
    }
    return `<div class="demo-deleg-banner card card--soft" data-testid="demo-deleg-banner" style="margin:.65rem 0;padding:.65rem .75rem">
      <p class="small" style="margin:0">${asns.length} активных поручений в этом объёме</p>
      <button type="button" class="btn btn--ghost btn--sm btn--block" data-n="demo-deleg-list" data-a="assignments" style="min-height:2.75rem;margin-top:.5rem">Список поручений</button></div>`;
  }

  function notificationHtml(p, openCtx) {
    return '';
  }

  function scopeWorkSummary(p, openCtx) {
    return scopedDelegationBanner(p, openCtx);
  }

  function countOwnEligibleBulk(p, l1, l1AllTasksFn) {
    const s = ensureState(p);
    const tasks = l1AllTasksFn ? l1AllTasksFn(p, l1) : [];
    let own = 0;
    let delegated = 0;
    tasks.forEach((t) => {
      if (p.completedTasks.has(t.id)) return;
      const ph = s.taskDemo[t.id]?.phase;
      if (ph === 'assigned' || ph === 'review') delegated += 1;
      else own += 1;
    });
    return { own, delegated, total: tasks.length };
  }

  window.RCNavDelegationDemo = {
    ensureState,
    persist,
    hydrate,
    contextOk,
    projectGuardOk,
    normalizeTaskIds,
    scopeAllowed,
    pendingReportActive,
    pendingReportById,
    pendingReportForAssignment,
    openCtxFromAssignment,
    scopedDelegationBanner,
    assignmentsIntersecting,
    lastReturnNote,
    assignmentOpenRework,
    assignmentFullyResolved,
    activeAssignments,
    assignmentForContext,
    assignmentById,
    startAssignment,
    simulateReport,
    acceptReport,
    returnReport,
    withdrawAssignment,
    taskAttributionLine,
    taskPhase,
    ownerMayToggleTask,
    notificationHtml,
    scopeWorkSummary,
    eligibleTaskIds,
    countOwnEligibleBulk,
    scopeSignature,
    defaultState,
    migrateLegacyState,
    _store: store,
  };
})();
