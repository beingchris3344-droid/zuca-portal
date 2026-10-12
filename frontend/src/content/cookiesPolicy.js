/* ============================================================
   Cookies and Storage Policy — content only
   Edit the text in this file to change the document.
   ============================================================ */

export const cookiesPolicy = {
  slug: "cookies",
  documentTitle: "Cookies and Storage Policy · ZUCA",
  title: "Cookies and Storage Policy",
  subtitle: "Zetech University Catholic Action (ZUCA)",

  meta: [
    { label: "Effective date", value: "12 October 2026" },
    { label: "Version", value: "1.0" },
    { label: "Document reference", value: "ZUCA LEGAL CSP 001" },
    { label: "Governing law", value: "Data Protection Act, 2019 (Kenya)" },
    { label: "Applies to", value: "zetechcatholicaction.com and the ZUCA Portal" },
    { label: "Review cycle", value: "Annually, or upon material change" },
  ],

  kiswahili: {
    title: "Sera ya Vidakuzi na Hifadhi",
    subtitle: "Zetech University Catholic Action (ZUCA)",
    meta: [
      { label: "Tarehe ya kuanza", value: "12 Oktoba 2026" },
      { label: "Toleo", value: "1.0" },
      { label: "Kumbukumbu ya hati", value: "ZUCA LEGAL CSP 001" },
      { label: "Sheria inayotumika", value: "Sheria ya Ulinzi wa Data, 2019 (Kenya)" },
      { label: "Inatumika kwa", value: "zetechcatholicaction.com na ZUCA Portal" },
      { label: "Mzunguko wa mapitio", value: "Kila mwaka, au mapema pale inapohitajika" },
    ],
    footerNote:
      "Hati hii imetolewa na Zetech University Catholic Action na inaanza kutekelezwa tarehe 12 Oktoba 2026. Toleo 1.0. Kumbukumbu ya hati ZUCA LEGAL CSP 001.",
  },

  sections: [
    {
      title: "1. Introduction",
      paragraphs: [
        "This Cookies and Storage Policy explains how the ZUCA Portal (the Portal) uses cookies, local storage, and similar technologies on your device.",
        "It should be read alongside our Privacy Policy and our Terms of Service, which describe how we handle your personal data more broadly.",
      ],
      kiswahili: {
        title: "1. Utangulizi",
        paragraphs: [
          "Sera hii ya Vidakuzi na Hifadhi inaeleza jinsi ZUCA Portal (Portal) inatumia vidakuzi, hifadhi ya ndani, na teknolojia zinazofanana kwenye kifaa chako.",
          "Inapaswa kusomwa pamoja na Sera yetu ya Faragha na Masharti yetu ya Matumizi, yanayoeleza jinsi tunavyoshughulikia data yako binafsi kwa upana zaidi.",
        ],
      },
    },

    {
      title: "2. Our Approach",
      paragraphs: [
        "The Portal is designed to work with the minimum amount of storage possible. We do not use advertising cookies, we do not use third-party tracking cookies, and we do not sell any information collected from your device.",
        "Everything we store on your device serves one of the essential purposes described in Section 4.",
      ],
      kiswahili: {
        title: "2. Mbinu Yetu",
        paragraphs: [
          "Portal imeundwa kufanya kazi na kiwango cha chini kabisa cha hifadhi kinachowezekana. Hatutumii vidakuzi vya matangazo, hatutumii vidakuzi vya kufuatilia vya watu wengine, na hatuuzi taarifa yoyote iliyokusanywa kutoka kifaa chako.",
          "Kila kitu tunachohifadhi kwenye kifaa chako kinatumikia moja ya malengo muhimu yaliyoelezwa katika Sehemu ya 4.",
        ],
      },
    },

    {
      title: "3. What Cookies and Local Storage Are",
      paragraphs: [
        "Cookies are small text files placed on your device by websites you visit. Local storage is a similar technology that lets a website save small pieces of data on your device and read them back later.",
        "The Portal primarily uses local storage rather than cookies, because local storage is better suited to storing a login session and does not send data to our servers on every request.",
      ],
      kiswahili: {
        title: "3. Vidakuzi na Hifadhi ya Ndani ni Nini",
        paragraphs: [
          "Vidakuzi ni faili ndogo za maandishi zinazowekwa kwenye kifaa chako na tovuti unazotembelea. Hifadhi ya ndani ni teknolojia inayofanana inayoruhusu tovuti kuhifadhi vipande vidogo vya data kwenye kifaa chako na kuvirudisha baadaye.",
          "Portal hasa hutumia hifadhi ya ndani badala ya vidakuzi, kwa sababu hifadhi ya ndani inafaa zaidi kuhifadhi kipindi cha kuingia na haituma data kwenye seva zetu kwa kila ombi.",
        ],
      },
    },

    {
      title: "4. What We Store and Why",
      paragraphs: [
        "The Portal stores the following items on your device. All of them are strictly necessary for the Portal to function correctly. Because none of them are used for advertising or tracking, no consent is required to store them.",
      ],
      tables: [
        {
          caption: "Table 4.1 — Items stored on your device",
          headers: ["Item", "Type", "Purpose", "Retention"],
          rows: [
            ["Authentication token", "Local storage", "Keeps you signed in while you use the Portal and lets the server verify your identity on each request", "Up to 365 days, or 30 days with the keep me signed in option"],
            ["Account information cache", "Local storage", "Stores your name, email, and role so the Portal loads quickly on every visit", "Until you sign out or clear your browser"],
            ["Remember me preference", "Local storage", "Remembers your sign in preference so you do not have to re-enter your details each time", "30 days"],
            ["Notification permission state", "Local storage", "Remembers whether you allowed the Portal to send you notifications", "Until you change your browser settings"],
            ["Language preference", "Local storage", "Remembers whether you are reading documents in English or Kiswahili", "Until you change the language"],
            ["Session cookie", "Cookie", "Maintains a secure session between your browser and the Portal during your visit", "Ends when you close your browser"],
          ],
        },
      ],
    },

    {
      title: "5. What We Do Not Use",
      paragraphs: [
        "For absolute clarity, the Portal does not use any of the following:",
      ],
      list: [
        "Advertising cookies or advertising identifiers;",
        "Third-party analytics cookies (for example, Google Analytics);",
        "Social media tracking pixels (for example, Facebook Pixel);",
        "Cross-site tracking or retargeting technologies;",
        "Fingerprinting of your device, browser, or network.",
      ],
      paragraphsAfter: [
        "If this ever changes, we will update this Policy and ask for your consent before placing any such technology on your device.",
      ],
      kiswahili: {
        title: "5. Tunachotumia na Hatumii",
        paragraphs: [
          "Kwa uwazi kamili, Portal haitumii yafuatayo:",
        ],
        list: [
          "Vidakuzi vya matangazo au vitambulisho vya matangazo;",
          "Vidakuzi vya uchanganuzi vya watu wengine (kwa mfano, Google Analytics);",
          "Pikseli za kufuatilia za mitandao ya kijamii (kwa mfano, Facebook Pixel);",
          "Teknolojia za kufuatilia kwenye tovuti nyingine au kurudisha matangazo;",
          "Kuchukua alama za kidole za kifaa chako, kivinjari, au mtandao.",
        ],
        paragraphsAfter: [
          "Ikiwa hili litabadilika, tutasasisha Sera hii na kuomba idhini yako kabla ya kuweka teknolojia yoyote kama hiyo kwenye kifaa chako.",
        ],
      },
    },

    {
      title: "6. Third-Party Services",
      paragraphs: [
        "When you interact with certain features of the Portal, a small number of third-party services may set their own cookies or identifiers. We do not control these and they are governed by the privacy policies of those services.",
      ],
      tables: [
        {
          caption: "Table 6.1 — Third-party services",
          headers: ["Service", "When it is used", "What it may set"],
          rows: [
            ["Safaricom (M-Pesa)", "When you initiate a contribution payment", "Transaction cookies from the payment flow"],
            ["Cloudinary", "When you view media in the Gallery", "Delivery and caching cookies"],
            ["Supabase", "When a profile photograph is displayed", "Delivery cookies"],
            ["Google", "When the AI assistant or YouTube hub is used", "Third-party service cookies governed by Google"],
          ],
        },
      ],
      paragraphsAfter: [
        "We recommend reviewing the privacy policies of these services if you wish to understand their practices.",
      ],
      kiswahili: {
        title: "6. Huduma za Watu Wengine",
        paragraphs: [
          "Unapoingiliana na vipengele fulani vya Portal, idadi ndogo ya huduma za watu wengine zinaweza kuweka vidakuzi au vitambulisho vyao. Hatuwezi kudhibiti hivi na vinadhibitiwa na sera za faragha za huduma hizo.",
        ],
        tables: [
          {
            caption: "Jedwali 6.1 — Huduma za watu wengine",
            headers: ["Huduma", "Inatumika lini", "Inaweza kuweka nini"],
            rows: [
              ["Safaricom (M-Pesa)", "Unapoanzisha malipo ya mchango", "Vidakuzi vya muamala kutoka mtiririko wa malipo"],
              ["Cloudinary", "Unapotazama vyombo vya habari kwenye Gallery", "Vidakuzi vya usambazaji na akiba"],
              ["Supabase", "Picha ya wasifu inapoonyeshwa", "Vidakuzi vya usambazaji"],
              ["Google", "Msaidizi wa AI au YouTube hub inapotumika", "Vidakuzi vya huduma za watu wengine vinavyodhibitiwa na Google"],
            ],
          },
        ],
        paragraphsAfter: [
          "Tunapendekeza kupitia sera za faragha za huduma hizi ikiwa unataka kuelewa mazoea yao.",
        ],
      },
    },

    {
      title: "7. Managing Storage on Your Device",
      paragraphs: [
        "You are in full control of what is stored on your device. You can manage or clear cookies and local storage at any time.",
      ],
      tables: [
        {
          caption: "Table 7.1 — How to manage storage in common browsers",
          headers: ["Browser", "Where to manage"],
          rows: [
            ["Google Chrome", "Settings → Privacy and security → Third-party cookies and Site data"],
            ["Mozilla Firefox", "Settings → Privacy and Security → Cookies and Site Data"],
            ["Safari (macOS)", "Preferences → Privacy → Manage Website Data"],
            ["Safari (iOS)", "Settings → Safari → Advanced → Website Data"],
            ["Microsoft Edge", "Settings → Cookies and site permissions"],
            ["Samsung Internet", "Settings → Personal browsing data"],
          ],
        },
      ],
      paragraphsAfter: [
        "If you clear the Portal data from your browser, you will be signed out and your language preference will be reset to English.",
      ],
      kiswahili: {
        title: "7. Kusimamia Hifadhi kwenye Kifaa Chako",
        paragraphs: [
          "Unadhibiti kikamilifu kile kinachohifadhiwa kwenye kifaa chako. Unaweza kusimamia au kusafisha vidakuzi na hifadhi ya ndani wakati wowote.",
        ],
        tables: [
          {
            caption: "Jedwali 7.1 — Jinsi ya kusimamia hifadhi kwenye vivinjari vya kawaida",
            headers: ["Kivinjari", "Mahali pa kusimamia"],
            rows: [
              ["Google Chrome", "Mipangilio → Faragha na usalama → Vidakuzi vya watu wengine na data ya tovuti"],
              ["Mozilla Firefox", "Mipangilio → Faragha na Usalama → Vidakuzi na data ya tovuti"],
              ["Safari (macOS)", "Mapendeleo → Faragha → Simamia data ya tovuti"],
              ["Safari (iOS)", "Mipangilio → Safari → Kina → Data ya tovuti"],
              ["Microsoft Edge", "Mipangilio → Vidakuzi na ruhusa za tovuti"],
              ["Samsung Internet", "Mipangilio → Data ya kuvinjari ya kibinafsi"],
            ],
          },
        ],
        paragraphsAfter: [
          "Ukisafisha data ya Portal kutoka kwenye kivinjari chako, utatolewa kwenye akaunti na chaguo lako la lugha litarejeshwa kwa Kiingereza.",
        ],
      },
    },

    {
      title: "8. Do Not Track Signals",
      paragraphs: [
        "Some browsers send a Do Not Track (DNT) signal to websites you visit. The Portal does not respond to DNT signals because it does not track you across sites in the first place. Your privacy is respected regardless of whether DNT is on or off.",
      ],
      kiswahili: {
        title: "8. Ishara za Kutofuatilia",
        paragraphs: [
          "Vivinjari vingine hutuma ishara ya Kutofuatilia (DNT) kwa tovuti unazotembelea. Portal haijibu ishara za DNT kwa sababu haikufuatilii kwenye tovuti mbalimbali kwa kuanzia. Faragha yako inaheshimiwa bila kujali DNT iko imewashwa au imezimwa.",
        ],
      },
    },

    {
      title: "9. Changes to This Policy",
      paragraphs: [
        "We may update this Cookies and Storage Policy from time to time. Any update will be reflected by an updated effective date at the head of this document, and material changes will be notified to users through the Portal.",
      ],
      kiswahili: {
        title: "9. Mabadiliko ya Sera Hii",
        paragraphs: [
          "Tunaweza kusasisha Sera hii ya Vidakuzi na Hifadhi mara kwa mara. Sasisho lolote litaonyeshwa kwa tarehe ya kuanza iliyosasishwa kwenye kichwa cha hati hii, na mabadiliko makubwa yatajulishwa kwa watumiaji kupitia Portal.",
        ],
      },
    },

    {
      title: "10. Contact",
      paragraphs: [
        "For any question regarding this Policy, please contact:",
      ],
      address: [
        "<strong>Zetech University Catholic Action (ZUCA)</strong>",
        "Zetech University",
        "Kenya",
        "Email: <a href=\"mailto:zucaportal2025@gmail.com\">zucaportal2025@gmail.com</a>",
      ],
      kiswahili: {
        title: "10. Mawasiliano",
        paragraphs: [
          "Kwa swali lolote kuhusu Sera hii, tafadhali wasiliana na:",
        ],
        address: [
          "<strong>Zetech University Catholic Action (ZUCA)</strong>",
          "Chuo Kikuu cha Zetech",
          "Kenya",
          "Barua pepe: <a href=\"mailto:zucaportal2025@gmail.com\">zucaportal2025@gmail.com</a>",
        ],
      },
    },
  ],

  footerNote:
    "This document is issued by Zetech University Catholic Action and is effective from 12 October 2026. Version 1.0. Document reference ZUCA LEGAL CSP 001.",
};