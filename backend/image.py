import os
import requests

BRAVE_API_KEY = os.getenv("BRAVE_SEARCH_API_KEY")

def fetch_images(query: str, limit: int):
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

    try:
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()  
        data = response.json().get('results', [])
        return data
    except requests.exceptions.RequestException as e:
        print(f"Error fetching images: {e}")
        return None
