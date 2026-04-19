import os
import re
import shutil
import ssl
import sys
import time
from html import unescape
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(r"F:\AI编程\遇见新疆_uniapp")
DATA_FILE = ROOT / "common" / "destination-data.js"
STATIC_DIR = ROOT / "static" / "destinations"

PREFERRED_IMAGE_URLS = {
    27: "https://bkimg.cdn.bcebos.com/pic/f2deb48f8c5494eef01fb570c1a7f7fe9925bc31d005?x-bce-process=image/resize,m_lfit,w_536,limit_1/quality,Q_70",
    34: "https://bkimg.cdn.bcebos.com/pic/1e30e924b899a9010a03a65912950a7b0208f5af?x-bce-process=image/resize,m_lfit,w_536,limit_1/quality,Q_70",
    52: "https://bkimg.cdn.bcebos.com/pic/3b292df5e0fe9925bc31676471e249df8db1cb13dbe7?x-bce-process=image/resize,m_lfit,w_536,limit_1/quality,Q_70",
    54: "https://bkimg.cdn.bcebos.com/pic/42166d224f4a20a44623ddb9dd098f22720e0cf37a03?x-bce-process=image/resize,m_lfit,w_536,limit_1/quality,Q_70",
    55: "https://bkimg.cdn.bcebos.com/pic/cb8065380cd7912397dd03a6027f4e82b2b7d1a22a87?x-bce-process=image/resize,m_lfit,w_536,limit_1/quality,Q_70",
    56: "https://dimg04.c-ctrip.com/images/0106x12000f6trjwfA19D_W_640_10000.jpg",
    60: "https://dimg04.c-ctrip.com/images/0zg1812000icxuilh1437.jpg",
    67: "https://dimg04.c-ctrip.com/images/0104912000iuo566m0FF1_W_640_10000.jpg",
}

SEARCH_ALIASES = {
    5: ["伊犁哈萨克自治州那拉提旅游风景区", "那拉提草原"],
    7: ["巴音布鲁克景区"],
    8: ["禾木风景区", "禾木村"],
    9: ["喀什地区喀什古城景区", "喀什古城景区", "喀什古城"],
    10: ["交河故城"],
    11: ["坎儿井民俗园"],
    12: ["库车王府"],
    13: ["库木塔格沙漠"],
    14: ["天山神秘大峡谷"],
    15: ["乌尔禾魔鬼城"],
    16: ["塔克拉玛干沙漠"],
    17: ["新疆金湖杨国家森林公园", "泽普金湖杨景区"],
    18: ["塔里木胡杨林国家森林公园", "轮台胡杨林公园"],
    19: ["博斯腾湖"],
    20: ["可可托海景区"],
    21: ["江布拉克景区"],
    22: ["帕米尔旅游区"],
    23: ["新疆国际大巴扎"],
    24: ["吐鲁番市葡萄沟风景区", "葡萄沟风景区", "葡萄沟"],
    25: ["卡拉库里湖"],
    26: ["慕士塔格冰川公园"],
    27: ["昭苏湿地公园", "昭苏天马湿地公园", "昭苏国家湿地公园"],
    28: ["夏塔旅游区"],
    29: ["特克斯八卦城"],
    30: ["高昌故城"],
    31: ["火焰山景区"],
    32: ["温宿大峡谷"],
    33: ["罗布人村寨"],
    34: ["库尔勒天鹅河景区", "天鹅河景区", "库尔勒天鹅河"],
    35: ["独库公路"],
    36: ["安集海大峡谷"],
    37: ["乌孙古道"],
    38: ["新疆维吾尔自治区博物馆"],
    39: ["红山公园"],
    40: ["达坂城古镇", "达坂城"],
    41: ["果子沟大桥"],
    42: ["霍城薰衣草"],
    43: ["琼库什台村"],
    44: ["唐布拉草原", "唐布拉"],
    45: ["乌伦古湖"],
    46: ["五彩滩"],
    47: ["白哈巴村"],
    48: ["木垒胡杨林"],
    49: ["天山大峡谷"],
    50: ["南山牧场"],
    51: ["乌孙古道"],
    52: ["木特塔尔沙漠公园", "木特塔尔沙漠"],
    53: ["尼雅遗址"],
    54: ["和田团城", "和田团城景区"],
    55: ["博乐河谷湿地", "博尔塔拉河谷国家湿地公园", "博尔塔拉河谷湿地"],
    56: ["精河木特塔尔胡杨林", "木特塔尔胡杨林"],
    57: ["克孜尔石窟"],
    58: ["安集海大峡谷"],
    59: ["塔里木胡杨林国家森林公园", "塔里木胡杨林公园"],
    60: ["塔河源景区", "塔河源", "塔里木河源头景区", "塔里木河源头"],
    61: ["乌孙古道"],
    62: ["新疆玛纳斯国家湿地公园", "玛纳斯国家湿地公园"],
    63: ["克孜尔石窟"],
    64: ["克孜尔石窟"],
    65: ["惠远古城", "惠远古城钟鼓楼"],
    66: ["克孜尔石窟"],
    67: ["阿克苏文庙"],
}

ENTRY_RE = re.compile(r"createScenicSpot\(\{(.*?)\n\s*\}\)", re.S)
ID_RE = re.compile(r"\bid:\s*(\d+)")
NAME_RE = re.compile(r"\bname:\s*'([^']+)'")
IMAGE_RE = re.compile(r"\bimage:\s*'([^']+)'")
OG_IMAGE_RE = re.compile(
    r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', re.I
)
BKIMG_RE = re.compile(r"https://bkimg\.cdn\.bcebos\.com/(?:smart/)?[^\s\"'<>]+")

