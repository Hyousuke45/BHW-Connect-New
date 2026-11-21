// Demo data seeder — ported from the original app so the demo matches 1:1
import { PUROKS, GROWTH_STATUS, VITA_STATUS, DEWORM_STATUS, PREG_STATUS, VACCINES, VACCINE_CATS,
  FP_METHODS, IMM_STATUS, MON_STATUS, HEALTH_STATUS, MONTHS, REP_SHEETS } from './constants'
import { today, addDays, age, ageYears, daysFromToday, padId, uid, nowTime, rnd, pick, monStatusOf, fmtDate } from './utils'

const LASTNAMES = ['Anlingcao', 'Belarma', 'Delco', 'Delicana', 'Galendez', 'Icari', 'Macote', 'Magdasal', 'Mansaloon', 'Mirasol', 'Moreno', 'Sabuan', 'Suarez', 'Suscano', 'Velarde', 'Bandejas', 'Bercede', 'Bueno', 'Calapuan', 'Canog', 'Cano', 'Flora', 'Gallur', 'Hernandez', 'Libria', 'Maglantay', 'Miral', 'Pombo', 'Porcaraye', 'Quia-ot', 'Repayo', 'Tadlas', 'Tormis']
const FIRST_M = ['Juan', 'Pedro', 'Jose', 'Antonio', 'Miguel', 'Ricardo', 'Ernesto', 'Domingo', 'Rafael', 'Andres', 'Marco', 'Lito', 'Berto', 'Rolando', 'Efren', 'Noel', 'Christopher', 'Jomar', 'Kenneth', 'Danilo']
const FIRST_F = ['Maria', 'Juana', 'Ana', 'Lourdes', 'Carmen', 'Rosa', 'Teresita', 'Gloria', 'Marilou', 'Elena', 'Josephine', 'Rowena', 'Shiela', 'Marites', 'Aileen', 'Grace', 'Jocelyn', 'Nenita', 'Lorna', 'Divina']
const STREETS = ['Sitio Riverside', 'Purok Sitio Proper', 'Kamagong St.', 'Narra Street', 'Molave St.', 'Highway Front', 'Hilltop Road', 'Acacia Lane', 'Bougainvillea St.', 'Sampaguita St.']

