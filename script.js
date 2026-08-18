// ─── CONFIG ──────────────────────────────────────────────────
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzd_bP97XtAOckTk7zj2IF3spnrt6gTCk9IEVg74PzD8UYX3ejUNg0AMOr2gudI10tMsw/exec";
const CSV_URL    = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQqNSgIgrRWo2afwjJUdh9TMzJDXqikJI8fgzxCZXFAwbhrfUoF7ftXCuAlrDoAfvFGI2gb2hmqEPd2/pub?gid=0&single=true&output=csv";

let allData     = [];
let drillBranch = null;
let reportMode  = 'daily';   // 'daily' | 'monthly'

// ─── UNIFIED STAFF ENGINE ────────────────────────────────────
// Iterates through records in chronological order so that the newest name for an Employee Code overrides older entries.
function getUnifiedStaff(rows) {
    const codeToNameMap = new Map();
    const fallbackSet = new Set();

    rows.forEach(r => {
        const names = (r.StaffNames || '').split(',').map(s => s.trim());
        const codes = (r.EmployeeCodes || '').split(',').map(s => s.trim());

        names.forEach((name, i) => {
            if (!name) return;
            const code = codes[i] || '';

            if (code) {
                // Key by Employee Code, value is latest name
                codeToNameMap.set(code, name);
            } else {
                fallbackSet.add(name);
            }
        });
    });

    const unifiedList = [];
    codeToNameMap.forEach((name, code) => {
        unifiedList.push(`${name} [${code}]`);
    });
    fallbackSet.forEach(name => {
        unifiedList.push(name);
    });

    return unifiedList;
}

function formatRowStaff(r) {
    const names = (r.StaffNames || '').split(',').map(s => s.trim());
    const codes = (r.EmployeeCodes || '').split(',').map(s => s.trim());
    
    return names.map((name, i) => {
        if (!name) return '';
        const code = codes[i] || '';
        return code ? `${name} [${code}]` : name;
    }).filter(Boolean).join(', ');
}

// ─── INIT ────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('date').valueAsDate = new Date();
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const dd   = String(now.getDate()).padStart(2, '0');
    document.getElementById('reportDayFilter').value   = `${yyyy}-${mm}-${dd}`;
    document.getElementById('reportMonthFilter').value = `${yyyy}-${mm}`;
    initStaffList();
});

// ─── MODE TOGGLE ─────────────────────────────────────────────
function setMode(mode) {
    reportMode = mode;
    document.getElementById('btnDaily').classList.toggle('active',   mode === 'daily');
    document.getElementById('btnMonthly').classList.toggle('active', mode === 'monthly');
    document.getElementById('reportDayFilter').classList.toggle('d-none',   mode === 'monthly');
    document.getElementById('reportMonthFilter').classList.toggle('d-none', mode === 'daily');
    drillBranch = null;
    hideDrillPanel();
    if (allData.length > 0) renderReports();
}

function initStaffList() {
    const container = document.getElementById("staffList");
    container.innerHTML = '';
    addStaffRow(container, true);
}

// ─── STAFF INPUT WITH 4-DIGIT VALIDATION ─────────────────────
function addStaff() {
    addStaffRow(document.getElementById("staffList"), false);
}

function addStaffRow(container, isFirst) {
    const wrap = document.createElement("div");
    wrap.className = "staff-row-wrap";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "staff-row staff-row-name";
    nameInput.placeholder = "Enter Staff Name";
    if (isFirst) nameInput.required = true;
    wrap.appendChild(nameInput);

    const codeInput = document.createElement("input");
    codeInput.type = "text";
    codeInput.className = "staff-row staff-row-code";
    codeInput.placeholder = "4-Digit Code";
    codeInput.maxLength = 4;
    codeInput.minLength = 4;
    codeInput.pattern = "[0-9]{4}";
    codeInput.title = "Employee code must be exactly 4 numeric digits";
    
    // Physical block of letters/symbols in real-time
    codeInput.oninput = function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    };

    if (isFirst) codeInput.required = true;
    wrap.appendChild(codeInput);

    if (!isFirst) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "remove-staff-btn";
        btn.title = "Remove";
        btn.innerHTML = "✕";
        btn.onclick = () => wrap.remove();
        wrap.appendChild(btn);
    }

    container.appendChild(wrap);
    if (!isFirst) nameInput.focus();
}

