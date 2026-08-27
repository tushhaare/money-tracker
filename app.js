
const CONFIG = window.MONEY_TRACKER_CONFIG;
const START_MONTH = "2026-09";

let state = {
  data:null,
  view:"dashboard",
  editingTx:null
};

const $ = id => document.getElementById(id);
const money = n => "₹" + Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2});
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const monthLabel = m => new Date(m+"-01T00:00:00").toLocaleDateString("en-IN",{month:"long",year:"numeric"});

function toast(msg){
  const t=$("toast");
  t.textContent=msg;
  t.classList.add("show");
  clearTimeout(window.__toast);
  window.__toast=setTimeout(()=>t.classList.remove("show"),2200);
}

function api(params={}){
  return new Promise((resolve,reject)=>{
    if(!CONFIG.BACKEND_URL || CONFIG.BACKEND_URL.includes("PASTE_YOUR")){
      reject(new Error("Add your Apps Script /exec URL to index.html first."));
      return;
    }

    const cb="mt_cb_"+Date.now()+"_"+Math.random().toString(36).slice(2);
    const script=document.createElement("script");
    const url=new URL(CONFIG.BACKEND_URL);

    Object.entries(params).forEach(([k,v])=>{
      url.searchParams.set(k,typeof v==="object"?JSON.stringify(v):String(v??""));
    });

    url.searchParams.set("callback",cb);

    const timeout=setTimeout(()=>{
      cleanup();
      reject(new Error("Backend request timed out. Check your Apps Script deployment."));
    },15000);

    function cleanup(){
      clearTimeout(timeout);
      delete window[cb];
      script.remove();
    }

    window[cb]=data=>{
      cleanup();
      if(data && data.error) reject(new Error(data.error));
      else resolve(data);
    };

    script.onerror=()=>{
      cleanup();
      reject(new Error("Backend unavailable. Check that Apps Script is deployed as a Web App with access set to Anyone."));
    };

    script.src=url.toString();
    document.body.appendChild(script);
  });
}

async function loadData(month){
  setLoading();

  try{
    state.data=await api({action:"getData",month:month||START_MONTH});
    render();
  }catch(e){
    document.querySelectorAll(".view").forEach(v=>{
      v.innerHTML=`
        <div class="card">
          <h2>Backend unavailable</h2>
          <div class="notice">${esc(e.message)}</div>
          <button class="btn" onclick="loadData()">Retry</button>
        </div>`;
    });
  }
}

function setLoading(){
  document.querySelectorAll(".view").forEach(v=>{
    v.innerHTML='<div class="card loading">Loading...</div>';
  });
}

function showView(view){
  state.view=view;
  document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x.id===view));
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.view===view));
  window.scrollTo({top:0,behavior:"smooth"});
}

function monthOptions(){
  return (state.data.previousMonths||[]).map(m=>
    `<option value="${m}" ${m===state.data.month?"selected":""}>${monthLabel(m)}</option>`
  ).join("");
}

function categoryOptions(selected=""){
  return (state.data.categories||[]).map(c=>
    `<option value="${esc(c)}" ${c===selected?"selected":""}>${esc(c)}</option>`
  ).join("");
}

function render(){
  const d=state.data;
  $("monthLabel").textContent=d.monthLabel;
  renderDashboard();
  renderAdd();
  renderHistory();
  renderUsage();
  renderReports();
  renderSettings();
}

