# crawler.py
import requests
from bs4 import BeautifulSoup
from db import init_db, insert_job, get_job

init_db()

headers = {
    "Accept": "application/json, text/plain, */*",
    "User-Agent": "Mozilla/5.0"
}

# API-гаас fetch хийх, эсвэл DB-аас авах
def fetch_job(job_code):
    # DB-с шалгах
    job = get_job(job_code)
    if job:
        print(f"[DB] Job {job_code} found in database.")
        return job
    
    # DB-д байхгүй бол API-аас fetch
    url = f"https://new-api.zangia.mn/api/jobs/{job_code}"
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()
        
        title = data.get("title", "")
        salary = data.get("salary_phrase", "")
        skills = data.get("skills", [])
        
        description_html = data.get("description", "")
        requirements_html = data.get("requirements", "")
        additional_html = data.get("additional", "")
        
        description_text = BeautifulSoup(description_html, "html.parser").get_text(separator="\n")
        requirements_text = BeautifulSoup(requirements_html, "html.parser").get_text(separator="\n")
        additional_text = BeautifulSoup(additional_html, "html.parser").get_text(separator="\n")
        
        job_dict = {
            "title": title,
            "salary": salary,
            "description": description_text,
            "requirements": requirements_text,
            "additional": additional_text,
            "skills": skills
        }
        # DB-д хадгалах
        insert_job(job_code, job_dict)
        print(f"[API] Job {job_code} fetched and saved.")
        return job_dict
    else:
        return {
            "error": f"Failed to fetch, status {response.status_code}"
        }

if __name__ == "__main__":
    init_db()
    job_code = "_uetkzltvpo"
    result = fetch_job(job_code)
    print(result)
