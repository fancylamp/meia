"""CPSBC Physician Directory Scraper

Scrapes the College of Physicians and Surgeons of BC registrant directory.
Returns raw text for LLM to parse.
"""
import concurrent.futures
from playwright.sync_api import sync_playwright


def _search_cpsbc_sync(last_name: str, first_name: str, city: str) -> str:
    """Internal sync function that runs playwright."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        page.goto("https://www.cpsbc.ca/public/registrant-directory")
        page.wait_for_load_state("networkidle")
        
        page.click("label[for='edit-ps-advance-search-show']")
        page.wait_for_timeout(300)
        
        page.fill("#edit-ps-last-name", last_name)
        if first_name:
            page.fill("#edit-ps-first-name", first_name)
        if city:
            page.fill("#edit-ps-ci-to", city)
        
        with page.expect_navigation(wait_until="networkidle"):
            page.click("#edit-ps-submit")
        
        main = page.query_selector("main")
        if not main:
            browser.close()
            return "No results found"
        
        content = main.inner_text()
        browser.close()
        
        # Extract just the results section
        lines = content.split("\n")
        result_lines = []
        in_results = False
        for line in lines:
            if "registrant(s) found" in line:
                in_results = True
            if in_results:
                if "RESULTS PER PAGE" in line:
                    break
                result_lines.append(line)
        
        return "\n".join(result_lines) if result_lines else "No results found"


def search_cpsbc(last_name: str, first_name: str = "", city: str = "") -> str:
    """Search CPSBC directory - runs in separate thread to avoid async conflicts."""
    with concurrent.futures.ThreadPoolExecutor() as executor:
        future = executor.submit(_search_cpsbc_sync, last_name, first_name, city)
        return future.result(timeout=60)


if __name__ == "__main__":
    import sys
    last_name = sys.argv[1] if len(sys.argv) > 1 else "Smith"
    first_name = sys.argv[2] if len(sys.argv) > 2 else ""
    print(search_cpsbc(last_name, first_name))
