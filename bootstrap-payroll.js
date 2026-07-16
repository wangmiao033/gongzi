(() => {
  const KEY = 'payroll_attendance_system_v1';
  let current = null;
  try { current = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  const hasEmployees = current && Array.isArray(current.employees) && current.employees.length > 0;
  const hasMonths = current && current.months && Object.keys(current.months).length > 0;
  if (hasEmployees && hasMonths) return;

  const seed = {
    version: 5,
    companyName: '',
    currentMonth: '2026-06',
    settings: {
      standardDays: 21,
      salaryMode: 'fixed',
      fullAttendanceBonus: 0,
      latePenaltyPerCount: 0,
      latePenaltyPerMinute: 0,
      absentMultiplier: 2,
      social: {
        profileName: '广州 2026（按当前工资表申报口径）',
        personal: { pensionRate:8, medicalRate:2, unemploymentRate:0.2, housingRate:5 },
        employer: { pensionRate:16, medicalRate:5.35, unemploymentRate:0.8, injuryRate:0.2, housingRate:5 },
        bases: { pensionMin:5510,pensionMax:0,medicalMin:6234,medicalMax:0,unemploymentMin:2500,unemploymentMax:0,injuryMin:2500,injuryMax:0,housingMin:0,housingMax:0 },
        housingEnabled:false
      },
      tax: { autoEnabled:true, monthlyBasicDeduction:5000 }
    },
    employees: [
      { id:'e_lhj', name:'罗汉金', joinDate:'2023-05-15', baseSalaryPart:3000, performanceSalary:2500, baseSalary:5500, bankAccount:'6212253602073692875', socialBaseMode:'custom', socialDeclaredSalary:5500, socialBases:{pension:5510,medical:6234,unemployment:2500,injury:2500,housing:0}, housingEnabled:false, active:true, remark:'' },
      { id:'e_wwb', name:'吴伟滨', joinDate:'2024-06-17', baseSalaryPart:3000, performanceSalary:1900, baseSalary:4900, bankAccount:'6212263602112954821', socialBaseMode:'custom', socialDeclaredSalary:4900, socialBases:{pension:5510,medical:6234,unemployment:2500,injury:2500,housing:0}, housingEnabled:false, active:true, remark:'' },
      { id:'e_gh', name:'龚辉', joinDate:'2021-05-14', baseSalaryPart:3000, performanceSalary:4000, baseSalary:7000, bankAccount:'6222033602017530773', socialBaseMode:'custom', socialDeclaredSalary:7000, socialBases:{pension:5510,medical:6234,unemployment:2500,injury:2500,housing:0}, housingEnabled:false, active:true, remark:'' },
      { id:'e_mcm', name:'马纯敏', joinDate:'2023-12-01', baseSalaryPart:3000, performanceSalary:3000, baseSalary:6000, bankAccount:'', socialBaseMode:'custom', socialDeclaredSalary:6000, socialBases:{pension:5510,medical:6234,unemployment:2500,injury:2500,housing:0}, housingEnabled:false, active:true, remark:'' },
      { id:'e_wm', name:'王淼', joinDate:'', baseSalaryPart:0, performanceSalary:0, baseSalary:0, bankAccount:'6212260200053764219', socialBaseMode:'salary', socialDeclaredSalary:0, socialBases:{pension:0,medical:0,unemployment:0,injury:0,housing:0}, housingEnabled:false, active:false, remark:'工资结构待补充' },
      { id:'e_ljh', name:'李季鸿', joinDate:'', baseSalaryPart:0, performanceSalary:0, baseSalary:0, bankAccount:'6212253602059699290', socialBaseMode:'salary', socialDeclaredSalary:0, socialBases:{pension:0,medical:0,unemployment:0,injury:0,housing:0}, housingEnabled:false, active:false, remark:'工资结构待补充' }
    ],
    months: {
      '2026-06': {
        standardDays:21,
        salaryMode:'fixed',
        rows: {
          e_lhj:{attendanceDays:20.5,leaveDays:0,absentDays:0,lateCount:0,lateMinutes:0,compensation:0,fullAttendanceBonus:null,salaryAdjustment:0,bonus:0,probationSalary:0,birthdayExpense:0,physicalExpense:0,taxSupplement:0,pension:null,medical:null,unemployment:null,housing:null,leaveDeductionOverride:0,latePenaltyOverride:0,tax:0,note:'',actualSalaryOverride:5500},
          e_wwb:{attendanceDays:21,leaveDays:0,absentDays:0,lateCount:0,lateMinutes:0,compensation:0,fullAttendanceBonus:null,salaryAdjustment:0,bonus:0,probationSalary:0,birthdayExpense:0,physicalExpense:0,taxSupplement:0,pension:null,medical:null,unemployment:null,housing:null,leaveDeductionOverride:0,latePenaltyOverride:0,tax:0,note:'',actualSalaryOverride:4900},
          e_gh:{attendanceDays:21,leaveDays:0,absentDays:0,lateCount:0,lateMinutes:0,compensation:0,fullAttendanceBonus:null,salaryAdjustment:0,bonus:250,probationSalary:0,birthdayExpense:0,physicalExpense:0,taxSupplement:0,pension:null,medical:null,unemployment:null,housing:null,leaveDeductionOverride:0,latePenaltyOverride:0,tax:50.39,note:'',actualSalaryOverride:7000},
          e_mcm:{attendanceDays:20.5,leaveDays:0,absentDays:0,lateCount:0,lateMinutes:0,compensation:0,fullAttendanceBonus:null,salaryAdjustment:0,bonus:0,probationSalary:0,birthdayExpense:0,physicalExpense:0,taxSupplement:0,pension:null,medical:null,unemployment:null,housing:null,leaveDeductionOverride:0,latePenaltyOverride:0,tax:0,note:'',actualSalaryOverride:6000}
        }
      }
    }
  };
  localStorage.setItem(KEY, JSON.stringify(seed));
  sessionStorage.setItem('payroll_seed_restored', '1');
})();