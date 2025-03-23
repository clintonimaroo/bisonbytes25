import os
import requests
from bs4 import BeautifulSoup

BRAVE_API_KEY = os.getenv("BRAVE_SEARCH_API_KEY")

def fetch_web_search_results(query: str, limit: int):
    url = f"https://api.search.brave.com/res/v1/web/search?q={query}&count={limit}"
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": BRAVE_API_KEY
    }

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()  
        data = response.json().get('web', {}).get('results', [])

        results_with_details = []
        for result in data:
            page_url = result.get('url')
            if page_url:
                page_response = requests.get(page_url)
                page_response.raise_for_status()
                soup = BeautifulSoup(page_response.content, 'html.parser')

                title = soup.title.string if soup.title else "No Title"

                paragraphs = soup.find_all('p')
                paragraphs_text = [p.get_text() for p in paragraphs]

                result_with_details = {
                    "title": title,
                    "url": page_url,
                    "paragraphs": paragraphs_text
                }
                results_with_details.append(result_with_details)

        return results_with_details

    except requests.exceptions.RequestException as e:
        print(f"Error fetching web search results: {e}")
        return None




def fetch_paragraphs_from_urls(urls: list):
    results = []
    for url in urls:
        try:
            page_response = requests.get(url)
            page_response.raise_for_status()
            soup = BeautifulSoup(page_response.content, 'html.parser')
            
            title = soup.title.string if soup.title else "No Title"
            
            paragraphs = soup.find_all('p')
            paragraphs_text = [p.get_text() for p in paragraphs]
            
            result = {
                "title": title,
                "url": url,
                "paragraphs": paragraphs_text
            }
            results.append(result)
        except requests.exceptions.RequestException as e:
            results.append({"url": url, "error": str(e)})
    return results