// ─── ACTIVITY TOGGLE ─────────────────────────────────────────
function selectActivity(btn) {
    btn.closest('.activity-toggle')
       .querySelectorAll('.toggle-btn')
       .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const val = btn.getAttribute('data-value');
    document.getElementById('activityType').value = val;

    const shopBox = document.getElementById('shopDetailContainer');
    if (val === 'Shop Visit') {
        shopBox.classList.remove('d-none');
    } else {
        shopBox.classList.add('d-none');
        document.getElementById('shopDetails').value = '';
    }
}

// ─── PHOTO PREVIEW ───────────────────────────────────────────
function previewPhoto(input) {
    if (!input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('previewImg').src = e.target.result;
        document.getElementById('uploadZone').style.display  = 'none';
        document.getElementById('photoPreview').classList.remove('d-none');
    };
    reader.readAsDataURL(input.files[0]);
}

function removePhoto() {
    document.getElementById('photo').value = '';
    document.getElementById('photoPreview').classList.add('d-none');
    document.getElementById('uploadZone').style.display = '';
}

// ─── VIEW TOGGLE ─────────────────────────────────────────────
function toggleView() {
    const userView  = document.getElementById('userView');
    const adminView = document.getElementById('adminView');
    const label     = document.getElementById('toggleLabel');

    if (userView.classList.contains('d-none')) {
        userView.classList.remove('d-none');
        adminView.classList.add('d-none');
        label.textContent = 'Admin Portal';
    } else {
        const pass = prompt('SML Secure Access — Enter Password:');
        if (pass === null) return;
        if (pass === 'SML123') {
            userView.classList.add('d-none');
            adminView.classList.remove('d-none');
            label.textContent = 'Back to Form';
            fetchReports();
        } else {
            showToast('Invalid password. Access denied.', 'error');
        }
    }
}

// ─── FORM SUBMIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('activityForm').addEventListener('submit', async e => {
        e.preventDefault();
        const btn       = document.getElementById('submitBtn');
        const statusMsg = document.getElementById('statusMsg');
        const label     = document.getElementById('submitLabel');

        btn.disabled      = true;
        label.textContent = 'Submitting…';
        statusMsg.className   = 'status-msg loading';
        statusMsg.textContent = 'Transmitting to SML Cloud…';

        const staffNames = Array.from(document.querySelectorAll('.staff-row-name'))
            .map(i => i.value.trim()).filter(Boolean).join(', ');
            
        const employeeCodes = Array.from(document.querySelectorAll('.staff-row-code'))
            .map(i => i.value.trim()).filter(Boolean).join(', ');

        const payload = {
            branch:        document.getElementById('branch').value,
            staffNames:    staffNames,
            employeeCodes: employeeCodes,
            date:          document.getElementById('date').value,
            activityType:  document.getElementById('activityType').value,
            shopDetails:   document.getElementById('shopDetails').value,
            customerName:  document.getElementById('customerName').value,
            job:           document.getElementById('job').value,
            phone:         document.getElementById('phone').value,
            location:      document.getElementById('location').value,
            glOther:       document.getElementById('glOther').value,
            remark:        document.getElementById('remarks').value
        };

        const fileInput = document.getElementById('photo');
        if (fileInput.files.length > 0) {
            const reader = new FileReader();
            reader.onload = async f => {
                payload.photoData = f.target.result.split(',')[1];
                payload.photoType = fileInput.files[0].type;
                payload.photoName = fileInput.files[0].name;
                await sendData(payload);
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            await sendData(payload);
        }
    });
});

