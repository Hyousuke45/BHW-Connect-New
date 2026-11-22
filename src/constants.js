// Shared constants — from the BHW CONNECT spec PDF + excels.xlsx
export const PUROKS = ['Purok 1', 'Purok 2', 'Purok 3', 'Purok 4', 'Purok 5', 'Purok 6']
export const RELATIONS = ['Household Head', 'Spouse', 'Son', 'Daughter', 'Parent', 'Grandparent', 'Grandchild', 'Relative', 'Other']
export const CIVIL = ['Single', 'Married', 'Widowed', 'Separated', 'Other']
export const HEALTH_STATUS = ['Active', 'Under Observation', 'Referred', 'Follow-up Required', 'Resolved', 'Completed']
export const IMM_STATUS = ['Scheduled', 'Completed', 'Pending', 'Missed Schedule']
export const MON_TYPES = ['Maternal Health', 'Child Growth', 'Immunization', 'General Health Follow-up', 'Family Planning Follow-up', 'Other']
export const MON_STATUS = ['On Track', 'Due Soon', 'Overdue', 'Completed']
export const VACCINES = ['BCG', 'Hepatitis B', 'Pentavalent (DPT-HepB-Hib)', 'OPV (Polio)', 'IPV', 'Measles-Mumps-Rubella', 'PCV', 'Rotavirus', 'Influenza', 'Typhoid']
export const VACCINE_CATS = ['BCG', 'HepB', 'DPT', 'Polio', 'MR/MCV', 'PCV', 'Other']
export const GROWTH_STATUS = ['Normal', 'Underweight', 'Stunted', 'Wasted', 'Overweight', 'Obese']
export const VITA_STATUS = ['Given (full dose)', 'Not given', 'Due this month', 'Scheduled']
export const DEWORM_STATUS = ['Given', 'Not given', 'Due this month', 'Scheduled']
export const FP_METHODS = ['BTL', 'Vasectomy', 'Pill (COC)', 'Pill (POP)', 'Injectables (DMPA)', 'LAM', 'IUD', 'Implanon', 'Condom', 'Standard Days Method (SDM)']
export const PREG_STATUS = ['Pregnant (Newly Registered)', 'Pregnant (Follow-up)', 'Post-partum', 'With Family Planning', 'Other']
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const BHW_NAMES = ['Anlingcao A.', 'Belarma Y.', 'Delco S.', 'Delicana J.', 'Galendez A.', 'Galendez T.', 'Icari E.', 'Macote V.', 'Magdasal J.', 'Mansaloon H.', 'Mirasol R.', 'Moreno G.', 'Sabuan I.', 'Suarez A.', 'Suscano M.', 'Velarde M.']

