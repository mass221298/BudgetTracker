// Formatting
function formatCurrency(amount, currency='EUR', locale='fr-FR'){
  return new Intl.NumberFormat(locale, { style:'currency', currency }).format(amount||0);
}
function formatDate(date, opts={}){
  const o = { year:'numeric', month:'short', day:'numeric', ...opts };
  return new Date(date).toLocaleDateString('fr-FR', o);
}
function escapeHtml(str=''){ return str.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m] )); }

// Validation
function validateTransaction(t){
  const errs = [];
  if (!t.title) errs.push('Le titre est requis');
  if (!(t.amount>0)) errs.push('Le montant doit être positif');
  if (!t.category) errs.push('La catégorie est requise');
  if (!t.date || isNaN(new Date(t.date).getTime())) errs.push('Date invalide');
  return errs;
}

// Analytics helpers
function calculateStatistics(transactions, period='month'){
  const now = new Date(); let start, end;
  if (period==='today'){ start=new Date(now.getFullYear(), now.getMonth(), now.getDate()); end=new Date(now.getFullYear(), now.getMonth(), now.getDate()+1); }
  else if (period==='week'){ start=new Date(now); start.setDate(now.getDate()-now.getDay()); end=new Date(start); end.setDate(start.getDate()+7); }
  else if (period==='year'){ start=new Date(now.getFullYear(),0,1); end=new Date(now.getFullYear()+1,0,1); }
  else { start=new Date(now.getFullYear(), now.getMonth(),1); end=new Date(now.getFullYear(), now.getMonth()+1,1); }
  const arr = transactions.filter(t=>{ const d=new Date(t.date); return d>=start && d<end; });
  const income = arr.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expenses = arr.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  return { period, startDate:start, endDate:end, income, expenses, balance:income-expenses, transactionCount:arr.length };
}
