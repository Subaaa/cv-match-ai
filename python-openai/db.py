# db.py
import sqlite3, json
from typing import Optional, List, Dict
from datetime import datetime

DB_FILE = "cv_match.db"

def get_conn():
    return sqlite3.connect(DB_FILE)

def init_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                job_code TEXT PRIMARY KEY,
                title TEXT,
                salary TEXT,
                description TEXT,
                requirements TEXT,
                additional TEXT,
                skills TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cv_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cv_filename TEXT,
                job_code TEXT,
                score INTEGER,
                skills_score INTEGER,
                experience_score INTEGER,
                education_score INTEGER,
                extra_score INTEGER,
                salary_score INTEGER,                
                strengths TEXT,
                weaknesses TEXT,
                comment TEXT,
                created_at TEXT
            )
        """)

def insert_job(job_code: str, job_data: Dict):
    skills_json = json.dumps(job_data.get("skills", []), ensure_ascii=False)
    with get_conn() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO jobs
            (job_code, title, salary, description, requirements, additional, skills)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            job_code,
            job_data.get("title", ""),
            job_data.get("salary", ""),
            job_data.get("description", ""),
            job_data.get("requirements", ""),
            job_data.get("additional", ""),
            skills_json ))

def get_job(job_code: str) -> Optional[Dict]:
    with get_conn() as conn:
        cur = conn.execute("SELECT * FROM jobs WHERE job_code = ?", (job_code,))
        row = cur.fetchone()
        if row:
            return {
                "job_code": row[0],
                "title": row[1],
                "salary": row[2],
                "description": row[3],
                "requirements": row[4],
                "additional": row[5],
                "skills": row[6]
            }
    return None

def insert_cv_result(cv_filename: str, job_code: str, evaluation: Dict):    
    strengths_json = json.dumps(evaluation.get("strengths", []), ensure_ascii=False)
    weaknesses_json = json.dumps(evaluation.get("weaknesses", []), ensure_ascii=False)
    
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO cv_results
            (cv_filename, job_code, score, skills_score, experience_score, education_score, extra_score, salary_score, strengths, weaknesses, comment, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            cv_filename,
            job_code,
            evaluation.get("score"),
            evaluation.get("skills_score"),
            evaluation.get("experience_score"),
            evaluation.get("education_score"),
            evaluation.get("extra_score"),
            evaluation.get("salary_score"),
            strengths_json,
            weaknesses_json,
            evaluation.get("comment"),
            datetime.now().isoformat()
        ))

def get_cv_results() -> List[Dict]:
    with get_conn() as conn:
        cur = conn.execute("SELECT * FROM cv_results")
        results = []
        for row in cur.fetchall():
            results.append({
                "id": row[0],
                "cv_filename": row[1],
                "job_code": row[2],
                "score": row[3],
                "skills_score": row[4],
                "experience_score": row[5],
                "education_score": row[6],
                "extra_score": row[7],
                "salary_score": row[8],
                "strengths": json.loads(row[9]) if row[9] else [],
                "weaknesses": json.loads(row[10]) if row[10] else [],
                "comment": row[11],
                "created_at": row[12]
            })
    return results

def get_cv_result(cv_filename: str, job_code: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT score, skills_score, experience_score, education_score, extra_score, salary_score,
               strengths, weaknesses, comment, created_at , j.title
        FROM cv_results c
        LEFT JOIN jobs j ON c.job_code = j.job_code
        WHERE cv_filename=? AND c.job_code=?
    """, (cv_filename, job_code))
    row = cursor.fetchone()
    conn.close()

    if row:
        return {
            "score": row[0],
            "skills_score": row[1],
            "experience_score": row[2],
            "education_score": row[3],
            "extra_score": row[4],
            "strengths": row[5],
            "weaknesses": row[6],
            "comment": row[7],
            "created_at": row[8],
            "job_title" : row[9]
        }
    return None

def get_cv_results_with_job_details() -> Dict[str, Dict[str, Dict]]:

    with get_conn() as conn:
        cur = conn.execute("""
            SELECT c.cv_filename, c.job_code, c.score, c.skills_score, c.experience_score,
                   c.education_score, c.extra_score, c.salary_score, c.strengths, c.weaknesses, c.comment,
                   c.created_at, j.title, j.salary, j.description, j.requirements, j.additional, j.skills
            FROM cv_results c
            LEFT JOIN jobs j ON c.job_code = j.job_code
        """)
        
        results: Dict[str, Dict[str, Dict]] = {}
        for row in cur.fetchall():
            cv_filename = row[0]
            job_code = row[1]

            if cv_filename not in results:
                results[cv_filename] = {}

            results[cv_filename][job_code] = {
                "score": row[2],
                "skills_score": row[3],
                "experience_score": row[4],
                "education_score": row[5],
                "extra_score": row[6],
                "salary_score": row[7],
                "strengths": json.loads(row[8]) if row[8] else [],
                "weaknesses": json.loads(row[9]) if row[9] else [],
                "comment": row[10],
                "created_at": row[11],
                "job_details": {
                    "title": row[12],
                    "salary": row[13],
                    "description": row[14],
                    "requirements": row[15],
                    "additional": row[16],
                    "skills": json.loads(row[17]) if row[17] else []
                }
            }
    return results