SSL_CONTEXT = ssl.create_default_context()
HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
}


def fetch_text(url: str) -> str:
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, context=SSL_CONTEXT, timeout=30) as response:
        return response.read().decode("utf-8", errors="ignore")


def download_binary(url: str) -> bytes:
    request = urllib.request.Request(
        url, headers={"User-Agent": "Mozilla/5.0", "Accept": "image/*,*/*;q=0.8"}
    )
    with urllib.request.urlopen(request, context=SSL_CONTEXT, timeout=60) as response:
        return response.read()


def infer_extension(url: str, content: bytes) -> str:
    clean = url.split("?")[0].lower()
    suffix = Path(clean).suffix
    if suffix in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        return ".jpg" if suffix == ".jpeg" else suffix
    if content.startswith(b"\x89PNG"):
        return ".png"
    if content[:3] == b"GIF":
        return ".gif"
    if content[:4] == b"RIFF" and b"WEBP" in content[:16]:
        return ".webp"
    return ".jpg"


def extract_entry_meta(block: str):
    id_match = ID_RE.search(block)
    name_match = NAME_RE.search(block)
    image_match = IMAGE_RE.search(block)
    if not id_match or not name_match or not image_match:
        return None
    return {
        "id": int(id_match.group(1)),
        "name": name_match.group(1),
        "image": image_match.group(1),
    }


def clean_image_url(url: str) -> str:
    value = unescape(url).strip()
    for marker in ("&quot;", "&#34;", "\\u0026quot;", '"', "<"):
        if marker in value:
            value = value.split(marker, 1)[0]
    return value


def extract_baike_image(html: str) -> str:
    og_match = OG_IMAGE_RE.search(html)
    if og_match:
        return clean_image_url(og_match.group(1))

    matches = BKIMG_RE.findall(html)
    for candidate in matches:
        clean = clean_image_url(candidate)
        if "logo" in clean or "subscribe" in clean:
            continue
        return clean
    raise RuntimeError("No Baike image found")


def search_baike_image(query: str) -> str:
    url = f"https://baike.baidu.com/search/word?word={urllib.parse.quote(query)}"
    html = fetch_text(url)
    return extract_baike_image(html)


def build_query_candidates(scenic_id: int, scenic_name: str):
    aliases = SEARCH_ALIASES.get(scenic_id, [])
    if isinstance(aliases, str):
        aliases = [aliases]

    candidates = []
    seen = set()
    for candidate in [*aliases, scenic_name]:
        query = str(candidate or "").strip()
        if not query or query in seen:
            continue
        seen.add(query)
        candidates.append(query)
    return candidates


def main() -> int:
    STATIC_DIR.mkdir(parents=True, exist_ok=True)
    source = DATA_FILE.read_text(encoding="utf-8")
    replacements = {}
    failures = []

    for block in ENTRY_RE.findall(source):
        meta = extract_entry_meta(block)
        if not meta:
            continue

        scenic_id = meta["id"]
        scenic_name = meta["name"]
        preferred_image_url = PREFERRED_IMAGE_URLS.get(scenic_id)

        if preferred_image_url:
            try:
                print(f"[{scenic_id:02d}] {scenic_name} <- direct image")
                content = download_binary(preferred_image_url)
                ext = infer_extension(preferred_image_url, content)
                relative_path = f"/static/destinations/{scenic_id:02d}{ext}"
                output_path = STATIC_DIR / f"{scenic_id:02d}{ext}"
                output_path.write_bytes(content)
                replacements[scenic_id] = relative_path
                print(f"  OK {relative_path}")
                time.sleep(0.2)
                continue
            except Exception as error:
                print(f"  FAIL {error}")

        queries = build_query_candidates(scenic_id, scenic_name)
        last_error = None

        for query in queries:
            try:
                print(f"[{scenic_id:02d}] {scenic_name} <- {query}")
                image_url = search_baike_image(query)
                content = download_binary(image_url)
                ext = infer_extension(image_url, content)
                relative_path = f"/static/destinations/{scenic_id:02d}{ext}"
                output_path = STATIC_DIR / f"{scenic_id:02d}{ext}"
                output_path.write_bytes(content)
                replacements[scenic_id] = relative_path
                print(f"  OK {relative_path}")
                time.sleep(0.2)
                break
            except Exception as error:
                last_error = error
                print(f"  FAIL {error}")
        else:
            failures.append(
                (
                    scenic_id,
                    scenic_name,
                    ", ".join(queries),
                    str(last_error or "Unknown error"),
                )
            )

    def replace_image(match: re.Match) -> str:
        block = match.group(1)
        meta = extract_entry_meta(block)
        if not meta:
            return match.group(0)
        scenic_id = meta["id"]
        if scenic_id not in replacements:
            return match.group(0)
        updated = IMAGE_RE.sub(f"image: '{replacements[scenic_id]}'", block, count=1)
        return f"createScenicSpot({{{updated}\n  }})"

    updated_source = ENTRY_RE.sub(replace_image, source)
    DATA_FILE.write_text(updated_source, encoding="utf-8")

    if failures:
        print("\nUnresolved:")
        for scenic_id, scenic_name, query, message in failures:
            print(f"- {scenic_id:02d} {scenic_name} ({query}): {message}")
        return 1

    print("\nAll destination images replaced with bundled local assets.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
