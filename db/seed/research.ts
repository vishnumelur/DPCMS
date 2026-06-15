import { db } from '@/db/client';
import { lawDocument, lawSection } from '@/db/schema';
import { eq } from 'drizzle-orm';

type SectionSeed = {
  sectionNumber: string;
  title: string;
  bodyMarkdown: string;
  tags: string[];
};

type DocSeed = {
  code: string;
  title: string;
  jurisdiction: string;
  effectiveFrom: string | null;
  summary: string;
  sections: SectionSeed[];
};

const DOCS: readonly DocSeed[] = [
  // ─── DPDP Act 2023 ──────────────────────────────────────────────────────────
  {
    code: 'DPDP_2023',
    title: 'Digital Personal Data Protection Act, 2023',
    jurisdiction: 'IN',
    effectiveFrom: '2023-08-11',
    summary:
      'India\'s first comprehensive data-protection statute. Establishes the rights of Data Principals, the obligations of Data Fiduciaries, the role of the Data Protection Board, lawful bases for processing, breach notification, cross-border transfer rules, and penalties up to Rs 250 crore per instance.',
    sections: [
      {
        sectionNumber: '4',
        title: 'Grounds for processing personal data',
        tags: ['consent', 'legitimate-use'],
        bodyMarkdown: `## Section 4 — Grounds for processing personal data\n\nA Data Fiduciary may process the personal data of a Data Principal **only** in accordance with the provisions of the Act **and** for a lawful purpose for which:\n\n1. the Data Principal has given consent under §6, **or**\n2. processing falls under one of the "legitimate uses" enumerated in §7 (e.g. performance of any function under any law, voluntary provision of personal data by the principal for a specified purpose, employment, medical emergency, disaster response).\n\nA "lawful purpose" means any purpose that is not expressly forbidden by law. The Act deliberately narrows the legitimate-use grounds compared with the GDPR's six bases — there is no general "legitimate interest" carve-out for commercial entities.\n\nProcessing must additionally satisfy the data-minimisation, purpose-limitation, accuracy and storage-limitation principles distributed across §§8-11.`,
      },
      {
        sectionNumber: '6',
        title: 'Consent',
        tags: ['consent', 'rights'],
        bodyMarkdown: `## Section 6 — Consent\n\nConsent given by a Data Principal to a Data Fiduciary for processing of personal data must be **free, specific, informed, unconditional, unambiguous and given by a clear affirmative action**.\n\nThe Data Fiduciary must — accompanying or preceding the request for consent — give the Data Principal an itemised notice in clear and plain language containing at minimum: (a) the personal data and the purposes for which it is proposed to be processed; (b) the manner in which the Principal may exercise the rights under §§11-14; (c) the manner of complaint to the Data Protection Board.\n\nConsent is **limited to the personal data necessary** for the specified purpose. The Principal may withdraw consent at any time; the consequence of withdrawal is borne by the Principal, but lawful processing already done is unaffected. Withdrawal must be as easy as giving consent.\n\nThe Data Fiduciary must, on receipt of withdrawal, **cease processing** within a reasonable time unless processing on another lawful ground is permitted.`,
      },
      {
        sectionNumber: '8',
        title: 'General obligations of Data Fiduciary',
        tags: ['obligations', 'security'],
        bodyMarkdown: `## Section 8 — General obligations of Data Fiduciary\n\nThe Data Fiduciary is responsible for compliance with the Act and the Rules thereunder, irrespective of any agreement to the contrary or any failure of the Data Principal to carry out duties under §15.\n\nKey obligations:\n\n- Implement appropriate **technical and organisational measures** to ensure effective observance of the Act.\n- Protect personal data in the Data Fiduciary's possession or under its control — including data with a Data Processor — by taking **reasonable security safeguards** to prevent personal data breach.\n- In the event of personal data breach, **notify the Board and each affected Data Principal** in the manner prescribed.\n- Erase personal data when consent is withdrawn or the purpose is no longer served, unless retention is required by law.\n- Publish the business contact information of a **Data Protection Officer** or other person authorised to respond to communications from Data Principals.\n- Establish an effective mechanism to redress grievances raised by Data Principals.`,
      },
      {
        sectionNumber: '11',
        title: 'Right to access information about personal data',
        tags: ['rights', 'dsr'],
        bodyMarkdown: `## Section 11 — Right to access information about personal data\n\nA Data Principal whose personal data has been processed by a Data Fiduciary has the right to obtain from the Fiduciary, on request:\n\n1. a summary of the personal data being processed by the Fiduciary and the processing activities undertaken with that personal data;\n2. the identities of all other Data Fiduciaries and Data Processors with whom the personal data has been shared by the Data Fiduciary, along with a description of the personal data so shared;\n3. any other information related to the personal data of such Principal and its processing as may be prescribed.\n\nWhere consent has been given under §6, the right is limited to information about personal data processed under that consent. The Fiduciary may charge a reasonable fee prescribed by the Board.`,
      },
      {
        sectionNumber: '14',
        title: 'Right to nominate',
        tags: ['rights', 'nominee'],
        bodyMarkdown: `## Section 14 — Right to nominate\n\nA Data Principal has the right to **nominate** any other individual who, in the event of death or incapacity of the Data Principal, shall exercise the rights of the Data Principal in accordance with the provisions of the Act and the Rules thereunder, in such manner as may be prescribed.\n\nThe nominee is recognised by the Data Fiduciary on production of proof prescribed by the Rules (typically a self-declaration accompanied by the Principal's verified identity reference and a death/incapacity certificate). The nominee may exercise: (a) the right to access (§11); (b) the right to correction and erasure (§12); (c) the right of grievance redressal (§13).\n\nThe nomination may be revoked, varied or replaced by the Data Principal at any time. The Data Fiduciary must maintain an internal register of nominations and ensure that, on receipt of a verified nominee request, the request is processed within the timelines applicable to a Data Principal request.`,
      },
    ],
  },

  // ─── DPDP Rules 2025 ────────────────────────────────────────────────────────
  {
    code: 'DPDP_RULES_2025',
    title: 'Digital Personal Data Protection Rules, 2025 (Draft)',
    jurisdiction: 'IN',
    effectiveFrom: '2025-01-03',
    summary:
      'Subordinate legislation operationalising the DPDP Act 2023. Specifies notice content, consent-manager registration, reasonable security safeguards, breach-notification timelines, Significant Data Fiduciary criteria, and the operating procedure of the Data Protection Board.',
    sections: [
      {
        sectionNumber: '3',
        title: 'Notice given by Data Fiduciary',
        tags: ['notice', 'consent'],
        bodyMarkdown: `## Rule 3 — Notice given by Data Fiduciary\n\nThe notice given by a Data Fiduciary under §5(1) of the Act must be presented to the Data Principal independently of any other information, in clear and plain language, and must contain at least:\n\n- An **itemised list of personal data** sought to be processed.\n- The **purpose(s)** for processing, mapped 1-to-1 to the personal data items.\n- The **manner in which** the Data Principal may withdraw consent.\n- The **goods or services** that will be made available, and any consequences of refusal.\n- A link to the Data Fiduciary's website / app where the Principal may exercise the rights under §§11-14 and lodge a complaint with the Board.\n\nThe notice must be made available **in English and in any language listed in the Eighth Schedule** of the Constitution selected by the Data Principal.`,
      },
      {
        sectionNumber: '6',
        title: 'Reasonable security safeguards',
        tags: ['security', 'obligations'],
        bodyMarkdown: `## Rule 6 — Reasonable security safeguards\n\nFor the purpose of §8(5) of the Act, a Data Fiduciary must implement **all** of the following safeguards in respect of personal data:\n\n1. Appropriate **encryption, obfuscation, masking or virtual tokens** mapped to such personal data.\n2. Appropriate **access control** to the computer resource(s) used by the Data Fiduciary for processing personal data.\n3. **Logging, monitoring and review** of access to such personal data with the ability to detect, investigate and prevent unauthorised access.\n4. Reasonable **backup of personal data** to ensure continued processing in the event of confidentiality, integrity or availability of personal data being compromised.\n5. Retention of logs and personal data for a period of **one year**, save where retention for a longer period is required by law, to enable identification of personal data breach and investigation, remediation and prevention thereof.\n6. Provisions in the contract entered into between the Data Fiduciary and the Data Processor for the latter to take reasonable security safeguards.\n7. Appropriate **technical and organisational measures** to ensure effective observance of these safeguards.`,
      },
      {
        sectionNumber: '7',
        title: 'Intimation of personal data breach',
        tags: ['breach', 'security'],
        bodyMarkdown: `## Rule 7 — Intimation of personal data breach\n\nOn becoming aware of a personal data breach, the Data Fiduciary must:\n\n1. **Without delay**, intimate each affected Data Principal of the breach in concise, clear and plain language in the manner prescribed by Rule 7(2), containing:\n   - a description of the breach including its nature, extent, timing and location of occurrence;\n   - the likely consequences of the breach relevant to that Principal;\n   - measures implemented by the Data Fiduciary to mitigate risk;\n   - safety measures the Principal can take to protect their interests;\n   - the business contact information of a person who can respond to queries on behalf of the Data Fiduciary.\n\n2. **Within 72 hours** (or such longer period as the Board may permit on application), intimate the Data Protection Board with a description containing facts of the breach, mitigation measures, identities (if known) of any person who caused the breach, and a Sl. No. that allows the breach record to be reconciled with the intimation given to Principals.\n\n3. **Within 72 hours subsequent to (2)**, update the Board with an updated and detailed report including findings, broader remedial measures, and notifications sent.`,
      },
      {
        sectionNumber: '12',
        title: 'Additional obligations of Significant Data Fiduciary',
        tags: ['sdf', 'obligations'],
        bodyMarkdown: `## Rule 12 — Additional obligations of Significant Data Fiduciary\n\nA Significant Data Fiduciary (SDF) — designated by the Central Government having regard to volume and sensitivity of personal data processed, risk to rights of Data Principals, potential impact on sovereignty and integrity of India, etc. — must additionally:\n\n- Undertake **once in every twelve months** a **Data Protection Impact Assessment** in respect of the processing it undertakes, and a **periodic audit** by an independent data auditor.\n- Verify that any algorithmic software it deploys is **not likely to pose a risk** to the rights of Data Principals.\n- Observe such measures in respect of **transfer of personal data outside India** as may be specified.\n- Appoint a **Data Protection Officer** based in India, who shall be an individual responsible to the Board of Directors or similar governing body of the SDF, and who shall be the point of contact for the grievance redressal mechanism.\n\nThe DPIA report and audit report must be furnished to the Board on demand.`,
      },
    ],
  },

  // ─── IT Act 2000 (selected) ────────────────────────────────────────────────
  {
    code: 'IT_ACT_2000',
    title: 'Information Technology Act, 2000',
    jurisdiction: 'IN',
    effectiveFrom: '2000-10-17',
    summary:
      'India\'s primary cyber-law. Governs electronic records and digital signatures and remains the source of compensation/penalty provisions for "sensitive personal data or information" (SPDI) until the DPDP Act 2023 is fully notified. Sections 43A and 72A are the foundation of the SPDI Rules 2011.',
    sections: [
      {
        sectionNumber: '43A',
        title: 'Compensation for failure to protect data',
        tags: ['security', 'compensation'],
        bodyMarkdown: `## Section 43A — Compensation for failure to protect data\n\nWhere a **body corporate**, possessing, dealing or handling any **sensitive personal data or information** in a computer resource which it owns, controls or operates, is **negligent in implementing and maintaining reasonable security practices and procedures** and thereby causes wrongful loss or wrongful gain to any person, such body corporate shall be **liable to pay damages** by way of compensation to the person so affected.\n\nThe explanation defines:\n- "body corporate" — any company including a firm, sole proprietorship or other association of individuals engaged in commercial or professional activities;\n- "reasonable security practices and procedures" — security practices designed to protect such information from unauthorised access, damage, use, modification, disclosure or impairment, as may be specified in an agreement between the parties or as may be specified in any law for the time being in force and in the absence of such agreement or law, such reasonable security practices and procedures, as may be prescribed by the Central Government in consultation with such professional bodies or associations as it may deem fit.\n\nThe SPDI Rules 2011 are the principal subordinate legislation under this section.`,
      },
      {
        sectionNumber: '72A',
        title: 'Punishment for disclosure of information in breach of lawful contract',
        tags: ['security', 'criminal'],
        bodyMarkdown: `## Section 72A — Punishment for disclosure of information in breach of lawful contract\n\nAny person including an intermediary who, while providing services under the terms of lawful contract, has secured access to any material containing personal information about another person, with the intent to cause or knowing that he is likely to cause wrongful loss or wrongful gain discloses, without the consent of the person concerned, or in breach of a lawful contract, such material to any other person, shall be punished with imprisonment for a term which may extend to **three years**, or with fine which may extend to **five lakh rupees**, or with both.\n\nNote: This section remains in force until the DPDP Act 2023's overriding provisions are notified. Many privacy enforcement actions in India continue to be brought under §72A in parallel with §43A compensation claims.`,
      },
      {
        sectionNumber: '70B',
        title: 'CERT-In as agency for incident response',
        tags: ['breach', 'cert-in'],
        bodyMarkdown: `## Section 70B — Indian Computer Emergency Response Team (CERT-In)\n\nThe Central Government has constituted CERT-In to serve as the national agency for performing the following functions in the area of cyber security:\n\n- collection, analysis and dissemination of information on cyber incidents;\n- forecast and alerts of cyber security incidents;\n- emergency measures for handling cyber security incidents;\n- coordination of cyber incident response activities;\n- issue of guidelines, advisories, vulnerability notes, and white papers relating to information security practices, procedures, prevention, response and reporting of cyber incidents.\n\nThe CERT-In Directions of 28 April 2022 — issued under §70B(6) — require service providers, intermediaries, data centres, body corporates and Government organisations to **report cyber incidents to CERT-In within 6 hours of noticing**, retain ICT system logs for 180 days, and undergo periodic synchronisation of system clocks with NPL or NIC servers.`,
      },
    ],
  },

  // ─── IT (Amendment) Act 2008 ───────────────────────────────────────────────
  {
    code: 'IT_AMENDMENT_2008',
    title: 'Information Technology (Amendment) Act, 2008',
    jurisdiction: 'IN',
    effectiveFrom: '2009-10-27',
    summary:
      'The 2008 amendment to the IT Act 2000 that introduced the principal data-protection and cyber-offence provisions still relied upon today — §43A (compensation for negligent handling of sensitive personal data), §72A (punishment for disclosure in breach of lawful contract), §66E (violation of privacy), and the strengthened §70B mandate for CERT-In. It is the statutory hook under which the SPDI Rules 2011 were framed.',
    sections: [
      {
        sectionNumber: '43A (inserted)',
        title: 'Insertion of §43A — compensation for failure to protect data',
        tags: ['security', 'compensation', 'spdi'],
        bodyMarkdown: `## §43A — inserted by the IT (Amendment) Act, 2008\n\nThe 2008 amendment **inserted Section 43A** into the IT Act 2000, creating — for the first time in Indian law — a statutory duty on a **body corporate** to implement and maintain *reasonable security practices and procedures* when it possesses, deals with or handles **sensitive personal data or information (SPDI)**. Negligence causing wrongful loss or wrongful gain attracts **uncapped compensation** to the affected person.\n\nThis section is the **enabling provision for the SPDI Rules 2011**, which prescribe what "reasonable security practices" mean (see [[SPDI_RULES_2011]]). Until the DPDP Act 2023 is fully notified, §43A remains a live basis for data-protection claims in India.`,
      },
      {
        sectionNumber: '66E (inserted)',
        title: 'Insertion of §66E — violation of privacy',
        tags: ['privacy', 'criminal'],
        bodyMarkdown: `## §66E — Violation of privacy (inserted 2008)\n\nWhoever, intentionally or knowingly captures, publishes or transmits the image of a private area of any person without his or her consent, under circumstances violating the privacy of that person, shall be punished with imprisonment which may extend to **three years** or with fine not exceeding **two lakh rupees**, or with both.\n\nThis was India's first explicit criminal privacy provision and is frequently cited alongside §72A in privacy-harm matters.`,
      },
      {
        sectionNumber: '72A (inserted)',
        title: 'Insertion of §72A — disclosure in breach of lawful contract',
        tags: ['security', 'criminal'],
        bodyMarkdown: `## §72A — inserted by the IT (Amendment) Act, 2008\n\nThe amendment **inserted Section 72A**, punishing any person (including an intermediary) who, while providing services under a lawful contract, discloses personal information without consent or in breach of contract, with intent to cause wrongful loss or gain — imprisonment up to **three years**, fine up to **five lakh rupees**, or both.\n\nTogether with §43A, this is the backbone of pre-DPDP personal-data enforcement in India.`,
      },
    ],
  },

  // ─── SPDI Rules 2011 ───────────────────────────────────────────────────────
  {
    code: 'SPDI_RULES_2011',
    title:
      'Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011',
    jurisdiction: 'IN',
    effectiveFrom: '2011-04-11',
    summary:
      'Subordinate legislation under §43A of the IT Act 2000. Defines "sensitive personal data or information" (SPDI), prescribes consent and disclosure requirements, mandates publication of a privacy policy, and recognises ISO/IEC 27001 as evidence of "reasonable security practices".',
    sections: [
      {
        sectionNumber: '3',
        title: 'Sensitive Personal Data or Information',
        tags: ['definitions', 'sensitive'],
        bodyMarkdown: `## Rule 3 — Sensitive Personal Data or Information (SPDI)\n\nSensitive personal data or information of a person means such personal information which consists of information relating to:\n\n1. password;\n2. financial information such as Bank account or credit card or debit card or other payment instrument details;\n3. physical, physiological and mental health condition;\n4. sexual orientation;\n5. medical records and history;\n6. biometric information;\n7. any detail relating to the above clauses as provided to body corporate for providing service; and\n8. any of the information received under the above clauses by body corporate for processing, stored or processed under lawful contract or otherwise.\n\nProvided that any information that is freely available or accessible in public domain or furnished under the Right to Information Act, 2005 or any other law for the time being in force shall not be regarded as SPDI for the purposes of these Rules.`,
      },
      {
        sectionNumber: '4',
        title: 'Body corporate to provide policy for privacy and disclosure',
        tags: ['notice', 'privacy-policy'],
        bodyMarkdown: `## Rule 4 — Body corporate to provide policy for privacy and disclosure of information\n\nThe body corporate or any person who on behalf of the body corporate collects, receives, possess, stores, deals or handle information of provider of information, shall provide a **privacy policy** for handling of or dealing in personal information including sensitive personal data or information and ensure that the same are available for view by such providers of information who has provided such information under lawful contract.\n\nSuch policy shall be **published on the website** of body corporate or any person on its behalf and shall provide for:\n\n- Clear and easily accessible statements of its practices and policies;\n- Type of personal or sensitive personal data or information collected under Rule 3;\n- Purpose of collection and usage of such information;\n- Disclosure of information including sensitive personal data or information as provided in Rule 6;\n- Reasonable security practices and procedures as provided under Rule 8.`,
      },
      {
        sectionNumber: '5',
        title: 'Collection of information',
        tags: ['consent', 'collection'],
        bodyMarkdown: `## Rule 5 — Collection of information\n\nA body corporate or any person on its behalf shall obtain **consent in writing** through letter or Fax or email from the provider of the sensitive personal data or information regarding purpose of usage before collection of such information.\n\nThe body corporate shall not collect SPDI unless:\n- the information is collected for a lawful purpose connected with a function or activity of the body corporate or any person on its behalf;\n- the collection of the SPDI is considered necessary for that purpose.\n\nThe body corporate shall, while collecting information directly from the person concerned, take such steps as are, in the circumstances, reasonable to ensure that the person concerned is having the knowledge of:\n- the fact that the information is being collected;\n- the purpose for which the information is being collected;\n- the intended recipients of the information;\n- the name and address of the agency that is collecting the information and the agency that will retain the information.\n\nThe provider of information shall have the option to **withdraw consent** at any time. Such withdrawal shall be sent in writing to the body corporate.`,
      },
      {
        sectionNumber: '8',
        title: 'Reasonable Security Practices and Procedures',
        tags: ['security', 'iso27001'],
        bodyMarkdown: `## Rule 8 — Reasonable Security Practices and Procedures\n\nA body corporate or a person on its behalf shall be considered to have complied with reasonable security practices and procedures, if they have implemented such security practices and standards and have a **comprehensive documented information security programme and information security policies** that contain managerial, technical, operational and physical security control measures that are commensurate with the information assets being protected with the nature of business.\n\nThe **International Standard IS/ISO/IEC 27001** on "Information Technology — Security Techniques — Information Security Management System — Requirements" is one such standard referred to in sub-rule (1).\n\nAny body corporate or a person on its behalf who is following codes of best practices for data protection as approved and notified by the Central Government for its code of best practices shall be deemed to have complied with reasonable security practices and procedures provided that such standard or the codes of best practices have been certified or audited on a regular basis by entities through independent auditor, duly approved by the Central Government. **The audit of reasonable security practices and procedures shall be carried out by an auditor at least once a year** or as and when the body corporate or a person on its behalf undertake significant upgradation of its process and computer resource.`,
      },
    ],
  },

  // ─── GDPR EU 2018 ──────────────────────────────────────────────────────────
  {
    code: 'GDPR_EU_2018',
    title: 'General Data Protection Regulation (EU) 2016/679',
    jurisdiction: 'EU',
    effectiveFrom: '2018-05-25',
    summary:
      'The European Union\'s benchmark privacy regulation, in force across the EU/EEA. Applies extraterritorially to controllers/processors offering goods or services to data subjects in the Union or monitoring their behaviour. Penalties up to EUR 20 million or 4% of worldwide annual turnover, whichever is higher.',
    sections: [
      {
        sectionNumber: 'Art. 6',
        title: 'Lawfulness of processing',
        tags: ['lawful-basis', 'consent'],
        bodyMarkdown: `## Article 6 — Lawfulness of processing\n\nProcessing shall be lawful only if and to the extent that at least one of the following applies:\n\n- (a) the data subject has given **consent** to the processing of his or her personal data for one or more specific purposes;\n- (b) processing is necessary for the **performance of a contract** to which the data subject is party or in order to take steps at the request of the data subject prior to entering into a contract;\n- (c) processing is necessary for compliance with a **legal obligation** to which the controller is subject;\n- (d) processing is necessary in order to protect the **vital interests** of the data subject or of another natural person;\n- (e) processing is necessary for the performance of a task carried out in the **public interest** or in the exercise of official authority vested in the controller;\n- (f) processing is necessary for the purposes of the **legitimate interests** pursued by the controller or by a third party, except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject, in particular where the data subject is a child.\n\nPoint (f) shall not apply to processing carried out by public authorities in the performance of their tasks. Compared with DPDP §4, the GDPR's "legitimate interests" ground is significantly broader.`,
      },
      {
        sectionNumber: 'Art. 17',
        title: 'Right to erasure ("right to be forgotten")',
        tags: ['rights', 'erasure'],
        bodyMarkdown: `## Article 17 — Right to erasure ('right to be forgotten')\n\nThe data subject shall have the right to obtain from the controller the erasure of personal data concerning him or her without undue delay and the controller shall have the obligation to erase personal data without undue delay where one of the following grounds applies:\n\n- (a) the personal data are no longer necessary in relation to the purposes for which they were collected or otherwise processed;\n- (b) the data subject withdraws consent on which the processing is based and where there is no other legal ground for the processing;\n- (c) the data subject objects to the processing pursuant to Article 21(1) and there are no overriding legitimate grounds for the processing, or the data subject objects pursuant to Article 21(2);\n- (d) the personal data have been unlawfully processed;\n- (e) the personal data have to be erased for compliance with a legal obligation in Union or Member State law to which the controller is subject;\n- (f) the personal data have been collected in relation to the offer of information society services referred to in Article 8(1).\n\nWhere the controller has made the personal data public and is obliged to erase the personal data, the controller, taking account of available technology and the cost of implementation, shall take **reasonable steps, including technical measures**, to inform controllers which are processing the personal data that the data subject has requested the erasure by such controllers of any links to, or copy or replication of, those personal data.`,
      },
      {
        sectionNumber: 'Art. 33',
        title: 'Notification of a personal data breach to the supervisory authority',
        tags: ['breach', 'cross-border'],
        bodyMarkdown: `## Article 33 — Notification of a personal data breach to the supervisory authority\n\nIn the case of a personal data breach, the controller shall **without undue delay and, where feasible, not later than 72 hours** after having become aware of it, notify the personal data breach to the supervisory authority competent in accordance with Article 55, **unless the personal data breach is unlikely to result in a risk to the rights and freedoms of natural persons**. Where the notification to the supervisory authority is not made within 72 hours, it shall be accompanied by reasons for the delay.\n\nThe processor shall notify the controller without undue delay after becoming aware of a personal data breach.\n\nThe notification referred to in paragraph 1 shall at least:\n- (a) describe the nature of the personal data breach including where possible, the categories and approximate number of data subjects concerned and the categories and approximate number of personal data records concerned;\n- (b) communicate the name and contact details of the data protection officer or other contact point where more information can be obtained;\n- (c) describe the likely consequences of the personal data breach;\n- (d) describe the measures taken or proposed to be taken by the controller to address the personal data breach, including, where appropriate, measures to mitigate its possible adverse effects.\n\nWhere, and in so far as, it is not possible to provide the information at the same time, the information may be provided in **phases without undue further delay**.`,
      },
      {
        sectionNumber: 'Art. 44',
        title: 'General principle for transfers',
        tags: ['cross-border', 'transfer'],
        bodyMarkdown: `## Article 44 — General principle for transfers\n\nAny transfer of personal data which are undergoing processing or are intended for processing **after transfer to a third country or to an international organisation** shall take place only if, subject to the other provisions of this Regulation, the conditions laid down in this Chapter are complied with by the controller and processor, including for onward transfers of personal data from the third country or an international organisation to another third country or to another international organisation.\n\nAll provisions in this Chapter shall be applied in order to ensure that the **level of protection of natural persons guaranteed by this Regulation is not undermined**.\n\nValid transfer mechanisms include:\n- **Adequacy decisions** under Article 45 (e.g. Japan, UK, Republic of Korea, the new EU-US Data Privacy Framework);\n- **Standard Contractual Clauses** under Article 46;\n- **Binding Corporate Rules** under Article 47;\n- **Derogations for specific situations** under Article 49 (e.g. explicit consent, contractual necessity, important public interest).\n\nThe Schrems II judgment (C-311/18) requires controllers to assess, on a case-by-case basis, whether the SCCs in combination with supplementary measures provide a level of protection essentially equivalent to that of the EU.`,
      },
    ],
  },
];

