(() => {
  'use strict';
  const KEY = 'silverShift.v1';
  const GROUPS = [{ key: 'upper', label: '上', start: 0 }, { key: 'lower', label: '下', start: 3 }];
  const PREV = 3, DAYS = 28, dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const localToday = () => { const d = new Date(), pad = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const blankDays = () => Array(DAYS).fill(false);
  const defaultState = () => ({ startDate: localToday(), employees: Array.from({ length: 6 }, (_, i) => ({ name: `職員${i + 1}`, target: [10, 9, 9, 10, 9, 9][i], prev: ['', '', ''], requested: Array(DAYS).fill(false), work: Array(DAYS).fill('') })), noAssign: { upper: blankDays(), lower: blankDays() }, lastResult: '' });
  let state = load();
  function load() { try { const v = JSON.parse(localStorage.getItem(KEY)); if (v && v.employees?.length === 6) { v.employees.forEach(e => { if (!Array.isArray(e.requested)) e.requested = Array(DAYS).fill(false); if (!Array.isArray(e.work)) e.work = Array(DAYS).fill(''); }); if (!v.noAssign || typeof v.noAssign !== 'object') v.noAssign = {}; GROUPS.forEach(g => { v.noAssign[g.key] = Array.from({ length: DAYS }, (_, i) => Boolean(v.noAssign[g.key]?.[i])); }); return v; } return defaultState(); } catch { return defaultState(); } }
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); document.getElementById('saveStatus').textContent = `保存済み ${new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`; }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dateAt = offset => { const d = new Date(`${state.startDate || '2026-01-01'}T00:00:00`); d.setDate(d.getDate() + offset); return d; };
  const dateLabel = day => { const d = dateAt(day); return `${d.getMonth() + 1}/${d.getDate()}`; };

  function renderRoster() { document.getElementById('roster').innerHTML = state.employees.map((e, i) => `<div class="roster-card"><div class="group-label">${i < 3 ? '上' : '下'}グループ</div><h3>職員 ${i + 1}</h3><label>名前</label><input data-field="name" data-i="${i}" type="text" value="${esc(e.name)}"><label>目標出勤日数</label><input data-field="target" data-i="${i}" type="number" min="0" max="28" value="${e.target}"></div>`).join(''); }
  function renderTable() {
    const head = ['<th class="staff">職員 / 目標・現在</th>'];
    for (let j = -PREV; j < DAYS; j++) { const d = dateAt(j), cls = [j < 0 ? 'prev' : '', j === 0 ? 'boundary' : '', j >= 0 && j % 7 === 0 ? 'week' : ''].join(' '); head.push(`<th class="${cls}"><span class="date-label">${d.getMonth() + 1}/${d.getDate()}</span><span class="day-label">${dayNames[d.getDay()]}${j < 0 ? ' 前回' : ' '}</span></th>`); }
    document.querySelector('#schedule thead').innerHTML = `<tr>${head.join('')}</tr>`;
    const noAssignRows = GROUPS.map(g => { let cells = `<td class="staff">${g.label} 配置不要</td>`; for (let j = -PREV; j < DAYS; j++) { const cls = [j < 0 ? 'prev' : '', j === 0 ? 'boundary' : '', j >= 0 && j % 7 === 0 ? 'week' : ''].join(' '); cells += j < 0 ? `<td class="${cls}"></td>` : `<td class="${cls}"><input type="checkbox" data-noassign-group="${g.key}" data-day="${j}" ${state.noAssign[g.key][j] ? 'checked' : ''} aria-label="${g.label} ${j + 1}日目 配置不要"></td>`; } return `<tr class="no-assign-row">${cells}</tr>`; }).join('');
    const employeeRows = state.employees.map((e, i) => { let cells = `<td class="staff"><span class="staff-name">${esc(e.name)}</span><small>目標 ${e.target} / 現在 ${e.work.filter(x => x === 'o').length}</small></td>`; for (let j = -PREV; j < DAYS; j++) { const val = j < 0 ? e.prev[j + PREV] : e.work[j], cls = [j < 0 ? 'prev' : '', j === 0 ? 'boundary' : '', j >= 0 && j % 7 === 0 ? 'week' : '', i === 2 ? 'upper-end' : ''].join(' '); cells += `<td class="cell ${cls}" data-i="${i}" data-j="${j}" data-value="${val}">${val === 'o' ? '○' : val === 'x' ? '×' : ''}</td>`; } return `<tr>${cells}</tr>`; }).join('');
    document.querySelector('#schedule tbody').innerHTML = noAssignRows + employeeRows;
  }
  function requiredDays(key) { return DAYS - state.noAssign[key].filter(Boolean).length; }
  function updateTotals() { const values = GROUPS.map(g => ({ g, total: state.employees.slice(g.start, g.start + 3).reduce((a, e) => a + Number(e.target || 0), 0), required: requiredDays(g.key) })); values.forEach(({ g, total, required }) => { document.getElementById(`${g.key}Total`).textContent = total; document.getElementById(`${g.key}Required`).textContent = required; }); document.getElementById('totalWarning').textContent = values.filter(v => v.total !== v.required).map(v => `${v.g.label}目標合計 ${v.total} / 必要 ${v.required}`).join('、'); }
  function render() { document.getElementById('startDate').value = state.startDate; renderRoster(); renderTable(); updateTotals(); check(false); save(); }
  function setCell(i, j, val) { const e = state.employees[i], arr = j < 0 ? e.prev : e.work, k = j < 0 ? j + PREV : j; arr[k] = val; if (j >= 0) { if (val === 'x') e.requested[k] = true; if (val === '') e.requested[k] = false; } if (val === 'o') { const group = i < 3 ? [0, 1, 2] : [3, 4, 5]; group.forEach(x => { if (x !== i) { const other = j < 0 ? state.employees[x].prev : state.employees[x].work; if (other[k] === 'o') other[k] = ''; } }); } render(); check(true); }

  function violations() { const errors = [], warnings = []; for (const g of GROUPS) { for (let d = 0; d < DAYS; d++) { const os = state.employees.slice(g.start, g.start + 3).filter(e => e.work[d] === 'o').length; if (state.noAssign[g.key][d]) { if (os > 1) errors.push(`${g.label} ${d + 1}日目: 配置不要日なのに○が${os}人`); else if (os === 1) warnings.push(`${dateLabel(d)} ${g.label}グループは配置不要日に指定されていますが、○があります。`); } else if (os !== 1) errors.push(`${g.label} ${d + 1}日目: ○が${os}人`); } for (let i = g.start; i < g.start + 3; i++) { const e = state.employees[i], seq = [...e.prev, ...e.work]; for (let k = 0; k < seq.length; k++) { if (seq[k] === 'o' && seq[k - 1] === 'o' && seq[k - 2] === 'o') { errors.push(`${e.name}: 3連勤（${k < PREV + 2 ? '前回境界を含む' : '今回期間内'}）`); break; } } const actual = e.work.filter(x => x === 'o').length; if (actual !== Number(e.target || 0)) warnings.push(`${e.name}: 目標との差 ${actual - Number(e.target || 0)}`); } } return { errors, warnings }; }
  function check(show = true) { const errors = [], warnings = []; state.employees.forEach(e => e.work.forEach((v, d) => { if (e.requested[d] && v === 'o') errors.push(`${e.name}: 希望休を○に変更`); })); const v = violations(); errors.push(...v.errors); warnings.push(...v.warnings); const box = document.getElementById('messages'); if (!show && box.children.length) return; box.innerHTML = ''; if (errors.length) box.innerHTML += `<div class="message error"><strong>要確認</strong><ul>${errors.slice(0, 8).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`; if (warnings.length) box.innerHTML += `<div class="message warning"><strong>警告</strong><ul>${warnings.slice(0, 8).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`; if (show && !errors.length && !warnings.length) box.innerHTML = '<div class="message success">チェック完了: 重大な問題はありません。</div>'; }
  function canWork(e, day, limit) { const seq = [...e.prev, ...e.work]; let run = 0; for (let k = day + PREV - 1; k >= 0 && seq[k] === 'o'; k--) run++; return run < limit; }
  function solveGroup(start, limit) {
    const group = GROUPS.find(g => g.start === start), people = state.employees.slice(start, start + 3), fixed = people.map(e => e.work.map(v => v === 'o')), counts = [0, 0, 0], available = people.map(e => e.work.map((v, d) => !state.noAssign[group.key][d] && v !== 'x' && !e.requested[d])), suffix = people.map(() => Array(DAYS + 1).fill(0)), memo = new Map();
    for (let d = 0; d < DAYS; d++) { if (state.noAssign[group.key][d]) continue; const fixedOn = people.map((e, i) => e.work[d] === 'o' ? i : -1).filter(x => x >= 0); if (fixedOn.length > 1 || !available.some(row => row[d])) return null; }
    for (let i = 0; i < 3; i++) { for (let d = DAYS - 1; d >= 0; d--) suffix[i][d] = suffix[i][d + 1] + (available[i][d] ? 1 : 0); if (suffix[i][0] < Number(people[i].target)) return null; }
    const chosen = Array(DAYS).fill(-1);
    function dfs(d) {
      if (d === DAYS) return counts.every((c, i) => c === Number(people[i].target));
      if (state.noAssign[group.key][d]) { chosen[d] = -1; return dfs(d + 1); }
      const key = `${d}|${counts.join(',')}|${chosen[d - 1] ?? -1}|${d ? chosen[d - 1] === chosen[d - 2] ? 2 : 1 : 0}`;
      if (memo.has(key)) return memo.get(key);
      for (let i = 0; i < 3; i++) if (Number(people[i].target) - counts[i] > suffix[i][d]) { memo.set(key, false); return false; }
      const fixedOn = people.map((e, i) => e.work[d] === 'o' ? i : -1).filter(i => i >= 0), opts = fixedOn.length ? fixedOn : people.map((e, i) => (e.work[d] === 'x' || e.requested[d]) ? -1 : i).filter(i => i >= 0).sort((a, b) => (Number(people[b].target) - counts[b]) - (Number(people[a].target) - counts[a]));
      for (const i of opts) { if (!canWork(people[i], d, limit) || counts[i] >= Number(people[i].target)) continue; chosen[d] = i; people.forEach((e, k) => { if (e.work[d] === '') e.work[d] = k === i ? 'o' : ''; }); counts[i]++; if (dfs(d + 1)) return true; counts[i]--; people.forEach((e, k) => { if (e.work[d] === 'o' && !fixed[k][d]) e.work[d] = ''; }); chosen[d] = -1; }
      memo.set(key, false); return false;
    }
    return dfs(0) ? true : null;
  }
  function restoreGroup(start, backup) { const old = JSON.parse(backup); state.employees.forEach((e, i) => { if (i >= start && i < start + 3) e.work = old[i]; }); }
  function failureReasons(start) {
    const g = GROUPS.find(x => x.start === start), people = state.employees.slice(start, start + 3), reasons = [];
    for (let d = 0; d < DAYS; d++) { if (state.noAssign[g.key][d]) continue; const allRequested = people.every(e => e.work[d] === 'x' || e.requested[d]); const eligible = people.some(e => Number(e.target || 0) > 0 && e.work[d] !== 'x' && !e.requested[d]); if (!eligible) reasons.push(allRequested ? `${dateLabel(d)}は${g.label}グループ3人全員が希望休です。` : `${dateLabel(d)}は${g.label}グループでその日に勤務可能な職員がいません。`); }
    for (const e of people) { const available = Array.from({ length: DAYS }, (_, d) => !state.noAssign[g.key][d] && e.work[d] !== 'x' && !e.requested[d]).filter(Boolean).length; if (available < Number(e.target || 0)) reasons.push(`${e.name}さんは目標${Number(e.target || 0)}日ですが、勤務可能日は${available}日です。`); }
    return reasons;
  }
  function showMessage(type, items) { const box = document.getElementById('messages'); box.innerHTML = `<div class="message ${type}">${items.length === 1 ? esc(items[0]) : `<strong>${type === 'error' ? '作成できません' : '確認してください'}</strong><ul>${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`}</div>`; }
  function autoCreate() {
    const mismatches = [];
    for (const g of GROUPS) { const total = state.employees.slice(g.start, g.start + 3).reduce((a, e) => a + Number(e.target || 0), 0), required = requiredDays(g.key); if (total !== required) mismatches.push(`${g.label}グループの目標合計は${total}日ですが、必要勤務日数は${required}日です。`); }
    if (mismatches.length) { state.lastResult = '作成失敗'; showMessage('warning', mismatches); save(); return; }
    state.employees.forEach(e => { e.work = e.work.map((v, d) => (v === 'x' || e.requested[d]) ? 'x' : ''); });
    const base = JSON.stringify(state.employees.map(e => e.work));
    const failed = [];
    for (const g of GROUPS) {
      const backup = JSON.stringify(state.employees.map(e => e.work)); let ok = solveGroup(g.start, 1);
      if (!ok) { restoreGroup(g.start, backup); ok = solveGroup(g.start, 2); if (!ok) { restoreGroup(g.start, backup); let reasons = failureReasons(g.start); if (!reasons.length) { const probe = solveGroup(g.start, 99); restoreGroup(g.start, backup); if (probe) reasons = ['前回シフトとのつながりを含めると、3連勤を避けて作成できません。']; } if (!reasons.length) reasons = [`${g.label}グループは現在の条件では作成できません。希望休、目標日数、配置不要日を見直してください。`]; failed.push(...reasons.map(x => `${g.label}グループ: ${x}`)); } }
    }
    if (failed.length) state.employees.forEach((e, i) => { e.work = JSON.parse(base)[i]; });
    state.lastResult = failed.length ? '作成失敗' : '作成成功'; render(); if (failed.length) showMessage('error', ['この条件では作成できません。', ...failed, '不正なシフトは作成していません。']); else showMessage('success', ['自動作成しました。必要に応じて手修正してください。']);
  }
  function csv() {
    const display = v => v === 'o' ? '○' : v === 'x' ? '×' : '';
    const rows = [['職員名', 'グループ', '目標', ...state.employees[0].prev.map((_, i) => `前回${i + 1}`), ...Array.from({ length: DAYS }, (_, i) => `${i + 1}日目 ${dateLabel(i)}`)]];
    for (const g of GROUPS) rows.push(['配置不要', g.label, '', '', '', '', ...state.noAssign[g.key].map(v => v ? '配置不要' : '')]);
    state.employees.forEach((e, i) => rows.push([e.name, i < 3 ? '上' : '下', e.target, ...e.prev.map(display), ...e.work.map(display)]));
    const body = rows.map(r => r.map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n'); const blob = new Blob(['\uFEFF' + body + '\r\n'], { type: 'text/csv;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `silver-shift-${state.startDate}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }
  document.addEventListener('input', e => { const f = e.target.dataset.field; if (!f) return; const i = Number(e.target.dataset.i); state.employees[i][f] = f === 'target' ? Math.max(0, Math.min(28, Number(e.target.value) || 0)) : e.target.value; renderTable(); updateTotals(); save(); check(true); });
  document.addEventListener('change', e => { if (e.target.id === 'startDate') { state.startDate = e.target.value; render(); return; } const key = e.target.dataset.noassignGroup; if (key) { state.noAssign[key][Number(e.target.dataset.day)] = Boolean(e.target.checked); render(); check(true); } });
  document.addEventListener('click', e => { const c = e.target.closest('td.cell'); if (c) { const i = Number(c.dataset.i), j = Number(c.dataset.j), v = c.dataset.value; setCell(i, j, j < 0 ? (v ? '' : 'o') : (v === '' ? 'o' : v === 'o' ? 'x' : '')); } if (e.target.id === 'autoCreate') autoCreate(); if (e.target.id === 'exportCsv') csv(); if (e.target.id === 'clearAll' && confirm('職員設定とシフトをすべて削除しますか？')) { localStorage.removeItem(KEY); state = defaultState(); render(); } });
  render();
})();