async function sendData(payload) {
    const btn       = document.getElementById('submitBtn');
    const statusMsg = document.getElementById('statusMsg');
    const label     = document.getElementById('submitLabel');
    try {
        const res  = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        const data = await res.json();
        if (data.result === 'success') {
            statusMsg.className   = 'status-msg success';
            statusMsg.textContent = '✓ Activity successfully logged to SML Database.';
            label.textContent     = 'Submit Activity';
            setTimeout(() => location.reload(), 1800);
        } else { throw new Error('fail'); }
    } catch {
        statusMsg.className   = 'status-msg error';
        statusMsg.textContent = '✗ Upload failed. Please check your connection.';
        label.textContent     = 'Submit Activity';
        btn.disabled          = false;
    }
}

// ─── FETCH REPORTS ───────────────────────────────────────────
const SHEET_ID = '2PACX-1vQqNSgIgrRWo2afwjJUdh9TMzJDXqikJI8fgzxCZXFAwbhrfUoF7ftXCuAlrDoAfvFGI2gb2hmqEPd2';

async function fetchReports() {
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) { refreshBtn.classList.add('spinning'); refreshBtn.disabled = true; }
    showTableLoading(true);

    try {
        const gvizUrl = `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?output=csv&gid=0&tqx=out:csv&t=${Date.now()}`;
        const res = await fetch(gvizUrl);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const text = await res.text();
        if (!text || text.trim().length < 5) throw new Error('Empty response');
        allData = parseCSV(text);
        drillBranch = null;
        renderReports();
    } catch (err) {
        try {
            const res2 = await fetch(CSV_URL + '&t=' + Date.now());
            if (!res2.ok) throw new Error('fallback failed');
            const text2 = await res2.text();
            if (!text2 || text2.includes('<!DOCTYPE')) throw new Error('Got HTML not CSV');
            allData = parseCSV(text2);
            drillBranch = null;
            renderReports();
        } catch (err2) {
            document.getElementById('adminContent').innerHTML = `
              <div class="empty-state" style="padding:60px 20px">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p style="margin-bottom:12px">Could not load sheet data.</p>
              </div>`;
        }
    } finally {
        showTableLoading(false);
        if (refreshBtn) { refreshBtn.classList.remove('spinning'); refreshBtn.disabled = false; }
    }
}

function showTableLoading(show) {
    const el = document.getElementById('tableLoading');
    if (el) el.classList.toggle('d-none', !show);
}

// ─── ROBUST CSV PARSER ───────────────────────────────────────
function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const rawHeaders = parseCSVLine(lines[0]);
    const col = {};

    rawHeaders.forEach((h, i) => {
        const clean = h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        col[clean] = i;
    });

    function getVal(row, ...variants) {
        for (const v of variants) {
            const cleanKey = v.toLowerCase().replace(/[^a-z0-9]/g, '');
            const idx = col[cleanKey];
            if (idx !== undefined && row[idx] !== undefined) {
                return row[idx].trim().replace(/^"|"$/g, '');
            }
        }
        return '';
    }

    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        if (!row || row.every(c => !c.trim().replace(/"/g, ''))) continue;

        const dateRaw = getVal(row, 'Date');
        
        // Robust fetch of Employee Code from common headers, or fallback to column index 3 (after Staff Names)
        let empCodes = getVal(row, 'Employee Codes', 'Employee Code', 'Emp Code', 'Emp Codes', 'EmployeeCodes', 'EmpCode', 'Codes');
        if (!empCodes && row[3] && /^[0-9,\s]+$/.test(row[3].trim())) {
            empCodes = row[3].trim();
        }

        result.push({
            Timestamp:      getVal(row, 'Timestamp'),
            Branch:         getVal(row, 'Branch'),
            StaffNames:     getVal(row, 'Staff Names', 'Staff Name', 'Staff'),
            EmployeeCodes:  empCodes,
            Date:           dateRaw,
            Month:          dateRaw.substring(0, 7),
            ActivityType:   getVal(row, 'Activity Type', 'Activity'),
            ShopDetails:    getVal(row, 'Shop Details', 'Shop Detail', 'Shop'),
            CustomerName:   getVal(row, 'Customer Name', 'Customer'),
            Job:            getVal(row, 'Job', 'Occupation'),
            Phone:          getVal(row, 'Phone', 'Mobile'),
            Location:       getVal(row, 'Location', 'Place'),
            GLOther:        getVal(row, 'GL Other Company', 'GL Other', 'GLOtherCompany'),
            Remark:         getVal(row, 'Remark', 'Remarks'),
            PhotoLink:      getVal(row, 'Photo Link', 'Photo')
        });
    }
    return result;
}

function parseCSVLine(line) {
    const result = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQ && line[i+1] === '"') { cur += '"'; i++; }
            else inQ = !inQ;
        } else if (ch === ',' && !inQ) { result.push(cur); cur = ''; }
        else cur += ch;
    }
    result.push(cur);
    return result;
}

