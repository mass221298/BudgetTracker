// Utilitaires transactions (extensibles)
function calculateMonthlySummary(transactions, year, month){
  const monthly = transactions.filter(t=>{ const d=new Date(t.date); return d.getFullYear()===year && d.getMonth()===month; });
  const income = monthly.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expenses = monthly.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  return { income, expenses, balance: income-expenses, transactionCount: monthly.length };
}
if (typeof module!=='undefined' && module.exports){ module.exports = { calculateMonthlySummary }; }
