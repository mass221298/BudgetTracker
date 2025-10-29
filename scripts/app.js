// BudgetTracker 2.0 — App logic
class BudgetTracker {
  constructor(){
    this.transactions = [];
    this.budgets = [];
    this.nextId = 1;
    this.nextBudgetId = 1;
    this.searchQuery = "";
    this.init();
  }

  init(){
    // theme
    this.applySavedTheme();

    // data
    const saved = storageManager.loadAllData();
    if (saved){
      this.transactions = saved.transactions || [];
      this.budgets = saved.budgets || [];
      if (this.transactions.length) this.nextId = Math.max(...this.transactions.map(t=>t.id))+1;
      if (this.budgets.length) this.nextBudgetId = Math.max(...this.budgets.map(b=>b.id))+1;
    }

    // listeners
    this.bindEvents();

    // initial UI
    this.updateCategoryOptions();
    this.updateCategoryFilter();
    this.setToday();
    this.updateUI();
    this.initializeCharts();
    this.updateCharts();
    this.updateStorageStats();
    setTimeout(()=>document.getElementById('transactionList')?.classList.remove('skeleton'),350);
  }

  bindEvents(){
    // sidebar nav
    document.querySelectorAll('.nav-item').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
        document.getElementById(`tab-${tab}`).classList.add('active');
        if (tab==='analytics') this.updateCharts();
        if (tab==='transactions') this.renderFullList();
      });
    });

    // sidebar toggle (mobile)
    document.getElementById('sidebarToggle').addEventListener('click', ()=>{
      const sb = document.getElementById('sidebar');
      sb.style.display = sb.style.display === 'block' ? '' : 'block';
    });

    // theme
    document.getElementById('themeToggle').addEventListener('click', ()=>{
      const html = document.documentElement;
      const now = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', now);
      localStorage.setItem('bt_theme', now);
      this.toast(`Thème ${now === 'dark' ? 'sombre' : 'clair'} activé`, 'info');
    });

    // search
    const debounced = this.debounce((v)=>{ this.searchQuery = v.trim().toLowerCase(); this.filterTransactions(); }, 200);
    document.getElementById('searchInput').addEventListener('input',(e)=>debounced(e.target.value));

    // form
    document.getElementById('transactionForm').addEventListener('submit', e=>{
      e.preventDefault();
      this.addTransaction();
    });
    document.getElementById('type-income').addEventListener('change',()=>this.updateCategoryOptions());
    document.getElementById('type-expense').addEventListener('change',()=>this.updateCategoryOptions());

    // filters
    ['typeFilter','categoryFilter','dateFilter'].forEach(id=>{
      document.getElementById(id).addEventListener('change',()=>this.filterTransactions());
    });

    // budget modal
    document.getElementById('addBudgetBtn').addEventListener('click',()=>this.openBudgetModal());
    document.querySelector('.modal .close').addEventListener('click',()=>this.closeBudgetModal());
    document.getElementById('budgetForm').addEventListener('submit', e=>{
      e.preventDefault(); this.addBudget();
    });
    window.addEventListener('click', (e)=>{ if(e.target.id==='budgetModal') this.closeBudgetModal(); });

    // data actions
    document.getElementById('exportBtn').addEventListener('click', ()=>this.exportData());
    document.getElementById('importBtn').addEventListener('click', ()=>this.importData());
    document.getElementById('resetBtn').addEventListener('click', ()=>this.resetData());

    // shortcuts
    window.addEventListener('keydown', (e)=>{
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase()==='e'){ e.preventDefault(); this.exportData(); }
      if (mod && e.key.toLowerCase()==='i'){ e.preventDefault(); this.importData(); }
      if (mod && e.key.toLowerCase()==='b'){ e.preventDefault(); document.getElementById('addBudgetBtn').click(); }
      if (mod && e.key.toLowerCase()==='k'){ e.preventDefault(); document.getElementById('searchInput').focus(); }
    });
  }

  applySavedTheme(){
    const saved = localStorage.getItem('bt_theme');
    document.documentElement.setAttribute('data-theme', saved || 'light');
  }

  setToday(){ document.getElementById('date').valueAsDate = new Date(); }

  saveData(){
    storageManager.saveAllData({ transactions:this.transactions, budgets:this.budgets });
    this.markSaved();
    this.updateStorageStats();
  }

  markSaved(){
    const el = document.getElementById('autosaveStatus');
    if(!el) return;
    el.classList.add('saved');
    el.querySelector('.label').textContent = 'Enregistré';
    setTimeout(()=>{ el.classList.remove('saved'); }, 600);
  }

  // ===== Transactions =====
  addTransaction(){
    const type = document.querySelector('input[name="type"]:checked').value;
    const title = document.getElementById('title').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value || new Date().toISOString().split('T')[0];
    const description = document.getElementById('description').value.trim();
    const budgetCategory = document.getElementById('budget-category').value;

    const t = { id:this.nextId++, type, title, amount, category, date, description, budgetCategory, createdAt:new Date().toISOString() };
    const errors = validateTransaction(t);
    if (errors.length){ this.toast(errors[0], 'error'); return; }

    this.transactions.push(t);
    this.saveData();
    document.getElementById('transactionForm').reset();
    this.setToday();
    this.updateUI();
    this.toast('Transaction ajoutée', 'success');
  }

  deleteTransaction(id){
    if(!confirm('Supprimer cette transaction ?')) return;
    this.transactions = this.transactions.filter(t=>t.id!==id);
    this.saveData();
    this.updateUI();
    this.toast('Transaction supprimée', 'success');
  }

  // ===== Budgets =====
  addBudget(){
    const name = document.getElementById('budget-name').value.trim();
    const amount = parseFloat(document.getElementById('budget-amount').value);
    const period = document.getElementById('budget-period').value;
    const category = document.getElementById('budget-category-select').value;
    const b = { id:this.nextBudgetId++, name, amount, period, category, createdAt:new Date().toISOString() };
    if (!name || !(amount>0)){ this.toast('Nom et montant requis', 'error'); return; }

    this.budgets.push(b);
    this.saveData();
    this.updateUI();
    this.closeBudgetModal();
    this.toast('Budget créé', 'success');
  }

  deleteBudget(id){
    if(!confirm('Supprimer ce budget ?')) return;
    this.budgets = this.budgets.filter(b=>b.id!==id);
    this.saveData();
    this.updateUI();
    this.toast('Budget supprimé', 'success');
  }

  // ===== UI =====
  updateUI(){
    this.updateStats();
    this.updateCategoryFilter();
    this.filterTransactions();
    this.updateBudgets();
    this.updateCharts();
  }

  updateStats(){
    const now = new Date(), m = now.getMonth(), y = now.getFullYear();
    const current = this.transactions.filter(t=>{ const d=new Date(t.date); return d.getMonth()===m && d.getFullYear()===y; });
    const income = current.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const expenses = current.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    const balance = income - expenses;
    document.getElementById('totalIncome').textContent = formatCurrency(income);
    document.getElementById('totalExpenses').textContent = formatCurrency(expenses);
    document.getElementById('totalBalance').textContent = formatCurrency(balance);

    const totalBudget = this.budgets.filter(b=>b.period==='monthly').reduce((s,b)=>s+b.amount,0);
    const remaining = totalBudget - expenses;
    document.getElementById('remainingBudget').textContent = formatCurrency(remaining);
    const pct = totalBudget>0 ? Math.min((expenses/totalBudget)*100, 100) : 0;
    document.getElementById('budgetProgress').style.width = `${pct}%`;

    // quick stats
    const s = calculateStatistics(this.transactions, 'month');
    const qs = document.getElementById('quickStats');
    qs.innerHTML = `
      <span class="pill"><i class="fa-solid fa-arrow-trend-up"></i> ${formatCurrency(s.income)} revenus</span>
      <span class="pill"><i class="fa-solid fa-cart-shopping"></i> ${formatCurrency(s.expenses)} dépenses</span>
      <span class="pill"><i class="fa-solid fa-scale-balanced"></i> ${formatCurrency(s.balance)} solde</span>
      <span class="pill"><i class="fa-solid fa-receipt"></i> ${s.transactionCount} opérations</span>
    `;
  }

  displayTransactions(list, targetId='transactionList'){
    const el = document.getElementById(targetId);
    if (!list.length){
      el.innerHTML = `<div class="pill"><i class="fa-regular fa-face-meh-blank"></i> Aucune transaction</div>`;
      return;
    }
    list.sort((a,b)=> new Date(b.date) - new Date(a.date));
    el.innerHTML = list.map(t=>`
      <div class="transaction-item">
        <div>
          <div class="transaction-title">${escapeHtml(t.title)}</div>
          <div class="transaction-meta">${this.getCategoryLabel(t.category)} · ${formatDate(t.date)}${t.description ? ' · ' + escapeHtml(t.description) : ''}</div>
        </div>
        <div class="transaction-amount ${t.type==='income'?'income-amount':'expense-amount'}">${t.type==='income'?'+':'-'}${formatCurrency(t.amount).replace('-', '')}</div>
        <div><button class="btn btn-danger" title="Supprimer" onclick="app.deleteTransaction(${t.id})"><i class="fa-solid fa-trash"></i></button></div>
      </div>
    `).join('');
  }

  filterTransactions(){
    const type = document.getElementById('typeFilter').value;
    const cat = document.getElementById('categoryFilter').value;
    const date = document.getElementById('dateFilter').value;
    let list = this.transactions;

    if (this.searchQuery){
      const q = this.searchQuery;
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description||'').toLowerCase().includes(q) ||
        this.getCategoryLabel(t.category).toLowerCase().includes(q)
      );
    }
    if (type!=='all') list = list.filter(t=>t.type===type);
    if (cat!=='all') list = list.filter(t=>t.category===cat);

    if (date!=='all'){
      const now = new Date();
      list = list.filter(t=>{
        const d = new Date(t.date);
        if (date==='today') return d.toDateString()===now.toDateString();
        if (date==='week'){ const start = new Date(now); start.setDate(now.getDate()-now.getDay()); return d>=start; }
        if (date==='month') return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
        return true;
      });
    }

    this.displayTransactions(list, 'transactionList');
    this.renderFullList(list);
  }

  renderFullList(list = this.transactions){
    this.displayTransactions([...list], 'transactionListFull');
  }

  updateBudgets(){
    const el = document.getElementById('budgetsList');
    if (!this.budgets.length){
      el.innerHTML = `<div class="pill"><i class="fa-solid fa-circle-info"></i> Aucun budget défini</div>`;
      return;
    }
    el.innerHTML = this.budgets.map(b=>{
      const spent = this.transactions
        .filter(t=>t.type==='expense' && (b.category==='all'|| t.category===b.category))
        .reduce((s,t)=>s+t.amount,0);
      const remaining = b.amount - spent;
      const pct = Math.min((spent/b.amount)*100, 100);
      const color = pct>90? 'var(--danger)' : pct>70 ? 'var(--warning)' : 'var(--success)';
      return `
        <div class="panel" style="border-radius:12px;border:1px solid var(--border)">
          <div class="panel-head"><h4 style="margin:0">${escapeHtml(b.name)}</h4><div>${formatCurrency(b.amount)}</div></div>
          <div class="progress"><div class="progress-fill" style="width:${pct}%; background:${color}"></div></div>
          <div class="quick-stats" style="margin-top:8px">
            <span class="pill">Dépensé: ${formatCurrency(spent)}</span>
            <span class="pill">Restant: ${formatCurrency(remaining)}</span>
            <span class="pill">${b.period}</span>
            <span class="pill">${this.getCategoryLabel(b.category)}</span>
          </div>
          <div style="margin-top:10px"><button class="btn btn-danger" onclick="app.deleteBudget(${b.id})"><i class="fa-solid fa-trash"></i> Supprimer</button></div>
        </div>
      `;
    }).join('');
  }

  updateCategoryOptions(){
    const type = document.querySelector('input[name="type"]:checked').value;
    const select = document.getElementById('category');
    const options = type==='income'
      ? ['salary','freelance','investment','other-income']
      : ['housing','food','transport','entertainment','health','education','other-expense'];
    select.innerHTML = '<option value="">Sélectionner…</option>' + options.map(c=>`<option value="${c}">${this.getCategoryLabel(c)}</option>`).join('');
  }

  updateCategoryFilter(){
    const select = document.getElementById('categoryFilter');
    const cats = ['salary','freelance','investment','other-income','housing','food','transport','entertainment','health','education','other-expense'];
    select.innerHTML = '<option value="all">Toutes catégories</option>' + cats.map(c=>`<option value="${c}">${this.getCategoryLabel(c)}</option>`).join('');
  }

  getCategoryLabel(c){
    const m = {
      'salary':'Salaire','freelance':'Freelance','investment':'Investissement','other-income':'Autre revenu',
      'housing':'Logement','food':'Alimentation','transport':'Transport','entertainment':'Loisirs',
      'health':'Santé','education':'Éducation','other-expense':'Autre dépense','all':'Toutes'
    };
    return m[c] || c;
  }

  // ===== Charts integration =====
  initializeCharts(){ if (typeof initializeCharts==='function') initializeCharts(); }
  updateCharts(){ if (typeof updateCharts==='function') updateCharts(this.transactions); }

  // ===== Data actions =====
  exportData(){
    const data = { transactions:this.transactions, budgets:this.budgets, exportedAt:new Date().toISOString(), version:'2.0' };
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `budgettracker-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    this.toast('Export effectué', 'success');
  }

  importData(){
    const input = document.createElement('input');
    input.type='file'; input.accept='.json';
    input.onchange = e=>{
      const file = e.target.files?.[0]; if(!file) return;
      const r = new FileReader();
      r.onload = ()=>{
        try{
          const d = JSON.parse(r.result);
          if (!Array.isArray(d.transactions)) throw new Error('format invalide');
          this.transactions = d.transactions;
          this.budgets = d.budgets || [];
          if (this.transactions.length) this.nextId = Math.max(...this.transactions.map(t=>t.id))+1;
          if (this.budgets.length) this.nextBudgetId = Math.max(...this.budgets.map(b=>b.id))+1;
          this.saveData(); this.updateUI();
          this.toast('Import réussi', 'success');
        }catch(err){ this.toast('Erreur import: ' + err.message, 'error'); }
      };
      r.readAsText(file);
    };
    input.click();
  }

  resetData(){
    if(!confirm('Supprimer toutes les données ?')) return;
    this.transactions = []; this.budgets = []; this.nextId=1; this.nextBudgetId=1;
    this.saveData(); this.updateUI();
    this.toast('Données réinitialisées', 'success');
  }

  // ===== Helpers =====
  toast(msg, type='info'){
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fa-solid ${type==='success'?'fa-check':'fa-circle-info'}"></i> <span>${escapeHtml(msg)}</span>`;
    document.body.appendChild(t);
    setTimeout(()=>t.remove(), 3000);
  }

  debounce(fn, ms){ let to=null; return (...a)=>{ clearTimeout(to); to=setTimeout(()=>fn(...a), ms); }; }
}

// Global
let app;
document.addEventListener('DOMContentLoaded', ()=>{
  app = new BudgetTracker();
});