// ─── RENDER REPORTS ──────────────────────────────────────────
function renderReports() {
    const branch = document.getElementById('reportBranchFilter').value;
    drillBranch  = null;
    hideDrillPanel();

    if (reportMode === 'daily') {
        const day = document.getElementById('reportDayFilter').value;
        const rows = allData.filter(r => r.Date === day);
        const filtered = branch === 'ALL' ? rows : rows.filter(r => r.Branch === branch);
        renderSummaryStrip(filtered);
        if (branch === 'ALL') {
            renderDailyOverview(rows, day);
        } else {
            renderDailyBranchDetail(filtered, branch, day);
        }
    } else {
        const month = document.getElementById('reportMonthFilter').value;
        const rows = allData.filter(r => r.Month === month);
        const filtered = branch === 'ALL' ? rows : rows.filter(r => r.Branch === branch);
        renderSummaryStrip(filtered);
        if (branch === 'ALL') {
            renderBranchOverview(rows, month);
        } else {
            renderBranchDetail(filtered, branch, month);
        }
    }
}

// ─── TOP SUMMARY STRIP ───────────────────────────────────────
function renderSummaryStrip(rows) {
    const el = document.getElementById('summaryCards');
    if (!el) return;
    const total    = rows.length;
    const branches = new Set(rows.map(r => r.Branch)).size;
    const staff    = getUnifiedStaff(rows).length;
    const house    = rows.filter(r => r.ActivityType === 'House Visit').length;
    const shop     = rows.filter(r => r.ActivityType === 'Shop Visit').length;
    const gl       = rows.filter(r => r.GLOther && r.GLOther.trim() !== '').length;

    el.innerHTML = [
        { v: total,    l: 'Total Leads',     icon: '📋' },
        { v: branches, l: 'Branches Active', icon: '🏢' },
        { v: staff,    l: 'Staff on Field',  icon: '👥' },
        { v: house,    l: 'House Visits',    icon: '🏠' },
        { v: shop,     l: 'Shop Visits',     icon: '🏪' },
        { v: gl,       l: 'GL with Others',  icon: '🔗' },
    ].map(c => `
        <div class="summary-card">
            <div class="summary-card-icon">${c.icon}</div>
            <div class="summary-card-value">${c.v}</div>
            <div class="summary-card-label">${c.l}</div>
        </div>
    `).join('');
}

