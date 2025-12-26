"""CPSBC Directory Tools"""

from cpsbc_scraper import search_cpsbc


def search_cpsbc_directory(last_name: str, tool_context, first_name: str = "", city: str = "") -> str:
    """Search the BC College of Physicians and Surgeons directory for physician contact information.
    
    Use this tool when you need to find a physician's fax number, phone number, or practice address in British Columbia.
    
    Args:
        last_name: Physician's last name (required)
        first_name: Physician's first name (optional, helps narrow results)
        city: City/town to filter by (optional)
    
    Returns:
        Raw text from CPSBC directory search results containing physician names, MSP numbers,
        registration status, practice type, addresses, phone numbers, and fax numbers.
    """
    return search_cpsbc(last_name, first_name, city)


CPSBC_TOOLS = [search_cpsbc_directory]

CPSBC_TOOL_DESCRIPTIONS = {
    "search_cpsbc_directory": "Searching BC physician directory...",
}
