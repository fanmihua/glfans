// Public profile facts from GL Spotlight's individual actress records, reviewed 2026-09-10.
// This secondary catalogue is credited as such; agency corroboration is stored separately.
// Never manufacture a handle from an actor's name, and never replace missing data with zero.
const rows = [
  [
    "Namtan Tipnaree",
    "namtan",
    "Tipnaree Weerawatnodom",
    "1996-07-01",
    "169",
    "namtan.tipnaree",
    "NamtanTipnaree"
  ],
  [
    "Film Rachanun",
    "film",
    "Rachanun Mahawan",
    "2000-07-14",
    "164",
    "fr.racha",
    "filmracha"
  ],
  [
    "Emi Thasorn",
    "emi",
    "Thasorn Klinnium",
    "1998-04-25",
    "165",
    "emiamily",
    "emiamily"
  ],
  [
    "Bonnie Pattraphus",
    "bonnie",
    "Pattraphus Borattasuwan",
    "2004-01-27",
    "164",
    "beonnnie",
    "beonnnie"
  ],
  [
    "Jan Ployshompoo",
    "jan",
    "Ployshompoo Supasap",
    "1995-01-05",
    "170",
    "janhae",
    "janhae"
  ],
  [
    "JingJing Prariyapit",
    "jingjing",
    "Prariyapit Yu",
    "1997-04-01",
    "174",
    "jingjingyu36",
    "Jingjingyu364"
  ],
  [
    "Freen Sarocha",
    "freen",
    "Sarocha Chankimha",
    "1998-08-08",
    "167",
    "srchafreen",
    "srchafreen"
  ],
  [
    "Becky Rebecca",
    "becky",
    "Rebecca Patricia Armstrong",
    "2002-12-05",
    "165",
    "beccca",
    "AngelssBecky"
  ],
  [
    "Orm Kornnaphat",
    "orm",
    "Kornnaphat Sethratanapong",
    "2002-05-27",
    "173",
    "orm.kornnaphat",
    "ormmormm"
  ],
  [
    "Jane Methika",
    "jane",
    "Methika Jiranorraphat",
    "1999-06-19",
    "165",
    "janeeyeh",
    "janeeeyeh"
  ],
  [
    "Kao Supassara",
    "kao",
    "Supassara Thanachart",
    "1995-04-29",
    "160",
    "supassra_sp",
    "Kaosupassara9"
  ],
  [
    "Ginny Natnicha",
    "ginny",
    "Natnicha Pratipnatsiri",
    "2000-12-17",
    "163",
    "ginnynatnicha",
    "ginnynatnicha"
  ],
  [
    "Jayna Angelina",
    "jayna",
    "Angelina Stevens",
    "2006-02-17",
    "170",
    "aangelinaa.ss",
    "j_jayyna"
  ],
  [
    "Milk Pansa Vosbein",
    "milk",
    "Pansa Vosbein",
    "1996-07-31",
    "170",
    "panly.v",
    "panlyyy"
  ],
  [
    "Love Pattranite Limpatiyakorn",
    "love",
    "Pattranite Limpatiyakorn",
    "2000-05-23",
    "156",
    "loverrukk",
    "loverrukk"
  ],
  [
    "View Benyapa Jeenprasom",
    "view",
    "Benyapa Jeenprasom",
    "2002-06-04",
    "172",
    "view.benyapa",
    "view_benyapa"
  ],
  [
    "Mim Rattanawadee Wongthong",
    "mim",
    "Rattanawadee Wongthong",
    "2004-05-22",
    "160",
    "mim.rattanawadee",
    "mimrtd"
  ],
  [
    "Engfa Waraha",
    "engfa",
    "Engfa Waraha",
    "1995-02-15",
    "170",
    "fa_engfa8",
    "EWaraha"
  ],
  [
    "Charlotte Austin",
    "charlotte",
    "Charlotte Austin",
    "1998-12-21",
    "173",
    "itscharlotty",
    "itscharlotty"
  ],
  [
    "Lookmhee Punyapat Wangpongsathaporn",
    "lookmhee",
    "Punyapat Wangpongsathaporn",
    "1999-02-18",
    "170",
    "lmlookmhee",
    "Lookmheewang"
  ],
  [
    "Sonya Saranphat Pedersen",
    "sonya",
    "Saranphat Pedersen",
    "1999-04-19",
    "170",
    "sonyasarann",
    "sonyasarann"
  ],
  [
    "Faye Peraya Malisorn",
    "faye",
    "Peraya Malisorn",
    "1994-10-14",
    "175",
    "faye",
    "malisorn00"
  ],
  [
    "Yoko Apasra Lertprasert",
    "yoko",
    "Apasra Lertprasert",
    "2001-07-19",
    "165",
    "yoko",
    "Yoko_apasra"
  ],
  [
    "Fay Kunyaphat Na Nakorn",
    "fay",
    "Kunyaphat Na Nakorn",
    "2001-12-02",
    "167",
    "fay_riezz",
    "Fay_riezz"
  ],
  [
    "May Yada Watcharamusik",
    "may",
    "Yada Watcharamusik",
    "1997-10-31",
    "160",
    "maywyda",
    "maywyda"
  ],
  [
    "Anda Anunta Teavirat",
    "anda",
    "Anunta Teavirat",
    "1998-04-11",
    "171",
    "anda_anunta",
    "AndaAnunta"
  ],
  [
    "Lookkaew Kamollak Sangsubsin",
    "lookkaew",
    "Kamollak Sangsubsin",
    "2000-04-27",
    "160",
    "lookkaeww_k",
    "Lookkaeww_k"
  ],
  [
    "B Mine Jiratchaya Komontut",
    "b-mine",
    "Jiratchaya Komontut",
    "2003-07-23",
    "164",
    "maybebmine",
    null
  ],
  [
    "Near Inthira Thammajaroen",
    "near",
    "Inthira Thammajaroen",
    "1998-11-10",
    "168",
    "nearinthira",
    null
  ],
  [
    "Ormsin Supitcha Limsommut",
    "ormsin",
    "Supitcha Limsommut",
    "1995-05-30",
    "165",
    "omeormorm",
    "oldrosethepeach"
  ],
  [
    "Folk Sutima Korkiatvanich",
    "folk",
    "Sutima Korkiatvanich",
    "2000-05-16",
    "155",
    "ffolky",
    "ffolky_"
  ],
  [
    "Christine Gulasatree Michalsky",
    "christine",
    "Gulasatree Michalsky",
    "1995-09-10",
    "170",
    "gulasatree",
    null
  ],
  [
    "Mae Methakarn Anektanasuwan",
    "mae",
    "Methakarn Anektanasuwan",
    "1999-04-05",
    "160",
    "maetk",
    "maetkk"
  ],
  [
    "Grace Budsarin Wonglelanont",
    "grace",
    "Budsarin Wonglelanont",
    "1997-09-23",
    "173",
    "gracebudsarin",
    "gracebudsarin23"
  ],
  [
    "Oaey Ponchanok Theerawan",
    "oaey",
    "Ponchanok Theerawan",
    "1998-04-13",
    "165",
    "oaey.ponchanok",
    "oaeyyeuei"
  ],
  [
    "Enjoy Thidarat Puerthong",
    "enjoy",
    "Thidarat Puerthong",
    "1997-10-13",
    "164",
    "enjoyyotdr",
    "Enjoyyotdrr"
  ],
  [
    "June Nannirin Varokornwatcharakool",
    "june-nannirin",
    "Nannirin Varokornwatcharakool",
    "1995-08-18",
    "166",
    "june_nannirin",
    "JUNE_NANNIRIN"
  ],
  [
    "Apple Lapisara Intarasut",
    "apple",
    "Lapisara Intarasut",
    "1994-09-01",
    "171",
    "applelapisara",
    "AppleLAPIS"
  ],
  [
    "Mim Panthita Jencharoentham",
    "mim-panthita",
    "Panthita Jencharoentham",
    "2000-07-04",
    "165",
    "mimu.p",
    "mimudotp"
  ],
  [
    "Namneung Milin Watinthanakit",
    "namneung",
    "Milin Watinthanakit",
    "1996-11-11",
    "163",
    "milinnn.d",
    "Milinyahhhh"
  ],
  [
    "Noey Kanteera Wadcharathadsanakul",
    "noey",
    "Kanteera Wadcharathadsanakul",
    "1997-04-09",
    "158",
    "noeyyyy.kw",
    null
  ],
  [
    "Lena Lorena Schuett",
    "lena",
    "Lorena Schuett",
    "1999-11-25",
    "170",
    "lalinalena",
    "lena__lorena"
  ],
  [
    "Miu Natsha Taechamongkalapiwat",
    "miu",
    "Natsha Taechamongkalapiwat",
    "2001-11-25",
    "170",
    "mmiunatshaa",
    "miunatshaa"
  ],
  [
    "Mable Siriwalee Siriwibool",
    "mable",
    "Siriwalee Siriwibool",
    "1997-04-23",
    "169",
    "mable_siriwalee",
    "mable_siriwalee"
  ],
  [
    "Pangjie Paphavarin Sawasdiwech",
    "pangjie",
    "Paphavarin Sawasdiwech",
    "2005-08-16",
    "164",
    "pangjiewr",
    "pangjiewr"
  ],
  [
    "Oom Eisaya Hosuwan",
    "oom",
    "Eisaya Hosuwan",
    "1996-07-04",
    "165",
    "oomeisaya",
    "OomeisayaH"
  ],
  [
    "Bam Saralee Prasitdumrong",
    "bam",
    "Saralee Prasitdumrong",
    "1998-10-08",
    "166",
    "bbam_s",
    "Bam_Saralee"
  ],
  [
    "Yada Narilya Gulmongkolpech",
    "yada",
    "Narilya Gulmongkolpech",
    "2000-03-26",
    "164",
    "yadarilya",
    "yadarilya"
  ],
  [
    "Tan Duangkaew Piyaoui",
    "tan",
    "Duangkaew Piyaoui",
    "2000-03-20",
    null,
    "tanytannn",
    null
  ],
  [
    "Jessie Natsiya Prommart",
    "jessie",
    "Natsiya Prommart",
    "2001-03-30",
    "170",
    "jessienatsiya.p",
    "jessienatsiya"
  ],
  [
    "Tungpang Pattarawadee Laosa",
    "tungpang",
    "Pattarawadee Laosa",
    "1998-09-15",
    "165",
    "tungpangpl",
    "Tungpangplpl"
  ],
  [
    "BamBam Niwirin Limkangwalmongkol",
    "bambam",
    "Niwirin Limkangwalmongkol",
    "1997-05-14",
    null,
    "doublebammm",
    "doublebamm"
  ],
  [
    "Baipor Thitiya Jirapornsilp",
    "baipor",
    "Thitiya Jirapornsilp",
    "2005-01-04",
    null,
    "bbaiporuary",
    "bbaiporuaryy"
  ],
  [
    "Lilly Ladapa Thongkham",
    "lilly",
    "Ladapa Thongkham",
    "2002-05-23",
    "177",
    "lilly_nicha",
    "LLadapa23"
  ],
  [
    "Belle Jiratchaya Kittavornsakul",
    "belle",
    "Jiratchaya Kittavornsakul",
    "2005-05-01",
    "160",
    "bellejirat",
    "bellejirat"
  ],
  [
    "Natty Natthamon Jantraviphart",
    "natty",
    "Natthamon Jantraviphart",
    "2002-11-18",
    null,
    "natty_ntm",
    "natty_ntm"
  ],
  [
    "Yeepun Purichaya Saranark",
    "yeepun",
    "Purichaya Saranark",
    "2005-11-10",
    null,
    "yeepunns",
    "yeepunns"
  ],
  [
    "Atom Aphichaya Kamnoetsirikun",
    "atom",
    "Aphichaya Kamnoetsirikun",
    "1997-11-20",
    null,
    "atomapcy_",
    "atomapcy_"
  ],
  [
    "Mersedes Siripath Sarakune",
    "mersedes",
    "Siripath Sarakune",
    "2001-10-13",
    null,
    "mmersedes",
    "mmersedessrk"
  ],
  [
    "Atom Pariya Piyapanopas",
    "atom-pariya",
    "Pariya Piyapanopas",
    "2001-11-13",
    "166",
    "atomprys",
    "atomprys"
  ],
  [
    "Praifah Penpat Kairapee",
    "praifah-penpat",
    "Penpat Kairapee",
    "2003-08-20",
    "156",
    "praifahkrp",
    "praifahkrp"
  ],
  [
    "Bebell Patthanarat Ketkaew",
    "bebell",
    "Patthanarat Ketkaew",
    "2004-05-10",
    "165",
    "bebell.q",
    "Bubblebebell"
  ],
  [
    "Myyu Khawisara Singplod",
    "myyu",
    "Khawisara Singplod",
    "1999-10-28",
    null,
    "calledmemyyu.k",
    "calledmemyyuk"
  ],
  [
    "Chanya Amarit Duval",
    "chanya",
    "Amarit Duval",
    "1996-08-11",
    null,
    "chanyaduval",
    "chanyaduval"
  ],
  [
    "Nile Chanidapa Sommitthanakul",
    "nile",
    "Chanidapa Sommitthanakul",
    "1998-02-06",
    "166",
    "nilechanii",
    "nilechanii"
  ],
  [
    "Namwan Natchaya Vongbut",
    "namwan",
    "Natchaya Vongbut",
    "2003-01-16",
    "163",
    "namwantrbl",
    "namwantrbl"
  ],
  [
    "Aoom Thaweeporn Phingchamrat",
    "aoom",
    "Thaweeporn Phingchamrat",
    "1996-03-17",
    "170",
    "aoomtwp",
    "aoomkap"
  ],
  [
    "Meena Rina Chatamonchai",
    "meena",
    "Rina Chatamonchai",
    "1997-10-13",
    "170",
    "meenaxrina",
    "meenaxrina"
  ],
  [
    "Tangkwa Phinyanech Aungsuwan",
    "tangkwa",
    "Phinyanech Aungsuwan",
    "2003-11-13",
    "164",
    "phinyanech.h",
    "phinyanech"
  ],
  [
    "Nur Desoraya Techapaibul",
    "nur",
    "Desoraya Techapaibul",
    "2000-12-09",
    "168",
    "nurdesoraya",
    "nurdesoraya"
  ],
  [
    "Memi Muanfun Baesakul",
    "memi",
    "Muanfun Baesakul",
    "1998-04-11",
    "160",
    "memibae",
    "Memibae11"
  ],
  [
    "Ice Amena Gul",
    "ice-amena",
    "Amena Gul",
    "1993-04-27",
    "174",
    "ice_amena",
    "iceamenaa"
  ],
  [
    "Natt Nattamon Chokejindachai",
    "natt",
    "Nattamon Chokejindachai",
    "1995-12-11",
    "165",
    "nkwww",
    "nattkwon"
  ],
  [
    "Pitcha Pitchatorn Santinatornkul",
    "pitcha",
    "Pitchatorn Santinatornkul",
    "1998-02-09",
    "162",
    "pitchaaaa_s",
    "pitchaaaa_s"
  ],
  [
    "Sprite Itaree Jarupangomon",
    "sprite",
    "Itaree Jarupangomon",
    "1993-05-13",
    null,
    "spriteitsaree",
    null
  ],
  [
    "Piano Pronyanee Pornpishayawasin",
    "piano-pronyanee",
    "Pronyanee Pornpishayawasin",
    "2005-05-03",
    null,
    "pianopyn._",
    null
  ],
  [
    "Mook Napapach Thitakawin",
    "mook-napapach",
    "Napapach Thitakawin",
    "2004-03-18",
    "163",
    "_mookynapapach",
    null
  ],
  [
    "Pinky Subhisara Suksathan",
    "pinky",
    "Subhisara Suksathan",
    "1999-06-10",
    "158",
    "kyky_gggggggg",
    "kyky_gggggggg"
  ],
  [
    "Prigkhing Sureeyares Yakares",
    "prigkhing",
    "Sureeyares Yakares",
    "2002-11-24",
    "170",
    "prigkhing_",
    "Prigkhing2"
  ],
  [
    "Thongfah Alicha Sripratak",
    "thongfah",
    "Alicha Sripratak",
    "2003-03-15",
    "165",
    "fromyourskyy",
    null
  ],
  [
    "Mimie Bhapat Ahchariyasripong",
    "mimie",
    "Bhapat Ahchariyasripong",
    null,
    null,
    "mimiebhapat",
    "mimieahc"
  ],
  [
    "Garn Nuttacha Ratchayangkanont",
    "garn",
    "Nuttacha Ratchayangkanont",
    "1997-01-31",
    null,
    "garn.nuttacha",
    "garnnuttacha"
  ],
  [
    "Mie Phattaranan Padpai",
    "mie",
    "Phattaranan Padpai",
    "1999-03-01",
    "172",
    "miephat",
    "miephat"
  ],
  [
    "Aya Orapan Phongmaykin",
    "aya",
    "Orapan Phongmaykin",
    "2000-02-21",
    "165",
    "ayaorapan",
    "ayaorapan"
  ],
  [
    "Ing Tanatcha Devahastin",
    "ing-tanatcha",
    "Tanatcha Devahastin",
    "1999-07-07",
    "171",
    "iingtanatcha",
    "iingtanatcha"
  ],
  [
    "Cartoon Kittaya Lemnopmanee",
    "cartoon-kittaya",
    "Kittaya Lemnopmanee",
    "2006-08-14",
    null,
    "cartoonkitty_ya",
    "cartoonkittieya"
  ],
  [
    "MingMing Kanyakorn Namboonruang",
    "mingming",
    "Kanyakorn Namboonruang",
    "2006-12-27",
    "168",
    "mingkanyas",
    "mingkanyas"
  ],
  [
    "Nepjune Nutkitta Poonsukwattana",
    "nepjune",
    "Nutkitta Poonsukwattana",
    "2004-09-24",
    null,
    "nepjuneys",
    "nepjuneys"
  ],
  [
    "Bint Sireethorn Leearamwat",
    "bint",
    "Sireethorn Leearamwat",
    "1993-12-04",
    null,
    "bintsireethorn",
    null
  ],
  [
    "Puinoon Warangsiri Tanajarusworaphat",
    "puinoon",
    "Warangsiri Tanajarusworaphat",
    "1999-03-03",
    null,
    "pn.noonn",
    null
  ],
  [
    "Aom Punyawee Jungcharoen",
    "aom-punyawee",
    "Punyawee Jungcharoen",
    "1995-09-20",
    null,
    "aompunyawee",
    "AommPunyawee"
  ],
  [
    "Ying Anada Prakobkit",
    "ying",
    "Anada Prakobkit",
    "1996-02-22",
    "172",
    "yinganada",
    "yinganada"
  ],
  [
    "Yoshi Rinrada Thurapan",
    "yoshi",
    "Rinrada Thurapan",
    "1997-02-05",
    "173",
    "yoshirinrada",
    null
  ],
  [
    "Diana Flipo",
    "diana-flipo",
    "Diana Flipo",
    "1994-08-11",
    "172",
    "dianaflipo",
    null
  ],
  [
    "Tina Suppanad Jittaleela",
    "tina",
    "Suppanad Jittaleela",
    "1991-02-12",
    "170",
    "tinasuppanad",
    "tiniiz"
  ],
  [
    "Nana Sawanya Paisarnpayak",
    "nana",
    "Sawanya Paisarnpayak",
    "2001-10-10",
    "165",
    "nana_nspk",
    "nnxnaP"
  ],
  [
    "Arhoung Nattawadee Pipobpornchai",
    "arhoung",
    "Nattawadee Pipobpornchai",
    "2004-09-05",
    "165",
    "arhoungg",
    "arhoungarhoung"
  ],
  [
    "P.amp Tarradee Watancharoen",
    "p-amp",
    "Tarradee Watancharoen",
    "2002-01-08",
    "170",
    "ppammelar",
    "ppammelar_t"
  ],
  [
    "Ice Papichaya Pattaralikitsakul",
    "ice-papichaya",
    "Papichaya Pattaralikitsakul",
    "1993-07-05",
    null,
    "izelands.ize",
    "Izelands_"
  ],
  [
    "Marissa Lloyd",
    "marissa",
    "Marissa Lloyd",
    "2004-06-01",
    null,
    "marissa.msl",
    "gigimsl_"
  ]
];
export const actorProfiles = Object.fromEntries(rows.map(([member,id,fullName,birthday,heightCm,instagram,x])=>[member,{
  id,fullName,birthday,heightCm:heightCm?Number(heightCm):null,instagram,x,
  source:`https://glspotlight.com/actresses/${id}`,sourceKind:'catalogue',checkedAt:'2026-09-10',
}]));
