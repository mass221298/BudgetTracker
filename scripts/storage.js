class StorageManager{
  constructor(){ this.key='budgetTracker_v2'; }
  saveAllData(data){
    try{
      const payload = { ...data, lastSaved:new Date().toISOString(), version:'2.0' };
      localStorage.setItem(this.key, JSON.stringify(payload));
      return true;
    }catch(e){ console.error('save error', e); return false; }
  }
  loadAllData(){
    try{
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : null;
    }catch(e){ console.error('load error', e); return null; }
  }
  stats(){
    const d = this.loadAllData();
    if (!d) return { size:0, transactions:0, budgets:0, lastSaved:null };
    return { size: new Blob([JSON.stringify(d)]).size, transactions: d.transactions?.length||0, budgets: d.budgets?.length||0, lastSaved: d.lastSaved||null };
  }
}
const storageManager = new StorageManager();

function updateStorageStats(){
  if (!window.app) return;
  const s = storageManager.stats();
  const el = document.getElementById('storageStats');
  if (el) el.innerHTML = `${s.transactions} tx • ${s.budgets} budgets<br><small>${s.lastSaved?('Dernier enregistrement : ' + new Date(s.lastSaved).toLocaleString('fr-FR')):'—'}</small>`;
}