// BHW Monthly Report worksheet definitions — structure from excels.xlsx
export const REP_SHEETS = {
  vitA: {
    title: 'VITAMIN A & DEWORMING',
    groups: [
      { name: 'VITAMIN A SUPPLEMENTATION', rows: [
        ['1. Children 6-11 months old given Vit. A', 'vitA_6_11_given'],
        ['2. Children 6-11 months old not given Vit. A', 'vitA_6_11_not'],
        ['3. Children 12-59 months old given Vit. A', 'vitA_12_59_given'],
        ['4. Children 12-59 months old not given Vit. A', 'vitA_12_59_not']] },
      { name: 'IV. DEWORMING', rows: [
        ['1. Children 12-23 months old given', 'dw_12_23'],
        ['2. Children 24-59 months old given', 'dw_24_59']] },
      { name: 'III. FAMILY PLANNING & MWRA', rows: [
        ['1. Menopausal MWRA (15-49 y.o) had Hysterectomy', 'fp_menopausal'],
        ['2. Pregnant Women (Newly Registered)', 'fp_pregnant_new'],
        ['3. MWRA NOT using and NOT interested in using FP Method', 'fp_not_interested']] },
    ],
  },
  nip: {
    title: 'VACCINATION, NUTRITION & DELIVERIES',
    groups: [
      { name: 'I. VACCINATION STATUS OF CHILDREN 0-23 MONTHS', rows: [
        ['1. Vaccination status of children 0-11 months old', 'nip_vac_0_11'],
        ['2. Children 12 months old who are fully immunized (FIC)', 'nip_fic_12'],
        ['3. Children 13-23 months old with incomplete immunization', 'nip_incomplete_13_23']] },
      { name: 'II. TARGET AGE GROUPS', rows: [
        ['4. Number of Newborns (0-28 days)', 'nip_newborns'],
        ['5. Number of Infants (29 days to 11 months)', 'nip_infants'],
        ['6. Number of Underfive children (1-4 years old)', 'nip_underfive'],
        ['7. Number of School Age Children (5-9 years old)', 'nip_schoolage'],
        ['8. Number of Adolescents (10-19 years old)', 'nip_adolescents'],
        ['9. Post Partum Women (birth in last 6 months)', 'nip_postpartum'],
        ['10. PP given complete IRON', 'nip_pp_iron'],
        ['11. PP given VITAMIN A', 'nip_pp_vita'],
        ['12. Number of Deliveries', 'nip_deliveries']] },
      { name: 'DELIVERIES BY AGE GROUP & FACILITY', rows: [
        ['10-14 years old', null],
        ['   Male', 'del_10_14_male'],
        ['   Female', 'del_10_14_female'],
        ["   Gov't Hos", 'del_10_14_gov'],
        ['   PVT Hos', 'del_10_14_pvt'],
        ['   Lying-in', 'del_10_14_lying'],
        ['15-19 years old', null],
        ['   Male', 'del_15_19_male'],
        ['   Female', 'del_15_19_female'],
        ["   Gov't Hos", 'del_15_19_gov'],
        ['   PVT Hos', 'del_15_19_pvt'],
        ['   Lying-in', 'del_15_19_lying'],
        ['20-49 years old', null],
        ['   Male', 'del_20_49_male'],
        ['   Female', 'del_20_49_female'],
        ["   Gov't Hos", 'del_20_49_gov'],
        ['   PVT Hos', 'del_20_49_pvt'],
        ['   Lying-in', 'del_20_49_lying']] },
    ],
  },
  tb: {
    title: 'TB SURVEILLANCE',
    groups: [
      { name: 'A. PERSONS CURRENTLY WITH TB SYMPTOMS', rows: [
        ['1. But did NOT seek consultation or treatment', 'tb_no_consult'],
        ['2. Sought consultation/treatment in Private Sector', 'tb_private'],
        ['3. Sought consultation/treatment in the Public Sector', 'tb_public']] },
      { name: 'B. TREATMENT STATUS OF TB PATIENTS', rows: [
        ['4. NOT undergoing TB treatment', 'tb_not_treated'],
        ['5. UNDERGOING TB treatment', 'tb_treated']] },
      { name: 'C. PRIVATE SOURCES OF ANTI-TB DRUGS', rows: [
        ['6. Private hospital / clinic', 'tb_priv_hosp'],
        ['7. Pharmacy', 'tb_pharmacy'],
        ['8. Private doctor', 'tb_priv_doc'],
        ['9. NGO clinic', 'tb_ngo']] },
      { name: 'D. PUBLIC SOURCE OF ANTI-TB DRUGS', rows: [
        ['10. Government hospitals', 'tb_gov_hosp'],
        ['11. Rural / Urban Health Center', 'tb_rhu'],
        ['12. Barangay Health Station', 'tb_bhs'],
        ['13. Outreach clinic', 'tb_outreach']] },
      { name: 'E. TREATMENT PARTNERS', rows: [
        ['14. No treatment partner', 'tb_partner_none'],
        ['15. Health professional', 'tb_partner_hp'],
        ['16. Barangay Health Workers', 'tb_partner_bhw'],
        ['17. Community leaders / volunteers', 'tb_partner_comm'],
        ['18. Friends / neighbors', 'tb_partner_friends'],
        ['19. Family relatives', 'tb_partner_family']] },
    ],
  },
  fp: {
    title: 'FAMILY PLANNING — CURRENT USERS BY METHOD',
    groups: [
      { name: 'MODERN METHODS — CURRENT USERS', rows: [
        ['BTL (Bilateral Tubal Ligation)', 'fp_BTL'],
        ['Vasectomy', 'fp_Vasectomy'],
        ['Pill (COC)', 'fp_PillCOC'],
        ['Pill (POP)', 'fp_PillPOP'],
        ['Injectables (DMPA)', 'fp_DMPA'],
        ['LAM', 'fp_LAM'],
        ['IUD', 'fp_IUD'],
        ['Implanon', 'fp_Implanon'],
        ['Condom', 'fp_Condom'],
        ['Standard Days Method (SDM)', 'fp_SDM']] },
    ],
  },
}
