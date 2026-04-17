BEGIN;

INSERT INTO destinations (
  id,
  name,
  location,
  region,
  category,
  rating,
  longitude,
  latitude,
  description,
  image_url,
  weather,
  tips,
  suggestion,
  live_title,
  live_hint,
  live_keyword,
  culture_overview,
  culture_history,
  culture_highlights,
  recommended_season,
  recommended_stay,
  suitable_audience,
  ticket_reference,
  open_hours,
  sort_order,
  status
)
VALUES
  (1, '天山天池', '新疆阜康', '乌鲁木齐市', '湖泊雪山', 4.8, 88.1548, 43.8803, '高山湖泊与雪岭森林相映成景，是新疆最经典的入门景区之一。', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/%E5%A4%A9%E5%B1%B1%E5%A4%A9%E6%B1%A02_-_panoramio.jpg/1280px-%E5%A4%A9%E5%B1%B1%E5%A4%A9%E6%B1%A02_-_panoramio.jpg', '{"condition":"晴转多云","temperature":"18°C","humidity":"46%","wind":"3级山风"}'::JSONB, ARRAY['建议上午抵达，湖面颜色更通透', '山上温差明显，带外套更稳妥', '适合缆车加环湖步道组合游玩']::TEXT[], '适合半日到一日游，兼顾家庭游客与首次来新疆的观光需求。', '天山天池景区直播', '先看直播可判断湖面能见度、天气和游客密度。', '天山天池 景区直播', '天山天池位于博格达峰北麓，是新疆最具代表性的高山湖泊景区之一，湖水、雪峰、云杉林和山地步道共同构成了经典的天山风光。', '天池古称“瑶池”，在中国传统神话里常被附会为西王母宴游之地。清代以来，这里逐渐被纳入新疆山岳湖泊名胜体系，后来成为近现代新疆旅游开发最早的一批核心景区。', '适合把神话意象、雪山湖泊和家庭轻观光放在同一条线路里理解，也是很多游客认识新疆山地景观的第一站。', '5月-10月', '半天-1天', '家庭游客、首次来新疆游客、轻观光用户', '旺季约 95-155 元', '通常 08:30-19:00', 1, 'published'),
  (2, '喀纳斯景区', '新疆阿勒泰布尔津', '阿勒泰地区', '湖泊雪山', 4.9, 87.0347, 48.7130, '以湖色、雪山、林海与图瓦风情闻名，是北疆核心景区。', 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Kanas_Lake%2C_China%2C_LandSat_image.jpg', '{"condition":"多云","temperature":"13°C","humidity":"58%","wind":"2级山谷风"}'::JSONB, ARRAY['旺季住宿紧张，尽量提前预订', '清晨和傍晚最适合拍照', '建议预留完整一天以上']::TEXT[], '适合深度摄影和自然风光爱好者，秋季层林尽染尤为出片。', '喀纳斯湖景直播', '直播适合确认云层、湖色和当日景区人流。', '喀纳斯 景区直播', '喀纳斯景区位于阿勒泰深山林区，以高山湖泊、针叶林、河谷、图瓦村落和四季分明的色彩变化著称，是北疆自然景观的代表。', '喀纳斯长期是阿尔泰山游牧、狩猎与山地交通活动的区域，周边图瓦人聚落保留了独特生活方式。近几十年随着生态旅游发展，喀纳斯逐渐从边远山地目的地成长为全国知名的自然风景区。', '它不只是看一片湖，更重要的是湖区、村落、白桦林和山地文化共同构成的完整北疆风景系统。', '6月-10月，秋季最佳', '1天-2天', '摄影爱好者、自然风光游客、深度旅行用户', '旺季约 160-230 元', '通常 08:00-20:00', 2, 'published');

INSERT INTO guides (
  slug,
  title,
  category,
  read_time,
  author,
  publish_date,
  views,
  likes,
  location,
  image_url,
  excerpt,
  highlights,
  tips,
  sort_order,
  status
)
VALUES
  ('first-time-xinjiang', '第一次来新疆，7 天怎么安排更顺路', '行程规划', '6 分钟阅读', '遇见新疆编辑部', DATE '2026-04-15', '2.3k', '318', '北疆经典线', 'https://upload.wikimedia.org/wikipedia/commons/d/d1/Nalati_Grassland_2.jpg', '适合第一次来新疆的用户，从乌鲁木齐出发，串联赛里木湖、伊犁草原和独库沿线。', ARRAY['路线顺', '适合第一次来', '风景密度高']::TEXT[], ARRAY['旺季住宿至少提前 5 到 10 天预订', '独库公路通车时间要提前确认', '每天车程控制在 4 到 6 小时体验更好']::TEXT[], 1, 'published'),
  ('self-drive-checklist', '新疆自驾前，这份准备清单先收好', '自驾建议', '5 分钟阅读', '遇见新疆编辑部', DATE '2026-04-15', '1.8k', '246', '全疆通用', 'https://bkimg.cdn.bcebos.com/pic/78310a55b319ebc4b7452225007dd8fc1e178a82b84e?x-bce-process=image/resize,m_lfit,w_536,limit_1/quality,Q_70', '新疆路程长、景点分散，自驾前确认证件、车辆状态、导航和补给，比临时做决定更重要。', ARRAY['证件准备', '路线确认', '补给提醒']::TEXT[], ARRAY['山路和长下坡不要连续疲劳驾驶', '尊重限速与检查站规定', '别把导航预计时长当成真实到达时长']::TEXT[], 2, 'published'),
  ('food-guide', '新疆吃什么不容易踩雷', '吃喝推荐', '7 分钟阅读', '遇见新疆编辑部', DATE '2026-04-15', '3.1k', '402', '城市与古城', 'https://upload.wikimedia.org/wikipedia/commons/f/fc/East_gate_of_the_Ancient_City_of_Kashi_%2820230923104429%29.jpg', '抓饭、拌面、烤包子、馕和酸奶都值得尝，但点单方式和就餐时段也会影响体验。', ARRAY['高频美食', '点单建议', '夜市提醒']::TEXT[], ARRAY['夜市更适合边走边吃，不用一次点太多', '热门老店高峰期要排队', '早餐可以多试试奶茶、包子、馕']::TEXT[], 3, 'published'),
  ('desert-safety', '去沙漠玩之前，一定先看这 6 条提醒', '安全提醒', '5 分钟阅读', '遇见新疆编辑部', DATE '2026-04-15', '1.5k', '228', '吐鲁番/南疆', 'https://upload.wikimedia.org/wikipedia/commons/1/1d/%E4%B8%AD%E5%9B%BD%E6%96%B0%E7%96%86%E9%84%AF%E5%96%84%E5%8E%BF%E5%BA%93%E6%9C%A8%E5%A1%94%E6%A0%BC%E6%B2%99%E6%BC%A0_China_Xinjiang%2C_Piqan_County_Desert_Chi_-_panoramio.jpg', '不论是库木塔格还是沙漠公路边体验项目，补水、防晒、结伴和服从景区安排都是底线。', ARRAY['防晒', '补水', '别单独深入']::TEXT[], ARRAY['至少准备 1 到 2 瓶饮水', '不要轻易离开观景和活动区域', '风沙大时优先保护眼睛和电子设备']::TEXT[], 4, 'published'),
  ('tianshan-hiking', '天山徒步装备，不想漏东西就照着带', '户外探险', '6 分钟阅读', '遇见新疆编辑部', DATE '2026-04-15', '1.2k', '173', '天山/草原线', 'https://upload.wikimedia.org/wikipedia/commons/8/87/%E5%A4%A9%E5%B1%B1%E5%A4%A9%E6%B1%A02_-_panoramio.jpg', '高山景区看起来温柔，实际天气和地形变化很快，鞋服、保暖层和应急物品不能省。', ARRAY['保暖层', '徒步鞋', '轻量应急']::TEXT[], ARRAY['不要穿新鞋上长线', '高海拔别忽视保暖', '雨具和一次性雨披可以备一个']::TEXT[], 5, 'published'),
  ('stay-where', '新疆住宿怎么选，住景区还是住县城', '住宿建议', '5 分钟阅读', '遇见新疆编辑部', DATE '2026-04-15', '1.6k', '201', '全疆通用', 'https://upload.wikimedia.org/wikipedia/commons/3/3f/%E6%96%B0%E7%96%86-%E7%A6%BE%E6%9C%A8.%E9%BB%84%E6%98%8F_-_panoramio.jpg', '如果你更看重晨雾、日出和景区氛围，就住景区；如果更看重舒适度和性价比，住县城会更稳。', ARRAY['景区住宿', '县城住宿', '预订时机']::TEXT[], ARRAY['核心景区旺季房量紧张', '自驾尽量关注停车条件', '景区住宿更适合拍早晚景色']::TEXT[], 6, 'published');

INSERT INTO guide_sections (guide_id, title, paragraphs, sort_order)
SELECT g.id, s.title, s.paragraphs, s.sort_order
FROM guides g
JOIN (
  VALUES
    ('first-time-xinjiang', '推荐节奏', ARRAY['如果你是第一次来新疆，建议不要一上来就铺太大范围。7 天时间更适合集中体验北疆经典风景线，减少每天换城市的疲惫感。', '常见走法是乌鲁木齐进出，沿赛里木湖、霍城、伊宁、那拉提、独库公路北段或巴音布鲁克做一个顺时针闭环。']::TEXT[], 1),
    ('first-time-xinjiang', '行程拆分', ARRAY['第 1 天落地乌鲁木齐，适应节奏，晚上可以去大巴扎或新疆博物馆。', '第 2 到 3 天重点走赛里木湖、果子沟、霍城一线，第 4 到 5 天进入伊犁草原景区，第 6 到 7 天根据通车情况安排独库沿线或返回乌鲁木齐。']::TEXT[], 2),
    ('first-time-xinjiang', '适合人群', ARRAY['适合第一次来新疆、想看代表性风景、又不想每天都在赶路的游客。', '如果你更偏爱人文、老城和集市，可以把第一次行程改成南疆线。']::TEXT[], 3),
    ('self-drive-checklist', '出发前检查', ARRAY['建议提前确认驾驶证、身份证、租车订单或保险资料，手机里同时准备离线地图和酒店订单截图。', '车辆方面优先检查轮胎、刹车、玻璃水、备胎和手机充电接口，长线自驾不要忽略这些基础项。']::TEXT[], 1),
    ('self-drive-checklist', '路线判断', ARRAY['新疆不是每一段都适合临时起意，特别是独库公路、山口、沙漠边缘路线和牧区道路。建议提前确认天气、施工和通行情况。', '如果单日车程超过 600 公里，建议中间插入休息城市，否则体验会明显下降。']::TEXT[], 2),
    ('self-drive-checklist', '补给重点', ARRAY['矿泉水、轻食、防晒、纸巾和应急药品最好固定放在车内一个收纳袋里。', '进入长距离路段前，尽量在县城或服务区把油量和饮水都补满。']::TEXT[], 3),
    ('food-guide', '第一次可以先吃什么', ARRAY['第一次来新疆，比较稳妥的入门组合是抓饭、烤肉、拌面、烤包子和酸奶。既能快速感受地方风味，也不容易因为口味太重而不适应。', '如果你在喀什或库车，可以把古城散步和夜市安排在同一晚，体验会更完整。']::TEXT[], 1),
    ('food-guide', '点单建议', ARRAY['新疆很多餐厅分量偏大，2 个人点 3 道主食型菜已经足够，建议先少点再加。', '烤肉、抓饭、馕坑肉这类热菜尽量趁热吃，口感差异很明显。']::TEXT[], 2),
    ('food-guide', '小提醒', ARRAY['景区内餐饮更适合应急补给，想认真吃一顿通常还是回到市区或县城更稳。', '如果肠胃比较敏感，饮品和冰品不要一次性尝太多种。']::TEXT[], 3),
    ('desert-safety', '为什么沙漠更需要准备', ARRAY['沙漠环境看起来开阔，但高温、风沙和缺少遮挡会让体感消耗远快于普通景区。', '特别是正午时段，拍照 20 分钟和暴晒 20 分钟，感受完全不是一回事。']::TEXT[], 1),
    ('desert-safety', '最重要的 3 件事', ARRAY['第一是补水，第二是防晒，第三是不要脱离既定路线。无论是徒步、越野还是娱乐项目，都要把这三点放在最前面。', '如果带老人和孩子，尽量把沙漠活动安排在日落前后。']::TEXT[], 2),
    ('desert-safety', '拍照和游玩建议', ARRAY['拍照衣服可以选择纯色或亮色，但鞋子更重要，最好穿能防沙、包裹脚背的款式。', '如果遇到大风天，优先缩短停留时间，不要硬撑。']::TEXT[], 3),
    ('tianshan-hiking', '基础装备', ARRAY['鞋子优先级最高，徒步鞋或抓地更好的运动鞋比拍照鞋更重要。', '衣物建议按排汗层、保暖层、外层防风来准备，这样更适合新疆昼夜温差大的情况。']::TEXT[], 1),
    ('tianshan-hiking', '随身物品', ARRAY['水、能量棒、防晒、充电宝、纸巾和简单药品建议都放进一个轻量双肩包。', '如果行程里包含骑马或长距离观景车，衣物耐脏和防风也会比好看更重要。']::TEXT[], 2),
    ('tianshan-hiking', '不建议省掉的项目', ARRAY['帽子、墨镜和外套不要因为天气预报晴朗就省掉。', '山里天气说变就变，提前带上比临时后悔更划算。']::TEXT[], 3),
    ('stay-where', '住景区的优点', ARRAY['像禾木、喀纳斯、那拉提这类地方，住进去的最大优势是早晚时段更自由，能避开一部分日间人流。', '如果你想拍晨雾、日出或者夜空，景区住宿通常更值。']::TEXT[], 1),
    ('stay-where', '住县城的优点', ARRAY['县城通常选择更多，洗漱、餐饮、停车和补给也更方便，适合自驾用户和带老人孩子的家庭。', '缺点是第二天需要更早出发，才能赶在合适时段进入景区。']::TEXT[], 2),
    ('stay-where', '预订建议', ARRAY['旺季先锁定核心节点住宿，再反推整体路线，会比先排路线再找房更稳。', '如果是 7 到 8 月、十一或暑期亲子时段，尽量提前预订可取消房型。']::TEXT[], 3)
) AS s(slug, title, paragraphs, sort_order)
  ON g.slug = s.slug;

COMMIT;