function renderDashboard(){
  const d=state.data;
  const top=Object.entries(d.categoryTotals||{}).sort((a,b)=>b[1]-a[1]).slice(0,5);

  $("dashboard").innerHTML=`
    <div class="metrics">
      <div class="metric primary">
        <div class="label">Current Balance</div>
        <div class="value">${money(d.closing)}</div>
      </div>
      <div class="metric">
        <div class="label">Opening Balance</div>
        <div class="value">${money(d.opening)}</div>
      </div>
      <div class="metric">
        <div class="label">Income</div>
        <div class="value good">${money(d.totalIncome)}</div>
      </div>
      <div class="metric">
        <div class="label">Spent</div>
        <div class="value bad">${money(d.totalExpenses)}</div>
      </div>
      <div class="metric">
        <div class="label">Budget Remaining</div>
        <div class="value">${money(d.budgetRemaining)}</div>
      </div>
    </div>

    <div class="card">
      <div class="section-head">
        <h2>Spending by Category</h2>
        <span class="muted">${d.monthLabel}</span>
      </div>
      ${top.length
        ? top.map(([k,v])=>`
          <div class="budget-row">
            <div class="budget-top"><span>${esc(k)}</span><strong>${money(v)}</strong></div>
            <div class="bar"><span style="width:${Math.min(100,v/(top[0][1]||1)*100)}%"></span></div>
          </div>`).join("")
        : '<div class="empty">No spending recorded yet.</div>'}
    </div>

    <div class="card">
      <div class="section-head">
        <h2>Budget Usage</h2>
        <button class="btn secondary" onclick="showView('usage')">Manage</button>
      </div>
      ${(d.budgetRows||[]).length
        ? d.budgetRows.map(b=>budgetCard(b)).join("")
        : '<div class="empty">No monthly allocations yet.</div>'}
    </div>

    <div class="card">
      <div class="section-head">
        <h2>Recent Transactions</h2>
        <button class="btn secondary" onclick="showView('history')">View all</button>
      </div>
      ${txList(d.transactions.slice(0,6),false)}
    </div>`;
}

function budgetCard(b){
  const u=b.allocated?b.actual/b.allocated:0;
  return `
    <div class="budget-row">
      <div class="budget-top">
        <strong>${esc(b.category)}</strong>
        <span class="pill ${u>1?"over":""}">${(u*100).toFixed(0)}%</span>
      </div>
      <div class="small">
        ${money(b.actual)} spent of ${money(b.allocated)} · ${money(b.remaining)} left
      </div>
      <div class="bar"><span style="width:${Math.min(100,u*100)}%"></span></div>
    </div>`;
}

function renderAdd(){
  const t=state.editingTx||{};

  $("add").innerHTML=`
    <div class="card">
      <div class="section-head">
        <h2>${state.editingTx?"Edit Transaction":"Add Transaction"}</h2>
        ${state.editingTx?'<button class="btn secondary" onclick="cancelEdit()">Cancel</button>':""}
      </div>

      <div class="notice">
        Enter an expense as soon as you spend it. The backend records the date, time and month.
      </div>

      <div class="row">
        <div>
          <label>Type</label>
          <select id="txType">
            <option value="Expense" ${t.Type!=="Income"?"selected":""}>Expense</option>
            <option value="Income" ${t.Type==="Income"?"selected":""}>Income</option>
          </select>
        </div>

        <div>
          <label>Amount</label>
          <input id="txAmount" type="number" inputmode="decimal" min="0" step="0.01"
            value="${esc(t.Amount||"")}" placeholder="20">
        </div>
      </div>

      <label>Category</label>
      <select id="txCategory">${categoryOptions(t.Category)}</select>

      <label>Remark</label>
      <input id="txRemark" value="${esc(t.Remark||"")}" placeholder="Morning coffee">

      <div class="actions">
        <button class="btn" onclick="saveTransaction()">
          ${state.editingTx?"Update Transaction":"Save Transaction"}
        </button>
      </div>
    </div>`;
}

async function saveTransaction(){
  const amount=Number($("txAmount").value);

  if(!amount || amount<=0){
    toast("Enter a valid amount.");
    return;
  }

  const params={
    action:state.editingTx?"updateTransaction":"addTransaction",
    type:$("txType").value,
    amount:amount,
    category:$("txCategory").value,
    remark:$("txRemark").value
  };

  if(state.editingTx) params.id=state.editingTx.ID;

  try{
    state.data=await api(params);
    state.editingTx=null;
    toast("Transaction saved.");
    render();
    showView("dashboard");
  }catch(e){
    toast(e.message);
  }
}

function editTransaction(t){
  state.editingTx=t;
  showView("add");
  renderAdd();
}

function cancelEdit(){
  state.editingTx=null;
  renderAdd();
}

async function deleteTransaction(id){
  if(!confirm("Delete this transaction?")) return;

  try{
    state.data=await api({action:"deleteTransaction",id:id});
    toast("Transaction deleted.");
    render();
  }catch(e){
    toast(e.message);
  }
}