export function seedData() {
  const db = {
    households: [], residents: [], records: [], monitoring: [], visits: [], activities: [], notifs: [],
    report: {}, counters: { hh: 1, res: 1, rec: 1, mon: 1, vis: 1 },
    // Demo login accounts (mockup data — real deployments auth via Supabase)
    users: [
      {
        fullName: 'Juan D. Dela Cruz', username: 'bhw.banlag', role: 'Barangay Health Worker',
        barangay: 'Brgy. Banlag', purok: 'Purok 3', contact: '0921 445 8890', email: 'juan.delacruz@banlag-bhw.ph',
        status: 'Active', dateCreated: '2024-06-15', password: 'bhw123',
      },
      {
        fullName: 'Ana L. Anlingcao', username: 'bhw.anlingcao', role: 'Barangay Health Worker',
        barangay: 'Brgy. Banlag', purok: 'Purok 1', contact: '0917 302 1188', email: 'ana.anlingcao@banlag-bhw.ph',
        status: 'Active', dateCreated: '2024-07-02', password: 'bhw123',
      },
      {
        fullName: 'Yusor B. Belarma', username: 'bhw.belarma', role: 'Barangay Health Worker',
        barangay: 'Brgy. Banlag', purok: 'Purok 2', contact: '0920 664 7431', email: 'yusor.belarma@banlag-bhw.ph',
        status: 'Active', dateCreated: '2024-07-02', password: 'bhw123',
      },
      {
        fullName: 'Sofia R. Delco', username: 'bhw.delco', role: 'Barangay Health Worker',
        barangay: 'Brgy. Banlag', purok: 'Purok 4', contact: '0939 118 2045', email: 'sofia.delco@banlag-bhw.ph',
        status: 'Active', dateCreated: '2024-08-19', password: 'bhw123',
      },
      {
        fullName: 'Elena T. Icari', username: 'bhw.icari', role: 'Barangay Health Worker',
        barangay: 'Brgy. Banlag', purok: 'Purok 5', contact: '0908 552 3376', email: 'elena.icari@banlag-bhw.ph',
        status: 'Active', dateCreated: '2024-09-01', password: 'bhw123',
      },
      {
        fullName: 'Vilma G. Macote', username: 'bhw.macote', role: 'Barangay Health Worker',
        barangay: 'Brgy. Banlag', purok: 'Purok 6', contact: '0912 887 9610', email: 'vilma.macote@banlag-bhw.ph',
        status: 'Active', dateCreated: '2024-09-14', password: 'bhw123',
      },
      {
        fullName: 'Sheila Mae I. Uy', username: 'rhm.uy', role: 'Rural Health Midwife',
        barangay: 'Brgy. Banlag', purok: 'All Puroks', contact: '0918 220 4455', email: 'sheila.uy@banlag-bhs.ph',
        status: 'Active', dateCreated: '2024-01-10', password: 'rhm123',
      },
      {
        fullName: 'Municipal IT Admin', username: 'admin.banlag', role: 'System Administrator',
        barangay: 'Brgy. Banlag', purok: 'All Puroks', contact: '0935 000 1122', email: 'admin@banlag-bhw.ph',
        status: 'Active', dateCreated: '2024-01-10', password: 'admin123',
      },
    ],
    // The signed-in account (set at login; defaults to the first BHW)
    user: null,
  }
  db.user = db.users[0]


  // --- Households: 24 across puroks ---
  const hhSeen = {}
  for (let i = 0; i < 24; i++) {
    let headLast = pick(LASTNAMES)
    while (hhSeen[headLast]) headLast = pick(LASTNAMES)
    hhSeen[headLast] = true
    const purokIdx = rnd(PUROKS.length)
    const headFirst = pick(Math.random() < .5 ? FIRST_M : FIRST_F)
    const hh = {
      id: padId(db.counters.hh, 'HH-'),
      headFirst, headLast, head: headFirst + ' ' + headLast,
      houseNum: ('BLK ' + (2 + rnd(28)) + ' LT ' + (1 + rnd(40))),
      street: pick(STREETS), barangay: 'Brgy. Banlag',
      purok: PUROKS[purokIdx], contact: '09' + String(1000000 + rnd(8999999)).slice(0, 9),
      dateReg: addDays(today(), -(5 + rnd(400))), members: 0, remarks: '',
    }
    db.households.push(hh)
    db.counters.hh++

    // --- Members: head + 1-5 others ---
    const memberCount = 1 + rnd(5)
    const usedFirst = {}
    usedFirst[headFirst] = 1
    db.residents.push({
      id: padId(db.counters.res, 'RES-'), hhId: hh.id,
      name: hh.head, birthdate: addDays(today(), -(9000 + rnd(16000))),
      sex: FIRST_M.indexOf(headFirst) >= 0 ? 'Male' : 'Female',
      relation: 'Household Head', civil: pick(['Married', 'Married', 'Widowed', 'Single']),
      occupation: pick(['Farmer', 'Housewife', 'Fisherman', 'Vendor', 'Teacher', 'Driver', 'Carpenter', 'Sari-sari store owner', 'Laborer', 'Retired', 'None']),
      contact: hh.contact, remarks: 'Household head of ' + hh.id,
    })
    db.counters.res++
    for (let m = 1; m < memberCount; m++) {
      const rel = pick(['Spouse', 'Son', 'Daughter', 'Son', 'Daughter', 'Parent', 'Grandparent', 'Grandchild', 'Relative'])
      const isChild = (rel === 'Son' || rel === 'Daughter' || rel === 'Grandchild')
      let fname = pick(isChild ? (rel === 'Son' || rel === 'Grandchild' ? FIRST_M : FIRST_F) : (Math.random() < .5 ? FIRST_M : FIRST_F))
      if (usedFirst[fname]) fname = pick(usedFirst[fname] ? FIRST_F : FIRST_M)
      usedFirst[fname] = 1
      const bd = isChild ? addDays(today(), -(30 + rnd(5850)))
        : (rel === 'Spouse' ? addDays(today(), -(7600 + rnd(10000))) : addDays(today(), -(11000 + rnd(16000))))
      let secsex = (rel === 'Son' || rel === 'Grandchild') ? 'Male' : (rel === 'Daughter' ? 'Female' : (Math.random() < .5 ? 'Male' : 'Female'))
      if (rel === 'Spouse') secsex = db.residents[db.residents.length - 1].sex === 'Male' ? 'Female' : 'Male'
      db.residents.push({
        id: padId(db.counters.res, 'RES-'), hhId: hh.id,
        name: fname + ' ' + headLast, birthdate: bd, sex: secsex, relation: rel,
        civil: isChild ? 'Single' : pick(['Married', 'Married', 'Single', 'Widowed', 'Separated']),
        occupation: isChild ? 'Student' : pick(['Farmer', 'Housewife', 'Vendor', 'Teacher', 'Driver', 'Tailor', 'Barangay employee', 'None']),
        contact: isChild ? '' : '09' + String(1000000 + rnd(8999999)).slice(0, 9), remarks: '',
      })
      db.counters.res++
    }
    hh.members = db.residents.filter(r => r.hhId === hh.id).length
  }


  function addActivity(type, desc, resName, d, daysAgo) {
    db.activities.unshift({
      id: uid(), type, desc, resName: resName || '', date: d,
      time: daysAgo === 0 ? nowTime() : String(8 + rnd(9)).padStart(2, '0') + ':' + String(rnd(59)).padStart(2, '0'),
    })
  }

  const residents = db.residents
  // Child Health records
  const children = residents.filter(r => ageYears(r.birthdate) < 6 && ageYears(r.birthdate) >= 0)
  children.slice(0, 22).forEach(ch => {
    const w = (3 + rnd(12)) + (ageYears(ch.birthdate) < 1 ? (2 + rnd(6)) : 0), hcm = (48 + rnd(45))
    db.records.push({
      id: padId(db.counters.rec, 'CHR-'), cat: 'Child Health',
      resId: ch.id, resName: ch.name, hhId: ch.hhId, age: age(ch.birthdate), sex: ch.sex,
      weight: Math.round(w * 10) / 10, height: hcm, measureDate: addDays(today(), -(3 + rnd(85))),
      growth: pick(GROWTH_STATUS), vita: pick(VITA_STATUS), deworm: pick(DEWORM_STATUS),
      feeding: pick(['Breastfeeding', 'Complementary feeding', 'Solid foods', 'Formula-fed', 'Breastmilk + solids', '']),
      notes: '', nextMon: addDays(today(), rnd(45) - 10), remarks: '', status: pick(['Active', 'Under Observation', 'Active', 'Completed']),
      dateRecorded: addDays(today(), -(5 + rnd(90))),
    })
    db.counters.rec++
  })
  // Maternal
  const women = residents.filter(r => r.sex === 'Female' && ageYears(r.birthdate) >= 18 && ageYears(r.birthdate) <= 44)
  women.slice(0, 14).forEach(w => {
    db.records.push({
      id: padId(db.counters.rec, 'MHR-'), cat: 'Maternal Health',
      resId: w.id, resName: w.name, hhId: w.hhId, age: age(w.birthdate), sex: 'Female',
      pregStatus: pick(PREG_STATUS), regDate: addDays(today(), -(20 + rnd(150))),
      edd: Math.random() < .62 ? addDays(today(), rnd(120) - 45) : '',
      pregInfo: '', prenatalDate: addDays(today(), -(5 + rnd(60))),
      prenatalDetails: pick(['BP normal, weight +2kg', 'Iron given, counseling done', 'BP 110/70, FHT positive', 'Nutrition counseling, vitamins given', 'Weight monitoring, no complaints']),
      bp: pick(['110/70', '120/80', '100/65', '115/75', '130/85']),
      notes: '', followUp: addDays(today(), rnd(40) - 8),
      maternalStatus: pick(['On Track', 'Due Soon', 'On Track', 'Completed']), remarks: '',
      status: pick(['Active', 'Under Observation', 'Active', 'Completed']), dateRecorded: addDays(today(), -(10 + rnd(100))),
    })
    db.counters.rec++
  })
  // Immunization
  residents.slice(0, 90).forEach(r => {
    if (ageYears(r.birthdate) > 2 && Math.random() < .72) return
    const vac = pick(VACCINES)
    db.records.push({
      id: padId(db.counters.rec, 'IMR-'), cat: 'Immunization',
      resId: r.id, resName: r.name, hhId: r.hhId, age: age(r.birthdate), sex: r.sex,
      vaccine: vac, vacCat: pick(VACCINE_CATS), dose: 1 + rnd(3),
      dateAdmin: addDays(today(), -(1 + rnd(120))), administeredBy: 'RHM Shiela Mae I. Uy, RM',
      nextSched: Math.random() < .75 ? addDays(today(), rnd(60) - 5) : '',
      immStatus: pick(IMM_STATUS), remarks: '', status: pick(['Active', 'Completed', 'Active', 'Pending']),
      dateRecorded: addDays(today(), -(1 + rnd(120))),
    })
    db.counters.rec++
  })
  // Family Planning
  const mwra = women.filter(w => ageYears(w.birthdate) >= 15 && ageYears(w.birthdate) <= 49)
  mwra.slice(0, 16).forEach(w => {
    db.records.push({
      id: padId(db.counters.rec, 'FPR-'), cat: 'Family Planning',
      resId: w.id, resName: w.name, hhId: w.hhId, age: age(w.birthdate), sex: 'Female',
      method: pick(FP_METHODS), regDate: addDays(today(), -(30 + rnd(300))),
      methodStart: addDays(today(), -(20 + rnd(280))), lastVisit: addDays(today(), -(2 + rnd(45))),
      followUp: addDays(today(), rnd(50) - 6), fpStatus: pick(['New Acceptor', 'Current User', 'Current User', 'Drop-out', 'Follow-up']),
      visitInfo: '', nhts: Math.random() < .55, remarks: '',
      status: pick(['Active', 'Active', 'Completed', 'Follow-up Required']), dateRecorded: addDays(today(), -(5 + rnd(120))),
    })
    db.counters.rec++
  })
  // Other health records
  residents.slice(0, 40).forEach(r => {
    if (Math.random() < .5) return
    const cond = pick(['Hypertension', 'Diabetes (Type 2)', 'Asthma', 'Malnutrition (moderate)', 'TB symptoms', 'Anemia', 'Wound/Injury follow-up', 'Skin infection', 'URI', 'Arthritis', 'Eye irritation', 'Dental concern'])
    db.records.push({
      id: padId(db.counters.rec, 'OHR-'), cat: 'Other Health Records',
      resId: r.id, resName: r.name, hhId: r.hhId, age: age(r.birthdate), sex: r.sex,
      otherCat: pick(['Chronic Disease', 'Injury', 'Nutrition', 'Infectious Disease', 'General Consultation']),
      dateRecorded: addDays(today(), -(2 + rnd(90))),
      condition: cond, info: 'Monitored by BHW; referred to BHS for check-up.',
      status: pick(HEALTH_STATUS), followUp: Math.random() < .6 ? addDays(today(), rnd(30) - 5) : '', remarks: '',
    })
    db.counters.rec++
  })

  // --- Monitoring (from records needing follow-up) ---
  db.records.forEach(rc => {
    let next = null, type = null
    if (rc.cat === 'Child Health' && rc.nextMon) { next = rc.nextMon; type = 'Child Growth' }
    else if (rc.cat === 'Maternal Health' && rc.followUp) { next = rc.followUp; type = 'Maternal Health' }
    else if (rc.cat === 'Immunization' && rc.nextSched) { next = rc.nextSched; type = 'Immunization' }
    else if (rc.cat === 'Family Planning' && rc.followUp) { next = rc.followUp; type = 'Family Planning Follow-up' }
    else if (rc.cat === 'Other Health Records' && rc.followUp) { next = rc.followUp; type = 'General Health Follow-up' }
    if (!next || Math.random() < .3) return
    let st = monStatusOf(next, null)
    if (st === 'Completed' && Math.random() < .5) st = 'Completed'
    const mon = {
      id: padId(db.counters.mon, 'MON-'), resId: rc.resId, resName: rc.resName, hhId: rc.hhId,
      type, dateStart: rc.dateRecorded || addDays(today(), -(5 + rnd(60))),
      lastVisit: addDays(next, -(10 + rnd(25))), nextSched: next, status: st,
      healthUpdate: '', notes: '', remarks: '', recId: rc.id,
    }
    db.monitoring.push(mon); db.counters.mon++
    const nv = 1 + rnd(3)
    for (let v = 0; v < nv; v++) {
      db.visits.push({
        id: uid(), monId: mon.id, date: addDays(next, -((v + 1) * (10 + rnd(12)))),
        type: pick(['Scheduled', 'Follow-up']), update: pick(['Stable, no complaints', 'Improving; advised rest', 'Weight increased slightly', 'BP within normal range', 'Medication refilled', 'Growth improving']),
        notes: '', followUpNeeded: Math.random() < .5 ? 'Yes' : 'No', nextSch: addDays(next, -((v) * (10 + rnd(12)))) || '', status: pick(MON_STATUS),
      })
    }
  })
  db.monitoring.sort((a, b) => (a.nextSched < b.nextSched ? -1 : 1))

  // --- Activities ---
  const actDefs = [
    ['household', 'Household Added', 'New household registered'],
    ['member', 'Resident Registered', 'New household member registered'],
    ['record', 'Health Record Updated', 'Resident health information updated'],
    ['monitoring', 'Monitoring Added', 'New monitoring schedule created'],
    ['visit', 'Follow-up Recorded', 'Monitoring visit recorded'],
  ]
  for (let a = 0; a < 9; a++) {
    const d = actDefs[rnd(actDefs.length)]
    const res = pick(residents)
    addActivity(d[0], d[2], res.name, addDays(today(), -rnd(5)), a)
  }

  // --- Notifications ---
  const soon = db.monitoring.filter(m => daysFromToday(m.nextSched) >= 0 && daysFromToday(m.nextSched) <= 3)
  soon.slice(0, 3).forEach(m => {
    db.notifs.push({ id: uid(), icon: 'cal', title: 'Monitoring due: ' + m.resName, desc: m.type + ' — ' + fmtDate(m.nextSched), date: today(), time: '08:30', read: false })
  })
  const od = db.monitoring.filter(m => m.status === 'Overdue')
  if (od.length) db.notifs.push({ id: uid(), icon: 'warn', title: 'Overdue monitoring', desc: od.length + ' resident(s) have overdue monitoring schedules', date: today(), time: '08:00', read: false })
  db.notifs.push({ id: uid(), icon: 'info', title: 'Monthly report due', desc: 'BHW Monthly Report for this month is ready for encoding', date: today(), time: '07:45', read: false })
  db.notifs.push({ id: uid(), icon: 'sheet', title: 'Welcome to BHW Connect', desc: 'Centralized health records now available', date: addDays(today(), -2), time: '09:12', read: true })

  // --- Monthly report data: per-BHW counters per month ---
  db.report = {}
  MONTHS.forEach(mo => {
    db.report[mo] = {}
    Object.keys(REP_SHEETS).forEach(sk => {
      const sh = REP_SHEETS[sk]
      const moData = {}
      sh.groups.forEach(gr => gr.rows.forEach(row => {
        const key = row[1]
        if (sk === 'fp') { moData[key] = rnd(9); moData[key + '_nhts'] = rnd(Math.max(1, moData[key] + 1)) }
        else if (key === 'del_10_14') { moData[key] = rnd(2) }
        else if (key === 'del_15_19') { moData[key] = rnd(4) }
        else if (key === 'del_20_49') { moData[key] = rnd(9) }
        else { moData[key] = rnd(24) }
      }))
      db.report[mo][sk] = moData
    })
  })
  db.reportBHS = 'BHS: BANLAG'; db.reportRHM = 'SHEILA MAE I. UY, RM'
  return db
}

