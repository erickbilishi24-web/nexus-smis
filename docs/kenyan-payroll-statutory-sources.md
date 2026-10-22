# Kenyan payroll source check — 22 October 2026

This is an implementation reference, not legal advice or proof that a school has complied with every payroll obligation. Rules in NEXUS must be reviewed by an authorised payroll professional before a live payroll is approved. The source URLs below were opened and read on 22 October 2026.

## PAYE

The Kenya Revenue Authority PAYE page lists monthly bands effective 1 July 2023: KSh 24,000 at 10%; next KSh 8,333 at 25%; next KSh 467,667 at 30%; next KSh 300,000 at 32.5%; and the amount above KSh 800,000 at 35%. It lists resident personal relief of KSh 2,400 monthly. The KRA notice says changes under the Tax Laws (Amendment) Act, 2024 apply from December 2024 and allow deductions in determining taxable employment income for employee Affordable Housing Levy, SHIF, qualifying post-retirement medical fund (up to KSh 15,000/month), qualifying mortgage interest (up to KSh 30,000/month), and registered pension/provident/individual retirement contributions (up to KSh 30,000/month). It also says Affordable Housing Relief and Post-Retirement Medical Fund Relief ceased. Individual eligibility, exemptions and taxable benefits still require review.

## NSSF, Year 4 (2026)

The official NSSF notice image states a 6% employee and matching employer contribution, Tier I lower earnings limit KSh 9,000, Tier II upper earnings limit KSh 108,000, and maximum contribution KSh 6,480 from each side (KSh 12,960 combined per employee monthly), effective February 2026. Configure the rule and effective date in NEXUS; do not rely on the calculation alone as a filing receipt.

## SHIF

Kenya Law, Social Health Insurance Regulations (Legal Notice 49 of 2024), regulation 17, states salaried household contributions at 2.75% of gross salary or wage, with a monthly minimum of KSh 300. Regulation 22 requires employers to deduct and submit on behalf of salaried contributors by the ninth day of each month. The source itself notes it is not the latest consolidated version, so verify amendments before live use.

## Affordable Housing Levy

KRA guidance states an employee levy of 1.5% of gross salary and an employer levy of 1.5% of the employee's gross salary. KRA’s PAYE amendment notice separately confirms the employee AHL deduction is deductible in determining taxable employment income from December 2024. Employer contribution is an employer cost, not an employee deduction.

## Official sources

- KRA, Pay As You Earn: https://www.kra.go.ke/individual/filing-paying/types-of-taxes/paye
- KRA, Amendments to PAYE Computation pursuant to the Tax Laws (Amendment) Act, 2024: https://www.kra.go.ke/news-center/public-notices/2157-amendments-to-paye-computation-pursuant-to-the-tax-laws-amendment-act,-2024
- KRA, Collection of Affordable Housing Levy: https://www.kra.go.ke/news-center/public-notices/2099-collection-of-the-affordable-housing-levy-by-kenya-revenue-authority-2
- NSSF, Year 4 (2026) contribution rates: https://www.nssf.or.ke/notice-to-employers-year-4-2026-nssf-contribution-rates
- NSSF, official notice image: https://www.nssf.or.ke/wp-content/uploads/2026/02/Notice.png
- Kenya Law, Social Health Insurance Regulations, Legal Notice 49 of 2024: https://new.kenyalaw.org/akn/ke/act/ln/2024/49/eng@2024-03-08/source

NEXUS generates payroll schedules and an internal calculation only. No KRA, NSSF, SHA or bank submission/payment integration is implemented by this package. Confirm later amendments, individual reliefs and specific treatment with the relevant authority or a qualified payroll adviser before live use.
