/* ============================================================
   Terms of Service — content only
   Edit the text in this file to change the document.
   Do not touch LegalDocument.jsx unless you want to change the design.
   ============================================================ */

export const termsOfService = {
  slug: "terms",
  documentTitle: "Terms of Service · ZUCA",
  title: "Terms of Service",
  subtitle: "Zetech University Catholic Action (ZUCA)",

  meta: [
    { label: "Effective date", value: "12 October 2026" },
    { label: "Version", value: "1.0" },
    { label: "Document reference", value: "ZUCA LEGAL TOS 001" },
    { label: "Governing law", value: "The Republic of Kenya" },
    { label: "Applies to", value: "zetechcatholicaction.com and the ZUCA Portal" },
    { label: "Review cycle", value: "Annually, or upon material change" },
  ],

  kiswahili: {
    title: "Masharti ya Matumizi",
    subtitle: "Zetech University Catholic Action (ZUCA)",
    meta: [
      { label: "Tarehe ya kuanza", value: "12 Oktoba 2026" },
      { label: "Toleo", value: "1.0" },
      { label: "Kumbukumbu ya hati", value: "ZUCA LEGAL TOS 001" },
      { label: "Sheria inayotumika", value: "Jamhuri ya Kenya" },
      { label: "Inatumika kwa", value: "zetechcatholicaction.com na ZUCA Portal" },
      { label: "Mzunguko wa mapitio", value: "Kila mwaka, au mapema pale inapohitajika" },
    ],
    footerNote:
      "Hati hii imetolewa na Zetech University Catholic Action na inaanza kutekelezwa tarehe 12 Oktoba 2026. Toleo 1.0. Kumbukumbu ya hati ZUCA LEGAL TOS 001.",
  },

  sections: [
    {
      title: "1. Introduction and Acceptance",
      paragraphs: [
        "These Terms of Service (the Terms) govern your access to and use of the ZUCA Portal (the Portal), operated by Zetech University Catholic Action (ZUCA, we, us, or our).",
        "By registering for an account, accessing, or using the Portal, you agree to be bound by these Terms. If you do not agree with these Terms, you must not use the Portal.",
        "These Terms should be read alongside our Privacy Policy and Cookies and Storage Policy, which are incorporated by reference.",
      ],
      kiswahili: {
        title: "1. Utangulizi na Kukubali",
        paragraphs: [
          "Masharti haya ya Matumizi (Masharti) yanadhibiti ufikiaji na matumizi yako ya ZUCA Portal (Portal), inayoendeshwa na Zetech University Catholic Action (ZUCA, sisi, au wetu).",
          "Kwa kujiandikisha akaunti, kufikia, au kutumia Portal, unakubali kufungwa na Masharti haya. Ikiwa hukubaliani na Masharti haya, haupaswi kutumia Portal.",
          "Masharti haya yanapaswa kusomwa pamoja na Sera yetu ya Faragha na Sera yetu ya Vidakuzi na Hifadhi, ambazo zinajumuishwa kwa marejeleo.",
        ],
      },
    },

    {
      title: "2. About ZUCA",
      paragraphs: [
        "ZUCA is the official Catholic community of Zetech University, Kenya. The Portal is provided as a service to ZUCA members to facilitate community life, communication, spiritual activities, contributions, and administration of the club.",
        "The Portal is operated on a non-commercial basis. It is not a commercial product and is not offered for profit.",
      ],
      kiswahili: {
        title: "2. Kuhusu ZUCA",
        paragraphs: [
          "ZUCA ni jumuiya rasmi ya Kikatoliki ya Chuo Kikuu cha Zetech, Kenya. Portal imetolewa kama huduma kwa wanachama wa ZUCA ili kuwezesha maisha ya jumuiya, mawasiliano, shughuli za kiroho, michango, na uendeshaji wa klabu.",
          "Portal inaendeshwa kwa msingi usio wa kibiashara. Si bidhaa ya kibiashara na haitolewi kwa faida.",
        ],
      },
    },

    {
      title: "3. Eligibility",
      paragraphs: [
        "To use the Portal, you must meet all of the requirements set out in Table 3.1.",
      ],
      tables: [
        {
          caption: "Table 3.1 — Eligibility requirements",
          headers: ["Requirement", "Detail"],
          rows: [
            ["Affiliation", "You must be a registered student or a member of staff of Zetech University"],
            ["Age", "You must be at least 18 years of age"],
            ["Accurate information", "You must provide accurate, current, and complete information during registration"],
            ["Prior standing", "You must not have been previously suspended or removed from the Portal by ZUCA"],
          ],
        },
      ],
      paragraphsAfter: [
        "By registering, you confirm that you meet these requirements. If you do not meet them, you must not use the Portal.",
      ],
      kiswahili: {
        title: "3. Sifa za Kustahiki",
        paragraphs: [
          "Kutumia Portal, lazima utimize mahitaji yote yaliyoorodheshwa katika Jedwali 3.1.",
        ],
        tables: [
          {
            caption: "Jedwali 3.1 — Mahitaji ya kustahiki",
            headers: ["Sharti", "Maelezo"],
            rows: [
              ["Uhusiano", "Lazima uwe mwanafunzi aliyeandikishwa au mfanyakazi wa Chuo Kikuu cha Zetech"],
              ["Umri", "Lazima uwe na umri wa miaka 18 au zaidi"],
              ["Taarifa sahihi", "Lazima utoe taarifa sahihi, za sasa, na kamili wakati wa kujiandikisha"],
              ["Hali ya awali", "Haupaswi kuwa umesimamishwa au kuondolewa kwenye Portal hapo awali na ZUCA"],
            ],
          },
        ],
        paragraphsAfter: [
          "Kwa kujiandikisha, unathibitisha kwamba unatimiza mahitaji haya. Ikiwa hutimizi, haupaswi kutumia Portal.",
        ],
      },
    },

    {
      title: "4. Your Account",
      paragraphs: [
        "Your account is subject to the rules set out in this section. These rules are essential to the security and fairness of the Portal.",
      ],
      subsections: [
        {
          title: "4.1 One account per person",
          paragraphs: [
            "You may hold only one ZUCA Portal account. Duplicate accounts, accounts created on behalf of another person without their consent, and shared accounts are not permitted.",
          ],
        },
        {
          title: "4.2 Accurate information",
          paragraphs: [
            "You agree to provide truthful, accurate, and current information during registration and to keep it up to date. Providing false or misleading information may result in suspension or termination of your account.",
          ],
        },
        {
          title: "4.3 Account security",
          paragraphs: [
            "You are responsible for maintaining the confidentiality of your password and for all activity that occurs under your account. You must:",
          ],
          list: [
            "Choose a strong, unique password;",
            "Not share your password with anyone;",
            "Notify us immediately at zucaportal2025@gmail.com if you suspect unauthorised access to your account.",
          ],
        },
        {
          title: "4.4 Biometric login",
          paragraphs: [
            "You may optionally enable fingerprint login. By doing so, you consent to the storage of a public cryptographic identifier on our servers that allows your device to recognise you. Your fingerprint data remains on your device and is never transmitted to us.",
          ],
        },
        {
          title: "4.5 Membership number",
          paragraphs: [
            "Upon successful registration, you will be assigned a unique membership number (format: Z#001, Z#002, and so on). This number is personal to you. You must:",
          ],
          list: [
            "Keep your membership number confidential;",
            "Not share it with anyone else, including family and friends;",
            "Use it only for the purposes for which it is issued (account access, identification within ZUCA).",
          ],
        },
        {
          title: "4.6 Cancellation of membership numbers",
          paragraphs: [
            "ZUCA reserves the right to cancel or reassign any membership number that is misused.",
          ],
        },
      ],
      kiswahili: {
        title: "4. Akaunti Yako",
        paragraphs: [
          "Akaunti yako inategemea kanuni zilizoelezwa katika sehemu hii. Kanuni hizi ni muhimu kwa usalama na uadilifu wa Portal.",
        ],
        subsections: [
          {
            title: "4.1 Akaunti moja kwa kila mtu",
            paragraphs: [
              "Unaweza kuwa na akaunti moja tu ya ZUCA Portal. Akaunti za marudio, akaunti zilizoundwa kwa niaba ya mtu mwingine bila idhini yake, na akaunti zinazotumiwa kwa pamoja haziruhusiwi.",
            ],
          },
          {
            title: "4.2 Taarifa sahihi",
            paragraphs: [
              "Unakubali kutoa taarifa za kweli, sahihi, na za sasa wakati wa kujiandikisha na kuzihifadhi zikiwa za sasa. Kutoa taarifa za uongo au za kupotosha kunaweza kusababisha kusimamishwa au kufutwa kwa akaunti yako.",
            ],
          },
          {
            title: "4.3 Usalama wa akaunti",
            paragraphs: [
              "Unawajibika kwa kudumisha usiri wa nenosiri lako na kwa shughuli zote zinazotokea chini ya akaunti yako. Lazima:",
            ],
            list: [
              "Uchague nenosiri imara na la kipekee;",
              "Usishiriki nenosiri lako na mtu yeyote;",
              "Utujulishe mara moja kwa zucaportal2025@gmail.com ikiwa unashuku ufikiaji usioidhinishwa wa akaunti yako.",
            ],
          },
          {
            title: "4.4 Kuingia kwa alama ya kidole",
            paragraphs: [
              "Unaweza kwa hiari kuwezesha kuingia kwa alama ya kidole. Kwa kufanya hivyo, unakubali kuhifadhiwa kwa kitambulisho cha umma cha kriptografia kwenye seva zetu kinachoruhusu kifaa chako kukutambua. Data yako ya alama ya kidole hubaki kwenye kifaa chako na haitumwa kwetu kamwe.",
            ],
          },
          {
            title: "4.5 Namba ya uanachama",
            paragraphs: [
              "Baada ya kujiandikisha kwa mafanikio, utapewa namba ya kipekee ya uanachama (muundo: Z#001, Z#002, na kadhalika). Namba hii ni yako binafsi. Lazima:",
            ],
            list: [
              "Uweke namba yako ya uanachama kwa usiri;",
              "Usiishiriki na mtu mwingine yeyote, ikiwemo familia na marafiki;",
              "Uitumie tu kwa malengo ambayo imetolewa (ufikiaji wa akaunti, utambulisho ndani ya ZUCA).",
            ],
          },
          {
            title: "4.6 Kufuta namba za uanachama",
            paragraphs: [
              "ZUCA inahifadhi haki ya kufuta au kubadilisha namba yoyote ya uanachama inayotumiwa vibaya.",
            ],
          },
        ],
      },
    },

    {
      title: "5. Acceptable Use",
      paragraphs: [
        "You agree to use the Portal only for lawful purposes and in a manner that does not infringe the rights of, or restrict the use of, the Portal by any other person. You must not:",
      ],
      orderedList: [
        "Post, upload, or transmit any content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, hateful, or racially or ethnically offensive;",
        "Impersonate any person, or falsely represent your affiliation with any person or organisation;",
        "Use the Portal to send unsolicited commercial messages, spam, chain letters, or pyramid schemes;",
        "Attempt to gain unauthorised access to any part of the Portal, or to any account, computer system, or network connected to the Portal;",
        "Interfere with or disrupt the Portal or servers or networks connected to the Portal;",
        "Use any automated system (including bots, scrapers, or crawlers) to access the Portal without our prior written consent;",
        "Collect or store personal data about other users without their consent;",
        "Upload or transmit any material that contains viruses, malware, or any other harmful code;",
        "Reproduce, duplicate, copy, sell, resell, or exploit any portion of the Portal for commercial purposes without our express written permission;",
        "Use the Portal in any way that violates applicable law or the rights of any third party.",
      ],
      kiswahili: {
        title: "5. Matumizi Yanayokubalika",
        paragraphs: [
          "Unakubali kutumia Portal kwa madhumuni halali tu na kwa namna isiyokiuka haki za, au kuzuia matumizi ya, Portal na mtu mwingine yeyote. Haupaswi:",
        ],
        orderedList: [
          "Kuchapisha, kupakia, au kuwasilisha maudhui yoyote yasiyo halali, yenye madhara, ya vitisho, ya unyanyasaji, ya udhalilishaji, ya matusi, ya uchafu, ya chuki, au ya ubaguzi wa rangi au kabila;",
          "Kujifanya mtu mwingine, au kuwakilisha kwa uongo uhusiano wako na mtu au taasisi yoyote;",
          "Kutumia Portal kutuma ujumbe wa kibiashara ambao haujaombwa, barua taka, barua za mnyororo, au mipango ya piramidi;",
          "Kujaribu kupata ufikiaji usioidhinishwa wa sehemu yoyote ya Portal, au akaunti, mfumo wa kompyuta, au mtandao uliounganishwa na Portal;",
          "Kuingilia au kuvuruga Portal au seva au mitandao iliyounganishwa na Portal;",
          "Kutumia mfumo wowote wa kiotomatiki (ikiwemo boti, skrepa, au kraula) kufikia Portal bila idhini yetu ya maandishi;",
          "Kukusanya au kuhifadhi data binafsi kuhusu watumiaji wengine bila idhini yao;",
          "Kupakia au kuwasilisha nyenzo yoyote iliyo na virusi, programu hasidi, au msimbo mwingine wowote wenye madhara;",
          "Kuzalisha, kunakili, kuuza, kuuza tena, au kutumia kwa faida sehemu yoyote ya Portal kwa madhumuni ya kibiashara bila idhini yetu ya maandishi;",
          "Kutumia Portal kwa namna yoyote inayokiuka sheria inayotumika au haki za mtu mwingine yeyote.",
        ],
      },
    },

    {
      title: "6. User Content",
      paragraphs: [
        "The rules in this section govern all content you post, upload, or transmit through the Portal.",
      ],
      subsections: [
        {
          title: "6.1 Ownership",
          paragraphs: [
            "You retain all rights to the content you post, upload, or transmit through the Portal (User Content), including messages, photographs, videos, documents, and comments.",
          ],
        },
        {
          title: "6.2 Licence to ZUCA",
          paragraphs: [
            "By posting User Content on the Portal, you grant ZUCA a non-exclusive, royalty-free, worldwide licence to use, store, display, reproduce, and distribute that User Content solely for the purpose of operating and providing the Portal. This licence ends when you delete the content or your account, except for content that has been shared with other users and remains in their accounts, or where retention is required by law.",
          ],
        },
        {
          title: "6.3 Responsibility",
          paragraphs: [
            "You are solely responsible for the User Content you upload. You confirm that you own or have the necessary rights to all content you post, and that your content does not infringe the rights of any third party.",
          ],
        },
        {
          title: "6.4 Moderation",
          paragraphs: [
            "ZUCA reserves the right, but has no obligation, to review, monitor, edit, or remove any User Content that violates these Terms or that we consider, in our sole discretion, inappropriate or harmful. Repeated violations may result in suspension or termination of your account.",
          ],
        },
      ],
      kiswahili: {
        title: "6. Maudhui ya Mtumiaji",
        paragraphs: [
          "Kanuni katika sehemu hii zinadhibiti maudhui yote unayochapisha, kupakia, au kuwasilisha kupitia Portal.",
        ],
        subsections: [
          {
            title: "6.1 Umiliki",
            paragraphs: [
              "Unahifadhi haki zote za maudhui unayochapisha, kupakia, au kuwasilisha kupitia Portal (Maudhui ya Mtumiaji), ikiwemo ujumbe, picha, video, hati, na maoni.",
            ],
          },
          {
            title: "6.2 Leseni kwa ZUCA",
            paragraphs: [
              "Kwa kuchapisha Maudhui ya Mtumiaji kwenye Portal, unampa ZUCA leseni isiyo ya kipekee, isiyo na mrabaha, ya kimataifa kutumia, kuhifadhi, kuonyesha, kuzalisha, na kusambaza Maudhui hayo ya Mtumiaji kwa madhumuni ya kuendesha na kutoa Portal tu. Leseni hii inaisha unapofuta maudhui au akaunti yako, isipokuwa maudhui yaliyoshirikiwa na watumiaji wengine na kubaki kwenye akaunti zao, au pale uhifadhi unahitajika kwa sheria.",
            ],
          },
          {
            title: "6.3 Uwajibikaji",
            paragraphs: [
              "Unawajibika peke yako kwa Maudhui ya Mtumiaji unayopakia. Unathibitisha kwamba unamiliki au unazo haki zinazohitajika za maudhui yote unayochapisha, na kwamba maudhui yako hayakiuki haki za mtu mwingine yeyote.",
            ],
          },
          {
            title: "6.4 Usimamizi",
            paragraphs: [
              "ZUCA inahifadhi haki, lakini haina wajibu, wa kupitia, kufuatilia, kuhariri, au kuondoa Maudhui yoyote ya Mtumiaji yanayokiuka Masharti haya au ambayo tunayachukulia, kwa uamuzi wetu pekee, kuwa yasiyofaa au yenye madhara. Ukiukaji unaorudiwa unaweza kusababisha kusimamishwa au kufutwa kwa akaunti yako.",
            ],
          },
        ],
      },
    },

    {
      title: "7. Contributions and Payments",
      paragraphs: [
        "The rules in this section govern contributions and payments made through the Portal.",
      ],
      subsections: [
        {
          title: "7.1 Voluntary contributions",
          paragraphs: [
            "Contributions and pledges made through the Portal are voluntary donations to ZUCA. They are not payment for goods or services.",
          ],
        },
        {
          title: "7.2 M-Pesa payments",
          paragraphs: [
            "The Portal supports contributions via M-Pesa, operated by Safaricom PLC. By making a payment, you agree to Safaricom's terms and conditions. We do not store your M-Pesa PIN. We receive only a transaction confirmation reference.",
          ],
        },
        {
          title: "7.3 No refunds",
          paragraphs: [
            "All contributions are final. Refunds are not provided except where required by applicable law, or where a payment has been made in error and the error is promptly reported to us.",
          ],
        },
        {
          title: "7.4 Record-keeping",
          paragraphs: [
            "Records of contributions and pledges are kept for a minimum of seven (7) years, as required for financial record-keeping under Kenyan law.",
          ],
        },
      ],
      kiswahili: {
        title: "7. Michango na Malipo",
        paragraphs: [
          "Kanuni katika sehemu hii zinadhibiti michango na malipo yanayofanywa kupitia Portal.",
        ],
        subsections: [
          {
            title: "7.1 Michango ya hiari",
            paragraphs: [
              "Michango na ahadi zinazofanywa kupitia Portal ni michango ya hiari kwa ZUCA. Si malipo ya bidhaa au huduma.",
            ],
          },
          {
            title: "7.2 Malipo ya M-Pesa",
            paragraphs: [
              "Portal inasaidia michango kupitia M-Pesa, inayoendeshwa na Safaricom PLC. Kwa kufanya malipo, unakubali masharti na vigezo vya Safaricom. Hatuweki PIN yako ya M-Pesa. Tunapokea tu kumbukumbu ya uthibitisho wa muamala.",
            ],
          },
          {
            title: "7.3 Hakuna marejesho",
            paragraphs: [
              "Michango yote ni ya mwisho. Marejesho hayatolewi isipokuwa pale inavyohitajika na sheria inayotumika, au pale malipo yamefanywa kwa makosa na kosa limeripotiwa kwetu haraka.",
            ],
          },
          {
            title: "7.4 Uhifadhi wa kumbukumbu",
            paragraphs: [
              "Kumbukumbu za michango na ahadi huhifadhiwa kwa angalau miaka saba (7), kama inavyohitajika kwa kuhifadhi kumbukumbu za kifedha chini ya sheria ya Kenya.",
            ],
          },
        ],
      },
    },

    {
      title: "8. Copyright and Intellectual Property",
      paragraphs: [
        "All content on the Portal not uploaded by users, including text, graphics, logos, images, and software, is the property of ZUCA or its licensors and is protected by Kenyan and international copyright laws.",
        "You may not copy, reproduce, modify, distribute, display, or create derivative works from ZUCA content without our express written permission.",
        "The ZUCA name, logo, and membership number format are the property of Zetech University Catholic Action.",
      ],
      kiswahili: {
        title: "8. Hakimiliki na Mali ya Kiakili",
        paragraphs: [
          "Maudhui yote kwenye Portal ambayo hayakupakiwa na watumiaji, ikiwemo maandishi, michoro, nembo, picha, na programu, ni mali ya ZUCA au watoa leseni wake na yanalindwa na sheria za hakimiliki za Kenya na kimataifa.",
          "Haupaswi kunakili, kuzalisha, kurekebisha, kusambaza, kuonyesha, au kuunda kazi zinazotokana na maudhui ya ZUCA bila idhini yetu ya maandishi.",
          "Jina la ZUCA, nembo, na muundo wa namba ya uanachama ni mali ya Zetech University Catholic Action.",
        ],
      },
    },

    {
      title: "9. Privacy",
      paragraphs: [
        "Our collection and use of your personal data is governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the Portal, you consent to that processing.",
      ],
      kiswahili: {
        title: "9. Faragha",
        paragraphs: [
          "Ukusanyaji na matumizi yetu ya data yako binafsi yanadhibitiwa na Sera yetu ya Faragha, ambayo imejumuishwa katika Masharti haya kwa marejeleo. Kwa kutumia Portal, unakubali usindikaji huo.",
        ],
      },
    },

    {
      title: "10. Third-Party Services",
      paragraphs: [
        "The Portal integrates with third-party services including M-Pesa (Safaricom), Google (Gemini, YouTube), Groq, Supabase, Cloudinary, Resend, Brevo, and WhatsApp. Your use of these services through the Portal may be subject to their own terms and privacy policies. ZUCA is not responsible for the practices of these third parties.",
      ],
      kiswahili: {
        title: "10. Huduma za Watu Wengine",
        paragraphs: [
          "Portal inaunganishwa na huduma za watu wengine ikiwemo M-Pesa (Safaricom), Google (Gemini, YouTube), Groq, Supabase, Cloudinary, Resend, Brevo, na WhatsApp. Matumizi yako ya huduma hizi kupitia Portal yanaweza kuwa chini ya masharti na sera za faragha zao. ZUCA haiwajibiki kwa mazoea ya watu hawa wengine.",
        ],
      },
    },

    {
      title: "11. Suspension and Termination",
      paragraphs: [
        "The circumstances under which your account may be suspended or terminated are set out in this section.",
      ],
      subsections: [
        {
          title: "11.1 By you",
          paragraphs: [
            "You may close your account at any time by using the account deletion option in your profile settings, or by contacting us at zucaportal2025@gmail.com.",
          ],
        },
        {
          title: "11.2 By ZUCA",
          paragraphs: [
            "We may suspend or terminate your access to the Portal, with or without notice, if we reasonably believe that you have:",
          ],
          list: [
            "Violated these Terms;",
            "Engaged in fraudulent, abusive, or unlawful activity;",
            "Created multiple accounts or misused your membership number;",
            "Acted in a way that harms other users, ZUCA, or Zetech University;",
            "Failed to meet the eligibility requirements in Section 3.",
          ],
        },
        {
          title: "11.3 Effect of termination",
          paragraphs: [
            "Upon termination, your right to use the Portal ceases immediately. Provisions of these Terms that by their nature should survive termination, including Sections 6 (User Content), 8 (Intellectual Property), 12 (Disclaimers), 13 (Limitation of Liability), and 15 (Governing Law), shall continue to apply.",
          ],
        },
      ],
      kiswahili: {
        title: "11. Kusimamishwa na Kufutwa",
        paragraphs: [
          "Mazingira ambayo akaunti yako inaweza kusimamishwa au kufutwa yameainishwa katika sehemu hii.",
        ],
        subsections: [
          {
            title: "11.1 Kwa upande wako",
            paragraphs: [
              "Unaweza kufunga akaunti yako wakati wowote kwa kutumia chaguo la kufuta akaunti kwenye mipangilio ya wasifu wako, au kwa kuwasiliana nasi kwa zucaportal2025@gmail.com.",
            ],
          },
          {
            title: "11.2 Kwa upande wa ZUCA",
            paragraphs: [
              "Tunaweza kusimamisha au kufuta ufikiaji wako wa Portal, kwa taarifa au bila, ikiwa tunaamini kwa sababu inayofaa kwamba:",
            ],
            list: [
              "Umevunja Masharti haya;",
              "Umehusika na shughuli za udanganyifu, unyanyasaji, au zisizo halali;",
              "Umeunda akaunti nyingi au umetumia vibaya namba yako ya uanachama;",
              "Umefanya jambo linalodhuru watumiaji wengine, ZUCA, au Chuo Kikuu cha Zetech;",
              "Hukutimiza mahitaji ya kustahiki katika Sehemu ya 3.",
            ],
          },
          {
            title: "11.3 Athari za kufutwa",
            paragraphs: [
              "Baada ya kufutwa, haki yako ya kutumia Portal inaisha mara moja. Vifungu vya Masharti haya ambavyo kwa asili yake vinapaswa kuendelea baada ya kufutwa, ikiwemo Sehemu ya 6 (Maudhui ya Mtumiaji), 8 (Mali ya Kiakili), 12 (Kanusho), 13 (Kikomo cha Dhima), na 15 (Sheria Inayotumika), vitaendelea kutumika.",
            ],
          },
        ],
      },
    },

    {
      title: "12. Disclaimers",
      paragraphs: [
        "The Portal is provided on an as is and as available basis. To the fullest extent permitted by law, ZUCA makes no warranties, express or implied, regarding:",
      ],
      list: [
        "The availability, reliability, or uninterrupted operation of the Portal;",
        "The accuracy or completeness of any content on the Portal;",
        "The suitability of the Portal for any particular purpose; or",
        "The correction of any defects, errors, or interruptions.",
      ],
      paragraphsAfter: [
        "You use the Portal at your own risk. ZUCA does not warrant that the Portal will be free from viruses or other harmful components.",
      ],
      kiswahili: {
        title: "12. Kanusho",
        paragraphs: [
          "Portal inatolewa kwa msingi wa kama ilivyo na inavyopatikana. Kwa kiwango kikubwa kinachoruhusiwa na sheria, ZUCA haitoi dhamana yoyote, ya wazi au ya kimafumbo, kuhusu:",
        ],
        list: [
          "Upatikanaji, uaminifu, au uendeshaji usiokatizwa wa Portal;",
          "Usahihi au ukamilifu wa maudhui yoyote kwenye Portal;",
          "Kufaa kwa Portal kwa kusudi lolote fulani; au",
          "Kurekebishwa kwa hitilafu, makosa, au usumbufu wowote.",
        ],
        paragraphsAfter: [
          "Unatumia Portal kwa hatari yako mwenyewe. ZUCA haitoi dhamana kwamba Portal haitakuwa na virusi au viambato vingine vyenye madhara.",
        ],
      },
    },

    {
      title: "13. Limitation of Liability",
      paragraphs: [
        "To the fullest extent permitted by law, ZUCA, its officers, members, volunteers, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or in connection with your use of, or inability to use, the Portal. This includes, but is not limited to, loss of data, loss of contributions, or loss of reputation.",
        "Nothing in these Terms limits any liability that cannot be excluded under Kenyan law.",
      ],
      kiswahili: {
        title: "13. Kikomo cha Dhima",
        paragraphs: [
          "Kwa kiwango kikubwa kinachoruhusiwa na sheria, ZUCA, maafisa wake, wanachama, wajitoleaji, na mawakala hawatawajibika kwa uharibifu wowote wa moja kwa moja, wa bahati nasibu, maalum, unaofuatia, au wa adhabu unaotokana na au kuhusiana na matumizi yako ya, au kutoweza kutumia, Portal. Hii inajumuisha, lakini haikomei kwa, upotevu wa data, upotevu wa michango, au upotevu wa sifa.",
          "Hakuna kitu katika Masharti haya kinachopunguza dhima yoyote ambayo haiwezi kuondolewa chini ya sheria ya Kenya.",
        ],
      },
    },

    {
      title: "14. Indemnity",
      paragraphs: [
        "You agree to indemnify and hold harmless ZUCA, its officers, members, volunteers, and agents from and against any claim, liability, damage, loss, or expense (including reasonable legal fees) arising out of:",
      ],
      list: [
        "Your violation of these Terms;",
        "Your violation of any law or third-party right; or",
        "Any content you upload or transmit through the Portal.",
      ],
      kiswahili: {
        title: "14. Fidia",
        paragraphs: [
          "Unakubali kufidia na kuwaachilia huru ZUCA, maafisa wake, wanachama, wajitoleaji, na mawakala kutoka na dhidi ya madai yoyote, dhima, uharibifu, upotevu, au gharama (ikiwemo ada zinazofaa za kisheria) zinazotokana na:",
        ],
        list: [
          "Ukiukaji wako wa Masharti haya;",
          "Ukiukaji wako wa sheria yoyote au haki ya mtu mwingine; au",
          "Maudhui yoyote unayopakia au kuwasilisha kupitia Portal.",
        ],
      },
    },

    {
      title: "15. Governing Law and Dispute Resolution",
      paragraphs: [
        "These Terms are governed by and construed in accordance with the laws of the Republic of Kenya. Any dispute arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of Kenya.",
        "Before commencing any legal proceedings, the parties agree to attempt to resolve any dispute amicably by contacting zucaportal2025@gmail.com.",
      ],
      kiswahili: {
        title: "15. Sheria Inayotumika na Utatuzi wa Migogoro",
        paragraphs: [
          "Masharti haya yanadhibitiwa na kufasiriwa kwa mujibu wa sheria za Jamhuri ya Kenya. Mgogoro wowote unaotokana na au kuhusiana na Masharti haya utakuwa chini ya mamlaka ya kipekee ya mahakama za Kenya.",
          "Kabla ya kuanza kesi yoyote ya kisheria, pande zote zinakubali kujaribu kutatua mgogoro wowote kwa amani kwa kuwasiliana na zucaportal2025@gmail.com.",
        ],
      },
    },

    {
      title: "16. Changes to These Terms",
      paragraphs: [
        "We may revise these Terms from time to time. Any revisions will be reflected by an updated effective date at the head of this document, and material changes will be notified to users through the Portal.",
        "Your continued use of the Portal after any revision constitutes your acceptance of the revised Terms.",
      ],
      kiswahili: {
        title: "16. Mabadiliko ya Masharti Haya",
        paragraphs: [
          "Tunaweza kurekebisha Masharti haya mara kwa mara. Marekebisho yoyote yataonyeshwa kwa tarehe ya kuanza iliyosasishwa kwenye kichwa cha hati hii, na mabadiliko makubwa yatajulishwa kwa watumiaji kupitia Portal.",
          "Kuendelea kutumia Portal baada ya marekebisho yoyote kunamaanisha kukubali kwako Masharti yaliyorekebishwa.",
        ],
      },
    },

    {
      title: "17. General",
      paragraphs: [
        "The provisions in this section apply to the interpretation and enforcement of these Terms.",
      ],
      subsections: [
        {
          title: "17.1 Entire agreement",
          paragraphs: [
            "These Terms, together with our Privacy Policy and Cookies and Storage Policy, constitute the entire agreement between you and ZUCA concerning the Portal.",
          ],
        },
        {
          title: "17.2 Severability",
          paragraphs: [
            "If any provision of these Terms is held to be invalid or unenforceable, that provision shall be severed and the remaining provisions shall continue in full force and effect.",
          ],
        },
        {
          title: "17.3 No waiver",
          paragraphs: [
            "Our failure to enforce any right or provision of these Terms shall not be deemed a waiver of that right or provision.",
          ],
        },
        {
          title: "17.4 Assignment",
          paragraphs: [
            "You may not assign your rights or obligations under these Terms without our prior written consent.",
          ],
        },
      ],
      kiswahili: {
        title: "17. Jumla",
        paragraphs: [
          "Vifungu katika sehemu hii vinatumika kwa ufasiri na utekelezaji wa Masharti haya.",
        ],
        subsections: [
          {
            title: "17.1 Makubaliano kamili",
            paragraphs: [
              "Masharti haya, pamoja na Sera yetu ya Faragha na Sera yetu ya Vidakuzi na Hifadhi, yanajumuisha makubaliano kamili kati yako na ZUCA kuhusu Portal.",
            ],
          },
          {
            title: "17.2 Utengano",
            paragraphs: [
              "Ikiwa kifungu chochote cha Masharti haya kitaonekana kuwa batili au kisichotekelezeka, kifungu hicho kitatengwa na vifungu vilivyobaki vitaendelea kuwa na nguvu kamili.",
            ],
          },
          {
            title: "17.3 Hakuna kuachana na haki",
            paragraphs: [
              "Kutotekeleza kwetu haki au kifungu chochote cha Masharti haya hakutachukuliwa kuwa kuachana na haki au kifungu hicho.",
            ],
          },
          {
            title: "17.4 Uhamisho",
            paragraphs: [
              "Haupaswi kuhamisha haki au wajibu wako chini ya Masharti haya bila idhini yetu ya awali ya maandishi.",
            ],
          },
        ],
      },
    },

    {
      title: "18. Contact",
      paragraphs: [
        "For any question regarding these Terms, please contact:",
      ],
      address: [
        "<strong>Zetech University Catholic Action (ZUCA)</strong>",
        "Zetech University",
        "Kenya",
        "Email: <a href=\"mailto:zucaportal2025@gmail.com\">zucaportal2025@gmail.com</a>",
      ],
      kiswahili: {
        title: "18. Mawasiliano",
        paragraphs: [
          "Kwa swali lolote kuhusu Masharti haya, tafadhali wasiliana na:",
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
    "This document is issued by Zetech University Catholic Action and is effective from 12 October 2026. Version 1.0. Document reference ZUCA LEGAL TOS 001.",
};