// Per-BHW report values (mode "purok" stores under "<month>__<BHW name>")
export function seedReportValues(db) {
  const out = {}
  MONTHS.forEach(mo => {
    Object.keys(REP_SHEETS).forEach(sk => {
      const sh = REP_SHEETS[sk]
      sh.groups.forEach(gr => gr.rows.forEach(row => {
        const key = row[1]
        if (sk === 'fp') { out[key] = rnd(9); out[key + '_nhts'] = rnd(Math.max(1, out[key] + 1)) }
        else if (key === 'del_10_14') { out[key] = rnd(2) }
        else if (key === 'del_15_19') { out[key] = rnd(4) }
        else if (key === 'del_20_49') { out[key] = rnd(9) }
        else { out[key] = rnd(24) }
      }))
    })
    // distribute across BHWs
    const bhwData = {}
    for (const bn of ['Anlingcao A.', 'Belarma Y.']) {
      const d = {}
      Object.keys(out).forEach(k => { d[k] = Math.max(0, out[k] - rnd(3)) })
      bhwData[bn] = d
    }
    ;['Delco S.', 'Icari E.', 'Macote V.', 'Sabuan I.', 'Velarde M.'].forEach(bn => {
      const d = {}
      Object.keys(out).forEach(k => { d[k] = rnd(Math.max(1, Math.ceil(out[k] / 3))) })
      bhwData[bn] = d
    })
    out.__bhws = bhwData
  })
  return out
}


