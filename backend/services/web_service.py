import os
import requests
import time
from bs4 import BeautifulSoup

BRAVE_API_KEY = os.getenv("BRAVE_SEARCH_API_KEY")

def fetch_web_search_results(query: str, limit: int, max_retries=3):
    url = f"https://api.search.brave.com/res/v1/web/search?q={query}&count={limit}"
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": BRAVE_API_KEY
    }

    retries = 0
    while retries < max_retries:
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 429:  # Too Many Requests
                retries += 1
                if retries < max_retries:
                    # Exponential backoff: 1s, 2s, 4s...
                    wait_time = 2 ** (retries - 1)
                    print(f"Rate limited, retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                    continue
            
            response.raise_for_status()  
            data = response.json().get('web', {}).get('results', [])

            results_with_details = []
            for result in data:
                page_url = result.get('url')
                if page_url:
                    try:
                        page_response = requests.get(page_url, timeout=5)
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
                    except (requests.exceptions.RequestException, requests.exceptions.Timeout) as page_error:
                        # If we can't fetch a page, just include the basic info
                        results_with_details.append({
                            "title": result.get('title', 'No Title'),
                            "url": page_url,
                            "paragraphs": [f"Unable to fetch content: {str(page_error)}"]
                        })

            return results_with_details

        except requests.exceptions.RequestException as e:
            print(f"Error fetching web search results: {e}")
            retries += 1
            if retries < max_retries and "429" in str(e):
                wait_time = 2 ** (retries - 1)
                print(f"Rate limited, retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                break
    
    return None


def fetch_paragraphs_from_urls(urls: list, max_retries=3):
    results = []
    for url in urls:
        retries = 0
        while retries < max_retries:
            try:
                page_response = requests.get(url, timeout=10)
                if page_response.status_code == 429:  # Too Many Requests
                    retries += 1
                    if retries < max_retries:
                        wait_time = 2 ** (retries - 1)
                        print(f"Rate limited, retrying in {wait_time} seconds...")
                        time.sleep(wait_time)
                        continue
                
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
                break  # Success, exit retry loop
                
            except requests.exceptions.RequestException as e:
                print(f"Error fetching {url}: {e}")
                retries += 1
                if retries < max_retries and "429" in str(e):
                    wait_time = 2 ** (retries - 1)
                    print(f"Rate limited, retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    results.append({"url": url, "error": str(e)})
                    break
    
    return results 