function txList(rows,actions){
  if(!rows.length) return '<div class="empty">No transactions for this month.</div>';

  return rows.map(t=>`
    <div class="tx">
      <div>
        <div class="tx-title">${esc(t.Remark||t.Category)}</div>
        <div class="tx-meta">${esc(t.Category)} · ${esc(t.Date)} ${esc(t.Time)}</div>
      </div>

      <div style="text-align:right">
        <div class="amount ${t.Type==="Income"?"good":"bad"}">
          ${t.Type==="Income"?"+":"-"}${money(t.Amount)}
        </div>

        ${actions?`
          <div class="actions" style="justify-content:flex-end;margin-top:6px">
            <button class="btn secondary" onclick='editTransaction(${JSON.stringify(t)})'>Edit</button>
            <button class="btn danger" onclick="deleteTransaction('${esc(t.ID)}')">Delete</button>
          </div>`:""}
      </div>
    </div>`).join("");
}

function renderHistory(){
  const d=state.data;

  $("history").innerHTML=`
    <div class="card">
      <div class="section-head">
        <h2>Transaction History</h2>
        <select class="month-select" onchange="loadData(this.value)">${monthOptions()}</select>
      </div>
      ${txList(d.transactions,true)}
    </div>`;
}

function renderUsage(){
  const d=state.data;

  $("usage").innerHTML=`
    <div class="card">
      <div class="section-head">
        <h2>Monthly Usage</h2>
        <button class="btn" onclick="toggleBudgetForm()">＋ Allocation</button>
      </div>

      <div class="notice">
        Example: ₹20 coffee × 30 days = ₹600 planned monthly allocation.
      </div>

      <div id="budgetForm"></div>

      <div id="budgetRows">
        ${(d.budgetRows||[]).map(b=>budgetRow(b)).join("") ||
        '<div class="empty">No allocations yet.</div>'}
      </div>
    </div>`;
}

function budgetRow(b){
  return `
    <div class="tx">
      <div>
        <strong>${esc(b.category)}</strong>
        <div class="tx-meta">
          Allocated ${money(b.allocated)} ·
          Spent ${money(b.actual)} ·
          Remaining ${money(b.remaining)}
          ${b.recurringAmount
            ? ` · ${money(b.recurringAmount)}/day × ${b.recurringDays} = ${money(b.plannedMonthly)}`
            : ""}
        </div>
      </div>

      <div class="actions">
        <button class="btn secondary" onclick='editBudget(${JSON.stringify(b)})'>Edit</button>
        <button class="btn danger" onclick="deleteBudget('${esc(b.category)}')">Delete</button>
      </div>
    </div>`;
}

function budgetForm(b={}){
  return `
    <div class="form-box">
      <label>Category</label>
      <select id="bCategory">${categoryOptions(b.category)}</select>

      <label>Allocated budget</label>
      <input id="bAllocated" type="number" inputmode="decimal"
        value="${esc(b.allocated||"")}" placeholder="600">

      <div class="row">
        <div>
          <label>Recurring amount/day</label>
          <input id="bRecurring" type="number"
            value="${esc(b.recurringAmount||"")}" placeholder="20">
        </div>
        <div>
          <label>Days</label>
          <input id="bDays" type="number"
            value="${esc(b.recurringDays||"")}" placeholder="30">
        </div>
      </div>

      <div class="actions">
        <button class="btn" onclick="saveBudget()">Save Allocation</button>
        <button class="btn secondary" onclick="renderUsage()">Cancel</button>
      </div>
    </div>`;
}

function toggleBudgetForm(){
  $("budgetForm").innerHTML=budgetForm();
}

function editBudget(b){
  $("budgetForm").innerHTML=budgetForm(b);
  $("budgetForm").scrollIntoView({behavior:"smooth",block:"nearest"});
}

async function saveBudget(){
  try{
    state.data=await api({
      action:"saveBudget",
      month:state.data.month,
      category:$("bCategory").value,
      allocated:Number($("bAllocated").value||0),
      recurringAmount:Number($("bRecurring").value||0),
      recurringDays:Number($("bDays").value||0)
    });

    toast("Allocation saved.");
    render();
  }catch(e){
    toast(e.message);
  }
}

async function deleteBudget(category){
  if(!confirm("Delete this monthly allocation?")) return;

  try{
    state.data=await api({
      action:"deleteBudget",
      month:state.data.month,
      category:category
    });

    toast("Allocation deleted.");
    render();
  }catch(e){
    toast(e.message);
  }
}

