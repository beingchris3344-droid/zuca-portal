/* ============================================================
   Privacy Policy — content only
   Edit the text in this file to change the document.
   Do not touch LegalDocument.jsx unless you want to change the design.
   ============================================================ */

export const privacyPolicy = {
  slug: "privacypolicy",
  documentTitle: "Privacy Policy · ZUCA",
  title: "Privacy Policy",
  subtitle: "Zetech University Catholic Action (ZUCA)",

  meta: [
    { label: "Effective date", value: "12 October 2026" },
    { label: "Version", value: "1.0" },
    { label: "Document reference", value: "ZUCA LEGAL PP 001" },
    { label: "Governing law", value: "Data Protection Act, 2019 (Kenya)" },
    { label: "Applies to", value: "zetechcatholicaction.com and the ZUCA Portal" },
    { label: "Review cycle", value: "Annually, or upon material change" },
  ],

  kiswahili: {
    title: "Sera ya Faragha",
    subtitle: "Zetech University Catholic Action (ZUCA)",
    meta: [
      { label: "Tarehe ya kuanza", value: "12 Oktoba 2026" },
      { label: "Toleo", value: "1.0" },
      { label: "Kumbukumbu ya hati", value: "ZUCA LEGAL PP 001" },
      { label: "Sheria inayotumika", value: "Sheria ya Ulinzi wa Data, 2019 (Kenya)" },
      { label: "Inatumika kwa", value: "zetechcatholicaction.com na ZUCA Portal" },
      { label: "Mzunguko wa mapitio", value: "Kila mwaka, au mapema pale inapohitajika" },
    ],
    footerNote:
      "Hati hii imetolewa na Zetech University Catholic Action na inaanza kutekelezwa tarehe 12 Oktoba 2026. Toleo 1.0. Kumbukumbu ya hati ZUCA LEGAL PP 001.",
  },

  sections: [
    {
      title: "1. Introduction",
      paragraphs: [
        "Zetech University Catholic Action (referred to as ZUCA, we, us, or our) is the official Catholic community of Zetech University, Kenya. This Privacy Policy describes how we collect, use, store, share, and protect personal data when you use the ZUCA Portal (the Portal).",
        "This Policy is issued in accordance with the Data Protection Act, 2019 (the Act) and its subsidiary regulations. It should be read alongside our Terms of Service and our Cookies and Storage Policy.",
        "By registering for or using the Portal, you confirm that you have read and understood this Policy.",
      ],
      kiswahili: {
        title: "1. Utangulizi",
        paragraphs: [
          "Zetech University Catholic Action (inayojulikana kama ZUCA, sisi, au wetu) ni jumuiya rasmi ya Kikatoliki ya Chuo Kikuu cha Zetech, Kenya. Sera hii ya Faragha inaeleza jinsi tunakusanya, kutumia, kuhifadhi, kushiriki, na kulinda data binafsi unapotumia ZUCA Portal (Portal).",
          "Sera hii imetolewa kwa kuzingatia Sheria ya Ulinzi wa Data, 2019 (Sheria) na kanuni zake ndogo. Inapaswa kusomwa pamoja na Masharti yetu ya Matumizi na Sera yetu ya Vidakuzi na Hifadhi.",
          "Kwa kujiandikisha au kutumia Portal, unathibitisha kwamba umesoma na kuelewa Sera hii.",
        ],
      },
    },

    {
      title: "2. Data Controller",
      paragraphs: [
        "The data controller responsible for your personal data is identified in Table 2.1 below.",
      ],
      tables: [
        {
          caption: "Table 2.1 — Data controller",
          headers: ["Field", "Details"],
          rows: [
            ["Legal name", "Zetech University Catholic Action (ZUCA)"],
            ["Institution", "Zetech University"],
            ["Country", "Kenya"],
            ["Data protection contact", "zucaportal2025@gmail.com"],
          ],
        },
      ],
      kiswahili: {
        title: "2. Mdhibiti wa Data",
        paragraphs: [
          "Mdhibiti wa data anayehusika na data yako binafsi ametambuliwa katika Jedwali 2.1 hapa chini.",
        ],
        tables: [
          {
            caption: "Jedwali 2.1 — Mdhibiti wa data",
            headers: ["Sehemu", "Maelezo"],
            rows: [
              ["Jina la kisheria", "Zetech University Catholic Action (ZUCA)"],
              ["Taasisi", "Chuo Kikuu cha Zetech"],
              ["Nchi", "Kenya"],
              ["Mawasiliano ya ulinzi wa data", "zucaportal2025@gmail.com"],
            ],
          },
        ],
      },
    },

    {
      title: "3. Personal Data We Collect",
      paragraphs: [
        "We collect only the personal data necessary to operate the Portal. The categories of data collected are set out in Tables 3.1 through 3.4.",
      ],
      tables: [
        {
          caption: "Table 3.1 — Information you provide",
          headers: ["Data item", "Purpose"],
          rows: [
            ["Full name", "To identify you on the Portal"],
            ["Email address", "Account verification, password resets, official communication"],
            ["Telephone number", "M-Pesa payment confirmation, account recovery"],
            ["Password", "Stored only as a one-way cryptographic hash (bcrypt)"],
            ["Profile photograph", "Optional; displayed on your member identification card"],
            ["Content you submit", "Messages, media uploads, comments, feedback, pledge messages"],
          ],
        },
        {
          caption: "Table 3.2 — Information generated by the Portal",
          headers: ["Data item", "Description"],
          rows: [
            ["Membership number", "Format Z#001, Z#002, and so on"],
            ["Account role", "Member or administrator"],
            ["Special role", "Jumuia leader, treasurer, secretary, choir moderator, media moderator"],
            ["Jumuia membership", "The small Christian community you belong to"],
            ["Account activity", "Date of joining, last login, Portal feature use"],
            ["Contribution records", "Pledge amounts, status, M-Pesa references"],
            ["Attendance records", "Attendance at Mass, meetings, and events"],
          ],
        },
        {
          caption: "Table 3.3 — Information collected automatically",
          headers: ["Data item", "Purpose"],
          rows: [
            ["IP address and session identifiers", "Security, abuse prevention"],
            ["Device and browser information", "Ensure the Portal works on your device"],
            ["Push notification subscriptions", "Delivery of notifications"],
          ],
        },
        {
          caption: "Table 3.4 — Biometric data",
          headers: ["Aspect", "Detail"],
          rows: [
            ["Standard used", "WebAuthn"],
            ["What we store", "A public cryptographic identifier"],
            ["What we do not store", "Your fingerprint, facial scan, or any other biometric data"],
            ["Where biometrics stay", "On your own device"],
          ],
        },
      ],
      kiswahili: {
        title: "3. Data Binafsi Tunayokusanya",
        paragraphs: [
          "Tunakusanya tu data binafsi inayohitajika kuendesha Portal. Aina za data tunazokusanya zimeainishwa katika Jedwali 3.1 hadi 3.4.",
        ],
        tables: [
          {
            caption: "Jedwali 3.1 — Taarifa unazotoa",
            headers: ["Kipengele cha data", "Kusudi"],
            rows: [
              ["Jina kamili", "Kukutambua kwenye Portal"],
              ["Barua pepe", "Uthibitisho wa akaunti, kubadilisha nenosiri, mawasiliano rasmi"],
              ["Namba ya simu", "Uthibitisho wa malipo ya M-Pesa, kurejesha akaunti"],
              ["Nenosiri", "Huhifadhiwa tu kama msimbo wa njia moja (bcrypt)"],
              ["Picha ya wasifu", "Hiari; huonyeshwa kwenye kadi yako ya utambulisho"],
              ["Maudhui unayowasilisha", "Ujumbe, upakiaji wa vyombo vya habari, maoni, mrejesho, ujumbe wa ahadi"],
            ],
          },
          {
            caption: "Jedwali 3.2 — Taarifa zinazozalishwa na Portal",
            headers: ["Kipengele cha data", "Maelezo"],
            rows: [
              ["Namba ya uanachama", "Muundo Z#001, Z#002, na kadhalika"],
              ["Wajibu wa akaunti", "Mwanachama au msimamizi"],
              ["Wajibu maalum", "Kiongozi wa jumuia, mweka hazina, katibu, msimamizi wa kwaya, msimamizi wa media"],
              ["Uanachama wa jumuia", "Jumuiya ndogo ya Kikristo unayomiliki"],
              ["Shughuli za akaunti", "Tarehe ya kujiunga, kuingia mara ya mwisho, matumizi ya Portal"],
              ["Kumbukumbu za michango", "Kiasi cha ahadi, hali, kumbukumbu za M-Pesa"],
              ["Kumbukumbu za mahudhurio", "Mahudhurio ya Misa, mikutano, na matukio"],
            ],
          },
          {
            caption: "Jedwali 3.3 — Taarifa zinazokusanywa kiotomatiki",
            headers: ["Kipengele cha data", "Kusudi"],
            rows: [
              ["Anwani ya IP na vitambulisho vya kipindi", "Usalama, kuzuia unyanyasaji"],
              ["Taarifa za kifaa na kivinjari", "Kuhakikisha Portal inafanya kazi kwenye kifaa chako"],
              ["Usajili wa arifa", "Uwasilishaji wa arifa"],
            ],
          },
          {
            caption: "Jedwali 3.4 — Data ya kibaiometriki",
            headers: ["Kipengele", "Maelezo"],
            rows: [
              ["Kiwango kinachotumika", "WebAuthn"],
              ["Tunachohifadhi", "Kitambulisho cha umma cha kriptografia"],
              ["Hatuhifadhi", "Alama ya kidole, skani ya uso, au data nyingine yoyote ya kibaiometriki"],
              ["Mahali baiometriki zinabaki", "Kwenye kifaa chako mwenyewe"],
            ],
          },
        ],
      },
    },

    {
      title: "4. Purposes of Processing",
      paragraphs: [
        "We process your personal data only for the purposes listed in Table 4.1.",
      ],
      tables: [
        {
          caption: "Table 4.1 — Lawful purposes of processing",
          headers: ["Reference", "Purpose"],
          rows: [
            ["P1", "To create, verify, and administer your ZUCA account"],
            ["P2", "To assign and display your membership number"],
            ["P3", "To administer your Jumuia membership and any leadership role"],
            ["P4", "To process contributions, pledges, and M-Pesa payments"],
            ["P5", "To send transactional and service notifications"],
            ["P6", "To enable communication between members through chat and messaging"],
            ["P7", "To operate the Portal AI assistant when you ask it a question"],
            ["P8", "To generate aggregate statistics for ZUCA administrators"],
            ["P9", "To protect the Portal against unauthorised access, abuse, spam, and threats"],
            ["P10", "To comply with legal obligations applicable in Kenya"],
          ],
        },
      ],
      paragraphsAfter: [
        "We do not use your personal data for automated decision-making producing legal effects, or for advertising.",
      ],
      kiswahili: {
        title: "4. Malengo ya Usindikaji",
        paragraphs: [
          "Tunashughulikia data yako binafsi kwa malengo yaliyoorodheshwa katika Jedwali 4.1 tu.",
        ],
        tables: [
          {
            caption: "Jedwali 4.1 — Malengo halali ya usindikaji",
            headers: ["Kumbukumbu", "Kusudi"],
            rows: [
              ["P1", "Kuunda, kuthibitisha, na kusimamia akaunti yako ya ZUCA"],
              ["P2", "Kukupa na kuonyesha namba yako ya uanachama"],
              ["P3", "Kusimamia uanachama wako wa Jumuia na jukumu lolote la uongozi"],
              ["P4", "Kushughulikia michango, ahadi, na malipo ya M-Pesa"],
              ["P5", "Kutuma arifa za huduma na miamala"],
              ["P6", "Kuwezesha mawasiliano kati ya wanachama kupitia gumzo na ujumbe"],
              ["P7", "Kuendesha msaidizi wa AI wa Portal unapouliza swali"],
              ["P8", "Kuzalisha takwimu zilizojumuishwa kwa wasimamizi wa ZUCA"],
              ["P9", "Kulinda Portal dhidi ya ufikiaji usioidhinishwa, unyanyasaji, barua taka, na vitisho"],
              ["P10", "Kutii wajibu wa kisheria unaotumika Kenya"],
            ],
          },
        ],
        paragraphsAfter: [
          "Hatutumii data yako binafsi kwa maamuzi ya kiotomatiki yanayozalisha athari za kisheria, au kwa matangazo.",
        ],
      },
    },

    {
      title: "5. Lawful Basis for Processing",
      paragraphs: [
        "Under the Data Protection Act, 2019, we rely on one or more of the lawful bases set out in Table 5.1.",
      ],
      tables: [
        {
          caption: "Table 5.1 — Lawful bases",
          headers: ["Basis", "When we rely on it"],
          rows: [
            ["Consent (Section 32)", "Where you have expressly consented, such as enabling biometric login or accepting this Policy during registration"],
            ["Performance of a contract", "Where processing is necessary to provide the Portal services you have registered for"],
            ["Compliance with a legal obligation", "Where processing is required by Kenyan law, including financial record retention"],
            ["Legitimate interests", "For security, fraud prevention, and service improvement, where these interests are not overridden by your rights"],
          ],
        },
      ],
      paragraphsAfter: [
        "You may withdraw consent at any time by contacting the data protection contact shown in Table 2.1.",
      ],
      kiswahili: {
        title: "5. Msingi Halali wa Usindikaji",
        paragraphs: [
          "Chini ya Sheria ya Ulinzi wa Data, 2019, tunategemea msingi mmoja au zaidi wa kisheria ulioainishwa katika Jedwali 5.1.",
        ],
        tables: [
          {
            caption: "Jedwali 5.1 — Misingi halali",
            headers: ["Msingi", "Tunapoutumia"],
            rows: [
              ["Idhini (Kifungu cha 32)", "Pale umetoa idhini waziwazi, kama vile kuwezesha kuingia kwa alama ya kidole au kukubali Sera hii wakati wa kujiandikisha"],
              ["Utimizaji wa mkataba", "Pale usindikaji unahitajika kutoa huduma za Portal ulizojiandikisha"],
              ["Kutii wajibu wa kisheria", "Pale usindikaji unahitajika na sheria ya Kenya, ikiwemo kuhifadhi kumbukumbu za kifedha"],
              ["Maslahi halali", "Kwa usalama, kuzuia udanganyifu, na kuboresha huduma, pale maslahi haya hayazidi haki zako"],
            ],
          },
        ],
        paragraphsAfter: [
          "Unaweza kuondoa idhini wakati wowote kwa kuwasiliana na mawasiliano ya ulinzi wa data yaliyoonyeshwa katika Jedwali 2.1.",
        ],
      },
    },

    {
      title: "6. Disclosure of Personal Data",
      paragraphs: [
        "We do not sell, rent, or trade personal data. We disclose personal data only to the categories of recipients listed in Table 6.1, and only to the extent necessary for them to provide their services.",
      ],
      tables: [
        {
          caption: "Table 6.1 — Service providers and third parties",
          headers: ["Service", "Purpose", "Data disclosed"],
          rows: [
            ["Supabase", "Secure storage of profile photographs", "Profile image files"],
            ["Cloudinary", "Secure storage of gallery media", "Media files you upload"],
            ["Render", "Backend infrastructure hosting", "Portal data (processed, not shared)"],
            ["Vercel", "Frontend hosting", "Browser requests only"],
            ["Google Gemini and Groq", "AI assistant responses", "Text of your question to the AI assistant"],
            ["Resend and Brevo", "Transactional email delivery", "Email address and name"],
            ["Safaricom (M-Pesa)", "Payment processing you initiate", "Phone number, payment amount"],
            ["OCR.space", "Optical character recognition for hymn images", "Hymn images only (administrator feature)"],
            ["YouTube and Google", "Public channel analytics", "None (public channel data only)"],
            ["WhatsApp", "Announcements to opted-in members", "Phone numbers of opted-in members"],
          ],
        },
        {
          caption: "Table 6.2 — Legal disclosure",
          headers: ["Circumstance", "Our approach"],
          rows: [
            ["Court order", "We comply with lawful court orders issued by Kenyan courts"],
            ["Statutory request", "We comply with lawful requests from competent Kenyan authorities"],
            ["Notification", "Where permitted by law, we will notify you before disclosing your data"],
          ],
        },
      ],
      kiswahili: {
        title: "6. Ufichuzi wa Data Binafsi",
        paragraphs: [
          "Hatuuzi, hatukodishi, wala kubadilishana data binafsi. Tunafichua data binafsi tu kwa aina za wapokeaji zilizoorodheshwa katika Jedwali 6.1, na kwa kiwango kinachohitajika tu ili watoe huduma zao.",
        ],
        tables: [
          {
            caption: "Jedwali 6.1 — Watoa huduma na watu wengine",
            headers: ["Huduma", "Kusudi", "Data inayofichuliwa"],
            rows: [
              ["Supabase", "Kuhifadhi picha za wasifu kwa usalama", "Faili za picha za wasifu"],
              ["Cloudinary", "Kuhifadhi vyombo vya habari vya gallery kwa usalama", "Faili za vyombo vya habari unazopakia"],
              ["Render", "Kupanga miundombinu ya backend", "Data ya Portal (inasindikwa, haishirikiwi)"],
              ["Vercel", "Kupanga frontend", "Maombi ya kivinjari tu"],
              ["Google Gemini na Groq", "Majibu ya msaidizi wa AI", "Maandishi ya swali lako kwa msaidizi wa AI"],
              ["Resend na Brevo", "Uwasilishaji wa barua pepe za miamala", "Barua pepe na jina"],
              ["Safaricom (M-Pesa)", "Usindikaji wa malipo unayoanzisha", "Namba ya simu, kiasi cha malipo"],
              ["OCR.space", "Utambuzi wa herufi kwa picha za nyimbo", "Picha za nyimbo tu (kipengele cha msimamizi)"],
              ["YouTube na Google", "Uchanganuzi wa chaneli ya umma", "Hakuna (data ya chaneli ya umma tu)"],
              ["WhatsApp", "Matangazo kwa wanachama waliojiorodhesha", "Namba za simu za wanachama waliojiorodhesha"],
            ],
          },
          {
            caption: "Jedwali 6.2 — Ufichuzi wa kisheria",
            headers: ["Hali", "Mbinu yetu"],
            rows: [
              ["Amri ya mahakama", "Tunatii amri halali za mahakama zilizotolewa na mahakama za Kenya"],
              ["Ombi la kisheria", "Tunatii maombi halali kutoka kwa mamlaka zinazohusika za Kenya"],
              ["Kuarifu", "Pale sheria inaruhusu, tutakujulisha kabla ya kufichua data yako"],
            ],
          },
        ],
      },
    },

    {
      title: "7. International Transfers",
      paragraphs: [
        "Several of our service providers process data on servers located outside Kenya, including in the European Union, the United Kingdom, and the United States. Where personal data is transferred outside Kenya, we ensure adequate safeguards are in place, in accordance with Section 48 of the Act.",
      ],
      tables: [
        {
          caption: "Table 7.1 — Safeguards for international transfers",
          headers: ["Measure", "Description"],
          rows: [
            ["Provider selection", "We select providers that maintain recognised security certifications"],
            ["Contractual safeguards", "We enter into standard contractual clauses or equivalent safeguards where required"],
            ["Ongoing review", "We review the adequacy of safeguards periodically"],
          ],
        },
      ],
      kiswahili: {
        title: "7. Uhamisho wa Kimataifa",
        paragraphs: [
          "Watoa huduma wetu kadhaa wanashughulikia data kwenye seva zilizo nje ya Kenya, ikiwemo Umoja wa Ulaya, Uingereza, na Marekani. Pale data binafsi inahamishwa nje ya Kenya, tunahakikisha ulinzi wa kutosha umewekwa, kwa kuzingatia Kifungu cha 48 cha Sheria.",
        ],
        tables: [
          {
            caption: "Jedwali 7.1 — Kinga za uhamisho wa kimataifa",
            headers: ["Hatua", "Maelezo"],
            rows: [
              ["Uchaguzi wa mtoa huduma", "Tunachagua watoa huduma wanaodumisha vyeti vinavyotambulika vya usalama"],
              ["Kinga za kimkataba", "Tunaingia mikataba ya kawaida au kinga sawa inapohitajika"],
              ["Mapitio yanayoendelea", "Tunapitia utoshelevu wa kinga mara kwa mara"],
            ],
          },
        ],
      },
    },

    {
      title: "8. Data Retention",
      paragraphs: [
        "Personal data is retained only for as long as necessary for the purposes for which it was collected, or as required by law. The retention periods that apply are set out in Table 8.1.",
      ],
      tables: [
        {
          caption: "Table 8.1 — Retention periods",
          headers: ["Data category", "Retention period"],
          rows: [
            ["Account information", "For the duration of your membership, plus a reasonable administrative period. Deleted upon verified request"],
            ["Login session tokens", "Up to 365 days, or 30 days with the keep me signed in option"],
            ["Password reset codes", "15 minutes"],
            ["Email verification codes", "15 minutes"],
            ["Pending registrations", "15 minutes; cleared on server restart"],
            ["Push notification subscriptions", "Until unsubscribed or invalidated by your browser"],
            ["Contribution and payment records", "Minimum 7 years, as required for financial record-keeping in Kenya"],
            ["Chat messages and media", "While your account is active; deleted on request or account deletion"],
            ["Security and error logs", "Limited period, for security monitoring purposes"],
          ],
        },
      ],
      kiswahili: {
        title: "8. Uhifadhi wa Data",
        paragraphs: [
          "Data binafsi huhifadhiwa tu kwa muda unaohitajika kwa malengo ambayo ilikusanywa, au kama inavyohitajika na sheria. Vipindi vya uhifadhi vinavyotumika vimeainishwa katika Jedwali 8.1.",
        ],
        tables: [
          {
            caption: "Jedwali 8.1 — Vipindi vya uhifadhi",
            headers: ["Aina ya data", "Kipindi cha uhifadhi"],
            rows: [
              ["Taarifa za akaunti", "Kwa muda wa uanachama wako, pamoja na kipindi kinachofaa cha kiutawala. Hufutwa baada ya ombi lililothibitishwa"],
              ["Tokeni za kipindi cha kuingia", "Hadi siku 365, au siku 30 kwa chaguo la nisikumbuke"],
              ["Misimbo ya kubadilisha nenosiri", "Dakika 15"],
              ["Misimbo ya uthibitisho wa barua pepe", "Dakika 15"],
              ["Usajili unaosubiri", "Dakika 15; husafishwa seva inapowashwa upya"],
              ["Usajili wa arifa", "Hadi kujiondoa au kivinjari chako kibatilishe"],
              ["Kumbukumbu za michango na malipo", "Angalau miaka 7, kama inavyohitajika kwa kuhifadhi kumbukumbu za kifedha Kenya"],
              ["Ujumbe wa gumzo na vyombo vya habari", "Wakati akaunti yako iko hai; hufutwa kwa ombi au kufuta akaunti"],
              ["Kumbukumbu za usalama na makosa", "Kipindi kifupi, kwa madhumuni ya ufuatiliaji wa usalama"],
            ],
          },
        ],
      },
    },

    {
      title: "9. Your Rights",
      paragraphs: [
        "As a data subject under the Data Protection Act, 2019, you have the rights set out in Table 9.1.",
      ],
      tables: [
        {
          caption: "Table 9.1 — Rights of the data subject",
          headers: ["Reference", "Right", "Description"],
          rows: [
            ["R1", "Right to be informed", "To be told how your personal data is used"],
            ["R2", "Right of access", "To obtain a copy of the personal data we hold about you"],
            ["R3", "Right to rectification", "To have inaccurate or incomplete data corrected"],
            ["R4", "Right to erasure", "To have your personal data deleted, subject to legal retention obligations"],
            ["R5", "Right to restriction", "To limit processing in certain circumstances"],
            ["R6", "Right to object", "To object to processing based on legitimate interests"],
            ["R7", "Right to data portability", "To receive your data in a structured, commonly used format"],
            ["R8", "Right to withdraw consent", "To withdraw consent at any time without affecting prior processing"],
            ["R9", "Right to lodge a complaint", "To complain to the Office of the Data Protection Commissioner"],
          ],
        },
        {
          caption: "Table 9.2 — How to exercise your rights",
          headers: ["Step", "Action"],
          rows: [
            ["1", "Email the data protection contact shown in Table 2.1"],
            ["2", "State clearly which right you wish to exercise"],
            ["3", "Provide proof of identity if requested"],
            ["4", "We will respond within 30 days"],
          ],
        },
      ],
      paragraphsAfter: [
        "Complaints may also be lodged directly with the Office of the Data Protection Commissioner at www.odpc.go.ke.",
      ],
      kiswahili: {
        title: "9. Haki Zako",
        paragraphs: [
          "Kama mhusika wa data chini ya Sheria ya Ulinzi wa Data, 2019, unazo haki zilizoainishwa katika Jedwali 9.1.",
        ],
        tables: [
          {
            caption: "Jedwali 9.1 — Haki za mhusika wa data",
            headers: ["Kumbukumbu", "Haki", "Maelezo"],
            rows: [
              ["R1", "Haki ya kufahamishwa", "Kujulishwa jinsi data yako binafsi inatumika"],
              ["R2", "Haki ya ufikiaji", "Kupata nakala ya data binafsi tunayomiliki kukuhusu"],
              ["R3", "Haki ya kurekebishwa", "Kurekebisha data isiyo sahihi au isiyo kamili"],
              ["R4", "Haki ya kufutwa", "Kufuta data yako binafsi, kwa kuzingatia wajibu wa kisheria wa kuhifadhi"],
              ["R5", "Haki ya kuzuiwa", "Kupunguza usindikaji katika hali fulani"],
              ["R6", "Haki ya kupinga", "Kupinga usindikaji unaotegemea maslahi halali"],
              ["R7", "Haki ya kuhamisha data", "Kupokea data yako katika muundo uliopangwa, unaotumika kwa kawaida"],
              ["R8", "Haki ya kuondoa idhini", "Kuondoa idhini wakati wowote bila kuathiri usindikaji uliopita"],
              ["R9", "Haki ya kuwasilisha malalamiko", "Kulalamika kwa Ofisi ya Kamishna wa Ulinzi wa Data"],
            ],
          },
          {
            caption: "Jedwali 9.2 — Jinsi ya kutumia haki zako",
            headers: ["Hatua", "Kitendo"],
            rows: [
              ["1", "Tuma barua pepe kwa mawasiliano ya ulinzi wa data yaliyoonyeshwa katika Jedwali 2.1"],
              ["2", "Taja waziwazi haki unayotaka kutumia"],
              ["3", "Toa uthibitisho wa utambulisho ikiwa utaombwa"],
              ["4", "Tutajibu ndani ya siku 30"],
            ],
          },
        ],
        paragraphsAfter: [
          "Malalamiko yanaweza pia kuwasilishwa moja kwa moja kwa Ofisi ya Kamishna wa Ulinzi wa Data kwa www.odpc.go.ke.",
        ],
      },
    },

    {
      title: "10. Cookies and Local Storage",
      paragraphs: [
        "The Portal does not use advertising or third-party tracking cookies. We use your browser local storage only to provide essential functionality, as set out in Table 10.1.",
      ],
      tables: [
        {
          caption: "Table 10.1 — Essential local storage",
          headers: ["Purpose", "Description"],
          rows: [
            ["Session token", "Keeps you signed in while you use the Portal"],
            ["Account information cache", "Enables faster page loading"],
            ["Keep me signed in preference", "Remembers your sign-in preference for 30 days"],
            ["Notification permission state", "Remembers whether you allowed notifications"],
          ],
        },
      ],
      paragraphsAfter: [
        "You may clear this data at any time through your browser settings. Doing so will sign you out of the Portal.",
      ],
      kiswahili: {
        title: "10. Vidakuzi na Hifadhi ya Ndani",
        paragraphs: [
          "Portal haitumii vidakuzi vya matangazo au vya kufuatilia vya watu wengine. Tunatumia hifadhi ya ndani ya kivinjari chako tu kutoa utendaji muhimu, kama ilivyoelezwa katika Jedwali 10.1.",
        ],
        tables: [
          {
            caption: "Jedwali 10.1 — Hifadhi muhimu ya ndani",
            headers: ["Kusudi", "Maelezo"],
            rows: [
              ["Tokeni ya kipindi", "Inakuweka umeingia wakati unatumia Portal"],
              ["Akiba ya taarifa za akaunti", "Inawezesha upakiaji wa haraka wa kurasa"],
              ["Chaguo la nisikumbuke", "Hukumbuka chaguo lako la kuingia kwa siku 30"],
              ["Hali ya ruhusa ya arifa", "Hukumbuka kama uliruhusu arifa"],
            ],
          },
        ],
        paragraphsAfter: [
          "Unaweza kusafisha data hii wakati wowote kupitia mipangilio ya kivinjari chako. Kufanya hivyo kutakutoa kwenye Portal.",
        ],
      },
    },

    {
      title: "11. Security",
      paragraphs: [
        "We implement appropriate technical and organisational measures to protect personal data. The key measures are set out in Table 11.1.",
      ],
      tables: [
        {
          caption: "Table 11.1 — Security measures",
          headers: ["Measure", "Description"],
          rows: [
            ["Password hashing", "Passwords are hashed using bcrypt"],
            ["Transport security", "All communication is encrypted with HTTPS"],
            ["Session verification", "Session tokens are signed and verified on every request"],
            ["Access controls", "Administrative functions are restricted by role"],
            ["Monitoring", "Continuous monitoring for suspicious activity and abuse"],
          ],
        },
      ],
      paragraphsAfter: [
        "If you suspect your account has been compromised, notify us immediately using the contact shown in Table 2.1.",
      ],
      kiswahili: {
        title: "11. Usalama",
        paragraphs: [
          "Tunatekeleza hatua zinazofaa za kiufundi na kiutawala kulinda data binafsi. Hatua kuu zimeainishwa katika Jedwali 11.1.",
        ],
        tables: [
          {
            caption: "Jedwali 11.1 — Hatua za usalama",
            headers: ["Hatua", "Maelezo"],
            rows: [
              ["Ufichaji wa nenosiri", "Manenosiri hufichwa kwa kutumia bcrypt"],
              ["Usalama wa usafirishaji", "Mawasiliano yote hufichwa kwa HTTPS"],
              ["Uthibitisho wa kipindi", "Tokeni za kipindi husainiwa na kuthibitishwa kwa kila ombi"],
              ["Vidhibiti vya ufikiaji", "Kazi za kiutawala huzuiwa kwa wajibu"],
              ["Ufuatiliaji", "Ufuatiliaji wa mara kwa mara wa shughuli za kutiliwa shaka na unyanyasaji"],
            ],
          },
        ],
        paragraphsAfter: [
          "Ikiwa unashuku akaunti yako imevamiwa, tujulishe mara moja kwa kutumia mawasiliano yaliyoonyeshwa katika Jedwali 2.1.",
        ],
      },
    },

    {
      title: "12. Children",
      paragraphs: [
        "The Portal is intended for use by students and staff of Zetech University who are 18 years of age or older. We do not knowingly collect personal data from persons under 18. If you believe a minor has registered, please contact us so that we may delete the account.",
      ],
      kiswahili: {
        title: "12. Watoto",
        paragraphs: [
          "Portal imekusudiwa kutumiwa na wanafunzi na wafanyakazi wa Chuo Kikuu cha Zetech walio na umri wa miaka 18 au zaidi. Hatukusanyi kwa kujua data binafsi kutoka kwa watu chini ya miaka 18. Ikiwa unaamini mtoto mdogo amejiandikisha, tafadhali wasiliana nasi ili tuweze kufuta akaunti hiyo.",
        ],
      },
    },

    {
      title: "13. Amendments",
      paragraphs: [
        "We may amend this Privacy Policy from time to time. Any amendment will be reflected by an updated effective date at the head of this document, and material changes will be notified to users through the Portal.",
      ],
      kiswahili: {
        title: "13. Marekebisho",
        paragraphs: [
          "Tunaweza kurekebisha Sera hii ya Faragha mara kwa mara. Marekebisho yoyote yataonyeshwa kwa tarehe ya kuanza iliyosasishwa kwenye kichwa cha hati hii, na mabadiliko makubwa yatajulishwa kwa watumiaji kupitia Portal.",
        ],
      },
    },

    {
      title: "14. Contact",
      paragraphs: [
        "For any question regarding this Policy, or to exercise any of your rights, please contact the data protection contact shown in Table 2.1.",
      ],
      kiswahili: {
        title: "14. Mawasiliano",
        paragraphs: [
          "Kwa swali lolote kuhusu Sera hii, au kutumia haki yako yoyote, tafadhali wasiliana na mawasiliano ya ulinzi wa data yaliyoonyeshwa katika Jedwali 2.1.",
        ],
      },
    },
  ],

  footerNote:
    "This document is issued by Zetech University Catholic Action and is effective from 12 October 2026. Version 1.0. Document reference ZUCA LEGAL PP 001.",
};