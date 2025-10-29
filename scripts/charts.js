// Charts v4
let expensesChart, monthlyChart, comparisonChart;

function initializeCharts(){
  const e = document.getElementById('expensesChart').getContext('2d');
  const m = document.getElementById('monthlyChart').getContext('2d');
  const c = document.getElementById('comparisonChart').getContext('2d');

  expensesChart = new Chart(e, {
    type:'doughnut',
    data:{ labels:[], datasets:[{ data:[], backgroundColor:['#7c9cff','#22c55e','#ef4444','#f59e0b','#a78bfa','#14b8a6','#94a3b8'] }] },
    options:{ responsive:true, animation:{ animateRotate:true, duration:600 }, plugins:{ legend:{ position:'right' } } }
  });

  monthlyChart = new Chart(m, {
    type:'line',
    data:{
      labels:['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'],
      datasets:[
        {label:'Revenus', data:[], borderColor:'#22c55e', backgroundColor:'rgba(34,197,94,.15)', tension:.35, fill:true},
        {label:'Dépenses', data:[], borderColor:'#ef4444', backgroundColor:'rgba(239,68,68,.15)', tension:.35, fill:true}
      ]
    },
    options:{ responsive:true, scales:{ y:{ beginAtZero:true } }, plugins:{ legend:{ position:'top' } } }
  });

  comparisonChart = new Chart(c, {
    type:'bar',
    data:{ labels:[], datasets:[
      {label:'Revenus', data:[], backgroundColor:'#22c55e'},
      {label:'Dépenses', data:[], backgroundColor:'#ef4444'}
    ]},
    options:{ responsive:true, scales:{ y:{ beginAtZero:true } }, plugins:{ legend:{ position:'top' } } }
  });
}

function updateCharts(transactions){
  updateExpensesChart(transactions);
  updateMonthlyChart(transactions);
  updateComparisonChart(transactions);
}

function updateExpensesChart(transactions){
  const cats = {};
  transactions.filter(t=>t.type==='expense').forEach(t=>{ cats[t.category]=(cats[t.category]||0)+t.amount; });
  expensesChart.data.labels = Object.keys(cats).map(mapCat);
  expensesChart.data.datasets[0].data = Object.values(cats);
  expensesChart.update();
}

function updateMonthlyChart(transactions){
  const year = new Date().getFullYear();
  const inc = new Array(12).fill(0), exp = new Array(12).fill(0);
  transactions.forEach(t=>{
    const d=new Date(t.date);
    if (d.getFullYear()===year){
      const m=d.getMonth();
      if (t.type==='income') inc[m]+=t.amount; else exp[m]+=t.amount;
    }
  });
  monthlyChart.data.datasets[0].data = inc;
  monthlyChart.data.datasets[1].data = exp;
  monthlyChart.update();
}

function updateComparisonChart(transactions){
  const keys = ['housing','food','transport','entertainment','health','education','other-expense'];
  const inc = new Array(keys.length).fill(0);
  const exp = new Array(keys.length).fill(0);
  transactions.forEach(t=>{
    const i = keys.indexOf(t.category);
    if (i>-1){
      if (t.type==='income') inc[i]+=t.amount; else exp[i]+=t.amount;
    }
  });
  comparisonChart.data.labels = keys.map(mapCat);
  comparisonChart.data.datasets[0].data = inc;
  comparisonChart.data.datasets[1].data = exp;
  comparisonChart.update();
}

function mapCat(c){
  const m = {'salary':'Salaire','freelance':'Freelance','investment':'Investissement','other-income':'Autre revenu','housing':'Logement','food':'Alimentation','transport':'Transport','entertainment':'Loisirs','health':'Santé','education':'Éducation','other-expense':'Autre dépense'};
  return m[c]||c;
}