function renderReports(){
  const d=state.data;
  const r=d.monthlySummary;
  const cats=Object.entries(d.categoryTotals||{}).sort((a,b)=>b[1]-a[1]);
  const max=cats.length?cats[0][1]:0;

  $("reports").innerHTML=`
    <div class="card">
      <div class="section-head">
        <h2>Monthly Report</h2>
        <select class="month-select" onchange="loadData(this.value)">${monthOptions()}</select>
      </div>

      <div class="metrics">
        <div class="metric"><div class="label">Opening</div><div class="value">${money(r.opening)}</div></div>
        <div class="metric"><div class="label">Closing</div><div class="value">${money(r.closing)}</div></div>
        <div class="metric"><div class="label">Income</div><div class="value good">${money(r.income)}</div></div>
        <div class="metric"><div class="label">Expenses</div><div class="value bad">${money(r.expenses)}</div></div>
      </div>

      <hr>

      <h2>Category Breakdown</h2>
      ${cats.length
        ? cats.map(([k,v])=>`
          <div class="budget-row">
            <div class="budget-top">
              <span>${esc(k)}</span>
              <strong>${money(v)}</strong>
            </div>
            <div class="bar"><span style="width:${max?Math.min(100,v/max*100):0}%"></span></div>
          </div>`).join("")
        : '<div class="empty">No spending recorded.</div>'}

      <hr>
      <h2>Daily Spending</h2>
      ${dailyChart(d.transactions)}

      <div style="margin-top:12px">
        <button class="btn" onclick="saveReport()">Save Monthly Report</button>
      </div>
    </div>

    <div class="card">
      <h2>Monthly Directory</h2>
      ${(d.previousMonths||[]).map(m=>
        `<button class="btn secondary" style="margin:3px" onclick="loadData('${m}')">${monthLabel(m)}</button>`
      ).join("")}
    </div>`;
}

function dailyChart(rows){
  const map={};

  rows.filter(x=>x.Type==="Expense").forEach(x=>{
    const day=String(x.Date||"").slice(8,10);
    map[day]=(map[day]||0)+Number(x.Amount||0);
  });

  const keys=Object.keys(map).sort((a,b)=>Number(a)-Number(b));

  if(!keys.length) return '<div class="empty">No daily spending yet.</div>';

  const max=Math.max(...keys.map(k=>map[k]),1);

  return `
    <div class="chart">
      ${keys.map(k=>`
        <div class="chart-col">
          <div class="chart-value">${money(map[k])}</div>
          <div class="chart-bar" style="height:${Math.max(3,map[k]/max*125)}px"></div>
          <div class="chart-label">${esc(k)}</div>
        </div>`).join("")}
    </div>`;
}

async function saveReport(){
  try{
    state.data=await api({
      action:"saveMonthlyReport",
      month:state.data.month
    });
    toast("Monthly report saved.");
    render();
  }catch(e){
    toast(e.message);
  }
}

function renderSettings(){
  const d=state.data;

  $("settings").innerHTML=`
    <div class="card">
      <h2>Month Setup</h2>

      <div class="notice">
        Enter the bank balance available at the beginning of a month.
        If a later month has no opening balance, the app carries forward
        the previous month's closing balance.
      </div>

      <label>Month</label>
      <select id="settingsMonth" onchange="loadData(this.value)">
        ${monthOptions()}
      </select>

      <label>Opening bank balance</label>
      <input id="openingInput" type="number" inputmode="decimal"
        value="${esc(d.opening||"")}" placeholder="15000">

      <button class="btn" onclick="saveOpening()">Save Opening Balance</button>
    </div>

    <div class="card">
      <h2>Categories</h2>

      <label>Categories, separated by commas</label>
      <input id="categoriesInput"
        value="${esc((d.categories||[]).join(", "))}">

      <button class="btn" onclick="saveCategories()">Save Categories</button>
    </div>`;
}

async function saveOpening(){
  try{
    state.data=await api({
      action:"setOpeningBalance",
      month:state.data.month,
      amount:Number($("openingInput").value||0)
    });

    toast("Opening balance saved.");
    render();
  }catch(e){
    toast(e.message);
  }
}

async function saveCategories(){
  const categories=$("categoriesInput").value
    .split(",")
    .map(x=>x.trim())
    .filter(Boolean);

  try{
    state.data=await api({
      action:"saveCategories",
      categories:categories
    });

    toast("Categories saved.");
    render();
  }catch(e){
    toast(e.message);
  }
}

document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click",()=>showView(btn.dataset.view));
});

$("settingsBtn").addEventListener("click",()=>showView("settings"));

loadData(START_MONTH);
