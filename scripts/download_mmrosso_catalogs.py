from __future__ import annotations

import argparse
import hashlib
import logging
import os
import re
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    ZoneInfo = None


ROOT_DIR = Path(__file__).resolve().parents[1]
SITE_URL = "https://www.mmrosso.com/"
INPUT_DIR = ROOT_DIR / "input_catalogs"
LOG_DIR = ROOT_DIR / "logs"
LOG_PATH = LOG_DIR / "mmrosso-catalog-download.log"
SUPPORTED_INPUT_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}

REQUEST_HEADERS = {
    "User-Agent": "ClubMyOffersBot/1.0 (+https://www.clubmy.com.br; mmrosso catalog downloader)",
    "Accept": "text/html,application/pdf,*/*;q=0.8",
}

CATALOGS = {
    "semana": {
        "slug": "ofertas-da-semana",
        "title": "Ofertas da Semana",
        "keywords": ("ofertas da semana", "oferta da semana", "encarte semanal", "semana"),
    },
    "bebidas": {
        "slug": "especial-de-bebidas",
        "title": "Especial de Bebidas",
        "keywords": ("especial de bebidas", "bebidas", "bebida"),
    },
}


@dataclass(frozen=True)
class CatalogLink:
    url: str
    label: str
    html_context: str


def setup_logging() -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[
            logging.FileHandler(LOG_PATH, encoding="utf-8"),
            logging.StreamHandler(sys.stdout),
        ],
    )


def today_sao_paulo() -> datetime:
    if ZoneInfo is None:
        return datetime.now()
    return datetime.now(ZoneInfo("America/Sao_Paulo"))


def is_friday(now: datetime) -> bool:
    return now.weekday() == 4


def should_include_bebidas(now: datetime, force_bebidas: bool) -> bool:
    env_value = os.getenv("MMROSSO_INCLUDE_BEBIDAS", "").strip().lower()
    if env_value in {"1", "true", "yes", "sim"}:
        return True
    if env_value in {"0", "false", "no", "nao"}:
        return False
    return force_bebidas or is_friday(now)


def clean_input_catalogs() -> None:
    INPUT_DIR.mkdir(parents=True, exist_ok=True)
    removed = 0
    for item in INPUT_DIR.iterdir():
        if not item.is_file() or item.name == ".gitkeep":
            continue
        if item.suffix.lower() not in SUPPORTED_INPUT_EXTENSIONS:
            continue
        item.unlink()
        removed += 1
    logging.info("input_catalogs cleaned; removed=%s", removed)


def request_with_retries(url: str, *, stream: bool = False) -> requests.Response:
    last_error: Exception | None = None
    for attempt in range(1, 4):
        try:
            response = requests.get(
                url,
                headers=REQUEST_HEADERS,
                timeout=30,
                allow_redirects=True,
                stream=stream,
            )
            response.raise_for_status()
            return response
        except requests.RequestException as error:
            last_error = error
            logging.warning("request failed; attempt=%s url=%s error=%s", attempt, url, error)
            time.sleep(attempt * 2)
    raise RuntimeError(f"failed to fetch {url}: {last_error}")


def normalize_url(raw_url: str, base_url: str = SITE_URL) -> str | None:
    if not raw_url:
        return None
    cleaned = raw_url.strip().replace("\\/", "/").replace("&amp;", "&")
    if cleaned.startswith("blob:") or cleaned.startswith("data:") or cleaned.startswith("mailto:"):
        return None
    return urljoin(base_url, cleaned)


def looks_like_pdf(url: str) -> bool:
    lower = url.lower()
    return ".pdf" in lower or "application/pdf" in lower or "/_files/ugd/" in lower


def collect_links_from_html(html: str, base_url: str = SITE_URL) -> list[CatalogLink]:
    soup = BeautifulSoup(html, "html.parser")
    links: list[CatalogLink] = []

    for element in soup.select("a[href], iframe[src], embed[src], object[data]"):
        raw_url = element.get("href") or element.get("src") or element.get("data") or ""
        url = normalize_url(raw_url, base_url)
        if not url or not looks_like_pdf(url):
            continue

        label = " ".join(element.get_text(" ", strip=True).split())
        aria = element.get("aria-label") or element.get("title") or ""
        context = " ".join(str(element.parent or element)[:1200].split())
        links.append(CatalogLink(url=url, label=f"{label} {aria}".strip(), html_context=context))

    for match in re.finditer(r"https?:\\?/\\?/[^\"'\s<>]+?\.pdf[^\"'\s<>]*", html, re.IGNORECASE):
        url = normalize_url(match.group(0), base_url)
        if not url:
            continue
        start = max(match.start() - 500, 0)
        end = min(match.end() + 500, len(html))
        context = " ".join(html[start:end].split())
        links.append(CatalogLink(url=url, label="", html_context=context))

    return dedupe_links(links)


