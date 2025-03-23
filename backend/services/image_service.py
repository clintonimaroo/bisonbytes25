import os
import requests
import time

BRAVE_API_KEY = os.getenv("BRAVE_SEARCH_API_KEY")

def fetch_images(query: str, limit: int, max_retries=3):
    url = "https://api.search.brave.com/res/v1/images/search"
    params = {
        "q": query,
        "safesearch": "strict",
        "count": limit,
        "search_lang": "en",
        "country": "us",
        "spellcheck": 1
    }
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": BRAVE_API_KEY
    }

    retries = 0
    while retries < max_retries:
        try:
            response = requests.get(url, params=params, headers=headers)
            if response.status_code == 429:  # Too Many Requests
                retries += 1
                if retries < max_retries:
                    # Exponential backoff: 1s, 2s, 4s...
                    wait_time = 2 ** (retries - 1)
                    print(f"Rate limited, retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                    continue
            
            response.raise_for_status()  
            data = response.json().get('results', [])
            return data
        except requests.exceptions.RequestException as e:
            print(f"Error fetching images: {e}")
            retries += 1
            if retries < max_retries and "429" in str(e):
                wait_time = 2 ** (retries - 1)
                print(f"Rate limited, retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                break
    
    return None 