export async function seedResearchP5(_orgId: string) {
  // `_orgId` is accepted to keep the seed signature consistent with other seeds,
  // but law documents are global (not org-scoped) so it is not used.
  const existing = await db.select().from(lawDocument);
  const existingByCode = new Map(existing.map((d) => [d.code, d]));

  let docsInserted = 0;
  let sectionsInserted = 0;

  for (const doc of DOCS) {
    let docRow = existingByCode.get(doc.code);
    if (!docRow) {
      const [created] = await db
        .insert(lawDocument)
        .values({
          code: doc.code,
          title: doc.title,
          jurisdiction: doc.jurisdiction,
          effectiveFrom: doc.effectiveFrom,
          summary: doc.summary,
        })
        .returning();
      if (!created) throw new Error(`failed to insert law_document ${doc.code}`);
      docRow = created;
      docsInserted += 1;
    }

    const existingSecs = await db
      .select()
      .from(lawSection)
      .where(eq(lawSection.documentId, docRow.id));
    const existingSecNums = new Set(existingSecs.map((s) => s.sectionNumber));

    for (const s of doc.sections) {
      if (existingSecNums.has(s.sectionNumber)) continue;
      await db.insert(lawSection).values({
        documentId: docRow.id,
        sectionNumber: s.sectionNumber,
        title: s.title,
        bodyMarkdown: s.bodyMarkdown,
        tags: s.tags,
      });
      sectionsInserted += 1;
    }
  }

  console.log(
    `Research seed: ${docsInserted} new law documents, ${sectionsInserted} new sections (idempotent).`,
  );
}
