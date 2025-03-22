from fastapi import FastAPI, HTTPException, Query 
from image import fetch_images
from video import fetch_videos
from web import fetch_web_search_results, fetch_paragraphs_from_urls

app = FastAPI()

@app.get("/search", response_model=dict)
async def search(query: str, limit: int = Query(10, gt=0, lt=101)):
    image_result = fetch_images(query, limit)
    video_result = fetch_videos(query, limit)
    
    web_result = fetch_web_search_results(query, limit)
    
    if not image_result and not video_result and not web_result:
        raise HTTPException(status_code=404, detail="No results found or error occurred.")
    
    return {
        "image": image_result,
        "video": video_result,
        "web": web_result
    }


class UrlsRequest(BaseModel):
    urls: list[str]

@app.post("/fetch_paragraphs", response_model=list)
async def fetch_paragraphs(urls_request: UrlsRequest):
    urls = urls_request.urls
    results = fetch_paragraphs_from_urls(urls)
    if not results:
        raise HTTPException(status_code=404, detail="No paragraphs found or error occurred.")
    return results


class TopicRequest(BaseModel):
    topic: str
    limit: int = Query(10, gt=0, lt=101)

@app.post("/fetch_urls_for_topic", response_model=list)
async def fetch_urls_for_topic(topic_request: TopicRequest):
    topic = topic_request.topic
    limit = topic_request.limit
    web_results = fetch_web_search_results(topic, limit)
    
    if not web_results:
        raise HTTPException(status_code=404, detail="No URLs found for the given topic.")
    
    urls = [result['url'] for result in web_results if 'url' in result]
    return urls
