from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import pdfplumber, os, json, re , uvicorn
from dotenv import load_dotenv

from db import init_db, insert_cv_result , get_cv_result , get_cv_results_with_job_details
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
            Та хүний нөөцийн мэргэжилтэн гэж үз.
            Зөвхөн монголоор хариулна уу. Мэргэжлийн үг хэллэгийг орчуулахгүй.
            CV болон ажлын зарын тохирох байдлыг 10 онооны системээр нарийвчлалтай үнэл.
            Эцсийн `score` нь 1–10 хооронд байх ба дараах дэд оноонуудын нийлбэрт үндэслэнэ:

            - skills_score: тухайн ажлын шаардлагатай ур чадвартай хэр зэрэг таарч байгаа эсэх (0–3 оноо)
            - experience_score: ажлын туршлагын оновчтой байдал, хугацаа, холбогдол (0–3 оноо)
            - education_score: боловсролын түвшин, мэргэжлийн уялдаа (0–2 оноо)
            - extra_score: нэмэлт давуу тал (certification, хэлний мэдлэг, шагнал, бусад) (0–2 оноо)
            - salary_score: CV дээрх эсвэл ажил горилогчийн цалингийн хүлээлт ажлын зарын саналтай таарч байгаа эсэх (0–1 оноо). 
                Хэрэв аль аль дээр нь тодорхой дурдаагүй бол 1 оноо гэж үз.

            Үнэлгээ хийхдээ:
            - **strengths**: тухайн CV-ийн давуу талуудыг жагсаа
            - **weaknesses**: сул талуудыг жагсаа
            - **comment**: HR хүний өнцгөөс дүгнэлт өг

            Зөвхөн дараах JSON format-д буцаа (тайлбар нэмэхгүй):

            {{
                "score": int,                # 1–10 хооронд эцсийн дүн
                "skills_score": int,         # 0–3
                "experience_score": int,     # 0–3
                "education_score": int,      # 0–2
                "extra_score": int,          # 0–2
                "salary_score": int,         # 0-1
                "strengths": [string],
                "weaknesses": [string],
                "comment": string
            }}

            Job description:
            {json.dumps(job_data, ensure_ascii=False, indent=2)}

            CV текст:
            {cv_text}
            """

            try:
                response = client.responses.create(
                    model="gpt-4o-mini",
                    input=prompt,
                    temperature=0
                )
                clean_text = clean_json_text(response.output_text)
                evaluation = json.loads(clean_text)
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

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)