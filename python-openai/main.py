from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import pdfplumber, os, json, re , uvicorn
from dotenv import load_dotenv

from db import init_db, insert_cv_result , get_cv_result , get_cv_results_with_job_details, clear_cv_results
from crawler import fetch_job 

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

def clean_json_text(raw_text: str) -> str:
    return re.sub(r"```json|```", "", raw_text).strip()


# Strict JSON schema for model output to reduce hallucinations and formatting drift
EVALUATION_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "score": {"type": "integer", "minimum": 1, "maximum": 10},
        "skills_score": {"type": "integer", "minimum": 0, "maximum": 3},
        "experience_score": {"type": "integer", "minimum": 0, "maximum": 3},
        "education_score": {"type": "integer", "minimum": 0, "maximum": 2},
        "extra_score": {"type": "integer", "minimum": 0, "maximum": 2},
        "salary_score": {"type": "integer", "minimum": 0, "maximum": 1},
        "strengths": {"type": "array", "items": {"type": "string"}},
        "weaknesses": {"type": "array", "items": {"type": "string"}},
        "comment": {"type": "string"}
    },
    "required": [
        "score",
        "skills_score",
        "experience_score",
        "education_score",
        "extra_score",
        "salary_score",
        "strengths",
        "weaknesses",
        "comment"
    ],
    "additionalProperties": False
}

@app.post("/evaluate-cv")
async def evaluate_cv(
    job_codes: str = Form(...),        
    cv_files: list[UploadFile] = File(...) 
):
    try:
        job_codes_list = json.loads(job_codes)
    except json.JSONDecodeError as e:
        return {"error": f"Job codes JSON parse failed: {str(e)}", "raw": job_codes}

    result = {}

    for cv_file in cv_files:
        # CV PDF → text
        try:
            with pdfplumber.open(cv_file.file) as pdf:
                cv_text = "\n".join(page.extract_text() or "" for page in pdf.pages)
        except Exception as e:
            result[cv_file.filename] = {"error": f"Failed to read PDF: {str(e)}"}
            continue

        result[cv_file.filename] = {}

        for code in job_codes_list:
            job_data = fetch_job(code)
            
            # Хэрэв өмнө нь DB-д хадгалагдсан бол шууд авах
            existing_eval = get_cv_result(cv_file.filename, code)
            if existing_eval:
                result[cv_file.filename][code] = existing_eval
                continue  # Skip OpenAI call

            prompt = f"""
Та хүний нөөцийн мэргэжилтэн. Зөвхөн монголоор хариул.

Зорилго: Доорх ажлын зар (JD) ба CV-ийн тохирлыг үнэлж, бүтцит JSON буцаа.

Чанарын дүрэм:
- Таамаг бүү хий. JD/CV-д ил тод дурдсан нотолгоон дээр л дүгнэх.
- Мэргэжлийн нэр томьёог орчуулахгүй.
- Оролт урт бол гол утгыг анхаарч, давхардал/чанарын бус текстийг үл тоо.

Онооны рубрик:
- skills_score (0–3): JD-д буй чухал ур чадварууд CV-д хэдий хэмжээнд (шалгуулж болох байдлаар) туссан эсэх.
- experience_score (0–3): Төстэй албан тушаал, салбар, хэрэгцээт технологи/үүрэг, хугацааны уялдаа.
- education_score (0–2): Боловсролын түвшин ба чиглэл JD-тай нийцэх эсэх.
- extra_score (0–2): Сертификат, хэл, шагнал, нийтлэл, нийгмийн ажил зэрэг нэмэлт давуу тал.
- salary_score (0–1): CV дээрх эсхүл нэр дэвшигчийн хүлээлт JD-ийн саналтай нийцэх эсэх. Хоёуланд нь тодорхой бус бол 1 гэж оноо.

Эцсийн оноо:
- total = skills_score + experience_score + education_score + extra_score + salary_score (макс 11)
- score = round(10 * total / 11), 1–10 хооронд цонхоос гарвал ойролцоо бүтэн тоонд хавч.

Гаралт зөвхөн JSON байх ёстой. Нэмэлт текст, код блок оруулахгүй. Түлхүүрүүд зөвхөн: score, skills_score, experience_score, education_score, extra_score, salary_score, strengths, weaknesses, comment

Ажлын зар (JD):
{json.dumps(job_data, ensure_ascii=False, indent=2)}

CV текст:
{cv_text}
"""

            try:
                response = client.responses.create(
                    model="gpt-4o-mini",
                    input=prompt,
                    temperature=0,
                    response_format={
                        "type": "json_schema",
                        "json_schema": {
                            "name": "cv_evaluation",
                            "schema": EVALUATION_JSON_SCHEMA,
                            "strict": True
                        }
                    }
                )
                evaluation = json.loads(response.output_text)
            except Exception as e:
                evaluation = {"error": "OpenAI evaluation failed", "details": str(e), 
                              "raw": response.output_text if 'response' in locals() else ""}

            evaluation["job_title"] = job_data["title"]
            result[cv_file.filename][code] = evaluation
            insert_cv_result(cv_file.filename, code, evaluation)

    return result
@app.get("/evaluations")
def get_evaluations():
    return get_cv_results_with_job_details()

@app.post("/evaluations/clear")
def get_evaluations():
    return clear_cv_results()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))  # Render-аас ирсэн PORT-г ашиглана
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)