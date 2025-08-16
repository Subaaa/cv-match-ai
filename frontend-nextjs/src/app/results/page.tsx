"use client";

import { useEffect, useState } from "react";

type JobDetails = {
  title: string;
  salary: string;
  description: string;
  requirements: string;
  additional: string;
  skills: string[];
};

type JobInfo = {
  score: number;
  skills_score: number;
  experience_score: number;
  education_score: number;
  extra_score: number;
  salary_score: number;
  strengths: string[];
  weaknesses: string[];
  comment: string;
  created_at: string;
  job_details: JobDetails;
};

type ResultsType = {
  [fileName: string]: {
    [jobId: string]: JobInfo;
  };
};

export default function ResultsPage() {
  const [results, setResults] = useState<ResultsType | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:5000/api/results")
      .then((res) => res.json())
      .then((data) => {
        setResults(data.data || null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center mt-10">Loading results...</p>;
  if (!results) return <p className="text-center mt-10">No results found.</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Өмнөх түүх</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(results).map(([fileName, jobs]) => (
          <div
            key={fileName}
            className="bg-white shadow-md rounded-lg p-4 border border-gray-200"
          >
            <h2 className="font-bold text-xl mb-3 text-blue-600"> <a href={"http://localhost:5000/uploads/" + fileName} target="_blank" rel="noopener noreferrer" className="hover:underline" > {fileName} </a> </h2>

            {Object.entries(jobs).map(([jobId, info]) => (
              <div
                key={jobId}
                className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                <p className="text-sm text-gray-600">
                  <strong>Job:</strong>{" "}
                  <a
                    href={`https://www.zangia.mn/job/${jobId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {info.job_details.title}
                  </a>
                </p>

                <div className="grid grid-cols-2 gap-2 my-2 text-sm">
                  <p><strong>Score:</strong> {info.score}</p>
                  <p><strong>Skills:</strong> {info.skills_score}</p>
                  <p><strong>Experience:</strong> {info.experience_score}</p>
                  <p><strong>Education:</strong> {info.education_score}</p>
                  <p><strong>Extra:</strong> {info.extra_score}</p>
                  <p><strong>Salary:</strong> {info.salary_score}</p>
                </div>

                <div className="mt-2">
                  <p className="font-semibold text-green-600">Strengths:</p>
                  <ul className="list-disc ml-5 text-sm text-gray-700">
                    {info.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>

                  <p className="font-semibold text-red-600 mt-2">Weaknesses:</p>
                  <ul className="list-disc ml-5 text-sm text-gray-700">
                    {info.weaknesses.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>

                <p className="mt-3 text-sm text-gray-800">
                  <strong>Comment:</strong> {info.comment}
                </p>

                <p className="mt-1 text-gray-400 text-xs text-right">
                  {new Date(info.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
