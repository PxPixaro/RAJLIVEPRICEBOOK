/* RAJ LIVE PRICE BOOK V124 — instant catalogue warm-cache + persistent PDF cache.
   Keeps V123 catalogue design/image mapping exactly; only download preparation is accelerated.
   Keeps the approved V120 layout/content exactly, but removes click-time image decode/canvas work.
   Product thumbnails are fetched once as a compact per-group JPEG pack and embedded directly in PDF.
   Keeps V122 layout/row behavior. Makes pack index self-contained and adds direct shared-image fallback. */
(function(){
  'use strict';

  const V116_PER_PAGE=12;
  const V116_IMAGE_CONCURRENCY=16;
  const V119_IMAGE_MANIFEST=Object.freeze({"AAYUB|AA1001":"assets/Products Images/AAYUB/AA1001_1.webp","AAYUB|AA1002":"assets/Products Images/AAYUB/AA1002_1.webp","AAYUB|AA1004":"assets/Products Images/AAYUB/AA1004_1.webp","AAYUB|AA1005":"assets/Products Images/AAYUB/AA1005_1.webp","AAYUB|AA1006":"assets/Products Images/AAYUB/AA1006_1.webp","AAYUB|AA1007":"assets/Products Images/AAYUB/AA1007_1.webp","AAYUB|AA1008":"assets/Products Images/AAYUB/AA1008_1.webp","AAYUB|AA1009":"assets/Products Images/AAYUB/AA1009_1.webp","AAYUB|AA1010":"assets/Products Images/AAYUB/AA1010_1.webp","AAYUB|AA1011":"assets/Products Images/AAYUB/AA1011_1.webp","AAYUB|AA1012":"assets/Products Images/AAYUB/AA1012_1.webp","AAYUB|AA1013":"assets/Products Images/AAYUB/AA1013_1.webp","AAYUB|AA1014":"assets/Products Images/AAYUB/AA1014_1.webp","AAYUB|AA1015":"assets/Products Images/AAYUB/AA1015_1.webp","AAYUB|AA1016":"assets/Products Images/AAYUB/AA1016_1.webp","AAYUB|AA1017":"assets/Products Images/AAYUB/AA1017_1.webp","AAYUB|AA1018":"assets/Products Images/AAYUB/AA1018_1.webp","AAYUB|AA1019":"assets/Products Images/AAYUB/AA1019_1.webp","AAYUB|AA1020":"assets/Products Images/AAYUB/AA1020_1.webp","AAYUB|AA1021":"assets/Products Images/AAYUB/AA1021_1.webp","AAYUB|AA1022":"assets/Products Images/AAYUB/AA1022_1.webp","AAYUB|AA1023":"assets/Products Images/AAYUB/AA1023_1.webp","AAYUB|AA1024":"assets/Products Images/AAYUB/AA1024_1.webp","AAYUB|AA1025":"assets/Products Images/AAYUB/AA1025_1.webp","AAYUB|AA1026":"assets/Products Images/AAYUB/AA1026_1.webp","AAYUB|AA1027":"assets/Products Images/AAYUB/AA1027_1.webp","AAYUB|AA1029":"assets/Products Images/AAYUB/AA1029_1.webp","AAYUB|AA1031":"assets/Products Images/AAYUB/AA1031_1.webp","AAYUB|AA1032":"assets/Products Images/AAYUB/AA1032_1.webp","AAYUB|AA1033":"assets/Products Images/AAYUB/AA1033_1.webp","AAYUB|AA1035":"assets/Products Images/AAYUB/AA1035_1.webp","AAYUB|AA1036":"assets/Products Images/AAYUB/AA1036_1.webp","AAYUB|AA1037":"assets/Products Images/AAYUB/AA1037_1.webp","AAYUB|AA1038":"assets/Products Images/AAYUB/AA1038_1.webp","AAYUB|AA1039":"assets/Products Images/AAYUB/AA1039_1.webp","AAYUB|AA1041":"assets/Products Images/AAYUB/AA1041_1.webp","AAYUB|AA1042":"assets/Products Images/AAYUB/AA1042_1.webp","AAYUB|AA1043":"assets/Products Images/AAYUB/AA1043_1.webp","AAYUB|AA1045":"assets/Products Images/AAYUB/AA1045_1.webp","AAYUB|AA1046":"assets/Products Images/AAYUB/AA1046_1.webp","AAYUB|AA2001":"assets/Products Images/AAYUB/AA2001_1.webp","AAYUB|AA2002":"assets/Products Images/AAYUB/AA2002_1.webp","AAYUB|AA2003":"assets/Products Images/AAYUB/AA2003_1.webp","AAYUB|AA201":"assets/Products Images/AAYUB/AA201_1.webp","AAYUB|AA202":"assets/Products Images/AAYUB/AA202_1.webp","AAYUB|AA203":"assets/Products Images/AAYUB/AA203_1.webp","AAYUB|AA2101":"assets/Products Images/AAYUB/aa2101_1.webp","AAYUB|AA2601":"assets/Products Images/AAYUB/AA2601_1.webp","AAYUB|AA3001":"assets/Products Images/AAYUB/AA3001_1.webp","AAYUB|AA3002":"assets/Products Images/AAYUB/AA3002_1.webp","AAYUB|AA3003":"assets/Products Images/AAYUB/AA3003_1.webp","AAYUB|AA3004":"assets/Products Images/AAYUB/AA3004_1.webp","AAYUB|AA3005":"assets/Products Images/AAYUB/AA3005_1.webp","AAYUB|AA3006":"assets/Products Images/AAYUB/AA3006_1.webp","AAYUB|AA3007":"assets/Products Images/AAYUB/AA3007_1.webp","AAYUB|AA3008":"assets/Products Images/AAYUB/AA3008_1.webp","AAYUB|AA3009":"assets/Products Images/AAYUB/AA3009_1.webp","AAYUB|AA3010":"assets/Products Images/AAYUB/AA3010_1.webp","AAYUB|AA3011":"assets/Products Images/AAYUB/AA3011_1.webp","AAYUB|AA3012":"assets/Products Images/AAYUB/AA3012_1.webp","AAYUB|AA3013":"assets/Products Images/AAYUB/AA3013_1.webp","AAYUB|AA3014":"assets/Products Images/AAYUB/AA3014_1.webp","AAYUB|AA3015":"assets/Products Images/AAYUB/AA3015_1.webp","AAYUB|AA3017":"assets/Products Images/AAYUB/AA3017_1.webp","AAYUB|AA3018":"assets/Products Images/AAYUB/AA3018_1.webp","AAYUB|AA301":"assets/Products Images/AAYUB/AA301_1.webp","AAYUB|AA3020":"assets/Products Images/AAYUB/AA3020_1.webp","AAYUB|AA3021":"assets/Products Images/AAYUB/AA3021_1.webp","AAYUB|AA3022":"assets/Products Images/AAYUB/AA3022_1.webp","AAYUB|AA3023":"assets/Products Images/AAYUB/AA3023_1.webp","AAYUB|AA3024":"assets/Products Images/AAYUB/AA3024_1.webp","AAYUB|AA3025":"assets/Products Images/AAYUB/AA3025_1.webp","AAYUB|AA3026":"assets/Products Images/AAYUB/AA3026_1.webp","AAYUB|AA4001":"assets/Products Images/AAYUB/AA4001_1.webp","AAYUB|AA4002":"assets/Products Images/AAYUB/AA4002_1.webp","AAYUB|AA4003":"assets/Products Images/AAYUB/AA4003_1.webp","AAYUB|AA5001":"assets/Products Images/AAYUB/AA5001_1.webp","AAYUB|AA6001":"assets/Products Images/AAYUB/AA6001_1.webp","AAYUB|AA6003":"assets/Products Images/AAYUB/AA6003_1.webp","AAYUB|AA601":"assets/Products Images/AAYUB/AA601_1.webp","AAYUB|AA602":"assets/Products Images/AAYUB/AA602_1.webp","AAYUB|AA603":"assets/Products Images/AAYUB/AA603_1.webp","AAYUB|AA604":"assets/Products Images/AAYUB/AA604_1.webp","AAYUB|AA605":"assets/Products Images/AAYUB/AA605_1.webp","AAYUB|AA606":"assets/Products Images/AAYUB/AA606_1.webp","AAYUB|AA7001":"assets/Products Images/AAYUB/AA7001_1.webp","AAYUB|AA7002":"assets/Products Images/AAYUB/AA7002_1.webp","AAYUB|AA7003":"assets/Products Images/AAYUB/AA7003_1.webp","AAYUB|AA7004":"assets/Products Images/AAYUB/AA7004_1.webp","AAYUB|AA7005":"assets/Products Images/AAYUB/AA7005_1.webp","AAYUB|AA7006":"assets/Products Images/AAYUB/AA7006_1.webp","AAYUB|AA7007":"assets/Products Images/AAYUB/AA7007_1.webp","AAYUB|AA7008":"assets/Products Images/AAYUB/AA7008_1.webp","AAYUB|AA7009":"assets/Products Images/AAYUB/AA7009_1.webp","AAYUB|AA7010":"assets/Products Images/AAYUB/AA7010_1.webp","AAYUB|AA7011":"assets/Products Images/AAYUB/AA7011_1.webp","AAYUB|AA7012":"assets/Products Images/AAYUB/AA7012_1.webp","AAYUB|AA7014":"assets/Products Images/AAYUB/AA7014_1.webp","AAYUB|AA7015":"assets/Products Images/AAYUB/AA7015_1.webp","AAYUB|AA7016":"assets/Products Images/AAYUB/AA7016_1.webp","AAYUB|AYBFR002":"assets/Products Images/AAYUB/AYBFR002_1.webp","AAYUB|AYBFR031":"assets/Products Images/AAYUB/AYBFR031_1.webp","ALIED|ALABS122S":"assets/Products Images/ALIED/ALABS122S_1.webp","ALIED|ALABS123S":"assets/Products Images/ALIED/ALABS123S_1.webp","ALIED|ALMRU103":"assets/Products Images/ALIED/ALMRU103_1.webp","ALIED|ALMRU103N":"assets/Products Images/ALIED/ALMRU103N_1.webp","ALIED|BRAKELINER":"assets/Products Images/ALIED/BRAKE%20LINER_1.webp","ALIED|BRAKEPADNAM":"assets/Products Images/ALIED/BRAKE%20PAD%20NAM_1.webp","ALIED|BRAKEPAD":"assets/Products Images/ALIED/BRAKE%20PAD_1.webp","ALIED|BRAKESHOE":"assets/Products Images/ALIED/BRAKE%20SHOE_1.webp","ASK|11091":"assets/Products Images/ASK/11091_1.webp","ASK|11091R":"assets/Products Images/ASK/11091R_1.webp","ASK|1109SR":"assets/Products Images/ASK/1109SR_1.webp","ASK|4071":"assets/Products Images/ASK/4071_1.webp","ASK|4071R":"assets/Products Images/ASK/4071R_1.webp","ASK|4072R":"assets/Products Images/ASK/4072R_1.webp","ASK|407SR":"assets/Products Images/ASK/407SR_1.webp","ASK|6081R":"assets/Products Images/ASK/6081R_1.webp","ASK|6081SR":"assets/Products Images/ASK/6081SR_1.webp","ASK|709SR":"assets/Products Images/ASK/709SR_1.webp","ASK|ANY451512":"assets/Products Images/ASK/ANY45151_2.webp","ASK|ASK6081":"assets/Products Images/ASK/ASK6081_1.webp","ASK|ASK7091":"assets/Products Images/ASK/ASK7091_1.webp","ASK|ASK9091":"assets/Products Images/ASK/ASK9091_1.webp","ASK|ASKCOM2":"assets/Products Images/ASK/ASKCOM2_1.webp","ASK|ASKEM11":"assets/Products Images/ASK/ASKEM11_1.webp","ASK|ASKFC150S":"assets/Products Images/ASK/ASKFC150S_1.webp","ASK|ASKMM2":"assets/Products Images/ASK/ASKMM2_1.webp","ASK|ASKSM122R":"assets/Products Images/ASK/ASKSM122R_1.webp","ASK|ASKSM342":"assets/Products Images/ASK/ASKSM342_1.webp","ASK|ASKSM78SR":"assets/Products Images/ASK/ASKSM78SR_1.webp","ASK|ASKSUMOS":"assets/Products Images/ASK/ASKSUMOS_1.webp","ASK|ASKTTS11":"assets/Products Images/ASK/ASKTTS11_1.webp","ASK|ASKTTS21":"assets/Products Images/ASK/ASKTTS21_1.webp","ASK|ASKTZ11":"assets/Products Images/ASK/ASKTZ11_1.webp","ASK|ASKTZ21SR":"assets/Products Images/ASK/ASKTZ21SR_1.webp","ASK|BRAKELINER":"assets/Products Images/ASK/BRAKE%20LINER_1.webp","ASK|BRAKELININGS":"assets/Products Images/ASK/BRAKE%20LININGS_1.webp","ASK|BRAKEPAD":"assets/Products Images/ASK/BRAKE%20PAD_1.webp","ASK|BRAKEPADS":"assets/Products Images/ASK/brake%20pads_1.webp","ASK|BRAKEPANELASSEMBLEY":"assets/Products Images/ASK/BRAKE%20PANEL%20ASSEMBLEY_1.webp","ASK|BRAKESHOE":"assets/Products Images/ASK/BRAKE%20SHOE_1.webp","ASK|CHATGPTIMAGEJUL22025023533PM":"assets/Products Images/ASK/ChatGPT%20Image%20Jul%202%2C%202025%2C%2002_35_33%20PM_1.webp","ASK|CLUTCHPLATES":"assets/Products Images/ASK/CLUTCH%20PLATES_1.webp","ASK|CLUTCHSHOE":"assets/Products Images/ASK/CLUTCH%20SHOE_1.webp","ASK|DISCBRAKEPAD":"assets/Products Images/ASK/DISC%20BRAKE%20PAD_1.webp","ASK|EM11R":"assets/Products Images/ASK/EM11R_1.webp","ASK|EM12R":"assets/Products Images/ASK/EM12R_1.webp","ASK|EM1SR":"assets/Products Images/ASK/EM1SR_1.webp","ASK|SM121R":"assets/Products Images/ASK/SM121R_1.webp","ASK|SM122R":"assets/Products Images/ASK/SM122R_1.webp","ASK|SM12SR":"assets/Products Images/ASK/SM12SR_1.webp","ASK|SM341R":"assets/Products Images/ASK/SM341R_1.webp","ASK|SM342R":"assets/Products Images/ASK/SM342R_1.webp","ASK|SM34SR":"assets/Products Images/ASK/SM34SR_1.webp","ASK|SM781R":"assets/Products Images/ASK/SM781R_1.webp","ASK|SM78SR":"assets/Products Images/ASK/SM78SR_1.webp","ASK|TTS11R":"assets/Products Images/ASK/TTS11R_1.webp","ASK|TTS12R":"assets/Products Images/ASK/TTS12R_1.webp","ASK|TTS1SR":"assets/Products Images/ASK/TTS1SR_1.webp","ASK|TTS21R":"assets/Products Images/ASK/TTS21R_1.webp","ASK|TTS22R":"assets/Products Images/ASK/TTS22R_1.webp","ASK|TTS2SR":"assets/Products Images/ASK/TTS2SR_1.webp","ASK|TZ11SR":"assets/Products Images/ASK/TZ11SR_1.webp","ASK|TZ21":"assets/Products Images/ASK/TZ21_1.webp","ASK|TZ21SR":"assets/Products Images/ASK/TZ21SR_1.webp","BULLDOG|BSEALFAST":"assets/Products Images/BULLDOG/B%20SEAL%20FAST_1.webp","BULLDOG|BSEALREGULAR":"assets/Products Images/BULLDOG/B%20SEAL%20REGULAR_1.webp","BULLDOG|BD10065":"assets/Products Images/BULLDOG/BD10065_1.webp","BULLDOG|BD1":"assets/Products Images/BULLDOG/BD1_1.webp","BULLDOG|BD1A":"assets/Products Images/BULLDOG/BD1A_1.webp","BULLDOG|BD1B":"assets/Products Images/BULLDOG/BD1B_1.webp","BULLDOG|BD1C":"assets/Products Images/BULLDOG/BD1C_1.webp","BULLDOG|BD2":"assets/Products Images/BULLDOG/BD2_1.webp","BULLDOG|BD2A":"assets/Products Images/BULLDOG/BD2A_1.webp","BULLDOG|BD2BCOPY":"assets/Products Images/BULLDOG/BD2B%20-%20Copy_1.webp","BULLDOG|BD3":"assets/Products Images/BULLDOG/BD3_1.webp","BULLDOG|BD4":"assets/Products Images/BULLDOG/BD4_1.webp","BULLDOG|BD5":"assets/Products Images/BULLDOG/BD5_1.webp","BULLDOG|BD6":"assets/Products Images/BULLDOG/BD6_1.webp","BULLDOG|BD6A":"assets/Products Images/BULLDOG/BD6A_1.webp","BULLDOG|BD6B":"assets/Products Images/BULLDOG/BD6B_1.webp","BULLDOG|BD6C":"assets/Products Images/BULLDOG/BD6C_1.webp","BULLDOG|BD8":"assets/Products Images/BULLDOG/BD8_1.webp","BULLDOG|BD8A":"assets/Products Images/BULLDOG/BD8A_1.webp","BULLDOG|BD8B":"assets/Products Images/BULLDOG/BD8B_1.webp","BULLDOG|BDBLACK85":"assets/Products Images/BULLDOG/bdblack85_1.webp","BULLDOG|BDGRAY85":"assets/Products Images/BULLDOG/bdgray85_1.webp","BULLDOG|BULLDOGTHREADLOCKER4ML":"assets/Products Images/BULLDOG/Bulldog%20Thread%20Locker%204%20Ml_1.webp","BULLDOG|BULLDOGUPVCSOLVENTCEMENT100ML":"assets/Products Images/BULLDOG/Bulldog%20Upvc%20Solvent%20Cement%20100Ml_1.webp","BULLDOG|TEFLONTAP":"assets/Products Images/BULLDOG/Teflon%20Tap_1.webp","BULLDOG|THREADLOCKER50ML":"assets/Products Images/BULLDOG/thread%20locker%2050ml_1.webp","BULLDOG|THREADLOCKER8ML":"assets/Products Images/BULLDOG/thread%20locker%208ml_1.webp","BULLDOG|WIRETAPDONE":"assets/Products Images/BULLDOG/WIRE%20TAP-DONE_1.webp","DC|DC101":"assets/Products Images/DC/DC101_1.webp","DC|DC103":"assets/Products Images/DC/DC103_1.webp","DC|DC105":"assets/Products Images/DC/DC105_1.webp","DC|DC112":"assets/Products Images/DC/DC112_1.webp","DC|DC117":"assets/Products Images/DC/DC117_1.webp","DC|DC122":"assets/Products Images/DC/DC122_1.webp","DC|DC124":"assets/Products Images/DC/DC124_1.webp","DC|DC128":"assets/Products Images/DC/DC128_1.webp","DC|DC128A":"assets/Products Images/DC/DC128A_1.webp","DC|DC1301":"assets/Products Images/DC/DC1301_1.webp","DC|DC1302":"assets/Products Images/DC/DC1302_1.webp","DC|DC201":"assets/Products Images/DC/DC201_1.webp","DC|DC3524":"assets/Products Images/DC/DC3524_1.webp","DC|DC592":"assets/Products Images/DC/DC592_1.webp","EMMBROSS|914124914127":"assets/Products Images/EMMBROSS/914-124%20%26%20914_127.webp","EMMBROSS|CHATGPTIMAGEAUG192025105024AM":"assets/Products Images/EMMBROSS/ChatGPT%20Image%20Aug%2019%2C%202025%2C%2010_50_24%20AM_1.webp","EMMBROSS|DSC05322COPY":"assets/Products Images/EMMBROSS/DSC05322%20copy_1.webp","EMMBROSS|EM1095":"assets/Products Images/EMMBROSS/EM1095_1.webp","EMMBROSS|EM1109":"assets/Products Images/EMMBROSS/EM1109_1.webp","EMMBROSS|EM12":"assets/Products Images/EMMBROSS/EM12_1.webp","EMMBROSS|EM1316":"assets/Products Images/EMMBROSS/EM1316_1.webp","EMMBROSS|EM13":"assets/Products Images/EMMBROSS/EM13_1.webp","EMMBROSS|EM1616L":"assets/Products Images/EMMBROSS/EM1616L_1.webp","EMMBROSS|EM1616S":"assets/Products Images/EMMBROSS/EM1616S_1.webp","EMMBROSS|EM1":"assets/Products Images/EMMBROSS/EM1_1.webp","EMMBROSS|EM207":"assets/Products Images/EMMBROSS/EM207_1.webp","EMMBROSS|EM207RXL":"assets/Products Images/EMMBROSS/EM207RXL_1.webp","EMMBROSS|EM207RXS":"assets/Products Images/EMMBROSS/EM207RXS_1.webp","EMMBROSS|EM2416":"assets/Products Images/EMMBROSS/EM2416_1.webp","EMMBROSS|EM2515EX":"assets/Products Images/EMMBROSS/EM2515EX_1.webp","EMMBROSS|EM2":"assets/Products Images/EMMBROSS/EM2_1.webp","EMMBROSS|EM39":"assets/Products Images/EMMBROSS/EM39_1.webp","EMMBROSS|EM407":"assets/Products Images/EMMBROSS/EM407_1.webp","EMMBROSS|EM407M":"assets/Products Images/EMMBROSS/EM407M_1.webp","EMMBROSS|EM407T":"assets/Products Images/EMMBROSS/EM407T_1.webp","EMMBROSS|EM407TD":"assets/Products Images/EMMBROSS/EM407TD_1.webp","EMMBROSS|EM4112M":"assets/Products Images/EMMBROSS/EM4112M_1.webp","EMMBROSS|EM41":"assets/Products Images/EMMBROSS/EM41_1.webp","EMMBROSS|EM608":"assets/Products Images/EMMBROSS/EM608_1.webp","EMMBROSS|EM608M":"assets/Products Images/EMMBROSS/EM608M_1.webp","EMMBROSS|EM709TC":"assets/Products Images/EMMBROSS/EM709TC_1.webp","EMMBROSS|EM7":"assets/Products Images/EMMBROSS/EM7_1.webp","EMMBROSS|EM85":"assets/Products Images/EMMBROSS/EM85_1.webp","EMMBROSS|EM909":"assets/Products Images/EMMBROSS/EM909_1.webp","EMMBROSS|EMACE":"assets/Products Images/EMMBROSS/EMACE_1.webp","EMMBROSS|EMB1":"assets/Products Images/EMMBROSS/EMB1_1.webp","EMMBROSS|EMC1110":"assets/Products Images/EMMBROSS/EMC1110_1.webp","EMMBROSS|EMCAN":"assets/Products Images/EMMBROSS/EMCAN_1.webp","EMMBROSS|EMCANM":"assets/Products Images/EMMBROSS/EMCANM_1.webp","EMMBROSS|EMD1":"assets/Products Images/EMMBROSS/EMD1_1.webp","EMMBROSS|EMHYWAB":"assets/Products Images/EMMBROSS/EMHYWAB_1.webp","EMMBROSS|EMHYWAS":"assets/Products Images/EMMBROSS/EMHYWAS_1.webp","EMMBROSS|EMHYWAT":"assets/Products Images/EMMBROSS/EMHYWAT_1.webp","EMMBROSS|EMMAGIC":"assets/Products Images/EMMBROSS/EMMAGIC_1.webp","EMMBROSS|EMMAXXB":"assets/Products Images/EMMBROSS/EMMAXXB_1.webp","EMMBROSS|EMMAXXS":"assets/Products Images/EMMBROSS/EMMAXXS_1.webp","EMMBROSS|EMMBORSSS1":"assets/Products Images/EMMBROSS/emmborsss1_1.webp","EMMBROSS|EMPICKUPB":"assets/Products Images/EMMBROSS/EMPICKUPB_1.webp","EMMBROSS|EMPICKUPS":"assets/Products Images/EMMBROSS/EMPICKUPS_1.webp","EMMBROSS|EMS":"assets/Products Images/EMMBROSS/EMS_1.webp","EMMBROSS|EMUTILITY":"assets/Products Images/EMMBROSS/EMUTILITY_1.webp","EMMBROSS|EMVENTURE":"assets/Products Images/EMMBROSS/EMVENTURE_1.webp","EMMBROSS|IMG127COPY":"assets/Products Images/EMMBROSS/IMG%20127%20copy_1.webp","EMMBROSS|IMG128COPY":"assets/Products Images/EMMBROSS/IMG%20128%20copy_1.webp","GAUTAMBT|11BT330":"assets/Products Images/GAUTAM%20BT/11BT330_1.webp","GAUTAMBT|12BT500":"assets/Products Images/GAUTAM%20BT/12BT500_1.webp","GAUTAMBT|A1000":"assets/Products Images/GAUTAM%20BT/A1000_1.webp","GAUTAMBT|A280":"assets/Products Images/GAUTAM%20BT/A280_1.webp","GAUTAMBT|A300":"assets/Products Images/GAUTAM%20BT/A300_1.webp","GAUTAMBT|A350":"assets/Products Images/GAUTAM%20BT/A350_1.webp","GAUTAMBT|A400":"assets/Products Images/GAUTAM%20BT/A400_1.webp","GAUTAMBT|A450":"assets/Products Images/GAUTAM%20BT/A450_1.webp","GAUTAMBT|A500":"assets/Products Images/GAUTAM%20BT/A500_1.webp","GAUTAMBT|A550":"assets/Products Images/GAUTAM%20BT/A550_1.webp","GAUTAMBT|A600":"assets/Products Images/GAUTAM%20BT/A600_1.webp","GAUTAMBT|A650":"assets/Products Images/GAUTAM%20BT/A650_1.webp","GAUTAMBT|A700":"assets/Products Images/GAUTAM%20BT/A700_1.webp","GAUTAMBT|A750":"assets/Products Images/GAUTAM%20BT/A750_1.webp","GAUTAMBT|A800":"assets/Products Images/GAUTAM%20BT/A800_1.webp","GAUTAMBT|A850":"assets/Products Images/GAUTAM%20BT/A850_1.webp","GAUTAMBT|A900":"assets/Products Images/GAUTAM%20BT/A900_1.webp","GAUTAMBT|ANGLETYPE":"assets/Products Images/GAUTAM%20BT/Angle%20Type_1.webp","GAUTAMBT|ASHOKLEYLANDVE3550SQMM":"assets/Products Images/GAUTAM%20BT/ASHOK%20LEYLAND%20%2BVE%2035-50SQMM_1.webp","GAUTAMBT|ASHOKLEYLANDVE":"assets/Products Images/GAUTAM%20BT/ASHOK%20LEYLAND%20%2BVE_1.webp","GAUTAMBT|BAJAJCLS620":"assets/Products Images/GAUTAM%20BT/BAJAJ%20CLS620_1.webp","GAUTAMBT|CLIPNO18HVY":"assets/Products Images/GAUTAM%20BT/CLIP%20NO.18%20HVY_1.webp","GAUTAMBT|CLIPNO18LIGHT":"assets/Products Images/GAUTAM%20BT/CLIP%20NO.18%20LIGHT_1.webp","GAUTAMBT|CLIPNO18MEDIUM":"assets/Products Images/GAUTAM%20BT/CLIP%20NO.18%20MEDIUM_1.webp","GAUTAMBT|CLIPNO2HVY":"assets/Products Images/GAUTAM%20BT/CLIP%20NO.2%20HVY_1.webp","GAUTAMBT|CLIPNO3HVY":"assets/Products Images/GAUTAM%20BT/CLIP%20NO.3%20HVY_1.webp","GAUTAMBT|CLIPNO4HVY":"assets/Products Images/GAUTAM%20BT/CLIP%20NO.4%20HVY_1.webp","GAUTAMBT|CLIPNO5TATADLX":"assets/Products Images/GAUTAM%20BT/CLIP%20NO.5%20TATA%20DLX_1.webp","GAUTAMBT|CLIPNO5TATASDLX":"assets/Products Images/GAUTAM%20BT/CLIP%20NO.5%20TATA%20S.DLX_1.webp","GAUTAMBT|LUGMRTDLX":"assets/Products Images/GAUTAM%20BT/LUG%20MRT%20DLX_1.webp","GAUTAMBT|LUGNO10":"assets/Products Images/GAUTAM%20BT/LUG%20NO.10_1.webp","GAUTAMBT|LUGNO12":"assets/Products Images/GAUTAM%20BT/LUG%20NO.12_1.webp","GAUTAMBT|LUGNO14":"assets/Products Images/GAUTAM%20BT/LUG%20NO.14_1.webp","GAUTAMBT|LUGNO7":"assets/Products Images/GAUTAM%20BT/LUG%20NO.7_1.webp","GAUTAMBT|LUGNO9":"assets/Products Images/GAUTAM%20BT/LUG%20NO.9_1.webp","GAUTAMBT|MAH350":"assets/Products Images/GAUTAM%20BT/MAH350_1.webp","GAUTAMBT|MAH400":"assets/Products Images/GAUTAM%20BT/MAH400_1.webp","GAUTAMBT|MAL220":"assets/Products Images/GAUTAM%20BT/MAL220_1.webp","GAUTAMBT|MARUTITYPE":"assets/Products Images/GAUTAM%20BT/Maruti%20Type_1.webp","GAUTAMBT|MRE":"assets/Products Images/GAUTAM%20BT/MRE_1.webp","GAUTAMBT|MRT220":"assets/Products Images/GAUTAM%20BT/MRT220_1.webp","GAUTAMBT|MRTLUCAS350":"assets/Products Images/GAUTAM%20BT/MRTLUCAS350_1.webp","GAUTAMBT|STRIPTYPE":"assets/Products Images/GAUTAM%20BT/Strip%20Type_1.webp","GAUTAMBT|STRIP1000":"assets/Products Images/GAUTAM%20BT/STRIP1000_1.webp","GAUTAMBT|STRIP450":"assets/Products Images/GAUTAM%20BT/STRIP450_1.webp","GAUTAMBT|STRIP500":"assets/Products Images/GAUTAM%20BT/STRIP500_1.webp","GAUTAMBT|STRIP520":"assets/Products Images/GAUTAM%20BT/STRIP520_1.webp","GAUTAMBT|STRIP600":"assets/Products Images/GAUTAM%20BT/STRIP600_1.webp","GAUTAMBT|STRIP650":"assets/Products Images/GAUTAM%20BT/STRIP650_1.webp","GAUTAMBT|STRIP700":"assets/Products Images/GAUTAM%20BT/STRIP700_1.webp","GAUTAMBT|STRIP800":"assets/Products Images/GAUTAM%20BT/STRIP800_1.webp","GAUTAMBT|STRIP850":"assets/Products Images/GAUTAM%20BT/STRIP850_1.webp","GAUTAMBT|STRIP900":"assets/Products Images/GAUTAM%20BT/STRIP900_1.webp","GAUTAMBT|TELCO650":"assets/Products Images/GAUTAM%20BT/TELCO650_1.webp","GAUTAMBT|TMB500":"assets/Products Images/GAUTAM%20BT/TMB500_1.webp","GAUTAMBT|TMB650":"assets/Products Images/GAUTAM%20BT/TMB650_1.webp","GCL|GC30222":"assets/Products Images/GCL/GC30222_1.webp","GCL|GC30227":"assets/Products Images/GCL/GC30227_1.webp","GCL|GC30247":"assets/Products Images/GCL/GC30247_1.webp","GCL|GC30256":"assets/Products Images/GCL/GC30256_1.webp","GCL|GC30319":"assets/Products Images/GCL/GC30319_1.webp","GCL|GC50280":"assets/Products Images/GCL/GC50280_1.webp","GCL|GC50314":"assets/Products Images/GCL/GC50314_1.webp","GCL|GC50331":"assets/Products Images/GCL/GC50331_1.webp","GCPA|310PTL":"assets/Products Images/GCPA/310%20PTL_1.webp","GCPA|G330FWA125S":"assets/Products Images/GCPA/G-330-FWA-125S_1.webp","GCPA|G330FWA125":"assets/Products Images/GCPA/G-330-FWA_125.webp","GCPA|G352FWA146S":"assets/Products Images/GCPA/G-352-FWA-146S_1.webp","GCPA|G352FWA146":"assets/Products Images/GCPA/G-352-FWA_146.webp","GCPA|G395FWA145":"assets/Products Images/GCPA/G-395-FWA_145.webp","GCPA|G395FWA146":"assets/Products Images/GCPA/G-395-FWA_146.webp","GCPA|GAL310AF":"assets/Products Images/GCPA/G-AL310-AF_1.webp","GCPA|GAL330AF":"assets/Products Images/GCPA/G-AL330-AF_1.webp","GCPA|GAL330BD":"assets/Products Images/GCPA/G-AL330-BD_1.webp","GCPA|GAL330DCA":"assets/Products Images/GCPA/G-AL330-DCA_1.webp","GCPA|GAL352AF":"assets/Products Images/GCPA/G-AL352-AF_1.webp","GCPA|GAL352BD":"assets/Products Images/GCPA/G-AL352-BD_1.webp","GCPA|GAL352LK":"assets/Products Images/GCPA/G-AL352-LK_1.webp","GCPA|GAL352SK":"assets/Products Images/GCPA/G-AL352-SK_1.webp","GCPA|GAL380BD":"assets/Products Images/GCPA/G-AL380-BD_1.webp","GCPA|GAL380CCA":"assets/Products Images/GCPA/G-AL380-CCA_1.webp","GCPA|GAL380HC":"assets/Products Images/GCPA/G-AL380-HC_1.webp","GCPA|GAL380LK":"assets/Products Images/GCPA/G-AL380-LK_1.webp","GCPA|GAL380PP":"assets/Products Images/GCPA/G-AL380-PP_1.webp","GCPA|GAL380SK":"assets/Products Images/GCPA/G-AL380-SK_1.webp","GCPA|GAL380":"assets/Products Images/GCPA/G-AL380_1.webp","GCPA|GAL381BD":"assets/Products Images/GCPA/G-AL381-BD_1.webp","GCPA|GAL383BD":"assets/Products Images/GCPA/G-AL383-BD_1.webp","GCPA|GAM381BD":"assets/Products Images/GCPA/G-AM381-BD_1.webp","GCPA|GAM381DCA":"assets/Products Images/GCPA/G-AM381-DCA_1.webp","GCPA|GBB4302DCA":"assets/Products Images/GCPA/G-BB4302-DCA_1.webp","GCPA|GBB4303CD":"assets/Products Images/GCPA/G-BB4303-CD_1.webp","GCPA|GBENZ395395CD":"assets/Products Images/GCPA/G-BENZ395-395CD_1.webp","GCPA|GBENZ395DCA":"assets/Products Images/GCPA/G-BENZ395-DCA_1.webp","GCPA|GMNV395CD":"assets/Products Images/GCPA/G-M-NV395-CD_1.webp","GCPA|GMNV395DCA":"assets/Products Images/GCPA/G-M-NV395-DCA_1.webp","GCPA|GP4300DCA":"assets/Products Images/GCPA/G-P4300-DCA_1.webp","GCPA|GP4301CD":"assets/Products Images/GCPA/G-P4301-CD_1.webp","GCPA|GT280DCANA":"assets/Products Images/GCPA/G-T280-DCA-NA_1.webp","GCPA|GT280DCATC":"assets/Products Images/GCPA/G-T280-DCA-TC_1.webp","GCPA|GT280TC":"assets/Products Images/GCPA/G-T280-TC_1.webp","GCPA|GT310AFSS":"assets/Products Images/GCPA/G-T310-AF-SS_1.webp","GCPA|GT310C":"assets/Products Images/GCPA/G-T310-C_1.webp","GCPA|GT310DCA":"assets/Products Images/GCPA/G-T310-DCA_1.webp","GCPA|GT310LK":"assets/Products Images/GCPA/G-T310-LK_1.webp","GCPA|GT310MSS":"assets/Products Images/GCPA/G-T310-M-SS_1.webp","GCPA|GT310PP":"assets/Products Images/GCPA/G-T310-PP_1.webp","GCPA|GT310SK":"assets/Products Images/GCPA/G-T310-SK_1.webp","GCPA|GT310DCAHL":"assets/Products Images/GCPA/G-T310DCA-HL_1.webp","GCPA|GT330AF":"assets/Products Images/GCPA/G-T330-AF_1.webp","GCPA|GT330BD":"assets/Products Images/GCPA/G-T330-BD_1.webp","GCPA|GT330C3L":"assets/Products Images/GCPA/G-T330-C-3L_1.webp","GCPA|GT330CCA4L":"assets/Products Images/GCPA/G-T330-CCA-4L_1.webp","GCPA|GT330LK3L":"assets/Products Images/GCPA/G-T330-LK-3L_1.webp","GCPA|GT330LK4L":"assets/Products Images/GCPA/G-T330-LK-4L_1.webp","GCPA|GT330PP3L":"assets/Products Images/GCPA/G-T330-PP-3L_1.webp","GCPA|GT330PP4L":"assets/Products Images/GCPA/G-T330-PP-4L_1.webp","GCPA|GT330SK3L":"assets/Products Images/GCPA/G-T330-SK-3L_1.webp","GCPA|GT330SK4L":"assets/Products Images/GCPA/G-T330-SK-4L_1.webp","GCPA|GT352BA":"assets/Products Images/GCPA/G-T352-BA_1.webp","GCPA|GT352BD":"assets/Products Images/GCPA/G-T352-BD_1.webp","GCPA|GT352CCAPT":"assets/Products Images/GCPA/G-T352-CCA-PT_1.webp","GCPA|GT352F510":"assets/Products Images/GCPA/G-T352-F510_1.webp","GCPA|GT352LK":"assets/Products Images/GCPA/G-T352-LK_1.webp","GCPA|GT352PPPT":"assets/Products Images/GCPA/G-T352-PP-PT_1.webp","GCPA|GT352PP":"assets/Products Images/GCPA/G-T352-PP_1.webp","GCPA|GT352RL":"assets/Products Images/GCPA/G-T352-RL_1.webp","GCPA|GT352SK":"assets/Products Images/GCPA/G-T352-SK_1.webp","GCPA|GT353BA":"assets/Products Images/GCPA/G-T353-BA_1.webp","GCPA|GT353BD":"assets/Products Images/GCPA/G-T353-BD_1.webp","GCPA|GT353CCA":"assets/Products Images/GCPA/G-T353-CCA_1.webp","GCPA|GT380BD":"assets/Products Images/GCPA/G-T380-BD_1.webp","GCPA|GT380CCA":"assets/Products Images/GCPA/G-T380-CCA_1.webp","GCPA|GT380F400":"assets/Products Images/GCPA/G-T380-F400_1.webp","GCPA|GT380F510":"assets/Products Images/GCPA/G-T380-F510_1.webp","GCPA|GT380HCCD":"assets/Products Images/GCPA/G-T380-HC-CD_1.webp","GCPA|GT380LK":"assets/Products Images/GCPA/G-T380-LK_1.webp","GCPA|GT380PPB":"assets/Products Images/GCPA/G-T380-PPB_1.webp","GCPA|GT380RL":"assets/Products Images/GCPA/G-T380-RL_1.webp","GCPA|GT380SK":"assets/Products Images/GCPA/G-T380-SK_1.webp","GF|GF1109":"assets/Products Images/GF/GF1109_1.webp","GF|GF1210":"assets/Products Images/GF/GF1210_1.webp","GF|GF1612OE":"assets/Products Images/GF/GF1612OE_1.webp","GF|GF207DI":"assets/Products Images/GF/GF207DI_1.webp","GF|GF2214AOE":"assets/Products Images/GF/GF2214AOE_1.webp","GF|GF2214HD":"assets/Products Images/GF/GF2214HD_1.webp","GF|GF2515EX":"assets/Products Images/GF/GF2515EX_1.webp","GF|GF3118":"assets/Products Images/GF/GF3118_1.webp","GF|GF407HD":"assets/Products Images/GF/GF407HD_1.webp","GF|GF608HD":"assets/Products Images/GF/GF608HD_1.webp","GF|GFACE":"assets/Products Images/GF/GFACE_1.webp","GF|GFC1095HD":"assets/Products Images/GF/GFC1095HD_1.webp","GF|GFC1110":"assets/Products Images/GF/GFC1110_1.webp","GF|GFCANTER":"assets/Products Images/GF/GFCANTER_1.webp","GF|GFCOMMANDER":"assets/Products Images/GF/GFCOMMANDER_1.webp","GF|GFFORD":"assets/Products Images/GF/GFFORD_1.webp","GF|GFHINO4D":"assets/Products Images/GF/GFHINO4D_1.webp","GF|GFHMT":"assets/Products Images/GF/GFHMT_1.webp","GF|GFINTER":"assets/Products Images/GF/GFINTER_1.webp","GF|GFL6":"assets/Products Images/GF/GFL6_1.webp","GF|GFL8":"assets/Products Images/GF/GFL8_1.webp","GF|GFLEY2214HD":"assets/Products Images/GF/GFLEY2214HD_1.webp","GF|GFMASSY":"assets/Products Images/GF/GFMASSY_1.webp","GF|GFMAZDA":"assets/Products Images/GF/GFMAZDA_1.webp","GF|GFPEEGEOT":"assets/Products Images/GF/GFPEEGEOT_1.webp","GF|GFPEUGEOT":"assets/Products Images/GF/GFPEUGEOT_1.webp","GF|GFQUALISH":"assets/Products Images/GF/GFQUALISH_1.webp","GF|GFTC4AHD":"assets/Products Images/GF/GFTC4AHD_1.webp","GF|GFTC4HD":"assets/Products Images/GF/GFTC4HD_1.webp","GF|GFTC6":"assets/Products Images/GF/GFTC6_1.webp","GF|GFTC9AOE":"assets/Products Images/GF/GFTC9AOE_1.webp","GF|GFTC9HD":"assets/Products Images/GF/GFTC9HD_1.webp","GF|GFTRAX3":"assets/Products Images/GF/GFTRAX3_1.webp","GF|GFTRAX7":"assets/Products Images/GF/GFTRAX7_1.webp","HALDEX|21174":"assets/Products Images/HALDEX/21174_1.webp","HALDEX|21174A":"assets/Products Images/HALDEX/21174A_1.webp","HALDEX|21184":"assets/Products Images/HALDEX/21184_1.webp","HALDEX|21187":"assets/Products Images/HALDEX/21187_1.webp","HALDEX|21187A":"assets/Products Images/HALDEX/21187A_1.webp","HALDEX|HXH172381":"assets/Products Images/HALDEX/HXH172381_1.webp","HALDEX|HXKN47001":"assets/Products Images/HALDEX/HXKN47001_1.webp","IFLEX|IF1502P":"assets/Products Images/IFLEX/IF1502P_1.webp","IFLEX|IF1504E":"assets/Products Images/IFLEX/IF1504E_1.webp","IFLEX|IF200E400E500E":"assets/Products Images/IFLEX/IF200E-400E-500E_1.webp","IFLEX|IF705":"assets/Products Images/IFLEX/IF705_1.webp","IFLEX|IF710T":"assets/Products Images/IFLEX/IF710T_1.webp","IFLEX|IF711":"assets/Products Images/IFLEX/IF711_1.webp","IFLEX|IF712":"assets/Products Images/IFLEX/IF712_1.webp","IFLEX|IF732":"assets/Products Images/IFLEX/IF732_1.webp","IFLEX|IF745T":"assets/Products Images/IFLEX/IF745T_1.webp","IFLEX|IFDB120":"assets/Products Images/IFLEX/IFDB120_1.webp","IFLEX|IFDB27NW":"assets/Products Images/IFLEX/IFDB27NW_1.webp","IFLEX|IFDB48A":"assets/Products Images/IFLEX/IFDB48A_1.webp","JHAVERI|JFP1415":"assets/Products Images/JHAVERI/JFP1415_1.webp","JHAVERI|JFP1417":"assets/Products Images/JHAVERI/JFP1417_1.webp","JHAVERI|JFP1617":"assets/Products Images/JHAVERI/JFP1617_1.webp","JHAVERI|JFP2123":"assets/Products Images/JHAVERI/JFP2123_1.webp","JHAVERI|JFP2427":"assets/Products Images/JHAVERI/JFP2427_1.webp","JHAVERI|JFP67":"assets/Products Images/JHAVERI/JFP67_1.webp","JHAVERI|JH500B":"assets/Products Images/JHAVERI/JH500B_1.webp","JHAVERI|JH500C":"assets/Products Images/JHAVERI/JH500C_1.webp","JHAVERI|JL21HD2DIFFIMAGES":"assets/Products Images/JHAVERI/JL21HD%28%202%20DIFF.%20IMAGES%29_1.webp","JHAVERI|JL21L":"assets/Products Images/JHAVERI/JL21L_1.webp","JHAVERI|JRP1011":"assets/Products Images/JHAVERI/JRP1011_1.webp","JHAVERI|JRP1213":"assets/Products Images/JHAVERI/JRP1213_1.webp","JHAVERI|JRP1417":"assets/Products Images/JHAVERI/JRP1417_1.webp","JHAVERI|JRP2123":"assets/Products Images/JHAVERI/JRP2123_1.webp","JHAVERI|JRP2427":"assets/Products Images/JHAVERI/JRP2427_1.webp","JHAVERI|JRP89":"assets/Products Images/JHAVERI/JRP89_1.webp","JHAVERI|KX534":"assets/Products Images/JHAVERI/KX534_1.webp","JHAVERI|POPATPAKKAD":"assets/Products Images/JHAVERI/Popat%20Pakkad_1.webp","JHAVERI|RINGPANA":"assets/Products Images/JHAVERI/RING%20PANA_1.webp","KD|KA103":"assets/Products Images/KD/ka103_1.webp","KD|KA112":"assets/Products Images/KD/ka112_1.webp","KD|KA115":"assets/Products Images/KD/ka115_1.webp","KD|KA116":"assets/Products Images/KD/ka116_1.webp","KD|KA117":"assets/Products Images/KD/ka117_1.webp","KD|KA118":"assets/Products Images/KD/KA118_1.webp","KD|KA119":"assets/Products Images/KD/KA119_1.webp","KD|KA125":"assets/Products Images/KD/ka125_1.webp","KD|KA126":"assets/Products Images/KD/ka126_1.webp","KD|KA127":"assets/Products Images/KD/ka127_1.webp","KD|KA131":"assets/Products Images/KD/ka131_1.webp","KD|KA132":"assets/Products Images/KD/ka132_1.webp","KD|KA136":"assets/Products Images/KD/ka136_1.webp","KD|KA137":"assets/Products Images/KD/ka137_1.webp","KD|KA138":"assets/Products Images/KD/ka138_1.webp","KD|KA139":"assets/Products Images/KD/ka139_1.webp","KD|KA140":"assets/Products Images/KD/ka140_1.webp","KD|KA143":"assets/Products Images/KD/ka143_1.webp","KD|KA144":"assets/Products Images/KD/ka144_1.webp","MKGOLD|MK222U":"assets/Products Images/MK%20GOLD/MK222U_1.webp","MKGOLD|MK2725":"assets/Products Images/MK%20GOLD/MK2725_1.webp","MKGOLD|MK2813":"assets/Products Images/MK%20GOLD/MK2813_1.webp","MKGOLD|MK333U":"assets/Products Images/MK%20GOLD/MK333U_1.webp","MKGOLD|MK444U":"assets/Products Images/MK%20GOLD/MK444U_1.webp","MKGOLD|MK555H":"assets/Products Images/MK%20GOLD/MK555H_1.webp","MKGOLD|MK666R":"assets/Products Images/MK%20GOLD/MK666R_1.webp","MKGOLD|MK701":"assets/Products Images/MK%20GOLD/MK701_1.webp","MKGOLD|MK702":"assets/Products Images/MK%20GOLD/MK702_1.webp","MKGOLD|MK703":"assets/Products Images/MK%20GOLD/MK703_1.webp","MKGOLD|MK704":"assets/Products Images/MK%20GOLD/MK704_1.webp","MKGOLD|MK705":"assets/Products Images/MK%20GOLD/MK705_1.webp","MKGOLD|MK706":"assets/Products Images/MK%20GOLD/MK706_1.webp","MKGOLD|MK707":"assets/Products Images/MK%20GOLD/MK707_1.webp","MKGOLD|MK708":"assets/Products Images/MK%20GOLD/MK708_1.webp","MKGOLD|MK710":"assets/Products Images/MK%20GOLD/MK710_1.webp","MKGOLD|MK711":"assets/Products Images/MK%20GOLD/MK711_1.webp","MKGOLD|MK712":"assets/Products Images/MK%20GOLD/MK712_1.webp","MKGOLD|MK714":"assets/Products Images/MK%20GOLD/MK714_1.webp","MKGOLD|MK716":"assets/Products Images/MK%20GOLD/MK716_1.webp","MKGOLD|MK720":"assets/Products Images/MK%20GOLD/MK720_1.webp","MKGOLD|MK721":"assets/Products Images/MK%20GOLD/MK721_1.webp","MKGOLD|MK721H":"assets/Products Images/MK%20GOLD/MK721H_1.webp","MKGOLD|MK722":"assets/Products Images/MK%20GOLD/MK722_1.webp","MKGOLD|MK723":"assets/Products Images/MK%20GOLD/MK723_1.webp","MKGOLD|MK724":"assets/Products Images/MK%20GOLD/MK724_1.webp","MKGOLD|MK724H":"assets/Products Images/MK%20GOLD/MK724H_1.webp","MKGOLD|MK72501":"assets/Products Images/MK%20GOLD/MK72501_1.webp","MKGOLD|MK725":"assets/Products Images/MK%20GOLD/MK725_1.webp","MKGOLD|MK725H":"assets/Products Images/MK%20GOLD/MK725H_1.webp","MKGOLD|MK726":"assets/Products Images/MK%20GOLD/MK726_1.webp","MKGOLD|MK727":"assets/Products Images/MK%20GOLD/MK727_1.webp","MKGOLD|MK727H":"assets/Products Images/MK%20GOLD/MK727H_1.webp","MKGOLD|MK728":"assets/Products Images/MK%20GOLD/MK728_1.webp","MKGOLD|MK730":"assets/Products Images/MK%20GOLD/MK730_1.webp","MKGOLD|MK730A":"assets/Products Images/MK%20GOLD/MK730A_1.webp","MKGOLD|MK731":"assets/Products Images/MK%20GOLD/MK731_1.webp","MKGOLD|MK732":"assets/Products Images/MK%20GOLD/MK732_1.webp","MKGOLD|MK736":"assets/Products Images/MK%20GOLD/MK736_1.webp","MKGOLD|MK741":"assets/Products Images/MK%20GOLD/MK741_1.webp","MKGOLD|MK742":"assets/Products Images/MK%20GOLD/MK742_1.webp","MKGOLD|MK743":"assets/Products Images/MK%20GOLD/MK743_1.webp","MKGOLD|MK744":"assets/Products Images/MK%20GOLD/MK744_1.webp","MKGOLD|MK746":"assets/Products Images/MK%20GOLD/MK746_1.webp","MKGOLD|MK747":"assets/Products Images/MK%20GOLD/MK747_1.webp","MKGOLD|MK748":"assets/Products Images/MK%20GOLD/MK748_1.webp","MKGOLD|MK801":"assets/Products Images/MK%20GOLD/MK801_1.webp","MKGOLD|MK802":"assets/Products Images/MK%20GOLD/MK802_1.webp","MKGOLD|MK803":"assets/Products Images/MK%20GOLD/MK803_1.webp","MKGOLD|MK804":"assets/Products Images/MK%20GOLD/MK804_1.webp","MKGOLD|MK805":"assets/Products Images/MK%20GOLD/MK805_1.webp","MKGOLD|MK806":"assets/Products Images/MK%20GOLD/MK806_1.webp","MKGOLD|MK807":"assets/Products Images/MK%20GOLD/MK807_1.webp","MKGOLD|MK808":"assets/Products Images/MK%20GOLD/MK808_1.webp","MKGOLD|MK809":"assets/Products Images/MK%20GOLD/MK809_1.webp","MKGOLD|MK810A":"assets/Products Images/MK%20GOLD/MK810A_1.webp","MKGOLD|MK810C":"assets/Products Images/MK%20GOLD/MK810C_1.webp","MKGOLD|MK811":"assets/Products Images/MK%20GOLD/MK811_1.webp","MKGOLD|MK812":"assets/Products Images/MK%20GOLD/MK812_1.webp","MKGOLD|MK813":"assets/Products Images/MK%20GOLD/MK813_1.webp","MKGOLD|MK814":"assets/Products Images/MK%20GOLD/MK814_1.webp","MKGOLD|MK815":"assets/Products Images/MK%20GOLD/MK815_1.webp","MKGOLD|MK816":"assets/Products Images/MK%20GOLD/MK816_1.webp","MKGOLD|MK816A":"assets/Products Images/MK%20GOLD/MK816A_1.webp","MKGOLD|MK817":"assets/Products Images/MK%20GOLD/MK817_1.webp","MKGOLD|MK822":"assets/Products Images/MK%20GOLD/MK822_1.webp","MKGOLD|MK828":"assets/Products Images/MK%20GOLD/MK828_1.webp","MKGOLD|MK830":"assets/Products Images/MK%20GOLD/MK830_1.webp","MKGOLD|MK836":"assets/Products Images/MK%20GOLD/MK836_1.webp","MKGOLD|MK841":"assets/Products Images/MK%20GOLD/MK841_1.webp","MKGOLD|MK842":"assets/Products Images/MK%20GOLD/MK842_1.webp","MKGOLD|MK843":"assets/Products Images/MK%20GOLD/MK843_1.webp","MKGOLD|MK844":"assets/Products Images/MK%20GOLD/MK844_1.webp","MKGOLD|MK845":"assets/Products Images/MK%20GOLD/MK845_1.webp","MKGOLD|MK850":"assets/Products Images/MK%20GOLD/MK850_1.webp","MKGOLD|MK851":"assets/Products Images/MK%20GOLD/MK851_1.webp","MKGOLD|MK853":"assets/Products Images/MK%20GOLD/MK853_1.webp","MKGOLD|MK854":"assets/Products Images/MK%20GOLD/MK854_1.webp","MKGOLD|MK855":"assets/Products Images/MK%20GOLD/MK855_1.webp","MKGOLD|MK857":"assets/Products Images/MK%20GOLD/MK857_1.webp","MKGOLD|MK859":"assets/Products Images/MK%20GOLD/MK859_1.webp","MKGOLD|MK859A":"assets/Products Images/MK%20GOLD/MK859A_1.webp","MKGOLD|MK859B":"assets/Products Images/MK%20GOLD/MK859B_1.webp","MKGOLD|MK860":"assets/Products Images/MK%20GOLD/MK860_1.webp","MKGOLD|MK861":"assets/Products Images/MK%20GOLD/MK861_1.webp","MKGOLD|MK862":"assets/Products Images/MK%20GOLD/MK862_1.webp","MKGOLD|MK866":"assets/Products Images/MK%20GOLD/MK866_1.webp","MKGOLD|MK867":"assets/Products Images/MK%20GOLD/MK867_1.webp","MKGOLD|MK872":"assets/Products Images/MK%20GOLD/MK872_1.webp","MKGOLD|MK873":"assets/Products Images/MK%20GOLD/MK873_1.webp","MKGOLD|MK874":"assets/Products Images/MK%20GOLD/MK874_1.webp","MKGOLD|MK875":"assets/Products Images/MK%20GOLD/MK875_1.webp","MKGOLD|MK876":"assets/Products Images/MK%20GOLD/MK876_1.webp","MKGOLD|MK877":"assets/Products Images/MK%20GOLD/MK877_1.webp","MKGOLD|MK881":"assets/Products Images/MK%20GOLD/MK881_1.webp","MKGOLD|MK882":"assets/Products Images/MK%20GOLD/MK882_1.webp","MKGOLD|MK883":"assets/Products Images/MK%20GOLD/MK883_1.webp","MKGOLD|MK884":"assets/Products Images/MK%20GOLD/MK884_1.webp","MKGOLD|MK885":"assets/Products Images/MK%20GOLD/MK885_1.webp","MKGOLD|MK890":"assets/Products Images/MK%20GOLD/MK890_1.webp","MKGOLD|MK893":"assets/Products Images/MK%20GOLD/MK893_1.webp","MKGOLD|MK894":"assets/Products Images/MK%20GOLD/MK894_1.webp","MKGOLD|MK895":"assets/Products Images/MK%20GOLD/MK895_1.webp","MKGOLD|MK897":"assets/Products Images/MK%20GOLD/MK897_1.webp","MKGOLD|MK898":"assets/Products Images/MK%20GOLD/MK898_1.webp","MKGOLD|MK901A":"assets/Products Images/MK%20GOLD/MK901A_1.webp","MKGOLD|MK901B":"assets/Products Images/MK%20GOLD/MK901B_1.webp","MKGOLD|MK903":"assets/Products Images/MK%20GOLD/MK903_1.webp","MKGOLD|MK907":"assets/Products Images/MK%20GOLD/MK907_1.webp","MKGOLD|MK908":"assets/Products Images/MK%20GOLD/MK908_1.webp","MKGOLD|MK909":"assets/Products Images/MK%20GOLD/MK909_1.webp","MKGOLD|MK910":"assets/Products Images/MK%20GOLD/MK910_1.webp","MKGOLD|MK910A":"assets/Products Images/MK%20GOLD/MK910A_1.webp","MKGOLD|MK911":"assets/Products Images/MK%20GOLD/MK911_1.webp","MKGOLD|MK912":"assets/Products Images/MK%20GOLD/MK912_1.webp","MKGOLD|MK921":"assets/Products Images/MK%20GOLD/MK921_1.webp","MKGOLD|MK922":"assets/Products Images/MK%20GOLD/MK922_1.webp","MKGOLD|MK923":"assets/Products Images/MK%20GOLD/MK923_1.webp","MKGOLD|MK924":"assets/Products Images/MK%20GOLD/MK924_1.webp","MKGOLD|MK925":"assets/Products Images/MK%20GOLD/MK925_1.webp","MKGOLD|MK926":"assets/Products Images/MK%20GOLD/MK926_1.webp","MKGOLD|MK927":"assets/Products Images/MK%20GOLD/MK927_1.webp","MKGOLD|MK928":"assets/Products Images/MK%20GOLD/MK928_1.webp","MKGOLD|MK929":"assets/Products Images/MK%20GOLD/MK929_1.webp","MKGOLD|MK930":"assets/Products Images/MK%20GOLD/MK930_1.webp","MKGOLD|MK930A":"assets/Products Images/MK%20GOLD/MK930A_1.webp","MKGOLD|MK931":"assets/Products Images/MK%20GOLD/MK931_1.webp","MKGOLD|MK932":"assets/Products Images/MK%20GOLD/MK932_1.webp","MKGOLD|MK933":"assets/Products Images/MK%20GOLD/MK933_1.webp","MKGOLD|MK934":"assets/Products Images/MK%20GOLD/MK934_1.webp","MKGOLD|MK941":"assets/Products Images/MK%20GOLD/MK941_1.webp","MKGOLD|MK942":"assets/Products Images/MK%20GOLD/MK942_1.webp","MKGOLD|MK943":"assets/Products Images/MK%20GOLD/MK943_1.webp","MKGOLD|MK944":"assets/Products Images/MK%20GOLD/MK944_1.webp","MKGOLD|MK945":"assets/Products Images/MK%20GOLD/MK945_1.webp","MKGOLD|MK946":"assets/Products Images/MK%20GOLD/MK946_1.webp","MKGOLD|MK947":"assets/Products Images/MK%20GOLD/MK947_1.webp","MKGOLD|MK947A":"assets/Products Images/MK%20GOLD/MK947A_1.webp","MKGOLD|MK948":"assets/Products Images/MK%20GOLD/MK948_1.webp","MKGOLD|MK950":"assets/Products Images/MK%20GOLD/MK950_1.webp","MKGOLD|MK951":"assets/Products Images/MK%20GOLD/MK951_1.webp","MKGOLD|MK952":"assets/Products Images/MK%20GOLD/MK952_1.webp","MKGOLD|MK955":"assets/Products Images/MK%20GOLD/MK955_1.webp","MKGOLD|MK956":"assets/Products Images/MK%20GOLD/MK956_1.webp","MKGOLD|MK956S":"assets/Products Images/MK%20GOLD/MK956S_1.webp","MKGOLD|MK957":"assets/Products Images/MK%20GOLD/MK957_1.webp","MKGOLD|MK957A":"assets/Products Images/MK%20GOLD/MK957A_1.webp","MKGOLD|MK960":"assets/Products Images/MK%20GOLD/MK960_1.webp","MKGOLD|MK960H":"assets/Products Images/MK%20GOLD/MK960H_1.webp","MKGOLD|MK961":"assets/Products Images/MK%20GOLD/MK961_1.webp","MKGOLD|MK962":"assets/Products Images/MK%20GOLD/MK962_1.webp","MKGOLD|MK963":"assets/Products Images/MK%20GOLD/MK963_1.webp","MKGOLD|MK964":"assets/Products Images/MK%20GOLD/MK964_1.webp","MKGOLD|MK965":"assets/Products Images/MK%20GOLD/MK965_1.webp","MKGOLD|MK965A":"assets/Products Images/MK%20GOLD/MK965A_1.webp","MKGOLD|MK966":"assets/Products Images/MK%20GOLD/MK966_1.webp","MKGOLD|MK967":"assets/Products Images/MK%20GOLD/MK967_1.webp","MKGOLD|MK967A":"assets/Products Images/MK%20GOLD/MK967A_1.webp","MKGOLD|MK968":"assets/Products Images/MK%20GOLD/MK968_1.webp","MKGOLD|MK969":"assets/Products Images/MK%20GOLD/MK969_1.webp","MKGOLD|MK970":"assets/Products Images/MK%20GOLD/MK970_1.webp","MKGOLD|MK971":"assets/Products Images/MK%20GOLD/MK971_1.webp","MKGOLD|MK972":"assets/Products Images/MK%20GOLD/MK972_1.webp","MKGOLD|MK974":"assets/Products Images/MK%20GOLD/MK974_1.webp","MKGOLD|MK975":"assets/Products Images/MK%20GOLD/MK975_1.webp","MKGOLD|MK977":"assets/Products Images/MK%20GOLD/MK977_1.webp","MKGOLD|MK978":"assets/Products Images/MK%20GOLD/MK978_1.webp","MKGOLD|MK979":"assets/Products Images/MK%20GOLD/MK979_1.webp","MKGOLD|MK980":"assets/Products Images/MK%20GOLD/MK980_1.webp","MKGOLD|MK982":"assets/Products Images/MK%20GOLD/MK982_1.webp","MKGOLD|MK984":"assets/Products Images/MK%20GOLD/MK984_1.webp","MKGOLD|MK984A":"assets/Products Images/MK%20GOLD/MK984A_1.webp","MKGOLD|MK986":"assets/Products Images/MK%20GOLD/MK986_1.webp","MKGOLD|MK988":"assets/Products Images/MK%20GOLD/MK988_1.webp","NGK|NGBKR5E11":"assets/Products Images/NGK/NGBKR5E11_1.webp","NGK|NGBKR5EGP":"assets/Products Images/NGK/NGBKR5EGP_1.webp","NGK|NGBKR6E11":"assets/Products Images/NGK/NGBKR6E11_1.webp","NGK|NGBKR6E":"assets/Products Images/NGK/NGBKR6E_1.webp","NGK|NGBKR6EGP":"assets/Products Images/NGK/NGBKR6EGP_1.webp","NGK|NGBKR6EIX":"assets/Products Images/NGK/NGBKR6EIX_1.webp","NGK|NGBP6H":"assets/Products Images/NGK/NGBP6H_1.webp","NGK|NGBPR5ES":"assets/Products Images/NGK/NGBPR5ES_1.webp","NGK|NGDCPR7E":"assets/Products Images/NGK/NGDCPR7E_1.webp","NGK|NGKR6A10":"assets/Products Images/NGK/NGKR6A10_1.webp","NGK|NGY1019J":"assets/Products Images/NGK/NGY1019J_1.webp","OEPLUS|91017":"assets/Products Images/OE%20PLUS/91017_1.webp","OEPLUS|91213":"assets/Products Images/OE%20PLUS/91213_1.webp","OEPLUS|91218":"assets/Products Images/OE%20PLUS/91218_1.webp","OEPLUS|93018":"assets/Products Images/OE%20PLUS/93018_1.webp","OEPLUS|94018":"assets/Products Images/OE%20PLUS/94018_1.webp","OEPLUS|FB02":"assets/Products Images/OE%20PLUS/FB_02.webp","OEPLUS|OE1444":"assets/Products Images/OE%20PLUS/OE1444_1.webp","OEPLUS|OE1555":"assets/Products Images/OE%20PLUS/OE1555_1.webp","OEPLUS|OE1666":"assets/Products Images/OE%20PLUS/OE1666_1.webp","OEPLUS|OE1666C":"assets/Products Images/OE%20PLUS/OE1666C_1.webp","OEPLUS|OE232":"assets/Products Images/OE%20PLUS/OE232_1.webp","OEPLUS|OE320":"assets/Products Images/OE%20PLUS/OE320_1.webp","OEPLUS|OE320C":"assets/Products Images/OE%20PLUS/OE320C_1.webp","OEPLUS|OE345":"assets/Products Images/OE%20PLUS/OE345_1.webp","OEPLUS|RB":"assets/Products Images/OE%20PLUS/RB_1.webp","OEPLUS|WATERMOTOR":"assets/Products Images/OE%20PLUS/WATER%20MOTOR_1.webp","OEPLUS|WEVELLERPAD":"assets/Products Images/OE%20PLUS/WEVELLER%20PAD_1.webp","OEPLUS|WH103":"assets/Products Images/OE%20PLUS/WH103_1.webp","OEPLUS|WH104":"assets/Products Images/OE%20PLUS/WH104_1.webp","OEPLUS|WH201":"assets/Products Images/OE%20PLUS/WH201_1.webp","OEPLUS|WH203":"assets/Products Images/OE%20PLUS/WH203_1.webp","OEPLUS|WIPERARMUHOOK":"assets/Products Images/OE%20PLUS/WIPER%20ARM%20U%20HOOK_1.webp","OEPLUS|WIPERARM":"assets/Products Images/OE%20PLUS/WIPER%20ARM_1.webp","OLMA|1019":"assets/Products Images/OLMA/1019_1.webp","OLMA|1020":"assets/Products Images/OLMA/1020_1.webp","OLMA|1026":"assets/Products Images/OLMA/1026_1.webp","OLMA|1026A":"assets/Products Images/OLMA/1026A_1.webp","OLMA|1027":"assets/Products Images/OLMA/1027_1.webp","OLMA|1029":"assets/Products Images/OLMA/1029_1.webp","OLMA|1029A":"assets/Products Images/OLMA/1029A_1.webp","OLMA|1030":"assets/Products Images/OLMA/1030_1.webp","OLMA|1030A":"assets/Products Images/OLMA/1030A_1.webp","OLMA|1031":"assets/Products Images/OLMA/1031_1.webp","OLMA|1032":"assets/Products Images/OLMA/1032_1.webp","OLMA|1033":"assets/Products Images/OLMA/1033_1.webp","OLMA|4091A":"assets/Products Images/OLMA/4091A_1.webp","OLMA|ALTERNATORADJUSTORTATA4071612500X500":"assets/Products Images/OLMA/alternator-adjustor-tata-407-1612-500x500_1.webp","OLMA|ANGELTYPE":"assets/Products Images/OLMA/ANGEL%20TYPE_1.webp","OLMA|CENTERBEARINGJOINTBRACKET6MM94M500X500":"assets/Products Images/OLMA/center-bearing-joint-bracket-6-m-m-94m--500x500_1.webp","OLMA|CENTERBEARINGJOINTBRACKETHEAVYDUTY97M500X500":"assets/Products Images/OLMA/center-bearing-joint-bracket-heavy-duty-97-m-500x500_1.webp","OLMA|ENGINEMOUNTINGBRACKET25183118500X500":"assets/Products Images/OLMA/engine-mounting-bracket-2518-3118-500x500_1.webp","OLMA|G1001":"assets/Products Images/OLMA/G1001_1.webp","OLMA|G1002":"assets/Products Images/OLMA/G1002_1.webp","OLMA|G1003":"assets/Products Images/OLMA/G1003_1.webp","OLMA|G1004":"assets/Products Images/OLMA/G1004_1.webp","OLMA|G1007":"assets/Products Images/OLMA/G1007_1.webp","OLMA|G1008":"assets/Products Images/OLMA/G1008_1.webp","OLMA|G10125FN":"assets/Products Images/OLMA/G10125FN_1.webp","OLMA|G10125L":"assets/Products Images/OLMA/G10125L_1.webp","OLMA|G1013":"assets/Products Images/OLMA/G1013_1.webp","OLMA|G1090":"assets/Products Images/OLMA/G1090_1.webp","OLMA|G1091":"assets/Products Images/OLMA/G1091_1.webp","OLMA|G12UNCL":"assets/Products Images/OLMA/G12UNCL_1.webp","OLMA|G1366":"assets/Products Images/OLMA/G1366_1.webp","OLMA|G1375":"assets/Products Images/OLMA/G1375_1.webp","OLMA|G1390":"assets/Products Images/OLMA/G1390_1.webp","OLMA|G1391":"assets/Products Images/OLMA/G1391_1.webp","OLMA|G1391A":"assets/Products Images/OLMA/G1391A_1.webp","OLMA|G1391B":"assets/Products Images/OLMA/G1391B_1.webp","OLMA|G1391C":"assets/Products Images/OLMA/G1391C_1.webp","OLMA|G1391D":"assets/Products Images/OLMA/G1391D_1.webp","OLMA|G1391E":"assets/Products Images/OLMA/G1391E_1.webp","OLMA|G1391F":"assets/Products Images/OLMA/G1391F_1.webp","OLMA|G1391G":"assets/Products Images/OLMA/G1391G_1.webp","OLMA|G1454":"assets/Products Images/OLMA/G1454_1.webp","OLMA|G1454N":"assets/Products Images/OLMA/G1454N_1.webp","OLMA|G1615LN":"assets/Products Images/OLMA/G1615LN_1.webp","OLMA|G3200":"assets/Products Images/OLMA/G3200_1.webp","OLMA|G3200A":"assets/Products Images/OLMA/G3200A_1.webp","OLMA|G3201":"assets/Products Images/OLMA/G3201_1.webp","OLMA|G3202":"assets/Products Images/OLMA/G3202_1.webp","OLMA|G3203":"assets/Products Images/OLMA/G3203_1.webp","OLMA|G3203A":"assets/Products Images/OLMA/G3203A_1.webp","OLMA|G3204":"assets/Products Images/OLMA/G3204_1.webp","OLMA|G3207":"assets/Products Images/OLMA/G3207_1.webp","OLMA|G3208A":"assets/Products Images/OLMA/G3208A_1.webp","OLMA|G3209":"assets/Products Images/OLMA/G3209_1.webp","OLMA|G3210":"assets/Products Images/OLMA/G3210_1.webp","OLMA|G3211":"assets/Products Images/OLMA/G3211_1.webp","OLMA|G3212":"assets/Products Images/OLMA/G3212_1.webp","OLMA|G3215":"assets/Products Images/OLMA/G3215_1.webp","OLMA|G3216":"assets/Products Images/OLMA/G3216_1.webp","OLMA|G38UNFL":"assets/Products Images/OLMA/G38UNFL_1.webp","OLMA|G432":"assets/Products Images/OLMA/G432_1.webp","OLMA|G433":"assets/Products Images/OLMA/G433_1.webp","OLMA|G492":"assets/Products Images/OLMA/G492_1.webp","OLMA|G495A":"assets/Products Images/OLMA/G495A_1.webp","OLMA|G510B":"assets/Products Images/OLMA/G510B_1.webp","OLMA|G516UNCL":"assets/Products Images/OLMA/G516UNCL_1.webp","OLMA|G716UNCL":"assets/Products Images/OLMA/G716UNCL_1.webp","OLMA|G8125FN":"assets/Products Images/OLMA/G8125FN_1.webp","OLMA|G81LN":"assets/Products Images/OLMA/G81LN_1.webp","OLMA|GR40":"assets/Products Images/OLMA/GR40_1.webp","OLMA|GTCSWEX":"assets/Products Images/OLMA/GTCSWEX_1.webp","OLMA|MARUTITYPE":"assets/Products Images/OLMA/MARUTI%20TYPE_1.webp","OLMA|O104":"assets/Products Images/OLMA/O104_1.webp","OLMA|O121":"assets/Products Images/OLMA/O121_1.webp","OLMA|O126":"assets/Products Images/OLMA/O126_1.webp","OLMA|O128":"assets/Products Images/OLMA/O128_1.webp","OLMA|O129":"assets/Products Images/OLMA/O129_1.webp","OLMA|O130":"assets/Products Images/OLMA/O130_1.webp","OLMA|O131":"assets/Products Images/OLMA/O131_1.webp","OLMA|O145A":"assets/Products Images/OLMA/O145A_1.webp","OLMA|O1482A":"assets/Products Images/OLMA/O1482A_1.webp","OLMA|O1482C":"assets/Products Images/OLMA/O1482C_1.webp","OLMA|O240":"assets/Products Images/OLMA/O240_1.webp","OLMA|O2465":"assets/Products Images/OLMA/O2465_1.webp","OLMA|O247":"assets/Products Images/OLMA/O247_1.webp","OLMA|O276A":"assets/Products Images/OLMA/O276A_1.webp","OLMA|O280":"assets/Products Images/OLMA/O280_1.webp","OLMA|O282":"assets/Products Images/OLMA/O282_1.webp","OLMA|O283":"assets/Products Images/OLMA/O283_1.webp","OLMA|O284":"assets/Products Images/OLMA/O284_1.webp","OLMA|O285":"assets/Products Images/OLMA/O285_1.webp","OLMA|O285A":"assets/Products Images/OLMA/O285A_1.webp","OLMA|O289":"assets/Products Images/OLMA/O289_1.webp","OLMA|O290":"assets/Products Images/OLMA/O290_1.webp","OLMA|O291":"assets/Products Images/OLMA/O291_1.webp","OLMA|O294":"assets/Products Images/OLMA/O294_1.webp","OLMA|O2952":"assets/Products Images/OLMA/O2952_1.webp","OLMA|O2953":"assets/Products Images/OLMA/O2953_1.webp","OLMA|O295":"assets/Products Images/OLMA/O295_1.webp","OLMA|O302":"assets/Products Images/OLMA/O302_1.webp","OLMA|O309A":"assets/Products Images/OLMA/O309A_1.webp","OLMA|O314":"assets/Products Images/OLMA/O314_1.webp","OLMA|O315A":"assets/Products Images/OLMA/O315A_1.webp","OLMA|O316":"assets/Products Images/OLMA/O316_1.webp","OLMA|O316A":"assets/Products Images/OLMA/O316A_1.webp","OLMA|O332":"assets/Products Images/OLMA/O332_1.webp","OLMA|O404A":"assets/Products Images/OLMA/O404A_1.webp","OLMA|O404B":"assets/Products Images/OLMA/O404B_1.webp","OLMA|O407":"assets/Products Images/OLMA/O407_1.webp","OLMA|O407A":"assets/Products Images/OLMA/O407A_1.webp","OLMA|O409":"assets/Products Images/OLMA/O409_1.webp","OLMA|O410":"assets/Products Images/OLMA/O410_1.webp","OLMA|O410A":"assets/Products Images/OLMA/O410A_1.webp","OLMA|O411":"assets/Products Images/OLMA/O411_1.webp","OLMA|O414B":"assets/Products Images/OLMA/O414B_1.webp","OLMA|O444":"assets/Products Images/OLMA/O444_1.webp","OLMA|O446":"assets/Products Images/OLMA/O446_1.webp","OLMA|O491":"assets/Products Images/OLMA/O491_1.webp","OLMA|O496":"assets/Products Images/OLMA/O496_1.webp","OLMA|O5070":"assets/Products Images/OLMA/O5070_1.webp","OLMA|STRIPTYPE":"assets/Products Images/OLMA/STRIP%20TYPE_1.webp","OLMA|TAILLAMPBRACKET4CHAMBER500X500":"assets/Products Images/OLMA/tail-lamp-bracket-4-chamber-500x500_1.webp","OLMA|TAILLAMPBRACKET407500X500":"assets/Products Images/OLMA/tail-lamp-bracket-407-500x500_1.webp","OSRAM|622118RL":"assets/Products Images/OSRAM/622118RL_1.webp","OSRAM|OS62210CBM":"assets/Products Images/OSRAM/OS62210CBM_1.webp","OSRAM|OS62240CB":"assets/Products Images/OSRAM/OS62240CB_1.webp","OSRAM|OS62327":"assets/Products Images/OSRAM/OS62327_1.webp","OSRAM|OS64185":"assets/Products Images/OSRAM/OS64185_1.webp","OSRAM|OS64204":"assets/Products Images/OSRAM/OS64204_1.webp","OSRAM|OS64210":"assets/Products Images/OSRAM/OS64210_1.webp","OSRAM|OS64211":"assets/Products Images/OSRAM/OS64211_1.webp","QH|CHATGPTIMAGEJUL282025115229AM":"assets/Products Images/QH/ChatGPT%20Image%20Jul%2028%2C%202025%2C%2011_52_29%20AM_1.webp","QH|CROSSMEMBERLOWER":"assets/Products Images/QH/cross%20member%20lower_1.webp","QH|QBSJ0512FSDS":"assets/Products Images/QH/QBSJ0512FSDS_1.webp","QH|QDL0202":"assets/Products Images/QH/QDL0202_1.webp","QH|QSJ0506PR":"assets/Products Images/QH/QSJ0506PR_1.webp","QH|QTCA02009R":"assets/Products Images/QH/QTCA02009R_1.webp","QH|QTIS76003":"assets/Products Images/QH/QTIS76003_1.webp","QH|QTIS76004":"assets/Products Images/QH/QTIS76004_1.webp","QH|QTIS76006":"assets/Products Images/QH/QTIS76006_1.webp","QH|QTIS76007":"assets/Products Images/QH/QTIS76007_1.webp","QH|QTIS76008":"assets/Products Images/QH/QTIS76008_1.webp","QH|QTRE0802":"assets/Products Images/QH/QTRE0802_1.webp","QH|QTSP75001MNS":"assets/Products Images/QH/QTSP75001MNS_1.webp","QH|QTSP75003MBPP":"assets/Products Images/QH/QTSP75003MBPP_1.webp","QH|QTSP75004MB":"assets/Products Images/QH/QTSP75004MB_1.webp","QH|QTSP75005MBPI":"assets/Products Images/QH/QTSP75005MBPI_1.webp","QH|QTSP75006MT3":"assets/Products Images/QH/QTSP75006MT3_1.webp","QH|QTSP75007MHX5":"assets/Products Images/QH/QTSP75007MHX5_1.webp","RAICAM|1043622":"assets/Products Images/RAICAM/1043622_1.webp","RAICAM|1043625":"assets/Products Images/RAICAM/1043625_1.webp","RAICAM|1043626":"assets/Products Images/RAICAM/1043626_1.webp","RAICAM|1059697":"assets/Products Images/RAICAM/1059697_1.webp","RAICAM|1087910":"assets/Products Images/RAICAM/1087910_1.webp","RAICAM|1088242":"assets/Products Images/RAICAM/1088242_1.webp","RAICAM|1088606":"assets/Products Images/RAICAM/1088606_1.webp","RAICAM|1090693":"assets/Products Images/RAICAM/1090693_1.webp","RAICAM|1090694":"assets/Products Images/RAICAM/1090694_1.webp","RAICAM|1090737":"assets/Products Images/RAICAM/1090737_1.webp","RAICAM|1090866":"assets/Products Images/RAICAM/1090866_1.webp","RAICAM|1091175":"assets/Products Images/RAICAM/1091175_1.webp","RAICAM|1091176":"assets/Products Images/RAICAM/1091176_1.webp","RAICAM|1091524":"assets/Products Images/RAICAM/1091524_1.webp","RAICAM|1091526":"assets/Products Images/RAICAM/1091526_1.webp","RAICAM|1091527":"assets/Products Images/RAICAM/1091527_1.webp","RAICAM|1092489":"assets/Products Images/RAICAM/1092489_1.webp","RAICAM|1092621":"assets/Products Images/RAICAM/1092621_1.webp","RAICAM|479470":"assets/Products Images/RAICAM/479470_1.webp","RAICAM|479471":"assets/Products Images/RAICAM/479471_1.webp","RAICAM|C1088606F":"assets/Products Images/RAICAM/C1088606F_1.webp","RAICAM|C1090693":"assets/Products Images/RAICAM/C1090693_1.webp","RAICAM|C1090694":"assets/Products Images/RAICAM/C1090694_1.webp","RAICAM|C1090737":"assets/Products Images/RAICAM/C1090737_1.webp","RAICAM|C1091524":"assets/Products Images/RAICAM/C1091524_1.webp","RAICAM|C1091526F":"assets/Products Images/RAICAM/C1091526F_1.webp","RAICAM|C1092621":"assets/Products Images/RAICAM/C1092621_1.webp","RAICAM|KT1900":"assets/Products Images/RAICAM/KT1900_1.webp","RAICAM|KT1902":"assets/Products Images/RAICAM/KT1902_1.webp","RAICAM|RC90700CA":"assets/Products Images/RAICAM/RC90700CA_1.webp","RAICAM|RC90700DP":"assets/Products Images/RAICAM/RC90700DP_1.webp","RAICAM|RC90701CA":"assets/Products Images/RAICAM/RC90701CA_1.webp","RAICAM|RC90701DP":"assets/Products Images/RAICAM/RC90701DP_1.webp","RAICAM|RC90702CA":"assets/Products Images/RAICAM/RC90702CA_1.webp","RAICAM|RC90702DP":"assets/Products Images/RAICAM/RC90702DP_1.webp","RAICAM|RC90705":"assets/Products Images/RAICAM/RC90705_1.webp","RAICAM|RC90716CA":"assets/Products Images/RAICAM/RC90716CA_1.webp","RAICAM|RC90716DP":"assets/Products Images/RAICAM/RC90716DP_1.webp","RAICAM|RC90718CA":"assets/Products Images/RAICAM/RC90718CA_1.webp","RAICAM|RC90718DP":"assets/Products Images/RAICAM/RC90718DP_1.webp","RAICAM|RC90719CA":"assets/Products Images/RAICAM/RC90719CA_1.webp","RAICAM|RC90719DP":"assets/Products Images/RAICAM/RC90719DP_1.webp","RAICAM|RC90720DP":"assets/Products Images/RAICAM/RC90720DP_1.webp","RAICAM|RC90721CA":"assets/Products Images/RAICAM/RC90721CA_1.webp","RAICAM|RC90721DP":"assets/Products Images/RAICAM/RC90721DP_1.webp","RAICAM|RC90722CA":"assets/Products Images/RAICAM/RC90722CA_1.webp","RAICAM|RC90722DP":"assets/Products Images/RAICAM/RC90722DP_1.webp","RAICAM|RC90723CA":"assets/Products Images/RAICAM/RC90723CA_1.webp","RAICAM|RC90727CA":"assets/Products Images/RAICAM/RC90727CA_1.webp","RAICAM|RC90727DP":"assets/Products Images/RAICAM/RC90727DP_1.webp","RAICAM|RC90729":"assets/Products Images/RAICAM/RC90729_1.webp","RAICAM|RIC90718CA":"assets/Products Images/RAICAM/RIC90718CA_1.webp","RAICAM|RIC90718DP":"assets/Products Images/RAICAM/RIC90718DP_1.webp","RAICAM|RIC90723CA":"assets/Products Images/RAICAM/RIC90723CA_1.webp","RAJNISH|CHATGPTIMAGEJUL312025031552PM":"assets/Products Images/RAJNISH/ChatGPT%20Image%20Jul%2031%2C%202025%2C%2003_15_52%20PM_1.webp","RAJNISH|J8002":"assets/Products Images/RAJNISH/J8002_1.webp","RAJNISH|RJ018001":"assets/Products Images/RAJNISH/RJ018001_1.webp","RAJNISH|RJ019001":"assets/Products Images/RAJNISH/rj019001_1.webp","RAJNISH|RJ1001":"assets/Products Images/RAJNISH/RJ1001_1.webp","RAJNISH|RJ1006":"assets/Products Images/RAJNISH/RJ1006_1.webp","RAJNISH|RJ1007":"assets/Products Images/RAJNISH/RJ1007_1.webp","RAJNISH|RJ1026G":"assets/Products Images/RAJNISH/RJ1026G_1.webp","RAJNISH|RJ1027":"assets/Products Images/RAJNISH/RJ1027_1.webp","RAJNISH|RJ1029":"assets/Products Images/RAJNISH/RJ1029_1.webp","RAJNISH|RJ1029G":"assets/Products Images/RAJNISH/RJ1029G_1.webp","RAJNISH|RJ1031G":"assets/Products Images/RAJNISH/RJ1031G_1.webp","RAJNISH|RJ11":"assets/Products Images/RAJNISH/RJ11_1.webp","RAJNISH|RJ1200":"assets/Products Images/RAJNISH/RJ1200_1.webp","RAJNISH|RJ1223":"assets/Products Images/RAJNISH/RJ1223_1.webp","RAJNISH|RJ12":"assets/Products Images/RAJNISH/RJ12_1.webp","RAJNISH|RJ1390":"assets/Products Images/RAJNISH/RJ1390_1.webp","RAJNISH|RJ15":"assets/Products Images/RAJNISH/RJ15_1.webp","RAJNISH|RJ16":"assets/Products Images/RAJNISH/RJ16_1.webp","RAJNISH|RJ17":"assets/Products Images/RAJNISH/RJ17_1.webp","RAJNISH|RJ18":"assets/Products Images/RAJNISH/RJ18_1.webp","RAJNISH|RJ19":"assets/Products Images/RAJNISH/RJ19_1.webp","RAJNISH|RJ1":"assets/Products Images/RAJNISH/RJ1_1.webp","RAJNISH|RJ2025":"assets/Products Images/RAJNISH/RJ2025_1.webp","RAJNISH|RJ2101":"assets/Products Images/RAJNISH/RJ2101_1.webp","RAJNISH|RJ2110":"assets/Products Images/RAJNISH/RJ2110_1.webp","RAJNISH|RJ22":"assets/Products Images/RAJNISH/RJ22_1.webp","RAJNISH|RJ23":"assets/Products Images/RAJNISH/RJ23_1.webp","RAJNISH|RJ24":"assets/Products Images/RAJNISH/RJ24_1.webp","RAJNISH|RJ25":"assets/Products Images/RAJNISH/RJ25_1.webp","RAJNISH|RJ29CAPWASHER":"assets/Products Images/RAJNISH/rj29%20cap%20washer_1.webp","RAJNISH|RJ3001":"assets/Products Images/RAJNISH/RJ3001_1.webp","RAJNISH|RJ3018":"assets/Products Images/RAJNISH/RJ3018_1.webp","RAJNISH|RJ3020":"assets/Products Images/RAJNISH/RJ3020_1.webp","RAJNISH|RJ3033":"assets/Products Images/RAJNISH/RJ3033_1.webp","RAJNISH|RJ40":"assets/Products Images/RAJNISH/RJ40_1.webp","RAJNISH|RJ41":"assets/Products Images/RAJNISH/RJ41_1.webp","RAJNISH|RJ4501AL":"assets/Products Images/RAJNISH/RJ4501AL_1.webp","RAJNISH|RJ4505":"assets/Products Images/RAJNISH/RJ4505_1.webp","RAJNISH|RJ4506":"assets/Products Images/RAJNISH/RJ4506_1.webp","RAJNISH|RJ4510":"assets/Products Images/RAJNISH/RJ4510_1.webp","RAJNISH|RJ4510AL":"assets/Products Images/RAJNISH/RJ4510AL_1.webp","RAJNISH|RJ4510ASSY":"assets/Products Images/RAJNISH/rj4510assy_1.webp","RAJNISH|RJ4":"assets/Products Images/RAJNISH/RJ4_1.webp","RAJNISH|RJ5001":"assets/Products Images/RAJNISH/RJ5001_1.webp","RAJNISH|RJ5002":"assets/Products Images/RAJNISH/RJ5002_1.webp","RAJNISH|RJ5011":"assets/Products Images/RAJNISH/RJ5011_1.webp","RAJNISH|RJ5201":"assets/Products Images/RAJNISH/RJ5201_1.webp","RAJNISH|RJ5202":"assets/Products Images/RAJNISH/RJ5202_1.webp","RAJNISH|RJ6310":"assets/Products Images/RAJNISH/RJ6310_1.webp","RAJNISH|RJ65":"assets/Products Images/RAJNISH/RJ65_1.webp","RAJNISH|RJ66":"assets/Products Images/RAJNISH/RJ66_1.webp","RAJNISH|RJ7001001":"assets/Products Images/RAJNISH/rj7001001_1.webp","RAJNISH|RJ75":"assets/Products Images/RAJNISH/RJ75_1.webp","RAJNISH|RJ7":"assets/Products Images/RAJNISH/RJ7_1.webp","RAJNISH|RJ8001":"assets/Products Images/RAJNISH/RJ8001_1.webp","RAJNISH|RJ8003":"assets/Products Images/RAJNISH/RJ8003_1.webp","RAJNISH|RJ8008":"assets/Products Images/RAJNISH/RJ8008_1.webp","RAJNISH|RJ8010":"assets/Products Images/RAJNISH/RJ8010_1.webp","RAJNISH|RJ8011":"assets/Products Images/RAJNISH/RJ8011_1.webp","RAJNISH|RJ81111010":"assets/Products Images/RAJNISH/rj81111010_1.webp","RAJNISH|RJ8111110":"assets/Products Images/RAJNISH/rj8111110_1.webp","RAJNISH|RJ9072":"assets/Products Images/RAJNISH/RJ9072_1.webp","RAJNISH|RJ9074":"assets/Products Images/RAJNISH/RJ9074_1.webp","RAJNISH|RJ9101":"assets/Products Images/RAJNISH/RJ9101_1.webp","RAJNISH|RJ9106":"assets/Products Images/RAJNISH/RJ9106_1.webp","RAJNISH|RJ9107":"assets/Products Images/RAJNISH/RJ9107_1.webp","RAJNISH|RJ9108":"assets/Products Images/RAJNISH/RJ9108_1.webp","RAJNISH|RJ9111":"assets/Products Images/RAJNISH/RJ9111_1.webp","RAJNISH|RJ9116":"assets/Products Images/RAJNISH/RJ9116_1.webp","RAJNISH|RJ9282":"assets/Products Images/RAJNISH/RJ9282_1.webp","RAJNISH|RJ9300BR":"assets/Products Images/RAJNISH/RJ9300BR_1.webp","RAJNISH|RJ9300PL":"assets/Products Images/RAJNISH/RJ9300PL_1.webp","RAJNISH|RJ9524":"assets/Products Images/RAJNISH/RJ9524_1.webp","RAJNISH|RJ9532":"assets/Products Images/RAJNISH/RJ9532_1.webp","RAJNISH|RJ9554":"assets/Products Images/RAJNISH/RJ9554_1.webp","RAJNISH|RJ9556":"assets/Products Images/RAJNISH/RJ9556_1.webp","RAJNISH|RJ9558":"assets/Products Images/RAJNISH/RJ9558_1.webp","RAJNISH|RJINDICA":"assets/Products Images/RAJNISH/rjindica_1.webp","RAJNISH|RJP136":"assets/Products Images/RAJNISH/RJP136_1.webp","RAJNISH|RJP26A":"assets/Products Images/RAJNISH/RJP26A_1.webp","RAJNISH|RJP92":"assets/Products Images/RAJNISH/RJP92_1.webp","RAJNISH|RJSUMO":"assets/Products Images/RAJNISH/RJSUMO_1.webp","RIVIT|RI1010":"assets/Products Images/RIVIT/RI1010_1.webp","RIVIT|RI1012":"assets/Products Images/RIVIT/RI1012_1.webp","RIVIT|RI12":"assets/Products Images/RIVIT/RI12_1.webp","RIVIT|RI78":"assets/Products Images/RIVIT/RI7_8.webp","RIVIT|RIB20":"assets/Products Images/RIVIT/RIB20_1.webp","RIVIT|RIB47":"assets/Products Images/RIVIT/RIB47_1.webp","RIVIT|RICL":"assets/Products Images/RIVIT/ricl_1.webp","RIVIT|RIKBX":"assets/Products Images/RIVIT/RIKBX_1.webp","RIVIT|RITF":"assets/Products Images/RIVIT/RITF_1.webp","SHANCO|764FANTOMDLX":"assets/Products Images/SHANCO/764%20FANTOM%20DLX_1.webp","SHANCO|764FANTOMECONOMY":"assets/Products Images/SHANCO/764%20FANTOM%20ECONOMY_1.webp","SHANCO|SSTL":"assets/Products Images/SHANCO/S-STL_1.webp","SHANCO|S11CBT":"assets/Products Images/SHANCO/S11CBT_1.webp","SHANCO|S12BT":"assets/Products Images/SHANCO/S12BT_1.webp","SHANCO|S701":"assets/Products Images/SHANCO/S701_1.webp","SHANCO|S701A":"assets/Products Images/SHANCO/S701A_1.webp","SHANCO|S701B":"assets/Products Images/SHANCO/S701B_1.webp","SHANCO|S701C":"assets/Products Images/SHANCO/S701C_1.webp","SHANCO|S701D":"assets/Products Images/SHANCO/S701D_1.webp","SHANCO|S701E":"assets/Products Images/SHANCO/S701E_1.webp","SHANCO|S701F":"assets/Products Images/SHANCO/S701F_1.webp","SHANCO|S701G":"assets/Products Images/SHANCO/S701G_1.webp","SHANCO|S701H":"assets/Products Images/SHANCO/S701H_1.webp","SHANCO|S701I":"assets/Products Images/SHANCO/S701I_1.webp","SHANCO|S701J":"assets/Products Images/SHANCO/S701J_1.webp","SHANCO|S701K":"assets/Products Images/SHANCO/S701K_1.webp","SHANCO|S701L":"assets/Products Images/SHANCO/S701L_1.webp","SHANCO|S701M":"assets/Products Images/SHANCO/S701M_1.webp","SHANCO|S701N":"assets/Products Images/SHANCO/S701N_1.webp","SHANCO|S701O":"assets/Products Images/SHANCO/S701O_1.webp","SHANCO|S702":"assets/Products Images/SHANCO/S702_1.webp","SHANCO|S702A":"assets/Products Images/SHANCO/S702A_1.webp","SHANCO|S702B":"assets/Products Images/SHANCO/S702B_1.webp","SHANCO|S702C":"assets/Products Images/SHANCO/S702C_1.webp","SHANCO|S764DLX":"assets/Products Images/SHANCO/S764DLX_1.webp","SHANCO|S765STPHD":"assets/Products Images/SHANCO/S765STPHD_1.webp","SHANCO|S780C":"assets/Products Images/SHANCO/S780C_1.webp","SHANCO|S780G":"assets/Products Images/SHANCO/S780G_1.webp","SHANCO|SBBT":"assets/Products Images/SHANCO/SBBT_1.webp","SHANCO|SEC471C":"assets/Products Images/SHANCO/SEC471C_1.webp","SHANCO|SEC681D":"assets/Products Images/SHANCO/SEC681D_1.webp","SHANCO|SEC681F":"assets/Products Images/SHANCO/SEC681F_1.webp","SHANCO|SEC681G":"assets/Products Images/SHANCO/SEC681G_1.webp","SHANCO|SEC681H":"assets/Products Images/SHANCO/SEC681H_1.webp","SHANCO|SEC981E":"assets/Products Images/SHANCO/SEC981E_1.webp","SHANCO|SGOLD10":"assets/Products Images/SHANCO/SGOLD10_1.webp","SHANCO|SGOLD16":"assets/Products Images/SHANCO/SGOLD16_1.webp","SHANCO|SGOLD25":"assets/Products Images/SHANCO/SGOLD25_1.webp","SHANCO|SGOLD35":"assets/Products Images/SHANCO/SGOLD35_1.webp","SHANCO|SGOLD50":"assets/Products Images/SHANCO/SGOLD50_1.webp","SHANCO|SGOLD70":"assets/Products Images/SHANCO/SGOLD70_1.webp","SHANCO|SN111DX":"assets/Products Images/SHANCO/SN111DX_1.webp","SHANCO|SN112DX":"assets/Products Images/SHANCO/SN112DX_1.webp","SHANCO|SN11CBT":"assets/Products Images/SHANCO/SN11CBT_1.webp","SHANCO|SN12BT":"assets/Products Images/SHANCO/SN12BT_1.webp","SHANCO|SN305":"assets/Products Images/SHANCO/SN305_1.webp","SHANCO|SN306":"assets/Products Images/SHANCO/SN306_1.webp","SHANCO|SN307":"assets/Products Images/SHANCO/SN307_1.webp","SHANCO|SN471":"assets/Products Images/SHANCO/SN471_1.webp","SHANCO|SN471A":"assets/Products Images/SHANCO/SN471A_1.webp","SHANCO|SN471B":"assets/Products Images/SHANCO/SN471B_1.webp","SHANCO|SN471BL":"assets/Products Images/SHANCO/SN471BL_1.webp","SHANCO|SN485W":"assets/Products Images/SHANCO/SN485W_1.webp","SHANCO|SN664":"assets/Products Images/SHANCO/SN664_1.webp","SHANCO|SN665":"assets/Products Images/SHANCO/SN665_1.webp","SHANCO|SN666":"assets/Products Images/SHANCO/SN666_1.webp","SHANCO|SN667":"assets/Products Images/SHANCO/SN667_1.webp","SHANCO|SN668":"assets/Products Images/SHANCO/SN668_1.webp","SHANCO|SN669":"assets/Products Images/SHANCO/SN669_1.webp","SHANCO|SN670":"assets/Products Images/SHANCO/SN670_1.webp","SHANCO|SN670A":"assets/Products Images/SHANCO/SN670A_1.webp","SHANCO|SN670B":"assets/Products Images/SHANCO/SN670B_1.webp","SHANCO|SN670C":"assets/Products Images/SHANCO/SN670C_1.webp","SHANCO|SN671B":"assets/Products Images/SHANCO/SN671B_1.webp","SHANCO|SN671C":"assets/Products Images/SHANCO/SN671C_1.webp","SHANCO|SN671D":"assets/Products Images/SHANCO/SN671D_1.webp","SHANCO|SN676F":"assets/Products Images/SHANCO/SN676F_1.webp","SHANCO|SN676G":"assets/Products Images/SHANCO/SN676G_1.webp","SHANCO|SN676H":"assets/Products Images/SHANCO/SN676H_1.webp","SHANCO|SN677":"assets/Products Images/SHANCO/SN677_1.webp","SHANCO|SN678":"assets/Products Images/SHANCO/SN678_1.webp","SHANCO|SN679":"assets/Products Images/SHANCO/SN679_1.webp","SHANCO|SN680":"assets/Products Images/SHANCO/SN680_1.webp","SHANCO|SN681":"assets/Products Images/SHANCO/SN681_1.webp","SHANCO|SN681A":"assets/Products Images/SHANCO/SN681A_1.webp","SHANCO|SN682A":"assets/Products Images/SHANCO/SN682A_1.webp","SHANCO|SN687D":"assets/Products Images/SHANCO/SN687D_1.webp","SHANCO|SN687E":"assets/Products Images/SHANCO/SN687E_1.webp","SHANCO|SN687F":"assets/Products Images/SHANCO/SN687F_1.webp","SHANCO|SN687G":"assets/Products Images/SHANCO/SN687G_1.webp","SHANCO|SN687H":"assets/Products Images/SHANCO/SN687H_1.webp","SHANCO|SN701":"assets/Products Images/SHANCO/SN701_1.webp","SHANCO|SN703":"assets/Products Images/SHANCO/SN703_1.webp","SHANCO|SN703A":"assets/Products Images/SHANCO/SN703A_1.webp","SHANCO|SN703B":"assets/Products Images/SHANCO/SN703B_1.webp","SHANCO|SN703C":"assets/Products Images/SHANCO/SN703C_1.webp","SHANCO|SN705":"assets/Products Images/SHANCO/SN705_1.webp","SHANCO|SN705A":"assets/Products Images/SHANCO/SN705A_1.webp","SHANCO|SN705B":"assets/Products Images/SHANCO/SN705B_1.webp","SHANCO|SN705C":"assets/Products Images/SHANCO/SN705C_1.webp","SHANCO|SN705M":"assets/Products Images/SHANCO/SN705M_1.webp","SHANCO|SN705N":"assets/Products Images/SHANCO/SN705N_1.webp","SHANCO|SN705O":"assets/Products Images/SHANCO/SN705O_1.webp","SHANCO|SN713I":"assets/Products Images/SHANCO/SN713I_1.webp","SHANCO|SN713J":"assets/Products Images/SHANCO/SN713J_1.webp","SHANCO|SN713K":"assets/Products Images/SHANCO/SN713K_1.webp","SHANCO|SN725":"assets/Products Images/SHANCO/SN725_1.webp","SHANCO|SN726":"assets/Products Images/SHANCO/SN726_1.webp","SHANCO|SN727":"assets/Products Images/SHANCO/SN727_1.webp","SHANCO|SN729":"assets/Products Images/SHANCO/SN729_1.webp","SHANCO|SN729A":"assets/Products Images/SHANCO/SN729A_1.webp","SHANCO|SN730":"assets/Products Images/SHANCO/SN730_1.webp","SHANCO|SN731":"assets/Products Images/SHANCO/SN731_1.webp","SHANCO|SN745":"assets/Products Images/SHANCO/SN745_1.webp","SHANCO|SN745BP":"assets/Products Images/SHANCO/SN745BP_1.webp","SHANCO|SN746":"assets/Products Images/SHANCO/SN746_1.webp","SHANCO|SN747A":"assets/Products Images/SHANCO/SN747A_1.webp","SHANCO|SN764FANTOMDLX":"assets/Products Images/SHANCO/SN764%20FANTOM%20DLX_1.webp","SHANCO|SN776":"assets/Products Images/SHANCO/SN776_1.webp","SHANCO|SN777":"assets/Products Images/SHANCO/SN777_1.webp","SHANCO|SN779":"assets/Products Images/SHANCO/SN779_1.webp","SHANCO|SN780F":"assets/Products Images/SHANCO/SN780F_1.webp","SHANCO|SN782":"assets/Products Images/SHANCO/SN782_1.webp","SHANCO|SN784A":"assets/Products Images/SHANCO/SN784A_1.webp","SHANCO|SN791":"assets/Products Images/SHANCO/SN791_1.webp","SHANCO|SN793":"assets/Products Images/SHANCO/SN793_1.webp","SHANCO|SN794":"assets/Products Images/SHANCO/SN794_1.webp","SHANCO|SN796":"assets/Products Images/SHANCO/SN796_1.webp","SHANCO|SN796DX":"assets/Products Images/SHANCO/SN796DX_1.webp","SHANCO|SN798":"assets/Products Images/SHANCO/SN798_1.webp","SHANCO|SN798O":"assets/Products Images/SHANCO/SN798O_1.webp","SHANCO|SN801A":"assets/Products Images/SHANCO/SN801A_1.webp","SHANCO|SN805":"assets/Products Images/SHANCO/SN805_1.webp","SHANCO|SN806":"assets/Products Images/SHANCO/SN806_1.webp","SHANCO|SN807":"assets/Products Images/SHANCO/SN807_1.webp","SHANCO|SN808":"assets/Products Images/SHANCO/SN808_1.webp","SHANCO|SN809":"assets/Products Images/SHANCO/SN809_1.webp","SHANCO|SN809A":"assets/Products Images/SHANCO/SN809A_1.webp","SHANCO|SN810":"assets/Products Images/SHANCO/SN810_1.webp","SHANCO|SN811":"assets/Products Images/SHANCO/SN811_1.webp","SHANCO|SN812":"assets/Products Images/SHANCO/SN812_1.webp","SHANCO|SN818":"assets/Products Images/SHANCO/SN818_1.webp","SHANCO|SN819":"assets/Products Images/SHANCO/SN819_1.webp","SHANCO|SN819A":"assets/Products Images/SHANCO/SN819A_1.webp","SHANCO|SN819B":"assets/Products Images/SHANCO/SN819B_1.webp","SHANCO|SN819D":"assets/Products Images/SHANCO/SN819D_1.webp","SHANCO|SN828A":"assets/Products Images/SHANCO/SN828A_1.webp","SHANCO|SN836":"assets/Products Images/SHANCO/SN836_1.webp","SHANCO|SN837D":"assets/Products Images/SHANCO/SN837D_1.webp","SHANCO|SN837E":"assets/Products Images/SHANCO/SN837E_1.webp","SHANCO|SN838DX":"assets/Products Images/SHANCO/SN838DX_1.webp","SHANCO|SN950SPL":"assets/Products Images/SHANCO/SN950SPL_1.webp","SHANCO|SNMRA":"assets/Products Images/SHANCO/SNMRA_1.webp","SHANCO|SNMRE":"assets/Products Images/SHANCO/SNMRE_1.webp","SHANCO|STW01":"assets/Products Images/SHANCO/STW01_1.webp","SHANCO|STW02":"assets/Products Images/SHANCO/STW02_1.webp","SHANCO|STW03":"assets/Products Images/SHANCO/STW03_1.webp","SHANCO|STW04":"assets/Products Images/SHANCO/STW04_1.webp","SHANCO|STW05":"assets/Products Images/SHANCO/STW05_1.webp","SHANCO|STW06":"assets/Products Images/SHANCO/STW06_1.webp","SHANCO|STW24":"assets/Products Images/SHANCO/STW24_1.webp","SHANCO|STW25":"assets/Products Images/SHANCO/STW25_1.webp","SHANCO|STW26":"assets/Products Images/SHANCO/STW26_1.webp","SHANCO|STW27":"assets/Products Images/SHANCO/STW27_1.webp","SHANCO|STW28":"assets/Products Images/SHANCO/STW28_1.webp","SHANCO|STW29":"assets/Products Images/SHANCO/STW29_1.webp","WIX|WA11241A":"assets/Products Images/WIX/WA11241A_1.webp","WIX|WA11243":"assets/Products Images/WIX/WA11243_1.webp","WIX|WA11253":"assets/Products Images/WIX/WA11253_1.webp","WIX|WA11364A":"assets/Products Images/WIX/WA11364A_1.webp","WIX|WA11366A":"assets/Products Images/WIX/WA11366A_1.webp","WIX|WA11368A":"assets/Products Images/WIX/WA11368A_1.webp","WIX|WA11371A":"assets/Products Images/WIX/WA11371A_1.webp","WIX|WA11372A":"assets/Products Images/WIX/WA11372A_1.webp","WIX|WA11385A":"assets/Products Images/WIX/WA11385A_1.webp","WIX|WA11388A":"assets/Products Images/WIX/WA11388A_1.webp","WIX|WA11392A":"assets/Products Images/WIX/WA11392A_1.webp","WIX|WA11546A":"assets/Products Images/WIX/WA11546A_1.webp","WIX|WA11550A":"assets/Products Images/WIX/WA11550A_1.webp","WIX|WA11552A":"assets/Products Images/WIX/WA11552A_1.webp","WIX|WA11553A":"assets/Products Images/WIX/WA11553A_1.webp","WIX|WA11661A":"assets/Products Images/WIX/WA11661A_1.webp","WIX|WA11664A":"assets/Products Images/WIX/WA11664A_1.webp","WIX|WA11665A":"assets/Products Images/WIX/WA11665A_1.webp","WIX|WA11889A":"assets/Products Images/WIX/WA11889A_1.webp","WIX|WA11893A":"assets/Products Images/WIX/WA11893A_1.webp","WIX|WA11930A":"assets/Products Images/WIX/WA11930A_1.webp","WIX|WA11944A":"assets/Products Images/WIX/WA11944A_1.webp","WIX|WA11945A":"assets/Products Images/WIX/WA11945A_1.webp","WIX|WF10647":"assets/Products Images/WIX/WF10647_1.webp","WIX|WF10648":"assets/Products Images/WIX/WF10648_1.webp","WIX|WF10649":"assets/Products Images/WIX/WF10649_1.webp","WIX|WF10650":"assets/Products Images/WIX/WF10650_1.webp","WIX|WF10651":"assets/Products Images/WIX/WF10651_1.webp","WIX|WF10652":"assets/Products Images/WIX/WF10652_1.webp","WIX|WF10662":"assets/Products Images/WIX/WF10662_1.webp","WIX|WF10663A":"assets/Products Images/WIX/WF10663A_1.webp","WIX|WF10664A":"assets/Products Images/WIX/WF10664A_1.webp","WIX|WF10665A":"assets/Products Images/WIX/WF10665A_1.webp","WIX|WF10666A":"assets/Products Images/WIX/WF10666A_1.webp","WIX|WF10667A":"assets/Products Images/WIX/WF10667A_1.webp","WIX|WF10668A":"assets/Products Images/WIX/WF10668A_1.webp","WIX|WF10669A":"assets/Products Images/WIX/WF10669A_1.webp","WIX|WF10670A":"assets/Products Images/WIX/WF10670A_1.webp","WIX|WF10671A":"assets/Products Images/WIX/WF10671A_1.webp","WIX|WF10672A":"assets/Products Images/WIX/WF10672A_1.webp","WIX|WF10679A":"assets/Products Images/WIX/WF10679A_1.webp","WIX|WF10680A":"assets/Products Images/WIX/WF10680A_1.webp","WIX|WF10681A":"assets/Products Images/WIX/WF10681A_1.webp","WIX|WF10682A":"assets/Products Images/WIX/WF10682A_1.webp","WIX|WF10683A":"assets/Products Images/WIX/WF10683A_1.webp","WIX|WF10684A":"assets/Products Images/WIX/WF10684A_1.webp","WIX|WF10685A":"assets/Products Images/WIX/WF10685A_1.webp","WIX|WF10686A":"assets/Products Images/WIX/WF10686A_1.webp","WIX|WF10687A":"assets/Products Images/WIX/WF10687A_1.webp","WIX|WF10688A":"assets/Products Images/WIX/WF10688A_1.webp","WIX|WF10690A":"assets/Products Images/WIX/WF10690A_1.webp","WIX|WF10745A":"assets/Products Images/WIX/WF10745A_1.webp","WIX|WF10746A":"assets/Products Images/WIX/WF10746A_1.webp","WIX|WF10747A":"assets/Products Images/WIX/WF10747A_1.webp","WIX|WF10748A":"assets/Products Images/WIX/WF10748A_1.webp","WIX|WF10749A":"assets/Products Images/WIX/WF10749A_1.webp","WIX|WF10750A":"assets/Products Images/WIX/WF10750A_1.webp","WIX|WF10752A":"assets/Products Images/WIX/WF10752A_1.webp","WIX|WF10767A":"assets/Products Images/WIX/WF10767A_1.webp","WIX|WF10809A":"assets/Products Images/WIX/WF10809A_1.webp","WIX|WF10810A":"assets/Products Images/WIX/WF10810A_1.webp","WIX|WF10811A":"assets/Products Images/WIX/WF10811A_1.webp","WIX|WF10812A":"assets/Products Images/WIX/WF10812A_1.webp","WIX|WF10820A":"assets/Products Images/WIX/WF10820A_1.webp","WIX|WF10821A":"assets/Products Images/WIX/WF10821A_1.webp","WIX|WF10822A":"assets/Products Images/WIX/WF10822A_1.webp","WIX|WF10823A":"assets/Products Images/WIX/WF10823A_1.webp","WIX|WF10824A":"assets/Products Images/WIX/WF10824A_1.webp","WIX|WL10599":"assets/Products Images/WIX/WL10599_1.webp","WIX|WL10601":"assets/Products Images/WIX/WL10601_1.webp","WIX|WL10602":"assets/Products Images/WIX/WL10602_1.webp","WIX|WL10603":"assets/Products Images/WIX/WL10603_1.webp","WIX|WL10604":"assets/Products Images/WIX/WL10604_1.webp","WIX|WL10665A":"assets/Products Images/WIX/WL10665A_1.webp","WIX|WL10666A":"assets/Products Images/WIX/WL10666A_1.webp","WIX|WL10667A":"assets/Products Images/WIX/WL10667A_1.webp","WIX|WL10668A":"assets/Products Images/WIX/WL10668A_1.webp","WIX|WL10669A":"assets/Products Images/WIX/WL10669A_1.webp","WIX|WL10670A":"assets/Products Images/WIX/WL10670A_1.webp","WIX|WL10671A":"assets/Products Images/WIX/WL10671A_1.webp","WIX|WL10672A":"assets/Products Images/WIX/WL10672A_1.webp","WIX|WL10674A":"assets/Products Images/WIX/WL10674A_1.webp","WIX|WL10675A":"assets/Products Images/WIX/WL10675A_1.webp","WIX|WL10676A":"assets/Products Images/WIX/WL10676A_1.webp","WIX|WL10677A":"assets/Products Images/WIX/WL10677A_1.webp","WIX|WL10679A":"assets/Products Images/WIX/WL10679A_1.webp","WIX|WL10681A":"assets/Products Images/WIX/WL10681A_1.webp","WIX|WL10682A":"assets/Products Images/WIX/WL10682A_1.webp","WIX|WL10742A":"assets/Products Images/WIX/WL10742A_1.webp","WIX|WL10743A":"assets/Products Images/WIX/WL10743A_1.webp","WIX|WL10744A":"assets/Products Images/WIX/WL10744A_1.webp","WIX|WL10745A":"assets/Products Images/WIX/WL10745A_1.webp","WIX|WL10746A":"assets/Products Images/WIX/WL10746A_1.webp","WIX|WL10772A":"assets/Products Images/WIX/WL10772A_1.webp","WIX|WL10886A":"assets/Products Images/WIX/WL10886A_1.webp","WIX|WL10887A":"assets/Products Images/WIX/WL10887A_1.webp","WIX|WL10888A":"assets/Products Images/WIX/WL10888A_1.webp","WIX|WL10890A":"assets/Products Images/WIX/WL10890A_1.webp","WIX|WL10972A":"assets/Products Images/WIX/WL10972A_1.webp","WIX|WL7566":"assets/Products Images/WIX/WL7566_1.webp","WIX|WS10025A":"assets/Products Images/WIX/WS10025A_1.webp","WIX|WS10026A":"assets/Products Images/WIX/WS10026A_1.webp","WIX|WS10027A":"assets/Products Images/WIX/WS10027A_1.webp","WIX|WS10028A":"assets/Products Images/WIX/WS10028A_1.webp","WIX|WS10029A":"assets/Products Images/WIX/WS10029A_1.webp","WIX|WS10030A":"assets/Products Images/WIX/WS10030A_1.webp","WIX|WS10031A":"assets/Products Images/WIX/WS10031A_1.webp","WIX|WS10032A":"assets/Products Images/WIX/WS10032A_1.webp","WIX|WS10034A":"assets/Products Images/WIX/WS10034A_1.webp","WIX|WS10036A":"assets/Products Images/WIX/WS10036A_1.webp","WIX|WS10038A":"assets/Products Images/WIX/WS10038A_1.webp","WIX|WS10039A":"assets/Products Images/WIX/WS10039A_1.webp","WIX|WS10041A":"assets/Products Images/WIX/WS10041A_1.webp","WIX|WS10042A":"assets/Products Images/WIX/WS10042A_1.webp","WIX|WS10043A":"assets/Products Images/WIX/WS10043A_1.webp","WIX|WS10044A":"assets/Products Images/WIX/WS10044A_1.webp","WIX|WS10045A":"assets/Products Images/WIX/WS10045A_1.webp","WIX|WS10047A":"assets/Products Images/WIX/WS10047A_1.webp","WIX|WS10048A":"assets/Products Images/WIX/WS10048A_1.webp","WIX|WS10061A":"assets/Products Images/WIX/WS10061A_1.webp","WIX|WS10062A":"assets/Products Images/WIX/WS10062A_1.webp","WIX|WS10063A":"assets/Products Images/WIX/WS10063A_1.webp","WIX|WS10080A":"assets/Products Images/WIX/WS10080A_1.webp","WIX|WS10082":"assets/Products Images/WIX/WS10082_1.webp"});
  const V116_IMAGE_CACHE=new Map();
  const V121_PACK_CACHE=new Map();
  const V121_PACK_CACHE_LIMIT=2;
  const V121_PDF_CACHE=new Map();
  const V124_BUILD_PROMISE_CACHE=new Map();
  let V124_WARM_TIMER=0;
  const V116_ORIGINAL_RENDER=window.renderCatalogCard;
  const V116_ORIGINAL_OPEN=window.openSelectedCatalog;

  function v116Clean(v){
    try{return typeof clean==='function'?clean(v):String(v==null?'':v).trim()}catch(_e){return String(v==null?'':v).trim()}
  }
  function v116Key(v){return v116Clean(v).toUpperCase().replace(/[^A-Z0-9]/g,'')}
  function v116SelectedGroup(){
    try{
      if(typeof v103MultiValues==='function'){
        const selected=v103MultiValues('groupFilter');
        if(Array.isArray(selected)&&selected.length===1)return v116Clean(selected[0]);
        if(Array.isArray(selected)&&selected.length>1)return '';
      }
    }catch(_e){}
    return v116Clean(document.getElementById('groupFilter')?.value||'');
  }
  function v116GroupRows(group){
    const wanted=v116Key(group);
    const rows=(Array.isArray(window.allData)?window.allData:(typeof allData!=='undefined'&&Array.isArray(allData)?allData:[]));
    return rows.filter(row=>{
      try{return v116Key(getField(row,'GROUP'))===wanted}catch(_e){return false}
    }).sort((a,b)=>{
      const ac=v116Clean(getField(a,'CODE','PART NUMBER','PART NO'));
      const bc=v116Clean(getField(b,'CODE','PART NUMBER','PART NO'));
      try{return natural(ac,bc)}catch(_e){return ac.localeCompare(bc,undefined,{numeric:true,sensitivity:'base'})}
    });
  }
  function v117ViewByFields(rows){
    try{
      const fields=typeof viewByFields==='function'?viewByFields(rows):[];
      return Array.isArray(fields)?fields.filter(Boolean):[];
    }catch(_e){return []}
  }
  function v117ViewByLabel(field){
    try{return typeof viewByLabel==='function'?viewByLabel(field):v116Clean(field)}catch(_e){return v116Clean(field)}
  }
  function v117GroupValue(row,field){
    try{return typeof groupValue==='function'?groupValue(row,field):v116Clean(getField(row,field))||'OTHER'}catch(_e){return v116Clean(getField(row,field))||'OTHER'}
  }
  function v117SortRowsByViewBy(rows){
    const fields=v117ViewByFields(rows);
    try{if(typeof sortRowsByFields==='function')return {rows:sortRowsByFields(rows,fields),fields}}catch(_e){}
    return {rows:[...rows],fields};
  }
  function v117SectionPath(row,fields){
    return fields.map(field=>({field,label:v117ViewByLabel(field),value:v117GroupValue(row,field)}));
  }
  function v117SectionKey(path){
    return path.map(x=>v116Key(x.label)+'='+v116Key(x.value)).join('|');
  }
  function v117BuildPagePlan(items,fields){
    // V122: follow Price Book hierarchy, but never waste a complete A4 page.
    // Any VIEW BY path change (Category / Segment / Vehicle / Model etc.) starts on a NEW 3-card row.
    // The next section can still continue on the same A4 page when another row is available.
    const pages=[];let slots=[],lastKey=null;
    const flush=()=>{
      if(!slots.some(Boolean)){slots=[];return}
      const first=slots.find(Boolean);
      pages.push({items:slots,path:first&&fields.length?v117SectionPath(first.row,fields):[]});
      slots=[];
    };
    for(const item of items){
      const path=fields.length?v117SectionPath(item.row,fields):[];
      const key=fields.length?v117SectionKey(path):'';
      if(fields.length&&lastKey!==null&&key!==lastKey&&slots.length%3){
        while(slots.length%3)slots.push(null);
        if(slots.length>=V116_PER_PAGE)flush();
      }
      if(slots.length>=V116_PER_PAGE)flush();
      slots.push(item);
      lastKey=key;
      if(slots.length>=V116_PER_PAGE)flush();
    }
    flush();
    return pages;
  }

  function v120CleanProductName(value){
    // Some Excel product names contain literal backslash escape marks such as \\(Black\\).
    // Catalogue should show the actual name only: (Black), without the escape slashes.
    return v116Clean(value).replace(/\\+/g,'').replace(/\s+/g,' ').trim();
  }
  function v120WrapAll(value,width,fontSize){
    const text=v116PdfText(value).replace(/\s+/g,' ').trim();
    if(!text)return [];
    const maxChars=Math.max(4,Math.floor(width/Math.max(1,fontSize*.52)));
    const words=text.split(' '),lines=[];let line='';
    for(const word of words){
      if(!word)continue;
      const next=(line+' '+word).trim();
      if(next.length<=maxChars){line=next;continue}
      if(line){lines.push(line);line=''}
      if(word.length<=maxChars){line=word;continue}
      let rest=word;
      while(rest.length>maxChars){lines.push(rest.slice(0,maxChars));rest=rest.slice(maxChars)}
      line=rest;
    }
    if(line)lines.push(line);
    return lines;
  }
  function v120NameLayout(value,width){
    const sizes=[5.8,5.4,5.0,4.6,4.2,3.8,3.4,3.1];
    let best={size:3.1,lines:v120WrapAll(value,width,3.1)};
    for(const size of sizes){
      const lines=v120WrapAll(value,width,size);
      best={size,lines};
      if(lines.length<=4)break;
    }
    const gap=best.size*1.18;
    return {...best,gap,height:Math.max(12,best.lines.length*gap)};
  }
  function v120RowRuns(rowItems,fields){
    const runs=[];let current=null;
    rowItems.forEach((item,index)=>{
      if(!item){current=null;return}
      const path=fields.length?v117SectionPath(item.row,fields):[];
      const key=fields.length?v117SectionKey(path):'';
      if(!current||current.key!==key){current={key,path,start:index,end:index};runs.push(current)}
      else current.end=index;
    });
    return runs;
  }

  function v116SafePart(v){
    try{return safePathPart(v)}catch(_e){return v116Clean(v).replace(/[<>:"/\\|?*]/g,'_').trim()}
  }
  const V123_DIRECT_IMAGE_ALIASES=Object.freeze({
    BULLDOG:Object.freeze({
      BDF30:'assets/Products Images/BULLDOG/B%20SEAL%20FAST_1.webp',BDF100:'assets/Products Images/BULLDOG/B%20SEAL%20FAST_1.webp',
      BDR30:'assets/Products Images/BULLDOG/B%20SEAL%20REGULAR_1.webp',BDR50:'assets/Products Images/BULLDOG/B%20SEAL%20REGULAR_1.webp',BDR100:'assets/Products Images/BULLDOG/B%20SEAL%20REGULAR_1.webp',
      BDFRBC:'assets/Products Images/BULLDOG/WIRE%20TAP-DONE_1.webp',BDFRGN:'assets/Products Images/BULLDOG/WIRE%20TAP-DONE_1.webp',BDFRRD:'assets/Products Images/BULLDOG/WIRE%20TAP-DONE_1.webp',
      BDTAPBC:'assets/Products Images/BULLDOG/WIRE%20TAP-DONE_1.webp',BDTAPGN:'assets/Products Images/BULLDOG/WIRE%20TAP-DONE_1.webp',BDTAPRD:'assets/Products Images/BULLDOG/WIRE%20TAP-DONE_1.webp',
      BDBLACK15:'assets/Products Images/BULLDOG/bdblack85_1.webp',BDBLACK25:'assets/Products Images/BULLDOG/bdblack85_1.webp',
      BD88825:'assets/Products Images/BULLDOG/bdgray85_1.webp',BD88885:'assets/Products Images/BULLDOG/bdgray85_1.webp',
      BD100125:'assets/Products Images/BULLDOG/BD10065_1.webp',BD2B:'assets/Products Images/BULLDOG/BD2B%20-%20Copy_1.webp',BDTTAP:'assets/Products Images/BULLDOG/Teflon%20Tap_1.webp',
      BDTL4:'assets/Products Images/BULLDOG/Bulldog%20Thread%20Locker%204%20Ml_1.webp',BDTL8:'assets/Products Images/BULLDOG/thread%20locker%208ml_1.webp',BDTL50:'assets/Products Images/BULLDOG/thread%20locker%2050ml_1.webp',
      BDUPVC50:'assets/Products Images/BULLDOG/Bulldog%20Upvc%20Solvent%20Cement%20100Ml_1.webp',BDUPVC100:'assets/Products Images/BULLDOG/Bulldog%20Upvc%20Solvent%20Cement%20100Ml_1.webp',
      BDUPVC250:'assets/Products Images/BULLDOG/Bulldog%20Upvc%20Solvent%20Cement%20100Ml_1.webp',BDUPVC500:'assets/Products Images/BULLDOG/Bulldog%20Upvc%20Solvent%20Cement%20100Ml_1.webp'
    })
  });
  function v119ManifestImagePath(row){
    const group=v116Clean(getField(row,'GROUP'));
    const code=v116Clean(getField(row,'CODE','PART NUMBER','PART NO'));
    const groupKey=v116Key(group),codeKey=v116Key(code);
    return V123_DIRECT_IMAGE_ALIASES[groupKey]?.[codeKey]||V119_IMAGE_MANIFEST[groupKey+'|'+codeKey]||'';
  }
  function v121PackInfo(group){
    const map=window.RAJ_CATALOG_PACK_INDEX_V123||window.RAJ_CATALOG_PACK_INDEX_V121||{};
    return map[v116Key(group)]||null;
  }
  function v121TouchPackCache(key,value){
    if(V121_PACK_CACHE.has(key))V121_PACK_CACHE.delete(key);
    V121_PACK_CACHE.set(key,value);
    while(V121_PACK_CACHE.size>V121_PACK_CACHE_LIMIT){
      const oldest=V121_PACK_CACHE.keys().next().value;
      if(oldest===key)break;
      V121_PACK_CACHE.delete(oldest);
    }
  }
  async function v121LoadGroupPack(group){
    const key=v116Key(group),info=v121PackInfo(group);
    if(!key||!info||!info.file)return null;
    const cached=V121_PACK_CACHE.get(key);
    if(cached){v121TouchPackCache(key,cached);return cached}
    const promise=fetch(info.file,{cache:'force-cache'}).then(async response=>{
      if(!response.ok)throw new Error('Catalogue image pack unavailable: '+response.status);
      const buffer=await response.arrayBuffer();
      return {key,info,buffer};
    }).catch(error=>{console.warn('V121 catalogue pack fallback',group,error);return null});
    v121TouchPackCache(key,promise);
    const result=await promise;
    if(result)v121TouchPackCache(key,Promise.resolve(result));
    return result;
  }
  const V122_PACK_ALIASES=Object.freeze({
    BULLDOG:Object.freeze({
      BDF30:'BSEALFAST',BDF100:'BSEALFAST',
      BDR30:'BSEALREGULAR',BDR50:'BSEALREGULAR',BDR100:'BSEALREGULAR',
      BDFRBC:'WIRETAPDONE',BDFRGN:'WIRETAPDONE',BDFRRD:'WIRETAPDONE',
      BDTAPBC:'WIRETAPDONE',BDTAPGN:'WIRETAPDONE',BDTAPRD:'WIRETAPDONE',
      BDBLACK15:'BDBLACK85',BDBLACK25:'BDBLACK85',
      BD88825:'BDGRAY85',BD88885:'BDGRAY85',
      BD100125:'BD10065',BD2B:'BD2BCOPY',BDTTAP:'TEFLONTAP',
      BDTL4:'BULLDOGTHREADLOCKER4ML',BDTL8:'THREADLOCKER8ML',BDTL50:'THREADLOCKER50ML',
      BDUPVC50:'BULLDOGUPVCSOLVENTCEMENT100ML',BDUPVC100:'BULLDOGUPVCSOLVENTCEMENT100ML',
      BDUPVC250:'BULLDOGUPVCSOLVENTCEMENT100ML',BDUPVC500:'BULLDOGUPVCSOLVENTCEMENT100ML'
    })
  });
  function v121PackedImage(row,pack){
    if(!pack)return null;
    const code=v116Key(getField(row,'CODE','PART NUMBER','PART NO'));
    const groupKey=v116Key(getField(row,'GROUP'));
    const alias=V122_PACK_ALIASES[groupKey]?.[code]||'';
    const meta=pack.info?.images?.[code]||pack.info?.images?.[alias];
    if(!meta||meta.length<4)return null;
    const offset=Number(meta[0])||0,length=Number(meta[1])||0,width=Number(meta[2])||0,height=Number(meta[3])||0;
    if(length<=0||offset<0||offset+length>pack.buffer.byteLength)return null;
    return {bytes:new Uint8Array(pack.buffer,offset,length),width,height,packed:true};
  }
  function v121PrefetchGroupPack(group){
    const cleanGroup=v116Clean(group);if(!cleanGroup)return;
    // Fire-and-forget: download the compact JPEG pack while the customer views the group.
    v121LoadGroupPack(cleanGroup).catch(()=>{});
  }
  window.RAJ_V121_PREFETCH_CATALOGUE=v121PrefetchGroupPack;

  function v116LoadOneImage(path,timeoutMs){
    return new Promise(resolve=>{
      const img=new Image();let done=false;
      const finish=value=>{if(done)return;done=true;clearTimeout(timer);img.onload=null;img.onerror=null;resolve(value)};
      const timer=setTimeout(()=>finish(null),timeoutMs||3500);
      img.decoding='async';
      img.onload=()=>finish(img);
      img.onerror=()=>finish(null);
      img.src=path;
    });
  }
  function v116ImageToJpeg(img){
    try{
      const naturalW=img.naturalWidth||img.width,naturalH=img.naturalHeight||img.height;
      if(!naturalW||!naturalH)return null;
      const maxW=900,maxH=620,scale=Math.min(1,maxW/naturalW,maxH/naturalH);
      const w=Math.max(1,Math.round(naturalW*scale)),h=Math.max(1,Math.round(naturalH*scale));
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return null;
      ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
      const dataUrl=canvas.toDataURL('image/jpeg',0.82);
      return {dataUrl,width:w,height:h};
    }catch(error){console.warn('V116 catalogue image conversion skipped',error);return null}
  }
  async function v116ResolveProductImage(row){
    const group=v116Clean(getField(row,'GROUP'));
    const code=v116Clean(getField(row,'CODE','PART NUMBER','PART NO'));
    const cacheKey=v116Key(group)+'|'+v116Key(code);
    if(V116_IMAGE_CACHE.has(cacheKey))return V116_IMAGE_CACHE.get(cacheKey);
    const path=v119ManifestImagePath(row);
    if(!path){V116_IMAGE_CACHE.set(cacheKey,null);return null}
    const img=await v116LoadOneImage(path,3200);
    if(!img){V116_IMAGE_CACHE.set(cacheKey,null);return null}
    const jpeg=v116ImageToJpeg(img);
    if(jpeg){const result={...jpeg,path};V116_IMAGE_CACHE.set(cacheKey,result);return result}
    V116_IMAGE_CACHE.set(cacheKey,null);return null;
  }
  async function v116CollectItems(rows,group){
    // V121 fast path: ONE compact group-pack request, zero per-product image scanning,
    // zero image decode and zero canvas JPEG conversion at download time.
    const pack=await v121LoadGroupPack(group);
    if(pack)return rows.map(row=>({row,image:v121PackedImage(row,pack)}));

    // Safety fallback only if the pack file itself is unavailable. Existing manifest behavior
    // is preserved so the catalogue still works instead of failing completely.
    const output=new Array(rows.length);let next=0;
    async function worker(){
      while(true){
        const index=next++;if(index>=rows.length)return;
        const row=rows[index];
        output[index]={row,image:await v116ResolveProductImage(row)};
      }
    }
    await Promise.all(Array.from({length:Math.min(V116_IMAGE_CONCURRENCY,Math.max(1,rows.length))},worker));
    return output.filter(Boolean);
  }

  function v116DetailColumns(rows){
    let visible=[];
    try{if(typeof visibleColumnsForRows==='function')visible=visibleColumnsForRows(rows)||[]}catch(_e){}
    if(!visible.length){try{visible=dataColumns()||[]}catch(_e){}}
    const priorities=['SEGMENT','VEHICLE','MODEL','UNIT','GST','HSN','HSN CODE','STD PKG','PKG SIZE','CLUTCH DIA','NO. OF TEETH','NUMBER OF TEETH','DIA','SIZE','SIZE MM','THICKNESS MM','WIDTH MM','BOX QTY','PACK'];
    const all=[];
    const add=col=>{if(col&&!all.some(x=>keyOf(x)===keyOf(col)))all.push(col)};
    priorities.forEach(k=>{
      const found=visible.find(c=>keyOf(c)===keyOf(k));if(found)add(found);
      else{try{const foundAll=(dataColumns()||[]).find(c=>keyOf(c)===keyOf(k));if(foundAll)add(foundAll)}catch(_e){}}
    });
    visible.forEach(add);
    const blocked=/^(GROUP|SUB GROUP|SUB-GROUP|SUBGROUP|CODE|PART NUMBER|PART NO|PRODUCT NAME|DESCRIPTION|IMAGE|IMAGE LINK|CATALOG|CATALOG LINK|CATALOG URL|INDEX|VISIBLE|VISIBILITY|RATE|MRP)$/i;
    return all.filter(col=>!blocked.test(keyOf(col))).filter(col=>rows.some(row=>v116Clean(displayFieldValue(row,col))));
  }
  function v116Hierarchy(row){
    const parts=[];
    const defs=[['Sub Group',['SUB GROUP','SUB-GROUP','SUBGROUP']],['Category',['CATEGORY','CATEGORIES','CATAGORIES']],['Segment',['SEGMENT']],['Vehicle',['VEHICLE']],['Model',['MODEL']]];
    defs.forEach(([label,keys])=>{
      const value=v116Clean(getField(row,...keys));if(value&&!parts.some(x=>x.value===value))parts.push({label,value});
    });
    return parts;
  }
  function v116ProductDetails(row,columns){
    const details=[],seen=new Set();
    const push=(label,value)=>{
      value=v116Clean(value);label=v116Clean(label).replace(/\s+/g,' ').trim();
      const k=v116Key(label);
      if(!value||!label||seen.has(k)||/^(RATE|MRP)$/.test(k))return;
      if(/^https?:\/\//i.test(value))return;
      seen.add(k);details.push({label,value});
    };
    push('SEGMENT',getField(row,'SEGMENT'));
    push('VEHICLE',getField(row,'VEHICLE'));
    push('MODEL',getField(row,'MODEL'));
    columns.forEach(col=>{
      const label=keyOf(col).replace(/\s+/g,' ').trim();
      if(/^(RATE|MRP)$/i.test(label))return;
      push(label,displayFieldValue(row,col));
    });
    return details.slice(0,10);
  }

  function v116BytesFromDataUrl(dataUrl){
    const raw=String(dataUrl||'').split(',').pop()||'';
    const bin=atob(raw),out=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i)&255;
    return out;
  }
  function v116PdfEscape(value){return v116PdfText(value).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
  function v116PdfText(value){
    // Do not call the app-level pdfAscii here: it already escapes PDF parentheses/backslashes.
    // v116PdfEscape performs that escaping once when text is written to the PDF stream.
    // Calling both caused visible \\ marks around names such as (Black).
    return String(value==null?'':value).replace(/[^\x20-\x7E]/g,' ');
  }
  function v116Latin1(value){
    try{return latin1Bytes(value)}catch(_e){const s=String(value);const out=new Uint8Array(s.length);for(let i=0;i<s.length;i++)out[i]=s.charCodeAt(i)&255;return out}
  }
  function v116Wrap(value,width,fontSize,maxLines){
    try{return pdfWrapText(value,width,fontSize,maxLines)}catch(_e){
      const text=v116PdfText(value).replace(/\s+/g,' ').trim(),max=Math.max(5,Math.floor(width/(fontSize*.52)));const words=text.split(' '),lines=[];let line='';
      for(const word of words){const next=(line+' '+word).trim();if(next.length>max&&line){lines.push(line);line=word}else line=next;if(lines.length>=maxLines-1)break}if(line&&lines.length<maxLines)lines.push(line);return lines;
    }
  }
  function v116FitImage(boxW,boxH,imgW,imgH){
    const scale=Math.min(boxW/imgW,boxH/imgH);return {w:imgW*scale,h:imgH*scale};
  }
  function v118FitOneLineFont(text,width,maxSize,minSize){
    const raw=v116PdfText(text);
    const approxAtOne=Math.max(1,raw.length*.53);
    return Math.max(minSize||2.65,Math.min(maxSize||4.35,width/approxAtOne));
  }
  function v116Rgb(r,g,b){return `${(r/255).toFixed(3)} ${(g/255).toFixed(3)} ${(b/255).toFixed(3)}`}
  function v116Rect(cmd,H,x,top,w,h,fill,stroke,lineWidth){
    const y=H-top-h;
    if(lineWidth)cmd.push(`${lineWidth} w`);
    if(fill&&stroke)cmd.push(`${fill} rg ${stroke} RG ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re B`);
    else if(fill)cmd.push(`${fill} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
    else if(stroke)cmd.push(`${stroke} RG ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
  }
  function v116Line(cmd,H,x1,top1,x2,top2,stroke,width){cmd.push(`${width||1} w ${stroke} RG ${x1.toFixed(2)} ${(H-top1).toFixed(2)} m ${x2.toFixed(2)} ${(H-top2).toFixed(2)} l S`)}
  function v116Text(cmd,H,text,x,top,size,font,color){
    const y=H-top-size;
    cmd.push(`BT /${font||'F1'} ${size.toFixed(2)} Tf ${color||'0 0 0'} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${v116PdfEscape(text)}) Tj ET`);
  }
  function v116TextLines(cmd,H,lines,x,top,size,font,color,gap){
    const step=gap||size*1.22;lines.forEach((line,i)=>v116Text(cmd,H,line,x,top+i*step,size,font,color));
  }

  async function v116ResolveBrandLogo(group){
    try{if(typeof pdfEmbeddedLogoB64==='function'&&pdfEmbeddedLogoB64(group))return null}catch(_e){}
    let path='';try{path=(logoCandidatesForBrand(group)||[])[0]||''}catch(_e){}
    if(!path)return null;
    const img=await v116LoadOneImage(path,1400);
    return img?v116ImageToJpeg(img):null;
  }

  function v116BuildPdf(items,group,columns,dynamicBrandLogo,viewByFieldsForGroup){
    const W=595,H=842,margin=22,headerH=72,footerH=32,gapX=7,gapY=6;
    const contentTop=headerH+10,contentBottom=H-footerH-12;
    const fields=Array.isArray(viewByFieldsForGroup)?viewByFieldsForGroup:[];
    const pages=v117BuildPagePlan(items,fields);
    const rowBandH=fields.length?(fields.length>1?20:11):0;
    const cardW=(W-margin*2-gapX*2)/3;
    const cardH=(contentBottom-contentTop-gapY*3-rowBandH*4)/4;
    const blue=v116Rgb(8,78,153),deep=v116Rgb(8,51,112),orange=v116Rgb(245,166,20),pale=v116Rgb(245,249,253),line=v116Rgb(192,210,229),muted=v116Rgb(94,113,136);
    const objects=[];const add=o=>{objects.push(o);return objects.length};
    const catalog=add(''),pagesObj=add(''),f1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'),f2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

    let rajBytes=null,rajDim=null,brandBytes=null,brandDim=null;
    try{rajBytes=b64Bytes(V77_COMPANY_LOGO_JPEG_B64);rajDim=jpegDimensions(rajBytes)}catch(_e){}
    const brandB64=(typeof pdfEmbeddedLogoB64==='function'?pdfEmbeddedLogoB64(group):'');
    try{
      if(dynamicBrandLogo?.dataUrl){brandBytes=v116BytesFromDataUrl(dynamicBrandLogo.dataUrl);brandDim=jpegDimensions(brandBytes)||{width:dynamicBrandLogo.width,height:dynamicBrandLogo.height}}
      else if(brandB64){brandBytes=b64Bytes(brandB64);brandDim=jpegDimensions(brandBytes)}
    }catch(_e){}
    const rajObj=rajBytes&&rajDim?add({bin:rajBytes,head:`<< /Type /XObject /Subtype /Image /Width ${rajDim.width} /Height ${rajDim.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${rajBytes.length} >>`}):0;
    const brandObj=brandBytes&&brandDim?add({bin:brandBytes,head:`<< /Type /XObject /Subtype /Image /Width ${brandDim.width} /Height ${brandDim.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${brandBytes.length} >>`}):0;

    const imageObjects=new Map();
    items.forEach((item,index)=>{
      if(item.image){
        const bytes=item.image.bytes||v116BytesFromDataUrl(item.image.dataUrl);
        const dim=(item.image.width&&item.image.height)?{width:item.image.width,height:item.image.height}:(jpegDimensions(bytes)||{width:1,height:1});
        const id=add({bin:bytes,head:`<< /Type /XObject /Subtype /Image /Width ${dim.width} /Height ${dim.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>`});
        imageObjects.set(item,id);item._v116Dim=dim;
      }
      item._v116PdfIndex=index;
    });

    const pageIds=pages.map(()=>add(''));
    pages.forEach((pagePlan,pageIndex)=>{
      const pageItems=pagePlan.items,cmd=[];
      // Header shell remains exactly in the approved RAJ GROUP style.
      v116Rect(cmd,H,margin,14,W-margin*2,headerH-15,pale,blue,1.2);
      v116Rect(cmd,H,margin,14,6,headerH-15,orange,null,0);
      v116Rect(cmd,H,margin+14,24,75,42,'1 1 1',line,.8);
      if(rajObj)cmd.push(`q 64 0 0 34 ${margin+19} ${H-61} cm /RajLogo Do Q`);
      v116Text(cmd,H,'RAJ GROUP CATALOGUE',margin+102,30,17,'F2',deep);
      v116Text(cmd,H,'RAJ AGENCIES  |  PROFESSIONAL PRODUCT CATALOGUE',margin+102,52,6.6,'F1',orange);
      const brandBoxX=W-margin-88;
      v116Rect(cmd,H,brandBoxX,22,78,42,'1 1 1',orange,.8);
      if(brandObj)cmd.push(`q 66 0 0 30 ${brandBoxX+6} ${H-58} cm /BrandLogo Do Q`);

      // V122 hierarchy: every new VIEW BY section starts on a fresh product row.
      // Sections may share the same A4 page, but they never share the same 3-card row.
      for(let rowIndex=0;rowIndex<4;rowIndex++){
        const rowItems=pageItems.slice(rowIndex*3,rowIndex*3+3);
        if(!rowItems.length)continue;
        const rowTop=contentTop+rowIndex*(rowBandH+cardH+gapY);
        if(fields.length){
          const runs=v120RowRuns(rowItems,fields);
          runs.forEach(run=>{
            const rx=margin,rw=W-margin*2;
            const first=run.path[0];
            v116Rect(cmd,H,rx,rowTop,rw,9.5,v116Rgb(255,243,189),v116Rgb(122,155,196),.55);
            v116Rect(cmd,H,rx,rowTop,4,9.5,orange,null,0);
            const l1=(v116PdfText(v117ViewByLabel(first.field)).toUpperCase()+' - '+v116PdfText(first.value));
            const s1=v118FitOneLineFont(l1,rw-11,6.3,3.4);
            v116Text(cmd,H,l1,rx+8,rowTop+2.2,s1,'F2',v116Rgb(90,59,0));
            if(fields.length>1){
              const rest=run.path.slice(1).map(entry=>v116PdfText(v117ViewByLabel(entry.field)).toUpperCase()+' - '+v116PdfText(entry.value)).join('  |  ');
              v116Rect(cmd,H,rx,rowTop+10,rw,9.5,v116Rgb(220,238,255),v116Rgb(122,155,196),.55);
              const s2=v118FitOneLineFont(rest,rw-9,5.9,3.1);
              v116Text(cmd,H,rest,rx+5,rowTop+12.1,s2,'F2',deep);
            }
          });
        }

        rowItems.forEach((item,col)=>{
          if(!item)return;
          const localIndex=rowIndex*3+col,x=margin+col*(cardW+gapX),top=rowTop+rowBandH;
          const data=item.row,code=v116Clean(getField(data,'CODE','PART NUMBER','PART NO'))||'—';
          const name=v120CleanProductName(getField(data,'PRODUCT NAME','DESCRIPTION'))||code;
          const details=v116ProductDetails(data,columns);
          v116Rect(cmd,H,x,top,cardW,cardH,'1 1 1',line,.85);
          v116Rect(cmd,H,x,top,cardW,3,orange,null,0);

          const codeBadgeW=Math.min(54,Math.max(42,cardW*.28)),nameX=x+11+codeBadgeW,nameW=cardW-codeBadgeW-16;
          const nameLayout=v120NameLayout(name,nameW);
          const detailRows=Math.max(1,Math.ceil(Math.min(details.length,10)/2)),detailStep=8.0;
          const detailAreaH=detailRows*detailStep+6;
          const codeNameH=Math.max(12,nameLayout.height);
          const imgTop=top+5;
          const imgH=Math.max(48,Math.min(88,cardH-5-3-codeNameH-detailAreaH-8));
          const imgX=x+5,imgW=cardW-10;
          v116Rect(cmd,H,imgX,imgTop,imgW,imgH,'1 1 1',v116Rgb(224,233,243),.50);
          if(item.image&&item._v116Dim){
            const dim=item._v116Dim,fit=v116FitImage(imgW-4,imgH-4,dim.width,dim.height);
            const drawX=imgX+(imgW-fit.w)/2,drawTop=imgTop+(imgH-fit.h)/2,drawY=H-drawTop-fit.h;
            cmd.push(`q ${fit.w.toFixed(2)} 0 0 ${fit.h.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(2)} cm /P${localIndex} Do Q`);
          }else{
            if(rajObj)cmd.push(`q 72 0 0 38 ${(imgX+(imgW-72)/2).toFixed(2)} ${(H-imgTop-imgH/2-17).toFixed(2)} cm /RajLogo Do Q`);
            v116Text(cmd,H,'COMING SOON',imgX+imgW/2-26,imgTop+imgH-16,7.2,'F2',muted);
          }
          if(rajObj){
            cmd.push('q /GS1 gs');
            cmd.push(`q 62 0 0 33 ${(imgX+(imgW-62)/2).toFixed(2)} ${(H-imgTop-imgH/2-15).toFixed(2)} cm /RajLogo Do Q`);
            cmd.push('Q');
          }

          const codeTop=imgTop+imgH+3;
          v116Rect(cmd,H,x+5,codeTop,codeBadgeW,12,blue,null,0);
          const codeFont=code.length>10?4.7:code.length>7?5.3:5.9;
          v116Text(cmd,H,code,x+8,codeTop+3,codeFont,'F2','1 1 1');
          v116TextLines(cmd,H,nameLayout.lines,nameX,codeTop,nameLayout.size,'F2',deep,nameLayout.gap);

          // Detail table begins only after the COMPLETE wrapped product name.
          const infoTop=codeTop+Math.max(12,nameLayout.height)+2;
          v116Line(cmd,H,x+5,infoTop,x+cardW-5,infoTop,line,.55);
          const detailTop=infoTop+3.5,detailGap=5,detailW=(cardW-10-detailGap)/2;
          const maxRows=Math.max(1,Math.floor((top+cardH-5-detailTop)/detailStep));
          const maxItems=Math.min(details.length,maxRows*2);
          for(let i=0;i<maxItems;i++){
            const d=details[i],dc=i%2,dr=Math.floor(i/2),dx=x+5+dc*(detailW+detailGap),dt=detailTop+dr*detailStep;
            if(dc===1)v116Line(cmd,H,dx-detailGap/2,dt-1,dx-detailGap/2,dt+6.7,v116Rgb(224,232,241),.40);
            const label=v116PdfText(d.label).toUpperCase(),value=v116PdfText(d.value),text=label+' - '+value;
            const fontSize=v118FitOneLineFont(text,detailW,4.15,2.45);
            v116Text(cmd,H,text,dx,dt,fontSize,'F1','0.12 0.17 0.23');
          }
        });
      }

      const footerTop=H-footerH+7;
      v116Line(cmd,H,margin,footerTop,W/2-34,footerTop,blue,2.2);
      v116Line(cmd,H,W/2+34,footerTop,W-margin,footerTop,orange,2.2);
      v116Rect(cmd,H,W/2-30,footerTop-7,60,17,deep,orange,.8);
      v116Text(cmd,H,'PAGE '+(pageIndex+1),W/2-17,footerTop-3,7.2,'F2','1 1 1');
      v116Text(cmd,H,'RAJ GROUP  •  '+group,margin,footerTop+10,5.3,'F1',muted);
      const right='PRODUCTS '+items.length;
      v116Text(cmd,H,right,W-margin-52,footerTop+10,5.3,'F1',muted);

      const content=v116Latin1(cmd.join('\n')),contentObj=add({bin:content,head:`<< /Length ${content.length} >>`});
      let xObjects='';if(rajObj)xObjects+=` /RajLogo ${rajObj} 0 R`;if(brandObj)xObjects+=` /BrandLogo ${brandObj} 0 R`;
      pageItems.forEach((item,localIndex)=>{if(!item)return;const id=imageObjects.get(item);if(id)xObjects+=` /P${localIndex} ${id} 0 R`});
      objects[pageIds[pageIndex]-1]=`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> /ExtGState << /GS1 << /ca 0.12 /CA 0.12 >> >> /XObject <<${xObjects} >> >> /Contents ${contentObj} 0 R >>`;
    });
    objects[catalog-1]=`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
    objects[pagesObj-1]=`<< /Type /Pages /Kids [${pageIds.map(id=>id+' 0 R').join(' ')}] /Count ${pageIds.length} >>`;
    const out=[v116Latin1('%PDF-1.4\n%V124\n')],offsets=[0];let length=out[0].length;
    for(let i=0;i<objects.length;i++){
      offsets[i+1]=length;const prefix=v116Latin1(`${i+1} 0 obj\n`);out.push(prefix);length+=prefix.length;
      const obj=objects[i];
      if(typeof obj==='string'){const b=v116Latin1(obj+'\nendobj\n');out.push(b);length+=b.length}
      else{const h=v116Latin1(obj.head+'\nstream\n');out.push(h);length+=h.length;out.push(obj.bin);length+=obj.bin.length;const e=v116Latin1('\nendstream\nendobj\n');out.push(e);length+=e.length}
    }
    const xrefPos=length;let xref=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
    for(let i=1;i<=objects.length;i++)xref+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
    xref+=`trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
    out.push(v116Latin1(xref));return new Blob(out,{type:'application/pdf'});
  }

  function v124HashRows(rows,fields,group){
    let h=2166136261>>>0;
    const add=value=>{const str=v116Clean(value);for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)>>>0}};
    add('V124');add(group);add(rows.length);fields.forEach(add);
    const info=v121PackInfo(group);if(info){add(info.file);add(info.bytes);add(info.count)}
    for(const row of rows){
      add(getField(row,'CODE','PART NUMBER','PART NO'));add(getField(row,'PRODUCT NAME','DESCRIPTION'));
      add(getField(row,'SEGMENT'));add(getField(row,'VEHICLE'));add(getField(row,'MODEL'));add(getField(row,'CATAGORIES','CATEGORIES','CATEGORY'));
      add(getField(row,'UNIT'));add(getField(row,'GST'));add(getField(row,'HSN','HSN CODE'));add(getField(row,'STD PKG','PKG SIZE'));
    }
    return h.toString(16).padStart(8,'0');
  }
  function v124CatalogueState(group){
    const rawRows=v116GroupRows(group);if(!rawRows.length)return null;
    const sorted=v117SortRowsByViewBy(rawRows),rows=sorted.rows,viewFields=sorted.fields;
    const hash=v124HashRows(rows,viewFields,group),key=v116Key(group)+'|'+rows.length+'|'+hash;
    return {group,rows,viewFields,key};
  }
  function v124CacheRequest(key){
    try{return new Request(new URL('?raj-catalog-cache-v124='+encodeURIComponent(key),location.href).href,{method:'GET'})}catch(_e){return null}
  }
  async function v124PersistentGet(key){
    if(!('caches' in window))return null;
    try{
      const req=v124CacheRequest(key);if(!req)return null;
      const cache=await caches.open('raj-catalog-pdf-v124');const hit=await cache.match(req);
      if(!hit)return null;const blob=await hit.blob();return blob&&blob.size?blob:null;
    }catch(_e){return null}
  }
  async function v124PersistentPut(key,blob){
    if(!('caches' in window)||!blob?.size)return;
    try{
      const req=v124CacheRequest(key);if(!req)return;
      const cache=await caches.open('raj-catalog-pdf-v124');
      await cache.put(req,new Response(blob,{headers:{'Content-Type':'application/pdf','X-RAJ-Catalog-Version':'124'}}));
    }catch(_e){}
  }
  async function v124PrepareCatalogue(group){
    const state=v124CatalogueState(group);if(!state)throw new Error(group+' group me product data nahi mila.');
    const mem=V121_PDF_CACHE.get(state.key);if(mem)return {...state,blob:mem,pagePlan:v117BuildPagePlan(state.rows.map(row=>({row,image:null})),state.viewFields)};
    if(V124_BUILD_PROMISE_CACHE.has(state.key))return V124_BUILD_PROMISE_CACHE.get(state.key);
    const promise=(async()=>{
      const disk=await v124PersistentGet(state.key);
      if(disk){V121_PDF_CACHE.clear();V121_PDF_CACHE.set(state.key,disk);return {...state,blob:disk,pagePlan:v117BuildPagePlan(state.rows.map(row=>({row,image:null})),state.viewFields)}};
      const result=await Promise.all([v116CollectItems(state.rows,group),v116ResolveBrandLogo(group)]);
      const items=result[0],brandLogo=result[1],columns=v116DetailColumns(state.rows),pagePlan=v117BuildPagePlan(items,state.viewFields);
      const blob=v116BuildPdf(items,group,columns,brandLogo,state.viewFields);
      V121_PDF_CACHE.clear();V121_PDF_CACHE.set(state.key,blob);
      v124PersistentPut(state.key,blob); // fire-and-forget: click is not delayed by disk caching
      return {...state,blob,pagePlan,items};
    })();
    V124_BUILD_PROMISE_CACHE.set(state.key,promise);
    try{return await promise}finally{
      // Keep only successful PDF in the normal memory/persistent cache; promise map is only for in-flight dedupe.
      V124_BUILD_PROMISE_CACHE.delete(state.key);
    }
  }
  function v124ScheduleWarm(group,delay=180){
    const cleanGroup=v116Clean(group);if(!cleanGroup)return;
    clearTimeout(V124_WARM_TIMER);
    V124_WARM_TIMER=setTimeout(()=>{
      const run=()=>v124PrepareCatalogue(cleanGroup).catch(()=>{});
      if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:900});else run();
    },Math.max(0,delay));
  }
  window.RAJ_V124_WARM_CATALOGUE=v124ScheduleWarm;

  async function v116DownloadCatalogue(){
    const group=v116SelectedGroup();
    let multi=[];try{multi=typeof v103MultiValues==='function'?v103MultiValues('groupFilter'):[]}catch(_e){}
    if(Array.isArray(multi)&&multi.length>1){toast('Catalogue ke liye ek time par sirf ek Group select karein.');return}
    if(!group){toast('Catalogue download ke liye ek Group select karein.');return}
    const button=document.getElementById('catalogDownloadBtn');const oldText=button?.textContent||'Download Catalog';
    if(button)button.disabled=true;
    try{
      // V124: group selection starts this build in the background. In the common path
      // the click only reads an already-built memory/CacheStorage PDF and downloads it.
      const prepared=await v124PrepareCatalogue(group),blob=prepared.blob;
      const filename=(typeof safePdfName==='function'?safePdfName(group):group.replace(/[^A-Za-z0-9 _-]+/g,'_'))+' CATALOGUE.pdf';
      if(typeof downloadPdfBlob==='function')downloadPdfBlob(blob,filename);
      else{
        const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),120000);
      }
      toast(`Catalogue ready: ${prepared.rows.length.toLocaleString('en-IN')} products · ${prepared.pagePlan.length} pages · Price Book VIEW BY hierarchy`);
    }catch(error){
      console.error('V124 catalogue PDF error:',error);toast('Catalogue PDF create nahi hua. Please try again.');
    }finally{
      if(button){button.disabled=false;button.textContent=oldText}
      try{window.renderCatalogCard?.(group)}catch(_e){}
    }
  }

  // Preserve the existing card/status logic, then enable the new image catalogue for any single selected group.
  window.renderCatalogCard=function(group){
    if(typeof V116_ORIGINAL_RENDER==='function')V116_ORIGINAL_RENDER(group);
    const button=document.getElementById('catalogDownloadBtn'),status=document.getElementById('catalogStatus');
    const selected=v116Clean(group)||v116SelectedGroup();
    let multi=[];try{multi=typeof v103MultiValues==='function'?v103MultiValues('groupFilter'):[]}catch(_e){}
    const single=!!selected&&(!Array.isArray(multi)||multi.length<=1);
    if(button){button.disabled=!single;button.title=single?'Fast 12-product A4 catalogue PDF download karein':'Catalogue ke liye ek Group select karein'}
    if(status&&single)status.textContent='Instant-cache A4 Catalogue: group select hote hi PDF background me ready hota hai; next click direct download karega.';
    if(single){v121PrefetchGroupPack(selected);v124ScheduleWarm(selected);}
  };
  window.openSelectedCatalog=v116DownloadCatalogue;
  window.RAJ_V116_DOWNLOAD_CATALOGUE=v116DownloadCatalogue;
  window.RAJ_V117_DOWNLOAD_CATALOGUE=v116DownloadCatalogue;
  window.RAJ_V118_DOWNLOAD_CATALOGUE=v116DownloadCatalogue;
  window.RAJ_V119_DOWNLOAD_CATALOGUE=v116DownloadCatalogue;
  window.RAJ_V120_DOWNLOAD_CATALOGUE=v116DownloadCatalogue;
  window.RAJ_V121_DOWNLOAD_CATALOGUE=v116DownloadCatalogue;
  window.RAJ_V122_DOWNLOAD_CATALOGUE=v116DownloadCatalogue;
  window.RAJ_V123_DOWNLOAD_CATALOGUE=v116DownloadCatalogue;
  window.RAJ_V124_DOWNLOAD_CATALOGUE=v116DownloadCatalogue;

  function v116Bind(){
    const button=document.getElementById('catalogDownloadBtn');if(button)button.onclick=v116DownloadCatalogue;
    v121PrefetchGroupPack('AAYUB');
    v124ScheduleWarm('AAYUB',0);
    window.addEventListener('raj-data-preloaded',()=>v124ScheduleWarm(v116SelectedGroup()||'AAYUB',0));
    try{window.renderCatalogCard(v116SelectedGroup())}catch(_e){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',v116Bind,{once:true});else v116Bind();
})();