// ─── DAILY: ALL BRANCHES OVERVIEW ────────────────────────────
function renderDailyOverview(rows, day) {
    const content = document.getElementById('adminContent');
    if (!rows.length) {
        content.innerHTML = emptyState(`No records for ${dispDate(day)}`);
        return;
    }

    const map = {};
    rows.forEach(r => {
        const b = r.Branch || 'Unknown';
        if (!map[b]) map[b] = { total: 0, house: 0, shop: 0, gl: 0, records: [] };
        map[b].total++;
        if (r.ActivityType === 'House Visit') map[b].house++;
        if (r.ActivityType === 'Shop Visit')  map[b].shop++;
        if (r.GLOther && r.GLOther.trim()) map[b].gl++;
        map[b].records.push(r);
    });

    const sorted = Object.entries(map).sort((a, b) => b[1].total - a[1].total);

    content.innerHTML = `
      <div class="section-title-bar">
        <span>All Branches — ${dispDate(day)}</span>
        <span class="rec-count">${rows.length} records</span>
      </div>
      <div class="mobile-table-wrap">
        <table class="report-table">
          <thead><tr>
            <th>Branch</th><th>Leads</th><th>House</th><th>Shop</th>
            <th>GL Other</th><th>Staff on Field</th>
          </tr></thead>
          <tbody>
            ${sorted.map(([branch, d]) => {
              const staffList = getUnifiedStaff(d.records);
              return `<tr>
                <td>
                  <strong style="cursor:pointer;color:var(--red)" onclick="drillDailyBranch('${branch}','${day}')">${branch}</strong>
                </td>
                <td><span class="badge-count">${d.total}</span></td>
                <td><span class="badge-type house">${d.house}</span></td>
                <td><span class="badge-type">${d.shop}</span></td>
                <td style="font-size:12px">${d.gl || '—'}</td>
                <td style="font-size:12px;line-height:1.7">${staffList.join('<br>') || '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
}

// ─── DAILY: SINGLE BRANCH DETAIL ─────────────────────────────
function renderDailyBranchDetail(rows, branch, day) {
    const content = document.getElementById('adminContent');
    if (!rows.length) {
        content.innerHTML = emptyState(`No records for ${branch} on ${dispDate(day)}`);
        return;
    }
    renderDailyRecordList(content, rows, branch, day, false);
}

function drillDailyBranch(branch, day) {
    const rows   = allData.filter(r => r.Date === day && r.Branch === branch);
    const panel  = document.getElementById('drillPanel');
    const content= document.getElementById('drillContent');
    renderDailyRecordList(content, rows, branch, day, true);
    panel.classList.remove('d-none');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderDailyRecordList(container, rows, branch, day, isDrill) {
    let house = 0, shop = 0, glCount = 0;
    rows.forEach(r => {
        if (r.ActivityType === 'House Visit') house++;
        if (r.ActivityType === 'Shop Visit')  shop++;
        if (r.GLOther && r.GLOther.trim()) glCount++;
    });

    const staffList = getUnifiedStaff(rows);

    container.innerHTML = `
      <div class="detail-header ${isDrill ? 'drill-header' : ''}">
        ${isDrill ? `<button class="back-btn" onclick="hideDrillPanel()">← Back</button>` : ''}
        <div>
          <h3 class="detail-branch-name">${branch}</h3>
          <p class="detail-month">${dispDate(day)} · ${rows.length} leads</p>
        </div>
      </div>

      <div class="detail-kpi-row">
        <div class="detail-kpi"><span class="kpi-val">${rows.length}</span><span class="kpi-lbl">Total</span></div>
        <div class="detail-kpi"><span class="kpi-val">${house}</span><span class="kpi-lbl">House</span></div>
        <div class="detail-kpi"><span class="kpi-val">${shop}</span><span class="kpi-lbl">Shop</span></div>
        <div class="detail-kpi"><span class="kpi-val">${glCount}</span><span class="kpi-lbl">GL Other</span></div>
        <div class="detail-kpi"><span class="kpi-val">${staffList.length}</span><span class="kpi-lbl">Staff</span></div>
      </div>

      <div class="detail-box" style="margin-bottom:16px">
        <div class="detail-box-title">👥 Staff on Field</div>
        <ul class="detail-list">
          ${staffList.map(s => `<li>${s}</li>`).join('') || '<li class="empty-li">None recorded</li>'}
        </ul>
      </div>

      <div class="detail-box">
        <div class="detail-box-title">📋 Records — ${dispDate(day)}</div>
        <div class="mobile-table-wrap">
          <table class="report-table">
            <thead><tr>
              <th>Customer</th><th>Type</th><th>Phone</th>
              <th>Location</th><th>GL Other</th><th>Staff</th><th>Photo</th>
            </tr></thead>
            <tbody>
              ${rows.map(r => {
                const hasPhoto = r.PhotoLink && r.PhotoLink.toLowerCase() !== 'no photo' && r.PhotoLink.trim();
                return `<tr>
                  <td>
                    <strong>${r.CustomerName || '—'}</strong>
                    ${r.Job ? `<small>${r.Job}</small>` : ''}
                  </td>
                  <td><span class="badge-type ${r.ActivityType==='House Visit'?'house':''}">${r.ActivityType||'—'}</span>
                    ${r.ShopDetails ? `<small>${r.ShopDetails}</small>` : ''}
                  </td>
                  <td style="font-size:12px">${r.Phone||'—'}</td>
                  <td style="font-size:12px">${r.Location||'—'}</td>
                  <td style="font-size:12px">${r.GLOther||'—'}</td>
                  <td style="font-size:12px">${formatRowStaff(r) || '—'}</td>
                  <td>${hasPhoto
                    ? `<a href="${r.PhotoLink}" target="_blank" class="photo-link-btn">View</a>`
                    : '<span style="color:var(--text-faint)">—</span>'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    if (isDrill) {
        container.querySelectorAll('.detail-kpi-row, .detail-box').forEach(el => {
            el.style.margin = '0 16px 16px';
        });
        container.querySelector('.detail-kpi-row').style.margin = '16px 16px 16px';
        const last = container.querySelector('.detail-box:last-child');
        if (last) last.style.marginBottom = '20px';
    }
}

// ─── MONTHLY: ALL BRANCHES OVERVIEW TABLE ────────────────────
function renderBranchOverview(rows, month) {
    const content = document.getElementById('adminContent');

    if (!rows.length) {
        content.innerHTML = emptyState(`No records for ${dispMonth(month)}`);
        return;
    }

    const map = {};
    rows.forEach(r => {
        const b = r.Branch || 'Unknown';
        if (!map[b]) map[b] = { total: 0, house: 0, shop: 0, gl: 0, dates: new Set(), records: [] };
        map[b].total++;
        if (r.ActivityType === 'House Visit') map[b].house++;
        if (r.ActivityType === 'Shop Visit')  map[b].shop++;
        if (r.GLOther && r.GLOther.trim()) map[b].gl++;
        map[b].records.push(r);
        if (r.Date) map[b].dates.add(r.Date);
    });

    const sorted = Object.entries(map).sort((a, b) => b[1].total - a[1].total);

    content.innerHTML = `
      <div class="section-title-bar">
        <span>All Branches — ${dispMonth(month)}</span>
        <span class="rec-count">${rows.length} records</span>
      </div>
      <div class="branch-cards-grid">
        ${sorted.map(([branch, d]) => {
          const staffCount = getUnifiedStaff(d.records).length;
          return `
          <div class="branch-card" onclick="drillInto('${branch}')">
            <div class="branch-card-header">
              <span class="branch-card-name">${branch}</span>
              <span class="branch-card-total">${d.total} leads</span>
            </div>
            <div class="branch-card-stats">
              <div class="bstat"><span class="bstat-val">${d.house}</span><span class="bstat-lbl">House</span></div>
              <div class="bstat"><span class="bstat-val">${d.shop}</span><span class="bstat-lbl">Shop</span></div>
              <div class="bstat"><span class="bstat-val">${d.gl}</span><span class="bstat-lbl">GL Other</span></div>
              <div class="bstat"><span class="bstat-val">${staffCount}</span><span class="bstat-lbl">Staff</span></div>
              <div class="bstat"><span class="bstat-val">${d.dates.size}</span><span class="bstat-lbl">Active Days</span></div>
            </div>
            <div class="branch-card-footer">
              <span class="drill-hint">Tap to see full detail →</span>
            </div>
          </div>
        `}).join('')}
      </div>`;
}

// ─── SINGLE BRANCH DETAIL (MONTHLY) ──────────────────────────
function renderBranchDetail(rows, branch, month) {
    const content = document.getElementById('adminContent');

    if (!rows.length) {
        content.innerHTML = emptyState(`No records for ${branch} in ${dispMonth(month)}`);
        return;
    }

    renderFullBranchDetail(content, rows, branch, month, false);
}

function drillInto(branch) {
    const month   = document.getElementById('reportMonthFilter').value;
    const rows    = allData.filter(r => r.Month === month && r.Branch === branch);
    const panel   = document.getElementById('drillPanel');
    const content = document.getElementById('drillContent');

    renderFullBranchDetail(content, rows, branch, month, true);
    panel.classList.remove('d-none');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideDrillPanel() {
    const panel = document.getElementById('drillPanel');
    if (panel) panel.classList.add('d-none');
}

function renderFullBranchDetail(container, rows, branch, month, isDrill) {
    const dates   = {};   
    let house = 0, shop = 0, glCount = 0;
    const glList  = [];
    const records = [];

    rows.forEach(r => {
        dates[r.Date] = (dates[r.Date] || 0) + 1;
        if (r.ActivityType === 'House Visit') house++;
        if (r.ActivityType === 'Shop Visit')  shop++;
        if (r.GLOther && r.GLOther.trim()) { glCount++; glList.push(r.GLOther.trim()); }
        records.push(r);
    });

    const staffList = getUnifiedStaff(rows);
    const glFreq = {};
    glList.forEach(g => { glFreq[g] = (glFreq[g]||0)+1; });
    const glTop = Object.entries(glFreq).sort((a,b)=>b[1]-a[1]);
    const datesSorted = Object.entries(dates).sort((a,b)=>a[0].localeCompare(b[0]));

    container.innerHTML = `
      <div class="detail-header ${isDrill ? 'drill-header' : ''}">
        ${isDrill ? `<button class="back-btn" onclick="hideDrillPanel()">← Back</button>` : ''}
        <div>
          <h3 class="detail-branch-name">${branch}</h3>
          <p class="detail-month">${dispMonth(month)} · ${rows.length} total leads</p>
        </div>
      </div>

      <div class="detail-kpi-row">
        <div class="detail-kpi"><span class="kpi-val">${rows.length}</span><span class="kpi-lbl">Total Leads</span></div>
        <div class="detail-kpi"><span class="kpi-val">${house}</span><span class="kpi-lbl">House Visits</span></div>
        <div class="detail-kpi"><span class="kpi-val">${shop}</span><span class="kpi-lbl">Shop Visits</span></div>
        <div class="detail-kpi"><span class="kpi-val">${glCount}</span><span class="kpi-lbl">GL with Others</span></div>
        <div class="detail-kpi"><span class="kpi-val">${staffList.length}</span><span class="kpi-lbl">Staff</span></div>
        <div class="detail-kpi"><span class="kpi-val">${datesSorted.length}</span><span class="kpi-lbl">Active Days</span></div>
      </div>

      <div class="detail-2col">
        <div class="detail-box">
          <div class="detail-box-title">👥 Staff on Field</div>
          <ul class="detail-list">
            ${staffList.map(s => `<li>${s}</li>`).join('') || '<li class="empty-li">No staff recorded</li>'}
          </ul>
        </div>
        <div class="detail-box">
          <div class="detail-box-title">🔗 GL with Other Companies</div>
          ${glTop.length
            ? `<ul class="detail-list">${glTop.map(([g,c]) =>
                `<li><span>${g}</span><span class="gl-count">${c}×</span></li>`).join('')}</ul>`
            : '<p class="empty-li">None recorded</p>'
          }
        </div>
      </div>

      <div class="detail-box" style="margin-bottom:16px">
        <div class="detail-box-title">📅 Activity by Date</div>
        <div class="date-bar-list">
          ${datesSorted.map(([date, count]) => {
              const max = Math.max(...Object.values(dates));
              const pct = Math.round((count/max)*100);
              return `
              <div class="date-bar-row" onclick="toggleDateRows('${date}')">
                <span class="date-bar-label">${dispDate(date)}</span>
                <div class="date-bar-track">
                  <div class="date-bar-fill" style="width:${pct}%"></div>
                </div>
                <span class="date-bar-count">${count}</span>
                <span class="date-expand-icon" id="icon-${date}">▾</span>
              </div>
              <div class="date-rows d-none" id="rows-${date}">
                ${records.filter(r=>r.Date===date).map(r => recordCard(r)).join('')}
              </div>`;
          }).join('')}
        </div>
      </div>

      <div class="detail-box">
        <div class="detail-box-title">📋 All Records
          <span style="font-weight:400;font-size:11px;color:var(--text-faint);margin-left:8px">${rows.length} entries</span>
        </div>
        <div class="mobile-table-wrap">
          <table class="report-table">
            <thead><tr>
              <th>Date</th><th>Staff</th><th>Customer</th>
              <th>Type</th><th>Phone</th><th>GL Other</th><th>Photo</th>
            </tr></thead>
            <tbody>
              ${records.map(r => {
                const hasPhoto = r.PhotoLink && r.PhotoLink.toLowerCase() !== 'no photo' && r.PhotoLink.trim();
                return `<tr>
                  <td style="white-space:nowrap"><strong>${dispDate(r.Date)}</strong></td>
                  <td style="font-size:12px">${formatRowStaff(r) || '—'}</td>
                  <td>
                    <strong>${r.CustomerName || '—'}</strong>
                    ${r.Job ? `<small>${r.Job}</small>` : ''}
                    ${r.Location ? `<small style="color:var(--text-faint)">${r.Location}</small>` : ''}
                  </td>
                  <td><span class="badge-type ${r.ActivityType==='House Visit'?'house':''}">${r.ActivityType||'—'}</span>
                    ${r.ShopDetails ? `<small>${r.ShopDetails}</small>` : ''}
                  </td>
                  <td style="font-size:12px">${r.Phone || '—'}</td>
                  <td style="font-size:12px">${r.GLOther || '—'}</td>
                  <td>${hasPhoto
                    ? `<a href="${r.PhotoLink}" target="_blank" class="photo-link-btn">View</a>`
                    : '<span style="color:var(--text-faint)">—</span>'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
}

function recordCard(r) {
    const hasPhoto = r.PhotoLink && r.PhotoLink.toLowerCase() !== 'no photo' && r.PhotoLink.trim();
    const staffStr = formatRowStaff(r);
    
    return `<div class="record-card">
      <div class="record-card-top">
        <strong>${r.CustomerName || '—'}</strong>
        <span class="badge-type ${r.ActivityType==='House Visit'?'house':''}">${r.ActivityType||'—'}</span>
      </div>
      <div class="record-card-meta">
        ${r.Phone ? `<span>📞 ${r.Phone}</span>` : ''}
        ${r.Location ? `<span>📍 ${r.Location}</span>` : ''}
        ${r.Job ? `<span>💼 ${r.Job}</span>` : ''}
        ${staffStr ? `<span>👤 ${staffStr}</span>` : ''}
        ${r.GLOther ? `<span>🔗 ${r.GLOther}</span>` : ''}
        ${r.Remark ? `<span>💬 ${r.Remark}</span>` : ''}
        ${hasPhoto ? `<a href="${r.PhotoLink}" target="_blank" class="photo-link-btn" style="font-size:11px">📷 View Photo</a>` : ''}
      </div>
    </div>`;
}

function toggleDateRows(date) {
    const rows = document.getElementById('rows-' + date);
    const icon = document.getElementById('icon-' + date);
    if (!rows) return;
    const isHidden = rows.classList.contains('d-none');
    rows.classList.toggle('d-none', !isHidden);
    if (icon) icon.textContent = isHidden ? '▴' : '▾';
}

// ─── HELPERS ─────────────────────────────────────────────────
function dispDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso + 'T00:00:00')
            .toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
    } catch { return iso; }
}

function dispMonth(ym) {
    if (!ym) return '';
    try {
        return new Date(ym + '-01T00:00:00')
            .toLocaleDateString('en-IN', { month:'long', year:'numeric' });
    } catch { return ym; }
}

function emptyState(msg) {
    return `<div class="empty-state" style="padding:50px 20px">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg><p>${msg}</p></div>`;
}

function showToast(msg, type='info') {
    const el = document.createElement('div');
    el.style.cssText = `
        position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
        background:${type==='error'?'#8B0000':'#1a7a4a'};
        color:#fff;padding:12px 24px;border-radius:10px;
        font-size:14px;font-weight:600;font-family:'DM Sans',sans-serif;
        box-shadow:0 8px 24px rgba(0,0,0,0.25);z-index:9999;white-space:nowrap;`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}
