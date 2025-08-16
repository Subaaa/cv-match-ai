"use client";

import { useState, ChangeEvent, useRef } from "react";
import ResultsPage from './results/page';

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [jobUrlInput, setJobUrlInput] = useState("");
  const [jobUrls, setJobUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<any>(null);

  const JOB_URL_REGEX = /^https:\/\/www\.zangia\.mn\/job\/.+$/;

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);

      // зөвхөн PDF filter
      const pdfFiles = selectedFiles.filter(
        (file) => file.type === "application/pdf"
      );

      if (pdfFiles.length !== selectedFiles.length) {
        setMessage("❌ Зөвхөн PDF файл зөвшөөрнө.");
      }
      else {
        setMessage("");
      }
      setFiles([...files, ...pdfFiles]);
    }
  };


  // Remove a file
  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  // Add job URL
  const handleAddJobUrl = () => {
    if (!jobUrlInput.trim()) return;

    if (!JOB_URL_REGEX.test(jobUrlInput.trim())) {
      setMessage("❌ Хаяг буруу байна. https://www.zangia.mn/job/ хаягаар эхлэх ёстой.");
      return;
    }

    setJobUrls([...jobUrls, jobUrlInput.trim()]);
    setJobUrlInput("");
    setMessage("");
  };

  // Remove job URL
  const handleRemoveJobUrl = (index: number) => {
    setJobUrls(jobUrls.filter((_, i) => i !== index));
  };

  // Upload files + job URLs
  const handleUpload = async () => {
    if (files.length === 0) {
      setMessage("❌ CV оруулна уу");
      return;
    }
    if (jobUrls.length === 0) {
      setMessage("❌ Ажлын зарын линк оруулна уу");
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("cvs", file));
    jobUrls.forEach((url) => formData.append("jobUrls", url));

    try {
      setUploading(true);
      setMessage("");

      const res = await fetch(`${API_URL}/api/upload-cvs`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      const cvNames = data.data ? Object.keys(data.data) : [];
      const numCVs = cvNames.length;

      setMessage(
        `✅ ${numCVs} CV(s) амжилттай хуулагдлаа!\n` +
        `Files:\n ${cvNames.join("\n- ")}\n` +
        `Job URLs:\n ${jobUrls.join("\n- ")}`
      );

      setResults(data.data);

      setFiles([]);
      setJobUrls([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // helper
  const parseList = (value: any): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return value.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }
    return [String(value)];
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-[1000px]">


        {/* About Section */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h1 className="text-2xl font-bold mb-4 text-center">Cv match AI</h1>
          <p className="text-sm text-gray-700 leading-relaxed">
            Cv match AI нь таны оруулсан CV болон ажлын заруудыг хиймэл оюун
            ухааны тусламжтайгаар хооронд нь харьцуулж, тохирох эсэхийг үнэлдэг
            систем юм.
            <br />
            <br />
            🧠 Backend хэсэгт{" "}
            <strong>Python + FastAPI + SQLite</strong> ашиглаж, <strong>OpenAI
              (model="gpt-4o-mini")</strong>-р боловсруулалт хийдэг. Энэ загвар
            нь өртөг хамгийн бага боловч хариу өгөхөд удаан байдаг тул
            тэвчээртэй хүлээнэ үү.
            <br />
            <br />
            📦 Үр дүн болон тайлбарууд нь{" "}
            <strong>SQLite</strong> өгөгдлийн санд хадгалагдана. Эхний удаад <strong>OpenAI
              (model="gpt-4o-mini")</strong> дуудагдаж удаан уншина 2 дох хүсэлтэн дээр шууд
            өгөгдлийн сангаас үр дүнг буцаана.
            <br />
            <br />
            💻 Frontend нь <strong>Next.js (React)</strong>, <strong>Node.js</strong> ашиглан хийсэн бөгөөд хэрэглэгчийн
            оруулсан мэдээллийг API-аар дамжуулан Python backend рүү илгээж,
            боловсруулсан үр дүнг буцааж харуулдаг.
          </p>
        </div>

        {/* File input */}
        <input
          ref={fileInputRef}
          accept="application/pdf"
          type="file"
          multiple
          className="mb-4 w-full border border-gray-300 rounded p-2"
          onChange={handleFileChange}
        />

        {/* Selected files */}
        {files.length > 0 && (
          <ul className="mb-4 text-sm text-gray-700 space-y-1">
            {files.map((file, i) => (
              <li
                key={i}
                className="flex justify-between items-center bg-gray-100 rounded px-2 py-1"
              >
                <span className="truncate max-w-xs">{file.name}</span>
                <button
                  onClick={() => handleRemoveFile(i)}
                  className="ml-2 w-6 h-6 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Job URL input */}
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Ажлын зарын линк"
            className="flex-1 border border-gray-300 rounded p-2"
            value={jobUrlInput}
            onChange={(e) => setJobUrlInput(e.target.value)}
            spellCheck={false}
          />
          <button
            onClick={handleAddJobUrl}
            className="bg-green-500 hover:bg-green-600 text-white px-4 rounded"
          >
            Add
          </button>
        </div>

        {/* Job URLs list */}
        {jobUrls.length > 0 && (
          <ul className="mb-4 text-sm text-gray-700 space-y-1">
            {jobUrls.map((url, i) => (
              <li
                key={i}
                className="flex justify-between items-center bg-gray-100 rounded px-2 py-1"
              >
                <span className="truncate max-w-xs">{url}</span>
                <button
                  onClick={() => handleRemoveJobUrl(i)}
                  className="ml-2 w-6 h-6 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={uploading}
          className={`w-full py-2 px-4 rounded text-white flex items-center justify-center ${uploading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
            }`}
        >
          {uploading && (
            <svg
              className="animate-spin h-5 w-5 mr-2 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
          )}
          {uploading ? "Uploading..." : "Upload"}
        </button>


        {/* Message */}
        {message && (
          <pre className="mt-4 text-center text-sm font-medium whitespace-pre-wrap">
            {message}
          </pre>
        )}

        {/* Results */}
        {results && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(results).map(([fileName, jobs]: any) => (
              <div
                key={fileName}
                className="bg-white shadow-md rounded-lg p-4 border border-gray-200"
              >
               <h2 className="font-bold text-xl mb-3 text-blue-600"> <a href={`${API_URL}/uploads/${fileName}`} target="_blank" rel="noopener noreferrer" className="hover:underline" > {fileName} </a> </h2>
                {Object.entries(jobs).map(([jobId, info]: any) => (
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
                        {info.job_title}
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
                        {parseList(info.strengths).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>

                      <p className="font-semibold text-red-600 mt-2">Weaknesses:</p>
                      <ul className="list-disc ml-5 text-sm text-gray-700">
                        {parseList(info.weaknesses).map((w, i) => (
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
        )}
      <ResultsPage />
      </div>
    </div>
  );
}