def collect_links_with_playwright() -> list[CatalogLink]:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        logging.warning("playwright is not installed; skipping browser fallback")
        return []

    links: list[CatalogLink] = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page(user_agent=REQUEST_HEADERS["User-Agent"])
            page.goto(SITE_URL, wait_until="networkidle", timeout=45000)
            page.wait_for_timeout(2000)

            anchors = page.locator("a[href], iframe[src], embed[src], object[data]").evaluate_all(
                """elements => elements.map((element) => ({
                    href: element.href || element.src || element.data || element.getAttribute('href') || element.getAttribute('src') || element.getAttribute('data') || '',
                    label: `${element.innerText || ''} ${element.getAttribute('aria-label') || ''} ${element.getAttribute('title') || ''}`.trim(),
                    context: element.parentElement ? element.parentElement.innerText || element.parentElement.outerHTML || '' : element.outerHTML || ''
                }))"""
            )

            page_html = page.content()
            browser.close()

        for anchor in anchors:
            url = normalize_url(str(anchor.get("href", "")), SITE_URL)
            if url and looks_like_pdf(url):
                links.append(
                    CatalogLink(
                        url=url,
                        label=str(anchor.get("label", "")),
                        html_context=str(anchor.get("context", "")),
                    )
                )

        links.extend(collect_links_from_html(page_html, SITE_URL))
    except Exception as error:
        logging.warning("playwright fallback failed; error=%s", error)

    return dedupe_links(links)


def dedupe_links(links: Iterable[CatalogLink]) -> list[CatalogLink]:
    deduped: dict[str, CatalogLink] = {}
    for link in links:
        deduped.setdefault(link.url, link)
    return list(deduped.values())


def classify_link(link: CatalogLink, wanted_key: str, fallback_semana: bool) -> bool:
    catalog = CATALOGS[wanted_key]
    haystack = f"{link.label} {link.html_context} {link.url}".lower()
    if any(keyword in haystack for keyword in catalog["keywords"]):
        return True
    if wanted_key == "semana" and fallback_semana and "bebida" not in haystack:
        return True
    return False


def choose_links(links: list[CatalogLink], wanted_keys: list[str]) -> dict[str, CatalogLink]:
    selected: dict[str, CatalogLink] = {}
    fallback_semana = len([link for link in links if "bebida" not in f"{link.label} {link.html_context} {link.url}".lower()]) == 1

    for wanted_key in wanted_keys:
        for link in links:
            if classify_link(link, wanted_key, fallback_semana):
                selected[wanted_key] = link
                break

    return selected


def download_pdf(link: CatalogLink, output_path: Path) -> str | None:
    response = request_with_retries(link.url, stream=True)
    content = response.content
    content_type = response.headers.get("content-type", "").lower()

    if not content.startswith(b"%PDF"):
        logging.warning(
            "discarding non-pdf response; url=%s content_type=%s bytes=%s",
            link.url,
            content_type,
            len(content),
        )
        return None

    digest = hashlib.sha256(content).hexdigest()
    output_path.write_bytes(content)
    logging.info("downloaded catalog; path=%s url=%s sha256=%s", output_path, link.url, digest)
    return digest


def run(force_bebidas: bool = False) -> int:
    setup_logging()
    now = today_sao_paulo()
    date_slug = now.date().isoformat()
    wanted_keys = ["semana"]
    if should_include_bebidas(now, force_bebidas):
        wanted_keys.append("bebidas")

    clean_input_catalogs()

    logging.info("mmrosso catalog download started; wanted=%s", ",".join(wanted_keys))
    try:
        html = request_with_retries(SITE_URL).text
    except Exception as error:
        logging.warning("mmrosso homepage unavailable; error=%s", error)
        return 0
    links = collect_links_from_html(html, SITE_URL)
    if len(links) < len(wanted_keys):
        logging.info("running playwright fallback; html_links=%s", len(links))
        links = dedupe_links([*links, *collect_links_with_playwright()])

    selected = choose_links(links, wanted_keys)
    if not selected:
        logging.warning("no mmrosso catalog pdf found; discovered_links=%s", [link.url for link in links])
        return 0

    downloaded_hashes: set[str] = set()
    for key in wanted_keys:
        link = selected.get(key)
        if not link:
            logging.warning("catalog not found; catalog=%s discovered_links=%s", key, [item.url for item in links])
            continue

        output_path = INPUT_DIR / f"mmrosso-{CATALOGS[key]['slug']}-{date_slug}.pdf"
        try:
            digest = download_pdf(link, output_path)
        except Exception as error:
            logging.warning("catalog download failed; catalog=%s url=%s error=%s", key, link.url, error)
            continue
        if not digest:
            continue

        if digest in downloaded_hashes:
            output_path.unlink(missing_ok=True)
            logging.info("duplicate catalog removed; path=%s", output_path)
            continue

        downloaded_hashes.add(digest)

    logging.info("mmrosso catalog download finished; downloaded=%s", len(downloaded_hashes))
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download MM Rosso PDF catalogs into input_catalogs.")
    parser.add_argument("--force-bebidas", action="store_true", help="Download Especial de Bebidas even outside Friday.")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    raise SystemExit(run(force_bebidas=args.force_bebidas))
